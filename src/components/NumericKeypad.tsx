import React, { useState, useCallback } from 'react';
import { Delete, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface NumericKeypadProps {
  value: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  currency: string;
  currencySymbol: string;
}

export function NumericKeypad({ value, onConfirm, onCancel, currency, currencySymbol }: NumericKeypadProps) {
  const { t } = useI18n();
  const [display, setDisplay] = useState(value > 0 ? value.toString() : '');
  const [hasDecimal, setHasDecimal] = useState(value.toString().includes('.'));

  const formatDisplay = useCallback((val: string): string => {
    if (!val) return '0';
    
    // Try to evaluate if there's a pending calculation
    try {
      // Only format if it's a valid number
      const num = parseFloat(val);
      if (!isNaN(num) && !val.match(/[+\-×÷]$/)) {
        // Format with proper decimal
        if (val.includes('.')) {
          const parts = val.split('.');
          return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + parts[1];
        }
        return num.toLocaleString('en-US');
      }
    } catch {
      // Return as is if can't parse
    }
    return val;
  }, []);

  const handleNumber = useCallback((num: string) => {
    setDisplay(prev => {
      if (prev === '0' && num !== '.') return num;
      if (num === '.' && prev.includes('.')) return prev;
      if (num === '.') {
        setHasDecimal(true);
        return prev + num;
      }
      // Limit decimal places
      if (hasDecimal) {
        const parts = prev.split('.');
        if (parts[1] && parts[1].length >= 2) return prev;
      }
      return prev + num;
    });
  }, [hasDecimal]);

  const handleOperator = useCallback((op: string) => {
    setDisplay(prev => {
      // Replace operator if last character is an operator
      if (prev.match(/[+\-×÷]$/)) {
        return prev.slice(0, -1) + op;
      }
      // Don't allow operator at start (except minus for negative)
      if (prev === '' || prev === '0') {
        if (op === '-') return '-';
        return prev;
      }
      setHasDecimal(false);
      return prev + op;
    });
  }, []);

  const handleClear = useCallback(() => {
    setDisplay('');
    setHasDecimal(false);
  }, []);

  const handleBackspace = useCallback(() => {
    setDisplay(prev => {
      const newVal = prev.slice(0, -1);
      if (!newVal.includes('.')) setHasDecimal(false);
      return newVal;
    });
  }, []);

  const calculateResult = useCallback((): number => {
    if (!display) return 0;
    
    try {
      // Replace display operators with JS operators
      let expression = display
        .replace(/×/g, '*')
        .replace(/÷/g, '/');
      
      // Remove trailing operator
      expression = expression.replace(/[+\-*/]$/, '');
      
      if (!expression) return 0;
      
      // Safe eval using Function
      const result = new Function(`return ${expression}`)();
      return typeof result === 'number' && isFinite(result) ? Math.round(result * 100) / 100 : 0;
    } catch {
      return 0;
    }
  }, [display]);

  const handleEquals = useCallback(() => {
    const result = calculateResult();
    setDisplay(result.toString());
    setHasDecimal(result.toString().includes('.'));
  }, [calculateResult]);

  const handleConfirm = useCallback(() => {
    const result = calculateResult();
    onConfirm(result);
  }, [calculateResult, onConfirm]);

  const keys = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '-'],
    ['.', '0', '=', '+'],
  ];

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Display */}
      <div className="p-4 bg-secondary/30">
        <div className="text-right">
          <span className="text-muted-foreground text-lg">{currencySymbol}</span>
          <span className="text-4xl font-bold ml-2">{formatDisplay(display)}</span>
        </div>
      </div>

      {/* Keypad */}
      <div className="flex-1 p-2 grid grid-cols-4 gap-2">
        {/* Clear and Backspace row */}
        <button
          onClick={handleClear}
          className="numpad-key col-span-2 text-destructive font-bold"
        >
          C
        </button>
        <button
          onClick={handleBackspace}
          className="numpad-key col-span-2"
        >
          <Delete className="w-5 h-5" />
        </button>

        {/* Number keys */}
        {keys.map((row, rowIndex) => (
          row.map((key, keyIndex) => (
            <button
              key={`${rowIndex}-${keyIndex}`}
              onClick={() => {
                if (key === '=') {
                  handleEquals();
                } else if (['+', '-', '×', '÷'].includes(key)) {
                  handleOperator(key);
                } else {
                  handleNumber(key);
                }
              }}
              className={`numpad-key ${
                ['+', '-', '×', '÷', '='].includes(key)
                  ? 'bg-primary/20 text-primary font-bold'
                  : ''
              }`}
            >
              {key}
            </button>
          ))
        ))}
      </div>

      {/* Action buttons */}
      <div className="p-3 flex gap-3 border-t border-border safe-bottom">
        <Button
          variant="outline"
          className="flex-1 h-14"
          onClick={onCancel}
        >
          <X className="w-5 h-5 mr-2" />
          {t('common.cancel')}
        </Button>
        <Button
          className="flex-1 h-14 bg-primary hover:bg-primary/90"
          onClick={handleConfirm}
        >
          <Check className="w-5 h-5 mr-2" />
          {t('common.done')}
        </Button>
      </div>
    </div>
  );
}
