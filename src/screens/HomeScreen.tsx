import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { scale, CONTENT_MAX_WIDTH } from '../utils/responsive';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';
import { navigateToFirstBlock } from '../navigation/flowNavigation';

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const session = useSession();
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [, setTick] = useState(0);

  useEffect(() => {
    session.createSession();
    session.recordHomeView();
  }, []);

  const handleSecretTap = () => {
    tapCount.current += 1;
    clearTimeout(tapTimer.current);
    if (tapCount.current >= 3) {
      tapCount.current = 0;
      navigation.navigate('AdminPanel');
      return;
    }
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
      setTick((t) => t + 1);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Pressable style={styles.secretBtn} onPress={handleSecretTap} />

      <View style={styles.inner}>
        <View style={styles.top}>
          <Image
            source={require('../assets/nation-logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>TESTE SEUS</Text>
          <Text style={styles.titleAccent}>CONHECIMENTOS!</Text>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigateToFirstBlock()}
          >
            <Text style={styles.primaryButtonText}>Começar</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => { session.recordUnitsScreenView(); navigation.navigate('Units'); }}
          >
            <Text style={styles.secondaryButtonText}>Assista aos vídeos</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: CONTENT_MAX_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: scale(32),
  },
  top: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
  },
  logo: {
    width: '100%',
    height: scale(220),
    marginBottom: scale(24),
  },
  title: {
    fontSize: scale(36),
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  titleAccent: {
    fontSize: scale(36),
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  bottom: {
    paddingBottom: scale(24),
    gap: scale(16),
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: scale(50),
    paddingVertical: scale(20),
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.5,
    shadowRadius: scale(16),
    elevation: 10,
  },
  primaryButtonText: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: Colors.textOnPrimary,
  },
  secondaryButton: {
    backgroundColor: Colors.surface,
    borderRadius: scale(50),
    paddingVertical: scale(20),
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: scale(18),
    fontWeight: 'bold',
    color: Colors.text,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  secretBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: scale(60),
    height: scale(60),
    zIndex: 99,
  },
});
