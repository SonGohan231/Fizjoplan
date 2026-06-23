/* FizjoPlan — exercise database generator.
 *
 * Composes clinically-valid exercises from curated bilingual movement families
 * across real rehab progression axes (position × load/equipment × stage). Each
 * (family, position, equipment, stage) is a DISTINCT exercise with its own
 * instructions, dose, tags and progression/regression — the way real HEP
 * libraries scale, not random filler. Deduplicated by movement-logic signature.
 *
 * Output: src/data/exercisesGenerated.ts (typed Exercise[]).
 *
 * Run: node scripts/generate_exercises.js
 */
'use strict';
const fs = require('fs');

// --- shared phrase tables ---------------------------------------------------
const POS = {
  supine:       { pl: 'Leżąc na plecach', en: 'Lying on your back', tag: 'supine' },
  prone:        { pl: 'Leżąc na brzuchu', en: 'Lying on your stomach', tag: 'prone' },
  side_lying:   { pl: 'Leżąc na boku', en: 'Lying on your side', tag: 'side_lying' },
  seated:       { pl: 'W siadzie na krześle', en: 'Sitting on a chair', tag: 'seated' },
  standing:     { pl: 'W pozycji stojącej', en: 'Standing', tag: 'standing' },
  quadruped:    { pl: 'W klęku podpartym', en: 'On all fours', tag: 'quadruped' },
  half_kneeling:{ pl: 'W półklęku', en: 'In half-kneeling', tag: 'half_kneeling' },
  wall:         { pl: 'Stojąc przy ścianie', en: 'Standing at a wall', tag: 'standing' },
};

const EQUIP = {
  none:        { tag: 'none', pl: '', en: '', tpl: '', tple: '' },
  band:        { tag: 'resistance_band', pl: 'z taśmą oporową', en: 'with a resistance band' },
  weight:      { tag: 'light_weight', pl: 'z lekkim ciężarkiem', en: 'with a light weight' },
  wall:        { tag: 'wall', pl: 'z podparciem o ścianę', en: 'using the wall for support' },
  chair:       { tag: 'chair', pl: 'z podparciem o krzesło', en: 'using a chair for support' },
  step:        { tag: 'step', pl: 'na stopniu', en: 'on a step' },
  towel:       { tag: 'towel', pl: 'z ręcznikiem', en: 'with a rolled towel' },
  foam_roller: { tag: 'foam_roller', pl: 'na rollerze', en: 'on a foam roller' },
};

// Stage: difficulty, the action emphasis, a default goal nudge.
const STAGE = {
  isometric:   { diff: 1, pl: 'napnij mięśnie i utrzymaj napięcie bez ruchu', en: 'tense the muscles and hold without moving', goal: 'motor_control', hold: true },
  assisted:    { diff: 1, pl: 'wykonaj ruch z lekką asystą, w zakresie bezbolesnym', en: 'move with light assistance, pain-free', goal: 'mobility' },
  active:      { diff: 1, pl: 'wykonaj ruch samodzielnie, powoli i z kontrolą', en: 'move on your own, slowly and with control', goal: 'mobility' },
  concentric:  { diff: 2, pl: 'wykonaj ruch płynnie, akcentując fazę unoszenia', en: 'move smoothly, emphasising the lifting phase', goal: 'strength' },
  eccentric:   { diff: 2, pl: 'opuszczaj powoli przez 3–4 sekundy', en: 'lower slowly over 3–4 seconds', goal: 'strength' },
  dynamic:     { diff: 3, pl: 'wykonaj pełny zakres ruchu w tempie funkcjonalnym', en: 'move through full range at a functional tempo', goal: 'stability' },
  loaded:      { diff: 3, pl: 'dodaj opór i utrzymaj poprawną technikę', en: 'add resistance and keep good technique', goal: 'strength' },
  single_limb: { diff: 3, pl: 'wykonaj obciążając jedną kończynę', en: 'load a single limb', goal: 'balance' },
  unstable:    { diff: 3, pl: 'wykonaj na niestabilnym podłożu, pilnując równowagi', en: 'perform on an unstable surface, controlling balance', goal: 'balance' },
};

const STAGE_QUAL_PL = { isometric: 'izometria', assisted: 'z asystą', active: 'aktywnie', concentric: 'koncentryka', eccentric: 'ekscentryka', dynamic: 'dynamicznie', loaded: 'z obciążeniem', single_limb: 'jednonóż', unstable: 'niestabilne podłoże' };
const STAGE_QUAL_EN = { isometric: 'isometric', assisted: 'assisted', active: 'active', concentric: 'concentric', eccentric: 'eccentric', dynamic: 'dynamic', loaded: 'loaded', single_limb: 'single-limb', unstable: 'unstable surface' };
const POS_QUAL_PL = { supine: 'leżenie tyłem', prone: 'leżenie przodem', side_lying: 'leżenie bokiem', seated: 'siad', standing: 'stanie', quadruped: 'klęk podparty', half_kneeling: 'półklęk', wall: 'przy ścianie' };
const POS_QUAL_EN = { supine: 'supine', prone: 'prone', side_lying: 'side-lying', seated: 'seated', standing: 'standing', quadruped: 'quadruped', half_kneeling: 'half-kneeling', wall: 'wall' };

// goal-specific safety/finishing cue
const CUE = {
  strength:      { pl: 'Pracuj w zakresie bez ostrego bólu.', en: 'Work within a range free of sharp pain.' },
  mobility:      { pl: 'Nie forsuj zakresu — ruch ma być komfortowy.', en: 'Do not force the range — keep it comfortable.' },
  stretch:       { pl: 'Zatrzymaj się przy uczuciu rozciągania, bez bólu.', en: 'Stop at a gentle stretch, without pain.' },
  stability:     { pl: 'Utrzymuj stabilny tułów przez cały ruch.', en: 'Keep the trunk stable throughout.' },
  motor_control: { pl: 'Skup się na precyzji i równym oddechu.', en: 'Focus on precision and steady breathing.' },
  balance:       { pl: 'Ćwicz w bezpiecznym miejscu, w razie potrzeby przytrzymaj się podpory.', en: 'Practise in a safe place; hold a support if needed.' },
  neural_glide:  { pl: 'Ruch ma być delikatny, bez wywoływania mrowienia.', en: 'Keep it gentle, without provoking tingling.' },
  pain_relief:   { pl: 'Wykonuj spokojnie; przerwij, jeśli ból narasta.', en: 'Perform calmly; stop if pain increases.' },
  circulation:   { pl: 'Oddychaj swobodnie i pracuj rytmicznie.', en: 'Breathe freely and work rhythmically.' },
};

// dose by resolved goal + stage
function doseFor(goal, stage) {
  const st = STAGE[stage];
  if (st.hold || goal === 'motor_control') return { sets: 3, reps: null, duration: 10, freq: 5 };
  if (goal === 'balance') return { sets: 2, reps: null, duration: 30, freq: 5 };
  if (goal === 'stretch') return { sets: 2, reps: null, duration: 30, freq: 6 };
  if (goal === 'mobility') return { sets: 2, reps: 10, duration: null, freq: 5 };
  if (goal === 'neural_glide') return { sets: 2, reps: 10, duration: null, freq: 6 };
  if (goal === 'circulation') return { sets: 1, reps: null, duration: 60, freq: 7 };
  // strength / stability
  const reps = stage === 'eccentric' ? 8 : stage === 'loaded' ? 8 : 12;
  return { sets: 3, reps, duration: null, freq: 4 };
}

// --- family definitions -----------------------------------------------------
// Each family: base movement (bilingual), the conditions/tissues it serves, and
// which positions / equipment / stages are clinically sensible for it.
function fam(o) { return o; }

