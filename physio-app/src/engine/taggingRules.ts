import type { BodyRegion } from '../types';

// ---------------------------------------------------------------------------
// Bilingual (EN + PL) keyword rules for the auto-tagging engine. Kept separate
// from the analyzer's knowledgeBase because tagging works on exercise content
// (title + instructions), not patient complaints, and must cover English source
// material from external libraries. Keywords are diacritic-free, lowercased.
// ---------------------------------------------------------------------------

export interface TagRule<T extends string = string> {
  tag: T;
  keywords: string[];
  /** Optional weight (default 1) to bias strong signals. */
  weight?: number;
}

export const REGION_TAG_RULES: TagRule<BodyRegion>[] = [
  { tag: 'neck', keywords: ['neck', 'cervical', 'szyj', 'kark', 'chin tuck', 'cranio'] },
  { tag: 'shoulder', keywords: ['shoulder', 'rotator', 'scapt', 'deltoid', 'bark', 'ramie', 'scapula', 'lopatk', 'pendulum', 'glenohumeral'] },
  { tag: 'elbow', keywords: ['elbow', 'epicond', 'lokc', 'lokie', 'forearm', 'przedrami'] },
  { tag: 'wrist_hand', keywords: ['wrist', 'hand', 'finger', 'carpal', 'nadgarst', 'dlon', 'palc', 'thumb', 'tendon glide', 'median nerve'] },
  { tag: 'thoracic', keywords: ['thoracic', 'mid back', 'upper back', 'piersiow', 'lopatk', 'open book', 'wall angel'] },
  { tag: 'lower_back', keywords: ['lower back', 'lumbar', 'low back', 'ledzw', 'krzyz', 'pelvic tilt', 'bird dog', 'dead bug', 'core', 'sciatic'] },
  { tag: 'hip', keywords: ['hip', 'glute', 'gluteal', 'clamshell', 'biodr', 'posladk', 'abduction', 'piriformis', 'groin', 'pachwin'] },
  { tag: 'knee', keywords: ['knee', 'quad', 'patell', 'kolan', 'rzepk', 'acl', 'hamstring curl', 'squat', 'step up', 'wall sit'] },
  { tag: 'ankle_foot', keywords: ['ankle', 'foot', 'calf', 'achilles', 'heel raise', 'kostk', 'stopa', 'lydk', 'eversion', 'balance board'] },
];

export const CONDITION_TAG_RULES: TagRule[] = [
  { tag: 'neck_pain', keywords: ['neck pain', 'bol szyi', 'cervical pain'] },
  { tag: 'cervical_radiculopathy', keywords: ['radiculopathy', 'nerve glide neck', 'radikulopat', 'cervical nerve'] },
  { tag: 'shoulder_impingement', keywords: ['impingement', 'subacromial', 'podbarkow'] },
  { tag: 'rotator_cuff_tendinopathy', keywords: ['rotator cuff', 'supraspinatus', 'stozek rotator', 'external rotation'] },
  { tag: 'frozen_shoulder', keywords: ['frozen shoulder', 'adhesive capsulitis', 'zamrozony bark', 'pendulum', 'wall walk'] },
  { tag: 'lateral_epicondylalgia', keywords: ['tennis elbow', 'lateral epicond', 'lokiec tenisisty', 'wrist extensor'] },
  { tag: 'medial_epicondylalgia', keywords: ['golfer elbow', 'medial epicond', 'lokiec golfisty', 'wrist flexor'] },
  { tag: 'carpal_tunnel', keywords: ['carpal tunnel', 'median nerve', 'ciesni nadgarst', 'tendon glide'] },
  { tag: 'thoracic_stiffness', keywords: ['thoracic mobility', 'thoracic stiffness', 'sztywnosc piersiow', 'open book', 'thoracic extension'] },
  { tag: 'mechanical_low_back_pain', keywords: ['low back pain', 'lumbar', 'mechanical back', 'bol plecow', 'core stability'] },
  { tag: 'sciatica', keywords: ['sciatica', 'sciatic nerve', 'rwa kulszowa', 'kulszow'] },
  { tag: 'hip_pain', keywords: ['hip pain', 'bol biodra'] },
  { tag: 'hip_impingement', keywords: ['femoroacetabular', 'fai', 'hip impingement', 'konflikt biodr'] },
  { tag: 'gluteal_tendinopathy', keywords: ['gluteal tendin', 'gtps', 'greater trochanter', 'glute med', 'posladk', 'abduction'] },
  { tag: 'patellofemoral_pain', keywords: ['patellofemoral', 'pfps', 'runners knee', 'rzepk', 'anterior knee'] },
  { tag: 'post_acl', keywords: ['acl', 'anterior cruciate', 'post-op knee', 'rekonstrukcj', 'krzyzow'] },
  { tag: 'knee_pain', keywords: ['knee pain', 'bol kolana'] },
  { tag: 'ankle_sprain', keywords: ['ankle sprain', 'lateral ligament', 'skrecenie kostki', 'inversion injury', 'eversion'] },
  { tag: 'achilles_tendinopathy', keywords: ['achilles', 'calf raise', 'heel raise eccentric', 'sciegno achillesa'] },
  { tag: 'balance_senior', keywords: ['balance', 'fall prevention', 'tandem', 'rownowag', 'senior', 'proprioception'] },
  { tag: 'osteoarthritis', keywords: ['osteoarthritis', 'arthritis', 'zwyrodnienie', 'artroza'] },
  { tag: 'tendinopathy', keywords: ['tendinopathy', 'tendinitis', 'tendin', 'eccentric loading'] },
  { tag: 'postural_overload', keywords: ['posture', 'desk', 'postural', 'siedzac', 'biur'] },
  { tag: 'general_mobility', keywords: ['mobility', 'range of motion', 'rom', 'mobilnosc', 'stretch'] },
  { tag: 'general_deconditioning', keywords: ['conditioning', 'general fitness', 'walking', 'aerobic', 'kondycj'] },
];

