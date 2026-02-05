import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';

export interface CategoryBudget {
  id: string;
  categoryId: string;
  amount: number;
  currency: string;
  month: string; // Format: YYYY-MM
  createdAt: string;
  updatedAt: string;
}

interface BudgetDB {
  budgets: {
    key: string;
    value: CategoryBudget;
    indexes: {
      'by-category': string;
      'by-month': string;
    };
  };
}

let budgetDbInstance: IDBPDatabase<BudgetDB> | null = null;

async function getBudgetDB(): Promise<IDBPDatabase<BudgetDB>> {
  if (budgetDbInstance) return budgetDbInstance;

  budgetDbInstance = await openDB<BudgetDB>('mfo-budgets', 1, {
    upgrade(db) {
      const store = db.createObjectStore('budgets', { keyPath: 'id' });
      store.createIndex('by-category', 'categoryId');
      store.createIndex('by-month', 'month');
    },
  });

  return budgetDbInstance;
}

export async function setBudget(
  categoryId: string,
  amount: number,
  currency: string,
  year: number,
  month: number
): Promise<CategoryBudget> {
  const db = await getBudgetDB();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const now = new Date().toISOString();

  // Check if budget already exists for this category/month
  const all = await db.getAll('budgets');
  const existing = all.find(b => b.categoryId === categoryId && b.month === monthKey);

  if (existing) {
    const updated: CategoryBudget = {
      ...existing,
      amount,
      currency,
      updatedAt: now,
    };
    await db.put('budgets', updated);
    return updated;
  }

  const newBudget: CategoryBudget = {
    id: uuidv4(),
    categoryId,
    amount,
    currency,
    month: monthKey,
    createdAt: now,
    updatedAt: now,
  };
  await db.put('budgets', newBudget);
  return newBudget;
}

export async function getBudgetsByMonth(year: number, month: number): Promise<CategoryBudget[]> {
  const db = await getBudgetDB();
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const all = await db.getAll('budgets');
  return all.filter(b => b.month === monthKey);
}

export async function deleteBudget(id: string): Promise<void> {
  const db = await getBudgetDB();
  await db.delete('budgets', id);
}

export async function copyBudgetsToMonth(
  fromYear: number,
  fromMonth: number,
  toYear: number,
  toMonth: number
): Promise<CategoryBudget[]> {
  const existing = await getBudgetsByMonth(fromYear, fromMonth);
  const results: CategoryBudget[] = [];

  for (const budget of existing) {
    const copied = await setBudget(
      budget.categoryId,
      budget.amount,
      budget.currency,
      toYear,
      toMonth
    );
    results.push(copied);
  }

  return results;
}
