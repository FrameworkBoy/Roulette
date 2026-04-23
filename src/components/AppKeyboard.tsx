import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors } from '../constants/colors';
import { scale } from '../utils/responsive';

export type KeyboardMode = 'alpha' | 'numeric';

interface AppKeyboardProps {
  visible: boolean;
  mode?: KeyboardMode;
  onKey: (key: string) => void;
  onSubmit: () => void;
  returnLabel?: string;
}

const R1 = ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'];
const R2 = ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'];
const R3 = ['z', 'x', 'c', 'v', 'b', 'n', 'm'];

const NUM_R1 = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
const NUM_R2 = ['-', '/', ':', ';', '(', ')', '$', '&', '@'];
const NUM_R3 = ['.', ',', '?', '!', "'"];

const SYM_R1 = ['[', ']', '{', '}', '#', '%', '^', '*', '+', '='];
const SYM_R2 = ['_', '\\', '|', '~', '<', '>', '€', '£', '¥'];
const SYM_R3 = ['.', ',', '?', '!', "'"];

type Variant = 'default' | 'action' | 'active' | 'submit';

function Key({
  label,
  onPress,
  flex = 1,
  variant = 'default',
  large = false,
}: {
  label: string;
  onPress: () => void;
  flex?: number;
  variant?: Variant;
  large?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.key,
        variant === 'action' && styles.keyAction,
        variant === 'active' && styles.keyActive,
        variant === 'submit' && styles.keySubmit,
        { flex },
        pressed && styles.keyPressed,
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.keyLabel,
          large && styles.keyLabelLarge,
          (variant === 'action' || variant === 'active') && styles.keyLabelMuted,
          variant === 'submit' && styles.keyLabelSubmit,
        ]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {label}
      </Text>
    </Pressable>
  );
}

type Layer = 'alpha' | 'num' | 'sym';

export default function AppKeyboard({
  visible,
  mode = 'alpha',
  onKey,
  onSubmit,
  returnLabel = 'Próximo',
}: AppKeyboardProps) {
  const [caps, setCaps] = useState(false);
  const [layer, setLayer] = useState<Layer>('alpha');

  if (!visible) return null;

  const apply = (k: string) => (caps ? k.toUpperCase() : k);

  if (mode === 'numeric') {
    return (
      <View style={styles.container}>
        <View style={styles.numRow}>
          {['1', '2', '3'].map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} large />
          ))}
        </View>
        <View style={styles.numRow}>
          {['4', '5', '6'].map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} large />
          ))}
        </View>
        <View style={styles.numRow}>
          {['7', '8', '9'].map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} large />
          ))}
        </View>
        <View style={styles.numRow}>
          <View style={{ flex: 1 }} />
          <Key label="0" onPress={() => onKey('0')} large />
          <Key label="⌫" variant="action" onPress={() => onKey('BACKSPACE')} large />
        </View>
        <View style={styles.submitRow}>
          <Key label={returnLabel} variant="submit" onPress={onSubmit} />
        </View>
      </View>
    );
  }

  if (layer === 'num' || layer === 'sym') {
    const r1 = layer === 'num' ? NUM_R1 : SYM_R1;
    const r2 = layer === 'num' ? NUM_R2 : SYM_R2;
    const r3 = layer === 'num' ? NUM_R3 : SYM_R3;
    const toggleLabel = layer === 'num' ? '#=+' : '123';
    const toggleTarget: Layer = layer === 'num' ? 'sym' : 'num';

    return (
      <View style={styles.container}>
        <View style={styles.row}>
          {r1.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
        </View>
        <View style={styles.row}>
          <View style={{ flex: 0.5 }} />
          {r2.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
          <View style={{ flex: 0.5 }} />
        </View>
        <View style={styles.row}>
          <Key label={toggleLabel} flex={1.5} variant="action" onPress={() => setLayer(toggleTarget)} />
          {r3.map((k) => (
            <Key key={k} label={k} onPress={() => onKey(k)} />
          ))}
          <Key label="⌫" flex={1.5} variant="action" onPress={() => onKey('BACKSPACE')} />
        </View>
        <View style={styles.row}>
          <Key label="ABC" flex={2} variant="action" onPress={() => setLayer('alpha')} />
          <Key label="espaço" flex={4} onPress={() => onKey(' ')} />
          <Key label={returnLabel} flex={2} variant="submit" onPress={onSubmit} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {R1.map((k) => (
          <Key key={k} label={apply(k)} onPress={() => onKey(apply(k))} />
        ))}
      </View>
      <View style={styles.row}>
        <View style={{ flex: 0.5 }} />
        {R2.map((k) => (
          <Key key={k} label={apply(k)} onPress={() => onKey(apply(k))} />
        ))}
        <View style={{ flex: 0.5 }} />
      </View>
      <View style={styles.row}>
        <Key
          label={caps ? '⇪' : '⇧'}
          flex={1.5}
          variant={caps ? 'active' : 'action'}
          onPress={() => setCaps((c) => !c)}
        />
        {R3.map((k) => (
          <Key key={k} label={apply(k)} onPress={() => onKey(apply(k))} />
        ))}
        <Key label="⌫" flex={1.5} variant="action" onPress={() => onKey('BACKSPACE')} />
      </View>
      <View style={styles.row}>
        <Key label="123" flex={2} variant="action" onPress={() => setLayer('num')} />
        <Key label="espaço" flex={4} onPress={() => onKey(' ')} />
        <Key label={returnLabel} flex={2} variant="submit" onPress={onSubmit} />
      </View>
    </View>
  );
}

const GAP = scale(5);
const RADIUS = scale(9);

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    paddingHorizontal: scale(8),
    paddingTop: scale(10),
    paddingBottom: scale(14),
    gap: GAP,
  },
  row: {
    flexDirection: 'row',
    height: scale(50),
    gap: GAP,
  },
  numRow: {
    flexDirection: 'row',
    height: scale(68),
    gap: GAP,
  },
  submitRow: {
    height: scale(54),
  },
  key: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: RADIUS,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  keyAction: {
    backgroundColor: Colors.surfaceElevated,
    borderColor: Colors.surfaceHighlight,
  },
  keyActive: {
    backgroundColor: Colors.primaryPastel,
    borderColor: Colors.primary,
  },
  keySubmit: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  keyPressed: {
    opacity: 0.5,
  },
  keyLabel: {
    color: Colors.text,
    fontSize: scale(17),
    fontWeight: '500',
  },
  keyLabelLarge: {
    fontSize: scale(26),
    fontWeight: '600',
  },
  keyLabelMuted: {
    color: Colors.textSecondary,
    fontSize: scale(15),
  },
  keyLabelSubmit: {
    color: Colors.textOnPrimary,
    fontSize: scale(15),
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
});
