import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import AppKeyboard, { type KeyboardMode } from '../components/AppKeyboard';
import { useInactivity } from './InactivityContext';

type KeyboardEntry = {
  onKey: (key: string) => void;
  onSubmit: () => void;
  mode: KeyboardMode;
  returnLabel?: string;
};

type KeyboardContextType = {
  activeId: string | null;
  mode: KeyboardMode;
  returnLabel: string | undefined;
  show: (id: string, entry: KeyboardEntry) => void;
  dismiss: () => void;
  onKey: (key: string) => void;
  onSubmit: () => void;
};

const KeyboardContext = createContext<KeyboardContextType | null>(null);

export function KeyboardProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mode, setMode] = useState<KeyboardMode>('alpha');
  const [returnLabel, setReturnLabel] = useState<string | undefined>(undefined);
  const entryRef = useRef<KeyboardEntry | null>(null);

  const show = useCallback((id: string, entry: KeyboardEntry) => {
    entryRef.current = entry;
    setActiveId(id);
    setMode(entry.mode);
    setReturnLabel(entry.returnLabel);
  }, []);

  const dismiss = useCallback(() => {
    entryRef.current = null;
    setActiveId(null);
  }, []);

  const onKey = useCallback((k: string) => entryRef.current?.onKey(k), []);
  const onSubmit = useCallback(() => entryRef.current?.onSubmit(), []);

  return (
    <KeyboardContext.Provider value={{ activeId, mode, returnLabel, show, dismiss, onKey, onSubmit }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard(): KeyboardContextType {
  const ctx = useContext(KeyboardContext);
  if (!ctx) throw new Error('useKeyboard must be used inside KeyboardProvider');
  return ctx;
}

// Drop this into any screen that needs keyboard support — renders inline so flex works correctly
export function KeyboardArea() {
  const { activeId, mode, returnLabel, onKey, onSubmit } = useKeyboard();
  const inactivity = useInactivity();

  return (
    <AppKeyboard
      visible={activeId !== null}
      mode={mode}
      onKey={(k) => { inactivity.resume(); onKey(k); }}
      onSubmit={onSubmit}
      returnLabel={returnLabel}
    />
  );
}
