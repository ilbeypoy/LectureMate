import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/database';

export default function RootLayout() {
  useEffect(() => {
    // Audio session konfigurasyonu
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
    }).catch(() => {});

    // Veritabanini hazirla
    getDb().catch((e) => console.error('DB init error:', e));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="recording"
            options={{ presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="library/[id]"
            options={{ headerShown: true, title: 'Kayit Detay' }}
          />
          <Stack.Screen
            name="chat/[id]"
            options={{ presentation: 'modal', headerShown: true, title: 'AI Sohbet' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
