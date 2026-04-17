import React from 'react';
import { View, Text, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';

const UNITS = [
  {
    id: 'analia',
    name: 'Unidade Anália Franco',
    address: 'São Paulo, SP',
    url: 'https://example.com/analia-franco',
  },
  {
    id: 'paulista',
    name: 'Unidade Paulista',
    address: 'São Paulo, SP',
    url: 'https://example.com/paulista',
  },
];

export default function UnitsScreen({ navigation }: ScreenProps<'Units'>) {
  const session = useSession();
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Nossas Unidades</Text>
          <Text style={styles.subtitle}>Escolha uma unidade para conhecer</Text>
        </View>

        <View style={styles.cards}>
          {UNITS.map((unit) => (
            <Pressable
              key={unit.id}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
              onPress={() => { session.recordUnitOpened(unit.id, unit.name); Linking.openURL(unit.url); }}
            >
              <Text style={styles.cardIcon}>📍</Text>
              <Text style={styles.cardName}>{unit.name}</Text>
              <Text style={styles.cardAddress}>{unit.address}</Text>
              <View style={styles.cardCta}>
                <Text style={styles.cardCtaText}>Saiba mais →</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>← Voltar</Text>
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
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  cards: {
    width: '100%',
    gap: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 32,
    paddingHorizontal: 28,
    alignItems: 'center',
    gap: 8,
  },
  cardIcon: {
    fontSize: 40,
  },
  cardName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  cardAddress: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  cardCta: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
  },
  cardCtaText: {
    color: Colors.text,
    fontWeight: 'bold',
    fontSize: 15,
  },
  backButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  backButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
