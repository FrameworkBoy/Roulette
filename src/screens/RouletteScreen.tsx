import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import ScreenLogo from '../components/ScreenLogo';
import { scale, vw, vh, MODAL_MAX_WIDTH } from '../utils/responsive';

import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import RouletteCode from '../components/RouletteCode';
import type { ScreenProps } from '../types/navigation';
import { useSession } from '../context/SessionContext';
import { navigateToNextBlock } from '../navigation/flowNavigation';
import type { Prize } from '../config/prizes';
import { PRIZE_SYSTEM_CONFIG } from '../config/prizes';
import { CONTENT } from '../config/content';

export default function RouletteScreen(_: ScreenProps<'RouletteGame'>) {
  const [prize, setPrize] = useState<Prize | null>(null);
  const session = useSession();

  useEffect(() => {
    session.recordRouletteView();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ScreenLogo size="small" />

        <RouletteCode
          size={Math.min(vw(75), vh(52))}
          onSpinComplete={(p: Prize) => {
            session.recordRouletteSpin({
              prizeId: p.id,
              prizeLabel: p.label,
              spunAt: new Date().toISOString(),
            });
            setPrize(p);
          }}
        />
      </View>

      <Modal visible={prize !== null} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {prize && prize.id === PRIZE_SYSTEM_CONFIG.noPrizeId ? (
              <>
                <Text style={styles.modalTitle}>{CONTENT.roulette.noPrizeTitle}</Text>
                <Text style={styles.modalBody}>{prize.label}</Text>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>{CONTENT.roulette.winTitle}</Text>
                <Text style={styles.modalBody}>
                  {CONTENT.roulette.winBody.replace('{prize}', prize?.label ?? '')}
                </Text>
              </>
            )}
            <Pressable
              style={({ pressed }) => [styles.modalButton, pressed && styles.pressed]}
              onPress={() => {
                setPrize(null);
                navigateToNextBlock('roulette');
              }}
            >
              <Text style={styles.modalButtonText}>{CONTENT.roulette.continueCta}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: scale(24),
    gap: scale(24),
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
  },
  modal: {
    width: '100%',
    maxWidth: MODAL_MAX_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: scale(24),
    padding: scale(36),
    alignItems: 'center',
    gap: scale(20),
  },
  modalTitle: {
    fontSize: scale(28),
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: scale(18),
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: scale(28),
  },
  modalButton: {
    backgroundColor: Colors.primary,
    borderRadius: scale(50),
    paddingVertical: scale(18),
    paddingHorizontal: scale(40),
    alignItems: 'center',
    width: '100%',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.5,
    shadowRadius: scale(16),
    elevation: 10,
  },
  modalButtonText: {
    color: Colors.textOnPrimary,
    fontSize: scale(18),
    fontWeight: 'bold',
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.97 }],
  },
});
