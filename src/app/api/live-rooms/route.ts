import { NextResponse } from 'next/server';

const BOT_PRACTICE_ROOMS = [
  {
    roomId: 'room_pub_clsc',
    roomCode: 'CLSC',
    status: 'lobby',
    playerCount: 3,
    maxPlayers: 5,
    spectatorCount: 0,
    mode: 'Classic',
    description: 'The original. 2-4 players.',
    hostName: 'LumiBear',
    hostAvatar: '🐻',
    players: [
      { id: 'host_clsc', name: 'LumiBear', avatar: '🐻', isBot: true },
      { id: 'bot_1', name: 'Bot 1', avatar: '🤖', isBot: true },
      { id: 'bot_2', name: 'Bot 2', avatar: '🦁', isBot: true },
    ],
    activeColor: 'RED',
    topDiscardCard: null,
    escrowPot: {
      amount: '0.000',
      currency: 'CRAZY8',
      buyInAmount: '0.000',
    },
    isQuickMatch: false,
  },
  {
    roomId: 'room_pub_stck',
    roomCode: 'STCK',
    status: 'lobby',
    playerCount: 2,
    maxPlayers: 5,
    spectatorCount: 0,
    mode: 'Stacked Draw',
    description: 'Stack it. Survive it.',
    hostName: 'NeoDash',
    hostAvatar: '🤖',
    players: [
      { id: 'host_stck', name: 'NeoDash', avatar: '🤖', isBot: true },
      { id: 'bot_1', name: 'Bot 1', avatar: '🦊', isBot: true },
    ],
    activeColor: 'BLUE',
    topDiscardCard: null,
    escrowPot: {
      amount: '0.000',
      currency: 'CRAZY8',
      buyInAmount: '0.000',
    },
    isQuickMatch: false,
  },
  {
    roomId: 'room_pub_team',
    roomCode: 'TEAM',
    status: 'lobby',
    playerCount: 3,
    maxPlayers: 5,
    spectatorCount: 0,
    mode: '2v2 Team',
    description: 'Team up. Take over.',
    hostName: 'Zyro',
    hostAvatar: '🦊',
    players: [
      { id: 'host_team', name: 'Zyro', avatar: '🦊', isBot: true },
      { id: 'bot_1', name: 'Bot Alpha', avatar: '🦁', isBot: true },
      { id: 'bot_2', name: 'Bot Beta', avatar: '🐸', isBot: true },
    ],
    activeColor: 'GREEN',
    topDiscardCard: null,
    escrowPot: {
      amount: '0.000',
      currency: 'CRAZY8',
      buyInAmount: '0.000',
    },
    isQuickMatch: false,
  },
  {
    roomId: 'room_pub_fast',
    roomCode: 'FAST',
    status: 'lobby',
    playerCount: 2,
    maxPlayers: 5,
    spectatorCount: 0,
    mode: 'Speed 8',
    description: 'Fast rounds, less waiting.',
    hostName: 'Tobz',
    hostAvatar: '🐱',
    players: [
      { id: 'host_fast', name: 'Tobz', avatar: '🐱', isBot: true },
      { id: 'bot_1', name: 'Bot 1', avatar: '💎', isBot: true },
    ],
    activeColor: 'YELLOW',
    topDiscardCard: null,
    escrowPot: {
      amount: '0.000',
      currency: 'CRAZY8',
      buyInAmount: '0.000',
    },
    isQuickMatch: false,
  },
];

export async function GET() {
  return NextResponse.json({
    rooms: BOT_PRACTICE_ROOMS,
  });
}
