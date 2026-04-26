import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { Colors } from '../../constants/colors';
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
import type { LMRecording, LMTranscriptSegment, LMBookmark, LMClass } from '../../types';

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const player = useAudioPlayer();
  const tts = useTTS();
  const [recording, setRecording] = useState<LMRecording | null>(null);
  const [segments, setSegments] = useState<LMTranscriptSegment[]>([]);
  const [bookmarks, setBookmarks] = useState<LMBookmark[]>([]);
  const [cls, setCls] = useState<LMClass | null>(null);
  const [hasAI, setHasAI] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [showRateMenu, setShowRateMenu] = useState(false);

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
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
    setGeneratingSummary(false);
  };

  const handleExport = () => {
    if (!recording) return;
    Alert.alert('Disa Aktar', 'Format sec', [
      { text: 'PDF', onPress: () => exportAsPDF(recording, segments, cls) },
      { text: 'Metin (.txt)', onPress: () => exportAsText(recording, segments, cls) },
      { text: 'Iptal', style: 'cancel' },
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
      <View style={styles.center}>
        <Text style={{ color: Colors.textSecondary }}>Yukleniyor...</Text>
      </View>
    );
  }

  const fullTranscript = segments.map((s) => s.text).join(' ');

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: recording.title,
          headerRight: () => (
            <View style={{ flexDirection: 'row', gap: 12 }}>
              {hasAI && (
                <TouchableOpacity onPress={() => router.push(`/chat/${id}`)}>
                  <Ionicons name="chatbubbles" size={22} color={Colors.primary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={handleExport}>
                <Ionicons name="share-outline" size={22} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          ),
        }}
      />

      {/* Meta */}
      <View style={styles.metaCard}>
        {cls && (
          <View style={styles.metaRow}>
            <View style={[styles.dot, { backgroundColor: cls.colorHex }]} />
            <Text style={[styles.metaClass, { color: Colors.primary }]}>{cls.name}</Text>
          </View>
        )}
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textSecondary} />
          <Text style={styles.metaText}>{formatDate(recording.recordedAt)}</Text>
          <Ionicons name="time-outline" size={14} color={Colors.textSecondary} style={{ marginLeft: 12 }} />
          <Text style={styles.metaText}>{formatDuration(recording.duration)}</Text>
        </View>
      </View>

      {/* Player */}
      <View style={styles.playerCard}>
        <Slider
          style={{ width: '100%', height: 30 }}
          minimumValue={0}
          maximumValue={Math.max(player.duration, 1)}
          value={player.position}
          minimumTrackTintColor={Colors.primary}
          maximumTrackTintColor={Colors.border}
          thumbTintColor={Colors.primary}
          onSlidingComplete={(v) => player.seek(v)}
        />
        <View style={styles.playerTime}>
          <Text style={styles.playerTimeText}>{formatTime(player.position)}</Text>
          <Text style={styles.playerTimeText}>{formatTime(player.duration)}</Text>
        </View>

        <View style={styles.playerControls}>
          <TouchableOpacity onPress={() => setShowRateMenu(!showRateMenu)} style={styles.rateButton}>
            <Text style={styles.rateText}>{player.rate}x</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => player.skip(-15)}>
            <Ionicons name="play-back" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={player.togglePlayPause}>
            <Ionicons
              name={player.isPlaying ? 'pause-circle' : 'play-circle'}
              size={56}
              color={Colors.primary}
            />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => player.skip(15)}>
            <Ionicons name="play-forward" size={28} color={Colors.textPrimary} />
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReadAloud}>
            <Ionicons
              name={tts.isSpeaking ? 'volume-mute' : 'volume-high'}
              size={26}
              color={Colors.secondary}
            />
          </TouchableOpacity>
        </View>

        {showRateMenu && (
          <View style={styles.rateMenu}>
            {PLAYBACK_RATES.map((r) => (
              <TouchableOpacity
                key={r}
                style={[styles.rateOption, player.rate === r && styles.rateOptionActive]}
                onPress={() => {
                  player.changeRate(r);
                  setShowRateMenu(false);
                }}
              >
                <Text style={styles.rateText}>{r}x</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* AI Ozet */}
      {hasAI ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Ionicons name="sparkles" size={16} color={Colors.secondary} />
              <Text style={styles.sectionTitle}>AI Ozet</Text>
            </View>
            {!recording.aiSummary && segments.length > 0 && (
              <TouchableOpacity onPress={handleGenerateSummary} disabled={generatingSummary}>
                <Text style={{ color: Colors.primary, fontSize: 13 }}>
                  {generatingSummary ? 'Olusturuluyor...' : 'Olustur'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          {recording.aiSummary ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryText}>{recording.aiSummary}</Text>
            </View>
          ) : (
            <Text style={styles.hintText}>
              Transkript olusturulduktan sonra AI ozet uretebilirsiniz
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.section}>
          <View style={styles.aiOnboardCard}>
            <Ionicons name="sparkles" size={24} color={Colors.secondary} />
            <Text style={styles.aiOnboardTitle}>AI Ozellikleri</Text>
            <Text style={styles.aiOnboardText}>
              DeepSeek API anahtarinizi Ayarlar'dan ekleyerek AI ozet, baslik ve sohbet ozelliklerini etkinlestirin.
            </Text>
          </View>
        </View>
      )}

      {/* Yer imleri */}
      {bookmarks.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Yer Imleri</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingVertical: 4 }}>
              {bookmarks.map((bm) => (
                <TouchableOpacity
                  key={bm.id}
                  style={styles.bookmark}
                  onPress={() => handleSeekTo(bm.timestamp)}
                >
                  <Ionicons name="bookmark" size={16} color={Colors.warning} />
                  <Text style={styles.bookmarkTime}>{formatTime(bm.timestamp)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Transkript */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transkript</Text>
        {segments.length === 0 ? (
          <Text style={styles.hintText}>Henuz transkript yok</Text>
        ) : (
          segments.map((seg) => {
            const isCurrent = player.position >= seg.startTime && player.position <= seg.endTime;
            return (
              <TouchableOpacity
                key={seg.id}
                style={[styles.segment, isCurrent && styles.segmentActive]}
                onPress={() => handleSeekTo(seg.startTime)}
              >
                <Text style={styles.segmentTime}>{formatTime(seg.startTime)}</Text>
                <Text style={styles.segmentText}>{seg.text}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  metaCard: { padding: 16, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  metaClass: { fontSize: 14, fontWeight: '600' },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  playerCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: Colors.cardBackground,
    borderRadius: 16,
  },
  playerTime: { flexDirection: 'row', justifyContent: 'space-between' },
  playerTimeText: { fontSize: 11, color: Colors.textSecondary, fontVariant: ['tabular-nums'] },
  playerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingHorizontal: 8,
  },
  rateButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  rateText: { fontSize: 12, fontWeight: '600', color: Colors.textPrimary },
  rateMenu: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  rateOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: 12,
  },
  rateOptionActive: { backgroundColor: `${Colors.primary}20` },
  section: { padding: 16, paddingTop: 0, gap: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  summaryCard: {
    backgroundColor: `${Colors.secondary}15`,
    padding: 14,
    borderRadius: 12,
  },
  summaryText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  aiOnboardCard: {
    backgroundColor: Colors.cardBackground,
    padding: 16,
    borderRadius: 12,
    gap: 6,
    borderWidth: 1,
    borderColor: `${Colors.secondary}40`,
    borderStyle: 'dashed',
  },
  aiOnboardTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  aiOnboardText: { fontSize: 12, color: Colors.textSecondary },
  hintText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', padding: 20 },
  bookmark: {
    alignItems: 'center',
    backgroundColor: Colors.cardBackground,
    padding: 8,
    borderRadius: 8,
    minWidth: 60,
    gap: 2,
  },
  bookmarkTime: { fontSize: 11, fontVariant: ['tabular-nums'], color: Colors.textPrimary },
  segment: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  segmentActive: { backgroundColor: `${Colors.primary}15` },
  segmentTime: { fontSize: 11, color: Colors.primary, fontVariant: ['tabular-nums'], width: 40, textAlign: 'right' },
  segmentText: { flex: 1, fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
});
