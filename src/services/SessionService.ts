import { storage } from './storage';
import type { Session, SessionEvent, SessionEventType, QuizAnswer, SpinResult, Registration } from '../types/session';
import { REGISTRATION_FIELDS } from '../config/registration';

const CURRENT_SESSION_KEY = 'current_session_id';
const SESSION_IDS_KEY = 'session_ids';

function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function now(): string {
  return new Date().toISOString();
}

function sessionKey(id: string): string {
  return `session_${id}`;
}

export const SessionService = {
  // ─── CRUD ──────────────────────────────────────────────────────────────────

  async createSession(): Promise<Session> {
    // End any active session first
    const existing = await this.getCurrentSession();
    if (existing) await this.endSession('new_session');

    const session: Session = {
      id: generateId(),
      startedAt: now(),
      events: [],
    };

    await storage.set(sessionKey(session.id), session);
    await storage.set(CURRENT_SESSION_KEY, session.id);

    // Append to index
    const ids = (await storage.get<string[]>(SESSION_IDS_KEY)) ?? [];
    await storage.set(SESSION_IDS_KEY, [...ids, session.id]);

    return session;
  },

  async getCurrentSession(): Promise<Session | null> {
    const id = await storage.get<string>(CURRENT_SESSION_KEY);
    if (!id) return null;
    return storage.get<Session>(sessionKey(id));
  },

  async getSession(id: string): Promise<Session | null> {
    return storage.get<Session>(sessionKey(id));
  },

  async getAllSessions(): Promise<Session[]> {
    const ids = (await storage.get<string[]>(SESSION_IDS_KEY)) ?? [];
    const sessions = await Promise.all(ids.map((id) => this.getSession(id)));
    return sessions.filter(Boolean) as Session[];
  },

  async clearAllSessions(): Promise<void> {
    const ids = (await storage.get<string[]>(SESSION_IDS_KEY)) ?? [];
    await Promise.all(ids.map((id) => storage.remove(sessionKey(id))));
    await storage.remove(SESSION_IDS_KEY);
    await storage.remove(CURRENT_SESSION_KEY);
  },

  // ─── Private helpers ───────────────────────────────────────────────────────

  async _updateSession(updater: (session: Session) => Session): Promise<void> {
    const session = await this.getCurrentSession();
    if (!session) return;
    const updated = updater(session);
    await storage.set(sessionKey(session.id), updated);
  },

  async _appendEvent(type: SessionEventType, metadata?: Record<string, unknown>): Promise<void> {
    const event: SessionEvent = { type, timestamp: now(), ...(metadata ? { metadata } : {}) };
    await this._updateSession((s) => ({ ...s, events: [...s.events, event] }));
  },

  // ─── Events ────────────────────────────────────────────────────────────────

  async isDuplicateRegistered(fields: Record<string, string>): Promise<boolean> {
    const uniqueField = REGISTRATION_FIELDS.find((f) => f.unique);
    if (!uniqueField) return false;
    const rawValue = (fields[uniqueField.id] ?? '').replace(/\D/g, '');
    if (!rawValue) return false;
    const sessions = await this.getAllSessions();
    return sessions.some(
      (s) => s.registration?.fields?.[uniqueField.id]?.replace(/\D/g, '') === rawValue,
    );
  },

  async recordRegistration(data: Registration): Promise<void> {
    await this._appendEvent('registration_submitted', data.fields);
    await this._updateSession((s) => ({ ...s, registration: data }));
  },

  async recordHomeView(): Promise<void> {
    await this._appendEvent('home_viewed');
  },

  async recordUnitsScreenView(): Promise<void> {
    await this._appendEvent('units_screen_viewed');
  },

  async recordUnitOpened(unitId: string, unitName: string): Promise<void> {
    await this._appendEvent('unit_opened', { unitId, unitName });
  },

  async recordQuizStart(): Promise<void> {
    await this._appendEvent('quiz_started');
    await this._updateSession((s) => ({
      ...s,
      quiz: {
        startedAt: now(),
        answers: [],
        score: 0,
        total: 0,
        eligible: false,
      },
    }));
  },

  async recordQuizAnswer(answer: QuizAnswer): Promise<void> {
    await this._appendEvent('quiz_answer', {
      questionId: answer.questionId,
      isCorrect: answer.isCorrect,
      selectedLabel: answer.selectedLabel,
    });
    await this._updateSession((s) => ({
      ...s,
      quiz: s.quiz
        ? { ...s.quiz, answers: [...s.quiz.answers, answer] }
        : s.quiz,
    }));
  },

  async recordQuizComplete(score: number, total: number, eligible: boolean): Promise<void> {
    await this._appendEvent('quiz_completed', { score, total, eligible });
    await this._updateSession((s) => ({
      ...s,
      quiz: s.quiz
        ? { ...s.quiz, completedAt: now(), score, total, eligible }
        : s.quiz,
    }));
  },

  async recordResultView(score: number, total: number): Promise<void> {
    await this._appendEvent('result_viewed', { score, total });
  },

  async recordRouletteView(): Promise<void> {
    await this._appendEvent('roulette_viewed');
  },

  async recordRouletteSpin(result: SpinResult): Promise<void> {
    await this._appendEvent('roulette_spun', {
      prizeId: result.prizeId,
      prizeLabel: result.prizeLabel,
    });
    await this._updateSession((s) => ({ ...s, spin: result }));
  },

  async recordPostInteractionView(): Promise<void> {
    await this._appendEvent('post_interaction_viewed');
  },

  async recordInactivityWarning(): Promise<void> {
    await this._appendEvent('inactivity_warning_shown');
  },

  async recordInactivityReset(): Promise<void> {
    await this._appendEvent('inactivity_reset');
    await this.endSession('inactivity');
  },

  async endSession(reason: Session['endReason'] = 'completed'): Promise<void> {
    await this._appendEvent('session_ended', { reason });
    await this._updateSession((s) => ({ ...s, endedAt: now(), endReason: reason }));
    await storage.remove(CURRENT_SESSION_KEY);
  },
};
