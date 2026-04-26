import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Audio } from 'expo-av';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getDb } from '../db/database';
import { PreferencesProvider, usePreferences } from '../contexts/PreferencesContext';
import { useTheme } from '../constants/theme';
import '../i18n';

function RootStack() {
  const { effectiveScheme } = usePreferences();
  const { colors } = useTheme();

  return (
    <>
      <StatusBar style={effectiveScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.systemGroupedBackground },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="recording"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen
          name="library/[id]"
          options={{
            headerShown: true,
            headerTransparent: true,
            headerBlurEffect: effectiveScheme === 'dark' ? 'dark' : 'light',
            headerStyle: { backgroundColor: 'transparent' },
            headerTintColor: colors.systemBlue,
            headerTitle: '',
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="chat/[id]"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerStyle: { backgroundColor: colors.secondarySystemGroupedBackground },
            headerTintColor: colors.systemBlue,
            headerTitleStyle: { color: colors.label },
            headerTitle: '',
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
    }).catch(() => {});

    getDb().catch((e) => console.error('DB init error:', e));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <PreferencesProvider>
          <RootStack />
        </PreferencesProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
