import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import ScreenLogo from '../components/ScreenLogo';
import { scale, CONTENT_MAX_WIDTH } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';
import { navigateToNextBlock } from '../navigation/flowNavigation';
import { QUIZ_MIN_TO_WIN } from '../config/quiz';

export default function ResultScreen({ route, navigation }: ScreenProps<'Result'>) {
  const { score, total } = route.params;
  const eligible = score >= QUIZ_MIN_TO_WIN;
  const session = useSession();

  useEffect(() => {
    session.recordResultView(score, total);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <ScreenLogo size="small" />
          <View style={styles.scoreCircle}>
            <Text style={styles.scoreValue}>
              <Text style={styles.scoreNumber}>{score}</Text>
              <Text style={styles.scoreTotal}>/{total}</Text>
            </Text>
            <Text style={styles.scoreLabel}>acertos!</Text>
          </View>
          <View style={styles.messageBlock}>
            <Text style={styles.messageTitle}>
              {eligible ? 'Quiz finalizado' : 'Quiz finalizado.\nNão foi dessa vez!'}
            </Text>
            <Text style={styles.messageText}>
              {eligible
                ? 'Parabéns! Você atingiu a pontuação!'
                : 'Obrigado por participar.\nVeja as unidades da NATION.'}
            </Text>
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, pressed && styles.pressed]}
            onPress={() => navigateToNextBlock('quiz', { quizScore: score })}
          >
            <Text style={styles.primaryButtonText}>
              {eligible ? 'Conheça as nossas unidades' : 'Ver nossas unidades'}
            </Text>
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
    gap: scale(24),
  },
  scoreCircle: {
    width: scale(220),
    height: scale(220),
    borderRadius: scale(110),
    borderWidth: 3,
    borderColor: Colors.primary,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(4),
  },
  scoreValue: {
    textAlign: 'center',
  },
  scoreNumber: {
    fontSize: scale(72),
    fontWeight: 'bold',
    color: Colors.primary,
  },
  scoreTotal: {
    fontSize: scale(40),
    color: Colors.textSecondary,
  },
  scoreLabel: {
    fontSize: scale(22),
    color: Colors.textSecondary,
  },
  messageBlock: {
    alignItems: 'center',
    gap: scale(8),
  },
  messageTitle: {
    fontSize: scale(28),
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  messageText: {
    fontSize: scale(18),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(26),
  },
  bottom: {
    paddingBottom: scale(24),
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: scale(20),
    borderRadius: scale(50),
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.5,
    shadowRadius: scale(16),
    elevation: 10,
  },
  primaryButtonText: {
    color: Colors.textOnPrimary,
    fontSize: scale(18),
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
