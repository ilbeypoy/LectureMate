import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors } from '../../constants/colors';
import { DeepSeekService } from '../../services/deepseek';
import {
  requestNotificationPermission,
  cancelAllReminders,
  scheduleClassReminders,
} from '../../services/notifications';
import {
  getAllClasses,
  getAllScheduleEntries,
} from '../../db/database';

export default function SettingsScreen() {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [hasKey, setHasKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [storageSize, setStorageSize] = useState('0 MB');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    const key = await DeepSeekService.getAPIKey();
    if (key) {
      setApiKey(key);
      setHasKey(true);
    }

    // Depolama hesapla
    try {
      const recDir = `${FileSystem.documentDirectory}recordings/`;
      const info = await FileSystem.getInfoAsync(recDir);
      if (info.exists) {
        const files = await FileSystem.readDirectoryAsync(recDir);
        let total = 0;
        for (const f of files) {
          const fInfo = await FileSystem.getInfoAsync(`${recDir}${f}`);
          if (fInfo.exists && 'size' in fInfo) {
            total += fInfo.size;
          }
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
    Alert.alert('Kaydedildi', 'API anahtari guvenli sekilde saklandi');
  };

  const handleDeleteKey = async () => {
    Alert.alert('Anahtari Sil?', '', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sil',
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
    setNotificationsEnabled(val);
    if (val) {
      const granted = await requestNotificationPermission();
      if (!granted) {
        setNotificationsEnabled(false);
        Alert.alert('Izin Gerekli', 'Bildirim izni reddedildi.');
        return;
      }
      const entries = await getAllScheduleEntries();
      const classes = await getAllClasses();
      await scheduleClassReminders(entries, classes);
    } else {
      await cancelAllReminders();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
        <Text style={styles.title}>Ayarlar</Text>

        {/* API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Entegrasyonu</Text>
          <Text style={styles.sectionHint}>
            DeepSeek API anahtari ekleyerek otomatik ozet, baslik ve soru-cevap ozelliklerini etkinlestirin.
          </Text>

          <View style={styles.inputRow}>
            <Ionicons name="key-outline" size={18} color={Colors.textSecondary} />
            <TextInput
              style={styles.input}
              placeholder="DeepSeek API Anahtari"
              placeholderTextColor={Colors.textSecondary}
              value={apiKey}
              onChangeText={setApiKey}
              secureTextEntry={!showKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowKey(!showKey)}>
              <Ionicons name={showKey ? 'eye-off' : 'eye'} size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[styles.button, !apiKey.trim() && styles.buttonDisabled]}
              onPress={handleSaveKey}
              disabled={!apiKey.trim()}
            >
              <Ionicons name="checkmark-circle" size={16} color="white" />
              <Text style={styles.buttonText}>Kaydet</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonOutline, (!apiKey.trim() || testing) && styles.buttonDisabled]}
              onPress={handleTest}
              disabled={!apiKey.trim() || testing}
            >
              {testing ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Ionicons name="flash" size={16} color={Colors.primary} />
              )}
              <Text style={[styles.buttonText, { color: Colors.primary }]}>Test Et</Text>
            </TouchableOpacity>
          </View>

          {testResult === 'success' && (
            <View style={styles.testResult}>
              <Ionicons name="checkmark-circle" size={16} color={Colors.success} />
              <Text style={{ color: Colors.success, fontSize: 13 }}>Baglanti basarili!</Text>
            </View>
          )}
          {testResult === 'error' && (
            <View style={styles.testResult}>
              <Ionicons name="close-circle" size={16} color={Colors.accent} />
              <Text style={{ color: Colors.accent, fontSize: 13 }}>Baglanti hatasi - anahtari kontrol edin</Text>
            </View>
          )}

          {hasKey && (
            <TouchableOpacity onPress={handleDeleteKey}>
              <Text style={{ color: Colors.accent, fontSize: 13, textAlign: 'center' }}>
                Anahtari Sil
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Bildirimler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirimler</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>Ders Hatirlaticilari</Text>
              <Text style={styles.rowHint}>Dersten 5 dakika once bildirim gonder</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleNotificationToggle}
              trackColor={{ true: Colors.primary }}
            />
          </View>
        </View>

        {/* Depolama */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Depolama</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Kullanilan Alan</Text>
            <Text style={styles.rowValue}>{storageSize}</Text>
          </View>
        </View>

        {/* Hakkinda */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hakkinda</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Surum</Text>
            <Text style={styles.rowValue}>1.0.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Apple Speech (Ucretsiz)</Text>
            <Ionicons name="checkmark-circle" size={18} color={Colors.success} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  section: { gap: 10 },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary, textTransform: 'uppercase' },
  sectionHint: { fontSize: 12, color: Colors.textSecondary, marginBottom: 4 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  input: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 10,
  },
  buttonOutline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 12,
    borderRadius: 10,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 14, fontWeight: '600' },
  testResult: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 14,
    borderRadius: 10,
  },
  rowLabel: { fontSize: 15, color: Colors.textPrimary },
  rowHint: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  rowValue: { fontSize: 14, color: Colors.textSecondary },
});
