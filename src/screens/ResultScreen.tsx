import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import type { ScreenProps } from '../types/navigation';

const MIN_TO_WIN = 3;

export default function ResultScreen({ route, navigation }: ScreenProps<'Result'>) {
  const { score, total } = route.params;
  const eligible = score >= MIN_TO_WIN;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.scoreCard}>
          <Text style={styles.scoreEmoji}>{eligible ? '🎉' : '😔'}</Text>
          <Text style={styles.scoreLabel}>Você acertou</Text>
          <Text style={styles.scoreValue}>
            {score}
            <Text style={styles.scoreTotal}>/{total}</Text>
          </Text>
          <View style={styles.dots}>
            {Array.from({ length: total }).map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i < score ? styles.dotFilled : styles.dotEmpty]}
              />
            ))}
          </View>
        </View>

        {eligible ? (
          <View style={styles.messageBlock}>
            <Text style={styles.messageTitle}>Parabéns!</Text>
            <Text style={styles.messageText}>
              Você desbloqueou o direito de girar a roleta de prêmios!
            </Text>
          </View>
        ) : (
          <View style={styles.messageBlock}>
            <Text style={styles.messageTitle}>Não foi dessa vez!</Text>
            <Text style={styles.messageText}>
              Você precisa acertar pelo menos {MIN_TO_WIN} perguntas para girar a roleta.
            </Text>
          </View>
        )}

        {eligible ? (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('RouletteGame')}
          >
            <Text style={styles.primaryButtonText}>🎰 Girar a Roleta!</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigation.navigate('PostInteraction')}
          >
            <Text style={styles.primaryButtonText}>Continuar</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.linkButtonText}>Jogar novamente</Text>
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
    gap: 32,
  },
  scoreCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  scoreEmoji: {
    fontSize: 56,
  },
  scoreLabel: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  scoreValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: 80,
  },
  scoreTotal: {
    fontSize: 40,
    color: Colors.textSecondary,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  dotFilled: {
    backgroundColor: Colors.primary,
  },
  dotEmpty: {
    backgroundColor: Colors.border,
  },
  messageBlock: {
    alignItems: 'center',
    gap: 8,
  },
  messageTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  messageText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  primaryButton: {
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
  primaryButtonText: {
    color: Colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
