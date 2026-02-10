/**
 * Dialog para importação de transações via IA (Google Gemini)
 * 
 * Salvar em: src/components/ImportAIDialog.tsx
 */

import React, { useState, useRef, useCallback } from 'react';
import { useI18n } from '@/lib/i18n';
import { getDB } from '@/lib/db';
import { Camera, FolderOpen, Loader2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { leitorFinanceiro } from '@/lib/leitorFinanceiro';
import type { LeitorCategoria, LeitorTag } from '@/lib/leitorFinanceiro';
import { processarArquivos, ACCEPTED_FILE_TYPES, ACCEPTED_CAMERA_TYPES, MAX_FILES } from '@/lib/fileUtils';

/**
 * Busca a API key do Gemini salva no IndexedDB
 */
async function getGeminiApiKey(): Promise<string> {
  const db = await getDB();
  const data = await db.get('settings', 'externalKeys') as any;
  return data?.geminiApiKey || '';
}

/**
 * Busca categorias do IndexedDB e separa em despesas e receitas
 */
async function getCategorias(): Promise<{
  despesas: LeitorCategoria[];
  receitas: LeitorCategoria[];
}> {
  const db = await getDB();
  const allCategories = await db.getAll('categories');
  
  const despesas: LeitorCategoria[] = [];
  const receitas: LeitorCategoria[] = [];

  for (const cat of allCategories) {
    const item = { id: cat.id, name: cat.name };
    if (cat.type === 'expense') {
      despesas.push(item);
    } else if (cat.type === 'income') {
      receitas.push(item);
    }
  }

  return { despesas, receitas };
}

/**
 * Busca tags do IndexedDB
 */
async function getTags(): Promise<LeitorTag[]> {
  try {
    const db = await getDB();
    const allTags = await db.getAll('tags' as any);
    return allTags.map((tag: any) => ({ id: tag.id, name: tag.name }));
  } catch {
    return [];
  }
}

type ImportStep = 'choose' | 'processing' | 'done';

interface ImportAIDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ImportAIDialog({ open, onClose }: ImportAIDialogProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<ImportStep>('choose');
  const [progressMessages, setProgressMessages] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const progressEndRef = useRef<HTMLDivElement>(null);

  const addProgress = useCallback((msg: string) => {
    setProgressMessages((prev) => [...prev, msg]);
    setTimeout(() => {
      progressEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }, []);

  const handleReset = () => {
    setStep('choose');
    setProgressMessages([]);
    setSelectedFiles([]);
  };

  const handleClose = () => {
    if (step === 'processing') return;
    handleReset();
    onClose();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const fileArray = Array.from(files).slice(0, MAX_FILES);
    
    if (files.length > MAX_FILES) {
      toast.warning(t('aiImport.maxFilesWarning', { max: MAX_FILES }));
    }

    setSelectedFiles(fileArray);
    await startImport(fileArray);
  };

  const startImport = async (files: File[]) => {
    setStep('processing');
    setProgressMessages([]);

    try {
      // 1. Buscar configurações
      addProgress(t('aiImport.progress.loadingConfig'));

      const [apiKey, { despesas, receitas }, tags] = await Promise.all([
        getGeminiApiKey(),
        getCategorias(),
        getTags(),
      ]);

      if (!apiKey) {
        addProgress('❌ ' + t('aiImport.progress.noApiKey'));
        setStep('done');
        return;
      }

      addProgress(t('aiImport.progress.configLoaded'));

      // 2. Processar arquivos (compressão, leitura)
      addProgress(t('aiImport.progress.preparingFiles'));

      const arquivosProcessados = await processarArquivos(files);

      if (arquivosProcessados.length === 0) {
        addProgress('❌ ' + t('aiImport.progress.noValidFiles'));
        setStep('done');
        return;
      }

      // 3. Enviar para o Gemini via leitorFinanceiro
      const resultado = await leitorFinanceiro(
        arquivosProcessados,
        despesas,
        receitas,
        tags,
        {
          apiKey,
          batchSize: 3,
          maxRetries: 3,
          onProgress: addProgress,
        }
      );

      // 4. Resultado — por enquanto apenas console.log
      console.log('🎉 Resultado do leitorFinanceiro:', resultado);
      console.log('📋 Lançamentos:', JSON.stringify(resultado.lancamentos, null, 2));
      console.log('📊 Resumo:', resultado.resumo);

      toast.success(
        t('aiImport.progress.complete', { total: resultado.resumo.totalLancamentos })
      );
    } catch (error: any) {
      console.error('Erro na importação:', error);
      addProgress(`❌ ${t('aiImport.progress.error')}: ${error.message}`);
      toast.error(t('aiImport.progress.error'));
    }

    setStep('done');
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {t('aiImport.title')}
          </DialogTitle>
          {step === 'choose' && (
            <DialogDescription>{t('aiImport.chooseSource')}</DialogDescription>
          )}
        </DialogHeader>

        {/* STEP: Escolher fonte */}
        {step === 'choose' && (
          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start h-14 text-base"
              onClick={handleCameraClick}
            >
              <Camera className="h-5 w-5 mr-3" />
              {t('aiImport.camera')}
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start h-14 text-base"
              onClick={handleGalleryClick}
            >
              <FolderOpen className="h-5 w-5 mr-3" />
              {t('aiImport.gallery')}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t('aiImport.acceptedFormats')}
            </p>

            {/* Input câmera (single, capture) */}
            <input
              ref={cameraInputRef}
              type="file"
              accept={ACCEPTED_CAMERA_TYPES}
              capture="environment"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />

            {/* Input galeria (multiple) */}
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_FILE_TYPES}
              multiple
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
          </div>
        )}

        {/* STEP: Processando / Concluído */}
        {(step === 'processing' || step === 'done') && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Arquivos selecionados */}
            <div className="text-sm text-muted-foreground mb-2">
              {t('aiImport.filesSelected', { count: selectedFiles.length })}
            </div>

            {/* Log de progresso */}
            <div className="flex-1 overflow-y-auto bg-secondary/30 rounded-lg p-3 space-y-1 min-h-[200px] max-h-[400px]">
              {progressMessages.map((msg, idx) => (
                <p key={idx} className="text-sm font-mono">{msg}</p>
              ))}

              {step === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('aiImport.progress.working')}
                </div>
              )}

              <div ref={progressEndRef} />
            </div>

            {/* Botão fechar quando terminar */}
            {step === 'done' && (
              <div className="pt-3 flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleClose}>
                  {t('common.close')}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}