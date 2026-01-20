'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import { GAME_TIMING as DEFAULT_TIMING } from '@/lib/constants';

interface TimingContextType {
  CHECKING_DELAY: number;
  AUTO_PLAY_DELAY: number;
  DRAW_DELAY: number;
  EVALUATING_DELAY: number;
  TURN_CHANGE_DELAY: number;
  ROUND_DURATION_MS: number;
  updateTiming: (key: keyof Omit<TimingContextType, 'updateTiming'>, value: number) => void;
}

const TimingContext = createContext<TimingContextType | undefined>(undefined);

export function TimingProvider({ children }: { children: ReactNode }) {
  const [timing, setTiming] = useState({
    CHECKING_DELAY: DEFAULT_TIMING.CHECKING_DELAY,
    AUTO_PLAY_DELAY: DEFAULT_TIMING.AUTO_PLAY_DELAY,
    DRAW_DELAY: DEFAULT_TIMING.DRAW_DELAY,
    EVALUATING_DELAY: DEFAULT_TIMING.EVALUATING_DELAY,
    TURN_CHANGE_DELAY: DEFAULT_TIMING.TURN_CHANGE_DELAY,
    ROUND_DURATION_MS: DEFAULT_TIMING.ROUND_DURATION_MS,
  });

  const updateTiming = (key: keyof typeof timing, value: number) => {
    setTiming(prev => ({ ...prev, [key]: value }));
  };

  return (
    <TimingContext.Provider value={{ ...timing, updateTiming }}>
      {children}
    </TimingContext.Provider>
  );
}

export function useTiming() {
  const context = useContext(TimingContext);
  if (!context) {
    throw new Error('useTiming must be used within TimingProvider');
  }
  return context;
}
