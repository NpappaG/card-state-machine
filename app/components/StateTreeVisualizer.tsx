'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import type { UseCardGameReturn } from '@/lib/hooks/useCardGame';

interface StateTreeVisualizerProps {
  currentState: any;
  game: UseCardGameReturn;
}

/**
 * Visualizes the XState machine state tree with live highlighting
 * Fixed to the right side with collapse functionality
 */
export function StateTreeVisualizer({ currentState, game }: StateTreeVisualizerProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const stateValue = typeof currentState === 'object' ? JSON.stringify(currentState) : String(currentState);

  const matchingCards = game.currentPlayer?.hand.filter(
    c => c.rank === game.topDiscard?.rank
  ).length || 0;

  const calculateHandScore = () => {
    if (!game.currentPlayer) return 0;
    const rankValues: Record<string, number> = {
      'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
      '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13
    };
    return game.currentPlayer.hand.reduce((sum, card) => sum + (rankValues[card.rank] || 0), 0);
  };

  const handScore = calculateHandScore();

  const isInState = (state: string) => {
    return stateValue.includes(state);
  };

  const StateNode = ({ name, isActive, level = 0 }: { name: string; isActive: boolean; level?: number }) => (
    <motion.div
      className={`
        text-xs font-mono py-0.5 px-2 rounded transition-all
        ${isActive ? 'bg-green-500/20 text-green-300 font-bold' : 'text-gray-400'}
      `}
      style={{ marginLeft: `${level * 12}px` }}
      animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {isActive && '▸ '}{name}
    </motion.div>
  );

  return (
    <div className="fixed right-4 bottom-4 z-50">
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
            <StateNode name="idle" isActive={isInState('idle')} />
            <StateNode name="setup" isActive={isInState('setup')} />

            <StateNode name="roundActive" isActive={isInState('roundActive')} />
            <StateNode name="  playerTurn" isActive={isInState('playerTurn')} level={1} />
            <StateNode name="    checkingCards" isActive={isInState('checkingCards')} level={2} />
            <StateNode name="    selecting" isActive={isInState('selecting')} level={2} />
            <StateNode name="    drawing" isActive={isInState('drawing')} level={2} />
            <StateNode name="    evaluating" isActive={isInState('evaluating')} level={2} />
            <StateNode name="    changingTurn" isActive={isInState('changingTurn')} level={2} />

            <StateNode name="roundEnd" isActive={isInState('roundEnd')} />
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
