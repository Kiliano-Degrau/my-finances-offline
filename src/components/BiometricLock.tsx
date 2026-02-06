import React from 'react';
import { useI18n } from '@/lib/i18n';
import { Fingerprint, ShieldCheck, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface BiometricLockProps {
  onUnlock: () => Promise<boolean>;
  isUnlocking?: boolean;
}

export function BiometricLock({ onUnlock, isUnlocking }: BiometricLockProps) {
  const { t } = useI18n();
  const [error, setError] = React.useState(false);

  const handleUnlock = async () => {
    setError(false);
    const success = await onUnlock();
    if (!success) {
      setError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
      {/* App icon/branding */}
      <div className="mb-8 text-center">
        <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="w-10 h-10 text-primary" />
        </div>
        <h1 className="text-2xl font-bold">{t('app.name')}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {t('app.fullName')}
        </p>
      </div>

      {/* Lock icon */}
      <div className="mb-8">
        <div 
          className={cn(
            "w-24 h-24 rounded-full flex items-center justify-center transition-colors",
            error 
              ? "bg-destructive/10" 
              : "bg-primary/10"
          )}
        >
          <Lock 
            className={cn(
              "w-12 h-12 transition-colors",
              error ? "text-destructive" : "text-primary"
            )} 
          />
        </div>
      </div>

      {/* Unlock button */}
      <Button
        size="lg"
        onClick={handleUnlock}
        disabled={isUnlocking}
        className="gap-2 px-8"
      >
        <Fingerprint className="w-5 h-5" />
        {isUnlocking ? t('common.loading') : t('biometrics.unlock')}
      </Button>

      {/* Error message */}
      {error && (
        <p className="text-destructive text-sm mt-4">
          {t('biometrics.failed')}
        </p>
      )}

      {/* Privacy note */}
      <p className="text-muted-foreground text-xs text-center mt-8 max-w-xs">
        {t('settings.dataPrivacy')}
      </p>
    </div>
  );
}
