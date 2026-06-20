import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { getProfile } from './src/utils/storage';
import OnboardingScreen from './src/screens/OnboardingScreen';
import MainApp from './src/MainApp';

export default function App() {
  const [profile, setProfile] = useState(undefined);

  useEffect(() => {
    getProfile().then(setProfile).catch(() => setProfile(null));
  }, []);

  if (profile === undefined) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#080f1a', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#22c55e" size="large" />
        </View>
      </SafeAreaProvider>
    );
  }

  if (!profile) {
    return (
      <SafeAreaProvider>
        <OnboardingScreen onComplete={setProfile} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <MainApp />
    </SafeAreaProvider>
  );
}
