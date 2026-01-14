import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useI18n } from '@/lib/i18n';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface SettingsSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const { t, language, setLanguage, availableLanguages } = useI18n();

  return (
    <Sheet open={open} onOpenChange={() => onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t('settings.title')}</SheetTitle>
        </SheetHeader>
        <div className="py-6 space-y-6">
          <div className="space-y-2">
            <Label>{t('settings.language')}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableLanguages.map(lang => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground">{t('settings.dataPrivacy')}</p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
