import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Units: { fromQuiz?: boolean } | undefined;
  Register: undefined;
  Quiz: undefined;
  Result: { score: number; total: number };
  RouletteGame: undefined;
  PostInteraction: undefined;
  AdminPanel: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type FlowContext = {
  quizScore?: number;
};
