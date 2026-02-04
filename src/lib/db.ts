import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

// Types
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  value: number;
  currency: string;
  description: string;
  categoryId: string;
  accountId: string;
  date: string;
  isCompleted: boolean;
  completedAt?: string;
  isFixed: boolean;
  isRepeating: boolean;
  repeatConfig?: RepeatConfig;
  repeatIndex?: number;
  repeatTotal?: number;
  parentRepeatId?: string;
  observation: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RepeatConfig {
  times: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
  customDays?: number;
}

export interface Category {
  id: string;
  type: 'income' | 'expense';
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  name: string;
  color: string;
  icon: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  name: string;
  email: string;
  notes: string;
  biometricsEnabled: boolean;
  accentColor: string;
  theme: 'auto' | 'light' | 'dark' | 'high-contrast';
  dateFormat: 'auto' | 'dd/mm' | 'mm/dd';
  language: string;
  defaultCurrency: string;
  firstLaunchLang: string;
  processedFixedMonths: string[]; // Track which months have had fixed transactions generated
  createdAt: string;
  updatedAt: string;
}

interface MFODatabase extends DBSchema {
  transactions: {
    key: string;
    value: Transaction;
    indexes: {
      'by-date': string;
      'by-type': string;
      'by-category': string;
      'by-account': string;
    };
  };
  categories: {
    key: string;
    value: Category;
    indexes: {
      'by-type': string;
    };
  };
  accounts: {
    key: string;
    value: Account;
  };
  settings: {
    key: string;
    value: UserSettings;
  };
}

let dbInstance: IDBPDatabase<MFODatabase> | null = null;

export async function getDB(): Promise<IDBPDatabase<MFODatabase>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<MFODatabase>('mfo-database', 1, {
    upgrade(db) {
      // Transactions store
      const txStore = db.createObjectStore('transactions', { keyPath: 'id' });
      txStore.createIndex('by-date', 'date');
      txStore.createIndex('by-type', 'type');
      txStore.createIndex('by-category', 'categoryId');
      txStore.createIndex('by-account', 'accountId');

      // Categories store
      const catStore = db.createObjectStore('categories', { keyPath: 'id' });
      catStore.createIndex('by-type', 'type');

      // Accounts store
      db.createObjectStore('accounts', { keyPath: 'id' });

      // Settings store
      db.createObjectStore('settings', { keyPath: 'id' });
    },
  });

  return dbInstance;
}

// Currency detection
export function detectUserCurrency(): string {
  try {
    const locale = navigator.language;
    const formatter = new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' });
    const parts = formatter.formatToParts(1);
    
    // Map common locales to currencies
    const localeCurrencyMap: Record<string, string> = {
      'pt-BR': 'BRL',
      'en-US': 'USD',
      'en-GB': 'GBP',
      'de-DE': 'EUR',
      'fr-FR': 'EUR',
      'es-ES': 'EUR',
      'es-MX': 'MXN',
      'es-AR': 'ARS',
      'es-CL': 'CLP',
      'es-CO': 'COP',
      'ja-JP': 'JPY',
      'zh-CN': 'CNY',
    };

    return localeCurrencyMap[locale] || 'USD';
  } catch {
    return 'USD';
  }
}

// Default categories
export const defaultIncomeCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { type: 'income', name: 'noCategory', color: '#6B7280', icon: 'Circle', isDefault: true, isSystem: true },
  { type: 'income', name: 'investments', color: '#10B981', icon: 'TrendingUp', isDefault: false, isSystem: true },
  { type: 'income', name: 'salary', color: '#3B82F6', icon: 'Briefcase', isDefault: false, isSystem: true },
  { type: 'income', name: 'prizes', color: '#F59E0B', icon: 'Trophy', isDefault: false, isSystem: true },
  { type: 'income', name: 'sales', color: '#8B5CF6', icon: 'ShoppingBag', isDefault: false, isSystem: true },
];

export const defaultExpenseCategories: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { type: 'expense', name: 'noCategory', color: '#6B7280', icon: 'Circle', isDefault: true, isSystem: true },
  { type: 'expense', name: 'food', color: '#F97316', icon: 'Utensils', isDefault: false, isSystem: true },
  { type: 'expense', name: 'rent', color: '#EF4444', icon: 'Home', isDefault: false, isSystem: true },
  { type: 'expense', name: 'pets', color: '#EC4899', icon: 'Heart', isDefault: false, isSystem: true },
  { type: 'expense', name: 'gifts', color: '#A855F7', icon: 'Gift', isDefault: false, isSystem: true },
  { type: 'expense', name: 'education', color: '#6366F1', icon: 'GraduationCap', isDefault: false, isSystem: true },
  { type: 'expense', name: 'health', color: '#14B8A6', icon: 'Heart', isDefault: false, isSystem: true },
  { type: 'expense', name: 'leisure', color: '#F59E0B', icon: 'Gamepad2', isDefault: false, isSystem: true },
  { type: 'expense', name: 'utilities', color: '#64748B', icon: 'Zap', isDefault: false, isSystem: true },
  { type: 'expense', name: 'travel', color: '#0EA5E9', icon: 'Plane', isDefault: false, isSystem: true },
];

