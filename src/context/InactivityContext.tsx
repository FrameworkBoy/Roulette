import { createContext, useContext } from 'react';
import type { InactivityControls } from '../types/inactivity';

const InactivityContext = createContext<InactivityControls>({
  pause: () => {},
  resume: () => {},
});

export const useInactivity = () => useContext(InactivityContext);

export const InactivityProvider = InactivityContext.Provider;
export type { InactivityControls } from '../types/inactivity';
