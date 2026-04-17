import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { INACTIVITY_CONFIG, DEFAULT_TIMEOUT } from '../config/inactivity';
import { navigationRef } from '../navigation/navigationRef';
import { Colors } from '../constants/colors';
import { SessionService } from '../services/SessionService';

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

  return (
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
    padding: 32,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 48,
    paddingHorizontal: 40,
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: 380,
  },
  cardEmoji: {
    fontSize: 56,
  },
  cardTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  cardCountdown: {
    fontSize: 80,
    fontWeight: 'bold',
    color: Colors.primary,
    lineHeight: 90,
  },
  cardMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingHorizontal: 48,
    paddingVertical: 16,
    borderRadius: 32,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonText: {
    color: Colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
