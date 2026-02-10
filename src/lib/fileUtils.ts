/**
 * Utilitários para processamento de arquivos e compressão de imagens
 * 
 * Salvar em: src/lib/fileUtils.ts
 */

import type { LeitorArquivo } from './leitorFinanceiro';

// Tipos de arquivo aceitos pelo Gemini Vision
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PDF_TYPES = ['application/pdf'];
const TEXT_TYPES = ['text/csv', 'text/plain', 'text/tab-separated-values'];

// Extensões que devem ser lidas como texto
const TEXT_EXTENSIONS = ['.csv', '.tsv', '.txt'];

/**
 * Tipos aceitos para o input de arquivo
 */
export const ACCEPTED_FILE_TYPES = [
  ...IMAGE_TYPES,
  ...PDF_TYPES,
  ...TEXT_TYPES,
  '.csv',
  '.txt',
  '.tsv',
].join(',');

/**
 * Tipos aceitos apenas para câmera (só imagens)
 */
export const ACCEPTED_CAMERA_TYPES = IMAGE_TYPES.join(',');

/**
 * Limite máximo de arquivos
 */
export const MAX_FILES = 20;

function isImage(file: File): boolean {
  return IMAGE_TYPES.includes(file.type);
}

function isTextFile(file: File): boolean {
  if (TEXT_TYPES.includes(file.type)) return true;
  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  return TEXT_EXTENSIONS.includes(ext);
}

function isPDF(file: File): boolean {
  return PDF_TYPES.includes(file.type);
}

/**
 * Comprime uma imagem redimensionando e ajustando qualidade.
 * - Max 1920px no maior lado
 * - Qualidade JPEG 0.7
 */
async function compressImage(
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.7
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Falha ao criar canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', quality);
      resolve(base64);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Falha ao carregar imagem: ${file.name}`));
    };

    img.src = url;
  });
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Falha ao ler arquivo: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Falha ao ler arquivo: ${file.name}`));
    reader.readAsText(file);
  });
}

/**
 * Processa um array de Files e converte para o formato LeitorArquivo[].
 * - Imagens são comprimidas automaticamente
 * - PDFs são lidos como base64
 * - CSV/TXT são lidos como texto
 */
export async function processarArquivos(files: File[]): Promise<LeitorArquivo[]> {
  const resultado: LeitorArquivo[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    try {
      if (isTextFile(file)) {
        const text = await readAsText(file);
        resultado.push({ text, mimeType: 'text/plain' });
      } else if (isImage(file)) {
        const base64 = await compressImage(file);
        resultado.push({ base64, mimeType: 'image/jpeg' });
      } else if (isPDF(file)) {
        const base64 = await readAsBase64(file);
        resultado.push({ base64, mimeType: 'application/pdf' });
      } else {
        // Tipo não reconhecido → tentar como texto
        const text = await readAsText(file);
        resultado.push({ text, mimeType: 'text/plain' });
      }
    } catch (error: any) {
      console.warn(`Erro ao processar ${file.name}:`, error.message);
    }
  }

  return resultado;
}