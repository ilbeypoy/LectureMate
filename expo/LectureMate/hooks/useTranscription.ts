import { useState, useRef, useCallback } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from 'expo-speech-recognition';

export interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export function useTranscription() {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Birikmis transkript (session yenilemeleri arasinda korunur)
  const accumulatedRef = useRef('');
  // Mevcut session'in transkripti
  const currentSessionRef = useRef('');
  // Kayit baslangic zamani (saniye cinsinden offset hesabi icin)
  const recordStartRef = useRef<number>(0);
  const sessionStartOffsetRef = useRef<number>(0);
  // Olusan segment listesi
  const segmentsRef = useRef<TranscriptSegment[]>([]);
  // Kayit durumu (closure sorununu cozmek icin)
  const isRecordingRef = useRef(false);

  useSpeechRecognitionEvent('result', (event: any) => {
    const text = event.results?.[0]?.transcript ?? '';
    currentSessionRef.current = text;
    setTranscript(accumulatedRef.current + ' ' + text);
  });

  useSpeechRecognitionEvent('error', (event: any) => {
    setError(event.error || 'Bilinmeyen hata');
    console.error('Speech error:', event.error, event.message);
  });

  useSpeechRecognitionEvent('end', () => {
    // Session bittiginde mevcut metni biriktir ve segment olustur
    if (currentSessionRef.current) {
      const sessionElapsed = (Date.now() - recordStartRef.current) / 1000;
      segmentsRef.current.push({
        text: currentSessionRef.current,
        startTime: sessionStartOffsetRef.current,
        endTime: sessionElapsed,
      });
      accumulatedRef.current += ' ' + currentSessionRef.current;
      sessionStartOffsetRef.current = sessionElapsed;
      currentSessionRef.current = '';
    }

    // Eger hala kayittaysa otomatik yeniden baslat
    if (isRecordingRef.current) {
      startSession();
    }
  });

  const startSession = useCallback(async () => {
    try {
      await ExpoSpeechRecognitionModule.start({
        lang: 'tr-TR',
        interimResults: true,
        continuous: true,
        requiresOnDeviceRecognition: true, // offline + sinirsiz
        addsPunctuation: true,
      });
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const start = useCallback(async () => {
    const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!result.granted) {
      setError('Konusma tanima izni reddedildi');
      return false;
    }

    accumulatedRef.current = '';
    currentSessionRef.current = '';
    sessionStartOffsetRef.current = 0;
    segmentsRef.current = [];
    recordStartRef.current = Date.now();
    setTranscript('');
    setError(null);
    isRecordingRef.current = true;
    setIsRecording(true);
    await startSession();
    return true;
  }, [startSession]);

  const stop = useCallback(async () => {
    isRecordingRef.current = false;
    setIsRecording(false);
    try {
      await ExpoSpeechRecognitionModule.stop();
    } catch (e) {
      // ignore
    }
  }, []);

  const reset = useCallback(() => {
    accumulatedRef.current = '';
    currentSessionRef.current = '';
    segmentsRef.current = [];
    setTranscript('');
  }, []);

  const getSegments = useCallback((): TranscriptSegment[] => {
    // Son session'in segmentini de ekle
    const all = [...segmentsRef.current];
    if (currentSessionRef.current) {
      const sessionElapsed = (Date.now() - recordStartRef.current) / 1000;
      all.push({
        text: currentSessionRef.current,
        startTime: sessionStartOffsetRef.current,
        endTime: sessionElapsed,
      });
    }
    return all;
  }, []);

  return { transcript, isRecording, error, start, stop, reset, getSegments };
}
