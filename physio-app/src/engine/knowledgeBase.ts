import type { BodyRegion } from '../types';

// ---------------------------------------------------------------------------
// Knowledge base for the rule-based analyzer. Everything is keyword-driven and
// deliberately data-only so it can be edited without touching logic, and so a
// future LLM analyzer can be dropped in behind the same AnalysisResult shape.
//
// Matching is done on diacritic-stripped, lowercased text, so keywords here are
// written WITHOUT Polish diacritics (e.g. 'lokiec' not 'łokieć').
//
// Keywords are matched as SUBSTRINGS, so we use short STEMS to tolerate Polish
// inflection (e.g. 'plec' matches plecy/pleców/plecach). Avoid stems that
// collide with unrelated words.
// ---------------------------------------------------------------------------

export interface RegionRule {
  region: BodyRegion;
  keywords: string[];
}

export const REGION_RULES: RegionRule[] = [
  { region: 'neck', keywords: ['szyj', 'kark', 'neck', 'cervical', 'odcinek szyjn'] },
  { region: 'shoulder', keywords: ['bark', 'ramien', 'ramie', 'shoulder', 'rotator', 'staw ramienn'] },
  { region: 'elbow', keywords: ['lokc', 'lokie', 'elbow', 'epicond'] },
  { region: 'wrist_hand', keywords: ['nadgarst', 'dlon', 'reki', 'reka', 'palc', 'wrist', 'hand', 'kciuk', 'ciesni nadgarst'] },
  { region: 'thoracic', keywords: ['piersiow', 'miedzy lopatk', 'lopatk', 'thoracic', 'upper back', 'odcinek piersiow'] },
  {
    region: 'lower_back',
    keywords: ['kregoslup', 'dolny odcin', 'dolneg odcin', 'ledzw', 'krzyz', 'plec', 'low back', 'lower back', 'lumbar', 'back pain', 'lumbago'],
  },
  { region: 'hip', keywords: ['biodr', 'pachwin', 'posladk', 'hip', 'groin', 'krzeta'] },
  { region: 'knee', keywords: ['kolan', 'rzepk', 'acl', 'wiezadl', 'knee', 'patella', 'lakotk'] },
  { region: 'ankle_foot', keywords: ['kostk', 'stopa', 'stopie', 'stopy', 'achilles', 'sciegno achillesa', 'ankle', 'foot', 'pieta', 'srodstop'] },
];

export interface ConditionRule {
  condition: string;
  region?: BodyRegion;
  keywords: string[];
  goalTags: string[];
}

