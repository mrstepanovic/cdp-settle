'use client';

import { useState } from 'react';
import { useWallet } from '@/app/providers';
import { coinbaseWalletService, PaymentStatus } from '@/services/coinbaseWalletService';

export default function CreateGroup() {
  const { isConnected, address, networkInfo: walletNetworkInfo } = useWallet();
  const [groupName, setGroupName] = useState('');
  const [totalExpense, setTotalExpense] = useState('');
  const [numberOfSplitters, setNumberOfSplitters] = useState(2);
  const [isCreating, setIsCreating] = useState(false);
  const [groupCreated, setGroupCreated] = useState(false);
  const [payments, setPayments] = useState<PaymentStatus[]>([]);
  const [groupId, setGroupId] = useState('');
  const [networkInfo, setNetworkInfo] = useState({ network: '', tokenSymbol: '' });

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!groupName || !totalExpense || numberOfSplitters < 2 || !address) {
      alert('Please fill in all fields and connect your wallet');
      return;
    }

    setIsCreating(true);

    try {
      // Create a group using the Coinbase wallet service
      const group = await coinbaseWalletService.createGroup(
        groupName,
        totalExpense,
        numberOfSplitters,
        address
      );
      
      setPayments(group.payments);
      setGroupId(group.id);
      setNetworkInfo({
        network: group.network,
        tokenSymbol: group.tokenSymbol
      });
      setGroupCreated(true);
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = (paymentId: string, amount: string) => {
    // Create the full URL
    const fullUrl = `${window.location.origin}/pay/${paymentId}?amount=${amount}&group=${encodeURIComponent(groupName)}`;
    navigator.clipboard.writeText(fullUrl);
    alert('Link copied to clipboard!');
  };

  const handleClaimFunds = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      const success = await coinbaseWalletService.claimFunds(groupId, address);
      if (success) {
        alert('Funds claimed successfully!');
      }
    } catch (error) {
      console.error('Error claiming funds:', error);
      alert('Failed to claim funds. Please try again.');
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 text-center bg-red-50 border border-red-100 rounded-md">
        Please connect your wallet to create a group.
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {!groupCreated ? (
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700">
              Group Name
            </label>
            <input
              type="text"
              id="groupName"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              placeholder="e.g., Roommates, Trip to Paris"
              required
            />
          </div>
          
          <div>
            <label htmlFor="totalExpense" className="block text-sm font-medium text-gray-700">
              Total Expense ({walletNetworkInfo?.tokenSymbol || 'USDC'})
            </label>
            <input
              type="number"
              id="totalExpense"
              value={totalExpense}
              onChange={(e) => setTotalExpense(e.target.value)}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              placeholder="100"
              min="0"
              step="0.01"
              required
            />
          </div>
          
          <div>
            <label htmlFor="numberOfSplitters" className="block text-sm font-medium text-gray-700">
              Number of People
            </label>
            <input
              type="number"
              id="numberOfSplitters"
              value={numberOfSplitters}
              onChange={(e) => setNumberOfSplitters(parseInt(e.target.value))}
              className="w-full px-3 py-2 mt-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
              min="2"
              max="20"
              required
            />
          </div>
          
          {walletNetworkInfo && (
            <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
              Network: {walletNetworkInfo.network} • Token: {walletNetworkInfo.tokenSymbol}
            </div>
          )}
          
          <button
            type="submit"
            disabled={isCreating}
            className="btn-primary w-full"
          >
            {isCreating ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-100 rounded-md">
            <h3 className="text-lg font-medium text-red-800">Group Created!</h3>
            <p className="text-sm text-red-600">
              Share these payment links with your group members:
            </p>
            <p className="mt-1 text-xs text-gray-600">
              Network: {networkInfo.network} • Token: {networkInfo.tokenSymbol}
            </p>
          </div>
          
          <div className="space-y-2">
            {payments.map((payment, index) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-white border border-red-100 rounded-md shadow-sm">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700">
                    Person {index + 1}
                  </span>
                  <span className="text-xs text-gray-500">
                    {payment.amount} {networkInfo.tokenSymbol}
                  </span>
                  <span className={`text-xs ${payment.paid ? 'text-green-600' : 'text-gray-500'}`}>
                    {payment.paid ? 'Paid ✓' : 'Not paid yet'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyLink(payment.id, payment.amount)}
                  className="btn-secondary text-xs"
                  disabled={payment.paid}
                >
                  {payment.paid ? 'Paid' : 'Copy Link'}
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleClaimFunds}
            className="w-full btn-primary"
          >
            Claim Funds
          </button>
          
          <button
            onClick={() => setGroupCreated(false)}
            className="w-full btn-secondary"
          >
            Create Another Group
          </button>
        </div>
      )}
    </div>
  );
} 