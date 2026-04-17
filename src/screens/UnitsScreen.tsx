import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { scale, W } from "../utils/responsive";
import ScreenLogo from "../components/ScreenLogo";
import VideoModal from "../components/VideoModal";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import type { ScreenProps } from "../types/navigation";
import { useSession } from "../context/SessionContext";

const UNITS = [
  {
    id: "analia",
    name: "Unidade Anália Franco",
    address: "Shopping Anália Franco — R. Funchal, 400, Jd. Paulistano",
    video: require("../assets/analia-franco.mp4"),
  },
  {
    id: "paulista",
    name: "Unidade Paulista",
    address: "Av. Paulista, 1578 — Bela Vista, São Paulo",
    video: require("../assets/paulista.mp4"),
  },
];

export default function UnitsScreen({
  navigation,
  route,
}: ScreenProps<"Units">) {
  const session = useSession();
  const fromQuiz = route.params?.fromQuiz ?? false;
  const [activeVideo, setActiveVideo] = useState<number | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <ScreenLogo size="small" />

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Nossas unidades</Text>
          <View style={styles.units}>
            {UNITS.map((unit) => (
              <View key={unit.id} style={styles.unitRow}>
                <View style={styles.unitInfo}>
                  <Text style={styles.unitName}>{unit.name}</Text>
                  <Text style={styles.unitAddress}>{unit.address}</Text>
                </View>
                <Pressable
                  style={({ pressed }) => [
                    styles.videoButton,
                    pressed && styles.pressed,
                  ]}
                  onPress={() => {
                    session.recordUnitOpened(unit.id, unit.name);
                    setActiveVideo(unit.video);
                  }}
                >
                  <Text style={styles.videoButtonText}>Assista ao vídeo</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.bottom}>
          <Pressable
            style={({ pressed }) => [
              styles.skipButton,
              pressed && styles.pressed,
            ]}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.skipButtonText}>
              {fromQuiz ? "Pular e finalizar." : "Voltar"}
            </Text>
          </Pressable>
        </View>
      </View>

      {activeVideo !== null && (
        <VideoModal
          visible
          source={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      )}
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
    width: "100%",
    maxWidth: W * 0.85,
    alignSelf: "center",
    paddingHorizontal: scale(24),
    justifyContent: "center",
    gap: scale(24),
    paddingVertical: scale(24),
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: scale(20),
    padding: scale(20),
    gap: scale(16),
  },
  cardHeader: {
    fontSize: scale(14),
    color: Colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  units: {
    gap: scale(12),
  },
  unitRow: {
    backgroundColor: Colors.background,
    borderRadius: scale(16),
    padding: scale(20),
    gap: scale(16),
  },
  unitInfo: {
    gap: scale(4),
  },
  unitName: {
    fontSize: scale(20),
    fontWeight: "bold",
    color: Colors.text,
  },
  unitAddress: {
    fontSize: scale(14),
    color: Colors.textSecondary,
    lineHeight: scale(20),
  },
  videoButton: {
    backgroundColor: Colors.primary,
    borderRadius: scale(50),
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(8),
    elevation: 6,
  },
  videoButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: scale(15),
  },
  bottom: {},
  skipButton: {
    backgroundColor: Colors.primary,
    borderRadius: scale(50),
    paddingVertical: scale(20),
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.5,
    shadowRadius: scale(16),
    elevation: 10,
  },
  skipButtonText: {
    color: "#ffffff",
    fontSize: scale(18),
    fontWeight: "bold",
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
