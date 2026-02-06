import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { Transaction, Category, getTransactionsByMonth, getCategories, getSettings } from '@/lib/db';
import { formatCurrency } from '@/lib/currencies';
import { ChevronLeft, TrendingUp, TrendingDown, PieChart, BarChart3, Calendar, LineChart as LineChartIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MonthPicker } from '@/components/MonthPicker';
import { TrendChart } from '@/components/TrendChart';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

interface ReportsProps {
  onBack?: () => void;
}

export default function Reports({ onBack }: ReportsProps) {
  const { t } = useI18n();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currency, setCurrency] = useState('BRL');
  const [activeTab, setActiveTab] = useState('expenses');

  useEffect(() => {
    loadData();
    loadSettings();
  }, [currentDate]);

  const loadSettings = async () => {
    const settings = await getSettings();
    if (settings?.defaultCurrency) {
      setCurrency(settings.defaultCurrency);
    }
  };

  const loadData = async () => {
    const [tx, cats] = await Promise.all([
      getTransactionsByMonth(currentDate.getFullYear(), currentDate.getMonth()),
      getCategories()
    ]);
    setTransactions(tx);
    setCategories(cats);
  };

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  // Category breakdown for expenses
  const expenseByCategory = useMemo(() => {
    const expenses = transactions.filter(tx => tx.type === 'expense');
    const totals: Record<string, { amount: number; category: Category | undefined }> = {};

    expenses.forEach(tx => {
      if (!totals[tx.categoryId]) {
        totals[tx.categoryId] = { amount: 0, category: categoryMap.get(tx.categoryId) };
      }
      totals[tx.categoryId].amount += tx.value;
    });

    return Object.entries(totals)
      .map(([id, data]) => ({
        id,
        name: data.category?.isSystem 
          ? t(`category.default.${data.category.name}`) 
          : data.category?.name || t('category.noCategory'),
        value: data.amount,
        color: data.category?.color || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categoryMap, t]);

  // Category breakdown for income
  const incomeByCategory = useMemo(() => {
    const incomes = transactions.filter(tx => tx.type === 'income');
    const totals: Record<string, { amount: number; category: Category | undefined }> = {};

    incomes.forEach(tx => {
      if (!totals[tx.categoryId]) {
        totals[tx.categoryId] = { amount: 0, category: categoryMap.get(tx.categoryId) };
      }
      totals[tx.categoryId].amount += tx.value;
    });

    return Object.entries(totals)
      .map(([id, data]) => ({
        id,
        name: data.category?.isSystem 
          ? t(`category.default.${data.category.name}`) 
          : data.category?.name || t('category.noCategory'),
        value: data.amount,
        color: data.category?.color || '#6B7280',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, categoryMap, t]);

  // Daily spending data
  const dailyData = useMemo(() => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const days: { day: number; income: number; expense: number }[] = [];

    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, income: 0, expense: 0 });
    }

    transactions.forEach(tx => {
      const day = new Date(tx.date + 'T12:00:00').getDate();
      if (tx.type === 'income') {
        days[day - 1].income += tx.value;
      } else {
        days[day - 1].expense += tx.value;
      }
    });

    return days;
  }, [transactions, currentDate]);

  // Totals
  const totals = useMemo(() => {
    const income = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.value, 0);
    const expense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.value, 0);
    return { income, expense, balance: income - expense };
  }, [transactions]);

  const totalExpense = expenseByCategory.reduce((sum, c) => sum + c.value, 0);
  const totalIncome = incomeByCategory.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b px-4 py-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <h1 className="font-bold text-lg">{t('reports.title')}</h1>
        </div>
      </header>

      <main className="px-4 py-4 space-y-4 max-w-lg mx-auto">
        {/* Show month picker only for monthly tabs */}
        {activeTab !== 'trend' && (
          <MonthPicker currentDate={currentDate} onDateChange={setCurrentDate} />
        )}

        {/* Summary cards - hide for trend view */}
        {activeTab !== 'trend' && (
          <div className="grid grid-cols-3 gap-2">
            <Card className="border-l-4 border-l-income">
              <CardContent className="p-3">
                <TrendingUp className="h-4 w-4 text-income mb-1" />
                <p className="text-xs text-muted-foreground">{t('dashboard.totalIncome')}</p>
                <p className="font-bold text-income">{formatCurrency(totals.income, currency)}</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-expense">
              <CardContent className="p-3">
                <TrendingDown className="h-4 w-4 text-expense mb-1" />
                <p className="text-xs text-muted-foreground">{t('dashboard.totalExpense')}</p>
                <p className="font-bold text-expense">{formatCurrency(totals.expense, currency)}</p>
              </CardContent>
            </Card>
            <Card className={`border-l-4 ${totals.balance >= 0 ? 'border-l-income' : 'border-l-expense'}`}>
              <CardContent className="p-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground mb-1" />
                <p className="text-xs text-muted-foreground">{t('reports.balance')}</p>
                <p className={`font-bold ${totals.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(totals.balance, currency)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="expenses">{t('transaction.expense')}</TabsTrigger>
            <TabsTrigger value="income">{t('transaction.income')}</TabsTrigger>
            <TabsTrigger value="timeline">{t('reports.daily')}</TabsTrigger>
            <TabsTrigger value="trend">{t('reports.trend')}</TabsTrigger>
          </TabsList>

          <TabsContent value="expenses" className="space-y-4">
            {expenseByCategory.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('reports.awaitingData')}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Donut chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('reports.byCategory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={expenseByCategory}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {expenseByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value, 'BRL')}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Category list */}
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {expenseByCategory.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }} 
                            />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(cat.value, 'BRL')}</p>
                            <p className="text-xs text-muted-foreground">
                              {((cat.value / totalExpense) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="income" className="space-y-4">
            {incomeByCategory.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  {t('reports.awaitingIncomeData')}
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Donut chart */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{t('reports.byCategory')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie>
                          <Pie
                            data={incomeByCategory}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={2}
                          >
                            {incomeByCategory.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value: number) => formatCurrency(value, 'BRL')}
                            contentStyle={{
                              backgroundColor: 'hsl(var(--popover))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                            }}
                          />
                        </RechartsPie>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Category list */}
                <Card>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {incomeByCategory.map(cat => (
                        <div key={cat.id} className="flex items-center justify-between p-3">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: cat.color }} 
                            />
                            <span className="font-medium">{cat.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(cat.value, 'BRL')}</p>
                            <p className="text-xs text-muted-foreground">
                              {((cat.value / totalIncome) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            {/* Bar chart - Income vs Expense by day */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('reports.incomeVsExpense')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyData}>
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value > 0 ? `${(value/1000).toFixed(0)}k` : '0'}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrency(value, 'BRL'),
                          name === 'income' ? t('transaction.income') : t('transaction.expense')
                        ]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="income" fill="hsl(var(--income))" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="expense" fill="hsl(var(--expense))" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Area chart - Cumulative */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{t('reports.spendingFrequency')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={dailyData}>
                      <XAxis 
                        dataKey="day" 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        tick={{ fontSize: 10 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value > 0 ? `${(value/1000).toFixed(0)}k` : '0'}
                      />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          formatCurrency(value, 'BRL'),
                          name === 'income' ? t('transaction.income') : t('transaction.expense')
                        ]}
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="income" 
                        stroke="hsl(var(--income))" 
                        fill="hsl(var(--income))" 
                        fillOpacity={0.3}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="expense" 
                        stroke="hsl(var(--expense))" 
                        fill="hsl(var(--expense))" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trend" className="space-y-4">
            <TrendChart currency={currency} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
