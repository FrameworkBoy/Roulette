import React from 'react';
import { View, Text, Pressable, StyleSheet, SafeAreaView, Linking } from 'react-native';
import { Colors } from '../constants/colors';
import type { ScreenProps } from '../types/navigation';

const UNITS = [
  {
    id: 'analia',
    label: 'Unidade Anália Franco',
    url: 'https://example.com/analia-franco',
  },
  {
    id: 'paulista',
    label: 'Unidade Paulista',
    url: 'https://example.com/paulista',
  },
];

export default function PostInteractionScreen({ navigation }: ScreenProps<'PostInteraction'>) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Conheça nossas unidades</Text>
          <Text style={styles.subtitle}>
            Venha nos visitar e transforme sua vida!
          </Text>
        </View>

        <View style={styles.unitButtons}>
          {UNITS.map((unit) => (
            <Pressable
              key={unit.id}
              style={({ pressed }) => [styles.unitButton, pressed && styles.pressed]}
              onPress={() => Linking.openURL(unit.url)}
            >
              <Text style={styles.unitButtonIcon}>📍</Text>
              <Text style={styles.unitButtonText}>{unit.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.skipButtonText}>Pular</Text>
        </Pressable>
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
    gap: 40,
  },
  header: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
  },
  unitButtons: {
    width: '100%',
    gap: 16,
  },
  unitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  unitButtonIcon: {
    fontSize: 24,
  },
  unitButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  skipButtonText: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
