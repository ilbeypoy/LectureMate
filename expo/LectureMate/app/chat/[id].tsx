import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import {
  getRecordingById,
  getSegmentsForRecording,
  getMessagesForRecording,
  insertMessage,
  clearMessagesForRecording,
} from '../../db/database';
import { DeepSeekService } from '../../services/deepseek';
import { generateId } from '../../utils/format';
import type { LMChatMessage, LMRecording, LMTranscriptSegment } from '../../types';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recording, setRecording] = useState<LMRecording | null>(null);
  const [segments, setSegments] = useState<LMTranscriptSegment[]>([]);
  const [messages, setMessages] = useState<LMChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    const rec = await getRecordingById(id);
    if (!rec) return;
    setRecording(rec);
    const [segs, msgs] = await Promise.all([
      getSegmentsForRecording(id),
      getMessagesForRecording(id),
    ]);
    setSegments(segs);
    setMessages(msgs);
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading || !recording) return;

    const userMsg: LMChatMessage = {
      id: generateId(),
      recordingId: id,
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };
    await insertMessage(userMsg);
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreaming('');

    try {
      const fullTranscript = segments.map((s) => s.text).join(' ');
      const history = messages.map((m) => ({ role: m.role, content: m.content }));

      let fullResponse = '';
      for await (const chunk of DeepSeekService.askQuestionStreaming(text, fullTranscript, history)) {
        fullResponse += chunk;
        setStreaming(fullResponse);
        scrollRef.current?.scrollToEnd({ animated: true });
      }

      const assistantMsg: LMChatMessage = {
        id: generateId(),
        recordingId: id,
        role: 'assistant',
        content: fullResponse,
        timestamp: Date.now(),
      };
      await insertMessage(assistantMsg);
      setMessages((prev) => [...prev, assistantMsg]);
      setStreaming('');
    } catch (e: any) {
      Alert.alert('Hata', e.message);
    }
    setLoading(false);
  };

  const handleClear = () => {
    Alert.alert('Sohbeti Temizle?', 'Tum mesajlar silinecek.', [
      { text: 'Iptal', style: 'cancel' },
      {
        text: 'Temizle',
        style: 'destructive',
        onPress: async () => {
          await clearMessagesForRecording(id);
          setMessages([]);
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'AI Sohbet',
          headerRight: () =>
            messages.length > 0 ? (
              <TouchableOpacity onPress={handleClear}>
                <Ionicons name="trash" size={20} color={Colors.accent} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          <View style={styles.intro}>
            <Ionicons name="sparkles" size={32} color={Colors.secondary} />
            <Text style={styles.introTitle}>AI Asistan</Text>
            <Text style={styles.introText}>
              "{recording?.title}" kaydinin transkriptine dayali sorular sorabilirsiniz.
            </Text>
          </View>

          {messages.map((msg) => (
            <Bubble key={msg.id} message={msg} />
          ))}

          {streaming && (
            <Bubble
              message={{
                id: 'streaming',
                recordingId: id,
                role: 'assistant',
                content: streaming,
                timestamp: Date.now(),
              }}
            />
          )}

          {loading && !streaming && (
            <View style={styles.loadingBubble}>
              <Text style={{ color: Colors.textSecondary }}>Dusunuyor...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            placeholder="Bir soru sorun..."
            placeholderTextColor={Colors.textSecondary}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            onPress={sendMessage}
            disabled={!input.trim() || loading}
            style={styles.sendButton}
          >
            <Ionicons
              name="send"
              size={20}
              color={!input.trim() || loading ? Colors.textSecondary : Colors.primary}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: LMChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <View style={styles.bubbleHeader}>
          <Ionicons
            name={isUser ? 'person' : 'sparkles'}
            size={11}
            color={isUser ? Colors.primary : Colors.secondary}
          />
          <Text
            style={[
              styles.bubbleRole,
              { color: isUser ? Colors.primary : Colors.secondary },
            ]}
          >
            {isUser ? 'Sen' : 'AI Asistan'}
          </Text>
        </View>
        <Text style={styles.bubbleText}>{message.content}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  intro: { alignItems: 'center', padding: 20, gap: 8 },
  introTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  introText: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },
  bubbleRow: { flexDirection: 'row' },
  bubbleRowUser: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '85%',
    padding: 12,
    borderRadius: 16,
    gap: 4,
  },
  bubbleUser: { backgroundColor: `${Colors.primary}15` },
  bubbleAssistant: { backgroundColor: Colors.cardBackground },
  bubbleHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bubbleRole: { fontSize: 10, fontWeight: '600' },
  bubbleText: { fontSize: 14, color: Colors.textPrimary, lineHeight: 20 },
  loadingBubble: { padding: 12, alignSelf: 'flex-start' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    gap: 8,
    backgroundColor: Colors.cardBackground,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: Colors.background,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sendButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
