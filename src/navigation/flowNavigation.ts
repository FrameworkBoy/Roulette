import { FLOW } from '../config/flow';
import { navigationRef } from './navigationRef';

const BLOCK_ENTRY: Record<string, string> = {
  register: 'Register',
  quiz: 'Quiz',
  roulette: 'RouletteGame',
};

export type FlowContext = {
  quizScore?: number;
};

function resolveNextScreen(fromIndex: number, ctx: FlowContext): string {
  for (let i = fromIndex + 1; i < FLOW.length; i++) {
    const block = FLOW[i];

    if (block.id === 'roulette' && block.requiresQuizScore !== undefined) {
      if ((ctx.quizScore ?? 0) < block.requiresQuizScore) continue;
    }

    return BLOCK_ENTRY[block.id];
  }

  return 'Units';
}

export function navigateToFirstBlock(): void {
  if (FLOW.length === 0) {
    navigationRef.current?.navigate('Units' as any);
    return;
  }
  navigationRef.current?.navigate(BLOCK_ENTRY[FLOW[0].id] as any);
}

export function navigateToNextBlock(
  currentBlockId: string,
  ctx: FlowContext = {},
): void {
  const currentIndex = FLOW.findIndex((b) => b.id === currentBlockId);
  const screen = resolveNextScreen(currentIndex, ctx);
  navigationRef.current?.navigate(screen as any, screen === 'Units' ? { fromQuiz: true } : undefined);
}
