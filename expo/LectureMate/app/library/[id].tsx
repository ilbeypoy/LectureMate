import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TouchableHighlight,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme, Typography, Spacing, Radii } from '../../constants/theme';
import {
  getRecordingById,
  getSegmentsForRecording,
  getBookmarksForRecording,
  getClassById,
  updateRecording,
} from '../../db/database';
import { useAudioPlayer, PLAYBACK_RATES } from '../../hooks/useAudioPlayer';
import { useTTS } from '../../hooks/useTTS';
import { DeepSeekService } from '../../services/deepseek';
import { exportAsText, exportAsPDF } from '../../services/export';
import { formatTime, formatDate, formatDuration } from '../../utils/format';
import { ListSection } from '../../components/ui/ListSection';
import { Button } from '../../components/ui/Button';
import type { LMRecording, LMTranscriptSegment, LMBookmark, LMClass } from '../../types';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const player = useAudioPlayer();
  const tts = useTTS();
  const [recording, setRecording] = useState<LMRecording | null>(null);
  const [segments, setSegments] = useState<LMTranscriptSegment[]>([]);
  const [bookmarks, setBookmarks] = useState<LMBookmark[]>([]);
  const [cls, setCls] = useState<LMClass | null>(null);
  const [hasAI, setHasAI] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showRateSheet, setShowRateSheet] = useState(false);

  useEffect(() => {
    load();
    DeepSeekService.isConfigured().then(setHasAI);
    return () => {
      player.cleanup();
      tts.stop();
    };
  }, [id]);

  const load = async () => {
    const rec = await getRecordingById(id);
    if (!rec) return;
    setRecording(rec);
    const [segs, bms] = await Promise.all([
      getSegmentsForRecording(id),
      getBookmarksForRecording(id),
    ]);
    setSegments(segs);
    setBookmarks(bms);
    if (rec.classId) {
      const c = await getClassById(rec.classId);
      setCls(c);
    }
    await player.load(rec.fileUri);
  };

  const handleSeekTo = async (time: number) => {
    Haptics.selectionAsync().catch(() => {});
    await player.seek(time);
    if (!player.isPlaying) await player.play();
  };

  const handleGenerateSummary = async () => {
    if (!recording) return;
    setGeneratingSummary(true);
    try {
      const fullTranscript = segments.map((s) => s.text).join(' ');
      const summary = await DeepSeekService.generateSummary(fullTranscript);
      await updateRecording(recording.id, { aiSummary: summary });
      setRecording({ ...recording, aiSummary: summary });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
    setGeneratingSummary(false);
  };

  const handleExport = () => {
    if (!recording) return;
    Alert.alert(t('detail.export'), t('detail.exportFormat'), [
      { text: t('detail.exportPdf'), onPress: () => exportAsPDF(recording, segments, cls) },
      { text: t('detail.exportText'), onPress: () => exportAsText(recording, segments, cls) },
      { text: t('common.cancel'), style: 'cancel' },
    ]);
  };

  const handleReadAloud = () => {
    if (!recording) return;
    if (tts.isSpeaking) {
      tts.stop();
    } else {
      const text = recording.aiSummary ?? segments.map((s) => s.text).join(' ');
      tts.speak(text);
    }
  };

  if (!recording) {
    return (
      <View style={[styles.center, { backgroundColor: colors.systemGroupedBackground }]}>
        <Text style={{ color: colors.secondaryLabel }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <Stack.Screen
        options={{
          title: recording.title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: Spacing.base }}>
              {hasAI && (
                <TouchableOpacity onPress={() => router.push(`/chat/${id}`)}>
                  <Ionicons name="sparkles" size={20} color={colors.systemBlue} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleExport}>
                <Ionicons name="share-outline" size={22} color={colors.systemBlue} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Hero header */}
      <LinearGradient
        colors={cls ? [cls.colorHex + 'CC', cls.colorHex + '66'] : [colors.systemBlue + 'AA', colors.systemPurple + '66']}
        style={styles.hero}
      >
        <Text style={styles.heroTitle} numberOfLines={3}>
          {recording.title}
        </Text>
        {cls && (
          <View style={styles.heroMetaRow}>
            <View style={styles.heroDot} />
            <Text style={styles.heroMeta}>{cls.name}</Text>
          </View>
        )}
        <View style={styles.heroMetaRow}>
          <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.85)" />
          <Text style={styles.heroMeta}>{formatDate(recording.recordedAt)}</Text>
          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.85)" style={{ marginLeft: 12 }} />
          <Text style={styles.heroMeta}>{formatDuration(recording.duration)}</Text>
        </View>
      </LinearGradient>

      {/* Player */}
      <View style={[styles.player, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
        <Slider
          style={{ width: '100%', height: 30 }}
          minimumValue={0}
          maximumValue={Math.max(player.duration, 1)}
          value={player.position}
          minimumTrackTintColor={colors.systemBlue}
          maximumTrackTintColor={colors.systemGray4}
          thumbTintColor={colors.systemBlue}
          onSlidingComplete={(v) => player.seek(v)}
        />
        <View style={styles.playerTime}>
          <Text style={[styles.playerTimeText, { color: colors.secondaryLabel }]}>
            {formatTime(player.position)}
          </Text>
          <Text style={[styles.playerTimeText, { color: colors.secondaryLabel }]}>
            -{formatTime(Math.max(0, player.duration - player.position))}
          </Text>
        </View>

        <View style={styles.playerControls}>
          <TouchableOpacity onPress={() => setShowRateSheet(!showRateSheet)}>
            <View style={[styles.rateChip, { backgroundColor: colors.tertiarySystemFill }]}>
              <Text style={[styles.rateChipText, { color: colors.label }]}>{player.rate}×</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => player.skip(-15)} hitSlop={10}>
            <Ionicons name="play-back" size={28} color={colors.label} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
              player.togglePlayPause();
            }}
          >
            <View style={[styles.playButton, { backgroundColor: colors.systemBlue }]}>
              <Ionicons name={player.isPlaying ? 'pause' : 'play'} size={28} color="white" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => player.skip(15)} hitSlop={10}>
            <Ionicons name="play-forward" size={28} color={colors.label} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReadAloud} hitSlop={10}>
            <Ionicons
              name={tts.isSpeaking ? 'volume-mute' : 'volume-high'}
              size={26}
              color={colors.systemPurple}
            />
          </TouchableOpacity>
        </View>

        {showRateSheet && (
          <View style={styles.rateSheet}>
            {PLAYBACK_RATES.map((r) => (
              <TouchableOpacity
                key={r}
                onPress={() => {
                  player.changeRate(r);
                  setShowRateSheet(false);
                }}
                style={[
                  styles.rateOption,
                  {
                    backgroundColor:
                      player.rate === r ? colors.systemBlue + '24' : colors.tertiarySystemFill,
                  },
                ]}
              >
                <Text
                  style={{
                    ...Typography.subheadline,
                    color: player.rate === r ? colors.systemBlue : colors.label,
                    fontWeight: '600',
                  }}
                >
                  {r}×
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* AI Ozet */}
      {hasAI ? (
        recording.aiSummary ? (
          <ListSection header={t('detail.summary')}>
            <View style={[styles.summaryCard, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
              <View style={styles.summaryHeader}>
                <Ionicons name="sparkles" size={14} color={colors.systemPurple} />
                <Text style={[Typography.caption1, { color: colors.systemPurple, fontWeight: '600' }]}>
                  AI
                </Text>
              </View>
              <Text style={[Typography.body, { color: colors.label, lineHeight: 24 }]}>
                {recording.aiSummary}
              </Text>
            </View>
          </ListSection>
        ) : segments.length > 0 ? (
          <View style={{ paddingHorizontal: Spacing.base, marginTop: Spacing.base }}>
            <Button
              title={
                generatingSummary ? t('detail.generatingSummary') : `✨ ${t('detail.summary')}`
              }
              onPress={handleGenerateSummary}
              loading={generatingSummary}
              variant="tinted"
              icon="sparkles"
            />
          </View>
        ) : null
      ) : (
        <View style={{ paddingHorizontal: Spacing.base, marginTop: Spacing.base }}>
          <View style={[styles.aiOnboard, { backgroundColor: colors.systemPurple + '15' }]}>
            <Ionicons name="sparkles" size={24} color={colors.systemPurple} />
            <Text style={[Typography.headline, { color: colors.label }]}>
              {t('detail.noAiTitle')}
            </Text>
            <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center' }]}>
              {t('detail.noAiDesc')}
            </Text>
          </View>
        </View>
      )}

      {/* Yer imleri */}
      {bookmarks.length > 0 && (
        <ListSection header={t('detail.bookmarks')}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', padding: Spacing.md, gap: Spacing.sm }}>
              {bookmarks.map((bm) => (
                <TouchableHighlight
                  key={bm.id}
                  underlayColor={colors.systemFill}
                  onPress={() => handleSeekTo(bm.timestamp)}
                  style={{ borderRadius: Radii.md }}
                >
                  <View style={[styles.bookmark, { backgroundColor: colors.tertiarySystemFill }]}>
                    <Ionicons name="bookmark" size={14} color={colors.systemYellow} />
                    <Text style={{ ...Typography.caption1, color: colors.label, fontVariant: ['tabular-nums'] }}>
                      {formatTime(bm.timestamp)}
                    </Text>
                  </View>
                </TouchableHighlight>
              ))}
            </View>
          </ScrollView>
        </ListSection>
      )}

      {/* Transkript */}
      <ListSection header={t('detail.transcript')}>
        {segments.length === 0 ? (
          <View style={[styles.emptyTranscript, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
            <Ionicons name="document-text-outline" size={32} color={colors.tertiaryLabel} />
            <Text style={{ color: colors.secondaryLabel, ...Typography.subheadline }}>
              {t('detail.noTranscript')}
            </Text>
          </View>
        ) : (
          <View style={{ backgroundColor: colors.secondarySystemGroupedBackground }}>
            {segments.map((seg) => {
              const isCurrent = player.position >= seg.startTime && player.position <= seg.endTime;
              return (
                <TouchableHighlight
                  key={seg.id}
                  underlayColor={colors.systemFill}
                  onPress={() => handleSeekTo(seg.startTime)}
                >
                  <View
                    style={[
                      styles.segmentRow,
                      isCurrent && { backgroundColor: colors.systemBlue + '15' },
                    ]}
                  >
                    <Text
                      style={{
                        ...Typography.caption1,
                        color: isCurrent ? colors.systemBlue : colors.tertiaryLabel,
                        fontVariant: ['tabular-nums'],
                        width: 38,
                        fontWeight: isCurrent ? '600' : '400',
                      }}
                    >
                      {formatTime(seg.startTime)}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        ...Typography.body,
                        color: colors.label,
                        lineHeight: 22,
                        fontWeight: isCurrent ? '500' : '400',
                      }}
                    >
                      {seg.text}
                    </Text>
                  </View>
                </TouchableHighlight>
              );
            })}
          </View>
        )}
      </ListSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: {
    paddingTop: 100,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  heroTitle: {
    color: 'white',
    ...Typography.title1,
  },
  heroMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'white',
  },
  heroMeta: {
    color: 'rgba(255,255,255,0.9)',
    ...Typography.footnote,
    fontWeight: '500',
  },

  player: {
    margin: Spacing.base,
    padding: Spacing.base,
    borderRadius: Radii.lg,
    gap: Spacing.sm,
  },
  playerTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  playerTimeText: {
    ...Typography.caption1,
    fontVariant: ['tabular-nums'],
  },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  rateChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  rateChipText: {
    ...Typography.caption1,
    fontWeight: '700',
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  rateSheet: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  rateOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radii.md,
  },

  summaryCard: {
    padding: Spacing.base,
    gap: Spacing.sm,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  aiOnboard: {
    padding: Spacing.lg,
    borderRadius: Radii.lg,
    alignItems: 'center',
    gap: Spacing.sm,
  },

  bookmark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radii.md,
  },

  segmentRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingVertical: 8,
    paddingHorizontal: Spacing.base,
  },
  emptyTranscript: {
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
