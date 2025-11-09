/**
 * Payment utilities for M2 program
 */

// DOT price in USD for August-September 2025 period
export const DOT_PRICE_USD = 3.4;

export type Payment = {
  milestone: 'M1' | 'M2';
  amount: number;
  currency: 'USDC' | 'DOT';
  transactionProof: string;
};

/**
 * Calculate total paid amount in USDC equivalent
 */
export function calculateTotalPaidUSD(totalPaid?: Payment[]): number {
  if (!totalPaid || totalPaid.length === 0) return 0;
  
  return totalPaid.reduce((sum, payment) => {
    if (payment.currency === 'USDC') {
      return sum + payment.amount;
    } else if (payment.currency === 'DOT') {
      return sum + (payment.amount * DOT_PRICE_USD);
    }
    return sum;
  }, 0);
}

/**
 * Format payment amount with currency
 */
export function formatPaymentAmount(amount: number, currency: 'USDC' | 'DOT'): string {
  if (currency === 'DOT') {
    return `${amount.toLocaleString()} DOT`;
  }
  return `$${amount.toLocaleString()} ${currency}`;
}

/**
 * Get total amount for a specific currency
 */
export function getTotalByCurrency(totalPaid?: Payment[], currency: 'USDC' | 'DOT'): number {
  if (!totalPaid || totalPaid.length === 0) return 0;
  
  return totalPaid
    .filter(p => p.currency === currency)
    .reduce((sum, payment) => sum + payment.amount, 0);
}

