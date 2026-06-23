// ---------------------------------------------------------------------------
// Search synonyms & abbreviations -> canonical terms (taxonomy tags / regions).
// Keys are diacritic-free, lowercased. Used to expand a query before matching.
// ---------------------------------------------------------------------------

export const SEARCH_SYNONYMS: Record<string, string[]> = {
  // abbreviations / clinical shorthand
  gtps: ['gluteal_tendinopathy', 'hip', 'posladek', 'biodro'],
  acl: ['post_acl', 'knee', 'kolano', 'wiezadlo krzyzowe'],
  pfps: ['patellofemoral_pain', 'knee', 'kolano', 'rzepka'],
  fai: ['hip_impingement', 'hip', 'biodro'],
  'rotator cuff': ['rotator_cuff_tendinopathy', 'shoulder', 'bark', 'stozek rotatorow'],
  rtc: ['rotator_cuff_tendinopathy', 'shoulder'],
  'tennis elbow': ['lateral_epicondylalgia', 'elbow', 'lokiec'],
  'golfer elbow': ['medial_epicondylalgia', 'elbow', 'lokiec'],
  'carpal tunnel': ['carpal_tunnel', 'wrist_hand', 'nadgarstek'],
  cts: ['carpal_tunnel', 'wrist_hand'],
  'frozen shoulder': ['frozen_shoulder', 'shoulder', 'bark'],
  // Polish lay terms -> tags
  'rwa kulszowa': ['sciatica', 'lower_back', 'kulszowy'],
  kulszowa: ['sciatica', 'lower_back'],
  'lokiec tenisisty': ['lateral_epicondylalgia', 'elbow'],
  'lokiec golfisty': ['medial_epicondylalgia', 'elbow'],
  'zamrozony bark': ['frozen_shoulder', 'shoulder'],
  'kolano biegacza': ['patellofemoral_pain', 'knee'],
  rownowaga: ['balance_senior', 'general', 'balance'],
  'cisnienie nadgarstka': ['carpal_tunnel', 'wrist_hand'],
  'cisni nadgarstka': ['carpal_tunnel', 'wrist_hand'],
  // region lay synonyms
  plecy: ['lower_back', 'krzyz', 'ledzwie'],
  krzyz: ['lower_back'],
  kark: ['neck'],
  posladek: ['hip', 'gluteal_tendinopathy'],
  lydka: ['ankle_foot', 'achilles_tendinopathy'],
  pieta: ['ankle_foot'],
};
