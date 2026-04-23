import React, { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import ScreenLogo from '../components/ScreenLogo';
import { AppTextInput, type AppTextInputRef } from '../components/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { scale, CONTENT_MAX_WIDTH } from '../utils/responsive';
import { useSession } from '../context/SessionContext';
import { useKeyboard, KeyboardArea } from '../context/KeyboardContext';
import type { ScreenProps } from '../types/navigation';
import { navigateToNextBlock } from '../navigation/flowNavigation';
import { REGISTRATION_FIELDS, MASKS } from '../config/registration';
import { CONTENT } from '../config/content';

export default function RegisterScreen({ navigation }: ScreenProps<'Register'>) {
  const session = useSession();
  const keyboard = useKeyboard();

  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(REGISTRATION_FIELDS.map((f) => [f.id, ''])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const formContainerY = useRef(0);
  const fieldRefs = useRef<Record<string, AppTextInputRef | null>>(
    Object.fromEntries(REGISTRATION_FIELDS.map((f) => [f.id, null])),
  );

  const setValue = (id: string, value: string) => setValues((prev) => ({ ...prev, [id]: value }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    for (const field of REGISTRATION_FIELDS) {
      const error = field.validate?.(values[field.id] ?? '');
      if (error) e[field.id] = error;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    if (await session.isDuplicateRegistered(values)) {
      const uniqueField = REGISTRATION_FIELDS.find((f) => f.unique);
      if (uniqueField) setErrors({ [uniqueField.id]: `${uniqueField.label} já cadastrado` });
      setSubmitting(false);
      return;
    }

    const normalizedFields = Object.fromEntries(
      REGISTRATION_FIELDS.map((f) => [f.id, (values[f.id] ?? '').trim()]),
    );

    await session.recordRegistration({
      fields: normalizedFields,
      submittedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    navigateToNextBlock('register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ScreenLogo size="large" />
        </View>

        <View
          style={styles.form}
          onLayout={(e) => {
            formContainerY.current = e.nativeEvent.layout.y;
          }}
        >
          {REGISTRATION_FIELDS.map((field, index) => {
            const isLast = index === REGISTRATION_FIELDS.length - 1;
            const nextField = REGISTRATION_FIELDS[index + 1];

            const sharedProps = {
              label: field.label,
              value: values[field.id] ?? '',
              mode: field.mode,
              placeholder: field.placeholder,
              error: errors[field.id],
              scrollRef,
              scrollContainerY: formContainerY,
              returnLabel: isLast ? 'Pronto' : undefined,
              onSubmit: isLast
                ? () => {
                    keyboard.dismiss();
                    handleSubmit();
                  }
                : () => {
                    fieldRefs.current[nextField.id]?.focus();
                  },
            } as const;

            if (field.mask) {
              const applyMask = MASKS[field.mask];
              return (
                <AppTextInput
                  key={field.id}
                  ref={(r) => {
                    fieldRefs.current[field.id] = r;
                  }}
                  {...sharedProps}
                  onKey={(k) =>
                    setValue(
                      field.id,
                      k === 'BACKSPACE'
                        ? applyMask((values[field.id] ?? '').replace(/\D/g, '').slice(0, -1))
                        : applyMask((values[field.id] ?? '') + k),
                    )
                  }
                />
              );
            }

            return (
              <AppTextInput
                key={field.id}
                ref={(r) => {
                  fieldRefs.current[field.id] = r;
                }}
                {...sharedProps}
                onChangeText={(v) => setValue(field.id, v)}
              />
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.85 },
            submitting && { opacity: 0.6 },
          ]}
          onPress={() => {
            keyboard.dismiss();
            handleSubmit();
          }}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>
            {submitting ? CONTENT.register.submitLoadingCta : CONTENT.register.submitCta}
          </Text>
        </Pressable>
      </ScrollView>
      <KeyboardArea />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: scale(32),
    paddingVertical: scale(20),
    gap: scale(24),
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
  },
  form: {
    gap: scale(20),
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: scale(32),
    paddingVertical: scale(18),
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.35,
    shadowRadius: scale(12),
    elevation: 8,
  },
  submitBtnText: {
    color: Colors.text,
    fontSize: scale(18),
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});
