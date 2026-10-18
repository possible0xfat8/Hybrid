/**
 * Standard Elo Rating Calculation (Backend)
 * Formula: E_A = 1 / (1 + 10^((R_B - R_A) / 400))
 * New Rating: R_A' = R_A + K * (S_A - E_A)
 */

export const K_FACTOR = 32;

export function calculateExpectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

export function calculateEloChange(
  playerRating: number,
  opponentRating: number,
  outcome: 'win' | 'loss' | 'draw'
): { newRating: number; change: number } {
  let actualScore: number;
  switch (outcome) {
    case 'win':
      actualScore = 1;
      break;
    case 'draw':
      actualScore = 0.5;
      break;
    case 'loss':
      actualScore = 0;
      break;
    default:
      throw new Error(`Invalid outcome: ${outcome}`);
  }

  const expectedScore = calculateExpectedScore(playerRating, opponentRating);
  const change = Math.round(K_FACTOR * (actualScore - expectedScore));
  const newRating = Math.max(0, playerRating + change);

  return {
    newRating,
    change,
  };
}

export function calculateMatchElo(
  whiteRating: number,
  blackRating: number,
  winner: 'white' | 'black' | 'draw'
): {
  white: { newRating: number; change: number };
  black: { newRating: number; change: number };
} {
  let whiteOutcome: 'win' | 'loss' | 'draw';
  let blackOutcome: 'win' | 'loss' | 'draw';

  if (winner === 'white') {
    whiteOutcome = 'win';
    blackOutcome = 'loss';
  } else if (winner === 'black') {
    whiteOutcome = 'loss';
    blackOutcome = 'win';
  } else if (winner === 'draw') {
    whiteOutcome = 'draw';
    blackOutcome = 'draw';
  } else {
    throw new Error(`Invalid winner: ${winner}`);
  }

  return {
    white: calculateEloChange(whiteRating, blackRating, whiteOutcome),
    black: calculateEloChange(blackRating, whiteRating, blackOutcome),
  };
}

export function getAbsoluteEloDelta(eloChange: number): number {
  return Math.abs(eloChange);
}
