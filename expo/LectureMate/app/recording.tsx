import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
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
  const router = useRouter();
  const params = useLocalSearchParams<{ classId?: string }>();
  const recorder = useAudioRecorder();
  const transcription = useTranscription();
  const [selectedClass, setSelectedClass] = useState<LMClass | null>(null);
  const [bookmarks, setBookmarks] = useState<{ timestamp: number }[]>([]);
  const [classes, setClasses] = useState<LMClass[]>([]);
  const [showClassPicker, setShowClassPicker] = useState(false);
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);

  useEffect(() => {
    getAllClasses().then(setClasses);
    if (params.classId) {
      getClassById(params.classId).then((c) => c && setSelectedClass(c));
    }
  }, [params.classId]);

  const handleStart = async () => {
    const result = await recorder.startRecording();
    if (!result) return;
    setRecordingId(result.id);
    setRecordingUri(result.uri);
    await transcription.start();
  };

  const handlePause = async () => {
    await recorder.pauseRecording();
  };

  const handleResume = async () => {
    await recorder.resumeRecording();
  };

  const handleStop = async () => {
    await transcription.stop();
    const result = await recorder.stopRecording();
    if (!result || !recordingId) return;

    const title = selectedClass
      ? `${selectedClass.name} - ${new Date().toLocaleDateString('tr-TR')}`
      : `Kayit - ${new Date().toLocaleDateString('tr-TR')}`;

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

    // Segmentleri kaydet
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

    // Yer imlerini kaydet
    for (const bm of bookmarks) {
      await insertBookmark({
        id: generateId(),
        recordingId,
        label: null,
        timestamp: bm.timestamp,
        createdAt: Date.now(),
      });
    }

    // AI ozet ve baslik (DeepSeek varsa, arka planda)
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
      Alert.alert(
        'Kaydi Iptal Et?',
        'Kayit silinecek ve kurtarilamaz.',
        [
          { text: 'Devam Et', style: 'cancel' },
          {
            text: 'Iptal Et',
            style: 'destructive',
            onPress: async () => {
              await transcription.stop();
              await recorder.cancelRecording();
              router.back();
            },
          },
        ]
      );
    } else {
      router.back();
    }
  };

  const handleBookmark = () => {
    setBookmarks([...bookmarks, { timestamp: recorder.duration }]);
  };

  const isIdle = !recorder.isRecording;
  const isRecordingActive = recorder.isRecording && !recorder.isPaused;
  const isPaused = recorder.isPaused;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={Colors.textPrimary} />
        </TouchableOpacity>
        {selectedClass ? (
          <View style={styles.classBadge}>
            <View style={[styles.classDot, { backgroundColor: selectedClass.colorHex }]} />
            <Text style={styles.classBadgeText}>{selectedClass.name}</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.classBadge}
            onPress={() => setShowClassPicker(true)}
            disabled={recorder.isRecording}
          >
            <Ionicons name="add-circle" size={16} color={Colors.primary} />
            <Text style={styles.classBadgeText}>Ders Sec</Text>
          </TouchableOpacity>
        )}
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        <Text style={styles.timer}>{formatTimer(recorder.duration)}</Text>

        <Waveform level={recorder.meterLevel} active={isRecordingActive} />

        <ScrollView style={styles.transcriptBox} contentContainerStyle={{ padding: 16 }}>
          {transcription.transcript ? (
            <Text style={styles.transcriptText}>{transcription.transcript}</Text>
          ) : (
            <Text style={styles.transcriptHint}>
              {recorder.isRecording
                ? 'Konusmaya basla, transkript burada cikar...'
                : 'Kayit baslatildiginda canli transkript burada gorunur'}
            </Text>
          )}
          {transcription.error && (
            <Text style={styles.errorText}>Transkript hatasi: {transcription.error}</Text>
          )}
        </ScrollView>

        {recorder.error && <Text style={styles.errorText}>{recorder.error}</Text>}

        {bookmarks.length > 0 && (
          <Text style={styles.bookmarkCount}>{bookmarks.length} yer imi</Text>
        )}
      </View>

      <View style={styles.controls}>
        {isIdle && (
          <>
            <View style={{ width: 60 }} />
            <TouchableOpacity onPress={handleStart} style={styles.recordButton}>
              <Ionicons name="mic" size={36} color="white" />
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </>
        )}

        {(isRecordingActive || isPaused) && (
          <>
            <TouchableOpacity onPress={handleBookmark} style={styles.sideButton}>
              <Ionicons name="bookmark" size={28} color={Colors.warning} />
              <Text style={styles.sideButtonLabel}>Isaretle</Text>
            </TouchableOpacity>

            {isRecordingActive ? (
              <TouchableOpacity onPress={handlePause} style={[styles.recordButton, { backgroundColor: Colors.primary }]}>
                <Ionicons name="pause" size={36} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handleResume} style={[styles.recordButton, { backgroundColor: Colors.success }]}>
                <Ionicons name="play" size={36} color="white" />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={handleStop} style={styles.sideButton}>
              <Ionicons name="stop" size={28} color={Colors.accent} />
              <Text style={styles.sideButtonLabel}>Bitir</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {showClassPicker && (
        <View style={styles.modal}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Ders Sec</Text>
            <ScrollView>
              <TouchableOpacity
                style={styles.classOption}
                onPress={() => {
                  setSelectedClass(null);
                  setShowClassPicker(false);
                }}
              >
                <Text style={styles.classOptionText}>Ders Yok (Serbest)</Text>
              </TouchableOpacity>
              {classes.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={styles.classOption}
                  onPress={() => {
                    setSelectedClass(c);
                    setShowClassPicker(false);
                  }}
                >
                  <View style={[styles.classDot, { backgroundColor: c.colorHex }]} />
                  <Text style={styles.classOptionText}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancel}
              onPress={() => setShowClassPicker(false)}
            >
              <Text style={{ color: Colors.primary, fontWeight: '600' }}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

function Waveform({ level, active }: { level: number; active: boolean }) {
  const [bars, setBars] = useState<number[]>(Array(30).fill(0.1));
  const animRefs = useRef(Array(30).fill(0).map(() => new Animated.Value(0.1))).current;

  useEffect(() => {
    if (!active) {
      setBars(Array(30).fill(0.1));
      return;
    }
    setBars((prev) => {
      const next = [...prev.slice(1), Math.max(0.05, level + (Math.random() - 0.5) * 0.1)];
      return next;
    });
  }, [level, active]);

  return (
    <View style={styles.waveform}>
      {bars.map((h, i) => (
        <View
          key={i}
          style={{
            width: 4,
            height: Math.max(4, h * 60),
            borderRadius: 2,
            backgroundColor: h > 0.7 ? Colors.accent : h > 0.4 ? Colors.primary : `${Colors.primary}80`,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  closeButton: { width: 40, height: 40, justifyContent: 'center' },
  classBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.cardBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  classDot: { width: 8, height: 8, borderRadius: 4 },
  classBadgeText: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  body: { flex: 1, padding: 16, gap: 16, alignItems: 'center', justifyContent: 'center' },
  timer: { fontSize: 56, fontWeight: '200', fontVariant: ['tabular-nums'], color: Colors.textPrimary },
  waveform: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    height: 70,
  },
  transcriptBox: {
    width: '100%',
    height: 140,
    backgroundColor: Colors.cardBackground,
    borderRadius: 12,
  },
  transcriptText: { fontSize: 15, lineHeight: 22, color: Colors.textPrimary },
  transcriptHint: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', padding: 20 },
  errorText: { color: 'red', fontSize: 12, textAlign: 'center' },
  bookmarkCount: { fontSize: 12, color: Colors.textSecondary },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 32,
  },
  recordButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sideButton: { alignItems: 'center', gap: 4, width: 60 },
  sideButtonLabel: { fontSize: 11, color: Colors.textSecondary },
  modal: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
    padding: 16,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12, color: Colors.textPrimary },
  classOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  classOptionText: { fontSize: 15, color: Colors.textPrimary },
  modalCancel: { padding: 12, alignItems: 'center' },
});
