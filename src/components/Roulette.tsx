import React, { useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import prizesData from '../data/prizes.json';

type Prize = {
  id: number;
  label: string;
  points: number;
  startAngle: number;
  endAngle: number;
};

type Props = {
  onSpinComplete?: (prize: Prize) => void;
};

const prizes = prizesData as Prize[];

const WHEEL_SIZE = 300;
const SPIN_DURATION = 4000;
const FULL_SPINS = 5;

export default function Roulette({ onSpinComplete }: Props = {}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const totalRotation = useRef(0);

  const rotateInterp = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const handleSpin = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setResult(null);

    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    const centerAngle = (prize.startAngle + prize.endAngle) / 2;
    const currentMod = totalRotation.current % 360;
    const diff = (centerAngle - currentMod + 360) % 360;
    const target = totalRotation.current + FULL_SPINS * 360 + (diff === 0 ? 360 : diff);

    totalRotation.current = target;

    Animated.timing(spinValue, {
      toValue: target,
      duration: SPIN_DURATION,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setResult(prize);
      setIsSpinning(false);
      onSpinComplete?.(prize);
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.wheelWrapper}>
        <View style={styles.pointerContainer}>
          <View style={styles.pointer} />
        </View>
        <Animated.Image
          source={require('../../assets/roulette-wheel.png')}
          style={[styles.wheel, { transform: [{ rotate: rotateInterp }] }]}
          resizeMode="contain"
        />
      </View>

      <View style={styles.resultContainer}>
        {result ? (
          <Text style={styles.resultText}>
            {result.points > 0 ? `You won ${result.label}!` : result.label}
          </Text>
        ) : (
          <Text style={styles.hint}>
            {isSpinning ? 'Good luck...' : 'Press SPIN to play!'}
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          isSpinning && styles.buttonDisabled,
          pressed && !isSpinning && styles.buttonPressed,
        ]}
        onPress={handleSpin}
        disabled={isSpinning}
      >
        <Text style={styles.buttonText}>
          {isSpinning ? 'Spinning...' : 'SPIN'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 32,
  },
  wheelWrapper: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    top: -14,
    zIndex: 10,
    alignItems: 'center',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 12,
    borderRightWidth: 12,
    borderTopWidth: 24,
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E91E8C',
  },
  wheel: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
  },
  resultContainer: {
    height: 36,
    justifyContent: 'center',
  },
  resultText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#E91E8C',
  },
  hint: {
    fontSize: 15,
    color: '#888',
  },
  button: {
    backgroundColor: '#E91E8C',
    paddingHorizontal: 52,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
