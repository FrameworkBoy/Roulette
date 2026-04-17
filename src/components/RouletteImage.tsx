import React, { useRef, useState } from "react";
import {
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  Text,
  View,
  ImageSourcePropType,
} from "react-native";
import { PRIZE_SYSTEM_CONFIG, WHEEL_SLOTS } from "../config/prizes";
import type { Prize } from "../config/prizes";
import { PrizeService } from "../services/PrizeService";
import { Colors } from "../constants/colors";
import { scale } from "../utils/responsive";

type Props = {
  image: ImageSourcePropType;
  size?: number;
  onSpinComplete?: (prize: Prize) => void;
};

const SPIN_DURATION = 4000;
const FULL_SPINS = 5;

export default function RouletteImage({
  image,
  size = 300,
  onSpinComplete,
}: Props) {
  const [isSpinning, setIsSpinning] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);
  const spinValue = useRef(new Animated.Value(0)).current;
  const totalRotation = useRef(0);

  const rotateInterp = spinValue.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  const spinToAngle = (centerAngle: number, prize: Prize) => {
    const currentMod = totalRotation.current % 360;
    const diff = (centerAngle - currentMod + 360) % 360;
    const target =
      totalRotation.current + FULL_SPINS * 360 + (diff === 0 ? 360 : diff);
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
    const slot =
      WHEEL_SLOTS.find((s) => s.prizeId === prize.id) ?? WHEEL_SLOTS[0];
    const centerAngle = (slot.startAngle + slot.endAngle) / 2;

    await PrizeService.consumePrize(prize.id);
    setIsSelecting(false);
    setIsSpinning(true);
    spinToAngle(centerAngle, prize);
  };

  const isNoPrize = result?.id === PRIZE_SYSTEM_CONFIG.noPrizeId;
  const busy = isSpinning || isSelecting || result !== null;

  return (
    <View style={styles.container}>
      <View style={[styles.wheelWrapper, { width: size, height: size }]}>
        <View style={styles.pointerContainer}>
          <View style={styles.pointer} />
        </View>
        <Animated.Image
          source={image}
          style={[
            styles.wheel,
            { width: size, height: size },
            { transform: [{ rotate: rotateInterp }] },
          ]}
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
            {isSelecting
              ? "Sorteando..."
              : isSpinning
                ? "Boa sorte..."
                : "Pressione GIRAR!"}
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
          {isSelecting ? "..." : isSpinning ? "Girando..." : "GIRAR"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: scale(32),
  },
  wheelWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  pointerContainer: {
    position: "absolute",
    top: -scale(15),
    zIndex: 10,
    alignItems: "center",
    // @ts-ignore - web only
    filter: "drop-shadow(0px 0px 18px white) drop-shadow(0px 0px 8px white)",
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: scale(16),
    borderRightWidth: scale(16),
    borderTopWidth: scale(30),
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#ffffff",
  },
  wheel: {},
  resultContainer: {
    height: scale(36),
    justifyContent: "center",
  },
  resultText: {
    fontSize: scale(20),
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
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
    fontWeight: "bold",
    letterSpacing: 3,
  },
});
