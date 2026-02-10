/**
 * Leitor Financeiro com Gemini API
 * 
 * Recebe arquivos (imagens, PDFs, textos) e extrai lançamentos financeiros
 * usando a API do Google Gemini com classificação automática por categorias e tags.
 * 
 * Salvar em: src/lib/leitorFinanceiro.ts
 */

export interface LeitorCategoria {
  id: string;
  name: string;
}

export interface LeitorTag {
  id: string;
  name: string;
}

export interface LeitorArquivo {
  base64?: string;
  text?: string;
  mimeType: string;
}

export interface LeitorConfig {
  apiKey: string;
  batchSize?: number;
  maxRetries?: number;
  modelo?: string;
  onProgress?: (message: string) => void;
}

export interface Lancamento {
  hash: string;
  data: number;
  valor: number;
  moeda: string | null;
  titulo: string;
  observacao: string | null;
  categoria: LeitorCategoria | null;
  tags: LeitorTag[];
}

export interface LeitorResumo {
  arquivosRecebidos: number;
  arquivosProcessados: number;
  arquivosIgnorados: number;
  totalLancamentos: number;
  duplicatasRemovidas: number;
}

export interface LeitorResultado {
  lancamentos: Lancamento[];
  resumo: LeitorResumo;
}

// ================================================================
// GERAR HASH DETERMINÍSTICO (titulo + valor + data)
// ================================================================
function gerarHash(titulo: string | null, valor: number | null, data: number | null): string {
  const tituloNorm = (titulo || '').toLowerCase().replace(/\s+/g, '');
  const valorFixed = (valor || 0).toFixed(2);
  const timestamp = String(data || 0);
  const str = `${tituloNorm}|${valorFixed}|${timestamp}`;

  let h1 = 0x811c9dc5 >>> 0;
  let h2 = 0x01000193 >>> 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x811c9dc5) >>> 0;
  }
  const hex1 = h1.toString(16).padStart(8, '0');
  const hex2 = h2.toString(16).padStart(8, '0');
  return (hex1 + hex2).substring(0, 12);
}

// ================================================================
// CONSTRUIR PROMPT DO SISTEMA
// ================================================================
function buildSystemPrompt(
  categoriasDespesas: LeitorCategoria[],
  categoriasReceitas: LeitorCategoria[],
  tags: LeitorTag[]
): string {
  const despesasStr = categoriasDespesas.length
    ? categoriasDespesas.map((c) => `  - id: "${c.id}", name: "${c.name}"`).join('\n')
    : '  (nenhuma categoria de despesa fornecida)';

  const receitasStr = categoriasReceitas.length
    ? categoriasReceitas.map((c) => `  - id: "${c.id}", name: "${c.name}"`).join('\n')
    : '  (nenhuma categoria de receita fornecida)';

  const tagsStr = tags.length
    ? tags.map((t) => `  - id: "${t.id}", name: "${t.name}"`).join('\n')
    : '  (nenhuma tag fornecida)';

  return `Você é um sistema especializado em leitura e interpretação de documentos financeiros.

REGRAS IMPORTANTES:
1. Analise TODOS os arquivos enviados. Eles podem ser extratos bancários, faturas de cartão de crédito, prints de apps bancários, comprovantes de pagamento, boletos, ou qualquer documento financeiro.
2. Se algum arquivo NÃO for um documento financeiro, IGNORE-O silenciosamente.
3. Extraia TODOS os lançamentos individuais que encontrar.
4. Valores de DESPESA devem ser NEGATIVOS (ex: -200.50).
5. Valores de RECEITA devem ser POSITIVOS (ex: 3500.00).
6. Datas devem ser convertidas para timestamp em milissegundos (Unix epoch * 1000).
7. Se não tiver certeza da moeda, use null.
8. Para cada lançamento, classifique numa categoria de despesa OU receita conforme as listas abaixo.
9. Se nenhuma categoria se encaixar, use null.
10. Adicione tags relevantes (máximo 3) conforme a lista abaixo. Se nenhuma se aplicar, retorne array vazio.
11. NÃO gere o campo "hash". Ele será gerado automaticamente pelo sistema.

CATEGORIAS DE DESPESA:
${despesasStr}

CATEGORIAS DE RECEITA:
${receitasStr}

TAGS DISPONÍVEIS:
${tagsStr}

FORMATO DE RESPOSTA - responda APENAS com um JSON válido, sem markdown, sem backticks, sem explicação:
{
  "lancamentos": [
    {
      "data": 1739193480000,
      "valor": -200.50,
      "moeda": null,
      "titulo": "Nome do estabelecimento ou descrição",
      "observacao": "Informação adicional relevante ou null",
      "categoria": {"id": "xxx", "name": "Nome da Categoria"} ou null,
      "tags": [{"id": "xxx", "name": "Nome da Tag"}]
    }
  ],
  "arquivosProcessados": 2,
  "arquivosIgnorados": 1
}

Se não encontrar NENHUM lançamento financeiro em nenhum arquivo, retorne:
{"lancamentos": [], "arquivosProcessados": 0, "arquivosIgnorados": NUMERO_DE_ARQUIVOS}`;
}

