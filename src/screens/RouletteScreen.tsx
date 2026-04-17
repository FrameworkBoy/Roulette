import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import Roulette from '../components/Roulette';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';
import type { Prize } from '../config/prizes';

export default function RouletteScreen({ navigation }: ScreenProps<'RouletteGame'>) {
  const [done, setDone] = useState(false);
  const session = useSession();

  useEffect(() => {
    session.recordRouletteView();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Gire a Roleta!</Text>
          <Text style={styles.subtitle}>Você ganhou o direito de girar. Boa sorte!</Text>
        </View>

        <Roulette
          onSpinComplete={(prize: Prize) => {
            session.recordRouletteSpin({
              prizeId: prize.id,
              prizeLabel: prize.label,
              spunAt: new Date().toISOString(),
            });
            setDone(true);
          }}
        />

        {done && (
          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
            onPress={() => navigation.navigate('PostInteraction')}
          >
            <Text style={styles.buttonText}>Continuar →</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 32,
  },
  header: {
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 52,
    paddingVertical: 18,
    borderRadius: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