const FAMILIES = {
  neck: [
    fam({ key:'cct', title_pl:'Głębokie zgięcie szyi (chin tuck)', title_en:'Chin tuck (deep neck flexor)', core_pl:'delikatnie cofnij brodę, wydłużając kark', core_en:'gently draw the chin back, lengthening the neck', conditions:['neck_pain','postural_overload'], tissues:['muscle'], positions:['supine','seated','standing','wall'], equipment:['none'], stages:['isometric','active','concentric'] }),
    fam({ key:'cervrot', title_pl:'Rotacja szyi', title_en:'Neck rotation', core_pl:'obróć głowę w bok, prowadząc wzrok za ruchem', core_en:'turn the head to the side, following with your eyes', conditions:['neck_pain','general_mobility'], tissues:['joint_capsule'], positions:['supine','seated','standing'], equipment:['none'], stages:['assisted','active'] }),
    fam({ key:'cervsb', title_pl:'Skłon boczny szyi', title_en:'Neck side bend', core_pl:'pochyl ucho w stronę barku', core_en:'tip the ear toward the shoulder', conditions:['neck_pain','cervical_radiculopathy'], tissues:['muscle'], positions:['seated','standing'], equipment:['none'], stages:['assisted','active'] }),
    fam({ key:'scapset', title_pl:'Ustawienie łopatek', title_en:'Scapular setting', core_pl:'ściągnij i obniż łopatki', core_en:'gently retract and lower the shoulder blades', conditions:['neck_pain','postural_overload'], tissues:['muscle'], positions:['seated','standing','prone','wall'], equipment:['none','band'], stages:['isometric','concentric'] }),
    fam({ key:'cervext', title_pl:'Wyprost odcinka szyjnego', title_en:'Cervical extension', core_pl:'unieś wzrok i delikatnie odchyl głowę w tył', core_en:'lift your gaze and gently tilt the head back', conditions:['neck_pain','cervical_radiculopathy'], tissues:['joint_capsule'], positions:['seated','standing'], equipment:['none'], stages:['assisted','active'] }),
    fam({ key:'uppertrap', title_pl:'Rozciąganie górnej części czworobocznego', title_en:'Upper trapezius stretch', core_pl:'przyciągnij głowę w bok, czując rozciąganie karku', core_en:'draw the head to the side, feeling a stretch along the neck', conditions:['neck_pain','postural_overload'], tissues:['muscle'], positions:['seated','standing'], equipment:['none','towel'], stages:['active'], goalOverride:'stretch' }),
    fam({ key:'cervnerve', title_pl:'Ślizg nerwu szyjnego', title_en:'Cervical nerve glide', core_pl:'naprzemiennie odchylaj głowę i prostuj rękę, ślizgając nerw', core_en:'alternate head tilt and arm reach to floss the nerve', conditions:['cervical_radiculopathy'], tissues:['nerve'], positions:['seated','standing'], equipment:['none'], stages:['assisted','active'], goalOverride:'neural_glide' }),
    fam({ key:'neckiso', title_pl:'Izometria szyi z oporem ręki', title_en:'Neck isometric (hand resistance)', core_pl:'napieraj głową na dłoń stawiającą opór, bez ruchu głowy', core_en:'press the head into your resisting hand without moving', conditions:['neck_pain','cervical_radiculopathy'], tissues:['muscle'], positions:['seated','standing'], equipment:['none'], stages:['isometric'] }),
    fam({ key:'levator', title_pl:'Rozciąganie dźwigacza łopatki', title_en:'Levator scapulae stretch', core_pl:'skieruj wzrok pod pachę i delikatnie pociągnij głowę w skos', core_en:'look toward your armpit and gently draw the head diagonally', conditions:['neck_pain','postural_overload'], tissues:['muscle'], positions:['seated','standing'], equipment:['none','towel'], stages:['active'], goalOverride:'stretch' }),
  ],
  shoulder: [
    fam({ key:'er', title_pl:'Rotacja zewnętrzna barku', title_en:'Shoulder external rotation', core_pl:'przy łokciu blisko ciała odwiedź przedramię na zewnątrz', core_en:'with the elbow at your side, rotate the forearm outward', conditions:['rotator_cuff_tendinopathy','shoulder_impingement'], tissues:['tendon','muscle'], positions:['side_lying','standing','seated'], equipment:['none','band','weight'], stages:['isometric','concentric','eccentric'] }),
    fam({ key:'ir', title_pl:'Rotacja wewnętrzna barku', title_en:'Shoulder internal rotation', core_pl:'przy łokciu blisko ciała przyciągnij przedramię do brzucha', core_en:'with the elbow at your side, draw the forearm toward your belly', conditions:['rotator_cuff_tendinopathy','shoulder_instability'], tissues:['tendon','muscle'], positions:['standing','seated'], equipment:['band','weight'], stages:['isometric','concentric'] }),
    fam({ key:'scaption', title_pl:'Unoszenie ramienia w płaszczyźnie łopatki', title_en:'Scaption raise', core_pl:'unieś ramię w skos w przód, kciukiem w górę', core_en:'lift the arm diagonally forward, thumb up', conditions:['rotator_cuff_tendinopathy','shoulder_impingement'], tissues:['muscle','tendon'], positions:['standing','seated'], equipment:['none','weight','band'], stages:['concentric','eccentric','loaded'] }),
    fam({ key:'pendulum', title_pl:'Wahadło barku', title_en:'Shoulder pendulum', core_pl:'pozwól rozluźnionemu ramieniu kołysać się w okręgach', core_en:'let the relaxed arm swing in small circles', conditions:['frozen_shoulder','shoulder_impingement'], tissues:['joint_capsule'], positions:['standing'], equipment:['none','weight'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'wallwalk', title_pl:'Wspinanie palcami po ścianie', title_en:'Wall walk', core_pl:'„wspinaj się” palcami po ścianie, zwiększając zakres uniesienia', core_en:'walk the fingers up the wall to increase elevation', conditions:['frozen_shoulder'], tissues:['joint_capsule'], positions:['wall'], equipment:['wall'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'rows', title_pl:'Przyciąganie łopatek (wiosłowanie)', title_en:'Scapular row', core_pl:'przyciągnij łokcie do tyłu, ściągając łopatki', core_en:'pull the elbows back, squeezing the shoulder blades', conditions:['shoulder_impingement','postural_overload'], tissues:['muscle'], positions:['standing','seated'], equipment:['band'], stages:['concentric','eccentric','loaded'] }),
    fam({ key:'flexion', title_pl:'Zgięcie ramienia w przód', title_en:'Shoulder forward flexion', core_pl:'unieś wyprostowane ramię w przód', core_en:'raise the straight arm forward', conditions:['frozen_shoulder','shoulder_impingement'], tissues:['joint_capsule','muscle'], positions:['supine','standing','seated'], equipment:['none','weight','wall'], stages:['assisted','active','concentric'] }),
    fam({ key:'abduction', title_pl:'Odwodzenie ramienia', title_en:'Shoulder abduction', core_pl:'unieś ramię bokiem do wysokości barku', core_en:'raise the arm out to the side up to shoulder height', conditions:['shoulder_impingement','rotator_cuff_tendinopathy'], tissues:['muscle'], positions:['standing','seated'], equipment:['none','weight','band'], stages:['concentric','eccentric'] }),
    fam({ key:'isohold', title_pl:'Izometryczne napięcie barku', title_en:'Shoulder isometric hold', core_pl:'napieraj ramieniem na nieruchomy opór bez ruchu', core_en:'press the arm into a fixed resistance without moving', conditions:['rotator_cuff_tendinopathy','shoulder_instability'], tissues:['tendon','muscle'], positions:['standing','seated'], equipment:['wall','band'], stages:['isometric'] }),
  ],
  elbow: [
    fam({ key:'wristext', title_pl:'Wyprost nadgarstka (łokieć tenisisty)', title_en:'Wrist extension (tennis elbow)', core_pl:'unoś grzbiet dłoni ku górze, prostując nadgarstek', core_en:'lift the back of the hand, extending the wrist', conditions:['lateral_epicondylalgia','tendinopathy'], tissues:['tendon','muscle'], positions:['seated'], equipment:['none','weight','band'], stages:['isometric','concentric','eccentric','loaded'] }),
    fam({ key:'wristflex', title_pl:'Zgięcie nadgarstka (łokieć golfisty)', title_en:'Wrist flexion (golfer elbow)', core_pl:'zginaj nadgarstek, przyciągając dłoń do przedramienia', core_en:'flex the wrist, drawing the palm toward the forearm', conditions:['medial_epicondylalgia','tendinopathy'], tissues:['tendon','muscle'], positions:['seated'], equipment:['none','weight','band'], stages:['isometric','concentric','eccentric','loaded'] }),
    fam({ key:'supination', title_pl:'Nawracanie i odwracanie przedramienia', title_en:'Forearm pronation/supination', core_pl:'obracaj przedramię dłonią w górę i w dół', core_en:'rotate the forearm palm-up and palm-down', conditions:['lateral_epicondylalgia','medial_epicondylalgia'], tissues:['muscle'], positions:['seated'], equipment:['none','weight'], stages:['active','concentric'] }),
    fam({ key:'gripiso', title_pl:'Izometryczny chwyt', title_en:'Isometric grip', core_pl:'ściśnij miękki przedmiot i utrzymaj napięcie', core_en:'squeeze a soft object and hold the tension', conditions:['lateral_epicondylalgia','medial_epicondylalgia'], tissues:['tendon'], positions:['seated'], equipment:['towel','none'], stages:['isometric'] }),
    fam({ key:'elbowrom', title_pl:'Zgięcie i wyprost łokcia', title_en:'Elbow flexion/extension', core_pl:'zegnij i wyprostuj łokieć w pełnym komfortowym zakresie', core_en:'bend and straighten the elbow through a comfortable range', conditions:['tendinopathy','general_mobility'], tissues:['joint_capsule'], positions:['seated','standing'], equipment:['none','weight'], stages:['active','concentric'] }),
  ],
  wrist_hand: [
    fam({ key:'mediannerve', title_pl:'Ślizg nerwu pośrodkowego', title_en:'Median nerve glide', core_pl:'naprzemiennie prostuj i zginaj nadgarstek oraz palce, ślizgając nerw', core_en:'alternately extend and flex the wrist and fingers to floss the nerve', conditions:['carpal_tunnel'], tissues:['nerve'], positions:['seated','standing'], equipment:['none'], stages:['assisted','active'], goalOverride:'neural_glide' }),
    fam({ key:'tendonglide', title_pl:'Ślizgi ścięgien palców', title_en:'Finger tendon glides', core_pl:'przechodź dłonią przez kolejne pozycje: prosto, hak, pięść', core_en:'move the hand through fist, hook and straight positions', conditions:['carpal_tunnel','general_mobility'], tissues:['tendon'], positions:['seated'], equipment:['none'], stages:['active'], goalOverride:'mobility' }),
    fam({ key:'wristrom', title_pl:'Ruchomość nadgarstka', title_en:'Wrist mobility', core_pl:'prowadź nadgarstek w zgięcie, wyprost i ruchy boczne', core_en:'guide the wrist into flexion, extension and side movements', conditions:['general_mobility','tendinopathy'], tissues:['joint_capsule'], positions:['seated'], equipment:['none','towel'], stages:['assisted','active'] }),
    fam({ key:'gripstr', title_pl:'Wzmacnianie chwytu', title_en:'Grip strengthening', core_pl:'ściskaj miękką piłkę i powoli rozluźniaj', core_en:'squeeze a soft ball and slowly release', conditions:['general_mobility','general_deconditioning'], tissues:['muscle'], positions:['seated'], equipment:['none'], stages:['isometric','concentric'] }),
    fam({ key:'wristext2', title_pl:'Delikatny wyprost nadgarstka', title_en:'Gentle wrist extension', core_pl:'unoś grzbiet dłoni, utrzymując przedramię na podłożu', core_en:'lift the back of the hand with the forearm resting', conditions:['carpal_tunnel','general_mobility'], tissues:['muscle'], positions:['seated'], equipment:['none','weight'], stages:['isometric','concentric','eccentric'] }),
    fam({ key:'deviation', title_pl:'Odchylenie promieniowe i łokciowe nadgarstka', title_en:'Wrist radial/ulnar deviation', core_pl:'kieruj dłoń w stronę kciuka i małego palca przeciw oporowi', core_en:'angle the hand toward the thumb and little-finger sides against resistance', conditions:['general_mobility','tendinopathy'], tissues:['muscle'], positions:['seated'], equipment:['none','weight','band'], stages:['active','concentric'] }),
    fam({ key:'thumbopp', title_pl:'Opozycja kciuka', title_en:'Thumb opposition', core_pl:'dotykaj kciukiem opuszek kolejnych palców', core_en:'touch the thumb to each fingertip in turn', conditions:['general_mobility'], tissues:['muscle'], positions:['seated'], equipment:['none'], stages:['active'], goalOverride:'motor_control' }),
    fam({ key:'fingerabd', title_pl:'Odwodzenie palców', title_en:'Finger abduction', core_pl:'rozsuwaj palce przeciw delikatnemu oporowi', core_en:'spread the fingers apart against light resistance', conditions:['general_mobility','general_deconditioning'], tissues:['muscle'], positions:['seated'], equipment:['none','band'], stages:['isometric','concentric'] }),
    fam({ key:'flexstretch', title_pl:'Rozciąganie zginaczy nadgarstka', title_en:'Wrist flexor stretch', core_pl:'wyprostuj rękę i delikatnie odciągnij dłoń w wyprost', core_en:'straighten the arm and gently draw the hand into extension', conditions:['carpal_tunnel','tendinopathy'], tissues:['muscle'], positions:['seated','standing'], equipment:['none'], stages:['active'], goalOverride:'stretch' }),
    fam({ key:'extstretch', title_pl:'Rozciąganie prostowników nadgarstka', title_en:'Wrist extensor stretch', core_pl:'wyprostuj rękę i delikatnie zegnij dłoń w dół', core_en:'straighten the arm and gently flex the hand downward', conditions:['general_mobility','tendinopathy'], tissues:['muscle'], positions:['seated','standing'], equipment:['none'], stages:['active'], goalOverride:'stretch' }),
  ],
  thoracic: [
    fam({ key:'openbook', title_pl:'Rotacja piersiowa „otwarta książka”', title_en:'Open-book thoracic rotation', core_pl:'otwieraj górną rękę w bok, podążając wzrokiem za dłonią', core_en:'open the top arm across, following the hand with your eyes', conditions:['thoracic_stiffness','postural_overload'], tissues:['joint_capsule'], positions:['side_lying','seated'], equipment:['none'], stages:['assisted','active'] }),
    fam({ key:'extmob', title_pl:'Wyprost piersiowy', title_en:'Thoracic extension', core_pl:'wydłuż klatkę piersiową i delikatnie wygnij odcinek piersiowy', core_en:'lengthen the chest and gently extend the mid-back', conditions:['thoracic_stiffness','postural_overload'], tissues:['joint_capsule'], positions:['seated','quadruped','wall'], equipment:['none','foam_roller','chair'], stages:['active','dynamic'] }),
    fam({ key:'catcamel', title_pl:'Koci grzbiet', title_en:'Cat–camel', core_pl:'naprzemiennie zaokrąglaj i wydłużaj kręgosłup', core_en:'alternately round and lengthen the spine', conditions:['thoracic_stiffness','general_mobility'], tissues:['joint_capsule'], positions:['quadruped'], equipment:['none'], stages:['active'] }),
    fam({ key:'wallangel', title_pl:'„Anioł” przy ścianie', title_en:'Wall angel', core_pl:'przesuwaj ramiona po ścianie w górę i w dół, utrzymując kontakt', core_en:'slide the arms up and down the wall keeping contact', conditions:['postural_overload','thoracic_stiffness'], tissues:['muscle'], positions:['wall'], equipment:['wall'], stages:['active','concentric'] }),
    fam({ key:'thoraxrot', title_pl:'Rotacja tułowia w siadzie', title_en:'Seated trunk rotation', core_pl:'obróć tułów w bok, trzymając miednicę stabilnie', core_en:'rotate the trunk to the side keeping the pelvis still', conditions:['thoracic_stiffness','general_mobility'], tissues:['joint_capsule'], positions:['seated'], equipment:['none','band'], stages:['active','dynamic'] }),
    fam({ key:'tyw', title_pl:'Aktywacja łopatek (T-Y-W)', title_en:'Prone scapular T-Y-W', core_pl:'unoś ramiona w kształt liter T, Y i W, ściągając łopatki', core_en:'lift the arms into T, Y and W shapes, squeezing the shoulder blades', conditions:['postural_overload','thoracic_stiffness'], tissues:['muscle'], positions:['prone'], equipment:['none','weight'], stages:['isometric','concentric'] }),
    fam({ key:'thoraxsb', title_pl:'Skłon boczny tułowia', title_en:'Seated/standing side bend', core_pl:'pochyl tułów w bok, wydłużając przeciwną stronę', core_en:'lean the trunk sideways, lengthening the opposite side', conditions:['thoracic_stiffness','general_mobility'], tissues:['joint_capsule'], positions:['seated','standing'], equipment:['none'], stages:['active'], goalOverride:'mobility' }),
  ],
  lower_back: [
    fam({ key:'pelvictilt', title_pl:'Pochylanie miednicy', title_en:'Pelvic tilt', core_pl:'delikatnie podwijaj i odchylaj miednicę, ruszając odcinkiem lędźwiowym', core_en:'gently tuck and arch the pelvis, moving the lower back', conditions:['mechanical_low_back_pain','general_mobility'], tissues:['muscle'], positions:['supine','quadruped','standing'], equipment:['none'], stages:['active'] }),
    fam({ key:'kneechest', title_pl:'Przyciąganie kolan do klatki', title_en:'Knee-to-chest', core_pl:'przyciągnij kolano (lub kolana) do klatki, czując rozluźnienie lędźwi', core_en:'draw the knee(s) toward the chest, easing the lower back', conditions:['mechanical_low_back_pain','sciatica'], tissues:['muscle'], positions:['supine'], equipment:['none'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'birddog', title_pl:'Ćwiczenie „ptak–pies”', title_en:'Bird-dog', core_pl:'wyciągnij przeciwległą rękę i nogę, utrzymując stabilny tułów', core_en:'extend the opposite arm and leg keeping the trunk stable', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['quadruped'], equipment:['none','band'], stages:['isometric','concentric','dynamic','single_limb'], goalOverride:'stability' }),
    fam({ key:'deadbug', title_pl:'Ćwiczenie „dead bug”', title_en:'Dead bug', core_pl:'opuszczaj przeciwległą rękę i nogę, dociskając lędźwie do podłoża', core_en:'lower the opposite arm and leg, keeping the back pressed down', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['supine'], equipment:['none','band'], stages:['isometric','concentric','dynamic'], goalOverride:'stability' }),
    fam({ key:'bridge', title_pl:'Mostek biodrowy', title_en:'Glute bridge', core_pl:'unieś biodra, napinając pośladki i brzuch', core_en:'lift the hips by squeezing the glutes and abdominals', conditions:['mechanical_low_back_pain','general_deconditioning'], tissues:['muscle'], positions:['supine'], equipment:['none','band','weight'], stages:['isometric','concentric','eccentric','single_limb'], goalOverride:'strength' }),
    fam({ key:'extprone', title_pl:'Wyprost w leżeniu przodem (przeprost)', title_en:'Prone press-up (extension)', core_pl:'unieś klatkę na przedramionach lub dłoniach, rozluźniając brzuch', core_en:'prop the chest up on forearms or hands, relaxing the belly', conditions:['mechanical_low_back_pain'], tissues:['joint_capsule'], positions:['prone'], equipment:['none'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'sciaticglide', title_pl:'Ślizg nerwu kulszowego', title_en:'Sciatic nerve glide', core_pl:'naprzemiennie prostuj kolano i zginaj kostkę, delikatnie ślizgając nerw', core_en:'alternately straighten the knee and flex the ankle to floss the nerve', conditions:['sciatica'], tissues:['nerve'], positions:['supine','seated'], equipment:['none'], stages:['assisted','active'], goalOverride:'neural_glide' }),
    fam({ key:'sidebridge', title_pl:'Mostek boczny / deska bok', title_en:'Side bridge', core_pl:'unieś biodra w podporze bokiem, utrzymując linię ciała', core_en:'lift the hips in a side support, holding a straight line', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['side_lying'], equipment:['none'], stages:['isometric','concentric','dynamic'], goalOverride:'stability' }),
    fam({ key:'curlup', title_pl:'Brzuszek izometryczny (McGill curl-up)', title_en:'McGill curl-up', core_pl:'unieś delikatnie głowę i barki, utrzymując naturalną krzywiznę lędźwi', core_en:'gently lift the head and shoulders keeping the natural lumbar curve', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['supine'], equipment:['none'], stages:['isometric','concentric'], goalOverride:'stability' }),
    fam({ key:'brace', title_pl:'Napięcie mięśni głębokich (bracing)', title_en:'Abdominal bracing', core_pl:'delikatnie napnij brzuch jak przed dotknięciem, oddychając swobodnie', core_en:'gently brace the abdomen as if about to be touched, breathing freely', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['supine','quadruped','standing','seated'], equipment:['none'], stages:['isometric'], goalOverride:'motor_control' }),
    fam({ key:'pallof', title_pl:'Wypych anty-rotacyjny (Pallof)', title_en:'Pallof press (anti-rotation)', core_pl:'wypchnij taśmę przed siebie, opierając się rotacji tułowia', core_en:'press the band straight out, resisting trunk rotation', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['standing','half_kneeling'], equipment:['band'], stages:['isometric','concentric'], goalOverride:'stability' }),
    fam({ key:'proneext', title_pl:'Unoszenie tułowia/nóg w leżeniu przodem', title_en:'Prone back extensor lift', core_pl:'unieś delikatnie klatkę lub nogi, napinając prostowniki grzbietu', core_en:'gently lift the chest or legs, engaging the back extensors', conditions:['mechanical_low_back_pain','general_deconditioning'], tissues:['muscle'], positions:['prone'], equipment:['none','weight'], stages:['isometric','concentric','eccentric'], goalOverride:'strength' }),
    fam({ key:'hipflexstretch', title_pl:'Rozciąganie zginaczy bioder', title_en:'Hip flexor stretch', core_pl:'przenieś ciężar do przodu, czując rozciąganie z przodu biodra', core_en:'shift weight forward, feeling a stretch at the front of the hip', conditions:['mechanical_low_back_pain','postural_overload'], tissues:['muscle'], positions:['half_kneeling'], equipment:['none'], stages:['active'], goalOverride:'stretch' }),
    fam({ key:'hamstretch', title_pl:'Rozciąganie mięśni kulszowo-goleniowych', title_en:'Hamstring stretch', core_pl:'wyprostuj nogę i delikatnie pochyl się, czując rozciąganie z tyłu uda', core_en:'straighten the leg and lean gently, feeling a stretch behind the thigh', conditions:['mechanical_low_back_pain','sciatica'], tissues:['muscle'], positions:['supine','seated','standing'], equipment:['none','towel'], stages:['active'], goalOverride:'stretch' }),
    fam({ key:'kneeroll', title_pl:'Rotacyjne opuszczanie kolan', title_en:'Lumbar rotation (knee rolls)', core_pl:'z ugiętymi kolanami opuszczaj je powoli w bok', core_en:'with bent knees, lower them slowly to the side', conditions:['mechanical_low_back_pain','general_mobility'], tissues:['joint_capsule'], positions:['supine'], equipment:['none'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'hiphinge', title_pl:'Zawias biodrowy (hip hinge)', title_en:'Hip hinge', core_pl:'odprowadź biodra w tył z prostymi plecami i wróć do wyprostu', core_en:'send the hips back with a straight back, then return', conditions:['mechanical_low_back_pain','general_deconditioning'], tissues:['muscle'], positions:['standing'], equipment:['none','weight','band'], stages:['concentric','eccentric','dynamic'], goalOverride:'strength' }),
    fam({ key:'frontplank', title_pl:'Deska przednia', title_en:'Front plank', core_pl:'utrzymaj prostą linię ciała w podporze na przedramionach', core_en:'hold a straight body line in a forearm support', conditions:['mechanical_low_back_pain'], tissues:['muscle'], positions:['prone','quadruped','wall'], equipment:['none'], stages:['isometric'], goalOverride:'stability' }),
    fam({ key:'goodmorning', title_pl:'„Dzień dobry” z taśmą', title_en:'Banded good-morning', core_pl:'pochyl tułów w przód z prostymi plecami, napinając taśmę', core_en:'hinge the trunk forward with a straight back against the band', conditions:['mechanical_low_back_pain','general_deconditioning'], tissues:['muscle'], positions:['standing'], equipment:['band'], stages:['concentric','eccentric'], goalOverride:'strength' }),
    fam({ key:'standingext', title_pl:'Wyprost lędźwi w staniu', title_en:'Standing lumbar extension', core_pl:'oprzyj dłonie na biodrach i delikatnie odchyl tułów w tył', core_en:'place the hands on the hips and gently lean the trunk back', conditions:['mechanical_low_back_pain'], tissues:['joint_capsule'], positions:['standing'], equipment:['none'], stages:['active'], goalOverride:'mobility' }),
    fam({ key:'quadrock', title_pl:'Kołysanie w klęku podpartym', title_en:'Quadruped rocking', core_pl:'kołysz biodra w tył i w przód, utrzymując neutralny kręgosłup', core_en:'rock the hips back and forth keeping a neutral spine', conditions:['mechanical_low_back_pain','general_mobility'], tissues:['joint_capsule'], positions:['quadruped'], equipment:['none'], stages:['active'], goalOverride:'mobility' }),
  ],
  hip: [
    fam({ key:'clamshell', title_pl:'„Muszla” (clamshell)', title_en:'Clamshell', core_pl:'unieś górne kolano, trzymając stopy razem i stabilną miednicę', core_en:'lift the top knee keeping the feet together and pelvis steady', conditions:['gluteal_tendinopathy','hip_pain'], tissues:['tendon','muscle'], positions:['side_lying'], equipment:['none','band'], stages:['isometric','concentric','eccentric'] }),
    fam({ key:'abduction', title_pl:'Odwodzenie biodra', title_en:'Hip abduction', core_pl:'odwiedź wyprostowaną nogę w bok, trzymając miednicę nieruchomo', core_en:'lift the straight leg out to the side keeping the pelvis still', conditions:['gluteal_tendinopathy','hip_pain'], tissues:['muscle','tendon'], positions:['side_lying','standing'], equipment:['none','band'], stages:['concentric','eccentric','loaded'] }),
    fam({ key:'bridge', title_pl:'Mostek z akcentem na pośladki', title_en:'Glute-focused bridge', core_pl:'unieś biodra, mocno napinając pośladki', core_en:'lift the hips with a strong glute squeeze', conditions:['gluteal_tendinopathy','hip_pain','general_deconditioning'], tissues:['muscle'], positions:['supine'], equipment:['none','band'], stages:['concentric','single_limb'] }),
    fam({ key:'hipflexrom', title_pl:'Ruchomość zgięcia biodra', title_en:'Hip flexion mobility', core_pl:'przyciągaj kolano do klatki w komfortowym zakresie', core_en:'draw the knee toward the chest within a comfortable range', conditions:['hip_impingement','general_mobility'], tissues:['joint_capsule'], positions:['supine','standing'], equipment:['none'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'hiprot', title_pl:'Rotacja biodra', title_en:'Hip rotation', core_pl:'obracaj udo do wewnątrz i na zewnątrz w bezbolesnym zakresie', core_en:'rotate the thigh in and out within a pain-free range', conditions:['hip_impingement','general_mobility'], tissues:['joint_capsule'], positions:['supine','seated'], equipment:['none'], stages:['assisted','active'] }),
    fam({ key:'hipext', title_pl:'Wyprost biodra', title_en:'Hip extension', core_pl:'odprowadź wyprostowaną nogę do tyłu, napinając pośladek', core_en:'drive the straight leg backward, squeezing the glute', conditions:['gluteal_tendinopathy','general_deconditioning'], tissues:['muscle'], positions:['quadruped','standing','prone'], equipment:['none','band'], stages:['concentric','eccentric'] }),
    fam({ key:'glutestretch', title_pl:'Rozciąganie pośladka', title_en:'Glute stretch', core_pl:'przyciągnij zgięte kolano w poprzek ciała', core_en:'draw the bent knee across the body', conditions:['gluteal_tendinopathy','hip_pain'], tissues:['muscle'], positions:['supine','seated'], equipment:['none'], stages:['active'], goalOverride:'stretch' }),
    fam({ key:'hipthrust', title_pl:'Wypych bioder z podparciem', title_en:'Supported hip thrust', core_pl:'opierając górną część pleców, unieś biodra napinając pośladki', core_en:'with the upper back supported, drive the hips up squeezing the glutes', conditions:['gluteal_tendinopathy','general_deconditioning'], tissues:['muscle'], positions:['supine'], equipment:['none','band','weight'], stages:['concentric','eccentric'] }),
    fam({ key:'monsterwalk', title_pl:'Kroki z taśmą („monster walk”)', title_en:'Banded lateral walk', core_pl:'z taśmą nad kolanami wykonuj kroki w bok, napinając pośladki', core_en:'with a band above the knees, step sideways keeping glute tension', conditions:['gluteal_tendinopathy','hip_pain'], tissues:['muscle'], positions:['standing'], equipment:['band'], stages:['concentric','dynamic'] }),
    fam({ key:'adductor', title_pl:'Napięcie przywodzicieli', title_en:'Adductor squeeze', core_pl:'ściśnij poduszkę między kolanami i utrzymaj napięcie', core_en:'squeeze a cushion between the knees and hold', conditions:['hip_pain','general_deconditioning'], tissues:['muscle'], positions:['supine','seated'], equipment:['none'], stages:['isometric','concentric'] }),
    fam({ key:'sls', title_pl:'Stanie na jednej nodze (kontrola biodra)', title_en:'Single-leg stance (hip control)', core_pl:'stań na jednej nodze, utrzymując poziom miednicy', core_en:'stand on one leg keeping the pelvis level', conditions:['gluteal_tendinopathy','hip_pain'], tissues:['muscle'], positions:['standing','wall'], equipment:['none','wall'], stages:['active','unstable'], goalOverride:'balance' }),
  ],
  knee: [
    fam({ key:'quadset', title_pl:'Napięcie mięśnia czworogłowego', title_en:'Quadriceps set', core_pl:'napnij udo, dociskając kolano do podłoża', core_en:'tighten the thigh, pressing the knee down', conditions:['post_acl','patellofemoral_pain','knee_pain'], tissues:['muscle'], positions:['supine','seated'], equipment:['none','towel'], stages:['isometric'] }),
    fam({ key:'slr', title_pl:'Uniesienie wyprostowanej nogi', title_en:'Straight leg raise', core_pl:'napnij udo i unieś wyprostowaną nogę', core_en:'tense the thigh and lift the straight leg', conditions:['post_acl','patellofemoral_pain'], tissues:['muscle'], positions:['supine'], equipment:['none','weight'], stages:['concentric','eccentric','loaded'] }),
    fam({ key:'squat', title_pl:'Przysiad w zakresie', title_en:'Range-limited squat', core_pl:'zegnij kolana do komfortowego kąta i wróć do wyprostu', core_en:'bend the knees to a comfortable angle and return', conditions:['patellofemoral_pain','post_acl','general_deconditioning'], tissues:['muscle'], positions:['standing','wall'], equipment:['none','wall','chair'], stages:['concentric','eccentric','dynamic'] }),
    fam({ key:'stepup', title_pl:'Wejście na stopień', title_en:'Step-up', core_pl:'wejdź na stopień, prowadząc kolano nad stopą', core_en:'step up, tracking the knee over the foot', conditions:['patellofemoral_pain','general_deconditioning'], tissues:['muscle'], positions:['standing'], equipment:['step'], stages:['concentric','eccentric','single_limb'] }),
    fam({ key:'hamcurl', title_pl:'Zginanie kolana (kulszowo-goleniowe)', title_en:'Hamstring curl', core_pl:'zegnij kolano, przyciągając piętę do pośladka', core_en:'bend the knee, drawing the heel toward the buttock', conditions:['post_acl','knee_pain'], tissues:['muscle'], positions:['prone','standing'], equipment:['none','band'], stages:['concentric','eccentric'] }),
    fam({ key:'terminalext', title_pl:'Wyprost końcowy kolana', title_en:'Terminal knee extension', core_pl:'dociśnij kolano do pełnego wyprostu przeciw oporowi', core_en:'press the knee to full extension against resistance', conditions:['post_acl','patellofemoral_pain'], tissues:['muscle'], positions:['standing','seated'], equipment:['band'], stages:['isometric','concentric'] }),
    fam({ key:'kneerom', title_pl:'Ruchomość zgięcia kolana', title_en:'Knee flexion mobility', core_pl:'przesuwaj piętę, zginając kolano w komfortowym zakresie', core_en:'slide the heel to bend the knee within comfort', conditions:['post_acl','general_mobility','knee_pain'], tissues:['joint_capsule'], positions:['supine','seated'], equipment:['none','towel'], stages:['assisted','active'], goalOverride:'mobility' }),
    fam({ key:'wallsit', title_pl:'Przysiad izometryczny przy ścianie', title_en:'Wall sit', core_pl:'oprzyj plecy o ścianę i utrzymaj zgięcie kolan', core_en:'lean the back on the wall and hold the knee bend', conditions:['patellofemoral_pain','general_deconditioning'], tissues:['muscle'], positions:['wall'], equipment:['wall'], stages:['isometric'] }),
    fam({ key:'legext', title_pl:'Wyprost kolana w siadzie', title_en:'Seated knee extension', core_pl:'wyprostuj kolano, unosząc podudzie do poziomu', core_en:'straighten the knee, raising the shin to horizontal', conditions:['patellofemoral_pain','post_acl','knee_pain'], tissues:['muscle'], positions:['seated'], equipment:['none','weight','band'], stages:['isometric','concentric','eccentric'] }),
    fam({ key:'lunge', title_pl:'Wykrok w zakresie', title_en:'Range-limited lunge', core_pl:'zrób kontrolowany wykrok, prowadząc kolano nad stopą', core_en:'take a controlled lunge, tracking the knee over the foot', conditions:['patellofemoral_pain','post_acl','general_deconditioning'], tissues:['muscle'], positions:['standing','half_kneeling'], equipment:['none','chair'], stages:['concentric','eccentric','dynamic'] }),
    fam({ key:'slsquat', title_pl:'Przysiad na jednej nodze (zakres)', title_en:'Single-leg squat (range)', core_pl:'zegnij kolano stojąc na jednej nodze, trzymając się podpory', core_en:'bend the knee standing on one leg, holding a support', conditions:['post_acl','patellofemoral_pain'], tissues:['muscle'], positions:['standing','wall'], equipment:['chair','wall'], stages:['concentric','eccentric','single_limb'] }),
    fam({ key:'hambridge', title_pl:'Mostek z akcentem na kulszowo-goleniowe', title_en:'Hamstring bridge', core_pl:'z piętami na podłożu unieś biodra, napinając tył ud', core_en:'with heels planted, lift the hips engaging the hamstrings', conditions:['post_acl','knee_pain'], tissues:['muscle'], positions:['supine'], equipment:['none','step'], stages:['concentric','eccentric','single_limb'] }),
  ],
  ankle_foot: [
    fam({ key:'heelraise', title_pl:'Wspięcia na palce', title_en:'Heel raise', core_pl:'unieś pięty, wspinając się na palce', core_en:'lift the heels, rising onto the toes', conditions:['achilles_tendinopathy','general_deconditioning'], tissues:['tendon','muscle'], positions:['standing'], equipment:['none','wall','step'], stages:['concentric','eccentric','single_limb'] }),
    fam({ key:'ankledf', title_pl:'Zgięcie grzbietowe stopy', title_en:'Ankle dorsiflexion', core_pl:'przyciągaj stopę ku górze, naciągając tył podudzia', core_en:'pull the foot upward, stretching the back of the lower leg', conditions:['ankle_sprain','general_mobility'], tissues:['joint_capsule'], positions:['seated','standing'], equipment:['none','band','towel'], stages:['assisted','active'] }),
    fam({ key:'eversion', title_pl:'Ewersja i inwersja stopy', title_en:'Ankle eversion/inversion', core_pl:'kieruj stopę na zewnątrz i do wewnątrz przeciw oporowi', core_en:'turn the foot outward and inward against resistance', conditions:['ankle_sprain'], tissues:['muscle','ligament'], positions:['seated'], equipment:['band'], stages:['isometric','concentric'] }),
    fam({ key:'balance', title_pl:'Równowaga na jednej nodze', title_en:'Single-leg balance', core_pl:'utrzymaj równowagę na jednej nodze', core_en:'hold your balance on one leg', conditions:['ankle_sprain','balance_senior'], tissues:['ligament'], positions:['standing'], equipment:['none','wall'], stages:['active','unstable'], goalOverride:'balance' }),
    fam({ key:'calfstretch', title_pl:'Rozciąganie łydki', title_en:'Calf stretch', core_pl:'wykonaj wykrok i dociśnij piętę do podłoża', core_en:'lunge forward and press the back heel down', conditions:['achilles_tendinopathy','general_mobility'], tissues:['muscle'], positions:['wall','standing'], equipment:['wall'], stages:['active'], goalOverride:'stretch' }),
    fam({ key:'footintrinsic', title_pl:'Ćwiczenia krótkich mięśni stopy', title_en:'Foot intrinsic exercise', core_pl:'„skróć” stopę, unosząc sklepienie bez podkurczania palców', core_en:'shorten the foot, lifting the arch without curling the toes', conditions:['general_mobility','balance_senior'], tissues:['muscle'], positions:['seated','standing'], equipment:['none'], stages:['isometric','active'] }),
    fam({ key:'toeraise', title_pl:'Unoszenie palców (zginacze grzbietowe)', title_en:'Toe raise (dorsiflexors)', core_pl:'unoś palce i przód stopy, trzymając pięty na podłożu', core_en:'lift the toes and forefoot, keeping the heels down', conditions:['ankle_sprain','general_deconditioning'], tissues:['muscle'], positions:['seated','standing'], equipment:['none','band'], stages:['isometric','concentric'] }),
    fam({ key:'anklecircle', title_pl:'Krążenia stawu skokowego', title_en:'Ankle circles', core_pl:'zataczaj stopą powolne okręgi w obie strony', core_en:'draw slow circles with the foot in both directions', conditions:['ankle_sprain','general_mobility'], tissues:['joint_capsule'], positions:['seated','supine'], equipment:['none'], stages:['active'], goalOverride:'mobility' }),
    fam({ key:'towelscrunch', title_pl:'Zwijanie ręcznika palcami stóp', title_en:'Towel scrunch', core_pl:'zwijaj ręcznik palcami stóp, aktywując sklepienie', core_en:'scrunch a towel with the toes, engaging the arch', conditions:['general_mobility','balance_senior'], tissues:['muscle'], positions:['seated'], equipment:['towel'], stages:['concentric'] }),
  ],
  general: [ // seniors: balance / fall prevention / gait / lower-limb strength
    fam({ key:'sit2stand', title_pl:'Wstawanie z krzesła', title_en:'Sit-to-stand', core_pl:'wstań z krzesła i usiądź powoli, kontrolując ruch', core_en:'stand up from a chair and sit down slowly, with control', conditions:['balance_senior','general_deconditioning'], tissues:['muscle'], positions:['seated'], equipment:['chair','none'], stages:['concentric','eccentric'] }),
    fam({ key:'tandem', title_pl:'Stanie w pozycji tandemowej', title_en:'Tandem stance', core_pl:'ustaw stopy jedna za drugą i utrzymaj równowagę', core_en:'place one foot in front of the other and hold balance', conditions:['balance_senior'], tissues:['muscle'], positions:['standing','wall'], equipment:['none','wall'], stages:['active','unstable'], goalOverride:'balance' }),
    fam({ key:'weightshift', title_pl:'Przenoszenie ciężaru ciała', title_en:'Weight shifting', core_pl:'powoli przenoś ciężar z nogi na nogę', core_en:'slowly shift weight from one leg to the other', conditions:['balance_senior'], tissues:['muscle'], positions:['standing','wall'], equipment:['none','wall'], stages:['active'], goalOverride:'balance' }),
    fam({ key:'heeltoe', title_pl:'Chód stopa za stopą', title_en:'Heel-to-toe walking', core_pl:'idź, stawiając piętę tuż przed palcami drugiej stopy', core_en:'walk placing the heel just ahead of the other toes', conditions:['balance_senior'], tissues:['muscle'], positions:['standing'], equipment:['none','wall'], stages:['active','dynamic'], goalOverride:'balance' }),
    fam({ key:'marching', title_pl:'Marsz w miejscu', title_en:'Marching in place', core_pl:'unoś naprzemiennie kolana, maszerując w miejscu', core_en:'lift the knees alternately, marching on the spot', conditions:['balance_senior','general_deconditioning'], tissues:['muscle'], positions:['standing','seated'], equipment:['none','chair'], stages:['active','dynamic'], goalOverride:'circulation' }),
    fam({ key:'minisquat', title_pl:'Mini przysiad z podporą', title_en:'Supported mini-squat', core_pl:'zegnij lekko kolana, trzymając się podpory', core_en:'bend the knees slightly while holding a support', conditions:['balance_senior','general_deconditioning'], tissues:['muscle'], positions:['standing','wall'], equipment:['chair','wall'], stages:['concentric','eccentric'] }),
    fam({ key:'heelraisesenior', title_pl:'Wspięcia na palce z podporą', title_en:'Supported heel raise', core_pl:'unieś pięty, trzymając się podpory dla równowagi', core_en:'lift the heels while holding a support for balance', conditions:['balance_senior','general_deconditioning'], tissues:['muscle'], positions:['standing','wall'], equipment:['chair','wall'], stages:['concentric','isometric'] }),
    fam({ key:'sidestep', title_pl:'Kroki w bok', title_en:'Side stepping', core_pl:'wykonuj kontrolowane kroki w bok, utrzymując równowagę', core_en:'take controlled steps to the side, keeping balance', conditions:['balance_senior'], tissues:['muscle'], positions:['standing','wall'], equipment:['none','band'], stages:['active','dynamic'], goalOverride:'balance' }),
    fam({ key:'reach', title_pl:'Sięganie w równowadze', title_en:'Balance reach', core_pl:'stojąc stabilnie, sięgaj ręką w różnych kierunkach', core_en:'standing steady, reach the hand in different directions', conditions:['balance_senior'], tissues:['muscle'], positions:['standing','wall'], equipment:['none','chair'], stages:['active','unstable'], goalOverride:'balance' }),
    fam({ key:'slsupport', title_pl:'Stanie na jednej nodze z podporą', title_en:'Single-leg stand with support', core_pl:'stań na jednej nodze, lekko trzymając się podpory', core_en:'stand on one leg, lightly holding a support', conditions:['balance_senior'], tissues:['muscle'], positions:['standing','wall'], equipment:['chair','wall'], stages:['active','unstable'], goalOverride:'balance' }),
    fam({ key:'stepover', title_pl:'Przekraczanie przeszkody', title_en:'Step-over', core_pl:'przekraczaj niski przedmiot, kontrolując krok', core_en:'step over a low object, controlling each step', conditions:['balance_senior'], tissues:['muscle'], positions:['standing'], equipment:['none','wall'], stages:['active','dynamic'], goalOverride:'balance' }),
  ],
};

// region-level safety defaults (contraindications / red_flags on the exercise)
function safetyFor(region, fam, stage) {
  const heavy = ['concentric','eccentric','dynamic','loaded','single_limb','unstable'].includes(stage);
  let contra = ['acute_inflammation'];
  if (heavy) contra.push('severe_pain');
  if (['unstable','single_limb','loaded','dynamic'].includes(stage)) contra.push('instability');
  let red = [];
  if (region === 'lower_back') {
    // gentle neural/mobility low-back items must stay available; loaded/stability carry neuro red flags
    if (!['mechanical_low_back_pain'].includes('skip') && (fam.goalOverride === 'stability' || ['bridge','sidebridge','birddog','deadbug'].includes(fam.key))) {
      red = ['neuro_bilateral','bladder_bowel'];
    }
  }
  // de-dup
  return { contra: [...new Set(contra)], red: [...new Set(red)] };
}

// Clinically-real prescription variants of the SAME movement (a physio writes
// these as separate HEP items): standard, endurance dosing, inner-range focus.
const VARIANTS = {
  std:      { pl: '', en: '' },
  endurance:{ pl: 'Zastosuj wariant wytrzymałościowy: dłuższe utrzymanie lub więcej powtórzeń', en: 'Use an endurance dose: longer holds or more repetitions',
              ok: (goal, stage) => ['strength','stability','motor_control'].includes(goal) && ['isometric','concentric','eccentric','dynamic'].includes(stage) },
  inner:    { pl: 'Akcentuj końcowy (wewnętrzny) zakres ruchu', en: 'Emphasise the end (inner) range',
              ok: (goal, stage) => ['strength','mobility','stability'].includes(goal) && ['concentric','active','dynamic','isometric'].includes(stage) },
};
const VAR_QUAL_PL = { std: '', endurance: 'wytrzymałość', inner: 'zakres końcowy' };
const VAR_QUAL_EN = { std: '', endurance: 'endurance', inner: 'inner-range' };

function variantsFor(goal, stage) {
  const out = ['std'];
  for (const k of ['endurance', 'inner']) if (VARIANTS[k].ok(goal, stage)) out.push(k);
  return out;
}
function applyVariant(dose, variant) {
  if (variant === 'endurance') {
    if (dose.reps) return { ...dose, sets: 2, reps: Math.max(15, dose.reps + 6) };
    if (dose.duration) return { ...dose, duration: dose.duration * 2 };
  }
  return dose;
}

// resolve goal_tags for a (family, stage)
function goalsFor(fam, stage) {
  const g = new Set();
  if (fam.goalOverride) g.add(fam.goalOverride); else g.add(STAGE[stage].goal);
  // add a sensible secondary
  if (g.has('strength')) g.add('motor_control');
  if (g.has('balance')) g.add('stability');
  return [...g];
}

function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function buildOne(region, fam, pos, equip, stage, variant, seq) {
  const P = POS[pos], E = EQUIP[equip], S = STAGE[stage];
  const goals = goalsFor(fam, stage);
  const primaryGoal = fam.goalOverride || S.goal;
  const dose = applyVariant(doseFor(primaryGoal, stage), variant);
  const safety = safetyFor(region, fam, stage);

  const equipPl = E.pl ? `, ${E.pl}` : '';
  const equipEn = E.en ? `, ${E.en}` : '';
  const varPl = VARIANTS[variant].pl ? ` ${VARIANTS[variant].pl}.` : '';
  const varEn = VARIANTS[variant].en ? ` ${VARIANTS[variant].en}.` : '';
  const cue = CUE[primaryGoal] || CUE.strength;

  const description_pl = `${P.pl}, ${fam.core_pl}; ${S.pl}${equipPl}.${varPl} ${cue.pl}`;
  const description_en = `${cap(P.en)}, ${fam.core_en}; ${S.en}${equipEn}.${varEn} ${cue.en}`;

  const qualPl = [STAGE_QUAL_PL[stage], POS_QUAL_PL[pos], E.pl, VAR_QUAL_PL[variant]].filter(Boolean).join(', ');
  const qualEn = [STAGE_QUAL_EN[stage], POS_QUAL_EN[pos], E.en, VAR_QUAL_EN[variant]].filter(Boolean).join(', ');
  const title_pl = `${fam.title_pl} (${qualPl})`;
  const title_en = `${fam.title_en} (${qualEn})`;

  return {
    id: `gen-${region}-${seq}`,
    title_pl, title_en, description_pl, description_en,
    body_region: region,
    condition_tags: [...fam.conditions],
    tissue_tags: [...fam.tissues],
    goal_tags: goals,
    difficulty_level: S.diff,
    equipment: [E.tag],
    position: P.tag,
    contraindications: safety.contra,
    red_flags: safety.red,
    sets: dose.sets,
    reps: dose.reps,
    duration_seconds: dose.duration,
    frequency_per_week: dose.freq,
    progression: null, // filled after ordering within family
    regression: null,
    image_url: null, video_url: null,
    source_url: null,
    license_note: 'Treść wygenerowana z szablonów klinicznych FizjoPlan; do weryfikacji przez fizjoterapeutę.',
    _sig: `${region}|${fam.key}|${pos}|${equip}|${stage}|${variant}`,
    _fam: fam.key, _stageOrder: Object.keys(STAGE).indexOf(stage),
  };
}

// stage progression/regression phrasing
const STAGE_PROG_PL = {
  isometric:'przejdź do ruchu z pełnym zakresem', assisted:'wykonuj ruch bez asysty', active:'dodaj opór lub obciążenie',
  concentric:'akcentuj fazę ekscentryczną (powolne opuszczanie)', eccentric:'zwiększ obciążenie lub przejdź do wersji dynamicznej',
  dynamic:'wykonaj na jednej kończynie lub niestabilnym podłożu', loaded:'zwiększ obciążenie o jeden poziom',
  single_limb:'dołóż niestabilne podłoże', unstable:'wydłuż czas lub zmniejsz podparcie',
};
const STAGE_REG_PL = {
  isometric:'skróć czas napięcia i zmniejsz siłę', assisted:'zwiększ zakres asysty', active:'zmniejsz zakres ruchu',
  concentric:'wykonuj tylko izometrię', eccentric:'wróć do wersji koncentrycznej', dynamic:'zwolnij tempo i skróć zakres',
  loaded:'zmniejsz obciążenie', single_limb:'wykonaj obunóż', unstable:'wykonaj na stabilnym podłożu',
};

function main() {
  const TARGET = { neck:100, shoulder:150, elbow:75, wrist_hand:50, thoracic:75, lower_back:175, hip:125, knee:175, ankle_foot:75, general:100 };
  const all = [];
  const report = {};

  for (const region of Object.keys(TARGET)) {
    const families = FAMILIES[region];
    // build all combos per family
    const perFamily = families.map((f) => {
      const combos = [];
      for (const stage of f.stages) for (const pos of f.positions) for (const equip of f.equipment) {
        const primaryGoal = f.goalOverride || STAGE[stage].goal;
        for (const variant of variantsFor(primaryGoal, stage)) {
          combos.push({ f, pos, equip, stage, variant });
        }
      }
      return combos;
    });
    // round-robin interleave across families for variety
    const ordered = [];
    let i = 0, added = true;
    while (added) {
      added = false;
      for (const combos of perFamily) {
        if (i < combos.length) { ordered.push(combos[i]); added = true; }
      }
      i++;
    }
    // dedup by signature, slice to target
    const seen = new Set();
    const chosen = [];
    let seq = 1;
    for (const c of ordered) {
      if (chosen.length >= TARGET[region]) break;
      const sig = `${region}|${c.f.key}|${c.pos}|${c.equip}|${c.stage}|${c.variant}`;
      if (seen.has(sig)) continue;
      seen.add(sig);
      chosen.push(buildOne(region, c.f, c.pos, c.equip, c.stage, c.variant, seq++));
    }
    if (chosen.length < TARGET[region]) {
      throw new Error(`Region ${region}: only ${chosen.length} unique combos, need ${TARGET[region]} — add families/axes.`);
    }
    // fill progression/regression within family using stage order
    const byFam = {};
    chosen.forEach((e) => { (byFam[e._fam] = byFam[e._fam] || []).push(e); });
    for (const e of chosen) {
      e.progression = `Progresja: ${STAGE_PROG_PL[Object.keys(STAGE)[e._stageOrder]] || 'zwiększ liczbę powtórzeń lub obciążenie'}.`;
      e.regression  = `Regresja: ${STAGE_REG_PL[Object.keys(STAGE)[e._stageOrder]] || 'zmniejsz zakres lub liczbę powtórzeń'}.`;
    }
    report[region] = chosen.length;
    all.push(...chosen);
  }

  // strip helper keys
  const clean = all.map(({ _sig, _fam, _stageOrder, ...rest }) => rest);

  // emit TS — embed as JSON parsed at load so tsc does not infer a giant
  // union type over 1100 object literals (TS2590).
  const json = JSON.stringify(clean);
  const ts = `// AUTO-GENERATED by scripts/generate_exercises.js — DO NOT EDIT BY HAND.
// ${clean.length} exercises composed from curated bilingual clinical templates.
import type { Exercise } from '../types';

export const GENERATED_EXERCISES: Exercise[] = JSON.parse(
  ${'`'}${json}${'`'}
) as Exercise[];
`;
  fs.writeFileSync(__dirname + '/../src/data/exercisesGenerated.ts', ts);
  console.log('GENERATED', clean.length, 'exercises');
  console.log('Per region:', JSON.stringify(report));
}

main();
