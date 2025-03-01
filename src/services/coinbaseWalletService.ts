import { ethers } from 'ethers';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Constants
const APP_NAME = 'Settle';
const APP_LOGO_URL = 'https://example.com/logo.png'; // Replace with your actual logo URL
const DEFAULT_NETWORK = 'Base Sepolia';
const DEFAULT_RPC_URL = 'https://sepolia.base.org';
const USDC_TOKEN_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Base Sepolia USDC token address
const DEFAULT_TOKEN_DECIMALS = 6;
const BASE_SEPOLIA_EXPLORER = 'https://sepolia.basescan.org';

// Initialize Coinbase Wallet SDK only on the client side
let coinbaseWalletSDK: any = null;
let provider: any = null;
let publicClient: any = null;

// Only initialize these on the client side
if (typeof window !== 'undefined') {
  coinbaseWalletSDK = new CoinbaseWalletSDK({
    appName: APP_NAME,
    appLogoUrl: APP_LOGO_URL
  });

  // Create a Web3 Provider
  provider = coinbaseWalletSDK.makeWeb3Provider({
    options: 'all'
  });

  // Create a Viem public client for read operations
  publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(DEFAULT_RPC_URL)
  });
}

// Interfaces
export interface PaymentStatus {
  id: string;
  amount: string;
  paid: boolean;
  paidAt?: Date;
  paidBy?: string;
  transactionHash?: string;
  memberName?: string;
  txHash?: string;
  explorerUrl?: string;
}

export interface SmartWalletGroup {
  id: string;
  name: string;
  totalAmount: string;
  walletAddress: string;
  creatorAddress: string;
  numberOfSplitters: number;
  amountPerPerson: string;
  payments: PaymentStatus[];
  amountCollected: string;
  createdAt: Date;
  network: string;
  tokenSymbol: string;
  tokenAddress: string;
}

// Helper function to get explorer URL for a transaction
function getExplorerUrl(txHash: string): string {
  return `${BASE_SEPOLIA_EXPLORER}/tx/${txHash}`;
}

// Helper function to validate Ethereum address
function isValidEthereumAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}

// Load data from localStorage
function loadFromStorage(): { groups: Record<string, SmartWalletGroup>, payments: Record<string, PaymentStatus> } {
  if (typeof window === 'undefined') return { groups: {}, payments: {} };
  
  try {
    const storedGroups = localStorage.getItem('settle_groups');
    const storedPayments = localStorage.getItem('settle_payments');
    
    return {
      groups: storedGroups ? JSON.parse(storedGroups) : {},
      payments: storedPayments ? JSON.parse(storedPayments) : {}
    };
  } catch (error) {
    console.error('Error loading from localStorage:', error);
    return { groups: {}, payments: {} };
  }
}

const saveToStorage = (groups: Record<string, SmartWalletGroup>, payments: Record<string, PaymentStatus>) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('settle_groups', JSON.stringify(groups));
    localStorage.setItem('settle_payments', JSON.stringify(payments));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
};

// Initialize storage
let storage = loadFromStorage();
let groups: Record<string, SmartWalletGroup> = storage.groups;
let payments: Record<string, PaymentStatus> = storage.payments;

// ABI for ERC20 token (USDC)
const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function name() view returns (string)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

