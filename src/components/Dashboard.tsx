'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/app/providers';
import { coinbaseWalletService, SmartWalletGroup } from '@/services/coinbaseWalletService';

export default function Dashboard() {
  const { isConnected, address } = useWallet();
  const [groups, setGroups] = useState<SmartWalletGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<SmartWalletGroup | null>(null);
  const [editingMember, setEditingMember] = useState<{
    paymentId: string;
    currentName: string;
  } | null>(null);
  const [newMemberName, setNewMemberName] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [needsRefresh, setNeedsRefresh] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      loadGroups();
    } else {
      setGroups([]);
      setIsLoading(false);
    }
  }, [isConnected, address, refreshTrigger]);

  // Add a refresh interval to periodically check for updates
  useEffect(() => {
    if (isConnected && address) {
      // Set up an interval to refresh the groups data every 10 seconds
      const intervalId = setInterval(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 10000);
      
      // Clean up the interval on component unmount
      return () => clearInterval(intervalId);
    }
  }, [isConnected, address]);
  
  // Listen for payment-completed events
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Check if there's a flag indicating a refresh is needed
      const needsRefresh = localStorage.getItem('settle_needs_refresh');
      if (needsRefresh === 'true') {
        // Clear the flag
        localStorage.removeItem('settle_needs_refresh');
        // Trigger a refresh
        setRefreshTrigger(prev => prev + 1);
      }
      
      // Set up event listener for payment-completed events
      const handlePaymentCompleted = () => {
        // Trigger a refresh
        setRefreshTrigger(prev => prev + 1);
      };
      
      window.addEventListener('payment-completed', handlePaymentCompleted);
      
      // Clean up the event listener on component unmount
      return () => {
        window.removeEventListener('payment-completed', handlePaymentCompleted);
      };
    }
  }, []);

  const loadGroups = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading groups...');
      
      // Log the raw localStorage data for debugging
      if (typeof window !== 'undefined') {
        const rawGroups = localStorage.getItem('settle_groups');
        const rawPayments = localStorage.getItem('settle_payments');
        console.log('Raw localStorage data:', { 
          groups: rawGroups ? JSON.parse(rawGroups) : null,
          payments: rawPayments ? JSON.parse(rawPayments) : null
        });
      }
      
      // Get user groups
      const userGroups = coinbaseWalletService.getUserGroups(address || '');
      console.log('User groups returned from service:', userGroups);
      
      if (userGroups.length > 0) {
        setGroups(userGroups);
        
        // If no group is selected, select the first one
        if (!selectedGroup) {
          setSelectedGroup(userGroups[0]);
          console.log('Auto-selecting first group:', userGroups[0]);
          
          // Log the selected group's data
          const groupData = coinbaseWalletService.getGroup(userGroups[0].id);
          console.log('Selected group data:', groupData);
          
          // Check if the group has payments
          if (groupData && groupData.payments) {
            console.log('Group payments:', groupData.payments);
            
            // Log details about each payment
            for (const payment of groupData.payments) {
              const paymentData = coinbaseWalletService.getPayment(payment.id);
              console.log(`Payment ${payment.id} data:`, paymentData);
            }
          }
        } else {
          // Log the selected group's data
          const groupData = coinbaseWalletService.getGroup(selectedGroup.id);
          console.log('Selected group data before refresh:', groupData);
          
          // Force a refresh of the selected group
          const refreshedGroup = coinbaseWalletService.getGroup(selectedGroup.id);
          console.log('Selected group data after refresh:', refreshedGroup);
          
          // Explicitly update the group's amountCollected
          const updateResult = coinbaseWalletService.updateGroupAmountCollected(selectedGroup.id);
          console.log('Update group amount collected result:', updateResult);
          
          // Get the group data again after the update
          const updatedGroup = coinbaseWalletService.getGroup(selectedGroup.id);
          console.log('Selected group data after amount update:', updatedGroup);
        }
      } else {
        console.log('No groups found for user:', address);
        setGroups([]);
      }
    } catch (error: any) {
      console.error('Error loading groups:', error);
      setError(`Failed to load groups: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = (paymentId: string, amount: string, groupName: string) => {
    const fullUrl = `${window.location.origin}/pay/${paymentId}?amount=${amount}&group=${encodeURIComponent(groupName)}`;
    navigator.clipboard.writeText(fullUrl);
    alert('Link copied to clipboard!');
  };

  const handleClaimFunds = async (groupId: string) => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    try {
      console.log('Attempting to claim funds for group:', groupId);
      
      // Get the current group data before claiming
      const groupBeforeClaim = coinbaseWalletService.getGroup(groupId);
      console.log('Group data before claiming:', groupBeforeClaim);
      
      const result = await coinbaseWalletService.claimFunds(groupId, address);
      console.log('Claim funds result:', result);
      
      if (result.success) {
        alert('Funds claimed successfully!');
        loadGroups(); // Refresh groups after claiming
      }
    } catch (error: any) {
      console.error('Error claiming funds:', error);
      // Log more detailed error information
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      alert(`Failed to claim funds: ${error.message || 'Please try again.'}`);
    }
  };

  const startEditingMemberName = (paymentId: string, currentName: string = '') => {
    setEditingMember({ paymentId, currentName });
    setNewMemberName(currentName);
  };

  const saveMemberName = () => {
    if (!selectedGroup || !editingMember) return;
    
    const success = coinbaseWalletService.updateMemberName(
      selectedGroup.id,
      editingMember.paymentId,
      newMemberName
    );
    
    if (success) {
      // Refresh the group data
      const updatedGroup = coinbaseWalletService.getGroup(selectedGroup.id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
        
        // Also update in the groups array
        const updatedGroups = groups.map(g => 
          g.id === selectedGroup.id ? updatedGroup : g
        );
        setGroups(updatedGroups);
      }
    }
    
    // Reset editing state
    setEditingMember(null);
    setNewMemberName('');
  };

  const cancelEditingMemberName = () => {
    setEditingMember(null);
    setNewMemberName('');
  };

  // Manually refresh the selected group data
  const refreshSelectedGroup = () => {
    if (!selectedGroup) return;
    
    console.log('Manually refreshing group data for:', selectedGroup.id);
    
    try {
      // Explicitly update the group's amountCollected
      const updateResult = coinbaseWalletService.updateGroupAmountCollected(selectedGroup.id);
      console.log('Manual update result:', updateResult);
      
      // Reload the group data
      const updatedGroup = coinbaseWalletService.getGroup(selectedGroup.id);
      console.log('Updated group data after manual refresh:', updatedGroup);
      
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
        
        // Also refresh the groups list
        const userGroups = coinbaseWalletService.getUserGroups(address || '');
        setGroups(userGroups);
      }
    } catch (error) {
      console.error('Error refreshing group data:', error);
    }
  };

  if (!isConnected) {
    return (
      <div className="p-4 text-center bg-red-50 border border-red-100 rounded-md">
        Please connect your wallet to view your groups.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-4 text-center bg-red-50 border border-red-100 rounded-md">
        You haven't created any groups yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Your Groups</h2>
        <button 
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          className="px-3 py-1 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50"
        >
          Refresh
        </button>
      </div>
      
      {selectedGroup ? (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{selectedGroup.name}</h2>
            <button 
              onClick={refreshSelectedGroup}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Refresh Group Data
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-lg font-medium text-gray-800">
              <span className="text-gray-500">Total:</span> {selectedGroup.totalAmount} {selectedGroup.tokenSymbol || 'USDC'}
            </div>
            <button 
              onClick={() => setSelectedGroup(null)}
              className="text-sm text-red-600 hover:text-red-800"
            >
              Back to all groups
            </button>
          </div>
          
          <div className="p-4 bg-red-50 border border-red-100 rounded-md">
            <div className="grid grid-cols-2 gap-2">
              <div className="text-sm text-gray-600">Network:</div>
              <div className="text-sm font-medium text-gray-800">
                {selectedGroup.network}
              </div>
              
              <div className="text-sm text-gray-600">Amount Collected:</div>
              <div className="text-sm font-medium text-gray-800">
                {selectedGroup.amountCollected} {selectedGroup.tokenSymbol}
              </div>
              
              <div className="text-sm text-gray-600">Amount Per Person:</div>
              <div className="text-sm font-medium text-gray-800">
                {selectedGroup.amountPerPerson} {selectedGroup.tokenSymbol}
              </div>
              
              <div className="text-sm text-gray-600">Created:</div>
              <div className="text-sm font-medium text-gray-800">
                {new Date(selectedGroup.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h4 className="text-md font-medium text-gray-800">Payment Status</h4>
            
            {selectedGroup.payments.map((payment, index) => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-white border border-red-100 rounded-md shadow-sm">
                <div className="flex flex-col">
                  {editingMember && editingMember.paymentId === payment.id ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 rounded"
                        placeholder="Enter name"
                        autoFocus
                      />
                      <button 
                        onClick={saveMemberName}
                        className="p-1 text-xs text-white bg-green-500 rounded hover:bg-green-600"
                      >
                        ✓
                      </button>
                      <button 
                        onClick={cancelEditingMemberName}
                        className="p-1 text-xs text-white bg-gray-500 rounded hover:bg-gray-600"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <span 
                      className="text-sm font-medium text-gray-700 cursor-pointer hover:text-red-600"
                      onClick={() => startEditingMemberName(payment.id, payment.memberName || `Person ${index + 1}`)}
                    >
                      {payment.memberName || `Person ${index + 1}`}
                      <span className="ml-1 text-xs text-gray-400">(click to edit)</span>
                    </span>
                  )}
                  <span className="text-xs text-gray-500">
                    {payment.amount} {selectedGroup.tokenSymbol}
                  </span>
                  <span className={`text-xs ${payment.paid ? 'text-green-600' : 'text-gray-500'}`}>
                    {payment.paid ? `Paid on ${new Date(payment.paidAt!).toLocaleDateString()}` : 'Not paid yet'}
                  </span>
                </div>
                <button
                  onClick={() => handleCopyLink(payment.id, payment.amount, selectedGroup.name)}
                  className="btn-secondary text-xs"
                  disabled={payment.paid}
                >
                  {payment.paid ? 'Paid' : 'Copy Link'}
                </button>
              </div>
            ))}
          </div>
          
          <button
            onClick={() => handleClaimFunds(selectedGroup.id)}
            className="w-full btn-primary"
            disabled={parseFloat(selectedGroup.amountCollected) <= 0}
          >
            {parseFloat(selectedGroup.amountCollected) > 0 
              ? `Claim ${selectedGroup.amountCollected} ${selectedGroup.tokenSymbol}` 
              : 'No Funds to Claim'}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const paidCount = group.payments.filter(p => p.paid).length;
            const totalPayments = group.payments.length;
            const percentPaid = totalPayments > 0 
              ? Math.round((paidCount / totalPayments) * 100) 
              : 0;
            
            return (
              <div 
                key={group.id} 
                className="p-4 bg-white border border-red-100 rounded-md shadow-sm cursor-pointer hover:border-red-300"
                onClick={() => setSelectedGroup(group)}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-800">{group.name}</h3>
                  <span className="text-sm text-gray-600">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="mt-2 text-sm text-gray-600">
                  {group.totalAmount} {group.tokenSymbol} • {group.numberOfSplitters} people
                </div>
                
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-full h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-red-500 rounded-full" 
                        style={{ width: `${percentPaid}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-600">{percentPaid}%</span>
                  </div>
                  <span className="text-xs font-medium text-gray-700">
                    {paidCount}/{totalPayments} paid
                  </span>
                </div>
                
                {parseFloat(group.amountCollected) > 0 && (
                  <div className="mt-2 text-sm font-medium text-green-600">
                    {group.amountCollected} {group.tokenSymbol} ready to claim
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}