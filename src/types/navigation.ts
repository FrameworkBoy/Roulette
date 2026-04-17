import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Units: undefined;
  Quiz: undefined;
  Result: { score: number; total: number };
  RouletteGame: undefined;
  PostInteraction: undefined;
};

export type ScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;
