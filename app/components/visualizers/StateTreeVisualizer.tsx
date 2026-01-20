'use client';

import { useState, useEffect } from 'react';
import type { UseCardGameReturn } from '@/lib/hooks/useCardGame';
import { StateNode } from './StateNode';
import { calculateHandScore } from '@/lib/utils/scoreCalculator';

interface StateTreeVisualizerProps {
  game: UseCardGameReturn;
}

/**
 * Visualizes the XState machine state tree with live highlighting
 * Fixed to the right side with collapse functionality
 */
export function StateTreeVisualizer({ game }: StateTreeVisualizerProps) {
  // Always start collapsed to match SSR (prevents hydration mismatch)
  const [isCollapsed, setIsCollapsed] = useState(true);

  // Read from localStorage after hydration
  useEffect(() => {
    try {
      const stored = localStorage.getItem('xstate-visualizer-collapsed');
      if (stored !== null) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Legitimate pattern to sync with localStorage after SSR hydration
        setIsCollapsed(stored === 'true');
      }
    } catch (error) {
      // localStorage may be disabled (private browsing) or throw errors
      console.warn('Failed to read from localStorage:', error);
    }
  }, []); // Run once on mount

  // Persist collapse state to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('xstate-visualizer-collapsed', String(isCollapsed));
    } catch (error) {
      // localStorage may be disabled or quota exceeded
      console.warn('Failed to write to localStorage:', error);
    }
  }, [isCollapsed]);
  const rawStateValue = game.snapshot.value;
  const stateValue = typeof rawStateValue === 'object' ? JSON.stringify(rawStateValue) : String(rawStateValue);

  const matchingCards = game.currentPlayer?.hand.filter(
    c => c.rank === game.topDiscard?.rank
  ).length || 0;

  const handScore = calculateHandScore(game.currentPlayer);

  return (
    <div>
      {isCollapsed ? (
        /* Collapsed state - small label */
        <button
          onClick={() => setIsCollapsed(false)}
          className="bg-black/90 hover:bg-black text-white rounded-lg px-4 py-2 border border-white/20 transition-colors cursor-pointer flex items-center gap-2"
        >
          <span className="text-sm">🔍</span>
          <span className="text-xs font-mono">^ XState Visualizer ^</span>
        </button>
      ) : (
        /* Expanded state - full panel */
        <div className="flex flex-col gap-2 bg-black/80 rounded-lg p-3 border border-white/20 backdrop-blur-sm w-64">
          {/* Close button */}
          <div className="flex justify-between items-center mb-1">
            <h3 className="text-xs font-bold text-white/80 font-mono">XState Machine</h3>
            <button
              onClick={() => setIsCollapsed(true)}
              className="text-white/60 hover:text-white text-xs"
              aria-label="Collapse state tree"
            >
              ✕
            </button>
          </div>

          {/* Explanation */}
          <div className="mb-2 pb-2 border-b border-white/10">
            <p className="text-[9px] text-blue-300 font-mono leading-tight">
              • Live XState v5 snapshot • Direct state machine data
            </p>
            <p className="text-[9px] text-blue-300 font-mono leading-tight mt-0.5">
              • <span className="text-yellow-400">evaluating</span> = check win condition + animation delay
            </p>
          </div>

          <div className="flex flex-col gap-0.5">
            <StateNode name="setup" isActive={game.isSetup} />

            <StateNode name="roundActive" isActive={game.isRoundActive} />
            <StateNode
              name="  playerTurn"
              isActive={game.isPlaying || game.isPaused}
              level={1}
            />
            <StateNode
              name="    checkingCards"
              isActive={game.isCheckingCards}
              level={2}
            />
            <StateNode
              name="    selecting"
              isActive={game.isSelecting}
              level={2}
            />
            <StateNode
              name="    autoPlaying"
              isActive={game.isAutoPlaying}
              level={2}
            />
            <StateNode
              name="    drawing"
              isActive={game.isDrawing}
              level={2}
            />
            <StateNode
              name="    evaluating"
              isActive={game.isEvaluating}
              level={2}
            />
            <StateNode
              name="    changingTurn"
              isActive={game.isChangingTurn}
              level={2}
            />

            <StateNode name="roundEnd" isActive={game.isRoundEnd} />
          </div>

          <div className="mt-2 pt-2 border-t border-white/10">
            <p className="text-[10px] text-gray-500 font-mono mb-1">
              State: <span className="text-green-400">{stateValue}</span>
            </p>
          </div>

          {/* Debug info */}
          <div className="mt-1 pt-2 border-t border-white/10 space-y-0.5">
            <div className="text-[10px] font-mono text-gray-400">
              <span className="text-gray-500">Player:</span>{' '}
              <span className="text-blue-300">{game.currentPlayer?.name}</span>{' '}
              <span className="text-gray-600">({game.currentPlayerIndex})</span>
            </div>
            <div className="text-[10px] font-mono text-gray-400">
              <span className="text-gray-500">Hand:</span>{' '}
              <span className="text-yellow-300">{game.currentPlayer?.hand.length}</span>{' '}
              <span className="text-gray-600">cards</span>{' '}
              <span className="text-gray-600">(</span>
              <span className="text-orange-300">{handScore}</span>
              <span className="text-gray-600">pts)</span>
            </div>
            <div className="text-[10px] font-mono text-gray-400">
              <span className="text-gray-500">Top:</span>{' '}
              <span className="text-red-300">{game.topDiscard?.rank}</span>{' '}
              <span className="text-gray-600">of {game.topDiscard?.suit}</span>
            </div>
            <div className="text-[10px] font-mono text-gray-400">
              <span className="text-gray-500">Matches:</span>{' '}
              <span className={matchingCards > 0 ? 'text-green-300' : 'text-red-300'}>
                {matchingCards}
              </span>
            </div>
            <div className="text-[10px] font-mono text-gray-400">
              <span className="text-gray-500">Deck:</span>{' '}
              <span className="text-purple-300">{game.deck.length}</span>{' '}
              <span className="text-gray-600">left</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
