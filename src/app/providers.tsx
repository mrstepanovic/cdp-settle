'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useState } from 'react';
import { coinbaseWalletService } from '@/services/coinbaseWalletService';

// Create a client
const queryClient = new QueryClient();

// Create a context for wallet connection
interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  networkInfo: {
    network: string;
    tokenSymbol: string;
    tokenAddress: string;
  } | null;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  isConnected: false,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
  networkInfo: null,
});

export const useWallet = () => useContext(WalletContext);

export function Providers({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkInfo, setNetworkInfo] = useState<WalletContextType['networkInfo']>(null);

  // Check if wallet is already connected
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await coinbaseWalletService.isWalletConnected();
        if (connected) {
          const account = await coinbaseWalletService.getCurrentAccount();
          if (account) {
            setAddress(account);
            setIsConnected(true);
            
            // Get network info
            const info = await coinbaseWalletService.getNetworkInfo();
            setNetworkInfo({
              network: info.network,
              tokenSymbol: info.tokenSymbol,
              tokenAddress: info.tokenAddress,
            });
          }
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };
    
    checkConnection();
  }, []);

  // Connect wallet
  const connect = async () => {
    try {
      setIsConnecting(true);
      const account = await coinbaseWalletService.connectWallet();
      setAddress(account);
      setIsConnected(true);
      
      // Get network info
      const info = await coinbaseWalletService.getNetworkInfo();
      setNetworkInfo({
        network: info.network,
        tokenSymbol: info.tokenSymbol,
        tokenAddress: info.tokenAddress,
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnect = async () => {
    try {
      await coinbaseWalletService.disconnectWallet();
      setAddress(null);
      setIsConnected(false);
      setNetworkInfo(null);
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <WalletContext.Provider
        value={{
          address,
          isConnected,
          isConnecting,
          connect,
          disconnect,
          networkInfo,
        }}
      >
        {children}
      </WalletContext.Provider>
    </QueryClientProvider>
  );
} 