import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TouchableHighlight,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { useTranslation } from 'react-i18next';
import { useTheme, Typography, Spacing, Radii } from '../../constants/theme';
import { usePreferences, ThemeMode, LanguagePreference } from '../../contexts/PreferencesContext';
import { DeepSeekService } from '../../services/deepseek';
import {
  requestNotificationPermission,
  cancelAllReminders,
  scheduleClassReminders,
} from '../../services/notifications';
import { getAllClasses, getAllScheduleEntries } from '../../db/database';
import { LargeTitleScreen } from '../../components/ui/LargeTitleScreen';
import { ListSection } from '../../components/ui/ListSection';
import { ListRow } from '../../components/ui/ListRow';
import { Button } from '../../components/ui/Button';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const prefs = usePreferences();

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [storageSize, setStorageSize] = useState('0 B');

  const [showThemeSheet, setShowThemeSheet] = useState(false);
  const [showLangSheet, setShowLangSheet] = useState(false);

  useEffect(() => {
    DeepSeekService.getAPIKey().then((key) => {
      if (key) {
        setApiKey(key);
        setHasKey(true);
      }
    });
    computeStorage();
  }, []);

  const computeStorage = async () => {
    try {
      const recDir = `${FileSystem.documentDirectory}recordings/`;
      const info = await FileSystem.getInfoAsync(recDir);
      if (info.exists) {
        const files = await FileSystem.readDirectoryAsync(recDir);
        let total = 0;
        for (const f of files) {
          const fInfo = await FileSystem.getInfoAsync(`${recDir}${f}`);
          if (fInfo.exists && 'size' in fInfo) total += fInfo.size as number;
        }
        setStorageSize(formatBytes(total));
      }
    } catch {}
  };

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
  };

  const handleSaveKey = async () => {
    if (!apiKey.trim()) return;
    await DeepSeekService.saveAPIKey(apiKey.trim());
    setHasKey(true);
    Alert.alert(t('settings.keySaved'), t('settings.keySavedDesc'));
  };

  const handleDeleteKey = () => {
    Alert.alert(t('settings.deleteKey'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await DeepSeekService.deleteAPIKey();
          setApiKey('');
          setHasKey(false);
          setTestResult(null);
        },
      },
    ]);
  };

  const handleTest = async () => {
    if (!apiKey.trim()) return;
    setTesting(true);
    setTestResult(null);
    await DeepSeekService.saveAPIKey(apiKey.trim());
    const ok = await DeepSeekService.testConnection();
    setTestResult(ok ? 'success' : 'error');
    setHasKey(ok);
    setTesting(false);
  };

  const handleNotificationToggle = async (val: boolean) => {
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(t('settings.notificationDenied'), t('settings.notificationDeniedDesc'));
        return;
      }
      await prefs.setNotificationsEnabled(true);
      const entries = await getAllScheduleEntries();
      const classes = await getAllClasses();
      await scheduleClassReminders(entries, classes);
    } else {
      await prefs.setNotificationsEnabled(false);
      await cancelAllReminders();
    }
  };

  const themeLabel = {
    system: t('settings.appearanceSystem'),
    light: t('settings.appearanceLight'),
    dark: t('settings.appearanceDark'),
  }[prefs.themeMode];

  const langLabel = {
    auto: t('settings.languageAuto'),
    en: t('settings.languageEn'),
    tr: t('settings.languageTr'),
  }[prefs.language];

  return (
    <>
      <LargeTitleScreen title={t('settings.title')}>
        {/* AI */}
        <ListSection
          header={t('settings.sections.ai')}
          footer={t('settings.apiKeyHint')}
        >
          <View style={[styles.apiInputRow, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
            <Ionicons name="key" size={20} color={colors.systemGray} />
            <TextInput
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t('settings.apiKeyPlaceholder')}
              placeholderTextColor={colors.tertiaryLabel}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.apiInput, { color: colors.label }]}
            />
            <TouchableOpacity onPress={() => setShowKey(!showKey)} hitSlop={10}>
              <Ionicons
                name={showKey ? 'eye-off' : 'eye'}
                size={18}
                color={colors.systemBlue}
              />
            </TouchableOpacity>
          </View>

          <View style={[styles.actionsRow, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
            <View style={{ flex: 1 }}>
              <Button
                title={t('settings.saveKey')}
                onPress={handleSaveKey}
                disabled={!apiKey.trim()}
                size="small"
                variant="tinted"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title={t('settings.testKey')}
                onPress={handleTest}
                loading={testing}
                disabled={!apiKey.trim()}
                size="small"
                variant="tinted"
              />
            </View>
          </View>

          {testResult && (
            <View style={[styles.resultRow, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <Ionicons
                name={testResult === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={16}
                color={testResult === 'success' ? colors.systemGreen : colors.systemRed}
              />
              <Text
                style={{
                  ...Typography.subheadline,
                  color: testResult === 'success' ? colors.systemGreen : colors.systemRed,
                }}
              >
                {testResult === 'success'
                  ? t('settings.keyTestSuccess')
                  : t('settings.keyTestFailed')}
              </Text>
            </View>
          )}

          {hasKey && (
            <ListRow
              title={t('settings.deleteKey')}
              onPress={handleDeleteKey}
              destructive
              icon="trash"
              iconBackground={colors.systemRed}
            />
          )}
        </ListSection>

        {/* Gorunum */}
        <ListSection header={t('settings.sections.appearance')}>
          <ListRow
            title={t('settings.appearance')}
            icon="contrast"
            iconBackground={colors.systemIndigo}
            detail={themeLabel}
            onPress={() => setShowThemeSheet(true)}
            showChevron
          />
          {prefs.effectiveScheme === 'dark' && (
            <ListRow
              title={t('settings.oledMode')}
              subtitle={t('settings.oledHint')}
              icon="moon"
              iconBackground="#000000"
              iconColor="#FFCC00"
              rightElement={
                <Switch
                  value={prefs.oledMode}
                  onValueChange={prefs.setOledMode}
                  trackColor={{ true: colors.systemGreen, false: colors.systemGray4 }}
                />
              }
            />
          )}
        </ListSection>

        {/* Dil */}
        <ListSection header={t('settings.sections.language')}>
          <ListRow
            title={t('settings.language')}
            icon="globe"
            iconBackground={colors.systemTeal}
            detail={langLabel}
            onPress={() => setShowLangSheet(true)}
            showChevron
          />
        </ListSection>

        {/* Bildirimler */}
        <ListSection
          header={t('settings.sections.notifications')}
          footer={t('settings.notificationsDesc')}
        >
          <ListRow
            title={t('settings.notifications')}
            icon="notifications"
            iconBackground={colors.systemRed}
            rightElement={
              <Switch
                value={prefs.notificationsEnabled}
                onValueChange={handleNotificationToggle}
                trackColor={{ true: colors.systemGreen, false: colors.systemGray4 }}
              />
            }
          />
        </ListSection>

        {/* Depolama */}
        <ListSection header={t('settings.sections.storage')}>
          <ListRow
            title={t('settings.storageUsed')}
            icon="server"
            iconBackground={colors.systemPurple}
            detail={storageSize}
          />
        </ListSection>

        {/* Hakkinda */}
        <ListSection header={t('settings.sections.about')}>
          <ListRow
            title={t('settings.version')}
            icon="information-circle"
            iconBackground={colors.systemBlue}
            detail="1.0.0"
          />
          <ListRow
            title={t('settings.appleSpeech')}
            icon="mic"
            iconBackground={colors.systemGreen}
            rightElement={
              <Ionicons name="checkmark-circle" size={20} color={colors.systemGreen} />
            }
          />
        </ListSection>
      </LargeTitleScreen>

      {/* Tema secici */}
      <PickerSheet
        visible={showThemeSheet}
        title={t('settings.appearance')}
        onClose={() => setShowThemeSheet(false)}
        options={[
          { value: 'system', label: t('settings.appearanceSystem'), icon: 'phone-portrait' },
          { value: 'light', label: t('settings.appearanceLight'), icon: 'sunny' },
          { value: 'dark', label: t('settings.appearanceDark'), icon: 'moon' },
        ]}
        selected={prefs.themeMode}
        onSelect={(v) => {
          prefs.setThemeMode(v as ThemeMode);
          setShowThemeSheet(false);
        }}
      />

      {/* Dil secici */}
      <PickerSheet
        visible={showLangSheet}
        title={t('settings.language')}
        onClose={() => setShowLangSheet(false)}
        options={[
          { value: 'auto', label: t('settings.languageAuto') },
          { value: 'en', label: t('settings.languageEn') },
          { value: 'tr', label: t('settings.languageTr') },
        ]}
        selected={prefs.language}
        onSelect={(v) => {
          prefs.setLanguage(v as LanguagePreference);
          setShowLangSheet(false);
        }}
      />
    </>
  );
}

function PickerSheet({
  visible,
  title,
  onClose,
  options,
  selected,
  onSelect,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  options: { value: string; label: string; icon?: any }[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const { colors } = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity
        style={styles.sheetBackdrop}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={{ flex: 1 }} />
        <View style={[styles.sheet, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
          <Text style={[Typography.headline, { color: colors.label, padding: Spacing.base }]}>
            {title}
          </Text>
          {options.map((opt) => (
            <TouchableHighlight
              key={opt.value}
              underlayColor={colors.systemFill}
              onPress={() => onSelect(opt.value)}
            >
              <View style={styles.sheetOption}>
                {opt.icon && (
                  <Ionicons name={opt.icon} size={22} color={colors.systemBlue} />
                )}
                <Text style={[Typography.body, { color: colors.label, flex: 1 }]}>
                  {opt.label}
                </Text>
                {selected === opt.value && (
                  <Ionicons name="checkmark" size={22} color={colors.systemBlue} />
                )}
              </View>
            </TouchableHighlight>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  apiInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 11,
    minHeight: 44,
  },
  apiInput: {
    flex: 1,
    ...Typography.body,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    paddingBottom: Spacing.xl,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
  },
});
