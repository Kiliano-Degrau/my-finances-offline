import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';

interface TransactionSheetProps {
  type: 'income' | 'expense' | null;
  onClose: () => void;
  onSave: () => void;
}

export default function TransactionSheet({ type, onClose, onSave }: TransactionSheetProps) {
  const { t } = useI18n();

  if (!type) return null;

  return (
    <Sheet open={!!type} onOpenChange={() => onClose()}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader>
          <SheetTitle className={type === 'income' ? 'text-income' : 'text-expense'}>
            {type === 'income' ? t('transaction.addIncome') : t('transaction.addExpense')}
          </SheetTitle>
        </SheetHeader>
        <div className="py-6 text-center text-muted-foreground">
          <p>Formulário completo em breve...</p>
          <p className="text-sm mt-2">Teclado numérico, categorias, contas, etc.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
