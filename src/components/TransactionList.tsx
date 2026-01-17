import React, { useMemo } from 'react';
import { Transaction, Category, Account } from '@/lib/db';
import { formatCurrency } from '@/lib/currencies';
import { useI18n } from '@/lib/i18n';
import * as LucideIcons from 'lucide-react';
import { Check, Clock, Pin, Repeat, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TransactionListProps {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  onTransactionClick?: (transaction: Transaction) => void;
}

interface GroupedTransactions {
  date: string;
  dateLabel: string;
  transactions: Transaction[];
  totalIncome: number;
  totalExpense: number;
}

export function TransactionList({ 
  transactions, 
  categories, 
  accounts,
  onTransactionClick 
}: TransactionListProps) {
  const { t } = useI18n();

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    categories.forEach(c => map.set(c.id, c));
    return map;
  }, [categories]);

  const accountMap = useMemo(() => {
    const map = new Map<string, Account>();
    accounts.forEach(a => map.set(a.id, a));
    return map;
  }, [accounts]);

  const groupedTransactions = useMemo(() => {
    const groups: Record<string, GroupedTransactions> = {};
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    transactions.forEach(tx => {
      if (!groups[tx.date]) {
        let dateLabel = tx.date;
        if (tx.date === today) {
          dateLabel = t('common.today');
        } else if (tx.date === yesterday) {
          dateLabel = t('common.yesterday');
        } else {
          const date = new Date(tx.date + 'T12:00:00');
          dateLabel = date.toLocaleDateString(undefined, { 
            weekday: 'short', 
            day: 'numeric', 
            month: 'short' 
          });
        }

        groups[tx.date] = {
          date: tx.date,
          dateLabel,
          transactions: [],
          totalIncome: 0,
          totalExpense: 0,
        };
      }

      groups[tx.date].transactions.push(tx);
      if (tx.type === 'income') {
        groups[tx.date].totalIncome += tx.value;
      } else {
        groups[tx.date].totalExpense += tx.value;
      }
    });

    return Object.values(groups).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, t]);

  const renderIcon = (iconName: string, className?: string) => {
    const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
    const IconComponent = icons[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
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

  if (transactions.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        {t('dashboard.noTransactions')}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedTransactions.map(group => (
        <div key={group.date}>
          {/* Date header */}
          <div className="flex items-center justify-between px-1 py-2">
            <span className="text-sm font-medium text-muted-foreground">
              {group.dateLabel}
            </span>
            <div className="flex items-center gap-3 text-xs">
              {group.totalIncome > 0 && (
                <span className="text-income">
                  +{formatCurrency(group.totalIncome, 'BRL')}
                </span>
              )}
              {group.totalExpense > 0 && (
                <span className="text-expense">
                  -{formatCurrency(group.totalExpense, 'BRL')}
                </span>
              )}
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-card rounded-lg border divide-y">
            {group.transactions.map(tx => {
              const category = categoryMap.get(tx.categoryId);
              const account = accountMap.get(tx.accountId);
              const isIncome = tx.type === 'income';

              return (
                <button
                  key={tx.id}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  onClick={() => onTransactionClick?.(tx)}
                >
                  {/* Category icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                    style={{ backgroundColor: category?.color || '#6B7280' }}
                  >
                    {category && renderIcon(category.icon, 'h-5 w-5 text-white')}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">
                        {tx.description || (category ? getCategoryName(category) : t('category.noCategory'))}
                      </span>
                      {tx.isFixed && <Pin className="h-3 w-3 text-muted-foreground shrink-0" />}
                      {tx.isRepeating && <Repeat className="h-3 w-3 text-muted-foreground shrink-0" />}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{category ? getCategoryName(category) : t('category.noCategory')}</span>
                      <span>•</span>
                      <span>{account ? getAccountName(account) : ''}</span>
                    </div>
                  </div>

                  {/* Amount & status */}
                  <div className="text-right shrink-0">
                    <div className={cn(
                      'font-semibold tabular-nums',
                      isIncome ? 'text-income' : 'text-expense'
                    )}>
                      {isIncome ? '+' : '-'}{formatCurrency(tx.value, tx.currency)}
                    </div>
                    <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground">
                      {tx.isCompleted ? (
                        <>
                          <Check className="h-3 w-3 text-income" />
                          <span>{isIncome ? t('transaction.received') : t('transaction.paid')}</span>
                        </>
                      ) : (
                        <>
                          <Clock className="h-3 w-3 text-pending" />
                          <span>{t('transaction.pending')}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
