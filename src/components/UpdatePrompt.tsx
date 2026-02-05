import React from 'react';
import { useI18n } from '@/lib/i18n';
import { RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface UpdatePromptProps {
  open: boolean;
  onUpdate: () => void;
}

export function UpdatePrompt({ open, onUpdate }: UpdatePromptProps) {
  const { t } = useI18n();

  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            {t('update.title')}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('update.description')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction onClick={onUpdate}>
            {t('update.button')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
