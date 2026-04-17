import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { PRIZE_SYSTEM_CONFIG } from '../config/prizes';
import type { Prize } from '../config/prizes';
import { PrizeService } from '../services/PrizeService';
import { Colors } from '../constants/colors';

type Props = {
  onSpinComplete?: (prize: Prize) => void;
};

const WHEEL_SIZE = 300;
const SPIN_DURATION = 4000;
const FULL_SPINS = 5;

export default function Roulette({ onSpinComplete }: Props = {}) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const totalRotation = useRef(0);

  const rotateInterp = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const spinToAngle = (centerAngle: number, prize: Prize) => {
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

  const handleSpin = async () => {
    if (isSpinning || isSelecting) return;
    setIsSelecting(true);
    setResult(null);

    const prize = await PrizeService.selectPrize();
    const slot = PrizeService.getSlotForPrize(prize.id);
    const centerAngle = (slot.startAngle + slot.endAngle) / 2;

    await PrizeService.consumePrize(prize.id);

    setIsSelecting(false);
    setIsSpinning(true);
    spinToAngle(centerAngle, prize);
  };

  const isNoPrize = result?.id === PRIZE_SYSTEM_CONFIG.noPrizeId;
  const busy = isSpinning || isSelecting;

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
          <Text style={[styles.resultText, isNoPrize && styles.resultNoPrize]}>
            {isNoPrize ? result.label : `Parabéns! ${result.label}`}
          </Text>
        ) : (
          <Text style={styles.hint}>
            {isSelecting ? 'Sorteando...' : isSpinning ? 'Boa sorte...' : 'Pressione GIRAR!'}
          </Text>
        )}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.button,
          busy && styles.buttonDisabled,
          pressed && !busy && styles.buttonPressed,
        ]}
        onPress={handleSpin}
        disabled={busy}
      >
        <Text style={styles.buttonText}>
          {isSelecting ? '...' : isSpinning ? 'Girando...' : 'GIRAR'}
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
    borderTopColor: Colors.primary,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  resultNoPrize: {
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 52,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
