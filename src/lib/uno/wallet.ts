/**
 * Hemi Network Configuration & Web3 Wallet Helper
 * Primary target: Hemi Sepolia Testnet (Chain ID 743111 / 0xb56c7)
 * Also supports: Hemi Mainnet (Chain ID 43111 / 0xa867)
 * Native Token: ETH
 */

export interface ChainConfig {
  chainId: string;
  chainIdDecimal: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const HEMI_SEPOLIA_CONFIG: ChainConfig = {
  chainId: '0xb56c7', // 743111 in hex
  chainIdDecimal: 743111,
  chainName: 'Hemi Sepolia',
  nativeCurrency: {
    name: 'Sepolia Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://testnet.rpc.hemi.network/rpc'],
  blockExplorerUrls: ['https://testnet.explorer.hemi.xyz'],
};

export const HEMI_MAINNET_CONFIG: ChainConfig = {
  chainId: '0xa867', // 43111 in hex
  chainIdDecimal: 43111,
  chainName: 'Hemi Network',
  nativeCurrency: {
    name: 'Ether',
    symbol: 'ETH',
    decimals: 18,
  },
  rpcUrls: ['https://rpc.hemi.network/rpc'],
  blockExplorerUrls: ['https://explorer.hemi.xyz'],
};

// Default target chain for the dApp
export const DEFAULT_HEMI_CONFIG = HEMI_SEPOLIA_CONFIG;

export interface WalletState {
  address: string | null;
  chainId: number | null;
  balance: string | null;
  isConnecting: boolean;
  error: string | null;
  walletName: string | null;
}

/**
 * Check if the chain ID belongs to Hemi (Sepolia Testnet or Mainnet)
 */
export function isHemiChain(chainId: number | null | undefined): boolean {
  if (!chainId) return false;
  return (
    chainId === HEMI_SEPOLIA_CONFIG.chainIdDecimal ||
    chainId === HEMI_MAINNET_CONFIG.chainIdDecimal
  );
}

/**
 * Get human-readable network info for Hemi
 */
export function getHemiNetworkInfo(chainId: number | null | undefined): {
  isHemi: boolean;
  name: string;
  isTestnet: boolean;
  explorerUrl: string;
  symbol: string;
} {
  if (chainId === HEMI_SEPOLIA_CONFIG.chainIdDecimal) {
    return {
      isHemi: true,
      name: 'Hemi Sepolia',
      isTestnet: true,
      explorerUrl: 'https://testnet.explorer.hemi.xyz',
      symbol: 'ETH',
    };
  }
  if (chainId === HEMI_MAINNET_CONFIG.chainIdDecimal) {
    return {
      isHemi: true,
      name: 'Hemi Mainnet',
      isTestnet: false,
      explorerUrl: 'https://explorer.hemi.xyz',
      symbol: 'ETH',
    };
  }
  return {
    isHemi: false,
    name: 'Wrong Network',
    isTestnet: false,
    explorerUrl: 'https://testnet.explorer.hemi.xyz',
    symbol: 'ETH',
  };
}

/**
 * Shorten Ethereum/Hemi address for UI display
 */
export function formatAddress(address: string | null | undefined): string {
  if (!address) return '';
  if (address.length < 10) return address;
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

// ============================================================================
// EIP-6963: Multi Injected Provider Discovery & Wallet Registry
// ============================================================================

export interface EIP6963ProviderInfo {
  uuid: string;
  name: string;
  icon: string;
  rdns: string;
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo;
  provider: any;
}

export interface EIP6963AnnounceProviderEvent extends CustomEvent {
  type: 'eip6963:announceProvider';
  detail: EIP6963ProviderDetail;
}

export interface DiscoveredWallet {
  id: string;
  name: string;
  icon: string;
  rdns?: string;
  provider?: any;
  isInstalled: boolean;
  installUrl?: string;
  description?: string;
  isEIP6963?: boolean;
}

export const POPULAR_WALLETS = [
  {
    id: 'io.metamask',
    rdns: 'io.metamask',
    name: 'MetaMask',
    installUrl: 'https://metamask.io/download/',
    description: 'The most popular Ethereum & EVM wallet',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 318.6 318.6"><path fill="%23E2761B" stroke="%23E2761B" stroke-linecap="round" stroke-linejoin="round" d="M274.1 35.5l-99.5 73.9L193 65.8z"/><path fill="%23E4761B" stroke="%23E4761B" stroke-linecap="round" stroke-linejoin="round" d="M44.4 35.5l98.7 74.6-17.5-44.3z"/><path fill="%23D7C1B3" stroke="%23D7C1B3" stroke-linecap="round" stroke-linejoin="round" d="M260.6 206.5l-33.8 28.5 40.5 13.9 12.6-41.8zM57.9 206.5l-19.3.6 12.6 41.8 40.5-13.9z"/><path fill="%23233447" stroke="%23233447" stroke-linecap="round" stroke-linejoin="round" d="M106.8 205.1l-24.6-7.8-19.3.6 23.3 22.8 19.3-15.1zM211.7 205.1l1.3.5 19.3 15.1 23.3-22.8-19.3-.6z"/><path fill="%23CD6116" stroke="%23CD6116" stroke-linecap="round" stroke-linejoin="round" d="M82.2 197.3l24.6 7.8 1.3-.5-1-29.2-24.9 21.9zM210.4 175.4l-1 29.2 1.3.5 24.6-7.8-24.9-21.9z"/><path fill="%23E4751F" stroke="%23E4751F" stroke-linecap="round" stroke-linejoin="round" d="M107.1 174.9l-24.9 21.9 24.6 7.8 30.6-23.7zM211.4 174.9l-29.3 6 30.6 23.7 24.6-7.8z"/><path fill="%23E4761B" stroke="%23E4761B" stroke-linecap="round" stroke-linejoin="round" d="M82.2 197.3l24.9-21.9H76.7zM236.4 175.4h-30.4l24.9 21.9z"/><path fill="%23F6851B" stroke="%23F6851B" stroke-linecap="round" stroke-linejoin="round" d="M193 65.8l-18.4 43.6 57.3 48.7 42.2-122.6zM44.4 35.5l42.2 122.6 57.3-48.7-18.4-43.6z"/><path fill="%23C0AD9E" stroke="%23C0AD9E" stroke-linecap="round" stroke-linejoin="round" d="M260.6 206.5l-19.3-.6-23.3 22.8 9.5 20.2 33.1-42.4zM57.9 206.5l-.6.5 33.1 42.4 9.5-20.2-23.3-22.8z"/><path fill="%23161616" stroke="%23161616" stroke-linecap="round" stroke-linejoin="round" d="M128.4 250.7l-27.9-1.9 8.9 18.5 27.2-16.6zm61.8 0l-8.2 0 27.2 16.6 8.9-18.5z"/><path fill="%23763D16" stroke="%23763D16" stroke-linecap="round" stroke-linejoin="round" d="M100.5 248.8l27.9 1.9 8.2 0 14.5-12.2-28.7-12.9zm117.6 0l-21.9-23.2-28.7 12.9 14.5 12.2 8.2 0z"/><path fill="%23F6851B" stroke="%23F6851B" stroke-linecap="round" stroke-linejoin="round" d="M159.3 218.5l-14.5-12.2H128l-19.6 15.3 21.9 23.2 29-26.3zm0 0l29 26.3 21.9-23.2-19.6-15.3h-16.8z"/></svg>',
  },
  {
    id: 'com.okex.wallet',
    rdns: 'com.okex.wallet',
    name: 'OKX Wallet',
    installUrl: 'https://www.okx.com/web3',
    description: 'Leading multi-chain Web3 portal',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23000000"/><rect x="25" y="25" width="22" height="22" rx="4" fill="%23FFFFFF"/><rect x="53" y="25" width="22" height="22" rx="4" fill="%23FFFFFF"/><rect x="25" y="53" width="22" height="22" rx="4" fill="%23FFFFFF"/><rect x="53" y="53" width="22" height="22" rx="4" fill="%23FFFFFF"/><rect x="39" y="39" width="22" height="22" rx="4" fill="%23000000"/></svg>',
  },
  {
    id: 'io.rabby',
    rdns: 'io.rabby',
    name: 'Rabby Wallet',
    installUrl: 'https://rabby.io/',
    description: 'The game-changing Web3 wallet for DeFi',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%238697FF"/><path d="M28 68c0-18 12-32 22-32s22 14 22 32" stroke="%23FFFFFF" stroke-width="12" stroke-linecap="round" fill="none"/><circle cx="40" cy="46" r="5" fill="%23FFFFFF"/><circle cx="60" cy="46" r="5" fill="%23FFFFFF"/></svg>',
  },
  {
    id: 'com.coinbase.wallet',
    rdns: 'com.coinbase.wallet',
    name: 'Coinbase Wallet',
    installUrl: 'https://www.coinbase.com/wallet/downloads',
    description: 'Self-custodial crypto wallet by Coinbase',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%230052FF"/><circle cx="50" cy="50" r="26" fill="%23FFFFFF"/><rect x="42" y="42" width="16" height="16" rx="3" fill="%230052FF"/></svg>',
  },
  {
    id: 'app.phantom',
    rdns: 'app.phantom',
    name: 'Phantom',
    installUrl: 'https://phantom.app/download',
    description: 'Multi-chain wallet for Solana & EVM',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23AB9FF2"/><path d="M30 65V45c0-11 9-20 20-20s20 9 20 20v20c0 3-3 6-6 4l-4-3-4 3c-3 2-6 0-6-3l-4 3c-3 2-6 0-6-3l-4 3c-3 2-6 0-6-4z" fill="%23FFFFFF"/><circle cx="44" cy="44" r="3" fill="%23AB9FF2"/><circle cx="56" cy="44" r="3" fill="%23AB9FF2"/></svg>',
  },
  {
    id: 'me.rainbow',
    rdns: 'me.rainbow',
    name: 'Rainbow',
    installUrl: 'https://rainbow.me/',
    description: 'Fun, simple, and secure Ethereum wallet',
    icon: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="24" fill="%23000000"/><path d="M20 70 A30 30 0 0 1 80 70" stroke="%23FF4343" stroke-width="8" fill="none"/><path d="M28 70 A22 22 0 0 1 72 70" stroke="%23FFA100" stroke-width="8" fill="none"/><path d="M36 70 A14 14 0 0 1 64 70" stroke="%2300E5FF" stroke-width="8" fill="none"/></svg>',
  },
];

let activeSelectedProvider: any = null;
let activeSelectedWalletName: string | null = null;
let activeSelectedWalletId: string | null = null;

export function setActiveProvider(provider: any, walletName?: string, walletId?: string) {
  activeSelectedProvider = provider;
  activeSelectedWalletName = walletName || null;
  activeSelectedWalletId = walletId || null;
  if (typeof window !== 'undefined') {
    if (walletId) localStorage.setItem('uno_arcade_active_wallet_id', walletId);
    if (walletName) localStorage.setItem('uno_arcade_active_wallet_name', walletName);
  }
}

export function clearActiveProvider() {
  activeSelectedProvider = null;
  activeSelectedWalletName = null;
  activeSelectedWalletId = null;
  if (typeof window !== 'undefined') {
    localStorage.removeItem('uno_arcade_active_wallet_id');
    localStorage.removeItem('uno_arcade_active_wallet_name');
  }
}

export function getActiveProvider(): any {
  if (activeSelectedProvider) return activeSelectedProvider;
  return getInjectedProvider();
}

/**
 * Safely access the injected Ethereum provider
 */
export function getInjectedProvider(): any {
  if (typeof window === 'undefined') return null;
  if (activeSelectedProvider) return activeSelectedProvider;
  const anyWindow = window as any;
  return anyWindow.ethereum || anyWindow.okxwallet || null;
}

/**
 * Discover all available Web3 wallets using EIP-6963 and browser injection fallbacks
 */
export function subscribeToWallets(onUpdate: (wallets: DiscoveredWallet[]) => void): () => void {
  if (typeof window === 'undefined') {
    onUpdate([]);
    return () => {};
  }

  const discoveredMap = new Map<string, DiscoveredWallet>();

  const buildAndEmitList = () => {
    const list: DiscoveredWallet[] = [];
    const addedIds = new Set<string>();

    // 1. Add detected wallets first
    for (const item of discoveredMap.values()) {
      if (item.isInstalled && item.provider) {
        list.push(item);
        if (item.rdns) addedIds.add(item.rdns.toLowerCase());
        addedIds.add(item.id.toLowerCase());
        addedIds.add(item.name.toLowerCase());
      }
    }

    // 2. Add remaining popular wallets as non-installed options
    for (const pop of POPULAR_WALLETS) {
      const match =
        addedIds.has(pop.id.toLowerCase()) ||
        addedIds.has(pop.rdns.toLowerCase()) ||
        addedIds.has(pop.name.toLowerCase());
      if (!match) {
        list.push({
          id: pop.id,
          name: pop.name,
          icon: pop.icon,
          rdns: pop.rdns,
          isInstalled: false,
          installUrl: pop.installUrl,
          description: pop.description,
        });
      }
    }

    onUpdate(list);
  };

  // Helper to register an injected wallet
  const registerWallet = (wallet: DiscoveredWallet) => {
    const key = wallet.rdns || wallet.id || wallet.name;
    discoveredMap.set(key, wallet);
    buildAndEmitList();
  };

  // 1. Listen for EIP-6963 events
  const handleAnnounce = (event: any) => {
    if (!event.detail || !event.detail.info || !event.detail.provider) return;
    const { info, provider } = event.detail;
    registerWallet({
      id: info.uuid || info.rdns || info.name,
      name: info.name,
      icon: info.icon || getFallbackIcon(info.name),
      rdns: info.rdns,
      provider,
      isInstalled: true,
      isEIP6963: true,
    });
  };

  window.addEventListener('eip6963:announceProvider', handleAnnounce);

  // 2. Dispatch request to all extensions
  try {
    window.dispatchEvent(new Event('eip6963:requestProvider'));
  } catch {}

  // 3. Fallback scan for traditional window objects
  const anyWindow = window as any;

  // OKX Wallet
  if (anyWindow.okxwallet) {
    registerWallet({
      id: 'com.okex.wallet',
      rdns: 'com.okex.wallet',
      name: 'OKX Wallet',
      icon: getFallbackIcon('OKX Wallet'),
      provider: anyWindow.okxwallet,
      isInstalled: true,
    });
  }

  // Coinbase Wallet Extension
  if (anyWindow.coinbaseWalletExtension) {
    registerWallet({
      id: 'com.coinbase.wallet',
      rdns: 'com.coinbase.wallet',
      name: 'Coinbase Wallet',
      icon: getFallbackIcon('Coinbase Wallet'),
      provider: anyWindow.coinbaseWalletExtension,
      isInstalled: true,
    });
  }

  // Phantom Ethereum
  if (anyWindow.phantom?.ethereum) {
    registerWallet({
      id: 'app.phantom',
      rdns: 'app.phantom',
      name: 'Phantom',
      icon: getFallbackIcon('Phantom'),
      provider: anyWindow.phantom.ethereum,
      isInstalled: true,
    });
  }

  // Check window.ethereum / multiple providers array
  if (anyWindow.ethereum) {
    const eth = anyWindow.ethereum;
    const providers = Array.isArray(eth.providers) ? eth.providers : [eth];

    for (const p of providers) {
      if (p.isRabby) {
        registerWallet({
          id: 'io.rabby',
          rdns: 'io.rabby',
          name: 'Rabby Wallet',
          icon: getFallbackIcon('Rabby Wallet'),
          provider: p,
          isInstalled: true,
        });
      } else if (p.isOkxWallet) {
        registerWallet({
          id: 'com.okex.wallet',
          rdns: 'com.okex.wallet',
          name: 'OKX Wallet',
          icon: getFallbackIcon('OKX Wallet'),
          provider: p,
          isInstalled: true,
        });
      } else if (p.isCoinbaseWallet) {
        registerWallet({
          id: 'com.coinbase.wallet',
          rdns: 'com.coinbase.wallet',
          name: 'Coinbase Wallet',
          icon: getFallbackIcon('Coinbase Wallet'),
          provider: p,
          isInstalled: true,
        });
      } else if (p.isMetaMask) {
        registerWallet({
          id: 'io.metamask',
          rdns: 'io.metamask',
          name: 'MetaMask',
          icon: getFallbackIcon('MetaMask'),
          provider: p,
          isInstalled: true,
        });
      } else if (p.isPhantom) {
        registerWallet({
          id: 'app.phantom',
          rdns: 'app.phantom',
          name: 'Phantom',
          icon: getFallbackIcon('Phantom'),
          provider: p,
          isInstalled: true,
        });
      } else {
        registerWallet({
          id: 'injected.browser',
          name: 'Injected Browser Wallet',
          icon: getFallbackIcon('Injected Browser Wallet'),
          provider: p,
          isInstalled: true,
        });
      }
    }
  }

  // Initial build
  buildAndEmitList();

  return () => {
    window.removeEventListener('eip6963:announceProvider', handleAnnounce);
  };
}

function getFallbackIcon(name: string): string {
  const clean = name.toLowerCase();
  for (const pop of POPULAR_WALLETS) {
    if (clean.includes(pop.name.toLowerCase())) {
      return pop.icon;
    }
  }
  // Generic Web3 Wallet SVG
  return 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="%23FF4600"/><rect x="25" y="35" width="50" height="35" rx="6" fill="%23FFFFFF"/><circle cx="62" cy="52" r="5" fill="%23FF4600"/></svg>';
}

/**
 * Connect to a specific discovered wallet provider, switch/add Hemi Sepolia if needed, and fetch balance
 */
export async function connectWalletProvider(
  provider: any,
  walletName: string,
  walletId?: string
): Promise<{ address: string; chainId: number; balance: string }> {
  if (!provider || !provider.request) {
    throw new Error('Provider does not support Web3 requests');
  }

  // 1. Request account authorization
  const accounts: string[] = await provider.request({ method: 'eth_requestAccounts' });
  if (!accounts || accounts.length === 0) {
    throw new Error('No account authorized by wallet');
  }

  const cleanAddr = accounts[0].trim().toLowerCase();

  // 2. Verify network
  const chainIdHex: string = await provider.request({ method: 'eth_chainId' });
  let chainIdDec = parseInt(chainIdHex, 16);

  if (!isHemiChain(chainIdDec)) {
    try {
      await switchOrAddHemiNetwork(provider, HEMI_SEPOLIA_CONFIG);
      const updatedHex: string = await provider.request({ method: 'eth_chainId' });
      chainIdDec = parseInt(updatedHex, 16);
    } catch (err) {
      console.warn('Network switch deferred or rejected:', err);
    }
  }

  // 3. Fetch ETH balance
  const balance = await fetchEthBalance(provider, accounts[0]);

  // 4. Save active provider
  setActiveProvider(provider, walletName, walletId);

  return {
    address: accounts[0],
    chainId: chainIdDec,
    balance,
  };
}

/**
 * Safely query ETH balance and format to 4 decimals
 */
export async function fetchEthBalance(provider: any, address: string): Promise<string> {
  if (!provider || !provider.request || !address) return '0.0000';
  try {
    const rawBal: string = await provider.request({
      method: 'eth_getBalance',
      params: [address, 'latest'],
    });
    const wei = BigInt(rawBal || '0x0');
    const ethWhole = wei / 1000000000000000000n;
    const ethFraction = (wei % 1000000000000000000n) / 100000000000000n; // 4 decimals
    const fractionStr = ethFraction.toString().padStart(4, '0');
    return `${ethWhole}.${fractionStr}`;
  } catch (err) {
    console.warn('Failed to fetch balance:', err);
    return '0.0000';
  }
}

/**
 * Switch or add Hemi Sepolia Testnet (or Mainnet)
 */
export async function switchOrAddHemiNetwork(
  provider: any,
  targetConfig: ChainConfig = HEMI_SEPOLIA_CONFIG
): Promise<boolean> {
  if (!provider || !provider.request) return false;
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: targetConfig.chainId }],
    });
    return true;
  } catch (switchError: any) {
    // 4902 indicates that the chain has not been added to MetaMask / wallet
    const isUnrecognized =
      switchError?.code === 4902 ||
      switchError?.data?.originalError?.code === 4902 ||
      String(switchError?.message || '').toLowerCase().includes('unrecognized') ||
      String(switchError?.message || '').includes('4902');

    if (isUnrecognized) {
      try {
        await provider.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: targetConfig.chainId,
              chainName: targetConfig.chainName,
              nativeCurrency: targetConfig.nativeCurrency,
              rpcUrls: targetConfig.rpcUrls,
              blockExplorerUrls: targetConfig.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.warn('Failed to add Hemi network:', addError);
        return false;
      }
    }

    // User rejected request
    if (switchError?.code === 4001) {
      console.warn('User rejected network switch request');
      return false;
    }

    console.warn('Failed to switch to Hemi network:', switchError);
    return false;
  }
}
