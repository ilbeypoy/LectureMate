import { useState, useEffect, useRef, useCallback } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';

export const PLAYBACK_RATES = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1.0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) setError(status.error);
      return;
    }
    setPosition((status.positionMillis ?? 0) / 1000);
    setDuration((status.durationMillis ?? 0) / 1000);
    setIsPlaying(status.isPlaying);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setPosition(0);
    }
  };

  const load = useCallback(async (uri: string) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri },
        { shouldPlay: false, rate: 1.0 },
        onPlaybackStatusUpdate
      );
      soundRef.current = sound;
      setIsLoaded(true);
      setError(null);
    } catch (e: any) {
      setError(e.message);
      setIsLoaded(false);
    }
  }, []);

  const play = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.playAsync();
  }, []);

  const pause = useCallback(async () => {
    if (!soundRef.current) return;
    await soundRef.current.pauseAsync();
  }, []);

  const togglePlayPause = useCallback(async () => {
    if (isPlaying) await pause();
    else await play();
  }, [isPlaying, play, pause]);

  const seek = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    await soundRef.current.setPositionAsync(seconds * 1000);
  }, []);

  const skip = useCallback(async (seconds: number) => {
    if (!soundRef.current) return;
    const next = Math.max(0, Math.min(duration, position + seconds));
    await soundRef.current.setPositionAsync(next * 1000);
  }, [position, duration]);

  const changeRate = useCallback(async (newRate: number) => {
    if (!soundRef.current) return;
    setRate(newRate);
    await soundRef.current.setRateAsync(newRate, true);
  }, []);

  const cleanup = useCallback(async () => {
    if (soundRef.current) {
      await soundRef.current.unloadAsync();
      soundRef.current = null;
      setIsLoaded(false);
      setIsPlaying(false);
      setPosition(0);
      setDuration(0);
    }
  }, []);

  return {
    isPlaying,
    position,
    duration,
    rate,
    isLoaded,
    error,
    load,
    play,
    pause,
    togglePlayPause,
    seek,
    skip,
    changeRate,
    cleanup,
  };
}
