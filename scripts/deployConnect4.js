import fs from 'fs';
import solc from 'solc';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

async function main() {
  console.log('Compiling HemiConnect4Elo.sol...');
  const contractSource = fs.readFileSync('contracts/HemiConnect4Elo.sol', 'utf8');

  const input = {
    language: 'Solidity',
    sources: {
      'HemiConnect4Elo.sol': {
        content: contractSource,
      },
    },
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      outputSelection: {
        '*': {
          '*': ['abi', 'evm.bytecode.object'],
        },
      },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    let hasError = false;
    for (const error of output.errors) {
      console.log(error.formattedMessage);
      if (error.severity === 'error') hasError = true;
    }
    if (hasError) {
      process.exit(1);
    }
  }

  const contract = output.contracts['HemiConnect4Elo.sol']['HemiConnect4Elo'];
  const abi = contract.abi;
  const bytecode = '0x' + contract.evm.bytecode.object;

  console.log('Contract compiled successfully!');
  fs.mkdirSync('src/lib/connect4', { recursive: true });
  fs.writeFileSync(
    'src/lib/connect4/HemiConnect4EloABI.json',
    JSON.stringify(abi, null, 2)
  );

  console.log('Deploying to Hemi Sepolia testnet...');
  const privateKey = process.env.BACKEND_PRIVATE_KEY || '0x2a39ae7921ead16f4c31915056e0e5573f04735df3f723b4a6ae2f838c685181';
  const account = privateKeyToAccount(privateKey);
  console.log('Deployer account:', account.address);

  const HEMI_SEPOLIA_CHAIN = {
    id: 743111,
    name: 'Hemi Sepolia',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: { default: { http: ['https://testnet.rpc.hemi.network/rpc'] } },
    blockExplorers: { default: { name: 'Hemi Explorer', url: 'https://testnet.explorer.hemi.network' } },
  };

  const publicClient = createPublicClient({
    chain: HEMI_SEPOLIA_CHAIN,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: HEMI_SEPOLIA_CHAIN,
    transport: http(),
  });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Account balance:', (Number(balance) / 1e18).toFixed(6), 'ETH');

  console.log('Broadcasting deployment transaction...');
  const hash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [],
  });
  console.log('Transaction hash:', hash);

  console.log('Waiting for block confirmation on Hemi Sepolia...');
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const deployedAddress = receipt.contractAddress;

  console.log('====================================================');
  console.log('🎉 HemiConnect4Elo CONTRACT DEPLOYED SUCCESSFULLY!');
  console.log('Contract Address:', deployedAddress);
  console.log('Explorer URL: https://testnet.explorer.hemi.network/address/' + deployedAddress);
  console.log('====================================================');

  fs.writeFileSync('contracts/deployedAddress.json', JSON.stringify({
    address: deployedAddress,
    transactionHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    timestamp: new Date().toISOString(),
    network: 'Hemi Sepolia',
    chainId: 743111,
  }, null, 2));

  return deployedAddress;
}

main().catch((err) => {
  console.error('Deployment failed:', err);
  process.exit(1);
});
