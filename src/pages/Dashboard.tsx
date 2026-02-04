import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { getAccounts, getTransactionsByMonth, getAccountBalances, getCategories, Account, Transaction, Category } from '@/lib/db';
import { generateFixedTransactionsForMonth } from '@/lib/fixedTransactions';
import { formatCurrency } from '@/lib/currencies';
import { Plus, PiggyBank, WifiOff, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionSheet from '@/components/TransactionSheet';
import { TransactionList } from '@/components/TransactionList';
import { MonthPicker } from '@/components/MonthPicker';
import { TransactionFilters, TransactionFiltersState, defaultFilters, filterTransactions } from '@/components/TransactionFilters';

export default function Dashboard() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Record<string, Record<string, number>>>({});
  const [showFab, setShowFab] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | null>(null);
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState<TransactionFiltersState>(defaultFilters);

  const loadData = async () => {
    // First, generate fixed transactions for the selected month if not already done
    await generateFixedTransactionsForMonth(currentDate.getFullYear(), currentDate.getMonth());
    
    const [acc, cats, tx, bal] = await Promise.all([
      getAccounts(),
      getCategories(),
      getTransactionsByMonth(currentDate.getFullYear(), currentDate.getMonth()),
      getAccountBalances(),
    ]);
    setAccounts(acc);
    setCategories(cats);
    setTransactions(tx);
    setBalances(bal);
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  // Apply filters
  const filteredTransactions = useMemo(() => {
    return filterTransactions(transactions, filters);
  }, [transactions, filters]);

  const incomes = transactions.filter(tx => tx.type === 'income');
  const expenses = transactions.filter(tx => tx.type === 'expense');
  const totalIncome = incomes.reduce((sum, tx) => sum + tx.value, 0);
  const totalExpense = expenses.reduce((sum, tx) => sum + tx.value, 0);
  const pendingIncome = incomes.filter(tx => !tx.isCompleted).reduce((sum, tx) => sum + tx.value, 0);
  const pendingExpense = expenses.filter(tx => !tx.isCompleted).reduce((sum, tx) => sum + tx.value, 0);

  const handleTransactionClick = (tx: Transaction) => {
    setEditTransaction(tx);
    setTransactionType(tx.type);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <PiggyBank className="h-8 w-8 text-primary" />
              <WifiOff className="h-3 w-3 text-muted-foreground absolute -bottom-0.5 -right-0.5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">{t('app.name')}</h1>
              <p className="text-xs text-muted-foreground">{t('app.fullName')}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Month Selector */}
        <MonthPicker currentDate={currentDate} onDateChange={setCurrentDate} />

        {/* Account Balances */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('account.accountBalance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.map(account => (
              <div key={account.id} className="flex justify-between items-center py-2 border-b last:border-0">
                <span className="font-medium">{account.isDefault ? t('account.defaultAccount') : account.name}</span>
                <div className="text-right">
                  {Object.entries(balances[account.id] || {}).map(([currency, value]) => (
                    <div key={currency} className={value >= 0 ? 'text-income' : 'text-expense'}>
                      {formatCurrency(value, currency)}
                    </div>
                  ))}
                  {!Object.keys(balances[account.id] || {}).length && (
                    <span className="text-muted-foreground">--</span>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Income & Expense Summary */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-l-4 border-l-income">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-income" />
                <span className="text-sm text-muted-foreground">{t('dashboard.totalIncome')}</span>
              </div>
              <p className="text-xl font-bold text-income">{formatCurrency(totalIncome, 'BRL')}</p>
              {pendingIncome > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.toReceive')}: {formatCurrency(pendingIncome, 'BRL')}
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-expense">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="h-4 w-4 text-expense" />
                <span className="text-sm text-muted-foreground">{t('dashboard.totalExpense')}</span>
              </div>
              <p className="text-xl font-bold text-expense">{formatCurrency(totalExpense, 'BRL')}</p>
              {pendingExpense > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('dashboard.toPay')}: {formatCurrency(pendingExpense, 'BRL')}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <TransactionFilters
          filters={filters}
          onFiltersChange={setFilters}
          categories={categories}
          accounts={accounts}
        />

        {/* Transactions List */}
        <TransactionList
          transactions={filteredTransactions}
          categories={categories}
          accounts={accounts}
          onTransactionClick={handleTransactionClick}
          onTransactionUpdate={loadData}
        />
      </main>

      {/* FAB */}
      <div className="fixed right-4 bottom-24 z-50">
        {showFab && (
          <div className="absolute bottom-16 right-0 flex flex-col gap-2 animate-fade-in">
            <Button
              className="bg-income hover:bg-income/90 text-income-foreground shadow-lg"
              onClick={() => { setTransactionType('income'); setShowFab(false); }}
            >
              <TrendingUp className="h-4 w-4 mr-2" />
              {t('transaction.income')}
            </Button>
            <Button
              className="bg-expense hover:bg-expense/90 text-expense-foreground shadow-lg"
              onClick={() => { setTransactionType('expense'); setShowFab(false); }}
            >
              <TrendingDown className="h-4 w-4 mr-2" />
              {t('transaction.expense')}
            </Button>
          </div>
        )}
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-xl bg-primary hover:bg-primary/90"
          onClick={() => setShowFab(!showFab)}
        >
          <Plus className={`h-6 w-6 transition-transform ${showFab ? 'rotate-45' : ''}`} />
        </Button>
      </div>

      {/* Transaction Sheet */}
      <TransactionSheet
        type={transactionType}
        editTransaction={editTransaction}
        onClose={() => { setTransactionType(null); setEditTransaction(null); }}
        onSave={() => { setTransactionType(null); setEditTransaction(null); loadData(); }}
      />
    </div>
  );
}
