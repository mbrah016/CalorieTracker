import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
  PROFILE: 'profile',
  LOG_PREFIX: 'log_',
};

export const dateKey = (date) => {
  const d = new Date(date);
  return `${KEYS.LOG_PREFIX}${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

export const todayKey = () => dateKey(new Date());

export async function getProfile() {
  const raw = await AsyncStorage.getItem(KEYS.PROFILE);
  return raw ? JSON.parse(raw) : null;
}

export async function saveProfile(profile) {
  await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
}

export async function getLogForDate(date) {
  const raw = await AsyncStorage.getItem(dateKey(date));
  return raw ? JSON.parse(raw) : { meals: [], exercises: [], steps: 0 };
}

export async function saveLogForDate(date, log) {
  await AsyncStorage.setItem(dateKey(date), JSON.stringify(log));
}

// Keep backward-compat aliases
export const getTodayLog = () => getLogForDate(new Date());
export const saveTodayLog = (log) => saveLogForDate(new Date(), log);
