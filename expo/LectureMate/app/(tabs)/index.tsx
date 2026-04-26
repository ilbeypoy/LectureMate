import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableHighlight,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme, Typography, Spacing, Radii } from '../../constants/theme';
import {
  getAllRecordings,
  getAllClasses,
  getAllScheduleEntries,
} from '../../db/database';
import { detectCurrentContext } from '../../services/scheduleDetection';
import { LargeTitleScreen } from '../../components/ui/LargeTitleScreen';
import { ListSection } from '../../components/ui/ListSection';
import { ListRow } from '../../components/ui/ListRow';
import { Button } from '../../components/ui/Button';
import type { LMRecording, LMClass, RecordingSuggestion } from '../../types';
import { formatDuration, formatRelativeDate } from '../../utils/format';
import i18n from '../../i18n';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
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

  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

  const startRecording = (classId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    router.push(classId ? `/recording?classId=${classId}` : '/recording');
  };

  return (
    <LargeTitleScreen
      title={t('home.appName')}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      {/* Hero kart - akilli ders tespit */}
      <View style={{ paddingHorizontal: Spacing.base, marginTop: Spacing.sm }}>
        <SmartHeroCard
          suggestion={suggestion}
          onStart={startRecording}
        />
      </View>

      {/* Istatistik kartlari */}
      <View style={styles.statsRow}>
        <StatCard icon="mic-circle" value={String(totalCount)} label={t('home.stats.recordings')} color={colors.systemBlue} />
        <StatCard icon="time-outline" value={formatDuration(totalDuration)} label={t('home.stats.total')} color={colors.systemPurple} />
        <StatCard icon="book-outline" value={String(classes.length)} label={t('home.stats.classes')} color={colors.systemOrange} />
      </View>

      {/* Son kayitlar */}
      {recentRecordings.length > 0 && (
        <ListSection
          header={t('home.recentRecordings')}
        >
          {recentRecordings.map((rec) => {
            const cls = classes.find((c) => c.id === rec.classId);
            return (
              <ListRow
                key={rec.id}
                title={rec.title}
                subtitle={`${formatRelativeDate(rec.recordedAt)} • ${formatDuration(rec.duration)}`}
                onPress={() => router.push(`/library/${rec.id}`)}
                showChevron
                rightElement={
                  cls && (
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: cls.colorHex,
                      }}
                    />
                  )
                }
              />
            );
          })}
        </ListSection>
      )}
    </LargeTitleScreen>
  );
}

function SmartHeroCard({
  suggestion,
  onStart,
}: {
  suggestion: RecordingSuggestion;
  onStart: (classId: string | null) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();

  if (suggestion.type === 'currentlyInClass') {
    return (
      <LinearGradient
        colors={[colors.systemBlue, colors.systemIndigo]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroHeader}>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
          <Text style={styles.heroLabel}>{t('home.inClass')}</Text>
        </View>
        <Text style={styles.heroTitle}>{suggestion.class.name}</Text>
        {suggestion.entry.location && (
          <View style={styles.heroMetaRow}>
            <Ionicons name="location" size={13} color="rgba(255,255,255,0.85)" />
            <Text style={styles.heroMeta}>{suggestion.entry.location}</Text>
          </View>
        )}
        <View style={{ marginTop: Spacing.base }}>
          <Button
            title={t('home.startRecording')}
            icon="mic"
            onPress={() => onStart(suggestion.class.id)}
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          />
        </View>
      </LinearGradient>
    );
  }

  if (suggestion.type === 'upcomingClass') {
    return (
      <LinearGradient
        colors={[colors.systemOrange, colors.systemPink]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <Text style={styles.heroLabel}>
          {t('home.inMinutes', { minutes: suggestion.minutesUntil })}
        </Text>
        <Text style={styles.heroTitle}>{suggestion.class.name}</Text>
        <View style={{ marginTop: Spacing.base }}>
          <Button
            title={t('home.recordNow')}
            icon="mic"
            onPress={() => onStart(suggestion.class.id)}
            style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
          />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.systemPurple, colors.systemBlue]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <Ionicons name="mic" size={36} color="white" style={{ alignSelf: 'flex-start' }} />
      <Text style={[styles.heroTitle, { marginTop: Spacing.sm }]}>{t('home.noClassNow')}</Text>
      <Text style={styles.heroDesc}>{t('home.noClassDesc')}</Text>
      <View style={{ marginTop: Spacing.base }}>
        <Button
          title={t('home.customRecording')}
          icon="mic"
          onPress={() => onStart(null)}
          style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}
        />
      </View>
    </LinearGradient>
  );
}

function StatCard({
  icon,
  value,
  label,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  label: string;
  color: string;
}) {
  const { colors, isOled } = useTheme();
  return (
    <View
      style={[
        styles.statCard,
        {
          backgroundColor: colors.secondarySystemGroupedBackground,
        },
        !isOled && styles.cardShadow,
      ]}
    >
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.statValue, { color: colors.label }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.secondaryLabel }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    padding: Spacing.lg,
    borderRadius: Radii.xl,
    overflow: 'hidden',
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
  },
  liveText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.85)',
    ...Typography.subheadline,
    fontWeight: '500',
  },
  heroTitle: {
    color: 'white',
    ...Typography.title2,
    marginTop: 2,
  },
  heroDesc: {
    color: 'rgba(255,255,255,0.85)',
    ...Typography.subheadline,
    marginTop: 4,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.85)',
    ...Typography.footnote,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radii.lg,
    alignItems: 'flex-start',
    gap: 4,
  },
  cardShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  statValue: {
    ...Typography.title3,
    marginTop: 4,
  },
  statLabel: {
    ...Typography.caption1,
  },
});
