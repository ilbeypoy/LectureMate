import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/colors';
import {
  getAllRecordings,
  getAllClasses,
  searchRecordings,
  deleteRecording,
} from '../../db/database';
import * as FileSystem from 'expo-file-system/legacy';
import type { LMRecording, LMClass } from '../../types';
import { formatDuration, formatRelativeDate } from '../../utils/format';

export default function LibraryScreen() {
  const router = useRouter();
  const [recordings, setRecordings] = useState<LMRecording[]>([]);
  const [classes, setClasses] = useState<LMClass[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterClassId, setFilterClassId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [rec, cls] = await Promise.all([getAllRecordings(), getAllClasses()]);
    setRecordings(rec);
    setClasses(cls);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleSearch = async (text: string) => {
    setSearchText(text);
    if (!text) {
      const all = await getAllRecordings();
      setRecordings(all);
    } else {
      const results = await searchRecordings(text);
      setRecordings(results);
    }
  };

  const filtered = filterClassId
    ? recordings.filter((r) => r.classId === filterClassId)
    : recordings;

  const handleDelete = (rec: LMRecording) => {
    Alert.alert('Kaydi Sil', `"${rec.title}" silinecek.`, [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          await FileSystem.deleteAsync(rec.fileUri, { idempotent: true });
          await deleteRecording(rec.id);
          refresh();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Kutuphane</Text>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Kayitlarda ara..."
            placeholderTextColor={Colors.textSecondary}
            value={searchText}
            onChangeText={handleSearch}
          />
        </View>

        {classes.length > 0 && (
          <FlatList
            horizontal
            data={[{ id: null, name: 'Tumu', colorHex: Colors.textSecondary } as any, ...classes]}
            keyExtractor={(item) => item.id ?? 'all'}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  filterClassId === item.id && styles.filterChipActive,
                ]}
                onPress={() => setFilterClassId(item.id)}
              >
                {item.id && (
                  <View style={[styles.classDot, { backgroundColor: item.colorHex }]} />
                )}
                <Text style={styles.filterChipText}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="mic-off" size={48} color={Colors.textSecondary} />
            <Text style={styles.emptyTitle}>Kayit Bulunamadi</Text>
            <Text style={styles.emptyText}>
              {searchText ? 'Aramanizla eslesen kayit yok' : 'Ilk kaydinizi yapmak icin Ana Sayfa\'ya gidin'}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const cls = classes.find((c) => c.id === item.classId);
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/library/${item.id}`)}
              onLongPress={() => handleDelete(item)}
            >
              <View
                style={[
                  styles.colorBar,
                  { backgroundColor: cls?.colorHex ?? Colors.border },
                ]}
              />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <View style={styles.cardMeta}>
                  {cls && (
                    <Text style={[styles.cardClass, { color: Colors.primary }]}>
                      {cls.name}
                    </Text>
                  )}
                  <Text style={styles.cardDate}>{formatRelativeDate(item.recordedAt)}</Text>
                </View>
                <View style={styles.cardBadges}>
                  <Badge icon="time" text={formatDuration(item.duration)} />
                  {item.isTranscribed && <Badge icon="document-text" text="Transkript" color={Colors.success} />}
                  {item.aiSummary && <Badge icon="sparkles" text="AI" color={Colors.secondary} />}
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

function Badge({ icon, text, color }: { icon: any; text: string; color?: string }) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={11} color={color ?? Colors.textSecondary} />
      <Text style={[styles.badgeText, color && { color }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: 16, gap: 12 },
  title: { fontSize: 28, fontWeight: '700', color: Colors.textPrimary },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
  filterRow: { gap: 8, paddingVertical: 4 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipActive: { backgroundColor: `${Colors.primary}20` },
  filterChipText: { fontSize: 12, color: Colors.textPrimary },
  classDot: { width: 8, height: 8, borderRadius: 4 },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
    overflow: 'hidden',
  },
  colorBar: { width: 4 },
  cardContent: { flex: 1, padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  cardMeta: { flexDirection: 'row', gap: 8, marginTop: 4 },
  cardClass: { fontSize: 12, fontWeight: '500' },
  cardDate: { fontSize: 12, color: Colors.textSecondary },
  cardBadges: { flexDirection: 'row', gap: 12, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontSize: 11, color: Colors.textSecondary },
  empty: { alignItems: 'center', padding: 40, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  emptyText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
});
