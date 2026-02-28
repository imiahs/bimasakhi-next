export const STORAGE_KEYS = {
  CONFIG: 'bimasakhi_config',
  USER: 'bimasakhi_user_session',
  LEAD_LOG: 'bimasakhi_leads_log' // Admin view only
};

export const getStorage = (key, defaultValue) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error(`Error reading ${key} from storage`, error);
    return defaultValue;
  }
};

export const setStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing ${key} to storage`, error);
  }
};
