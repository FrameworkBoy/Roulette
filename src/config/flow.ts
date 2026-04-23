export type BlockId = 'register' | 'quiz' | 'roulette';

export type BlockConfig =
  | { id: 'register' }
  | { id: 'quiz' }
  | { id: 'roulette'; requiresQuizScore?: number };

// Edit this array to enable/disable blocks and change their order.
// Removing a block skips it entirely. Reordering changes the flow.
export const FLOW: BlockConfig[] = [
  { id: 'register' },
  { id: 'quiz' },
  { id: 'roulette', requiresQuizScore: 3 },
];
