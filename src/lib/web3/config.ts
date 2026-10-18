import { defineChain } from 'viem';
import { createConfig, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

// Hemi Sepolia Testnet definition
export const hemiSepolia = defineChain({
  id: 743111,
  name: 'Hemi Sepolia',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
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
      url: 'https://testnet.explorer.hemi.network',
    },
  },
  testnet: true,
});

export const wagmiConfig = createConfig({
  chains: [hemiSepolia],
  connectors: [
    injected({
      target: 'metaMask',
    }),
  ],
  transports: {
    [hemiSepolia.id]: http(),
  },
  ssr: true,
});
