'use client';

import { useWallet } from '@/app/providers';

export default function ConnectWallet() {
  const { address, isConnected, isConnecting, connect, disconnect, networkInfo } = useWallet();

  if (isConnected && address) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div className="text-sm text-gray-600">
          Connected: {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        {networkInfo && (
          <div className="text-xs text-gray-500">
            Network: {networkInfo.network} ({networkInfo.tokenSymbol})
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={() => disconnect()}
            className="btn-danger"
          >
            Disconnect
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect()}
      disabled={isConnecting}
      className="btn-primary"
    >
      {isConnecting ? 'Connecting...' : 'Connect Coinbase Wallet'}
    </button>
  );
} 