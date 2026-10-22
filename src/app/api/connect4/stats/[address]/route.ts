import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';

const HEMI_SEPOLIA_RPC = 'https://testnet.rpc.hemi.network/rpc';

const CONTRACT_ADDRESS = (
  process.env.HEMI_CONNECT4_ELO_ADDRESS ||
  process.env.NEXT_PUBLIC_HEMI_CONNECT4_ELO_ADDRESS ||
  '0xfe6dc2c29b9f0e83c229a9a3deb1c89cde81afa3'
).trim();

const CONNECT4_ABI = [
  'function getPlayerStats(address player) external view returns (uint256 elo, uint256 wins, uint256 losses, uint256 totalGames, uint256 currentStreak, uint256 bestStreak)',
];

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;
    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json({
        success: true,
        stats: {
          address,
          elo: 1200,
          wins: 0,
          losses: 0,
          totalGames: 0,
          currentStreak: 0,
          bestStreak: 0,
        },
      });
    }

    const network = ethers.Network.from({
      chainId: 743111,
      name: 'hemi-sepolia',
    });
    const provider = new ethers.JsonRpcProvider(HEMI_SEPOLIA_RPC, network, {
      staticNetwork: network,
    });
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONNECT4_ABI, provider);

    const data = await contract.getPlayerStats(address);

    const stats = {
      address,
      elo: Number(data[0] || 1200),
      wins: Number(data[1] || 0),
      losses: Number(data[2] || 0),
      totalGames: Number(data[3] || 0),
      currentStreak: Number(data[4] || 0),
      bestStreak: Number(data[5] || 0),
    };

    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    console.warn('[API:Connect4Stats] Read error:', err.message);
    return NextResponse.json({
      success: true,
      stats: {
        address: '',
        elo: 1200,
        wins: 0,
        losses: 0,
        totalGames: 0,
        currentStreak: 0,
        bestStreak: 0,
      },
    });
  }
}
