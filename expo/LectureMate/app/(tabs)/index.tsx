import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import {
  getAllRecordings,
  getAllClasses,
  getAllScheduleEntries,
} from '../../db/database';
import { detectCurrentContext } from '../../services/scheduleDetection';
import type { LMRecording, LMClass, RecordingSuggestion } from '../../types';
import { formatDuration, formatRelativeDate } from '../../utils/format';

export default function HomeScreen() {
  const router = useRouter();
  const [suggestion, setSuggestion] = useState<RecordingSuggestion>({ type: 'noScheduledClass' });
  const [recentRecordings, setRecentRecordings] = useState<LMRecording[]>([]);
  const [classes, setClasses] = useState<LMClass[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [recordings, allClasses, entries] = await Promise.all([
        getAllRecordings(),
        getAllClasses(),
        getAllScheduleEntries(),
      ]);
      setRecentRecordings(recordings.slice(0, 5));
      setClasses(allClasses);
      setTotalCount(recordings.length);
      setTotalDuration(recordings.reduce((sum, r) => sum + r.duration, 0));
      setSuggestion(detectCurrentContext(allClasses, entries));
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const startRecording = (classId: string | null) => {
    router.push(classId ? `/recording?classId=${classId}` : '/recording');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        <Text style={styles.title}>LectureMate</Text>

        {/* Istatistik karti */}
        <View style={styles.statsCard}>
          <StatItem icon="mic" value={String(totalCount)} label="Kayit" />
          <StatItem icon="time" value={formatDuration(totalDuration)} label="Toplam" />
          <StatItem icon="document-text" value={String(classes.length)} label="Ders" />
        </View>

        {/* Akilli kayit onerisi */}
        <SmartCard suggestion={suggestion} onStart={startRecording} />

        {/* Son kayitlar */}
        {recentRecordings.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Son Kayitlar</Text>
            {recentRecordings.map((rec) => (
              <TouchableOpacity
                key={rec.id}
                style={styles.recordingRow}
                onPress={() => router.push(`/library/${rec.id}`)}
              >
                <View style={[styles.colorBar, { backgroundColor: classes.find((c) => c.id === rec.classId)?.colorHex ?? Colors.border }]} />
                <View style={styles.rowContent}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{rec.title}</Text>
                  <Text style={styles.rowMeta}>
                    {formatRelativeDate(rec.recordedAt)} &bull; {formatDuration(rec.duration)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatItem({ icon, value, label }: { icon: any; value: string; label: string }) {
  return (
    <View style={styles.statItem}>
      <Ionicons name={icon} size={20} color={Colors.primary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SmartCard({
  suggestion,
  onStart,
}: {
  suggestion: RecordingSuggestion;
  onStart: (classId: string | null) => void;
}) {
  if (suggestion.type === 'currentlyInClass') {
    return (
      <View style={styles.smartCard}>
        <View style={styles.smartHeader}>
          <Ionicons name="radio" size={28} color={Colors.primary} />
          <View style={styles.smartHeaderText}>
            <Text style={styles.smartLabel}>Su Anda Derstesin</Text>
            <Text style={styles.smartTitle}>{suggestion.class.name}</Text>
          </View>
        </View>
        {suggestion.entry.location && (
          <View style={styles.smartLocation}>
            <Ionicons name="location" size={14} color={Colors.textSecondary} />
            <Text style={styles.smartLocationText}>{suggestion.entry.location}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: Colors.accent }]}
          onPress={() => onStart(suggestion.class.id)}
        >
          <Ionicons name="mic" size={18} color="white" />
          <Text style={styles.primaryButtonText}>Kayit Baslat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (suggestion.type === 'upcomingClass') {
    return (
      <View style={styles.smartCard}>
        <View style={styles.smartHeader}>
          <Ionicons name="alarm" size={28} color={Colors.warning} />
          <View style={styles.smartHeaderText}>
            <Text style={styles.smartLabel}>{suggestion.minutesUntil} dakika sonra</Text>
            <Text style={styles.smartTitle}>{suggestion.class.name}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => onStart(suggestion.class.id)}
        >
          <Ionicons name="mic" size={18} color="white" />
          <Text style={styles.primaryButtonText}>Simdi Kayit Baslat</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.smartCard}>
      <Ionicons name="mic-circle" size={48} color={Colors.primary} style={{ alignSelf: 'center' }} />
      <Text style={styles.smartTitle}>Ses Kaydi Baslat</Text>
      <Text style={styles.smartSubtitle}>
        Su anda programda ders yok. Serbest kayit baslatabilirsin.
      </Text>
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => onStart(null)}
      >
        <Ionicons name="mic" size={18} color="white" />
        <Text style={styles.primaryButtonText}>Serbest Kayit</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 16, gap: 16 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statItem: { alignItems: 'center', gap: 4 },
  statValue: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  statLabel: { fontSize: 11, color: Colors.textSecondary },
  smartCard: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 20,
    padding: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  smartHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smartHeaderText: { flex: 1 },
  smartLabel: { fontSize: 12, color: Colors.textSecondary },
  smartTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  smartSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  smartLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  smartLocationText: { fontSize: 12, color: Colors.textSecondary },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: { color: 'white', fontSize: 16, fontWeight: '600' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  recordingRow: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  colorBar: { width: 4, height: 40, borderRadius: 2 },
  rowContent: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  rowMeta: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
