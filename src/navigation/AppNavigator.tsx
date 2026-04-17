import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';
import { navigationRef } from './navigationRef';
import InactivityGuard from '../components/InactivityGuard';
import HomeScreen from '../screens/HomeScreen';
import UnitsScreen from '../screens/UnitsScreen';
import RegisterScreen from '../screens/RegisterScreen';
import QuizScreen from '../screens/QuizScreen';
import ResultScreen from '../screens/ResultScreen';
import RouletteScreen from '../screens/RouletteScreen';
import PostInteractionScreen from '../screens/PostInteractionScreen';
import AdminPanelScreen from '../screens/AdminPanelScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer ref={navigationRef}>
      <InactivityGuard>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Units" component={UnitsScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Result" component={ResultScreen} />
          <Stack.Screen name="RouletteGame" component={RouletteScreen} />
          <Stack.Screen name="PostInteraction" component={PostInteractionScreen} />
          <Stack.Screen name="AdminPanel" component={AdminPanelScreen} />
        </Stack.Navigator>
      </InactivityGuard>
    </NavigationContainer>
  );
}
