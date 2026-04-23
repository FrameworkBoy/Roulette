import React, { useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path, G, Text as SvgText } from 'react-native-svg';
import { PRIZES, PRIZE_SYSTEM_CONFIG, WHEEL_SLOTS } from '../config/prizes';
import type { Prize } from '../config/prizes';
import { PrizeService } from '../services/PrizeService';
import { Colors } from '../constants/colors';
import { scale } from '../utils/responsive';

type SlotConfig = {
  prize: Prize;
  color: string;
};

type Props = {
  slots?: SlotConfig[];
  size?: number;
  onSpinComplete?: (prize: Prize) => void;
};

const SPIN_DURATION = 4000;
const FULL_SPINS = 5;

const DEFAULT_COLORS = [
  Colors.primary,
  Colors.surface,
  Colors.primaryDark,
  Colors.border,
  Colors.primary,
  Colors.surface,
  Colors.primaryDark,
  Colors.border,
];

const DEFAULT_SLOTS: SlotConfig[] = WHEEL_SLOTS.map((slot, i) => ({
  prize: PRIZES.find((p) => p.id === slot.prizeId)!,
  color: DEFAULT_COLORS[i % DEFAULT_COLORS.length],
}));

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function segmentPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y} Z`;
}

export default function RouletteCode({ slots = DEFAULT_SLOTS, size = 300, onSpinComplete }: Props) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const totalRotation = useRef(0);

  const rotateInterp = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const segmentAngle = 360 / slots.length;

  const spinToIndex = (index: number, prize: Prize) => {
    const centerAngle = index * segmentAngle + segmentAngle / 2;
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
    await PrizeService.consumePrize(prize.id);

    const index = slots.findIndex((s) => s.prize.id === prize.id);
    const targetIndex = index >= 0 ? index : 0;

    setIsSelecting(false);
    setIsSpinning(true);
    spinToIndex(targetIndex, prize);
  };

  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;
  const isNoPrize = result?.id === PRIZE_SYSTEM_CONFIG.noPrizeId;
  const busy = isSpinning || isSelecting || result !== null;

  return (
    <View style={styles.container}>
      <View style={[styles.wheelWrapper, { width: size, height: size }]}>
        <View style={styles.pointerContainer}>
          <View style={styles.pointer} />
        </View>

        <Animated.View style={{ transform: [{ rotate: rotateInterp }] }}>
          <Svg width={size} height={size}>
            <G>
              {slots.map((slot, i) => {
                const startAngle = i * segmentAngle;
                const endAngle = startAngle + segmentAngle;
                const midAngle = startAngle + segmentAngle / 2;
                const labelR = r * 0.52;
                const labelPos = polarToCartesian(cx, cy, labelR, midAngle);
                const baseFontSize = size * 0.038;
                // radial space available from center circle (r=20) to outer rim
                const maxTextWidth = 2 * (labelR - 20);
                // bold char ≈ 0.6× font size; scale down if label is too long
                const fontSize = Math.min(
                  baseFontSize,
                  maxTextWidth / (slot.prize.label.length * 0.6),
                );

                return (
                  <G key={slot.prize.id + i}>
                    <Path
                      d={segmentPath(cx, cy, r, startAngle, endAngle)}
                      fill={slot.color}
                      stroke="#0A0A0A"
                      strokeWidth={2}
                    />
                    <SvgText
                      x={labelPos.x}
                      y={labelPos.y}
                      fill="#ffffff"
                      fontSize={fontSize}
                      fontWeight="bold"
                      textAnchor="middle"
                      alignmentBaseline="middle"
                      rotation={midAngle - 90}
                      origin={`${labelPos.x}, ${labelPos.y}`}
                    >
                      {slot.prize.label}
                    </SvgText>
                  </G>
                );
              })}
            </G>
            {/* Center circle */}
            <Path
              d={`M ${cx} ${cy} m -20 0 a 20 20 0 1 0 40 0 a 20 20 0 1 0 -40 0`}
              fill={Colors.primary}
            />
          </Svg>
        </Animated.View>
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
    gap: scale(32),
  },
  wheelWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointerContainer: {
    position: 'absolute',
    top: -scale(36),
    zIndex: 10,
    alignItems: 'center',
    // @ts-expect-error - web only
    filter: 'drop-shadow(0px 0px 18px white) drop-shadow(0px 0px 8px white)',
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: scale(36),
    borderRightWidth: scale(36),
    borderTopWidth: scale(64),
    borderStyle: 'solid',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#ffffff',
  },
  resultContainer: {
    height: scale(36),
    justifyContent: 'center',
  },
  resultText: {
    fontSize: scale(20),
    fontWeight: 'bold',
    color: Colors.primary,
    textAlign: 'center',
  },
  resultNoPrize: {
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: scale(15),
    color: Colors.textSecondary,
  },
  button: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(52),
    paddingVertical: scale(16),
    borderRadius: scale(32),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(8),
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: Colors.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonPressed: { opacity: 0.85 },
  buttonText: {
    color: Colors.text,
    fontSize: scale(18),
    fontWeight: 'bold',
    letterSpacing: 3,
  },
});
