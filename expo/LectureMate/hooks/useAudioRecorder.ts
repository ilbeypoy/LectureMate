import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import { generateId } from '../utils/format';

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [meterLevel, setMeterLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(0);
  const tickIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
      recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const configureAudioSession = async () => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
    });
  };

  const startRecording = useCallback(async (): Promise<{ uri: string; id: string } | null> => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        setError('Mikrofon izni reddedildi');
        return null;
      }

      await configureAudioSession();

      const id = generateId();
      const recording = new Audio.Recording();

      await recording.prepareToRecordAsync({
        isMeteringEnabled: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 64000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: { mimeType: 'audio/webm', bitsPerSecond: 64000 },
      });

      await recording.startAsync();
      recordingRef.current = recording;
      startTimeRef.current = Date.now();
      accumulatedTimeRef.current = 0;
      setIsRecording(true);
      setIsPaused(false);
      setError(null);

      tickIntervalRef.current = setInterval(async () => {
        try {
          const status = await recording.getStatusAsync();
          if (status.isRecording) {
            const elapsed = accumulatedTimeRef.current + (Date.now() - startTimeRef.current) / 1000;
            setDuration(elapsed);
            const metering = (status as any).metering ?? -160;
            // -160 (sessiz) ile 0 (max) arasini 0-1 araligina normalize et
            const normalized = Math.max(0, (metering + 50) / 50);
            setMeterLevel(normalized);
          }
        } catch (e) {}
      }, 100);

      return { uri: recording.getURI() ?? '', id };
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const pauseRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.pauseAsync();
      accumulatedTimeRef.current += (Date.now() - startTimeRef.current) / 1000;
      setIsPaused(true);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const resumeRecording = useCallback(async () => {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.startAsync();
      startTimeRef.current = Date.now();
      setIsPaused(false);
    } catch (e: any) {
      setError(e.message);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<{ uri: string; duration: number } | null> => {
    if (!recordingRef.current) return null;
    try {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }

      const finalDuration = accumulatedTimeRef.current + (Date.now() - startTimeRef.current) / 1000;
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI() ?? '';
      recordingRef.current = null;

      // Dosyayi kalici dizine tasi
      const recordingsDir = `${FileSystem.documentDirectory}recordings/`;
      await FileSystem.makeDirectoryAsync(recordingsDir, { intermediates: true });
      const filename = `${Date.now()}.m4a`;
      const newUri = `${recordingsDir}${filename}`;
      await FileSystem.moveAsync({ from: uri, to: newUri });

      setIsRecording(false);
      setIsPaused(false);
      setDuration(0);
      setMeterLevel(0);

      return { uri: newUri, duration: finalDuration };
    } catch (e: any) {
      setError(e.message);
      return null;
    }
  }, []);

  const cancelRecording = useCallback(async () => {
    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }
    if (recordingRef.current) {
      try {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        if (uri) {
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      } catch {}
      recordingRef.current = null;
    }
    setIsRecording(false);
    setIsPaused(false);
    setDuration(0);
    setMeterLevel(0);
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    meterLevel,
    error,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    cancelRecording,
  };
}
