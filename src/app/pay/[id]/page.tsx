'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import PaymentPage from '@/components/PaymentPage';
import Head from 'next/head';

export default function PaymentRoute({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const [paymentData, setPaymentData] = useState({
    groupName: '',
    amount: '',
    paymentId: '',
  });

  // Extract the payment ID from the pathname instead of params
  useEffect(() => {
    // Get the ID from the pathname (last segment after the last slash)
    const pathSegments = pathname.split('/');
    const idFromPath = pathSegments[pathSegments.length - 1];
    
    if (idFromPath) {
      // Get payment details from URL parameters
      const amount = searchParams.get('amount') || '0';
      const groupName = searchParams.get('group') || 'Expense Group';

      setPaymentData({
        groupName,
        amount,
        paymentId: idFromPath,
      });

      setIsLoading(false);
    }
  }, [pathname, searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-red-500 border-gray-200 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-700">Loading payment details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md mb-4 text-center">
        <h1 className="text-xl font-bold text-red-600">
          Settle Payment Request
        </h1>
        <p className="text-sm text-gray-600">
          Base Sepolia Network • USDC Payments
        </p>
      </div>
      
      <PaymentPage
        groupName={paymentData.groupName}
        amount={paymentData.amount}
        paymentId={paymentData.paymentId}
      />
    </div>
  );
} 