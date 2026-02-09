import React, { useState, useEffect, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { deleteAllData } from '@/lib/db';
import { AlertTriangle, Fingerprint, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface DeleteDataDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biometricsEnabled?: boolean;
  onBiometricUnlock?: () => Promise<boolean>;
}

// Generate random 8-letter uppercase code
function generateCaptcha(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return code;
}

type Step = 'captcha' | 'biometrics' | 'countdown';

export function DeleteDataDialog({ open, onOpenChange, biometricsEnabled = false, onBiometricUnlock }: DeleteDataDialogProps) {
  const { t } = useI18n();
  
  // Step management
  const [step, setStep] = useState<Step>('captcha');
  
  // Captcha step
  const [captchaCode, setCaptchaCode] = useState('');
  const [userInput, setUserInput] = useState('');
  const [initialCountdown, setInitialCountdown] = useState(10);
  const [isInputEnabled, setIsInputEnabled] = useState(false);
  
  // Final countdown step
  const [finalCountdown, setFinalCountdown] = useState(15);
  const [canDelete, setCanDelete] = useState(false);
  
  // Loading state
  const [isDeleting, setIsDeleting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCaptchaCode(generateCaptcha());
      setUserInput('');
      setInitialCountdown(10);
      setIsInputEnabled(false);
      setStep('captcha');
      setFinalCountdown(15);
      setCanDelete(false);
    }
  }, [open]);

  // Initial countdown (10 seconds before enabling input)
  useEffect(() => {
    if (!open || step !== 'captcha' || initialCountdown <= 0) return;
    
    const timer = setInterval(() => {
      setInitialCountdown(prev => {
        if (prev <= 1) {
          setIsInputEnabled(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, step, initialCountdown]);

  // Final countdown (15 seconds before allowing delete)
  useEffect(() => {
    if (!open || step !== 'countdown' || finalCountdown <= 0) return;
    
    const timer = setInterval(() => {
      setFinalCountdown(prev => {
        if (prev <= 1) {
          setCanDelete(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, step, finalCountdown]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow letters and auto-uppercase
    const value = e.target.value.replace(/[^a-zA-Z]/g, '').toUpperCase();
    setUserInput(value.slice(0, 8));
  };

  const handleCaptchaSubmit = async () => {
    if (userInput !== captchaCode) {
      toast.error(t('deleteFlow.wrongCode'));
      return;
    }

    // If biometrics is enabled, go to biometrics step
    if (biometricsEnabled) {
      setStep('biometrics');
    } else {
      // Go directly to countdown
      setStep('countdown');
    }
  };

  const handleBiometricsConfirm = async () => {
    const success = onBiometricUnlock ? await onBiometricUnlock() : true;
    if (success) {
      setStep('countdown');
    } else {
      toast.error(t('biometrics.failed'));
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleFinalDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAllData();
      toast.success(t('settings.dataDeleted'));
      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      toast.error(t('errors.generic'));
    } finally {
      setIsDeleting(false);
    }
  };

  const isCodeCorrect = userInput === captchaCode;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        {/* Step 1: Captcha */}
        {step === 'captcha' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('deleteFlow.title')}
              </AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p className="text-destructive font-medium">
                  {t('deleteFlow.warning')}
                </p>
                <p>{t('deleteFlow.instruction')}</p>
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-4 py-4">
              {/* Display the captcha code */}
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-2">{t('deleteFlow.typeCode')}</p>
                <p className="font-mono text-2xl tracking-widest font-bold text-foreground">
                  {captchaCode}
                </p>
              </div>

              {/* Countdown or input */}
              {!isInputEnabled ? (
                <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                  <Clock className="h-5 w-5 animate-pulse" />
                  <span>{t('deleteFlow.waitSeconds', { seconds: initialCountdown })}</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="captcha-input">{t('deleteFlow.enterCode')}</Label>
                  <Input
                    id="captcha-input"
                    value={userInput}
                    onChange={handleInputChange}
                    placeholder="XXXXXXXX"
                    className="font-mono text-center text-lg tracking-widest uppercase"
                    maxLength={8}
                    autoComplete="off"
                    autoFocus
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCaptchaSubmit}
                disabled={!isInputEnabled || !isCodeCorrect}
                className="flex-1"
              >
                {t('common.confirm')}
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Biometrics (only if enabled) */}
        {step === 'biometrics' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5" />
                {t('deleteFlow.biometricsTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t('deleteFlow.biometricsDesc')}
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex flex-col items-center justify-center py-8">
              <Button
                size="lg"
                onClick={handleBiometricsConfirm}
                className="gap-2"
              >
                <Fingerprint className="h-5 w-5" />
                {t('biometrics.unlock')}
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleCancel} className="flex-1">
                {t('common.cancel')}
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Final countdown */}
        {step === 'countdown' && (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                {t('deleteFlow.finalTitle')}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {!canDelete 
                  ? t('deleteFlow.finalCountdown', { seconds: finalCountdown })
                  : t('deleteFlow.readyToDelete')
                }
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="py-6">
              {!canDelete ? (
                <div className="flex flex-col items-center justify-center space-y-4">
                  {/* Countdown circle */}
                  <div className="relative w-24 h-24">
                    <svg className="w-24 h-24 transform -rotate-90">
                      <circle
                        className="text-muted"
                        strokeWidth="4"
                        stroke="currentColor"
                        fill="transparent"
                        r="44"
                        cx="48"
                        cy="48"
                      />
                      <circle
                        className="text-destructive transition-all duration-1000"
                        strokeWidth="4"
                        strokeDasharray={276.46}
                        strokeDashoffset={276.46 * (1 - finalCountdown / 15)}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                        r="44"
                        cx="48"
                        cy="48"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-destructive">
                      {finalCountdown}
                    </span>
                  </div>
                  
                  {/* Cancel button prominent */}
                  <Button
                    variant="default"
                    size="lg"
                    onClick={handleCancel}
                    className="w-full gap-2"
                  >
                    <X className="h-5 w-5" />
                    {t('deleteFlow.cancelDeletion')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-center text-muted-foreground">
                    {t('deleteFlow.lastChance')}
                  </p>
                  
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      {t('common.cancel')}
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleFinalDelete}
                      disabled={isDeleting}
                      className="flex-1"
                    >
                      {isDeleting ? t('deleteFlow.deleting') : t('deleteFlow.deleteForever')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
