import { FLOW } from '../config/flow';
import type { BlockId } from '../config/flow';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from '../types/navigation';

// navigate() is a discriminated union overload — TypeScript cannot verify params
// for a dynamically resolved screen name. One cast here, nowhere else.
function go(screen: keyof RootStackParamList, params?: object): void {
  (navigationRef.current?.navigate as (s: string, p?: object) => void)?.(screen, params);
}

const BLOCK_ENTRY: Record<BlockId, keyof RootStackParamList> = {
  register: 'Register',
  quiz: 'Quiz',
  roulette: 'RouletteGame',
};

export type FlowContext = {
  quizScore?: number;
};

function resolveNextScreen(fromIndex: number, ctx: FlowContext): keyof RootStackParamList {
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
    go('Units');
    return;
  }
  go(BLOCK_ENTRY[FLOW[0].id]);
}

export function navigateToNextBlock(
  currentBlockId: string,
  ctx: FlowContext = {},
): void {
  const currentIndex = FLOW.findIndex((b) => b.id === currentBlockId);
  const screen = resolveNextScreen(currentIndex, ctx);
  go(screen, screen === 'Units' ? { fromQuiz: true } : undefined);
}
