// ─── Types ────────────────────────────────────────────────────────────────────

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** Flat number = same every day. Per-day object = different per weekday.
 *  Omitted days default to 0. null = unlimited. */
export type DailyStock = number | Partial<Record<DayOfWeek, number>> | null;

export type TimeWindow = {
  /** 24h format "HH:MM" */
  from: string;
  /** 24h format "HH:MM" */
  to: string;
};

export type Prize = {
  id: string;
  label: string;
  /** Relative probability. Higher = more likely. 0 = never wins (stays on wheel). */
  weight: number;
  /** Daily stock limit. null = unlimited. */
  stock: DailyStock;
  /** Whether leftover stock carries over to the next day.
   *  Overrides systemConfig.carryOver when set. */
  carryOver?: boolean;
  /** Only available during this time window. null = always.
   *  Only enforced when systemConfig.timeWindowEnabled = true. */
  timeWindow?: TimeWindow | null;
};

/** A physical segment on the wheel image. Multiple slots can point to the same prize
 *  (e.g. "Que pena" appearing twice on the wheel). */
export type WheelSlot = {
  prizeId: string;
  startAngle: number;
  endAngle: number;
};

export type PrizeSystemConfig = {
  /** ID of the prize used when no real prize is available (stock exhausted / out of window) */
  noPrizeId: string;
  /** Global carry-over toggle. Overridden per prize via prize.carryOver */
  carryOver: boolean;
  /** Master switch for ALL time window checks */
  timeWindowEnabled: boolean;
  /** Optional global time window applied to every prize (e.g. event hours).
   *  Individual prize.timeWindow is an additional constraint on top of this. */
  globalTimeWindow: TimeWindow | null;
};

// ─── System Config ────────────────────────────────────────────────────────────

export const PRIZE_SYSTEM_CONFIG: PrizeSystemConfig = {
  noPrizeId: 'no-prize',
  carryOver: false,
  timeWindowEnabled: false,
  globalTimeWindow: null,
  // globalTimeWindow: { from: '10:00', to: '20:00' }, // ← enable for event hours
};

// ─── Prizes ───────────────────────────────────────────────────────────────────

export const PRIZES: Prize[] = [
  {
    id: 'no-prize',
    label: 'Que pena!',
    weight: 20,
    stock: null, // unlimited — always available as fallback
    timeWindow: null,
  },
  {
    id: 'garrafa-nation',
    label: 'Garrafa térmica Nation CT',
    weight: 3, // rare
    stock: { fri: 15, sat: 35, sun: 20 }, // only available Fri–Sun
    carryOver: false,
    timeWindow: null,
  },
  {
    id: 'coqueteleira-nation',
    label: 'Coqueteleira Nation CT',
    weight: 15,
    stock: null, // TODO: set per-event daily limits
    timeWindow: null,
  },
  {
    id: 'chaveiro-nation',
    label: 'Chaveiro Nation CT',
    weight: 30, // most common physical prize
    stock: null, // TODO: set per-event daily limits
    timeWindow: null,
  },
  {
    id: 'coqueteleira-total',
    label: 'Coqueteleira Total Health',
    weight: 18,
    stock: null, // TODO: set per-event daily limits
    timeWindow: null,
  },
  {
    id: 'bone-total',
    label: 'Boné Total Health',
    weight: 18,
    stock: null, // TODO: set per-event daily limits
    timeWindow: null,
  },
  {
    id: 'day-pass-nation',
    label: 'Day Pass Nation CT',
    weight: 10,
    stock: null, // TODO: set per-event daily limits
    timeWindow: null,
  },
];

// ─── Wheel Slots ─────────────────────────────────────────────────────────────
// Maps physical wheel segments (angles) to prizes.
// Angles go clockwise from 12 o'clock (0°).
// "Que pena" has two segments to match the visual wheel image.

export const WHEEL_SLOTS: WheelSlot[] = [
  { prizeId: 'no-prize', startAngle: 0, endAngle: 45 },
  { prizeId: 'chaveiro-nation', startAngle: 45, endAngle: 90 },
  { prizeId: 'bone-total', startAngle: 90, endAngle: 135 },
  { prizeId: 'coqueteleira-total', startAngle: 135, endAngle: 180 },
  { prizeId: 'coqueteleira-nation', startAngle: 225, endAngle: 270 },
  { prizeId: 'day-pass-nation', startAngle: 270, endAngle: 315 },
  { prizeId: 'garrafa-nation', startAngle: 315, endAngle: 360 },
];
