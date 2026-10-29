import { defineChain } from 'viem';
import { wagmiConfig, hemiSepolia } from '@/lib/web3/config';

// Define Hemi Testnet (original - mainnet testnet)
export const hemiTestnet = defineChain({
  id: 743111,
  name: 'Hemi Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: {
      http: ['https://testnet.rpc.hemi.network/rpc'],
    },
    public: {
      http: ['https://testnet.rpc.hemi.network/rpc'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Hemi Explorer',
      url: 'https://testnet.explorer.hemi.xyz',
    },
  },
  testnet: true,
});

export { hemiSepolia };
export const config = wagmiConfig;

