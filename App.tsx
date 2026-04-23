import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SessionProvider } from './src/context/SessionContext';
import { KeyboardProvider } from './src/context/KeyboardContext';
import { version } from './package.json';

export default function App() {
  return (
    <SessionProvider>
      <KeyboardProvider>
        <AppNavigator />
        <StatusBar style="light" />
        <View style={styles.versionBadge} pointerEvents="none">
          <Text style={styles.versionText}>v{version}</Text>
        </View>
      </KeyboardProvider>
    </SessionProvider>
  );
}

const styles = StyleSheet.create({
  versionBadge: {
    position: 'absolute',
    bottom: 8,
    left: 12,
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.25)',
    fontVariant: ['tabular-nums'],
  },
});
