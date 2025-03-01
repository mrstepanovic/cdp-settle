'use client';

import { useState } from 'react';
import ConnectWallet from '@/components/ConnectWallet';
import CreateGroup from '@/components/CreateGroup';
import Dashboard from '@/components/Dashboard';
import { useWallet } from '@/app/providers';

export default function Home() {
  const { isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'create' | 'dashboard'>('create');

  return (
    <main className="flex flex-col items-center justify-between min-h-screen p-4 md:p-24">
      <div className="z-10 items-center justify-between w-full max-w-5xl">
        <div className="flex flex-col items-center justify-center w-full gap-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-contrast-dark">Settle</h1>
            <p className="mt-2 text-xl text-gray-700">Split expenses with friends using crypto</p>
            <p className="mt-1 text-sm text-red-600">Powered by Base Sepolia • USDC</p>
          </div>
          
          <div className="flex justify-center w-full max-w-md mb-4">
            <ConnectWallet />
          </div>
          
          {isConnected && (
            <div className="w-full max-w-md mb-4">
              <div className="flex border-b border-gray-200">
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'create'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('create')}
                >
                  Create Group
                </button>
                <button
                  className={`px-4 py-2 text-sm font-medium ${
                    activeTab === 'dashboard'
                      ? 'text-red-600 border-b-2 border-red-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  onClick={() => setActiveTab('dashboard')}
                >
                  My Groups
                </button>
              </div>
            </div>
          )}
          
          <div className="card w-full max-w-md">
            {!isConnected ? (
              <div className="p-4 text-center bg-red-50 border border-red-100 rounded-md">
                Please connect your wallet to get started.
              </div>
            ) : activeTab === 'create' ? (
              <CreateGroup />
            ) : (
              <Dashboard />
            )}
          </div>
          
          <div className="max-w-md p-5 text-gray-700 bg-white bg-opacity-90 rounded-md shadow-sm">
            <h3 className="mb-3 text-lg font-medium">How it works:</h3>
            <ol className="pl-5 space-y-2 list-decimal">
              <li>Connect your wallet</li>
              <li>Create a group and enter the total expense</li>
              <li>Share payment links with your friends</li>
              <li>Friends pay their share in USDC on Base Sepolia</li>
              <li>Track payment status in the dashboard</li>
              <li>Claim the collected funds to your wallet</li>
            </ol>
          </div>
        </div>
      </div>
    </main>
  );
}
