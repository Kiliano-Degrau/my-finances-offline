import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { getAccounts, getTransactionsByMonth, getAccountBalances, Account, Transaction } from '@/lib/db';
import { formatCurrency } from '@/lib/currencies';
import { Plus, Settings, PiggyBank, WifiOff, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TransactionSheet from '@/components/TransactionSheet';
import SettingsSheet from '@/components/SettingsSheet';

export default function Dashboard() {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [balances, setBalances] = useState<Record<string, Record<string, number>>>({});
  const [showFab, setShowFab] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const loadData = async () => {
    const [acc, tx, bal] = await Promise.all([
      getAccounts(),
      getTransactionsByMonth(currentDate.getFullYear(), currentDate.getMonth()),
      getAccountBalances(),
    ]);
    setAccounts(acc);
    setTransactions(tx);
    setBalances(bal);
  };

  useEffect(() => {
    loadData();
  }, [currentDate]);

  const incomes = transactions.filter(tx => tx.type === 'income');
  const expenses = transactions.filter(tx => tx.type === 'expense');
  const totalIncome = incomes.reduce((sum, tx) => sum + tx.value, 0);
  const totalExpense = expenses.reduce((sum, tx) => sum + tx.value, 0);
  const pendingIncome = incomes.filter(tx => !tx.isCompleted).reduce((sum, tx) => sum + tx.value, 0);
  const pendingExpense = expenses.filter(tx => !tx.isCompleted).reduce((sum, tx) => sum + tx.value, 0);

  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'),
    t('months.may'), t('months.june'), t('months.july'), t('months.august'),
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ];

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
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Month Selector */}
        <div className="text-center">
          <button 
            className="text-xl font-semibold text-foreground hover:text-primary transition-colors"
            onClick={() => {/* TODO: Month picker */}}
          >
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </button>
        </div>

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

        {transactions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              {t('dashboard.noTransactions')}
            </CardContent>
          </Card>
        )}
      </main>

      {/* FAB */}
      <div className="fixed right-4 bottom-6 safe-bottom z-50">
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
        onClose={() => setTransactionType(null)}
        onSave={() => { setTransactionType(null); loadData(); }}
      />

      {/* Settings Sheet */}
      <SettingsSheet open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
