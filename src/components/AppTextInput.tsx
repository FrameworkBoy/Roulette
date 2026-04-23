import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useKeyboard } from '../context/KeyboardContext';
import type { KeyboardMode } from '../components/AppKeyboard';
import { Colors } from '../constants/colors';
import { scale } from '../utils/responsive';
import { APP_CONFIG } from '../config/app';

export interface AppTextInputRef {
  focus: () => void;
  blur: () => void;
}

export interface AppTextInputProps {
  label: string;
  value: string;
  // Simple text fields: provide onChangeText. Append/backspace is handled automatically.
  onChangeText?: (v: string) => void;
  // Masked fields (CPF, phone): provide onKey for full control over each keystroke.
  onKey?: (key: string) => void;
  onSubmit?: () => void;
  onFocus?: () => void;
  // Pass the parent ScrollView ref and the field will scroll itself into view when focused.
  scrollRef?: React.RefObject<ScrollView | null>;
  // Y offset of this field's container within the ScrollView (use a ref so it's always current).
  // In the screen, add onLayout to the container View and store e.nativeEvent.layout.y here.
  scrollContainerY?: React.RefObject<number>;
  // Focus this field as soon as it mounts.
  autoFocus?: boolean;
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
  (
    {
      label,
      value,
      onChangeText,
      onKey,
      onSubmit,
      onFocus,
      scrollRef,
      scrollContainerY,
      autoFocus = false,
      mode = 'alpha',
      placeholder,
      error,
      returnLabel,
    },
    ref,
  ) => {
    const keyboard = useKeyboard();
    const id = useId();
    const isActive = keyboard.activeId === id;

    const ownY = useRef(0);
    const nativeRef = useRef<TextInput>(null);

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

    const scrollIntoView = () => {
      const sv = scrollRef?.current;
      if (!sv) return;
      const y = (scrollContainerY?.current ?? 0) + ownY.current;
      setTimeout(() => {
        sv.scrollTo({ y: Math.max(0, y - scale(24)), animated: true });
      }, 50);
    };

    const focus = () => {
      onFocusRef.current?.();
      scrollIntoView();
      keyboard.show(id, {
        mode,
        returnLabel,
        onSubmit: () => onSubmitRef.current?.(),
        onKey: (k: string) => {
          if (onKeyRef.current) {
            onKeyRef.current(k);
          } else {
            const setter = onChangeTextRef.current;
            if (!setter) return;
            if (k === 'BACKSPACE') setter(valueRef.current.slice(0, -1));
            else setter(valueRef.current + k);
          }
        },
      });
    };

    useImperativeHandle(ref, () =>
      APP_CONFIG.virtualKeyboard
        ? { focus, blur: keyboard.dismiss }
        : { focus: () => nativeRef.current?.focus(), blur: () => nativeRef.current?.blur() },
    );

    useEffect(() => {
      if (autoFocus) {
        const t = setTimeout(focus, 150);
        return () => clearTimeout(t);
      }
    }, []);

    if (!APP_CONFIG.virtualKeyboard) {
      const handleNativeChange = (text: string) => {
        if (onKeyRef.current) {
          const prevDigits = valueRef.current.replace(/\D/g, '');
          const newDigits = text.replace(/\D/g, '');
          if (newDigits.length > prevDigits.length) {
            for (const ch of newDigits.slice(prevDigits.length)) onKeyRef.current(ch);
          } else if (newDigits.length < prevDigits.length) {
            const count = prevDigits.length - newDigits.length;
            for (let i = 0; i < count; i++) onKeyRef.current('BACKSPACE');
          }
        } else {
          onChangeTextRef.current?.(text);
        }
      };

      return (
        <View style={styles.wrapper}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            ref={nativeRef}
            style={[styles.input, styles.nativeInput, !!error && styles.inputError]}
            value={value}
            onChangeText={handleNativeChange}
            onSubmitEditing={onSubmit}
            placeholder={placeholder}
            placeholderTextColor={Colors.textSecondary}
            autoCapitalize={mode === 'alpha' ? 'words' : 'none'}
            keyboardType={mode === 'numeric' ? 'number-pad' : 'default'}
            returnKeyType="next"
            autoFocus={autoFocus}
          />
          {!!error && <Text style={styles.errorText}>{error}</Text>}
        </View>
      );
    }

    return (
      <Pressable
        style={styles.wrapper}
        onPress={focus}
        onLayout={(e) => {
          ownY.current = e.nativeEvent.layout.y;
        }}
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
  nativeInput: {
    color: Colors.text,
    fontSize: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  inputText: {
    flexShrink: 1,
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
