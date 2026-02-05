import React, { useState, useEffect } from 'react';
import { useI18n } from '@/lib/i18n';
import { Category, Transaction } from '@/lib/db';
import { CategoryBudget, getBudgetsByMonth, setBudget, deleteBudget } from '@/lib/budgets';
import { formatCurrency } from '@/lib/currencies';
import { Target, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BudgetManagerProps {
  categories: Category[];
  transactions: Transaction[];
  year: number;
  month: number;
  defaultCurrency: string;
}

interface CategorySpending {
  categoryId: string;
  spent: number;
  budget?: CategoryBudget;
  percentage: number;
}

export function BudgetManager({
  categories,
  transactions,
  year,
  month,
  defaultCurrency,
}: BudgetManagerProps) {
  const { t } = useI18n();
  const [budgets, setBudgets] = useState<CategoryBudget[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [budgetAmount, setBudgetAmount] = useState<string>('');

  useEffect(() => {
    loadBudgets();
  }, [year, month]);

  const loadBudgets = async () => {
    const data = await getBudgetsByMonth(year, month);
    setBudgets(data);
  };

  // Calculate spending per category (only completed expenses)
  const expenseCategories = categories.filter(c => c.type === 'expense');
  const completedExpenses = transactions.filter(tx => tx.type === 'expense' && tx.isCompleted);

  const categorySpending: CategorySpending[] = expenseCategories.map(cat => {
    const spent = completedExpenses
      .filter(tx => tx.categoryId === cat.id)
      .reduce((sum, tx) => sum + tx.value, 0);
    const budget = budgets.find(b => b.categoryId === cat.id);
    const percentage = budget ? Math.min((spent / budget.amount) * 100, 100) : 0;
    return { categoryId: cat.id, spent, budget, percentage };
  });

  // Only show categories with budgets or spending
  const relevantSpending = categorySpending.filter(cs => cs.budget || cs.spent > 0);
  const budgetedCategories = categorySpending.filter(cs => cs.budget);

  // Categories without budget (for add dialog)
  const categoriesWithoutBudget = expenseCategories.filter(
    cat => !budgets.some(b => b.categoryId === cat.id)
  );

  const handleAddBudget = async () => {
    if (!selectedCategory || !budgetAmount) return;
    const amount = parseFloat(budgetAmount);
    if (isNaN(amount) || amount <= 0) return;

    await setBudget(selectedCategory, amount, defaultCurrency, year, month);
    setShowAddSheet(false);
    setSelectedCategory('');
    setBudgetAmount('');
    loadBudgets();
  };

  const handleDeleteBudget = async (budgetId: string) => {
    await deleteBudget(budgetId);
    loadBudgets();
  };

  const getCategoryName = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return '';
    if (cat.isSystem) {
      return t(`category.default.${cat.name}` as any) || cat.name;
    }
    return cat.name;
  };

  const getCategoryColor = (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    return cat?.color || '#6B7280';
  };

  const getStatusIcon = (cs: CategorySpending) => {
    if (!cs.budget) return null;
    if (cs.percentage >= 100) {
      return <AlertCircle className="h-4 w-4 text-expense" />;
    }
    if (cs.percentage >= 80) {
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
    return <CheckCircle2 className="h-4 w-4 text-income" />;
  };

  if (budgetedCategories.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('budget.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">{t('budget.noBudgets')}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddSheet(true)}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('budget.addBudget')}
          </Button>
        </CardContent>

        <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
          <SheetContent side="bottom" className="h-auto max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>{t('budget.addBudget')}</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>{t('transaction.category')}</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('category.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesWithoutBudget.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.isSystem ? t(`category.default.${cat.name}` as any) : cat.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t('budget.monthlyLimit')}</Label>
                <Input
                  type="number"
                  value={budgetAmount}
                  onChange={e => setBudgetAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <Button onClick={handleAddBudget} className="w-full">
                {t('common.save')}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('budget.title')}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddSheet(true)}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {budgetedCategories.map(cs => (
          <div key={cs.categoryId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: getCategoryColor(cs.categoryId) }}
                />
                <span className="font-medium">{getCategoryName(cs.categoryId)}</span>
                {getStatusIcon(cs)}
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-xs",
                  cs.percentage >= 100 ? "text-expense" : 
                  cs.percentage >= 80 ? "text-yellow-500" : "text-muted-foreground"
                )}>
                  {formatCurrency(cs.spent, cs.budget?.currency || defaultCurrency)} / {formatCurrency(cs.budget?.amount || 0, cs.budget?.currency || defaultCurrency)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => cs.budget && handleDeleteBudget(cs.budget.id)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-expense"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
            <Progress
              value={cs.percentage}
              className={cn(
                "h-2",
                cs.percentage >= 100 ? "[&>div]:bg-expense" :
                cs.percentage >= 80 ? "[&>div]:bg-yellow-500" : ""
              )}
              style={{
                ['--progress-color' as any]: cs.percentage < 80 ? getCategoryColor(cs.categoryId) : undefined
              }}
            />
          </div>
        ))}
      </CardContent>

      <Sheet open={showAddSheet} onOpenChange={setShowAddSheet}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>{t('budget.addBudget')}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>{t('transaction.category')}</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t('category.selectCategory')} />
                </SelectTrigger>
                <SelectContent>
                  {categoriesWithoutBudget.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.isSystem ? t(`category.default.${cat.name}` as any) : cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t('budget.monthlyLimit')}</Label>
              <Input
                type="number"
                value={budgetAmount}
                onChange={e => setBudgetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <Button onClick={handleAddBudget} className="w-full">
              {t('common.save')}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
