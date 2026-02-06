import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '@/lib/i18n';
import { getTransactions, Transaction, Category, getCategories } from '@/lib/db';
import { formatCurrency } from '@/lib/currencies';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, Legend
} from 'recharts';

interface TrendChartProps {
  currency?: string;
}

interface MonthlyData {
  month: string;
  monthLabel: string;
  income: number;
  expense: number;
  balance: number;
}

export function TrendChart({ currency = 'BRL' }: TrendChartProps) {
  const { t } = useI18n();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const allTx = await getTransactions();
      setTransactions(allTx);
    } finally {
      setLoading(false);
    }
  };

  // Group transactions by month for the last 12 months
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: MonthlyData[] = [];
    
    // Get last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth();
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      const monthLabel = date.toLocaleDateString(undefined, { 
        month: 'short',
        year: i === 11 || month === 0 ? '2-digit' : undefined
      });

      // Filter transactions for this month
      const monthTx = transactions.filter(tx => {
        const txDate = new Date(tx.date);
        return txDate.getFullYear() === year && txDate.getMonth() === month;
      });

      // Calculate totals (only completed transactions)
      const income = monthTx
        .filter(tx => tx.type === 'income' && tx.isCompleted)
        .reduce((sum, tx) => sum + tx.value, 0);
      
      const expense = monthTx
        .filter(tx => tx.type === 'expense' && tx.isCompleted)
        .reduce((sum, tx) => sum + tx.value, 0);

      months.push({
        month: monthKey,
        monthLabel,
        income,
        expense,
        balance: income - expense,
      });
    }

    return months;
  }, [transactions]);

  // Calculate cumulative balance
  const cumulativeData = useMemo(() => {
    let cumulative = 0;
    return monthlyData.map(m => {
      cumulative += m.balance;
      return {
        ...m,
        cumulative,
      };
    });
  }, [monthlyData]);

  // Calculate totals for the period
  const periodTotals = useMemo(() => {
    return monthlyData.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expense: acc.expense + m.expense,
        balance: acc.balance + m.balance,
      }),
      { income: 0, expense: 0, balance: 0 }
    );
  }, [monthlyData]);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          {t('common.loading')}
        </CardContent>
      </Card>
    );
  }

  const hasData = transactions.length > 0;

  return (
    <div className="space-y-4">
      <Tabs defaultValue="comparison" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="comparison">{t('reports.incomeVsExpense')}</TabsTrigger>
          <TabsTrigger value="balance">{t('reports.balance')}</TabsTrigger>
        </TabsList>

        <TabsContent value="comparison" className="space-y-4">
          {!hasData ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('reports.awaitingData')}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Line chart comparing income vs expense */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('reports.trend12Months')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={monthlyData}>
                        <XAxis 
                          dataKey="monthLabel" 
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
                            formatCurrency(value, currency),
                            name === 'income' ? t('transaction.income') : t('transaction.expense')
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Legend 
                          formatter={(value) => value === 'income' ? t('transaction.income') : t('transaction.expense')}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="income" 
                          stroke="hsl(var(--income))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--income))', r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="expense" 
                          stroke="hsl(var(--expense))" 
                          strokeWidth={2}
                          dot={{ fill: 'hsl(var(--expense))', r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Period totals */}
              <div className="grid grid-cols-3 gap-2">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('dashboard.totalIncome')}</p>
                    <p className="font-bold text-income">{formatCurrency(periodTotals.income, currency)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('dashboard.totalExpense')}</p>
                    <p className="font-bold text-expense">{formatCurrency(periodTotals.expense, currency)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-xs text-muted-foreground">{t('reports.balance')}</p>
                    <p className={`font-bold ${periodTotals.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                      {formatCurrency(periodTotals.balance, currency)}
                    </p>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="balance" className="space-y-4">
          {!hasData ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                {t('reports.awaitingData')}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Area chart showing cumulative balance */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('reports.cumulativeBalance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={cumulativeData}>
                        <XAxis 
                          dataKey="monthLabel" 
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis 
                          tick={{ fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(value) => {
                            if (value === 0) return '0';
                            const prefix = value < 0 ? '-' : '';
                            return `${prefix}${(Math.abs(value)/1000).toFixed(0)}k`;
                          }}
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            formatCurrency(value, currency),
                            t('reports.cumulativeBalance')
                          ]}
                          contentStyle={{
                            backgroundColor: 'hsl(var(--popover))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <defs>
                          <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <Area 
                          type="monotone" 
                          dataKey="cumulative" 
                          stroke="hsl(var(--primary))" 
                          fill="url(#balanceGradient)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly balance bars */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">{t('reports.monthlyBalance')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {monthlyData.slice().reverse().slice(0, 6).map((m) => (
                      <div key={m.month} className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-12">{m.monthLabel}</span>
                        <div className="flex-1 h-4 bg-secondary rounded-full overflow-hidden relative">
                          {m.balance !== 0 && (
                            <div 
                              className={`absolute top-0 h-full rounded-full ${m.balance >= 0 ? 'bg-income left-1/2' : 'bg-expense right-1/2'}`}
                              style={{ 
                                width: `${Math.min(Math.abs(m.balance) / (Math.max(...monthlyData.map(d => Math.abs(d.balance))) || 1) * 50, 50)}%`,
                              }}
                            />
                          )}
                          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border" />
                        </div>
                        <span className={`text-xs font-medium w-20 text-right ${m.balance >= 0 ? 'text-income' : 'text-expense'}`}>
                          {m.balance >= 0 ? '+' : ''}{formatCurrency(m.balance, currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
