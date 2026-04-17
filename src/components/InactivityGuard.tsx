import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { INACTIVITY_CONFIG, DEFAULT_TIMEOUT } from '../config/inactivity';
import { navigationRef } from '../navigation/navigationRef';
import { Colors } from '../constants/colors';
import { SessionService } from '../services/SessionService';
import { InactivityProvider } from '../context/InactivityContext';
import { scale, W } from '../utils/responsive';

type Props = {
  children: React.ReactNode;
};

export default function InactivityGuard({ children }: Props) {
  const [showWarning, setShowWarning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const clearAllTimers = () => {
    clearTimeout(idleTimer.current);
    clearInterval(countdownInterval.current);
  };

  const resetToHome = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    fadeAnim.setValue(0);
    SessionService.recordInactivityReset();
    if (navigationRef.isReady()) {
      navigationRef.navigate('Home');
    }
  }, [fadeAnim]);

  const startCountdown = useCallback(
    (seconds: number) => {
      SessionService.recordInactivityWarning();
      setCountdown(seconds);
      setShowWarning(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }).start();

      let remaining = seconds;
      countdownInterval.current = setInterval(() => {
        remaining -= 1;
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(countdownInterval.current);
          resetToHome();
        }
      }, 1000);
    },
    [fadeAnim, resetToHome],
  );

  const scheduleIdle = useCallback(() => {
    clearAllTimers();
    const routeName = navigationRef.isReady()
      ? (navigationRef.getCurrentRoute()?.name ?? '')
      : '';
    const config = INACTIVITY_CONFIG[routeName] ?? DEFAULT_TIMEOUT;
    const warningSeconds = Math.round(config.warningMs / 1000);
    const idleMs = config.timeoutMs - config.warningMs;

    if (config.disabled) return;

    idleTimer.current = setTimeout(() => {
      startCountdown(warningSeconds);
    }, idleMs);
  }, [startCountdown]);

  const handleActivity = useCallback(() => {
    if (showWarning) {
      // Dismiss warning and restart timer
      clearAllTimers();
      setShowWarning(false);
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
    scheduleIdle();
  }, [showWarning, fadeAnim, scheduleIdle]);

  // Start timer on mount and re-schedule on route changes
  useEffect(() => {
    scheduleIdle();
    const unsubscribe = navigationRef.addListener('state', scheduleIdle);
    return () => {
      clearAllTimers();
      unsubscribe();
    };
  }, [scheduleIdle]);

  const controls = { pause: clearAllTimers, resume: scheduleIdle };

  return (
    <InactivityProvider value={controls}>
    <View style={styles.root} onTouchStart={handleActivity}>
      {children}

      <Modal visible={showWarning} transparent animationType="none" statusBarTranslucent>
        <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
          <View style={styles.card}>
            <Text style={styles.cardEmoji}>👋</Text>
            <Text style={styles.cardTitle}>Você ainda está aí?</Text>
            <Text style={styles.cardCountdown}>{countdown}</Text>
            <Text style={styles.cardMessage}>
              Voltando ao início em {countdown} segundo{countdown !== 1 ? 's' : ''}...
            </Text>
            <Pressable
              style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
              onPress={handleActivity}
            >
              <Text style={styles.buttonText}>Continuar</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Modal>
    </View>
    </InactivityProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(32),
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: scale(24),
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: scale(48),
    paddingHorizontal: scale(40),
    alignItems: 'center',
    gap: scale(12),
    width: '100%',
    maxWidth: W * 0.75,
  },
  cardEmoji: {
    fontSize: scale(56),
  },
  cardTitle: {
    fontSize: scale(28),
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  cardCountdown: {
    fontSize: scale(80),
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: scale(90),
  },
  cardMessage: {
    fontSize: scale(16),
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: scale(8),
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(48),
    paddingVertical: scale(16),
    borderRadius: scale(32),
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.4,
    shadowRadius: scale(8),
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: Colors.text,
    fontSize: scale(18),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