// Initialize database with defaults
export async function initializeDB(): Promise<void> {
  const db = await getDB();

  // Check if already initialized
  const settings = await db.get('settings', 'user');
  if (settings) return;

  const now = new Date().toISOString();
  const userLang = navigator.language.toLowerCase().includes('pt') ? 'pt-br' : 'en';

  // Create default settings
  const defaultSettings: UserSettings = {
    id: 'user',
    name: '',
    email: '',
    notes: '',
    biometricsEnabled: false,
    accentColor: '#8B5CF6',
    theme: 'auto',
    dateFormat: 'auto',
    language: userLang,
    defaultCurrency: detectUserCurrency(),
    firstLaunchLang: userLang,
    processedFixedMonths: [],
    createdAt: now,
    updatedAt: now,
  };
  await db.put('settings', defaultSettings);

  // Create default account
  const defaultAccount: Account = {
    id: uuidv4(),
    name: 'defaultAccount',
    color: '#8B5CF6',
    icon: 'Wallet',
    isDefault: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('accounts', defaultAccount);

  // Create default income categories
  for (const cat of defaultIncomeCategories) {
    const category: Category = {
      ...cat,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('categories', category);
  }

  // Create default expense categories
  for (const cat of defaultExpenseCategories) {
    const category: Category = {
      ...cat,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    await db.put('categories', category);
  }
}

// Transaction operations
export async function addTransaction(transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newTransaction: Transaction = {
    ...transaction,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put('transactions', newTransaction);
  return newTransaction;
}

// Add recurring transactions (creates multiple installments)
export async function addRecurringTransaction(
  transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Transaction[]> {
  if (!transaction.isRepeating || !transaction.repeatConfig) {
    const single = await addTransaction(transaction);
    return [single];
  }

  const db = await getDB();
  const now = new Date().toISOString();
  const parentId = uuidv4();
  const { times, period, customDays } = transaction.repeatConfig;
  const transactions: Transaction[] = [];
  const baseDate = new Date(transaction.date);

  for (let i = 0; i < times; i++) {
    const installmentDate = new Date(baseDate);
    
    switch (period) {
      case 'daily':
        installmentDate.setDate(baseDate.getDate() + i);
        break;
      case 'weekly':
        installmentDate.setDate(baseDate.getDate() + (i * 7));
        break;
      case 'monthly':
        installmentDate.setMonth(baseDate.getMonth() + i);
        break;
      case 'yearly':
        installmentDate.setFullYear(baseDate.getFullYear() + i);
        break;
      case 'custom':
        installmentDate.setDate(baseDate.getDate() + (i * (customDays || 30)));
        break;
    }

    const newTransaction: Transaction = {
      ...transaction,
      id: uuidv4(),
      date: installmentDate.toISOString().split('T')[0],
      parentRepeatId: parentId,
      repeatIndex: i + 1,
      repeatTotal: times,
      createdAt: now,
      updatedAt: now,
    };
    
    await db.put('transactions', newTransaction);
    transactions.push(newTransaction);
  }

  return transactions;
}

export async function updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction | undefined> {
  const db = await getDB();
  const existing = await db.get('transactions', id);
  if (!existing) return undefined;

  const updated: Transaction = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.put('transactions', updated);
  return updated;
}

export async function deleteTransaction(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('transactions', id);
}

// Delete all transactions in a recurring group
export async function deleteRecurringTransactions(parentRepeatId: string): Promise<void> {
  const db = await getDB();
  const all = await db.getAll('transactions');
  const toDelete = all.filter(tx => tx.parentRepeatId === parentRepeatId);
  for (const tx of toDelete) {
    await db.delete('transactions', tx.id);
  }
}

// Delete only pending (not completed) transactions in a recurring group
export async function deletePendingRecurringTransactions(parentRepeatId: string): Promise<number> {
  const db = await getDB();
  const all = await db.getAll('transactions');
  const toDelete = all.filter(tx => tx.parentRepeatId === parentRepeatId && !tx.isCompleted);
  for (const tx of toDelete) {
    await db.delete('transactions', tx.id);
  }
  return toDelete.length;
}

export async function getTransactions(): Promise<Transaction[]> {
  const db = await getDB();
  return db.getAll('transactions');
}

export async function getTransactionsByMonth(year: number, month: number): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAll('transactions');
  return all.filter(tx => {
    const date = new Date(tx.date);
    return date.getFullYear() === year && date.getMonth() === month;
  });
}

export async function getTransactionsByDateRange(startDate: string, endDate: string): Promise<Transaction[]> {
  const db = await getDB();
  const all = await db.getAll('transactions');
  return all.filter(tx => tx.date >= startDate && tx.date <= endDate);
}

// Category operations
export async function addCategory(category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newCategory: Category = {
    ...category,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put('categories', newCategory);
  return newCategory;
}

export async function updateCategory(id: string, updates: Partial<Category>): Promise<Category | undefined> {
  const db = await getDB();
  const existing = await db.get('categories', id);
  if (!existing) return undefined;

  const updated: Category = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.put('categories', updated);
  return updated;
}

export async function deleteCategory(id: string, moveToId: string): Promise<void> {
  const db = await getDB();
  
  // Move all transactions to new category
  const transactions = await db.getAll('transactions');
  for (const tx of transactions) {
    if (tx.categoryId === id) {
      await db.put('transactions', { ...tx, categoryId: moveToId, updatedAt: new Date().toISOString() });
    }
  }
  
  await db.delete('categories', id);
}

export async function getCategories(): Promise<Category[]> {
  const db = await getDB();
  return db.getAll('categories');
}

export async function getCategoriesByType(type: 'income' | 'expense'): Promise<Category[]> {
  const db = await getDB();
  const all = await db.getAll('categories');
  return all.filter(cat => cat.type === type);
}

// Account operations
export async function addAccount(account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>): Promise<Account> {
  const db = await getDB();
  const now = new Date().toISOString();
  const newAccount: Account = {
    ...account,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  await db.put('accounts', newAccount);
  return newAccount;
}

export async function updateAccount(id: string, updates: Partial<Account>): Promise<Account | undefined> {
  const db = await getDB();
  const existing = await db.get('accounts', id);
  if (!existing) return undefined;

  const updated: Account = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.put('accounts', updated);
  return updated;
}

export async function deleteAccount(id: string, moveToId: string): Promise<void> {
  const db = await getDB();
  
  // Move all transactions to new account
  const transactions = await db.getAll('transactions');
  for (const tx of transactions) {
    if (tx.accountId === id) {
      await db.put('transactions', { ...tx, accountId: moveToId, updatedAt: new Date().toISOString() });
    }
  }
  
  await db.delete('accounts', id);
}

export async function getAccounts(): Promise<Account[]> {
  const db = await getDB();
  return db.getAll('accounts');
}

// Settings operations
export async function getSettings(): Promise<UserSettings | undefined> {
  const db = await getDB();
  return db.get('settings', 'user');
}

export async function updateSettings(updates: Partial<UserSettings>): Promise<UserSettings | undefined> {
  const db = await getDB();
  const existing = await db.get('settings', 'user');
  if (!existing) return undefined;

  const updated: UserSettings = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  await db.put('settings', updated);
  return updated;
}

// Delete all data
export async function deleteAllData(): Promise<void> {
  const db = await getDB();
  
  // Clear all stores
  await db.clear('transactions');
  await db.clear('categories');
  await db.clear('accounts');
  await db.clear('settings');
  
  // Reinitialize with defaults
  await initializeDB();
}

// Calculate account balances
export async function getAccountBalances(): Promise<Record<string, Record<string, number>>> {
  const db = await getDB();
  const transactions = await db.getAll('transactions');
  const accounts = await db.getAll('accounts');
  
  const balances: Record<string, Record<string, number>> = {};
  
  for (const account of accounts) {
    balances[account.id] = {};
  }
  
  for (const tx of transactions) {
    if (!tx.isCompleted) continue;
    
    if (!balances[tx.accountId]) {
      balances[tx.accountId] = {};
    }
    
    if (!balances[tx.accountId][tx.currency]) {
      balances[tx.accountId][tx.currency] = 0;
    }
    
    if (tx.type === 'income') {
      balances[tx.accountId][tx.currency] += tx.value;
    } else {
      balances[tx.accountId][tx.currency] -= tx.value;
    }
  }
  
  return balances;
}
