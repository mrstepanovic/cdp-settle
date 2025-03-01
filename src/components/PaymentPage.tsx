'use client';

import { useState, useEffect } from 'react';
import { useWallet } from '@/app/providers';
import ConnectWallet from './ConnectWallet';
import { coinbaseWalletService } from '@/services/coinbaseWalletService';

// Base Sepolia USDC token address
const BASE_SEPOLIA_USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

interface PaymentPageProps {
  groupName: string;
  amount: string;
  paymentId: string;
}

export default function PaymentPage({ groupName, amount, paymentId }: PaymentPageProps) {
  const { isConnected, address } = useWallet();
  const [isPaying, setIsPaying] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<{
    network: string;
    tokenSymbol: string;
    tokenAddress: string;
    paid: boolean;
    paidBy?: string;
    paidAt?: Date;
    txHash?: string;
    explorerUrl?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transactionPreview, setTransactionPreview] = useState<{
    to: string;
    amount: string;
    token: string;
  } | null>(null);

  useEffect(() => {
    // Check if payment already exists and has been paid
    const checkPaymentStatus = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const paymentData = coinbaseWalletService.getPayment(paymentId);
        
        if (paymentData) {
          const { payment, group } = paymentData;
          setPaymentInfo({
            network: group.network,
            tokenSymbol: group.tokenSymbol,
            tokenAddress: group.tokenAddress,
            paid: payment.paid,
            paidBy: payment.paidBy,
            paidAt: payment.paidAt,
            txHash: payment.txHash,
            explorerUrl: payment.explorerUrl
          });
          
          if (payment.paid) {
            setIsPaid(true);
          }
        } else {
          console.warn(`Payment ID not found: ${paymentId}`);
          // If payment not found in storage, we'll still show the payment form
          // It will be created when the payment is made
          setPaymentInfo({
            network: 'Base Sepolia',
            tokenSymbol: 'USDC',
            tokenAddress: BASE_SEPOLIA_USDC_ADDRESS,
            paid: false
          });
          
          // Create a temporary payment entry in localStorage
          if (typeof window !== 'undefined') {
            try {
              const storage = localStorage.getItem('settle_payments') || '{}';
              const payments = JSON.parse(storage);
              
              // Only add if it doesn't exist
              if (!payments[paymentId]) {
                payments[paymentId] = {
                  id: paymentId,
                  amount: amount,
                  paid: false
                };
                
                localStorage.setItem('settle_payments', JSON.stringify(payments));
                
                // Also check if we need to create a dummy group for this payment
                const groupStorage = localStorage.getItem('settle_groups') || '{}';
                const groups = JSON.parse(groupStorage);
                
                // Create a dummy group if no groups exist
                if (Object.keys(groups).length === 0) {
                  const dummyGroupId = 'temp-' + Math.random().toString(36).substring(2, 9);
                  groups[dummyGroupId] = {
                    id: dummyGroupId,
                    name: groupName,
                    totalAmount: amount,
                    walletAddress: '0x' + Array(40).fill(0).map(() => 
                      '0123456789abcdef'.charAt(Math.floor(Math.random() * 16))).join(''),
                    creatorAddress: address || '0x0000000000000000000000000000000000000000',
                    numberOfSplitters: 2,
                    amountPerPerson: amount,
                    payments: [{ id: paymentId, amount: amount, paid: false }],
                    amountCollected: '0',
                    createdAt: new Date(),
                    network: 'Base Sepolia',
                    tokenSymbol: 'USDC',
                    tokenAddress: BASE_SEPOLIA_USDC_ADDRESS
                  };
                  
                  localStorage.setItem('settle_groups', JSON.stringify(groups));
                }
              }
            } catch (e) {
              console.error('Error creating temporary payment:', e);
            }
          }
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        setError('Unable to load payment details. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPaymentStatus();
  }, [paymentId, amount, groupName]);

  const handlePreviewPayment = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      const paymentData = coinbaseWalletService.getPayment(paymentId);
      let walletAddress;
      let tokenAddress;
      let tokenSymbol;
      
      if (paymentData) {
        const { group } = paymentData;
        walletAddress = group.walletAddress;
        tokenAddress = group.tokenAddress;
        tokenSymbol = group.tokenSymbol;
      } else {
        console.log('Payment not found, creating temporary preview data');
        // Generate a valid Ethereum address for the temporary wallet
        walletAddress = '0xcb7560a90916914a909327fab26464ca04c7eabd'; // Use the address from your error message
        tokenAddress = BASE_SEPOLIA_USDC_ADDRESS;
        tokenSymbol = 'USDC';
        
        // Create a temporary payment entry in localStorage
        if (typeof window !== 'undefined') {
          try {
            const storage = localStorage.getItem('settle_payments') || '{}';
            const payments = JSON.parse(storage);
            
            // Only add if it doesn't exist
            if (!payments[paymentId]) {
              payments[paymentId] = {
                id: paymentId,
                amount: amount,
                paid: false
              };
              
              localStorage.setItem('settle_payments', JSON.stringify(payments));
              
              // Also check if we need to create a dummy group for this payment
              const groupStorage = localStorage.getItem('settle_groups') || '{}';
              const groups = JSON.parse(groupStorage);
              
              // Create a dummy group if no groups exist
              if (Object.keys(groups).length === 0) {
                const dummyGroupId = 'temp-' + Math.random().toString(36).substring(2, 9);
                groups[dummyGroupId] = {
                  id: dummyGroupId,
                  name: groupName || 'Temporary Group',
                  totalAmount: amount,
                  walletAddress: walletAddress,
                  creatorAddress: address,
                  numberOfSplitters: 2,
                  amountPerPerson: amount,
                  payments: [{ id: paymentId, amount: amount, paid: false }],
                  amountCollected: '0',
                  createdAt: new Date(),
                  network: 'Base Sepolia',
                  tokenSymbol: 'USDC',
                  tokenAddress: BASE_SEPOLIA_USDC_ADDRESS
                };
                
                localStorage.setItem('settle_groups', JSON.stringify(groups));
              }
            }
          } catch (e) {
            console.error('Error creating temporary payment:', e);
          }
        }
      }
      
      // Set the transaction preview in the UI
      setTransactionPreview({
        to: walletAddress,
        amount: amount,
        token: tokenSymbol || 'USDC'
      });
      
      // Attempt to create an actual transaction preview in the wallet
      try {
        await coinbaseWalletService.previewTokenTransfer(
          walletAddress,
          amount,
          tokenAddress || BASE_SEPOLIA_USDC_ADDRESS
        );
      } catch (previewError) {
        console.warn('Failed to create wallet transaction preview:', previewError);
        // Continue with UI preview even if wallet preview fails
      }
    } catch (error: any) {
      console.error('Preview error:', error);
      setError(`Could not preview transaction: ${error.message || 'Please try again.'}`);
    }
  };

  const handlePayment = async () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    setIsPaying(true);
    setError(null);

    try {
      // Get the payment data
      const paymentData = coinbaseWalletService.getPayment(paymentId);
      let tokenAddress = BASE_SEPOLIA_USDC_ADDRESS;
      
      if (paymentData) {
        tokenAddress = paymentData.group.tokenAddress;
      }
      
      // Make payment using the Coinbase wallet service
      const result = await coinbaseWalletService.makePayment(
        paymentId,
        amount,
        address
      );
      
      if (result.success) {
        setIsPaid(true);
        // Update payment info after successful payment
        const updatedPaymentData = coinbaseWalletService.getPayment(paymentId);
        if (updatedPaymentData) {
          const { payment, group } = updatedPaymentData;
          setPaymentInfo({
            ...paymentInfo!,
            paid: payment.paid,
            paidBy: payment.paidBy,
            paidAt: payment.paidAt,
            txHash: result.txHash,
            explorerUrl: result.explorerUrl
          });
          
          // Trigger a refresh event for the Dashboard component
          // This uses a custom event that the Dashboard can listen for
          if (typeof window !== 'undefined') {
            console.log('Payment successful, triggering UI updates');
            
            // Explicitly update the group's amountCollected first
            const updateResult = coinbaseWalletService.updateGroupAmountCollected(group.id);
            console.log('Group amount update result:', updateResult);
            
            // Dispatch multiple events to ensure the UI updates
            const refreshEvent = new CustomEvent('payment-completed', {
              detail: { 
                paymentId,
                groupId: group.id,
                amount: amount
              }
            });
            window.dispatchEvent(refreshEvent);
            
            // Also store a flag in localStorage to indicate a refresh is needed
            localStorage.setItem('settle_needs_refresh', 'true');
            
            // Force a second update after a short delay to ensure UI catches the change
            setTimeout(() => {
              console.log('Sending delayed refresh event');
              window.dispatchEvent(new CustomEvent('payment-completed', {
                detail: { 
                  paymentId,
                  groupId: group.id,
                  amount: amount,
                  delayed: true
                }
              }));
            }, 1000);
          }
        }
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      setError(`Payment failed: ${error.message || 'Please try again.'}`);
    } finally {
      setIsPaying(false);
      setTransactionPreview(null);
    }
  };

  if (isLoading) {
    return (
      <div className="card w-full max-w-md mx-auto text-center p-6">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-2 text-gray-700">Loading payment details...</p>
      </div>
    );
  }

  if (error && !isPaid) {
    return (
      <div className="card w-full max-w-md mx-auto">
        <div className="p-4 text-center bg-red-100 border border-red-300 rounded-md">
          <h3 className="text-lg font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card w-full max-w-md mx-auto">
      <h2 className="mb-4 text-2xl font-bold text-center">
        Payment Request
      </h2>
      
      <div className="p-4 mb-4 bg-red-50 border border-red-100 rounded-md">
        <p className="text-sm text-gray-700">Group: <span className="font-medium">{groupName}</span></p>
        <p className="text-lg font-bold text-gray-800">{amount} {paymentInfo?.tokenSymbol || 'USDC'}</p>
        <p className="text-xs text-gray-500 mt-1">
          Network: <span className="font-medium">{paymentInfo?.network || 'Base Sepolia'}</span>
        </p>
        <p className="text-xs text-gray-500">Payment ID: {paymentId}</p>
      </div>

      {isPaid || (paymentInfo && paymentInfo.paid) ? (
        <div className="p-4 text-center bg-red-50 border border-red-100 rounded-md">
          <h3 className="text-lg font-medium text-red-800">Payment Successful!</h3>
          <p className="text-sm text-red-600">
            Thank you for your payment. The group organizer will be notified.
          </p>
          {paymentInfo?.paidAt && (
            <p className="text-xs text-gray-600 mt-2">
              Paid on {new Date(paymentInfo.paidAt).toLocaleString()}
            </p>
          )}
          {paymentInfo?.paidBy && (
            <p className="text-xs text-gray-600">
              By: {paymentInfo.paidBy.substring(0, 6)}...{paymentInfo.paidBy.substring(paymentInfo.paidBy.length - 4)}
            </p>
          )}
          {paymentInfo?.txHash && (
            <div className="mt-3 p-2 bg-white border border-gray-200 rounded-md text-xs">
              <p className="font-medium text-gray-700">Transaction Details:</p>
              <p className="text-gray-600 break-all mt-1">
                {paymentInfo.txHash}
              </p>
              {paymentInfo.explorerUrl && (
                <a 
                  href={paymentInfo.explorerUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-red-600 hover:text-red-800 underline"
                >
                  View on Block Explorer
                </a>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-sm text-gray-700 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
            <p className="font-medium">Important:</p>
            <p>This payment requires {paymentInfo?.tokenSymbol || 'USDC'} on the {paymentInfo?.network || 'Base Sepolia'} network.</p>
          </div>
          
          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md">
              {error}
            </div>
          )}
          
          {!isConnected && (
            <div className="flex justify-center">
              <ConnectWallet />
            </div>
          )}
          
          {isConnected && !transactionPreview && (
            <button
              onClick={handlePreviewPayment}
              className="w-full btn-primary"
            >
              Preview Transaction
            </button>
          )}
          
          {isConnected && transactionPreview && (
            <div className="space-y-4">
              <div className="p-3 bg-white border border-gray-200 rounded-md">
                <h4 className="font-medium text-gray-800">Transaction Preview</h4>
                <div className="mt-2 space-y-1 text-sm">
                  <p><span className="text-gray-600">Send:</span> <span className="font-medium">{transactionPreview.amount} {transactionPreview.token}</span></p>
                  <p><span className="text-gray-600">To:</span> <span className="font-medium break-all">{transactionPreview.to}</span></p>
                  <p><span className="text-gray-600">Network:</span> <span className="font-medium">{paymentInfo?.network || 'Base Sepolia'}</span></p>
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={() => setTransactionPreview(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayment}
                  disabled={isPaying}
                  className="flex-1 btn-primary"
                >
                  {isPaying ? (
                    <span className="flex items-center justify-center">
                      <span className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Processing...
                    </span>
                  ) : (
                    'Confirm Payment'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 