import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { SessionProvider } from './src/context/SessionContext';

export default function App() {
  return (
    <SessionProvider>
      <AppNavigator />
      <StatusBar style="light" />
    </SessionProvider>
  );
}
