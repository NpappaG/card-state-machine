"use client";

import { useCardGame } from "@/lib/hooks/useCardGame";
import { useAnimations } from "@/lib/hooks/useAnimations";
import { useToast } from "@/lib/contexts/ToastContext";
import { canPlaySelectedCards } from "@/machines/cardGameLogic";
import { Card } from "./components/card/Card";
import { DeckStack } from "./components/deck/DeckStack";
import { DiscardStack } from "./components/discard/DiscardStack";
import { StateTreeVisualizer } from "./components/StateTreeVisualizer";
import { SpeedControls } from "./components/SpeedControls";
import { LayoutGroup, motion } from "framer-motion";
import React, { useState } from "react";

export default function GamePage() {
  const game = useCardGame();
  const animations = useAnimations(game);
  const { showToast } = useToast();
  const [playerCount, setPlayerCount] = useState(2);
  const [debugMode, setDebugMode] = useState(false);
  const [shakingCards, setShakingCards] = useState<Set<string>>(new Set());

  // Trigger shake animation on specific cards
  const triggerShake = (cardIds: string[]) => {
    setShakingCards(new Set(cardIds));
    setTimeout(() => setShakingCards(new Set()), 500); // Clear after animation
  };

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape to pause/unpause
      if (e.code === "Escape" && game.isRoundActive) {
        e.preventDefault();
        if (game.isPaused) {
          game.send({ type: "round.resume" });
        } else {
          game.send({ type: "round.pause" });
        }
        return;
      }

      // Spacebar to play selected cards (only when not paused)
      if (
        e.code === "Space" &&
        game.isSelecting &&
        game.selectedCards.length > 0
      ) {
        e.preventDefault();
        handlePlayCards();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [game.isSelecting, game.selectedCards.length, game.isRoundActive, game.isPaused, game.send]);

  // Start game handler
  const handleStartGame = () => {
    game.send({ type: "game.start", playerCount });
  };

  // Card click handler - only one card can be selected at a time
  const handleCardClick = (cardId: string) => {
    // If not in selecting state, show feedback
    if (!game.isSelecting) {
      if (game.isCheckingCards) {
        showToast("Please wait while checking your cards...", "info");
      } else if (game.isDrawing) {
        showToast("Drawing a card...", "info");
      } else if (game.isEvaluating) {
        showToast("Evaluating the play...", "info");
      } else if (game.isChangingTurn) {
        showToast("Turn is changing...", "info");
      }
      triggerShake([cardId]);
      return;
    }

    if (game.isCardSelected(cardId)) {
      // Deselect if clicking the same card
      game.send({ type: "card.deselect", cardId });
    } else if (game.canSelectCard(cardId)) {
      // Clear previous selection and select new card
      if (game.selectedCards.length > 0) {
        game.send({ type: "card.deselect", cardId: game.selectedCards[0].id });
      }
      game.send({ type: "card.select", cardId });
    }
  };

  // Play selected cards
  const handlePlayCards = () => {
    if (game.selectedCards.length === 0) return;

    // Check if the play is valid before sending
    const isValid = canPlaySelectedCards(game.snapshot.context);

    if (!isValid) {
      // Show feedback for invalid play
      const topCard = game.topDiscard;
      const selectedCard = game.selectedCards[0];

      if (selectedCard.rank !== topCard.rank) {
        showToast(`${selectedCard.rank} doesn't match ${topCard.rank}!`, "error");
        triggerShake(game.selectedCards.map(c => c.id));
      }
      return;
    }

    // Valid play - send the event
    game.send({ type: "card.play" });
  };

  // Format timer display
  const formatTimer = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  // Render setup state (game start screen)
  if (game.isSetup) {
    return (
      <>
        {/* Bottom right controls */}
        <div className="fixed right-4 bottom-4 z-50 flex items-end gap-4">
          <SpeedControls />
          <StateTreeVisualizer currentState={game.snapshot.value} game={game} />
        </div>

        {/* GitHub link - Bottom left */}
        <div className="fixed left-4 bottom-4 z-50">
          <a
            href="https://github.com/npappag/card-state-machine"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/90 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/20 transition-colors text-xs font-mono flex items-center gap-2"
          >
            <span>🔗</span>
            <span>GitHub</span>
          </a>
        </div>

        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 to-green-900 p-4">
          <div className="flex flex-col items-center gap-6 rounded-xl bg-white p-8 shadow-2xl">
            <h1 className="text-4xl font-bold text-gray-800">
              Card Matching Game
            </h1>
            <p className="text-center text-gray-600">
              Pass-and-play card game for 2-4 players
            </p>
            <p className="text-sm text-center text-gray-500">
              Match cards by rank. First to empty their hand wins!
            </p>

            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium text-gray-700">
                Number of Players:
              </label>
              <div className="flex gap-2">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    onClick={() => setPlayerCount(count)}
                    className={`
                    rounded-lg px-6 py-3 font-semibold transition-colors
                    ${
                      playerCount === count
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }
                  `}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="mt-4 rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-700"
            >
              Start Game
            </button>
          </div>
        </div>
      </>
    );
  }

  // Render round end state
  if (game.isRoundEnd) {
    const sortedScores = Object.entries(game.roundScores).sort(
      ([, a], [, b]) => a - b
    );
    const [winnerId, winnerScore] = sortedScores[0];
    const winner = game.players.find((p) => p.id === winnerId);

    return (
      <>
        {/* Bottom right controls */}
        <div className="fixed right-4 bottom-4 z-50 flex items-end gap-4">
          <SpeedControls />
          <StateTreeVisualizer currentState={game.snapshot.value} game={game} />
        </div>

        {/* GitHub link - Bottom left */}
        <div className="fixed left-4 bottom-4 z-50">
          <a
            href="https://github.com/npappag/card-state-machine"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-black/90 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/20 transition-colors text-xs font-mono flex items-center gap-2"
          >
            <span>🔗</span>
            <span>GitHub</span>
          </a>
        </div>

        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-700 to-green-900 p-4">
          <div className="flex flex-col items-center gap-6 rounded-xl bg-white p-8 shadow-2xl">
            <h1 className="text-4xl font-bold text-gray-800">Round Over!</h1>

            <div className="flex flex-col gap-3">
              <h2 className="text-2xl font-semibold text-green-600">
                🏆 {winner?.name} Wins!
              </h2>
              <p className="text-gray-600">Score: {winnerScore} points</p>
            </div>

            <div className="w-full rounded-lg bg-gray-50 p-4">
              <h3 className="mb-3 text-lg font-semibold text-gray-700">
                Final Scores:
              </h3>
              <div className="flex flex-col gap-2">
                {sortedScores.map(([playerId, score], idx) => {
                  const player = game.players.find((p) => p.id === playerId);
                  return (
                    <div
                      key={playerId}
                      className="flex justify-between rounded-lg bg-white px-4 py-2"
                    >
                      <span className="font-medium text-gray-900">
                        {idx === 0
                          ? "🥇"
                          : idx === 1
                          ? "🥈"
                          : idx === 2
                          ? "🥉"
                          : ""}{" "}
                        {player?.name}
                      </span>
                      <span className="text-gray-700">{score} pts</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <button
              onClick={handleStartGame}
              className="mt-4 rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-700"
            >
              Play Again
            </button>
          </div>
        </div>
      </>
    );
  }

  // Render active game
  return (
    <LayoutGroup>
      {/* Bottom right controls */}
      <div className="fixed right-4 bottom-4 z-50 flex items-end gap-4">
        {/* Speed Controls - Left of visualizer */}
        <SpeedControls />

        {/* State Tree Visualizer - Right side */}
        <StateTreeVisualizer currentState={game.snapshot.value} game={game} />
      </div>

      {/* GitHub link - Bottom left */}
      <div className="fixed left-4 bottom-4 z-50">
        <a
          href="https://github.com/npappag/card-state-machine"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-black/90 hover:bg-black text-white rounded-lg px-3 py-2 border border-white/20 transition-colors text-xs font-mono flex items-center gap-2"
        >
          <span>🔗</span>
          <span>GitHub</span>
        </a>
      </div>

      <div className="flex min-h-screen flex-col bg-gradient-to-br from-green-700 to-green-900 p-4">
        {/* Header with timer and game status */}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-white/90 p-4 shadow-lg backdrop-blur">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-gray-800">
              {game.currentPlayer?.name}'s Turn
            </h2>
            <p className="text-sm text-gray-600">
              {game.isCheckingCards && "Checking cards..."}
              {game.isSelecting && "Select a matching card and press Space"}
              {game.isDrawing && "Drawing a card..."}
              {game.isEvaluating && "Evaluating..."}
              {game.isChangingTurn && "Pass device to next player..."}
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Pause Button */}
            <button
              onClick={() => game.send({ type: game.isPaused ? "round.resume" : "round.pause" })}
              className="flex items-center gap-2 rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600 transition-colors"
              aria-label={game.isPaused ? "Resume game" : "Pause game"}
            >
              <span className="text-xl">{game.isPaused ? "▶️" : "⏸"}</span>
              <span className="text-sm font-medium">{game.isPaused ? "Resume" : "Pause"}</span>
            </button>

            {/* Timer */}
            <div
              className={`
              flex flex-col items-center rounded-lg px-4 py-2
              ${
                animations.isTimerCritical
                  ? "bg-red-600 text-white"
                  : animations.isTimerLow
                  ? "bg-yellow-500 text-white"
                  : "bg-blue-600 text-white"
              }
            `}
            >
              <span className="text-xs font-medium">TIME</span>
              <span className="text-2xl font-bold">
                {formatTimer(game.timerRemainingMs)}
              </span>
            </div>
          </div>
        </div>

        {/* Game board */}
        <div className="flex flex-1 flex-col gap-6">
          {/* Center area: Deck and Discard Pile */}
          <div className="flex items-center justify-center gap-8">
            {/* Multiple options message */}
            {game.isSelecting && game.selectedCards.length === 0 && (
              <div className="rounded-lg bg-yellow-500/90 px-6 py-3 text-center shadow-lg">
                <p className="text-sm font-semibold text-white">
                  You have multiple options
                </p>
                <p className="text-xs text-white/90">
                  Click + press Space to play
                </p>
              </div>
            )}

            {/* Play Card Button */}
            {game.isSelecting && game.selectedCards.length > 0 && (
              <button
                onClick={handlePlayCards}
                className="rounded-lg bg-blue-600 px-6 py-3 text-lg font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-700"
              >
                Play Card
                <br />
                (Space)
              </button>
            )}

            {/* Deck */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold text-white">Deck</span>
              <div
                className="relative"
                style={{ width: "100px", height: "140px" }}
              >
                <DeckStack cardCount={game.deck.length} />
                {animations.shouldAnimateCardDraw && (
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0, scale: 0.7, x: 0, y: 0, rotate: -5 }}
                    animate={{
                      opacity: [0, 1, 1, 0],
                      scale: [0.7, 1.05, 1],
                      x: [0, 80, 140],
                      y: [0, 40, 120],
                      rotate: [-5, 0, 3],
                    }}
                    transition={{
                      duration: animations.timing.cardDraw / 1000,
                      ease: "easeOut",
                    }}
                  >
                    <div className="h-28 w-20 rounded-xl border-2 border-blue-400/70 bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_0_25px_rgba(59,130,246,0.5)]" />
                  </motion.div>
                )}
              </div>
            </div>

            {/* Discard Pile */}
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-semibold text-white">
                Discard Pile
              </span>
              <div style={{ width: "100px", height: "140px" }}>
                <DiscardStack discardPile={game.discardPile} />
              </div>
            </div>
          </div>

          {/* Players' hands */}
          <div className="flex flex-col gap-4">
            {game.players.map((player, idx) => {
              const isCurrentPlayer = idx === game.currentPlayerIndex;

              return (
                <div
                  key={player.id}
                  className={`
                  rounded-lg p-4 transition-colors
                  ${
                    isCurrentPlayer
                      ? "bg-blue-600/20 ring-2 ring-blue-400"
                      : "bg-white/10"
                  }
                `}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {player.name}
                    </h3>
                    <span className="text-sm text-white/80">
                      {player.hand.length} cards
                    </span>
                  </div>

                  {/* Player's hand */}
                  <div className="flex flex-wrap gap-2">
                    {player.hand.map((card) => {
                      let animState = animations.getCardAnimationState(
                        card.id
                      );
                      const isSelected = game.isCardSelected(card.id);
                      const canInteract = isCurrentPlayer && game.isSelecting;

                      // Override with shake if this card should shake
                      if (shakingCards.has(card.id)) {
                        animState = 'shake';
                      }

                      return (
                        <Card
                          key={card.id}
                          card={card}
                          isSelected={isSelected}
                          isDisabled={!canInteract}
                          animationState={animState}
                          onClick={() => handleCardClick(card.id)}
                          layoutId={card.id}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pause Overlay */}
        {game.isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
            onClick={() => game.send({ type: "round.resume" })}
          >
            <div className="flex flex-col items-center gap-6 rounded-xl bg-white p-8 shadow-2xl">
              <div className="text-6xl">⏸</div>
              <h2 className="text-3xl font-bold text-gray-800">Game Paused</h2>
              <p className="text-gray-600">Click anywhere or press Escape to continue</p>
              <button
                onClick={() => game.send({ type: "round.resume" })}
                className="rounded-lg bg-green-600 px-8 py-4 text-xl font-bold text-white shadow-lg transition-transform hover:scale-105 hover:bg-green-700"
              >
                Resume Game
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </LayoutGroup>
  );
}