export const GOAL_TAG_RULES: TagRule[] = [
  { tag: 'strength', keywords: ['strength', 'strengthen', 'resistance', 'curl', 'press', 'raise', 'wzmacni', 'sila', 'squat'] },
  { tag: 'stretch', keywords: ['stretch', 'lengthen', 'rozciagani', 'rozciag'] },
  { tag: 'mobility', keywords: ['mobility', 'range of motion', 'rom', 'mobiliz', 'slide', 'rotation', 'mobilnosc', 'zakres'] },
  { tag: 'stability', keywords: ['stability', 'stabil', 'control', 'plank', 'bridge', 'anti-rotation'] },
  { tag: 'motor_control', keywords: ['motor control', 'coordination', 'activation', 'setting', 'kontrol', 'aktywacj'] },
  { tag: 'balance', keywords: ['balance', 'proprioception', 'tandem', 'single leg', 'rownowag'] },
  { tag: 'pain_relief', keywords: ['pain relief', 'gentle', 'soothe', 'rozluzni', 'pain-free', 'bezbolesn'] },
  { tag: 'circulation', keywords: ['circulation', 'aerobic', 'walking', 'pumping', 'krazeni', 'marsz'] },
  { tag: 'neural_glide', keywords: ['nerve glide', 'nerve slider', 'neural', 'flossing', 'slizg nerw'] },
  { tag: 'breathing', keywords: ['breathing', 'diaphragm', 'breath', 'oddech', 'przepon'] },
];

export const TISSUE_TAG_RULES: TagRule[] = [
  { tag: 'tendon', keywords: ['tendon', 'tendin', 'sciegn', 'eccentric'] },
  { tag: 'muscle', keywords: ['muscle', 'strength', 'misni', 'miesni', 'activation'] },
  { tag: 'joint_capsule', keywords: ['capsule', 'joint', 'mobiliz', 'torebk', 'rotation', 'staw'] },
  { tag: 'ligament', keywords: ['ligament', 'sprain', 'wiezadl', 'stability'] },
  { tag: 'nerve', keywords: ['nerve', 'neural', 'glide', 'nerw', 'radicul'] },
  { tag: 'cartilage', keywords: ['cartilage', 'chondral', 'chrzastk', 'osteoarthritis'] },
  { tag: 'fascia', keywords: ['fascia', 'foam roll', 'powiez', 'myofascial'] },
];

export const EQUIPMENT_TAG_RULES: TagRule[] = [
  { tag: 'resistance_band', keywords: ['band', 'theraband', 'elastic', 'tasm', 'resistance band'] },
  { tag: 'light_weight', keywords: ['dumbbell', 'weight', 'kettlebell', 'ciezar', 'obciaznik', 'hantl'] },
  { tag: 'foam_roller', keywords: ['foam roll', 'roller', 'roller', 'rolka'] },
  { tag: 'chair', keywords: ['chair', 'seated', 'krzesl', 'siedzac'] },
  { tag: 'wall', keywords: ['wall', 'scian'] },
  { tag: 'step', keywords: ['step', 'stair', 'stopien', 'stopni'] },
  { tag: 'towel', keywords: ['towel', 'recznik'] },
  { tag: 'mat', keywords: ['mat', 'floor', 'lying', 'supine', 'prone', 'mata', 'lezac'] },
];

export const POSITION_TAG_RULES: TagRule[] = [
  { tag: 'supine', keywords: ['supine', 'lying on back', 'lezac na plecach', 'na plecach'] },
  { tag: 'prone', keywords: ['prone', 'lying on stomach', 'na brzuchu'] },
  { tag: 'side_lying', keywords: ['side lying', 'side-lying', 'na boku'] },
  { tag: 'seated', keywords: ['seated', 'sitting', 'siedzac', 'w siadzie'] },
  { tag: 'standing', keywords: ['standing', 'stojac', 'na stojaco'] },
  { tag: 'quadruped', keywords: ['quadruped', 'all fours', 'klek podparty', 'four point'] },
  { tag: 'half_kneeling', keywords: ['half kneeling', 'half-kneeling', 'polkleku', 'polklek'] },
];

// Difficulty inference cues.
export const DIFFICULTY_CUES: { level: number; keywords: string[] }[] = [
  { level: 1, keywords: ['gentle', 'beginner', 'easy', 'isometric', 'pain-free', 'introductory', 'lagodn', 'delikatn', 'poczatkujac'] },
  { level: 3, keywords: ['advanced', 'single leg', 'single-leg', 'plyometric', 'jump', 'eyes closed', 'unstable surface', 'zaawansowan', 'jednonoz', 'skok'] },
];
