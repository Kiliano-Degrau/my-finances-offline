import React, { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/lib/i18n';
import { 
  Category, Account, Transaction, RepeatConfig,
  getCategoriesByType, getAccounts, addTransaction, addRecurringTransaction, updateTransaction,
  deleteTransaction, deleteRecurringTransactions,
  getSettings
} from '@/lib/db';
import { NumericKeypad } from '@/components/NumericKeypad';
import { CategorySelector } from '@/components/CategorySelector';
import { AccountSelector } from '@/components/AccountSelector';
import { currencies, formatCurrency, getCurrencySymbol } from '@/lib/currencies';
import * as LucideIcons from 'lucide-react';
import { 
  Calendar, ChevronRight, Check, X, Tag, 
  Repeat, Pin, MessageSquare, Hash, Trash2, AlertTriangle
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface TransactionSheetProps {
  type: 'income' | 'expense' | null;
  onClose: () => void;
  onSave: () => void;
  editTransaction?: Transaction | null;
}

type Step = 'amount' | 'details';

export default function TransactionSheet({ type, onClose, onSave, editTransaction }: TransactionSheetProps) {
  const { t } = useI18n();
  
  // Form state
  const [step, setStep] = useState<Step>(editTransaction ? 'details' : 'amount');
  const [value, setValue] = useState(0);
  const [currency, setCurrency] = useState('BRL');
  const [isCompleted, setIsCompleted] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<Category | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [isFixed, setIsFixed] = useState(false);
  const [isRepeating, setIsRepeating] = useState(false);
  const [repeatTimes, setRepeatTimes] = useState(2);
  const [repeatPeriod, setRepeatPeriod] = useState<RepeatConfig['period']>('monthly');
  const [observation, setObservation] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  
  // UI state
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [showAccountSelector, setShowAccountSelector] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteMode, setDeleteMode] = useState<'single' | 'all'>('single');

  // Load defaults
  useEffect(() => {
    if (type) {
      loadDefaults();
    }
  }, [type]);

  // Load edit transaction data
  useEffect(() => {
    if (editTransaction) {
      setStep('details'); // Always go to details when editing
      setValue(editTransaction.value);
      setCurrency(editTransaction.currency);
      setIsCompleted(editTransaction.isCompleted);
      setDate(editTransaction.date);
      setDescription(editTransaction.description);
      setIsFixed(editTransaction.isFixed);
      setIsRepeating(editTransaction.isRepeating);
      setRepeatTimes(editTransaction.repeatConfig?.times || 2);
      setRepeatPeriod(editTransaction.repeatConfig?.period || 'monthly');
      setObservation(editTransaction.observation);
      setTags(editTransaction.tags);
      // Load category and account
      loadTransactionRefs(editTransaction.categoryId, editTransaction.accountId);
    }
  }, [editTransaction]);

  const loadDefaults = async () => {
    const [categories, accounts, settings] = await Promise.all([
      getCategoriesByType(type!),
      getAccounts(),
      getSettings()
    ]);
    
    // Set default category (the one marked as default)
    const defaultCategory = categories.find(c => c.isDefault);
    if (defaultCategory) setCategory(defaultCategory);
    
    // Set default account
    const defaultAccount = accounts.find(a => a.isDefault);
    if (defaultAccount) setAccount(defaultAccount);
    
    // Set default currency from settings
    if (settings?.defaultCurrency) {
      setCurrency(settings.defaultCurrency);
    }
  };

  const loadTransactionRefs = async (categoryId: string, accountId: string) => {
    const [categories, accounts] = await Promise.all([
      getCategoriesByType(type!),
      getAccounts()
    ]);
    
    const cat = categories.find(c => c.id === categoryId);
    if (cat) setCategory(cat);
    
    const acc = accounts.find(a => a.id === accountId);
    if (acc) setAccount(acc);
  };

  const handleAmountConfirm = (val: number) => {
    setValue(val);
    setStep('details');
  };

  const handleSave = async () => {
    if (!value || !category || !account) return;

    const transactionData = {
      type: type!,
      value,
      currency,
      description,
      categoryId: category.id,
      accountId: account.id,
      date,
      isCompleted,
      completedAt: isCompleted ? new Date().toISOString() : undefined,
      isFixed,
      isRepeating,
      repeatConfig: isRepeating ? { times: repeatTimes, period: repeatPeriod } : undefined,
      observation,
      tags,
    };

    if (editTransaction) {
      await updateTransaction(editTransaction.id, transactionData);
    } else if (isRepeating) {
      await addRecurringTransaction(transactionData);
    } else {
      await addTransaction(transactionData);
    }

    handleClose();
    onSave();
  };

  const handleClose = () => {
    // Reset form
    setStep('amount');
    setValue(0);
    setIsCompleted(true);
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setCategory(null);
    setAccount(null);
    setIsFixed(false);
    setIsRepeating(false);
    setRepeatTimes(2);
    setRepeatPeriod('monthly');
    setObservation('');
    setTags([]);
    setTagInput('');
    setShowDeleteDialog(false);
    setDeleteMode('single');
    onClose();
  };

  const handleDelete = async () => {
    if (!editTransaction) return;
    
    if (deleteMode === 'all' && editTransaction.parentRepeatId) {
      await deleteRecurringTransactions(editTransaction.parentRepeatId);
    } else {
      await deleteTransaction(editTransaction.id);
    }
    
    handleClose();
    onSave();
  };

  const openDeleteDialog = (mode: 'single' | 'all') => {
    setDeleteMode(mode);
    setShowDeleteDialog(true);
  };

  const setDateToday = () => {
    setDate(new Date().toISOString().split('T')[0]);
  };

  const setDateYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setDate(yesterday.toISOString().split('T')[0]);
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
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

  const renderIcon = (iconName: string, color: string, size: number = 20) => {
    const Icon = (LucideIcons as any)[iconName] || LucideIcons.HelpCircle;
    return <Icon size={size} style={{ color }} />;
  };

  const currencyData = currencies.find(c => c.code === currency);
  const isIncome = type === 'income';

  if (!type) return null;

  return (
    <>
      <Sheet open={!!type} onOpenChange={() => handleClose()}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-2">
            <SheetTitle className={isIncome ? 'text-income' : 'text-expense'}>
              {editTransaction 
                ? (isIncome ? t('transaction.editIncome') : t('transaction.editExpense'))
                : (isIncome ? t('transaction.addIncome') : t('transaction.addExpense'))
              }
            </SheetTitle>
          </SheetHeader>

          {step === 'amount' ? (
            <NumericKeypad
              value={value}
              onConfirm={handleAmountConfirm}
              onCancel={handleClose}
              currency={currency}
              currencySymbol={currencyData?.symbol || currency}
            />
          ) : (
            <div className="flex-1 overflow-auto">
              {/* Amount display - tap to edit */}
              <button
                onClick={() => setStep('amount')}
                className="w-full p-4 bg-secondary/30 flex items-center justify-between"
              >
                <span className="text-muted-foreground">{t('transaction.amount')}</span>
                <span className={`text-2xl font-bold ${isIncome ? 'text-income' : 'text-expense'}`}>
                  {formatCurrency(value, currency)}
                </span>
              </button>

              {/* Form fields */}
              <div className="p-4 space-y-4">
                {/* Currency selector */}
                <button
                  onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                  className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <span className="text-muted-foreground">{t('transaction.currency')}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{currencyData?.symbol} {currency}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                {showCurrencyPicker && (
                  <div className="max-h-48 overflow-auto bg-secondary/30 rounded-lg p-2 grid grid-cols-3 gap-2">
                    {currencies.map(c => (
                      <button
                        key={c.code}
                        onClick={() => {
                          setCurrency(c.code);
                          setShowCurrencyPicker(false);
                        }}
                        className={`p-2 rounded text-sm ${
                          currency === c.code 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-secondary'
                        }`}
                      >
                        {c.symbol} {c.code}
                      </button>
                    ))}
                  </div>
                )}

                {/* Completed toggle */}
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <span className="text-muted-foreground">
                    {isIncome ? t('transaction.received') : t('transaction.paid')}
                  </span>
                  <Switch
                    checked={isCompleted}
                    onCheckedChange={setIsCompleted}
                  />
                </div>

                {/* Date */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('transaction.date')}</span>
                    </div>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="bg-transparent border-none text-right font-medium focus:outline-none"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={setDateToday}
                    >
                      {t('transaction.today')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={setDateYesterday}
                    >
                      {t('transaction.yesterday')}
                    </Button>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <Input
                    placeholder={t('transaction.description')}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={400}
                  />
                  <p className="text-xs text-muted-foreground text-right mt-1">
                    {description.length}/400
                  </p>
                </div>

                {/* Category */}
                <button
                  onClick={() => setShowCategorySelector(true)}
                  className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <Tag className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('transaction.category')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {category && (
                      <>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: category.color }}
                        >
                          {renderIcon(category.icon, 'white', 14)}
                        </div>
                        <span className="font-medium">{getCategoryName(category)}</span>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                {/* Account */}
                <button
                  onClick={() => setShowAccountSelector(true)}
                  className="w-full flex items-center justify-between p-3 bg-secondary/50 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <LucideIcons.Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('transaction.account')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {account && (
                      <>
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: account.color }}
                        >
                          {renderIcon(account.icon, 'white', 14)}
                        </div>
                        <span className="font-medium">{getAccountName(account)}</span>
                      </>
                    )}
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>

                {/* Fixed toggle */}
                <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Pin className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t('transaction.fixed')}</span>
                  </div>
                  <Switch
                    checked={isFixed}
                    onCheckedChange={setIsFixed}
                  />
                </div>

                {/* Repeat toggle */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t('transaction.repeat')}</span>
                    </div>
                    <Switch
                      checked={isRepeating}
                      onCheckedChange={setIsRepeating}
                    />
                  </div>
                  {isRepeating && (
                    <div className="space-y-3 px-3 py-2 bg-secondary/30 rounded-lg">
                      {/* Number of times */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('transaction.repeatTimesLabel')}</span>
                        <Input
                          type="number"
                          min={2}
                          max={60}
                          value={repeatTimes}
                          onChange={(e) => setRepeatTimes(Math.max(2, Math.min(60, parseInt(e.target.value) || 2)))}
                          className="w-20 text-center"
                        />
                      </div>
                      {/* Period selector */}
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('transaction.repeatEvery')}</span>
                        <div className="flex flex-wrap gap-1">
                          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map(period => (
                            <button
                              key={period}
                              type="button"
                              onClick={() => setRepeatPeriod(period)}
                              className={`px-2 py-1 text-xs rounded ${
                                repeatPeriod === period
                                  ? 'bg-primary text-primary-foreground'
                                  : 'bg-secondary hover:bg-secondary/80'
                              }`}
                            >
                              {t(`transaction.${period}`)}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Preview */}
                      <p className="text-xs text-muted-foreground italic">
                        {t('transaction.repeatPreview', { times: repeatTimes, period: t(`transaction.${repeatPeriod}`) })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Observation */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('transaction.observation')}</span>
                  </div>
                  <Textarea
                    placeholder={t('transaction.observationPlaceholder')}
                    value={observation}
                    onChange={(e) => setObservation(e.target.value)}
                    maxLength={1000}
                    rows={3}
                  />
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Hash className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{t('transaction.tags')}</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder={t('transaction.addTag')}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button variant="outline" onClick={addTag}>
                      {t('common.add')}
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {tags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-primary/20 text-primary rounded-full text-sm"
                        >
                          #{tag}
                          <button onClick={() => removeTag(tag)}>
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 border-t border-border safe-bottom space-y-2">
                {/* Delete button - only show when editing */}
                {editTransaction && (
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1 h-12"
                      onClick={() => openDeleteDialog('single')}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      {t('transaction.deleteThis')}
                    </Button>
                    {editTransaction.parentRepeatId && (
                      <Button
                        variant="outline"
                        className="flex-1 h-12 border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => openDeleteDialog('all')}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('transaction.deleteAll')}
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Save button */}
                <Button
                  className={`w-full h-14 ${isIncome ? 'bg-income hover:bg-income/90' : 'bg-expense hover:bg-expense/90'}`}
                  onClick={handleSave}
                  disabled={!value || !category || !account}
                >
                  <Check className="w-5 h-5 mr-2" />
                  {t('common.save')}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Category Selector */}
      <CategorySelector
        open={showCategorySelector}
        onClose={() => setShowCategorySelector(false)}
        type={type}
        selectedId={category?.id || ''}
        onSelect={setCategory}
      />

      {/* Account Selector */}
      <AccountSelector
        open={showAccountSelector}
        onClose={() => setShowAccountSelector(false)}
        selectedId={account?.id || ''}
        onSelect={setAccount}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              {t('transaction.deleteConfirm')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteMode === 'all' 
                ? t('transaction.deleteConfirmAll', { count: editTransaction?.repeatTotal || 0 })
                : t('transaction.deleteConfirmSingle')
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
