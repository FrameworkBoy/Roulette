import React, { createContext, useContext } from 'react';

type InactivityControls = {
  pause: () => void;
  resume: () => void;
};

const InactivityContext = createContext<InactivityControls>({
  pause: () => {},
  resume: () => {},
});

export const useInactivity = () => useContext(InactivityContext);

export const InactivityProvider = InactivityContext.Provider;
export type { InactivityControls };
