import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { setLanguage as i18nSetLanguage, type Language } from '../i18n';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguagePreference = Language | 'auto';

interface Preferences {
  themeMode: ThemeMode;
  oledMode: boolean;
  language: LanguagePreference;
  notificationsEnabled: boolean;
}

interface PreferencesContextValue extends Preferences {
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  setOledMode: (oled: boolean) => Promise<void>;
  setLanguage: (lang: LanguagePreference) => Promise<void>;
  setNotificationsEnabled: (val: boolean) => Promise<void>;
  effectiveScheme: 'light' | 'dark';
}

const STORAGE_KEY = '@lecturemate/preferences';
const DEFAULTS: Preferences = {
  themeMode: 'system',
  oledMode: false,
  language: 'auto',
  notificationsEnabled: false,
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setPrefs({ ...DEFAULTS, ...parsed });
            if (parsed.language) i18nSetLanguage(parsed.language);
          } catch {}
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const persist = async (updates: Partial<Preferences>) => {
    const next = { ...prefs, ...updates };
    setPrefs(next);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value: PreferencesContextValue = {
    ...prefs,
    effectiveScheme:
      prefs.themeMode === 'system'
        ? (systemScheme === 'dark' ? 'dark' : 'light')
        : prefs.themeMode,
    setThemeMode: (mode) => persist({ themeMode: mode }),
    setOledMode: (oled) => persist({ oledMode: oled }),
    setLanguage: async (lang) => {
      i18nSetLanguage(lang);
      await persist({ language: lang });
    },
    setNotificationsEnabled: (val) => persist({ notificationsEnabled: val }),
  };

  if (!loaded) return null;

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
