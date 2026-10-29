import { defineChain } from 'viem';
import { createConfig, createStorage, http } from 'wagmi';
import { injected } from 'wagmi/connectors';

// Guard against browser wallet extensions (e.g. Zerion, MetaMask, Rabby) throwing
// "TypeError: Cannot redefine property: isZerion" when multiple extensions inject providers
if (typeof window !== 'undefined') {
  const w = window as any;
  if (!w.__hemiWalletGuardInstalled) {
    w.__hemiWalletGuardInstalled = true;
    const origDefineProperty = Object.defineProperty;
    Object.defineProperty = function (target: any, property: PropertyKey, attributes: PropertyDescriptor & ThisType<any>) {
      try {
        if (target && (typeof target === 'object' || typeof target === 'function')) {
          const existing = Object.getOwnPropertyDescriptor(target, property);
          if (existing && !existing.configurable) {
            return target;
          }
          if (
            attributes &&
            typeof property === 'string' &&
            (property.startsWith('is') || property === 'ethereum' || property === 'providers')
          ) {
            attributes = { ...attributes, configurable: true };
          }
        }
        return origDefineProperty.call(Object, target, property, attributes);
      } catch {
        return target;
      }
    } as typeof Object.defineProperty;
  }
}

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

const customStorage = createStorage({
  storage: {
    getItem: (key) => {
      if (typeof window !== 'undefined') {
        return localStorage.getItem(key);
      }
      return null;
    },
    setItem: (key, value) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    },
    removeItem: (key) => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(key);
      }
    },
  },
});

export const wagmiConfig = createConfig({
  chains: [hemiSepolia],
  connectors: [
    injected({
      shimDisconnect: true,
    }),
  ],
  transports: {
    [hemiSepolia.id]: http('https://testnet.rpc.hemi.network/rpc'),
  },
  ssr: true,
  storage: customStorage,
  multiInjectedProviderDiscovery: true,
});

