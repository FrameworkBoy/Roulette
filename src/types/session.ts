export type QuizAnswer = {
  questionId: number;
  question: string;
  selectedIndex: number;
  selectedLabel: string;
  correctIndex: number;
  correctLabel: string;
  isCorrect: boolean;
  answeredAt: string;
};

export type SpinResult = {
  prizeId: string;
  prizeLabel: string;
  spunAt: string;
};

export type SessionEventType =
  | 'home_viewed'
  | 'quiz_started'
  | 'quiz_answer'
  | 'quiz_completed'
  | 'result_viewed'
  | 'roulette_viewed'
  | 'roulette_spun'
  | 'post_interaction_viewed'
  | 'units_screen_viewed'
  | 'unit_opened'
  | 'inactivity_warning_shown'
  | 'inactivity_reset'
  | 'session_ended';

export type SessionEvent = {
  type: SessionEventType;
  timestamp: string;
  metadata?: Record<string, unknown>;
};

export type Session = {
  id: string;
  startedAt: string;
  endedAt?: string;
  endReason?: 'completed' | 'inactivity' | 'new_session';

  quiz?: {
    startedAt: string;
    completedAt?: string;
    answers: QuizAnswer[];
    score: number;
    total: number;
    eligible: boolean;
  };

  spin?: SpinResult;

  events: SessionEvent[];
};
