import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const session = useSession();

  useEffect(() => {
    session.createSession();
    session.recordHomeView();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Bem-vindo!</Text>
          <Text style={styles.subtitle}>O que você quer fazer hoje?</Text>
        </View>

        <View style={styles.buttons}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('Quiz')}
          >
            <Text style={styles.primaryButtonIcon}>🧠</Text>
            <Text style={styles.primaryButtonText}>Teste seus conhecimentos</Text>
            <Text style={styles.primaryButtonSub}>Responda o quiz e ganhe prêmios!</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.outlineButton, pressed && styles.pressed]}
            onPress={() => { session.recordUnitsScreenView(); navigation.navigate('Units'); }}
          >
            <Text style={styles.outlineButtonIcon}>📍</Text>
            <Text style={styles.outlineButtonText}>Conheça nossas unidades</Text>
            <Text style={styles.outlineButtonSub}>Anália Franco e Paulista</Text>
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
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 64,
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 20,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  buttons: {
    width: '100%',
    gap: 20,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 6,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonIcon: {
    fontSize: 36,
  },
  primaryButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  primaryButtonSub: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
  },
  outlineButton: {
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    gap: 6,
  },
  outlineButtonIcon: {
    fontSize: 36,
  },
  outlineButtonText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
  },
  outlineButtonSub: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