// ================================================================
// MONTAR PARTS PARA A REQUISIÇÃO
// ================================================================
function buildParts(arquivos: LeitorArquivo[], systemPrompt: string): any[] {
  const parts: any[] = [];

  for (const arquivo of arquivos) {
    if (arquivo.text && (arquivo.mimeType === 'text/plain' || arquivo.mimeType === 'text')) {
      parts.push({
        text: `[CONTEÚDO DE ARQUIVO FINANCEIRO]:\n${arquivo.text}`,
      });
    } else if (arquivo.base64) {
      const base64Limpo = arquivo.base64.includes(',')
        ? arquivo.base64.split(',')[1]
        : arquivo.base64;

      parts.push({
        inlineData: {
          mimeType: arquivo.mimeType || 'image/jpeg',
          data: base64Limpo,
        },
      });
    }
  }

  parts.push({ text: systemPrompt });
  return parts;
}

// ================================================================
// ENVIAR COM RETRY
// ================================================================
async function enviarComRetry(
  lote: LeitorArquivo[],
  systemPrompt: string,
  apiKey: string,
  modelo: string,
  maxRetries: number,
  onProgress: (msg: string) => void
): Promise<any> {
  const parts = buildParts(lote, systemPrompt);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent`;

  const body = {
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 65536,
    },
  };

  let ultimoErro: Error | null = null;

  for (let tentativa = 1; tentativa <= maxRetries; tentativa++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error.message || 'Erro desconhecido da API');
      }

      const textoResposta = data.candidates?.[0]?.content?.parts
        ?.map((p: any) => p.text || '')
        .join('')
        .trim();

      if (!textoResposta) {
        throw new Error('Resposta vazia da API');
      }

      const jsonLimpo = textoResposta
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/gi, '')
        .trim();

      return JSON.parse(jsonLimpo);
    } catch (error: any) {
      ultimoErro = error;

      if (tentativa < maxRetries) {
        onProgress(`⏳ Tentativa ${tentativa}/${maxRetries} falhou. Retentando...`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  throw ultimoErro;
}

// ================================================================
// FUNÇÃO PRINCIPAL
// ================================================================
export async function leitorFinanceiro(
  arrayArquivos: LeitorArquivo[],
  arrayCategoriasDespesas: LeitorCategoria[] = [],
  arrayCategoriasReceitas: LeitorCategoria[] = [],
  arrayTags: LeitorTag[] = [],
  config: LeitorConfig
): Promise<LeitorResultado> {
  const {
    apiKey,
    batchSize = 3,
    maxRetries = 3,
    modelo = 'gemini-2.0-flash',
    onProgress = () => {},
  } = config;

  if (!apiKey) throw new Error('API Key é obrigatória.');
  if (!arrayArquivos || arrayArquivos.length === 0) throw new Error('Nenhum arquivo enviado.');

  const systemPrompt = buildSystemPrompt(
    arrayCategoriasDespesas,
    arrayCategoriasReceitas,
    arrayTags
  );

  // Dividir em lotes
  const lotes: LeitorArquivo[][] = [];
  for (let i = 0; i < arrayArquivos.length; i += batchSize) {
    lotes.push(arrayArquivos.slice(i, i + batchSize));
  }

  const totalLotes = lotes.length;
  let todosLancamentos: Lancamento[] = [];
  let arquivosProcessados = 0;
  let arquivosIgnorados = 0;

  onProgress('Enviando para análise...');

  // Processar cada lote
  for (let i = 0; i < totalLotes; i++) {
    const lote = lotes[i];
    const loteNum = i + 1;

    onProgress(`Processando lote ${loteNum} de ${totalLotes}...`);

    try {
      const resultado = await enviarComRetry(
        lote,
        systemPrompt,
        apiKey,
        modelo,
        maxRetries,
        onProgress
      );

      if (resultado && resultado.lancamentos) {
        resultado.lancamentos.forEach((lanc: Lancamento) => {
          lanc.hash = gerarHash(lanc.titulo, lanc.valor, lanc.data);
        });
        todosLancamentos = todosLancamentos.concat(resultado.lancamentos);
        arquivosProcessados += resultado.arquivosProcessados || lote.length;
        arquivosIgnorados += resultado.arquivosIgnorados || 0;

        onProgress(`Lote ${loteNum} de ${totalLotes} concluído.`);
      } else {
        arquivosIgnorados += lote.length;
        onProgress(`Lote ${loteNum} de ${totalLotes} — nenhum lançamento identificado.`);
      }
    } catch (error: any) {
      arquivosIgnorados += lote.length;
      onProgress(`❌ Lote ${loteNum} falhou: ${error.message}`);
    }
  }

  // Deduplicação
  const mapaHash = new Map<string, Lancamento>();
  for (const lanc of todosLancamentos) {
    if (!mapaHash.has(lanc.hash)) {
      mapaHash.set(lanc.hash, lanc);
    }
  }
  const lancamentosUnicos = Array.from(mapaHash.values());
  const duplicatasRemovidas = todosLancamentos.length - lancamentosUnicos.length;

  onProgress(
    `🏁 Leitura finalizada! ${lancamentosUnicos.length} lançamento(s) extraído(s) de ${arquivosProcessados} arquivo(s).`
  );

  return {
    lancamentos: lancamentosUnicos,
    resumo: {
      arquivosRecebidos: arrayArquivos.length,
      arquivosProcessados,
      arquivosIgnorados,
      totalLancamentos: lancamentosUnicos.length,
      duplicatasRemovidas,
    },
  };
}