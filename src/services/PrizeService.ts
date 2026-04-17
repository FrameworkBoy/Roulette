import { PRIZES, PRIZE_SYSTEM_CONFIG, WHEEL_SLOTS, type DailyStock, type Prize, type WheelSlot } from '../config/prizes';
import { storage } from './storage';

// ─── Helpers ─────────────────────────────────────────────────────────────────

type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
const DAY_KEYS: DayKey[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function dayKey(date: Date): DayKey {
  return DAY_KEYS[date.getDay()];
}

function dateStr(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function getConfiguredStock(stock: DailyStock, date: Date): number {
  if (stock === null) return Infinity;
  if (typeof stock === 'number') return stock;
  return stock[dayKey(date)] ?? 0;
}

function parseTime(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number);
  return { h, m };
}

function isWithinWindow(from: string, to: string, now: Date): boolean {
  const { h: fh, m: fm } = parseTime(from);
  const { h: th, m: tm } = parseTime(to);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const fromMinutes = fh * 60 + fm;
  const toMinutes = th * 60 + tm;
  // Handles overnight windows (e.g. 22:00 → 02:00)
  if (fromMinutes <= toMinutes) {
    return nowMinutes >= fromMinutes && nowMinutes <= toMinutes;
  }
  return nowMinutes >= fromMinutes || nowMinutes <= toMinutes;
}

// ─── Stock tracking keys ──────────────────────────────────────────────────────

function consumedKey(prizeId: string, date: Date): string {
  return `prize_consumed_${prizeId}_${dateStr(date)}`;
}

// ─── PrizeService ─────────────────────────────────────────────────────────────

export const PrizeService = {
  /** Returns how many units of a prize remain available today (Infinity = unlimited). */
  async getAvailableStock(prize: Prize, now = new Date()): Promise<number> {
    const configured = getConfiguredStock(prize.stock, now);
    if (configured === Infinity) return Infinity;

    const consumed = (await storage.get<number>(consumedKey(prize.id, now))) ?? 0;
    let available = configured - consumed;

    const shouldCarryOver = prize.carryOver ?? PRIZE_SYSTEM_CONFIG.carryOver;
    if (shouldCarryOver) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const configuredYesterday = getConfiguredStock(prize.stock, yesterday);
      const consumedYesterday =
        (await storage.get<number>(consumedKey(prize.id, yesterday))) ?? 0;
      available += Math.max(0, configuredYesterday - consumedYesterday);
    }

    return Math.max(0, available);
  },

  /** Returns true if this prize can be won right now (stock + time window). */
  async isPrizeAvailable(prize: Prize, now = new Date()): Promise<boolean> {
    // Time window check
    if (PRIZE_SYSTEM_CONFIG.timeWindowEnabled) {
      const global = PRIZE_SYSTEM_CONFIG.globalTimeWindow;
      if (global && !isWithinWindow(global.from, global.to, now)) return false;

      if (prize.timeWindow && !isWithinWindow(prize.timeWindow.from, prize.timeWindow.to, now))
        return false;
    }

    // Stock check
    const available = await this.getAvailableStock(prize, now);
    return available > 0;
  },

  /** Weighted random selection respecting availability. Falls back to noPrize. */
  async selectPrize(now = new Date()): Promise<Prize> {
    const availability = await Promise.all(
      PRIZES.map(async (p) => ({
        prize: p,
        available: await this.isPrizeAvailable(p, now),
      })),
    );

    const candidates = availability
      .filter(({ prize, available }) => {
        if (prize.id === PRIZE_SYSTEM_CONFIG.noPrizeId) return false; // handled as fallback
        return available && prize.weight > 0;
      })
      .map(({ prize }) => prize);

    // Always include no-prize as a weighted candidate
    const noPrize = PRIZES.find((p) => p.id === PRIZE_SYSTEM_CONFIG.noPrizeId);
    if (noPrize) candidates.push(noPrize);

    if (candidates.length === 0) {
      // Everything exhausted — fallback to no-prize
      return noPrize ?? PRIZES[0];
    }

    const totalWeight = candidates.reduce((sum, p) => sum + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const prize of candidates) {
      random -= prize.weight;
      if (random <= 0) return prize;
    }

    return candidates[candidates.length - 1];
  },

  /** Records that a prize was awarded (decrements stock). */
  async consumePrize(prizeId: string, now = new Date()): Promise<void> {
    if (prizeId === PRIZE_SYSTEM_CONFIG.noPrizeId) return; // no-prize has unlimited stock
    const prize = PRIZES.find((p) => p.id === prizeId);
    if (!prize || prize.stock === null) return;

    const key = consumedKey(prizeId, now);
    const current = (await storage.get<number>(key)) ?? 0;
    await storage.set(key, current + 1);
  },

  /** Returns the wheel slot to spin to for a given prize.
   *  If the prize has multiple slots, picks one randomly. */
  getSlotForPrize(prizeId: string): WheelSlot {
    const slots = WHEEL_SLOTS.filter((s) => s.prizeId === prizeId);
    if (slots.length === 0) {
      // Fallback: first slot
      return WHEEL_SLOTS[0];
    }
    return slots[Math.floor(Math.random() * slots.length)];
  },

  /** Returns all prizes with their current remaining stock (for admin/debug use). */
  async getPrizesWithStock(
    now = new Date(),
  ): Promise<Array<Prize & { remaining: number | 'unlimited' }>> {
    return Promise.all(
      PRIZES.map(async (p) => {
        const stock = await this.getAvailableStock(p, now);
        return { ...p, remaining: stock === Infinity ? 'unlimited' : stock };
      }),
    );
  },
};
