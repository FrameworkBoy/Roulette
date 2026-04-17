export type ScreenTimeoutConfig = {
  /** Total ms of inactivity before resetting to Home */
  timeoutMs: number;
  /** How many ms before timeout to show the warning countdown */
  warningMs: number;
  /** Set true to disable inactivity detection on this screen entirely */
  disabled?: boolean;
};

/**
 * Per-screen inactivity config.
 * Add or adjust any screen here. Keys must match RootStackParamList screen names.
 * Any screen not listed falls back to DEFAULT_TIMEOUT.
 */
export const INACTIVITY_CONFIG: Record<string, ScreenTimeoutConfig> = {
  // Totem sitting idle at the welcome screen
  Home: { timeoutMs: 60_000, warningMs: 10_000, disabled: true },

  // User browsing unit info from the home button
  Units: { timeoutMs: 30_000, warningMs: 8_000 },

  // User stopped mid-quiz without answering
  Quiz: { timeoutMs: 30_000, warningMs: 8_000 },

  // User sees score but doesn't press anything
  Result: { timeoutMs: 20_000, warningMs: 8_000 },

  // User hasn't spun the roulette, or spun but didn't press Continue
  RouletteGame: { timeoutMs: 45_000, warningMs: 10_000 },

  // User on post-interaction screen not going anywhere
  PostInteraction: { timeoutMs: 25_000, warningMs: 8_000 },
};

export const DEFAULT_TIMEOUT: ScreenTimeoutConfig = {
  timeoutMs: 30_000,
  warningMs: 8_000,
};