export const CONDITION_RULES: ConditionRule[] = [
  // ---- neck ----
  {
    condition: 'neck_pain',
    region: 'neck',
    keywords: [' bol szyi', 'szyj', 'kark', 'sztywnosc szyi', 'po komputerze', 'neck pain'],
    goalTags: ['mobility', 'pain_relief', 'motor_control'],
  },
  {
    condition: 'cervical_radiculopathy',
    region: 'neck',
    keywords: ['promieniuje do reki', 'drETwienie reki', 'dretwienie reki', 'mrowienie reki', 'korzeniow', 'radikulopat', 'reka dretwieje'],
    goalTags: ['neural_glide', 'mobility', 'pain_relief'],
  },
  // ---- shoulder ----
  {
    condition: 'shoulder_impingement',
    region: 'shoulder',
    keywords: ['unoszeniu reki', 'przy unoszeniu', 'bol barku', 'impingement', 'ciasnota podbarkow', 'lukbolen'],
    goalTags: ['mobility', 'motor_control', 'pain_relief'],
  },
  {
    condition: 'rotator_cuff_tendinopathy',
    region: 'shoulder',
    keywords: ['stozek rotator', 'rotator', 'naderwanie barku', 'sciegno barku', 'rotatorow'],
    goalTags: ['strength', 'motor_control', 'pain_relief'],
  },
  {
    condition: 'frozen_shoulder',
    region: 'shoulder',
    keywords: ['zamrozony bark', 'frozen shoulder', 'zarostowe zapalenie torebki', 'sztywny bark', 'ograniczony zakres barku'],
    goalTags: ['mobility', 'stretch', 'pain_relief'],
  },
  // ---- elbow / wrist ----
  {
    condition: 'lateral_epicondylalgia',
    region: 'elbow',
    keywords: ['tennis elbow', 'lokiec tenisisty', 'lokc', 'epicond', 'lateral elbow', 'bol po zewnetrznej lokcia'],
    goalTags: ['strength', 'mobility', 'pain_relief'],
  },
  {
    condition: 'medial_epicondylalgia',
    region: 'elbow',
    keywords: ['lokiec golfisty', 'golfer', 'po wewnetrznej lokcia', 'medial elbow', 'przysrodkow'],
    goalTags: ['strength', 'mobility', 'pain_relief'],
  },
  {
    condition: 'carpal_tunnel',
    region: 'wrist_hand',
    keywords: ['ciesni nadgarst', 'zespol ciesni', 'carpal', 'dretwienie palcow', 'mrowienie palcow', 'dretwiej palce'],
    goalTags: ['neural_glide', 'mobility', 'pain_relief'],
  },
  // ---- thoracic ----
  {
    condition: 'thoracic_stiffness',
    region: 'thoracic',
    keywords: ['sztywnosc piersiow', 'odcinek piersiow', 'miedzy lopatk', 'thoracic', 'plecy gorne', 'garbienie'],
    goalTags: ['mobility', 'stretch', 'pain_relief'],
  },
  {
    condition: 'postural_overload',
    keywords: ['biur', 'desk work', 'siedzaca praca', 'komputer', 'praca przy komputerze', 'postur', 'siedzacy tryb'],
    goalTags: ['mobility', 'strength', 'pain_relief'],
  },
  // ---- low back ----
  {
    condition: 'mechanical_low_back_pain',
    region: 'lower_back',
    keywords: ['plec', 'krzyz', 'low back', 'ledzw', 'po siedzeniu', 'desk', 'biur', 'lumbago', 'bol dolu plecow'],
    goalTags: ['mobility', 'motor_control', 'pain_relief', 'strength'],
  },
  {
    condition: 'sciatica',
    region: 'lower_back',
    keywords: ['rwa kulszowa', 'kulszow', 'promieniuje do nogi', 'dretwienie nogi', 'sciatica', 'korzeniow', 'bol do posladka i nogi'],
    goalTags: ['neural_glide', 'mobility', 'pain_relief'],
  },
  // ---- hip ----
  {
    condition: 'hip_pain',
    region: 'hip',
    keywords: ['bol biodra', 'biodr', 'pachwin', 'hip pain'],
    goalTags: ['mobility', 'strength', 'pain_relief'],
  },
  {
    condition: 'hip_impingement',
    region: 'hip',
    keywords: ['biodro przy siedzeniu', 'konflikt biodrow', 'impingement', 'fai', 'ciasnota biodra'],
    goalTags: ['mobility', 'stability', 'pain_relief'],
  },
  {
    condition: 'gluteal_tendinopathy',
    region: 'hip',
    keywords: ['posladk', 'krzeta', 'bol z boku biodra', 'gluteal', 'trochanter', 'przyczep posladka'],
    goalTags: ['strength', 'pain_relief'],
  },
  // ---- knee ----
  {
    condition: 'knee_pain',
    region: 'knee',
    keywords: ['bol kolana', 'kolan', 'knee pain'],
    goalTags: ['strength', 'mobility', 'pain_relief'],
  },
  {
    condition: 'patellofemoral_pain',
    region: 'knee',
    keywords: ['rzepk', 'przodu kolana', 'patella', 'biegacz', 'po schodach', 'kolano biegacza'],
    goalTags: ['strength', 'motor_control', 'pain_relief'],
  },
  {
    condition: 'post_acl',
    region: 'knee',
    keywords: ['acl', 'wiezadl', 'rekonstrukcj', 'reconstruction', 'po operacji kolana', 'krzyzow'],
    goalTags: ['stability', 'strength', 'motor_control'],
  },
  // ---- ankle / foot ----
  {
    condition: 'ankle_sprain',
    region: 'ankle_foot',
    keywords: ['skrecenie kostki', 'skrecenie kostk', 'skrecona kostk', 'ankle sprain', 'podwinieta noga', 'naciagniecie wiezadel kostki'],
    goalTags: ['stability', 'balance', 'mobility'],
  },
  {
    condition: 'achilles_tendinopathy',
    region: 'ankle_foot',
    keywords: ['achilles', 'sciegno achillesa', 'bol pod pieta', 'tyl pity', 'achilles tendin'],
    goalTags: ['strength', 'pain_relief'],
  },
  // ---- balance / senior & general ----
  {
    condition: 'balance_senior',
    keywords: ['rownowag', 'senior', 'podeszly wiek', 'osoba starsza', 'upadk', 'niestabilny chod', 'chwianie'],
    goalTags: ['balance', 'stability', 'strength'],
  },
  {
    condition: 'general_mobility',
    keywords: ['ogolna sprawnosc', 'rozruszanie', 'mobilnosc', 'rozcieganie ogolne', 'ogolna mobilnosc'],
    goalTags: ['mobility', 'circulation'],
  },
  // ---- generic overlays ----
  {
    condition: 'tendinopathy',
    keywords: ['sciegno', 'tendin', 'przeciazenie', 'overuse', 'tendon'],
    goalTags: ['strength', 'pain_relief'],
  },
  {
    condition: 'osteoarthritis',
    keywords: ['zwyrodnienie', 'artroza', 'osteoarthritis', 'arthritis', 'chrzastk', 'choroba zwyrodnieniow'],
    goalTags: ['mobility', 'strength', 'circulation', 'pain_relief'],
  },
];

// ---------------------------------------------------------------------------
// Red flags: serious symptoms that warrant medical review BEFORE self-exercise.
// These trigger a prominent warning and switch the plan to gentle/safety mode.
// ---------------------------------------------------------------------------
export interface RedFlagRule {
  code: string;
  keywords: string[];
  message_pl: string;
}

