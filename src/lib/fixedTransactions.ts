import { getDB, Transaction, getTransactionsByMonth, addTransaction } from './db';

/**
 * Get the key for tracking which months have been processed for fixed transactions
 */
function getMonthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * Get all fixed transactions from a specific month
 */
async function getFixedTransactionsFromMonth(year: number, month: number): Promise<Transaction[]> {
  const transactions = await getTransactionsByMonth(year, month);
  return transactions.filter(tx => tx.isFixed);
}

/**
 * Check if fixed transactions have already been generated for a specific month
 */
async function isMonthProcessed(year: number, month: number): Promise<boolean> {
  const db = await getDB();
  const settings = await db.get('settings', 'user');
  if (!settings) return false;
  
  const processedMonths: string[] = settings.processedFixedMonths || [];
  return processedMonths.includes(getMonthKey(year, month));
}

/**
 * Mark a month as processed for fixed transactions
 */
async function markMonthAsProcessed(year: number, month: number): Promise<void> {
  const db = await getDB();
  const settings = await db.get('settings', 'user');
  if (!settings) return;
  
  const processedMonths: string[] = settings.processedFixedMonths || [];
  const monthKey = getMonthKey(year, month);
  
  if (!processedMonths.includes(monthKey)) {
    processedMonths.push(monthKey);
    await db.put('settings', {
      ...settings,
      processedFixedMonths: processedMonths,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Generate fixed transactions for the current month based on previous month's fixed transactions
 * This should be called when the app loads or when navigating to a new month
 */
export async function generateFixedTransactionsForMonth(year: number, month: number): Promise<number> {
  // Don't process if already done
  if (await isMonthProcessed(year, month)) {
    return 0;
  }
  
  // Get previous month
  let prevYear = year;
  let prevMonth = month - 1;
  if (prevMonth < 0) {
    prevMonth = 11;
    prevYear -= 1;
  }
  
  // Get fixed transactions from previous month
  const previousFixedTransactions = await getFixedTransactionsFromMonth(prevYear, prevMonth);
  
  if (previousFixedTransactions.length === 0) {
    // Mark as processed even if no transactions to copy
    await markMonthAsProcessed(year, month);
    return 0;
  }
  
  // Create new transactions for this month
  let createdCount = 0;
  
  for (const tx of previousFixedTransactions) {
    // Calculate the new date (same day, new month)
    const originalDate = new Date(tx.date);
    const newDate = new Date(year, month, originalDate.getDate());
    
    // Handle edge cases where the day doesn't exist in the new month (e.g., Jan 31 -> Feb 28)
    if (newDate.getMonth() !== month) {
      // Day doesn't exist, use last day of month
      newDate.setDate(0); // Goes to last day of previous month
      newDate.setMonth(month + 1);
      newDate.setDate(0);
    }
    
    // Create new transaction (not completed by default)
    await addTransaction({
      type: tx.type,
      value: tx.value,
      currency: tx.currency,
      description: tx.description,
      categoryId: tx.categoryId,
      accountId: tx.accountId,
      date: newDate.toISOString().split('T')[0],
      isCompleted: false, // New month's fixed expenses start as pending
      isFixed: true,
      isRepeating: false,
      observation: tx.observation,
      tags: [...tx.tags],
    });
    
    createdCount++;
  }
  
  // Mark month as processed
  await markMonthAsProcessed(year, month);
  
  return createdCount;
}

/**
 * Initialize fixed transactions on app startup
 * Generates fixed transactions for current month if not already done
 */
export async function initializeFixedTransactions(): Promise<void> {
  const now = new Date();
  await generateFixedTransactionsForMonth(now.getFullYear(), now.getMonth());
}
