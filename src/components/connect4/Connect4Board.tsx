'use client';

import React, { useState } from 'react';
import { c4Audio } from '@/lib/connect4/audio';

export const ROWS = 6;
export const COLS = 7;

export type CellValue = 0 | 1 | 2;

interface Connect4BoardProps {
  board: CellValue[][];
  myPlayerNumber: 1 | 2 | null;
  currentTurn: 1 | 2;
  winningLine: [number, number][] | null;
  onDropDisc: (col: number) => void;
  disabled?: boolean;
}

export const Connect4Board: React.FC<Connect4BoardProps> = ({
  board,
  myPlayerNumber,
  currentTurn,
  winningLine,
  onDropDisc,
  disabled = false,
}) => {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const isMyTurn = myPlayerNumber !== null && myPlayerNumber === currentTurn && !disabled;

  const isWinningCell = (r: number, c: number) => {
    if (!winningLine) return false;
    return winningLine.some(([wr, wc]) => wr === r && wc === c);
  };

  const handleColumnClick = (col: number) => {
    if (!isMyTurn) return;
    // Check if column is full
    if (board[0][col] !== 0) return;

    c4Audio.playDrop(myPlayerNumber === 1 ? 320 : 260);
    onDropDisc(col);
  };

  return (
    <div className="flex flex-col items-center select-none w-full max-w-xl mx-auto px-1 sm:px-0">
      {/* ── Top Hover Drop Indicators ── */}
      <div className="grid grid-cols-7 gap-1.5 xs:gap-2 sm:gap-3 w-full px-2.5 sm:px-6 mb-1.5 sm:mb-2 h-8 sm:h-12 items-center">
        {Array.from({ length: COLS }).map((_, col) => {
          const isColFull = board[0][col] !== 0;
          const showHover = isMyTurn && hoveredCol === col && !isColFull;

          return (
            <div
              key={col}
              className="flex items-center justify-center h-full cursor-pointer"
              onClick={() => handleColumnClick(col)}
              onMouseEnter={() => {
                if (isMyTurn && !isColFull) {
                  setHoveredCol(col);
                  c4Audio.playClick();
                }
              }}
              onMouseLeave={() => setHoveredCol(null)}
            >
              {showHover && (
                <div
                  className={`w-6 h-6 sm:w-9 sm:h-9 rounded-full shadow-lg animate-bounce transition-all ${
                    myPlayerNumber === 1
                      ? 'bg-gradient-to-tr from-[#FF4600] to-[#FF7733] border-2 border-white shadow-[0_0_16px_rgba(255,70,0,0.6)]'
                      : 'bg-gradient-to-tr from-[#F59E0B] to-[#FCD34D] border-2 border-white shadow-[0_0_16px_rgba(245,158,11,0.6)]'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── The 7x6 3D Obsidian Grid Frame ── */}
      <div className="relative w-full p-2.5 xs:p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-b from-[#12161F] via-[#0E1218] to-[#0A0D12] border-2 sm:border-4 border-[#FF4600]/30 shadow-[0_12px_40px_rgba(0,0,0,0.8),0_0_24px_rgba(255,70,0,0.15)]">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-[radial-gradient(circle_at_50%_0%,rgba(255,70,0,0.12)_0%,transparent_60%)] pointer-events-none" />

        {/* The Grid */}
        <div className="grid grid-cols-7 gap-1.5 xs:gap-2 sm:gap-3 relative z-10">
          {Array.from({ length: COLS }).map((_, col) => {
            const isColHovered = isMyTurn && hoveredCol === col;
            const isColFull = board[0][col] !== 0;

            return (
              <div
                key={col}
                onClick={() => handleColumnClick(col)}
                onMouseEnter={() => {
                  if (isMyTurn && !isColFull) setHoveredCol(col);
                }}
                onMouseLeave={() => setHoveredCol(null)}
                className={`flex flex-col gap-2 sm:gap-3 p-1 rounded-2xl transition-colors cursor-pointer ${
                  isColHovered ? 'bg-white/[0.04]' : ''
                }`}
              >
                {Array.from({ length: ROWS }).map((_, row) => {
                  const val = board[row][col];
                  const winning = isWinningCell(row, col);

                  return (
                    <div
                      key={row}
                      className="relative aspect-square w-full rounded-full bg-[#07090C] border-2 border-[#1E2530] flex items-center justify-center shadow-inner overflow-hidden"
                    >
                      {/* Empty Hole Shadow Depth */}
                      {val === 0 && (
                        <div className="w-full h-full rounded-full shadow-[inset_0_4px_8px_rgba(0,0,0,0.9)] opacity-80" />
                      )}

                      {/* Disc 1: Hemi Red-Orange */}
                      {val === 1 && (
                        <div
                          className={`w-full h-full rounded-full flex items-center justify-center p-1 transition-all duration-300 animate-in fade-in zoom-in-75 ${
                            winning
                              ? 'bg-gradient-to-tr from-[#FF4600] to-[#FF7A00] border-2 border-white shadow-[0_0_24px_#FF4600] animate-pulse scale-105'
                              : 'bg-gradient-to-tr from-[#FF3300] via-[#FF4600] to-[#FF6B35] border border-white/40 shadow-[0_4px_12px_rgba(255,70,0,0.4)]'
                          }`}
                        >
                          {/* Inner Disc Styling */}
                          <div className="w-3/5 h-3/5 rounded-full border border-white/30 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                          </div>
                        </div>
                      )}

                      {/* Disc 2: Cyber Gold */}
                      {val === 2 && (
                        <div
                          className={`w-full h-full rounded-full flex items-center justify-center p-1 transition-all duration-300 animate-in fade-in zoom-in-75 ${
                            winning
                              ? 'bg-gradient-to-tr from-[#F59E0B] to-[#FDE047] border-2 border-white shadow-[0_0_24px_#F59E0B] animate-pulse scale-105'
                              : 'bg-gradient-to-tr from-[#D97706] via-[#F59E0B] to-[#FCD34D] border border-white/40 shadow-[0_4px_12px_rgba(245,158,11,0.4)]'
                          }`}
                        >
                          {/* Inner Disc Styling */}
                          <div className="w-3/5 h-3/5 rounded-full border border-white/30 flex items-center justify-center">
                            <div className="w-2.5 h-2.5 rounded-full bg-white/40" />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Base Stand Legs ── */}
      <div className="flex justify-between w-[92%] -mt-1 z-0">
        <div className="w-10 sm:w-14 h-4 sm:h-5 bg-gradient-to-b from-[#12161F] to-[#0A0D12] rounded-b-xl border-x-2 border-b-2 border-[#FF4600]/20 shadow-md" />
        <div className="w-10 sm:w-14 h-4 sm:h-5 bg-gradient-to-b from-[#12161F] to-[#0A0D12] rounded-b-xl border-x-2 border-b-2 border-[#FF4600]/20 shadow-md" />
      </div>
    </div>
  );
};