export const RED_FLAG_RULES: RedFlagRule[] = [
  {
    code: 'neuro_bilateral',
    keywords: ['dretwienie obu', 'dretwienie obu nog', 'oslabienie obu nog', 'mrowienie obu', 'numbness both', 'oslabienie konczyn', 'oslabienie nog'],
    message_pl:
      'Opisujesz objawy neurologiczne obejmujące obie kończyny (drętwienie/osłabienie). Skonsultuj się pilnie z lekarzem przed ćwiczeniami.',
  },
  {
    code: 'bladder_bowel',
    keywords: ['nietrzymanie', 'pecherz', 'zwieracz', 'bladder', 'bowel', 'kontrola moczu', 'nietrzymanie moczu', 'nietrzymanie stolca'],
    message_pl:
      'Problemy z kontrolą pęcherza/jelit przy bólu pleców wymagają PILNEJ konsultacji lekarskiej (możliwy zespół ogona końskiego). Nie zwlekaj.',
  },
  {
    code: 'night_pain_fever',
    keywords: ['goraczka', 'fever', 'nocny bol', 'bol w nocy', 'budzi mnie bol', 'utrata wagi', 'weight loss', 'poty nocne'],
    message_pl:
      'Ból nocny, gorączka lub utrata masy ciała to objawy alarmowe — przed ćwiczeniami skonsultuj się z lekarzem.',
  },
  {
    code: 'trauma',
    keywords: ['swiezy uraz', 'powazny uraz', 'wypadek', 'zlamanie', 'fracture', 'zwichniecie', 'uraz wysokoenergetyczny'],
    message_pl:
      'Po świeżym, poważnym urazie najpierw wyklucz uszkodzenie kostne/więzadłowe u lekarza, zanim zaczniesz ćwiczyć.',
  },
  {
    code: 'chest_systemic',
    keywords: ['klatka piersiowa', 'chest pain', 'dusznosc', 'kolatanie serca', 'bol w klatce', 'zawroty glowy z bolem'],
    message_pl:
      'Ból w klatce piersiowej / duszność nie są wskazaniem do ćwiczeń — to objawy wymagające pilnej oceny medycznej.',
  },
];

// ---------------------------------------------------------------------------
// Acute-phase language -> contraindication flags (exclude matching exercises).
// ---------------------------------------------------------------------------
export interface ContraindicationRule {
  flag: string;
  keywords: string[];
}

export const CONTRAINDICATION_RULES: ContraindicationRule[] = [
  {
    flag: 'acute_inflammation',
    keywords: ['obrzek', 'opuchlizna', 'opuchniet', 'zaczerwienienie', 'gorace', 'swelling', 'inflamed', 'ostry stan', 'zapaln'],
  },
  {
    flag: 'severe_pain',
    keywords: ['nie do wytrzymania', 'bardzo silny bol', 'severe pain', 'paralizujacy', '10/10', 'potworny bol'],
  },
  {
    flag: 'recent_surgery_unhealed',
    keywords: ['swieza rana', 'niezagojona', 'kilka dni po operacji', 'tydzien po operacji', 'few days after surgery', 'rana pooperacyjna'],
  },
  {
    flag: 'instability',
    keywords: ['ucieka mi kolano', 'niestabilne', 'giving way', 'wypada staw', 'unstable', 'staw ucieka'],
  },
];

// ---------------------------------------------------------------------------
// Caution language -> safety categories. Some HALT normal planning (handled in
// the analyzer/plan generator); others soften it.
// ---------------------------------------------------------------------------
export interface CautionRule {
  category: string;
  keywords: string[];
}

export const CAUTION_RULES: CautionRule[] = [
  {
    category: 'post_surgery',
    keywords: ['po operacji', 'pooperacyjn', 'po zabiegu', 'po endoprotez', 'after surgery', 'po artroskopii', 'tygodni po operacji'],
  },
  {
    category: 'acute_pain',
    keywords: ['ostry bol', 'nagly bol', 'swiezy bol', 'od wczoraj silny', 'acute pain', 'nagly silny bol'],
  },
  {
    category: 'neurological_symptoms',
    keywords: ['dretwienie', 'mrowienie', 'promieniuje', 'oslabienie', 'numbness', 'tingling', 'korzeniow', 'rwa kulszowa'],
  },
  {
    category: 'osteoporosis_caution',
    keywords: ['osteoporoz', 'osteopeni', 'osteoporosis', 'kruche kosci', 'niska gestosc kosci'],
  },
  {
    category: 'pregnancy_caution',
    keywords: ['ciaza', 'w ciazy', 'ciezarn', 'pregnant', 'pregnancy', 'trymestr', 'po porodzie'],
  },
  {
    category: 'elderly_caution',
    keywords: ['senior', 'podeszly wiek', 'osoba starsza', '70 lat', '80 lat', 'emeryt', 'starsza osoba'],
  },
  {
    category: 'high_irritability',
    keywords: ['bol caly czas', 'bol w spoczynku', 'bol non stop', 'nie moge spac z bolu', 'bol przy kazdym ruchu', 'highly irritable', 'bol nasila sie latwo'],
  },
];
