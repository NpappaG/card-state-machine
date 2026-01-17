'use client';

import { useState } from 'react';
import { useTiming } from '@/lib/contexts/TimingContext';

export function SpeedControls() {
  const [isExpanded, setIsExpanded] = useState(false);
  const timing = useTiming();

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="bg-black/90 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/20 transition-colors text-xs font-mono"
      >
        ⚡ Speed Controls
      </button>
    );
  }

  return (
    <div className="bg-black/90 rounded-lg p-3 border border-white/20 backdrop-blur-sm w-64">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-xs font-bold text-white/80 font-mono">⚡ Speed Controls</h3>
        <button
          onClick={() => setIsExpanded(false)}
          className="text-white/60 hover:text-white text-xs"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        {/* Checking Delay */}
        <div>
          <label className="text-[10px] text-gray-400 font-mono flex justify-between">
            <span>Check Delay</span>
            <span className="text-green-400">{timing.CHECKING_DELAY}ms</span>
          </label>
          <input
            type="range"
            min="500"
            max="5000"
            step="100"
            value={timing.CHECKING_DELAY}
            onChange={(e) => timing.updateTiming('CHECKING_DELAY', Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
          />
        </div>

        {/* Draw Delay */}
        <div>
          <label className="text-[10px] text-gray-400 font-mono flex justify-between">
            <span>Draw Delay</span>
            <span className="text-blue-400">{timing.DRAW_DELAY}ms</span>
          </label>
          <input
            type="range"
            min="500"
            max="3000"
            step="50"
            value={timing.DRAW_DELAY}
            onChange={(e) => timing.updateTiming('DRAW_DELAY', Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        {/* Evaluating Delay */}
        <div>
          <label className="text-[10px] text-gray-400 font-mono flex justify-between">
            <span>Evaluate Delay</span>
            <span className="text-yellow-400">{timing.EVALUATING_DELAY}ms</span>
          </label>
          <input
            type="range"
            min="200"
            max="2000"
            step="50"
            value={timing.EVALUATING_DELAY}
            onChange={(e) => timing.updateTiming('EVALUATING_DELAY', Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
          />
        </div>

        {/* Turn Change Delay */}
        <div>
          <label className="text-[10px] text-gray-400 font-mono flex justify-between">
            <span>Turn Change</span>
            <span className="text-purple-400">{timing.TURN_CHANGE_DELAY}ms</span>
          </label>
          <input
            type="range"
            min="100"
            max="1000"
            step="50"
            value={timing.TURN_CHANGE_DELAY}
            onChange={(e) => timing.updateTiming('TURN_CHANGE_DELAY', Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
          />
        </div>
      </div>

      <p className="text-[8px] text-gray-500 font-mono mt-3 leading-tight">
        Animations scale proportionally. Try adjusting during gameplay!
      </p>
    </div>
  );
}
