import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import ScreenLogo from "../components/ScreenLogo";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { scale, W } from "../utils/responsive";
import { useSession } from "../context/SessionContext";
import type { ScreenProps } from "../types/navigation";

// ─── Masks ────────────────────────────────────────────────────────────────────

function maskCPF(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9, 11)}`;
}

function maskPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 13);
  if (d.length <= 2) return d.length ? `+${d}` : "";
  if (d.length <= 4) return `+${d.slice(0, 2)} ${d.slice(2)}`;
  if (d.length <= 9) return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4)}`;
  return `+${d.slice(0, 2)} ${d.slice(2, 4)} ${d.slice(4, 9)}-${d.slice(9)}`;
}

// ─── Field component ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  error,
  onSubmitEditing,
  inputRef,
  returnKeyType = "next",
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  keyboardType?: React.ComponentProps<typeof TextInput>["keyboardType"];
  error?: string;
  onSubmitEditing?: () => void;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: React.ComponentProps<typeof TextInput>["returnKeyType"];
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        ref={inputRef}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textSecondary}
        keyboardType={keyboardType}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegisterScreen({
  navigation,
}: ScreenProps<"Register">) {
  const session = useSession();

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<
    Partial<Record<"name" | "cpf" | "email" | "phone", string>>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const cpfRef = useRef<TextInput>(null);
  const emailRef = useRef<TextInput>(null);
  const phoneRef = useRef<TextInput>(null);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    const cpfDigits = cpf.replace(/\D/g, "");
    if (cpfDigits.length !== 11) e.cpf = "CPF inválido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "E-mail inválido";
    const phoneDigits = phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) e.phone = "Telefone inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await session.recordRegistration({
      name: name.trim(),
      cpf,
      email: email.trim().toLowerCase(),
      phone,
      submittedAt: new Date().toISOString(),
    });
    setSubmitting(false);
    navigation.navigate("Quiz");
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <ScreenLogo size="large" />
          </View>

          <View style={styles.form}>
            <Field
              label="Nome completo"
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              keyboardType="default"
              error={errors.name}
              onSubmitEditing={() => cpfRef.current?.focus()}
            />
            <Field
              label="CPF"
              value={cpf}
              onChangeText={(v) => setCpf(maskCPF(v))}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              error={errors.cpf}
              inputRef={cpfRef}
              onSubmitEditing={() => emailRef.current?.focus()}
            />
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              keyboardType="email-address"
              error={errors.email}
              inputRef={emailRef}
              onSubmitEditing={() => phoneRef.current?.focus()}
            />
            <Field
              label="Telefone"
              value={phone}
              onChangeText={(v) => setPhone(maskPhone(v))}
              placeholder="+55 11 99999-9999"
              keyboardType="phone-pad"
              error={errors.phone}
              inputRef={phoneRef}
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.submitBtn,
              pressed && { opacity: 0.85 },
              submitting && { opacity: 0.6 },
            ]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? "Salvando..." : "Continuar →"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: scale(32),
    paddingVertical: scale(20),
    gap: scale(10),
    maxWidth: W * 0.85,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    gap: scale(8),
  },
  form: {
    gap: scale(20),
  },
  fieldWrapper: {
    gap: scale(6),
  },
  fieldLabel: {
    fontSize: scale(13),
    fontWeight: "600",
    color: Colors.text,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: scale(16),
    color: Colors.text,
  },
  inputFocused: {
    borderColor: Colors.primary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  fieldError: {
    fontSize: scale(12),
    color: Colors.error,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: scale(32),
    paddingVertical: scale(18),
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.35,
    shadowRadius: scale(12),
    elevation: 8,
  },
  submitBtnText: {
    color: Colors.text,
    fontSize: scale(18),
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
