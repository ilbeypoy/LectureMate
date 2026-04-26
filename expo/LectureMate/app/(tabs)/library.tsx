import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import * as FileSystem from 'expo-file-system/legacy';
import { useTheme, Typography, Spacing, Radii } from '../../constants/theme';
import {
  getAllRecordings,
  getAllClasses,
  searchRecordings,
  deleteRecording,
} from '../../db/database';
import { LargeTitleScreen } from '../../components/ui/LargeTitleScreen';
import { ListSection } from '../../components/ui/ListSection';
import { SearchField } from '../../components/ui/SearchField';
import type { LMRecording, LMClass } from '../../types';
import { formatDuration, formatRelativeDate } from '../../utils/format';

export default function LibraryScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const router = useRouter();
  const [recordings, setRecordings] = useState<LMRecording[]>([]);
  const [classes, setClasses] = useState<LMClass[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filterClassId, setFilterClassId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [rec, cls] = await Promise.all([getAllRecordings(), getAllClasses()]);
    setRecordings(rec);
    setClasses(cls);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(t('library.deleteTitle'), t('library.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
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
    <LargeTitleScreen
      title={t('library.title')}
      onRefresh={refresh}
      refreshing={refreshing}
      searchBar={
        <View>
          <SearchField
            value={searchText}
            onChangeText={handleSearch}
            placeholder={t('library.searchPlaceholder')}
          />
          {classes.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterChip
                label={t('library.all')}
                active={filterClassId === null}
                onPress={() => setFilterClassId(null)}
              />
              {classes.map((c) => (
                <FilterChip
                  key={c.id}
                  label={c.name}
                  color={c.colorHex}
                  active={filterClassId === c.id}
                  onPress={() => setFilterClassId(c.id)}
                />
              ))}
            </ScrollView>
          )}
        </View>
      }
    >
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="mic-off" size={56} color={colors.tertiaryLabel} />
          <Text style={[styles.emptyTitle, { color: colors.label }]}>
            {t('library.empty')}
          </Text>
          <Text style={[styles.emptyHint, { color: colors.secondaryLabel }]}>
            {searchText ? t('library.noResults') : t('library.emptyHint')}
          </Text>
        </View>
      ) : (
        <ListSection>
          {filtered.map((item) => {
            const cls = classes.find((c) => c.id === item.classId);
            return (
              <RecordingRow
                key={item.id}
                recording={item}
                cls={cls}
                onPress={() => router.push(`/library/${item.id}`)}
                onLongPress={() => handleDelete(item)}
              />
            );
          })}
        </ListSection>
      )}
    </LargeTitleScreen>
  );
}

function FilterChip({
  label,
  color,
  active,
  onPress,
}: {
  label: string;
  color?: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={[
          styles.chip,
          {
            backgroundColor: active ? colors.systemBlue : colors.tertiarySystemFill,
          },
        ]}
      >
        {color && (
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        )}
        <Text
          style={[
            styles.chipText,
            { color: active ? '#FFFFFF' : colors.label },
          ]}
        >
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function RecordingRow({
  recording,
  cls,
  onPress,
  onLongPress,
}: {
  recording: LMRecording;
  cls?: LMClass;
  onPress: () => void;
  onLongPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.row, { backgroundColor: colors.secondarySystemGroupedBackground }]}
    >
      <View style={[styles.rowIcon, { backgroundColor: (cls?.colorHex ?? colors.systemGray) + '22' }]}>
        <Ionicons
          name="mic"
          size={20}
          color={cls?.colorHex ?? colors.systemGray}
        />
      </View>

      <View style={styles.rowContent}>
        <Text style={[styles.rowTitle, { color: colors.label }]} numberOfLines={1}>
          {recording.title}
        </Text>
        <View style={styles.rowMeta}>
          {cls && (
            <Text style={[styles.rowMetaText, { color: cls.colorHex }]}>
              {cls.name}
            </Text>
          )}
          <Text style={[styles.rowMetaText, { color: colors.secondaryLabel }]}>
            {formatRelativeDate(recording.recordedAt)} • {formatDuration(recording.duration)}
          </Text>
        </View>
        <View style={styles.rowBadges}>
          {recording.isTranscribed && (
            <Badge icon="document-text" color={colors.systemGreen} />
          )}
          {recording.aiSummary && (
            <Badge icon="sparkles" color={colors.systemPurple} />
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.tertiaryLabel} />
    </TouchableOpacity>
  );
}

function Badge({ icon, color }: { icon: any; color: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + '24' }]}>
      <Ionicons name={icon} size={10} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.full,
  },
  chipText: {
    ...Typography.subheadline,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl * 2,
    gap: Spacing.sm,
  },
  emptyTitle: { ...Typography.title3 },
  emptyHint: {
    ...Typography.subheadline,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    minHeight: 60,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowContent: { flex: 1, gap: 2 },
  rowTitle: { ...Typography.body, fontWeight: '500' },
  rowMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  rowMetaText: { ...Typography.footnote },
  rowBadges: { flexDirection: 'row', gap: 4, marginTop: 2 },
  badge: {
    width: 18,
    height: 18,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
