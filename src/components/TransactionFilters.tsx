import React, { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { Category, Account } from '@/lib/db';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger 
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { 
  Search, Filter, X, Check, Clock, TrendingUp, TrendingDown 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import * as LucideIcons from 'lucide-react';

export interface TransactionFiltersState {
  search: string;
  type: 'all' | 'income' | 'expense';
  status: 'all' | 'completed' | 'pending';
  categoryIds: string[];
  accountIds: string[];
}

interface TransactionFiltersProps {
  filters: TransactionFiltersState;
  onFiltersChange: (filters: TransactionFiltersState) => void;
  categories: Category[];
  accounts: Account[];
}

export const defaultFilters: TransactionFiltersState = {
  search: '',
  type: 'all',
  status: 'all',
  categoryIds: [],
  accountIds: [],
};

export function TransactionFilters({
  filters,
  onFiltersChange,
  categories,
  accounts,
}: TransactionFiltersProps) {
  const { t } = useI18n();
  const [showFilters, setShowFilters] = useState(false);

  const activeFiltersCount = [
    filters.type !== 'all',
    filters.status !== 'all',
    filters.categoryIds.length > 0,
    filters.accountIds.length > 0,
  ].filter(Boolean).length;

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value });
  };

  const handleTypeChange = (type: TransactionFiltersState['type']) => {
    onFiltersChange({ ...filters, type });
  };

  const handleStatusChange = (status: TransactionFiltersState['status']) => {
    onFiltersChange({ ...filters, status });
  };

  const toggleCategory = (categoryId: string) => {
    const newIds = filters.categoryIds.includes(categoryId)
      ? filters.categoryIds.filter(id => id !== categoryId)
      : [...filters.categoryIds, categoryId];
    onFiltersChange({ ...filters, categoryIds: newIds });
  };

  const toggleAccount = (accountId: string) => {
    const newIds = filters.accountIds.includes(accountId)
      ? filters.accountIds.filter(id => id !== accountId)
      : [...filters.accountIds, accountId];
    onFiltersChange({ ...filters, accountIds: newIds });
  };

  const clearFilters = () => {
    onFiltersChange(defaultFilters);
  };

  const getCategoryName = (cat: Category) => {
    if (cat.isSystem) {
      return t(`category.default.${cat.name}`);
    }
    return cat.name;
  };

  const getAccountName = (acc: Account) => {
    if (acc.isDefault && acc.name === 'defaultAccount') {
      return t('account.defaultAccount');
    }
    return acc.name;
  };

  const renderIcon = (iconName: string, className?: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const IconComponent = icons[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={filters.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
          {filters.search && (
            <button
              onClick={() => handleSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        <Sheet open={showFilters} onOpenChange={setShowFilters}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="relative">
              <Filter className="h-4 w-4" />
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between">
                <span>{t('filters.title')}</span>
                {activeFiltersCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    {t('filters.clearAll')}
                  </Button>
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="py-6 space-y-6">
              {/* Type filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('filters.transactionType')}</label>
                <div className="flex gap-2">
                  {(['all', 'income', 'expense'] as const).map((type) => (
                    <Button
                      key={type}
                      variant={filters.type === type ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleTypeChange(type)}
                      className={cn(
                        "flex-1",
                        filters.type === type && type === 'income' && 'bg-income hover:bg-income/90',
                        filters.type === type && type === 'expense' && 'bg-expense hover:bg-expense/90'
                      )}
                    >
                      {type === 'all' && t('common.all')}
                      {type === 'income' && (
                        <><TrendingUp className="h-4 w-4 mr-1" />{t('transaction.income')}</>
                      )}
                      {type === 'expense' && (
                        <><TrendingDown className="h-4 w-4 mr-1" />{t('transaction.expense')}</>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Status filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('filters.status')}</label>
                <div className="flex gap-2">
                  {(['all', 'completed', 'pending'] as const).map((status) => (
                    <Button
                      key={status}
                      variant={filters.status === status ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleStatusChange(status)}
                      className="flex-1"
                    >
                      {status === 'all' && t('common.all')}
                      {status === 'completed' && (
                        <><Check className="h-4 w-4 mr-1" />{t('filters.completed')}</>
                      )}
                      {status === 'pending' && (
                        <><Clock className="h-4 w-4 mr-1" />{t('transaction.pending')}</>
                      )}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Categories filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('transaction.category')}</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const isSelected = filters.categoryIds.includes(cat.id);
                    return (
                      <Badge
                        key={cat.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={cn(
                          "cursor-pointer hover:opacity-80 transition-opacity",
                          isSelected && "border-transparent"
                        )}
                        style={isSelected ? { backgroundColor: cat.color } : undefined}
                        onClick={() => toggleCategory(cat.id)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-1.5 flex items-center justify-center"
                          style={{ backgroundColor: isSelected ? 'white' : cat.color }}
                        >
                          {renderIcon(cat.icon, cn('h-2 w-2', isSelected ? 'text-foreground' : 'text-white'))}
                        </div>
                        {getCategoryName(cat)}
                      </Badge>
                    );
                  })}
                </div>
              </div>

              {/* Accounts filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">{t('transaction.account')}</label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => {
                    const isSelected = filters.accountIds.includes(acc.id);
                    return (
                      <Badge
                        key={acc.id}
                        variant={isSelected ? 'default' : 'outline'}
                        className={cn(
                          "cursor-pointer hover:opacity-80 transition-opacity",
                          isSelected && "border-transparent"
                        )}
                        style={isSelected ? { backgroundColor: acc.color } : undefined}
                        onClick={() => toggleAccount(acc.id)}
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-1.5 flex items-center justify-center"
                          style={{ backgroundColor: isSelected ? 'white' : acc.color }}
                        >
                          {renderIcon(acc.icon, cn('h-2 w-2', isSelected ? 'text-foreground' : 'text-white'))}
                        </div>
                        {getAccountName(acc)}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Active filters badges */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.type === 'income' ? t('transaction.income') : t('transaction.expense')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleTypeChange('all')}
              />
            </Badge>
          )}
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              {filters.status === 'completed' ? t('filters.completed') : t('transaction.pending')}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => handleStatusChange('all')}
              />
            </Badge>
          )}
          {filters.categoryIds.map(catId => {
            const cat = categories.find(c => c.id === catId);
            if (!cat) return null;
            return (
              <Badge key={catId} variant="secondary" className="gap-1">
                {getCategoryName(cat)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleCategory(catId)}
                />
              </Badge>
            );
          })}
          {filters.accountIds.map(accId => {
            const acc = accounts.find(a => a.id === accId);
            if (!acc) return null;
            return (
              <Badge key={accId} variant="secondary" className="gap-1">
                {getAccountName(acc)}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => toggleAccount(accId)}
                />
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function filterTransactions(
  transactions: any[],
  filters: TransactionFiltersState
): any[] {
  return transactions.filter(tx => {
    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = 
        tx.description?.toLowerCase().includes(searchLower) ||
        tx.observation?.toLowerCase().includes(searchLower) ||
        tx.tags?.some((tag: string) => tag.toLowerCase().includes(searchLower));
      if (!matchesSearch) return false;
    }

    // Type filter
    if (filters.type !== 'all' && tx.type !== filters.type) {
      return false;
    }

    // Status filter
    if (filters.status === 'completed' && !tx.isCompleted) return false;
    if (filters.status === 'pending' && tx.isCompleted) return false;

    // Category filter
    if (filters.categoryIds.length > 0 && !filters.categoryIds.includes(tx.categoryId)) {
      return false;
    }

    // Account filter
    if (filters.accountIds.length > 0 && !filters.accountIds.includes(tx.accountId)) {
      return false;
    }

    return true;
  });
}
