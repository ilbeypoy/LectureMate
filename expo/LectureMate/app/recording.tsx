import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Modal,
  TouchableHighlight,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme, Typography, Spacing, Radii } from '../constants/theme';
import { formatTimer, generateId } from '../utils/format';
import { useAudioRecorder } from '../hooks/useAudioRecorder';
import { useTranscription } from '../hooks/useTranscription';
import {
  insertRecording,
  insertSegment,
  insertBookmark,
  getClassById,
  getAllClasses,
  updateRecording,
} from '../db/database';
import { DeepSeekService } from '../services/deepseek';
import type { LMClass } from '../types';

export default function RecordingScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ classId?: string }>();
  const recorder = useAudioRecorder();
  const transcription = useTranscription();
  const [selectedClass, setSelectedClass] = useState<LMClass | null>(null);
  const [bookmarks, setBookmarks] = useState<{ timestamp: number }[]>([]);
  const [classes, setClasses] = useState<LMClass[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);

  // Pulse animasyonu kayit aktifken
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getAllClasses().then(setClasses);
    if (params.classId) {
      getClassById(params.classId).then((c) => c && setSelectedClass(c));
    }
  }, [params.classId]);

  useEffect(() => {
    if (recorder.isRecording && !recorder.isPaused) {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [recorder.isRecording, recorder.isPaused, pulseAnim]);

  const handleStart = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const result = await recorder.startRecording();
    if (!result) return;
    setRecordingId(result.id);
    await transcription.start();
  };

  const handlePause = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await recorder.pauseRecording();
  };

  const handleResume = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    await recorder.resumeRecording();
  };

  const handleStop = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await transcription.stop();
    const result = await recorder.stopRecording();
    if (!result || !recordingId) return;

    const title = selectedClass
      ? `${selectedClass.name} • ${new Date().toLocaleDateString('tr-TR')}`
      : `${t('home.customRecording')} • ${new Date().toLocaleDateString('tr-TR')}`;

    await insertRecording({
      id: recordingId,
      title,
      aiSummary: null,
      recordedAt: Date.now(),
      duration: result.duration,
      fileUri: result.uri,
      isTranscribed: false,
      classId: selectedClass?.id ?? null,
      folderId: null,
    });

    const segments = transcription.getSegments();
    for (const seg of segments) {
      await insertSegment({
        id: generateId(),
        recordingId,
        text: seg.text,
        startTime: seg.startTime,
        endTime: seg.endTime,
        confidence: 1.0,
      });
    }

    if (segments.length > 0) {
      await updateRecording(recordingId, { isTranscribed: true });
    }

    for (const bm of bookmarks) {
      await insertBookmark({
        id: generateId(),
        recordingId,
        label: null,
        timestamp: bm.timestamp,
        createdAt: Date.now(),
      });
    }

    if (segments.length > 0) {
      const fullTranscript = segments.map((s) => s.text).join(' ');
      DeepSeekService.isConfigured().then(async (configured) => {
        if (!configured) return;
        try {
          const [aiTitle, aiSummary] = await Promise.all([
            DeepSeekService.generateTitle(fullTranscript).catch(() => null),
            DeepSeekService.generateSummary(fullTranscript).catch(() => null),
          ]);
          const updates: any = {};
          if (aiTitle) updates.title = aiTitle;
          if (aiSummary) updates.aiSummary = aiSummary;
          if (Object.keys(updates).length > 0) {
            await updateRecording(recordingId, updates);
          }
        } catch {}
      });
    }

    router.back();
  };

  const handleCancel = () => {
    if (recorder.isRecording) {
      Alert.alert(t('recording.cancelTitle'), t('recording.cancelMessage'), [
        { text: t('recording.keepRecording'), style: 'cancel' },
        {
          text: t('recording.cancelRecording'),
          style: 'destructive',
          onPress: async () => {
            await transcription.stop();
            await recorder.cancelRecording();
            router.back();
          },
        },
      ]);
    } else {
      router.back();
    }
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setBookmarks([...bookmarks, { timestamp: recorder.duration }]);
  };

  const isIdle = !recorder.isRecording;
  const isRecordingActive = recorder.isRecording && !recorder.isPaused;
  const isPaused = recorder.isPaused;

  return (
    <View style={[styles.container, { backgroundColor: colors.systemBackground }]}>
      {/* Hafif gradient bg */}
      <LinearGradient
        colors={
          isDark
            ? [colors.systemBackground, colors.systemBackground]
            : [colors.systemBackground, colors.systemBlue + '08']
        }
        style={StyleSheet.absoluteFill}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleCancel} hitSlop={10}>
            <View
              style={[
                styles.closeBtn,
                { backgroundColor: colors.tertiarySystemFill },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.label} />
            </View>
          </TouchableOpacity>

          {selectedClass ? (
            <TouchableOpacity
              onPress={() => !recorder.isRecording && setShowClassPicker(true)}
              style={[styles.classPill, { backgroundColor: colors.tertiarySystemFill }]}
              disabled={recorder.isRecording}
            >
              <View
                style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: selectedClass.colorHex }}
              />
              <Text style={[styles.classPillText, { color: colors.label }]} numberOfLines={1}>
                {selectedClass.name}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => setShowClassPicker(true)}
              style={[styles.classPill, { backgroundColor: colors.tertiarySystemFill }]}
              disabled={recorder.isRecording}
            >
              <Ionicons name="add-circle" size={14} color={colors.systemBlue} />
              <Text style={[styles.classPillText, { color: colors.systemBlue }]}>
                {t('recording.selectClass')}
              </Text>
            </TouchableOpacity>
          )}
          <View style={{ width: 36 }} />
        </View>

        {/* Body */}
        <View style={styles.body}>
          {/* Timer */}
          <Text style={[styles.timer, { color: colors.label }]}>
            {formatTimer(recorder.duration)}
          </Text>

          {/* Waveform */}
          <Waveform level={recorder.meterLevel} active={isRecordingActive} colors={colors} />

          {/* Live transcript */}
          <View
            style={[
              styles.transcriptCard,
              { backgroundColor: colors.secondarySystemGroupedBackground },
            ]}
          >
            <ScrollView contentContainerStyle={{ padding: Spacing.base }}>
              {transcription.transcript ? (
                <Text style={[styles.transcriptText, { color: colors.label }]}>
                  {transcription.transcript}
                </Text>
              ) : (
                <View style={styles.transcriptPlaceholder}>
                  <Ionicons
                    name="mic-outline"
                    size={28}
                    color={colors.tertiaryLabel}
                  />
                  <Text style={[styles.transcriptHint, { color: colors.secondaryLabel }]}>
                    {recorder.isRecording
                      ? t('recording.transcriptShown')
                      : t('recording.speakToStart')}
                  </Text>
                </View>
              )}
              {transcription.error && (
                <Text style={[styles.errorText, { color: colors.systemRed }]}>
                  {t('recording.transcriptError')}: {transcription.error}
                </Text>
              )}
            </ScrollView>
          </View>

          {bookmarks.length > 0 && (
            <View style={styles.bookmarkBadge}>
              <Ionicons name="bookmark" size={12} color={colors.systemYellow} />
              <Text style={[styles.bookmarkCount, { color: colors.secondaryLabel }]}>
                {t('recording.bookmarksCount', { count: bookmarks.length })}
              </Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          {isIdle ? (
            <>
              <View style={{ width: 64 }} />
              <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                <TouchableHighlight
                  onPress={handleStart}
                  underlayColor={colors.systemRed}
                  style={[styles.bigBtn, { backgroundColor: colors.systemRed }]}
                >
                  <View style={styles.recordIndicator} />
                </TouchableHighlight>
              </Animated.View>
              <View style={{ width: 64 }} />
            </>
          ) : (
            <>
              <TouchableOpacity onPress={handleBookmark} style={styles.sideBtn}>
                <View
                  style={[
                    styles.sideBtnInner,
                    { backgroundColor: colors.tertiarySystemFill },
                  ]}
                >
                  <Ionicons name="bookmark" size={22} color={colors.systemYellow} />
                </View>
                <Text style={[styles.sideBtnLabel, { color: colors.secondaryLabel }]}>
                  {t('recording.bookmark')}
                </Text>
              </TouchableOpacity>

              <Animated.View style={{ transform: [{ scale: isRecordingActive ? pulseAnim : 1 }] }}>
                <TouchableHighlight
                  onPress={isRecordingActive ? handlePause : handleResume}
                  underlayColor={isRecordingActive ? colors.systemRed : colors.systemGreen}
                  style={[
                    styles.bigBtn,
                    { backgroundColor: isRecordingActive ? colors.systemRed : colors.systemGreen },
                  ]}
                >
                  <Ionicons
                    name={isRecordingActive ? 'pause' : 'play'}
                    size={36}
                    color="white"
                  />
                </TouchableHighlight>
              </Animated.View>

              <TouchableOpacity onPress={handleStop} style={styles.sideBtn}>
                <View
                  style={[
                    styles.sideBtnInner,
                    { backgroundColor: colors.tertiarySystemFill },
                  ]}
                >
                  <View style={[styles.stopBox, { backgroundColor: colors.label }]} />
                </View>
                <Text style={[styles.sideBtnLabel, { color: colors.secondaryLabel }]}>
                  {t('recording.finish')}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>

      {/* Class picker modal */}
      <Modal
        visible={showClassPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowClassPicker(false)}
      >
        <BlurView
          tint={isDark ? 'dark' : 'light'}
          intensity={40}
          style={StyleSheet.absoluteFill}
        >
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setShowClassPicker(false)}
          />
        </BlurView>
        <View style={styles.modalContainer} pointerEvents="box-none">
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.secondarySystemGroupedBackground },
            ]}
          >
            <Text style={[styles.modalTitle, { color: colors.label }]}>
              {t('recording.selectClass')}
            </Text>
            <ScrollView style={{ maxHeight: 400 }}>
              <TouchableHighlight
                onPress={() => {
                  setSelectedClass(null);
                  setShowClassPicker(false);
                }}
                underlayColor={colors.systemFill}
              >
                <View style={styles.classOption}>
                  <View
                    style={[
                      styles.colorDot,
                      { backgroundColor: colors.systemGray },
                    ]}
                  />
                  <Text style={[{ color: colors.label, ...Typography.body }]}>
                    {t('recording.noClass')}
                  </Text>
                </View>
              </TouchableHighlight>
              {classes.map((c) => (
                <TouchableHighlight
                  key={c.id}
                  onPress={() => {
                    setSelectedClass(c);
                    setShowClassPicker(false);
                  }}
                  underlayColor={colors.systemFill}
                >
                  <View style={styles.classOption}>
                    <View style={[styles.colorDot, { backgroundColor: c.colorHex }]} />
                    <Text style={[{ color: colors.label, ...Typography.body }]}>{c.name}</Text>
                  </View>
                </TouchableHighlight>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Waveform({
  level,
  active,
  colors,
}: {
  level: number;
  active: boolean;
  colors: any;
}) {
  const [bars, setBars] = useState<number[]>(Array(40).fill(0.1));

  useEffect(() => {
    if (!active) {
      setBars(Array(40).fill(0.1));
      return;
    }
    setBars((prev) => {
      const next = [
        ...prev.slice(1),
        Math.max(0.05, level + (Math.random() - 0.5) * 0.15),
      ];
      return next;
    });
  }, [level, active]);

  return (
    <View style={styles.waveform}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            width: 3,
            height: Math.max(3, h * 70),
            borderRadius: 1.5,
            backgroundColor:
              h > 0.7 ? colors.systemRed : h > 0.4 ? colors.systemBlue : colors.systemBlue + '60',
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radii.full,
    maxWidth: 240,
    alignSelf: 'center',
  },
  classPillText: { ...Typography.subheadline, fontWeight: '600' },
  body: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  timer: {
    fontSize: 64,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: -1,
  },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 80,
  },
  transcriptCard: {
    width: '100%',
    height: 160,
    borderRadius: Radii.lg,
  },
  transcriptText: {
    ...Typography.body,
    lineHeight: 24,
  },
  transcriptPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  transcriptHint: {
    ...Typography.footnote,
    textAlign: 'center',
  },
  errorText: {
    ...Typography.caption1,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  bookmarkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bookmarkCount: {
    ...Typography.footnote,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  bigBtn: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  recordIndicator: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: 'white',
  },
  sideBtn: {
    alignItems: 'center',
    gap: 6,
    width: 64,
  },
  sideBtnInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnLabel: {
    ...Typography.caption1,
  },
  stopBox: {
    width: 18,
    height: 18,
    borderRadius: 3,
  },
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  modalSheet: {
    borderRadius: Radii.xl,
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  modalTitle: {
    ...Typography.headline,
    textAlign: 'center',
    marginBottom: Spacing.base,
  },
  classOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.base,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
