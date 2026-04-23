import type { ImageSourcePropType } from 'react-native';

export type ClientConfig = {
  /** Client name — used in copy throughout the app (e.g. result screen messages). */
  name: string;
  /** Client logo — shown on HomeScreen and all ScreenLogo headers. */
  logo: ImageSourcePropType;
  /** Two-line home screen headline. line1 is white, line2 is the accent color. */
  tagline: {
    line1: string;
    line2: string;
  };
};

export const CLIENT: ClientConfig = {
  name: 'LabToGo',
  logo: require('../assets/lab-to-go.png'),
  tagline: {
    line1: 'TESTE SEUS',
    line2: 'CONHECIMENTOS!',
  },
};
