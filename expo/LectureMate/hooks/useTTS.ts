import { useState, useEffect, useCallback } from 'react';
import * as Speech from 'expo-speech';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<Speech.Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const all = await Speech.getAvailableVoicesAsync();
      const turkish = all.filter((v) => v.language === 'tr-TR');
      setVoices(turkish);
      const enhanced = turkish.find((v) => v.quality === Speech.VoiceQuality.Enhanced);
      setSelectedVoice(enhanced?.identifier ?? turkish[0]?.identifier ?? null);
    })();
  }, []);

  const speak = useCallback((text: string, options: { rate?: number; pitch?: number } = {}) => {
    Speech.stop();
    Speech.speak(text, {
      language: 'tr-TR',
      voice: selectedVoice ?? undefined,
      pitch: options.pitch ?? 1.0,
      rate: options.rate ?? 0.5,
      onStart: () => setIsSpeaking(true),
      onDone: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  }, [selectedVoice]);

  const stop = useCallback(() => {
    Speech.stop();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, voices, selectedVoice, setSelectedVoice };
}
