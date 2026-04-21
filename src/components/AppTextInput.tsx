import React, { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { useKeyboard } from '../context/KeyboardContext';
import type { KeyboardMode } from '../components/AppKeyboard';
import { Colors } from '../constants/colors';
import { scale } from '../utils/responsive';

export interface AppTextInputRef {
  focus: () => void;
  blur: () => void;
}

export interface AppTextInputProps {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  onKey?: (key: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  onLayout?: (y: number) => void;
  mode?: KeyboardMode;
  placeholder?: string;
  error?: string;
  returnLabel?: string;
}

function BlinkingCursor() {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 0, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);
  return <Animated.View style={[styles.cursor, { opacity }]} />;
}

export const AppTextInput = forwardRef<AppTextInputRef, AppTextInputProps>(
  ({ label, value, onChangeText, onKey, onSubmit, onFocus, onLayout, mode = 'alpha', placeholder, error, returnLabel }, ref) => {
    const keyboard = useKeyboard();
    const id = useRef(Math.random().toString(36)).current;
    const isActive = keyboard.activeId === id;

    // Stable refs so closures stored in context always call the latest handlers
    const valueRef = useRef(value);
    const onKeyRef = useRef(onKey);
    const onChangeTextRef = useRef(onChangeText);
    const onSubmitRef = useRef(onSubmit);
    const onFocusRef = useRef(onFocus);
    valueRef.current = value;
    onKeyRef.current = onKey;
    onChangeTextRef.current = onChangeText;
    onSubmitRef.current = onSubmit;
    onFocusRef.current = onFocus;

    const focus = () => {
      onFocusRef.current?.();
      keyboard.show(id, {
        mode: mode ?? 'alpha',
        returnLabel,
        onSubmit: () => onSubmitRef.current?.(),
        onKey: (k: string) => {
          if (onKeyRef.current) {
            // Custom handler (e.g. masked fields)
            onKeyRef.current(k);
          } else {
            // Default: simple append / backspace via onChangeText
            const setter = onChangeTextRef.current;
            if (!setter) return;
            if (k === 'BACKSPACE') setter(valueRef.current.slice(0, -1));
            else setter(valueRef.current + k);
          }
        },
      });
    };

    useImperativeHandle(ref, () => ({
      focus,
      blur: keyboard.dismiss,
    }));

    return (
      <Pressable
        style={styles.wrapper}
        onPress={focus}
        onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
      >
        <Text style={styles.label}>{label}</Text>
        <View style={[styles.input, isActive && styles.inputFocused, !!error && styles.inputError]}>
          <Text style={[styles.inputText, !value && styles.placeholder]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          {isActive && <BlinkingCursor />}
        </View>
        {!!error && <Text style={styles.errorText}>{error}</Text>}
      </Pressable>
    );
  },
);

const styles = StyleSheet.create({
  wrapper: {
    gap: scale(6),
  },
  label: {
    fontSize: scale(13),
    fontWeight: '600',
    color: Colors.text,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    gap: scale(2),
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputText: {
    flex: 1,
    fontSize: scale(16),
    color: Colors.text,
  },
  placeholder: {
    color: Colors.textSecondary,
  },
  cursor: {
    width: scale(2),
    height: scale(20),
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
  errorText: {
    fontSize: scale(12),
    color: Colors.error,
  },
});
