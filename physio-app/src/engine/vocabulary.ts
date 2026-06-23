// ---------------------------------------------------------------------------
// Controlled vocabularies. Centralising these keeps the analyzer, the seed
// data, and the admin panel consistent. Add new values here first.
// ---------------------------------------------------------------------------

export const CONDITION_TAGS = [
  // generic
  'tendinopathy',
  'osteoarthritis',
  'general_deconditioning',
  'general_mobility',
  'postural_overload',
  // neck
  'neck_pain',
  'cervical_radiculopathy', // cautious mode (neurological)
  // shoulder
  'shoulder_impingement',
  'rotator_cuff_tendinopathy',
  'frozen_shoulder', // adhesive capsulitis
  // elbow / wrist / hand
  'lateral_epicondylalgia', // tennis elbow
  'medial_epicondylalgia', // golfer's elbow
  'carpal_tunnel',
  // thoracic
  'thoracic_stiffness',
  // low back
  'mechanical_low_back_pain',
  'sciatica', // cautious mode (neurological)
  // hip
  'hip_pain',
  'hip_impingement',
  'gluteal_tendinopathy',
  // knee
  'knee_pain',
  'patellofemoral_pain',
  'post_acl', // after ACL reconstruction
  // ankle / foot
  'ankle_sprain',
  'achilles_tendinopathy',
  // balance / senior
  'balance_senior',
] as const;

export const TISSUE_TAGS = [
  'tendon',
  'muscle',
  'joint_capsule',
  'ligament',
  'nerve',
  'cartilage',
  'fascia',
] as const;

export const GOAL_TAGS = [
  'mobility',
  'stretch',
  'strength',
  'stability',
  'motor_control',
  'pain_relief',
  'circulation',
  'balance',
  'neural_glide',
  'breathing',
] as const;

export const EQUIPMENT = [
  'none',
  'chair',
  'wall',
  'resistance_band',
  'light_weight',
  'foam_roller',
  'towel',
  'step',
  'mat',
] as const;

// Contraindication flags are produced by the analyzer (from acute-phase / risk
// language) and matched against exercise.contraindications. If they intersect,
// the exercise is excluded from the plan.
export const CONTRAINDICATION_FLAGS = [
  'acute_inflammation',
  'recent_surgery_unhealed',
  'severe_pain',
  'instability',
] as const;

// ---------------------------------------------------------------------------
// Safety categories. Higher-level caution states detected from the complaint.
// Some HALT normal plan generation (red_flag, post_surgery, acute_pain) and
// trigger a gentle "safe plan". Others act as soft cautions: they cap difficulty
// and exclude exercises that list the matching caution in `contraindications`.
// ---------------------------------------------------------------------------
export const SAFETY_CATEGORIES = [
  'red_flag',
  'post_surgery',
  'acute_pain',
  'neurological_symptoms',
  'osteoporosis_caution',
  'pregnancy_caution',
  'elderly_caution',
  'high_irritability',
] as const;

// Categories that force a gentle, safety-first plan instead of a normal one.
export const HALT_CATEGORIES: SafetyCategory[] = ['red_flag', 'post_surgery', 'acute_pain'];

// Conditions that imply a neurological cautious mode (radicular / nerve-related).
export const CAUTIOUS_CONDITIONS: string[] = ['cervical_radiculopathy', 'sciatica'];

export type ConditionTag = (typeof CONDITION_TAGS)[number];
export type TissueTag = (typeof TISSUE_TAGS)[number];
export type GoalTag = (typeof GOAL_TAGS)[number];
export type EquipmentTag = (typeof EQUIPMENT)[number];
export type SafetyCategory = (typeof SAFETY_CATEGORIES)[number];