// Create a service object that checks for browser environment before using browser-specific APIs
export const coinbaseWalletService = {
  // Connect to wallet and return address
  connectWallet: async (): Promise<string> => {
    if (typeof window === 'undefined') throw new Error('Cannot connect wallet in server environment');
    
    try {
      const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[];
      return accounts[0];
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw new Error('Failed to connect wallet');
    }
  },
  
  // Get current connected account
  getCurrentAccount: async (): Promise<string | null> => {
    if (typeof window === 'undefined') return null;
    
    try {
      const accounts = await provider.request({ method: 'eth_accounts' }) as string[];
      return accounts[0] || null;
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  },
  
  // Check if wallet is connected
  isWalletConnected: async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    
    const account = await coinbaseWalletService.getCurrentAccount();
    return !!account;
  },
  
  // Disconnect wallet
  disconnectWallet: async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    
    try {
      await provider.disconnect();
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  },
  
  // Create a new group with a smart wallet
  createGroup: async (
    name: string, 
    totalAmount: string, 
    numberOfSplitters: number, 
    creatorAddress: string
  ): Promise<SmartWalletGroup> => {
    if (typeof window === 'undefined') throw new Error('Cannot create group in server environment');
    
    try {
      // Generate a random wallet address for the group
      const walletAddress = ethers.Wallet.createRandom().address;
      
      // Calculate amount per person
      const amountPerPerson = (parseFloat(totalAmount) / numberOfSplitters).toFixed(2);
      
      // Generate unique payment statuses for each member
      const memberPayments: PaymentStatus[] = Array.from({ length: numberOfSplitters - 1 }, (_, i) => {
        const paymentId = Math.random().toString(36).substring(2, 15);
        const payment: PaymentStatus = {
          id: paymentId,
          amount: amountPerPerson,
          paid: false
        };
        
        // Store the payment in our payments record
        payments[paymentId] = payment;
        
        return payment;
      });
      
      // Create the group
      const groupId = Math.random().toString(36).substring(2, 15);
      const group: SmartWalletGroup = {
        id: groupId,
        name,
        totalAmount,
        walletAddress,
        creatorAddress,
        numberOfSplitters,
        amountPerPerson,
        payments: memberPayments,
        amountCollected: '0',
        createdAt: new Date(),
        network: DEFAULT_NETWORK,
        tokenSymbol: 'USDC',
        tokenAddress: USDC_TOKEN_ADDRESS
      };
      
      // Store the group
      groups[groupId] = group;
      
      // Save to localStorage
      saveToStorage(groups, payments);
      
      return group;
    } catch (error) {
      console.error('Error creating smart wallet group:', error);
      throw new Error('Failed to create smart wallet group');
    }
  },
  
  // Get payment by ID
  getPayment: (paymentId: string): { payment: PaymentStatus; group: SmartWalletGroup } | null => {
    if (typeof window === 'undefined') return null;
    
    // Reload from storage to ensure we have the latest data
    const storage = loadFromStorage();
    payments = storage.payments;
    groups = storage.groups;
    
    const payment = payments[paymentId];
    if (!payment) return null;
    
    const group = Object.values(groups).find(g => 
      g.payments.some(p => p.id === paymentId)
    );
    
    if (!group) return null;
    
    return { payment, group };
  },
  
  // Preview a token transfer without sending it
  previewTokenTransfer: async (
    toAddress: string,
    amount: string,
    tokenAddress: string
  ): Promise<void> => {
    if (typeof window === 'undefined') throw new Error('Cannot preview transfer in server environment');
    
    try {
      // Create ethers provider and signer
      const ethersProvider = new ethers.providers.Web3Provider(provider as any);
      const signer = ethersProvider.getSigner();
      
      // Create contract instance for the token
      const tokenContract = new ethers.Contract(
        tokenAddress,
        ERC20_ABI,
        signer
      );
      
      // Get token decimals
      let decimals = DEFAULT_TOKEN_DECIMALS;
      try {
        decimals = await tokenContract.decimals();
      } catch (error) {
        console.warn(`Failed to get token decimals, using default value of ${DEFAULT_TOKEN_DECIMALS}:`, error);
      }
      
      // Convert amount to token units with proper decimals
      const amountInTokenUnits = ethers.utils.parseUnits(amount, decimals);
      
      // Create a transaction object but don't send it
      // This will trigger the wallet's preview UI
      const unsignedTx = await tokenContract.populateTransaction.transfer(
        toAddress,
        amountInTokenUnits
      );
      
      // Estimate gas to make the transaction object more complete
      const gasEstimate = await ethersProvider.estimateGas(unsignedTx);
      unsignedTx.gasLimit = gasEstimate;
      
      // Just prepare the transaction without sending it
      // This should trigger the wallet's preview UI in most wallets
      await signer.populateTransaction(unsignedTx);
      
      console.log('Transaction preview prepared:', unsignedTx);
    } catch (error) {
      console.error('Error previewing token transfer:', error);
      throw new Error('Failed to preview token transfer: ' + (error as Error).message);
    }
  },
  
  // Make a payment to a group's smart wallet
  makePayment: async (
    paymentId: string,
    amount: string,
    fromAddress: string
  ): Promise<{ success: boolean; txHash?: string; explorerUrl?: string }> => {
    if (typeof window === 'undefined') throw new Error('Cannot make payment in server environment');
    
    try {
      // Reload from storage to ensure we have the latest data
      const storage = loadFromStorage();
      payments = storage.payments;
      groups = storage.groups;
      
      // Find the payment
      let payment = payments[paymentId];
      if (!payment) {
        console.warn(`Payment not found: ${paymentId}. Creating a new payment entry.`);
        // Create a new payment entry if it doesn't exist
        payment = {
          id: paymentId,
          amount: amount,
          paid: false
        };
        payments[paymentId] = payment;
      }
      
      // Find the group this payment belongs to
      let group = Object.values(groups).find(g => 
        g.payments.some(p => p.id === paymentId)
      );
      
      // If no group is found, create a temporary one
      if (!group) {
        console.warn(`No group found for payment: ${paymentId}. Creating a temporary group.`);
        // Generate a valid Ethereum address for the group wallet
        const randomWallet = ethers.Wallet.createRandom();
        const walletAddress = randomWallet.address;
        
        const tempGroupId = 'temp-' + Math.random().toString(36).substring(2, 9);
        group = {
          id: tempGroupId,
          name: 'Temporary Group',
          totalAmount: amount,
          walletAddress: walletAddress,
          creatorAddress: fromAddress,
          numberOfSplitters: 2,
          amountPerPerson: amount,
          payments: [payment],
          amountCollected: '0',
          createdAt: new Date(),
          network: DEFAULT_NETWORK,
          tokenSymbol: 'USDC',
          tokenAddress: USDC_TOKEN_ADDRESS
        };
        groups[tempGroupId] = group;
      }
      
      console.log('Preparing to make payment to:', group.walletAddress);
      
      // Validate the wallet address
      if (!isValidEthereumAddress(group.walletAddress)) {
        throw new Error(`Invalid wallet address: ${group.walletAddress}`);
      }
      
      // Create ethers provider and signer
      const ethersProvider = new ethers.providers.Web3Provider(provider as any);
      const signer = ethersProvider.getSigner();
      
      // Log the connected account
      const connectedAddress = await signer.getAddress();
      console.log('Connected wallet address:', connectedAddress);
      
      // Create contract instance for USDC
      const tokenContract = new ethers.Contract(
        USDC_TOKEN_ADDRESS,
        ERC20_ABI,
        signer
      );
      
      // Get token decimals
      let decimals = DEFAULT_TOKEN_DECIMALS;
      try {
        decimals = await tokenContract.decimals();
        console.log('Token decimals from contract:', decimals);
      } catch (error) {
        console.warn(`Failed to get token decimals, using default value of ${DEFAULT_TOKEN_DECIMALS}:`, error);
      }
      
      // Convert amount to token units with proper decimals
      const amountInTokenUnits = ethers.utils.parseUnits(amount, decimals);
      console.log('Amount in token units:', amountInTokenUnits.toString());
      
      // Check token balance before transfer
      try {
        const balance = await tokenContract.balanceOf(connectedAddress);
        console.log('Current token balance:', ethers.utils.formatUnits(balance, decimals));
        
        if (balance.lt(amountInTokenUnits)) {
          throw new Error(`Insufficient token balance. You have ${ethers.utils.formatUnits(balance, decimals)} USDC but trying to send ${amount} USDC`);
        }
      } catch (error) {
        console.warn('Failed to check token balance:', error);
      }
      
      // Check allowance and approve if needed
      try {
        const allowance = await tokenContract.allowance(connectedAddress, USDC_TOKEN_ADDRESS);
        console.log('Current allowance:', ethers.utils.formatUnits(allowance, decimals));
       
        if (allowance.lt(amountInTokenUnits)) {
          console.log('Insufficient allowance, approving tokens...');
          // Approve a large amount to avoid needing to approve for future transactions
          const approveTx = await tokenContract.approve(
            USDC_TOKEN_ADDRESS,
            ethers.constants.MaxUint256,
            { gasLimit: ethers.utils.hexlify(100000) }
          );
          
          console.log('Approval transaction sent, waiting for confirmation...', approveTx.hash);
          const approveReceipt = await approveTx.wait();
          console.log('Approval confirmed:', approveReceipt.transactionHash);
        }
      } catch (error) {
        console.warn('Failed to check or set allowance:', error);
        // Continue with transfer attempt even if allowance check fails
      }
      
      // Send the transaction
      console.log(`Sending ${amount} USDC from ${fromAddress} to ${group.walletAddress}`);
      
      // Explicitly call the transfer function with proper parameters
      const tx = await tokenContract.transfer(
        group.walletAddress,
        amountInTokenUnits,
        { 
          gasLimit: ethers.utils.hexlify(100000) // Provide a gas limit
        }
      );
      
      // Wait for transaction to be mined
      console.log('Transaction sent, waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.transactionHash);
      
      // Get the explorer URL
      const explorerUrl = getExplorerUrl(receipt.transactionHash);
      
      // Update payment status
      payment.paid = true;
      payment.paidAt = new Date();
      payment.paidBy = fromAddress;
      payment.transactionHash = receipt.transactionHash;
      payment.txHash = receipt.transactionHash;
      payment.explorerUrl = explorerUrl;
      
      // Update the amount collected
      const amountCollected = parseFloat(group.amountCollected || '0') + parseFloat(amount);
      console.log('Updating amountCollected:', {
        previous: group.amountCollected,
        amount: amount,
        new: amountCollected.toFixed(2)
      });
      group.amountCollected = amountCollected.toFixed(2);
      
      // Update the payment in the group's payments array
      const paymentIndex = group.payments.findIndex(p => p.id === paymentId);
      if (paymentIndex !== -1) {
        group.payments[paymentIndex] = payment;
      } else {
        // Add the payment to the group if it's not already there
        group.payments.push(payment);
      }
      
      // Save to localStorage
      payments[paymentId] = payment;
      groups[group.id] = group;
      
      // Log the updated group data
      console.log('Updated group data:', group);
      
      // Ensure the data is properly saved to localStorage
      saveToStorage(groups, payments);
      
      // Verify the data was saved correctly
      const verifyStorage = loadFromStorage();
      console.log('Verified group data after save:', verifyStorage.groups[group.id]);
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        explorerUrl
      };
    } catch (error) {
      console.error('Error making payment:', error);
      throw new Error('Failed to make payment: ' + (error as Error).message);
    }
  },
  
  // Claim funds from a group's smart wallet
  claimFunds: async (
    groupId: string,
    toAddress: string
  ): Promise<{ success: boolean; txHash?: string; explorerUrl?: string }> => {
    if (typeof window === 'undefined') throw new Error('Cannot claim funds in server environment');
    
    try {
      // Reload from storage to ensure we have the latest data
      const storage = loadFromStorage();
      groups = storage.groups;
      
      const group = groups[groupId];
      if (!group) {
        throw new Error('Group not found');
      }
      
      // Check if there are any funds to claim
      if (parseFloat(group.amountCollected) <= 0) {
        throw new Error('No funds to claim');
      }
      
      console.log('Preparing to claim funds from group:', group.name);
      
      // Validate the destination address
      if (!isValidEthereumAddress(toAddress)) {
        throw new Error(`Invalid destination address: ${toAddress}`);
      }
      
      // Create ethers provider and signer
      const ethersProvider = new ethers.providers.Web3Provider(provider as any);
      const signer = ethersProvider.getSigner();
      
      // Log the connected account
      const connectedAddress = await signer.getAddress();
      console.log('Connected wallet address:', connectedAddress);
      
      // Create contract instance for USDC
      const tokenContract = new ethers.Contract(
        USDC_TOKEN_ADDRESS,
        ERC20_ABI,
        signer
      );
      
      // Get token decimals
      let decimals = DEFAULT_TOKEN_DECIMALS;
      try {
        decimals = await tokenContract.decimals();
        console.log('Token decimals from contract:', decimals);
      } catch (error) {
        console.warn(`Failed to get token decimals, using default value of ${DEFAULT_TOKEN_DECIMALS}:`, error);
      }
      
      // Convert amount to token units with proper decimals
      const amountInTokenUnits = ethers.utils.parseUnits(group.amountCollected, decimals);
      console.log('Amount to claim in token units:', amountInTokenUnits.toString());
      
      // Check token balance before transfer
      try {
        const balance = await tokenContract.balanceOf(connectedAddress);
        console.log('Current token balance:', ethers.utils.formatUnits(balance, decimals));
        
        if (balance.lt(amountInTokenUnits)) {
          throw new Error(`Insufficient token balance. You have ${ethers.utils.formatUnits(balance, decimals)} USDC but trying to send ${group.amountCollected} USDC`);
        }
      } catch (error) {
        console.warn('Failed to check token balance:', error);
      }
      
      // In a real implementation, this would be a proper smart contract wallet
      // For now, we'll transfer from the user's wallet to simulate claiming
      console.log(`Claiming ${group.amountCollected} USDC to ${toAddress}`);
      
      // Explicitly call the transfer function with proper parameters
      const tx = await tokenContract.transfer(
        toAddress,
        amountInTokenUnits,
        { 
          gasLimit: ethers.utils.hexlify(100000) // Provide a gas limit
        }
      );
      
      // Wait for transaction to be mined
      console.log('Transaction sent, waiting for confirmation...', tx.hash);
      const receipt = await tx.wait();
      console.log('Transaction confirmed:', receipt.transactionHash);
      
      // Get the explorer URL
      const explorerUrl = getExplorerUrl(receipt.transactionHash);
      
      // Reset the amount collected after claiming
      group.amountCollected = '0';
      
      // Save to localStorage
      groups[groupId] = group;
      saveToStorage(groups, payments);
      
      return {
        success: true,
        txHash: receipt.transactionHash,
        explorerUrl
      };
    } catch (error) {
      console.error('Error claiming funds:', error);
      throw new Error('Failed to claim funds: ' + (error as Error).message);
    }
  },
  
  // Get a group by ID
  getGroup: (groupId: string): SmartWalletGroup | undefined => {
    if (typeof window === 'undefined') return undefined;
    
    // Reload from storage to ensure we have the latest data
    const storage = loadFromStorage();
    groups = storage.groups;
    
    return groups[groupId];
  },
  
  // Get all groups created by a user
  getUserGroups: (userAddress: string): SmartWalletGroup[] => {
    if (typeof window === 'undefined') return [];
    
    // Reload from storage to ensure we have the latest data
    const storage = loadFromStorage();
    groups = storage.groups;
    
    return Object.values(groups).filter(group => 
      group.creatorAddress.toLowerCase() === userAddress.toLowerCase()
    );
  },
  
  // Get network information
  getNetworkInfo: async () => {
    if (typeof window === 'undefined') {
      return {
        chainId: '0x14a34', // Base Sepolia chain ID in hex
        network: DEFAULT_NETWORK,
        tokenSymbol: 'USDC',
        tokenAddress: USDC_TOKEN_ADDRESS
      };
    }
    
    try {
      const chainId = await provider.request({ method: 'eth_chainId' });
      return {
        chainId,
        network: DEFAULT_NETWORK,
        tokenSymbol: 'USDC',
        tokenAddress: USDC_TOKEN_ADDRESS
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return {
        chainId: '0x14a34', // Base Sepolia chain ID in hex
        network: DEFAULT_NETWORK,
        tokenSymbol: 'USDC',
        tokenAddress: USDC_TOKEN_ADDRESS
      };
    }
  },
  
  // Update a member's name
  updateMemberName: (
    groupId: string,
    paymentId: string,
    memberName: string
  ): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      // Reload from storage to ensure we have the latest data
      const storage = loadFromStorage();
      payments = storage.payments;
      groups = storage.groups;
      
      const group = groups[groupId];
      if (!group) {
        console.error('Group not found:', groupId);
        return false;
      }
      
      // Find the payment in the group
      const paymentIndex = group.payments.findIndex(p => p.id === paymentId);
      if (paymentIndex === -1) {
        console.error('Payment not found in group:', paymentId);
        return false;
      }
      
      // Update the member name
      group.payments[paymentIndex].memberName = memberName;
      
      // Also update in the payments object
      if (payments[paymentId]) {
        payments[paymentId].memberName = memberName;
      }
      
      // Save to localStorage
      groups[groupId] = group;
      saveToStorage(groups, payments);
      
      return true;
    } catch (error) {
      console.error('Error updating member name:', error);
      return false;
    }
  },
  
  // Update a group's amountCollected
  updateGroupAmountCollected: (groupId: string): boolean => {
    if (typeof window === 'undefined') return false;
    
    try {
      console.log(`Starting updateGroupAmountCollected for group ${groupId}`);
      
      // Reload from storage to ensure we have the latest data
      const storage = loadFromStorage();
      groups = storage.groups;
      payments = storage.payments;
      
      console.log('All groups in storage:', Object.keys(groups));
      console.log('All payments in storage:', Object.keys(payments));
      
      const group = groups[groupId];
      if (!group) {
        console.error('Group not found:', groupId);
        return false;
      }
      
      console.log('Group found:', group);
      console.log('Group payments:', group.payments);
      
      // Calculate the total amount collected from all paid payments
      let totalCollected = 0;
      for (const payment of group.payments) {
        const paymentData = payments[payment.id];
        console.log(`Checking payment ${payment.id}:`, paymentData);
        
        if (paymentData && paymentData.paid) {
          console.log(`Adding paid payment amount: ${paymentData.amount}`);
          totalCollected += parseFloat(paymentData.amount);
        }
      }
      
      // Update the group's amountCollected
      console.log(`Updating group ${groupId} amountCollected from ${group.amountCollected} to ${totalCollected.toFixed(2)}`);
      group.amountCollected = totalCollected.toFixed(2);
      
      // Save to localStorage
      groups[groupId] = group;
      saveToStorage(groups, payments);
      
      // Verify the update was saved
      const verifyStorage = loadFromStorage();
      console.log('Verified group after update:', verifyStorage.groups[groupId]);
      
      return true;
    } catch (error) {
      console.error('Error updating group amount collected:', error);
      return false;
    }
  },
}; 