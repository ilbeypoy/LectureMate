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
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import { useTheme, Typography, Spacing, Radii } from '../../constants/theme';
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
  const { t } = useTranslation();
  const { colors } = useTheme();

  const [recording, setRecording] = useState<LMRecording | null>(null);
  const [segments, setSegments] = useState<LMTranscriptSegment[]>([]);
  const [messages, setMessages] = useState<LMChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => { load(); }, [id]);

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

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message);
    }
    setLoading(false);
  };

  const handleClear = () => {
    Alert.alert(t('chat.clearTitle'), t('chat.clearMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('chat.clear'),
        style: 'destructive',
        onPress: async () => {
          await clearMessagesForRecording(id);
          setMessages([]);
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.systemGroupedBackground }]}>
      <Stack.Screen
        options={{
          title: t('chat.title'),
          headerRight: () =>
            messages.length > 0 ? (
              <TouchableOpacity onPress={handleClear} hitSlop={10}>
                <Ionicons name="trash-outline" size={20} color={colors.systemRed} />
              </TouchableOpacity>
            ) : null,
        }}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: Spacing.base, gap: Spacing.sm }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {/* Intro */}
          <View style={styles.intro}>
            <View style={[styles.introIcon, { backgroundColor: colors.systemPurple + '22' }]}>
              <Ionicons name="sparkles" size={28} color={colors.systemPurple} />
            </View>
            <Text style={[Typography.title3, { color: colors.label }]}>
              {t('chat.intro')}
            </Text>
            <Text style={[Typography.footnote, { color: colors.secondaryLabel, textAlign: 'center', paddingHorizontal: Spacing.lg }]}>
              {t('chat.introDesc', { title: recording?.title ?? '...' })}
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
            <View style={styles.thinkingBubble}>
              <View style={[styles.dot, { backgroundColor: colors.tertiaryLabel }]} />
              <View style={[styles.dot, { backgroundColor: colors.tertiaryLabel }]} />
              <View style={[styles.dot, { backgroundColor: colors.tertiaryLabel }]} />
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={[styles.inputBar, { backgroundColor: colors.secondarySystemGroupedBackground, borderTopColor: colors.separator }]}>
          <View style={[styles.inputWrap, { backgroundColor: colors.tertiarySystemFill }]}>
            <TextInput
              style={[styles.input, { color: colors.label }]}
              placeholder={t('chat.inputPlaceholder')}
              placeholderTextColor={colors.tertiaryLabel}
              value={input}
              onChangeText={setInput}
              multiline
              maxLength={1000}
              onSubmitEditing={sendMessage}
            />
            {input.trim() && (
              <TouchableOpacity
                onPress={sendMessage}
                disabled={loading}
                style={[styles.sendBtn, { backgroundColor: colors.systemBlue }]}
              >
                <Ionicons name="arrow-up" size={18} color="white" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Bubble({ message }: { message: LMChatMessage }) {
  const { colors } = useTheme();
  const isUser = message.role === 'user';

  return (
    <View
      style={[
        styles.bubbleRow,
        { justifyContent: isUser ? 'flex-end' : 'flex-start' },
      ]}
    >
      <View
        style={[
          styles.bubble,
          isUser
            ? { backgroundColor: colors.systemBlue }
            : { backgroundColor: colors.secondarySystemGroupedBackground },
        ]}
      >
        <Text
          style={{
            ...Typography.body,
            color: isUser ? '#FFFFFF' : colors.label,
            lineHeight: 22,
          }}
        >
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  intro: {
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleRow: { flexDirection: 'row' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  thinkingBubble: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: 'rgba(120,120,128,0.16)',
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  inputBar: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.base,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Radii.full,
    minHeight: 36,
  },
  input: {
    flex: 1,
    ...Typography.body,
    paddingVertical: 6,
    maxHeight: 100,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
