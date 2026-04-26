export const Colors = {
  primary: '#4A90D9',
  secondary: '#7B68EE',
  accent: '#FF6B6B',
  success: '#51CF66',
  warning: '#FFD43B',
  background: '#F8F9FA',
  cardBackground: '#FFFFFF',
  textPrimary: '#212529',
  textSecondary: '#6C757D',
  border: '#E9ECEF',
};

export const ClassColors = [
  '#4A90D9', '#7B68EE', '#FF6B6B', '#51CF66',
  '#FFD43B', '#FF922B', '#20C997', '#845EF7',
  '#F06595', '#339AF0', '#22B8CF', '#94D82D',
];

export const DAYS_OF_WEEK = [
  { id: 2, name: 'Pazartesi', short: 'Pzt' },
  { id: 3, name: 'Sali', short: 'Sal' },
  { id: 4, name: 'Carsamba', short: 'Car' },
  { id: 5, name: 'Persembe', short: 'Per' },
  { id: 6, name: 'Cuma', short: 'Cum' },
  { id: 7, name: 'Cumartesi', short: 'Cmt' },
  { id: 1, name: 'Pazar', short: 'Paz' },
];

export const DAY_NAMES: Record<number, string> = {
  1: 'Pazar', 2: 'Pazartesi', 3: 'Sali', 4: 'Carsamba',
  5: 'Persembe', 6: 'Cuma', 7: 'Cumartesi',
};

export const SECURE_STORE_KEYS = {
  DEEPSEEK_API_KEY: 'deepseek_api_key',
};

export const STORAGE_KEYS = {
  AUTO_TRANSCRIBE: 'auto_transcribe',
  NOTIFICATIONS_ENABLED: 'notifications_enabled',
  CURRENT_TRANSCRIPT: 'current_transcript',
};
