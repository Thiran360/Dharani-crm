// Dharani ERP API Configuration
const STORAGE_KEY = 'dharani_erp_config';

const DEFAULT_CONFIG = {
  // Can point to proxy (/dharani-api) or direct server URL
  baseUrl: '/dharani-api',
  directServerUrl: 'http://dland.southindia.cloudapp.azure.com/fnvNETWebApiV3',
  dbName: 'TRIAL_DHARANI_2526_INV',
  loginName: 'dh_user_09',
  password: '$Ki45yu',
  portal: 'VEDAI'
};

export const getDharaniConfig = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load Dharani config from localStorage', e);
  }
  return { ...DEFAULT_CONFIG };
};

export const saveDharaniConfig = (newConfig) => {
  try {
    const updated = { ...getDharaniConfig(), ...newConfig };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Failed to save Dharani config', e);
    return DEFAULT_CONFIG;
  }
};

export const resetDharaniConfig = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
  return DEFAULT_CONFIG;
};

export default DEFAULT_CONFIG;
