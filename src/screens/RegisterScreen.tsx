import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import ScreenLogo from "../components/ScreenLogo";
import { AppTextInput, type AppTextInputRef } from "../components/AppTextInput";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "../constants/colors";
import { scale, W } from "../utils/responsive";
import { useSession } from "../context/SessionContext";
import { useKeyboard, KeyboardArea } from "../context/KeyboardContext";
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
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 7)}-${d.slice(7)}`;
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function RegisterScreen({ navigation }: ScreenProps<"Register">) {
  const session = useSession();
  const keyboard = useKeyboard();

  const [name, setName] = useState("");
  const [cpf, setCpf] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [errors, setErrors] = useState<Partial<Record<"name" | "cpf" | "email" | "phone", string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  const formContainerY = useRef(0);
  const cpfRef = useRef<AppTextInputRef>(null);
  const emailRef = useRef<AppTextInputRef>(null);
  const phoneRef = useRef<AppTextInputRef>(null);

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!name.trim()) e.name = "Nome obrigatório";
    if (cpf.replace(/\D/g, "").length !== 11) e.cpf = "CPF inválido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) e.email = "E-mail inválido";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "Telefone inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    if (await session.isCpfRegistered(cpf)) {
      setErrors({ cpf: "CPF já cadastrado" });
      setSubmitting(false);
      return;
    }
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
      <KeyboardArea />
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
          onLayout={(e) => { formContainerY.current = e.nativeEvent.layout.y; }}
        >
          <AppTextInput
            label="Nome completo"
            value={name}
            onChangeText={setName}
            mode="alpha"
            placeholder="Seu nome"
            error={errors.name}
            scrollRef={scrollRef}
            scrollContainerY={formContainerY}
            onSubmit={() => cpfRef.current?.focus()}
          />
          <AppTextInput
            ref={cpfRef}
            label="CPF"
            value={cpf}
            onKey={(k) => setCpf((v) => k === "BACKSPACE" ? maskCPF(v.replace(/\D/g, "").slice(0, -1)) : maskCPF(v + k))}
            mode="numeric"
            placeholder="000.000.000-00"
            error={errors.cpf}
            scrollRef={scrollRef}
            scrollContainerY={formContainerY}
            onSubmit={() => emailRef.current?.focus()}
          />
          <AppTextInput
            ref={emailRef}
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            mode="email"
            placeholder="seu@email.com"
            error={errors.email}
            scrollRef={scrollRef}
            scrollContainerY={formContainerY}
            onSubmit={() => phoneRef.current?.focus()}
          />
          <AppTextInput
            ref={phoneRef}
            label="Telefone"
            value={phone}
            onKey={(k) => setPhone((v) => k === "BACKSPACE" ? maskPhone(v.replace(/\D/g, "").slice(0, -1)) : maskPhone(v + k))}
            mode="numeric"
            placeholder="11 99999-9999"
            error={errors.phone}
            returnLabel="Pronto"
            scrollRef={scrollRef}
            scrollContainerY={formContainerY}
            onSubmit={() => { keyboard.dismiss(); handleSubmit(); }}
          />
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.submitBtn,
            pressed && { opacity: 0.85 },
            submitting && { opacity: 0.6 },
          ]}
          onPress={() => { keyboard.dismiss(); handleSubmit(); }}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>{submitting ? "Salvando..." : "Continuar →"}</Text>
        </Pressable>
      </ScrollView>
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
    justifyContent: "center",
    paddingHorizontal: scale(32),
    paddingVertical: scale(20),
    gap: scale(24),
    maxWidth: W * 0.85,
    width: "100%",
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
  },
  form: {
    gap: scale(20),
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
