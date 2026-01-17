import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface MonthPickerProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
}

export function MonthPicker({ currentDate, onDateChange }: MonthPickerProps) {
  const { t } = useI18n();

  const monthNames = [
    t('months.january'), t('months.february'), t('months.march'), t('months.april'),
    t('months.may'), t('months.june'), t('months.july'), t('months.august'),
    t('months.september'), t('months.october'), t('months.november'), t('months.december')
  ];

  const goToPreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    onDateChange(newDate);
  };

  const goToNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    onDateChange(newDate);
  };

  const goToCurrentMonth = () => {
    onDateChange(new Date());
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return currentDate.getMonth() === now.getMonth() && 
           currentDate.getFullYear() === now.getFullYear();
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToPreviousMonth}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <button
        className="text-xl font-semibold text-foreground hover:text-primary transition-colors px-4 py-1 rounded-lg hover:bg-muted"
        onClick={goToCurrentMonth}
        title={!isCurrentMonth() ? t('common.today') : undefined}
      >
        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={goToNextMonth}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
