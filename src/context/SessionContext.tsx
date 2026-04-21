import React, { createContext, useCallback, useContext } from 'react';
import { SessionService } from '../services/SessionService';
import type { QuizAnswer, SpinResult, Registration } from '../types/session';

type SessionContextType = {
  createSession: () => Promise<void>;
  isCpfRegistered: (cpf: string) => Promise<boolean>;
  recordRegistration: (data: Registration) => Promise<void>;
  recordHomeView: () => Promise<void>;
  recordUnitsScreenView: () => Promise<void>;
  recordUnitOpened: (unitId: string, unitName: string) => Promise<void>;
  recordQuizStart: () => Promise<void>;
  recordQuizAnswer: (answer: QuizAnswer) => Promise<void>;
  recordQuizComplete: (score: number, total: number, eligible: boolean) => Promise<void>;
  recordResultView: (score: number, total: number) => Promise<void>;
  recordRouletteView: () => Promise<void>;
  recordRouletteSpin: (result: SpinResult) => Promise<void>;
  recordPostInteractionView: () => Promise<void>;
  recordInactivityWarning: () => Promise<void>;
  recordInactivityReset: () => Promise<void>;
};

const SessionContext = createContext<SessionContextType | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const createSession = useCallback(() => SessionService.createSession().then(() => {}), []);
  const isCpfRegistered = useCallback((cpf: string) => SessionService.isCpfRegistered(cpf), []);
  const recordRegistration = useCallback(
    (data: Registration) => SessionService.recordRegistration(data),
    [],
  );
  const recordHomeView = useCallback(() => SessionService.recordHomeView(), []);
  const recordUnitsScreenView = useCallback(() => SessionService.recordUnitsScreenView(), []);
  const recordUnitOpened = useCallback(
    (unitId: string, unitName: string) => SessionService.recordUnitOpened(unitId, unitName),
    [],
  );
  const recordQuizStart = useCallback(() => SessionService.recordQuizStart(), []);
  const recordQuizAnswer = useCallback(
    (answer: QuizAnswer) => SessionService.recordQuizAnswer(answer),
    [],
  );
  const recordQuizComplete = useCallback(
    (score: number, total: number, eligible: boolean) =>
      SessionService.recordQuizComplete(score, total, eligible),
    [],
  );
  const recordResultView = useCallback(
    (score: number, total: number) => SessionService.recordResultView(score, total),
    [],
  );
  const recordRouletteView = useCallback(() => SessionService.recordRouletteView(), []);
  const recordRouletteSpin = useCallback(
    (result: SpinResult) => SessionService.recordRouletteSpin(result),
    [],
  );
  const recordPostInteractionView = useCallback(
    () => SessionService.recordPostInteractionView(),
    [],
  );
  const recordInactivityWarning = useCallback(() => SessionService.recordInactivityWarning(), []);
  const recordInactivityReset = useCallback(() => SessionService.recordInactivityReset(), []);

  return (
    <SessionContext.Provider
      value={{
        createSession,
        isCpfRegistered,
        recordRegistration,
        recordHomeView,
        recordUnitsScreenView,
        recordUnitOpened,
        recordQuizStart,
        recordQuizAnswer,
        recordQuizComplete,
        recordResultView,
        recordRouletteView,
        recordRouletteSpin,
        recordPostInteractionView,
        recordInactivityWarning,
        recordInactivityReset,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextType {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside SessionProvider');
  return ctx;
}
