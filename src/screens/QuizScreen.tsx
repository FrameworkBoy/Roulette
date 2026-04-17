import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import ScreenLogo from '../components/ScreenLogo';
import { scale, W } from '../utils/responsive';
import { SafeAreaView } from 'react-native-safe-area-context';
import allQuestions from '../data/questions.json';
import { Colors } from '../constants/colors';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';
import { useInactivity } from '../context/InactivityContext';

type Question = {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
};

const TOTAL = 5;
const REVEAL_DELAY = 900;
const MIN_TO_WIN = 3;

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function QuizScreen({ navigation }: ScreenProps<'Quiz'>) {
  const session = useSession();
  const inactivity = useInactivity();
  const [questions] = useState<Question[]>(() =>
    shuffle(allQuestions as Question[]).slice(0, TOTAL),
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [isRevealing, setIsRevealing] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;

  const current = questions[currentIndex];

  useEffect(() => {
    session.recordQuizStart();
  }, []);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (currentIndex / TOTAL) * 100,
      duration: 400,
      useNativeDriver: false,
    }).start();
  }, [currentIndex]);

  const handleSelect = useCallback(
    (index: number) => {
      if (isRevealing) return;
      inactivity.resume();
      setSelectedOption(index);
      setIsRevealing(true);

      const correct = index === current.correctIndex;
      if (correct) setScore((s) => s + 1);

      session.recordQuizAnswer({
        questionId: current.id,
        question: current.question,
        selectedIndex: index,
        selectedLabel: current.options[index],
        correctIndex: current.correctIndex,
        correctLabel: current.options[current.correctIndex],
        isCorrect: correct,
        answeredAt: new Date().toISOString(),
      });

      setTimeout(() => {
        if (currentIndex + 1 < TOTAL) {
          setCurrentIndex((i) => i + 1);
          setSelectedOption(null);
          setIsRevealing(false);
        } else {
          const finalScore = correct ? score + 1 : score;
          const eligible = finalScore >= MIN_TO_WIN;
          session.recordQuizComplete(finalScore, TOTAL, eligible);
          navigation.replace('Result', { score: finalScore, total: TOTAL });
        }
      }, REVEAL_DELAY);
    },
    [isRevealing, current, currentIndex, score, navigation, session],
  );

  const getOptionStyle = (index: number) => {
    if (!isRevealing || selectedOption === null) {
      return [styles.option, selectedOption === index && styles.optionSelected];
    }
    if (index === current.correctIndex) return [styles.option, styles.optionCorrect];
    if (index === selectedOption) return [styles.option, styles.optionWrong];
    return [styles.option, styles.optionDimmed];
  };

  const getOptionTextStyle = (index: number) => {
    if (!isRevealing) return styles.optionText;
    if (index === current.correctIndex) return [styles.optionText, styles.optionTextHighlight];
    if (index === selectedOption) return [styles.optionText, styles.optionTextHighlight];
    return [styles.optionText, styles.optionTextDimmed];
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScreenLogo size="small" />
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressBar,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressLabel}>
            {currentIndex + 1} / {TOTAL}
          </Text>
        </View>

        <View style={styles.questionContainer}>
          <Text style={styles.questionNumber}>Pergunta {currentIndex + 1}</Text>
          <Text style={styles.questionText}>{current.question}</Text>
        </View>

        <View style={styles.options}>
          {current.options.map((option, index) => (
            <Pressable
              key={index}
              style={getOptionStyle(index)}
              onPress={() => handleSelect(index)}
              disabled={isRevealing}
            >
              <Text style={styles.optionLetter}>{String.fromCharCode(65 + index)}</Text>
              <Text style={getOptionTextStyle(index)}>{option}</Text>
            </Pressable>
          ))}
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
    paddingHorizontal: scale(24),
    paddingTop: scale(16),
    paddingBottom: scale(24),
    gap: scale(16),
    width: '100%',
    maxWidth: W * 0.9,
    alignSelf: 'center',
  },
  progressContainer: { gap: scale(6) },
  progressTrack: {
    height: scale(5),
    backgroundColor: Colors.surface,
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: scale(3),
  },
  progressLabel: {
    color: Colors.textSecondary,
    fontSize: scale(12),
    textAlign: 'right',
  },
  questionContainer: { gap: scale(8) },
  questionNumber: {
    fontSize: scale(12),
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  questionText: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: Colors.text,
    lineHeight: scale(28),
  },
  options: { gap: scale(10) },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: scale(14),
    paddingHorizontal: scale(16),
    gap: scale(12),
  },
  optionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryPastel,
  },
  optionCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.successPastel,
  },
  optionWrong: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorPastel,
  },
  optionDimmed: { opacity: 0.4 },
  optionLetter: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: Colors.border,
    textAlign: 'center',
    lineHeight: scale(28),
    fontSize: scale(13),
    fontWeight: 'bold',
    color: Colors.text,
    overflow: 'hidden',
  },
  optionText: { flex: 1, fontSize: scale(15), color: Colors.text },
  optionTextHighlight: { fontWeight: 'bold' },
  optionTextDimmed: { color: Colors.textSecondary },
});
