import React, { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { CardsDrawnEvent, CardPlayedEvent, Card, CardColor, isWildCard, isActionCard } from '@/types/uno';
import { CardComponent } from './CardComponent';
import { soundEngine } from '@/lib/uno/audio';

interface CardTransferAnimationProps {
  socket: Socket | null;
  myPlayerId: string;
}

interface FlyingCard {
  id: string;
  delayMs: number;
  rotation: number;
}

interface ActiveTransferBatch {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  count: number;
  isPenalty: boolean;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  cards: FlyingCard[];
}

interface ActivePlayAnimation {
  id: string;
  playerId: string;
  playerName: string;
  playerAvatar: string;
  card: Card;
  chosenColor?: CardColor;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  rotation: number;
  isWild: boolean;
  isAction: boolean;
}

const COLOR_THEME: Record<string, { badgeBg: string; ring: string; text: string }> = {
  red: { badgeBg: 'bg-gradient-to-r from-rose-600 to-red-500', ring: 'ring-rose-500/50', text: 'text-white' },
  blue: { badgeBg: 'bg-gradient-to-r from-blue-600 to-cyan-500', ring: 'ring-blue-500/50', text: 'text-white' },
  green: { badgeBg: 'bg-gradient-to-r from-emerald-600 to-teal-500', ring: 'ring-emerald-500/50', text: 'text-white' },
  yellow: { badgeBg: 'bg-gradient-to-r from-amber-500 to-yellow-400', ring: 'ring-amber-400/50', text: 'text-slate-950' },
  wild: { badgeBg: 'bg-gradient-to-r from-purple-600 via-pink-500 to-amber-500', ring: 'ring-purple-400/60', text: 'text-white' },
};

export const CardTransferAnimation: React.FC<CardTransferAnimationProps> = ({ socket, myPlayerId }) => {
  const [drawBatches, setDrawBatches] = useState<ActiveTransferBatch[]>([]);
  const [playAnimations, setPlayAnimations] = useState<ActivePlayAnimation[]>([]);

  useEffect(() => {
    if (!socket) return;

    // 1. ANIMATE CARDS DRAWN (Deck -> Hand / Seat)
    const handleCardsDrawn = (data: CardsDrawnEvent) => {
      let startX = window.innerWidth * 0.35;
      let startY = window.innerHeight * 0.45;

      const deckEl = document.getElementById('draw-deck-pile');
      if (deckEl) {
        const rect = deckEl.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      }

      let targetX = window.innerWidth / 2;
      let targetY = window.innerHeight - 90;

      if (data.playerId === myPlayerId) {
        const handEl = document.getElementById('player-hand-container');
        if (handEl) {
          const rect = handEl.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
        }
      } else {
        const seatEl = document.getElementById(`opponent-seat-${data.playerId}`);
        if (seatEl) {
          const rect = seatEl.getBoundingClientRect();
          targetX = rect.left + rect.width / 2;
          targetY = rect.top + rect.height / 2;
        } else {
          targetX = window.innerWidth / 2;
          targetY = 100;
        }
      }

      const count = Math.max(1, data.count);
      const stagger = count > 6 ? 60 : count > 2 ? 80 : 120;
      const cards: FlyingCard[] = [];

      for (let i = 0; i < count; i++) {
        const delayMs = i * stagger;
        cards.push({
          id: `${data.id}_c_${i}`,
          delayMs,
          rotation: (Math.random() - 0.5) * 30,
        });

        setTimeout(() => {
          soundEngine.play('draw');
        }, delayMs);
      }

      const batch: ActiveTransferBatch = {
        id: data.id,
        playerId: data.playerId,
        playerName: data.playerName,
        playerAvatar: data.playerAvatar,
        count,
        isPenalty: data.isPenalty,
        startX,
        startY,
        targetX,
        targetY,
        cards,
      };

      setDrawBatches(prev => [...prev, batch]);

      const totalDuration = count * stagger + 900;
      setTimeout(() => {
        setDrawBatches(prev => prev.filter(b => b.id !== data.id));
      }, totalDuration);
    };

    // 2. ANIMATE CARD PLAYED (Hand / Seat -> Center Discard Pile)
    const handleCardPlayed = (data: CardPlayedEvent) => {
      // Determine origin coordinates (Seat or Local Hand)
      let startX = window.innerWidth / 2;
      let startY = window.innerHeight - 90;

      if (data.playerId === myPlayerId) {
        const handEl = document.getElementById('player-hand-container');
        if (handEl) {
          const rect = handEl.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        }
      } else {
        const seatEl = document.getElementById(`opponent-seat-${data.playerId}`);
        if (seatEl) {
          const rect = seatEl.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
        } else {
          startX = window.innerWidth / 2;
          startY = 100;
        }
      }

      // Determine destination coordinates (Center Discard Pile)
      let targetX = window.innerWidth * 0.58;
      let targetY = window.innerHeight * 0.48;

      const discardEl = document.getElementById('center-discard-pile');
      if (discardEl) {
        const rect = discardEl.getBoundingClientRect();
        targetX = rect.left + rect.width / 2;
        targetY = rect.top + rect.height / 2;
      }

      const isWild = isWildCard(data.card);
      const isAction = isActionCard(data.card);

      const playItem: ActivePlayAnimation = {
        id: data.id,
        playerId: data.playerId,
        playerName: data.playerName,
        playerAvatar: data.playerAvatar,
        card: data.card,
        chosenColor: data.chosenColor,
        startX,
        startY,
        targetX,
        targetY,
        rotation: (Math.random() - 0.5) * 16,
        isWild,
        isAction,
      };

      setPlayAnimations(prev => [...prev, playItem]);

      // Sound sync
      if (isWild) {
        soundEngine.play('wild');
      } else if (isAction) {
        soundEngine.play('special');
      } else {
        soundEngine.play('play');
      }

      // Cleanup play animation after flight and settle
      setTimeout(() => {
        setPlayAnimations(prev => prev.filter(p => p.id !== data.id));
      }, 750);
    };

    socket.on('game:cards_drawn', handleCardsDrawn);
    socket.on('game:card_played', handleCardPlayed);

    return () => {
      socket.off('game:cards_drawn', handleCardsDrawn);
      socket.off('game:card_played', handleCardPlayed);
    };
  }, [socket, myPlayerId]);

  const hasContent = drawBatches.length > 0 || playAnimations.length > 0;
  if (!hasContent) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {/* ===================== 1. CARDS DRAWN ANIMATIONS ===================== */}
        {drawBatches.map(batch => {
          const badgeX = (batch.startX + batch.targetX) / 2;
          const badgeY = Math.min(batch.startY, batch.targetY) + Math.abs(batch.startY - batch.targetY) * 0.35 - 30;

          return (
            <React.Fragment key={batch.id}>
              {/* Floating Count Badge above the transfer arc */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 15 }}
                animate={{ opacity: 1, scale: 1.1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.3 }}
                style={{
                  position: 'absolute',
                  left: badgeX,
                  top: badgeY,
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-50"
              >
                <div
                  className={`
                    px-4 py-2 rounded-full font-black text-xs sm:text-sm shadow-2xl flex items-center gap-2 border-2
                    ${
                      batch.count >= 4
                        ? 'bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 text-white border-white ring-4 ring-rose-500/40'
                        : batch.count >= 2
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-white border-white ring-2 ring-amber-400/40'
                        : 'bg-slate-900/90 text-amber-300 border-amber-400/80 backdrop-blur-md'
                    }
                  `}
                >
                  <span className="text-base sm:text-lg">{batch.playerAvatar}</span>
                  <span className="tracking-wide">
                    {batch.count >= 4
                      ? `💥 +${batch.count} CARDS SMASH!`
                      : batch.count >= 2
                      ? `⚡ +${batch.count} CARDS DRAW!`
                      : `+1 CARD DRAW`}
                  </span>
                </div>
              </motion.div>

              {/* Individual Staggered Flying Cards */}
              {batch.cards.map((card, idx) => {
                const midX = (batch.startX + batch.targetX) / 2 + (Math.random() - 0.5) * 40;
                const midY = Math.min(batch.startY, batch.targetY) - 50 + (idx % 2 === 0 ? -20 : 20);

                return (
                  <motion.div
                    key={card.id}
                    initial={{
                      x: batch.startX - 32,
                      y: batch.startY - 48,
                      scale: 0.85,
                      opacity: 0,
                      rotate: 0,
                    }}
                    animate={{
                      x: [batch.startX - 32, midX - 32, batch.targetX - 32],
                      y: [batch.startY - 48, midY - 48, batch.targetY - 48],
                      scale: [0.85, 1.15, 0.7],
                      opacity: [0, 1, 0.95],
                      rotate: [0, card.rotation * 1.5, card.rotation * 3],
                    }}
                    transition={{
                      duration: 0.65,
                      delay: card.delayMs / 1000,
                      ease: [0.22, 1, 0.36, 1],
                    }}
                    style={{
                      position: 'absolute',
                      width: '64px',
                      height: '96px',
                    }}
                    className="will-change-transform z-40 filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)]"
                  >
                    <CardComponent
                      card={{ id: 'back', color: 'red', value: '0', label: 'Crazy 8' }}
                      isBack
                      size="xs"
                    />
                  </motion.div>
                );
              })}

              {/* Impact Flash Ring at Target on Final Arrival */}
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.3, 1.8, 2.2] }}
                transition={{
                  delay: (batch.count * (batch.count > 6 ? 60 : batch.count > 2 ? 80 : 120) + 300) / 1000,
                  duration: 0.5,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  left: batch.targetX,
                  top: batch.targetY,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`
                  w-24 h-24 rounded-full pointer-events-none z-30
                  ${batch.count >= 4 ? 'bg-rose-500/40 ring-4 ring-rose-400' : 'bg-amber-400/40 ring-2 ring-amber-300'}
                `}
              />
            </React.Fragment>
          );
        })}

        {/* ===================== 2. CARDS PLAYED ANIMATIONS ===================== */}
        {playAnimations.map(play => {
          const midX = (play.startX + play.targetX) / 2 + (Math.random() - 0.5) * 30;
          // Natural arc: if playing downwards from top seat, arc down naturally; if playing from bottom, arc up slightly
          const isPlayingFromTop = play.startY < play.targetY;
          const rawMidY = isPlayingFromTop
            ? play.startY + (play.targetY - play.startY) * 0.4 - 15
            : play.targetY + (play.startY - play.targetY) * 0.35 - 35;
          // Guarantee it never enters the top header region (y >= 130)
          const midY = Math.max(130, rawMidY);
          const theme = COLOR_THEME[play.card.color] || COLOR_THEME.wild;

          return (
            <React.Fragment key={play.id}>
              {/* Floating Play Action Pill above the trajectory */}
              <motion.div
                initial={{ opacity: 0, scale: 0.6, y: 12 }}
                animate={{ opacity: 1, scale: 1.05, y: 0 }}
                exit={{ opacity: 0, scale: 0.85, y: -10 }}
                transition={{ duration: 0.25 }}
                style={{
                  position: 'absolute',
                  left: midX,
                  top: Math.max(95, midY - 35),
                  transform: 'translate(-50%, -50%)',
                }}
                className="z-50"
              >
                <div
                  className={`
                    px-3.5 py-1.5 rounded-full font-black text-xs shadow-2xl flex items-center gap-2 border-2 border-white/90
                    ${theme.badgeBg} ${theme.text} ${theme.ring} ring-4 backdrop-blur-md
                  `}
                >
                  <span className="text-sm sm:text-base">{play.playerAvatar}</span>
                  <span className="font-extrabold tracking-tight">{play.playerName}</span>
                  <span className="opacity-80 text-[10px] uppercase font-bold">played</span>
                  <span className="font-black underline decoration-2">{play.card.label}</span>
                  {play.chosenColor && (
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] font-black uppercase text-white border border-white/40">
                      {play.chosenColor}
                    </span>
                  )}
                </div>
              </motion.div>

              {/* The Actual Flying Card */}
              <motion.div
                initial={{
                  x: play.startX - 36,
                  y: play.startY - 54,
                  scale: 0.75,
                  opacity: 0,
                  rotate: -15,
                }}
                animate={{
                  x: [play.startX - 36, midX - 36, play.targetX - 36],
                  y: [play.startY - 54, midY - 54, play.targetY - 54],
                  scale: [0.75, 1.25, 1.0],
                  opacity: [0, 1, 1],
                  rotate: [-15, play.rotation * 1.8, play.rotation],
                }}
                transition={{
                  duration: 0.58,
                  ease: [0.22, 1, 0.36, 1],
                }}
                style={{
                  position: 'absolute',
                  width: '72px',
                  height: '108px',
                }}
                className="will-change-transform z-50 filter drop-shadow-[0_16px_32px_rgba(0,0,0,0.85)]"
              >
                <CardComponent
                  card={play.card}
                  size="sm"
                  isPlayable={false}
                  className="shadow-2xl ring-2 ring-white/80"
                />
              </motion.div>

              {/* Slam Impact Wave on Discard Pile Landing */}
              <motion.div
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: [0, 0.9, 0], scale: [0.4, 2.0, 2.6] }}
                transition={{
                  delay: 0.45,
                  duration: 0.45,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  left: play.targetX,
                  top: play.targetY,
                  transform: 'translate(-50%, -50%)',
                }}
                className={`
                  w-28 h-28 rounded-full pointer-events-none z-40
                  ${play.isWild ? 'bg-purple-500/50 ring-4 ring-purple-300' : play.isAction ? 'bg-amber-400/50 ring-4 ring-amber-300' : 'bg-blue-400/40 ring-2 ring-blue-300'}
                `}
              />
            </React.Fragment>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
