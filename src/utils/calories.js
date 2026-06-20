// BMR using Mifflin-St Jeor, TDEE with activity multiplier
export function calcBMR({ gender, age, weight, height }) {
  // weight in kg, height in cm
  const base = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'male' ? base + 5 : base - 161;
}

// bodyType maps to activity level
const ACTIVITY = {
  skinny: 1.375,    // lightly active
  average: 1.55,    // moderately active
  athletic: 1.725,  // very active
  bulky: 1.725,
  'skinny fat': 1.375,
  overweight: 1.375,
};

export function calcTDEE(profile) {
  const bmr = calcBMR(profile);
  const multiplier = ACTIVITY[profile.bodyType] || 1.55;
  return Math.round(bmr * multiplier);
}

// Standard macro split: 30% protein, 40% carbs, 25% fat, 5% fiber (by calories)
// protein & carbs = 4 kcal/g, fat = 9 kcal/g, fiber ~2 kcal/g
export function calcMacroGoals(tdee) {
  return {
    protein: Math.round((tdee * 0.30) / 4),
    carbs:   Math.round((tdee * 0.40) / 4),
    fat:     Math.round((tdee * 0.25) / 9),
    fiber:   Math.round((tdee * 0.05) / 2),
  };
}

// Calories burned per step (rough estimate)
export const CALS_PER_STEP = 0.04;

// Exercise calorie burn estimates (per minute)
export const EXERCISE_METS = {
  walking: 3.5,
  running: 9.8,
  cycling: 7.5,
  swimming: 7.0,
  'weight training': 5.0,
  yoga: 2.5,
  hiit: 10.0,
  other: 5.0,
};

export function calcExerciseCals(exercise, durationMin, weightKg) {
  const met = EXERCISE_METS[exercise.toLowerCase()] || 5.0;
  return Math.round((met * weightKg * durationMin) / 60);
}
