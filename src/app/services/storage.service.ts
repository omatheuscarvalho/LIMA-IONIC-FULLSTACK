import { Injectable } from '@angular/core';

/**
 * Tipagem para análises armazenadas
 */
export interface StoredAnalysis {
  id: number;
  data: Date;
  especie: string;
  tratamento: string;
  replica: string;
  nomeImagem: string;
  areaEscala: number | null;
  unidade: string;
  resultados: any[];
  resultadosAgregados: any;
  imagemKey: string | null;
  imagemThumbnail: string | null;
}

/**
 * Tipagem para imagens armazenadas no IndexedDB
 */
export interface StoredImage {
  id: string; // img_${timestamp}
  data: Blob;
  tamanho: number;
  tipo: string;
  dataCriacao: Date;
}

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private db: IDBDatabase | null = null;
  private readonly DB_NAME = 'LIMA_Analytics';
  private readonly DB_VERSION = 1;
  private readonly STORE_IMAGES = 'images';
  private readonly STORE_ANALYSIS = 'analysis';
  private readonly STORAGE_KEY_ANALYSIS = 'historico_analises';
  private readonly MAX_LOCALSTORAGE_BYTES = 4000000; // ~4MB
  private readonly QUOTA_ERROR_PATTERNS = ['QuotaExceededError', 'NS_ERROR_DOM_QUOTA_REACHED', 'QuotaExceeded'];

  constructor() {
    this.initializeDB();
  }

  /**
   * Inicializa o banco de dados IndexedDB
   */
  private initializeDB(): void {
    if (!indexedDB) {
      console.warn('IndexedDB não disponível neste navegador');
      return;
    }

    const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

    request.onerror = () => {
      console.error('Erro ao abrir IndexedDB:', request.error);
    };

    request.onsuccess = () => {
      this.db = request.result;
      console.log('IndexedDB inicializado com sucesso');
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Cria store para imagens em alta resolução
      if (!db.objectStoreNames.contains(this.STORE_IMAGES)) {
        const imageStore = db.createObjectStore(this.STORE_IMAGES, { keyPath: 'id' });
        imageStore.createIndex('dataCriacao', 'dataCriacao', { unique: false });
        console.log('Object store "images" criado');
      }

      // Cria store para análises (metadados)
      if (!db.objectStoreNames.contains(this.STORE_ANALYSIS)) {
        const analysisStore = db.createObjectStore(this.STORE_ANALYSIS, { keyPath: 'id' });
        analysisStore.createIndex('data', 'data', { unique: false });
        console.log('Object store "analysis" criado');
      }
    };
  }

  /**
   * Verifica se IndexedDB está disponível e pronto
   */
  private isDBReady(): boolean {
    return this.db !== null && this.db.name === this.DB_NAME;
  }

  /**
   * Salva uma imagem em alta resolução no IndexedDB com retry automático
   */
  async salvarImagemAlta(imagemBase64: string, chave: string, tentativa: number = 1): Promise<boolean> {
    const MAX_TENTATIVAS = 3;

    if (!this.isDBReady()) {
      console.warn(`[${tentativa}/${MAX_TENTATIVAS}] IndexedDB não pronto. Tentando fallback...`);
      
      // Fallback: comprime agressivamente e salva em localStorage
      try {
        const imagemComprimida = await this.gerarThumbnailOtimizado(imagemBase64, 800, 0.3);
        if (imagemComprimida) {
          return this.salvarImagemFallback(imagemComprimida, chave);
        }
      } catch (e) {
        console.error('Erro ao comprimir imagem para fallback:', e);
      }
      return false;
    }

    try {
      // Primeiro tenta com resolução média (800px, 40% qualidade) para economizar espaço
      const imagemComprimida = await this.gerarThumbnailOtimizado(imagemBase64, 800, 0.4);
      const blob = this.base64ToBlob(imagemComprimida || imagemBase64);
      
      console.log(`[${tentativa}/${MAX_TENTATIVAS}] Tentando salvar imagem: ${chave} (${blob.size} bytes)...`);

      return new Promise((resolve) => {
        const transaction = this.db!.transaction([this.STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(this.STORE_IMAGES);
        const request = store.add({ id: chave, data: blob, tamanho: blob.size, tipo: blob.type, dataCriacao: new Date() });

        request.onsuccess = () => {
          console.log(`✅ Imagem salva no IndexedDB: ${chave} (${blob.size} bytes)`);
          resolve(true);
        };

        request.onerror = async () => {
          const erro = request.error;
          const ehQuota = this.QUOTA_ERROR_PATTERNS.some(p => erro?.name?.includes(p) || erro?.message?.includes(p));

          if (ehQuota && tentativa < MAX_TENTATIVAS) {
            console.warn(`⚠️ [${tentativa}/${MAX_TENTATIVAS}] Quota excedida. Limpando espaço e retentando...`);
            
            // Libera espaço agressivamente
            await this.limparImagensAntigas(3);
            
            // Aguarda 500ms e tenta novamente com compressão maior
            setTimeout(async () => {
              const resultado = await this.salvarImagemAlta(imagemBase64, chave, tentativa + 1);
              resolve(resultado);
            }, 500);
          } else if (ehQuota) {
            console.error(`❌ QUOTA EXCEDIDA após ${MAX_TENTATIVAS} tentativas. Salvando em fallback...`);
            // Última tentativa: fallback com máxima compressão
            try {
              const ultimaChance = await this.gerarThumbnailOtimizado(imagemBase64, 600, 0.2);
              resolve(this.salvarImagemFallback(ultimaChance, chave));
            } catch (e) {
              resolve(false);
            }
          } else {
            console.error(`❌ Erro ao salvar imagem: ${erro?.message}`);
            resolve(false);
          }
        };

        transaction.onerror = async () => {
          console.error('Erro na transação:', transaction.error);
          if (tentativa < MAX_TENTATIVAS) {
            setTimeout(async () => {
              const resultado = await this.salvarImagemAlta(imagemBase64, chave, tentativa + 1);
              resolve(resultado);
            }, 500);
          } else {
            resolve(false);
          }
        };
      });
    } catch (error) {
      console.error('Erro ao processar imagem para IndexedDB:', error);
      return false;
    }
  }

  /**
   * Recupera uma imagem em alta resolução do IndexedDB
   */
  async recuperarImagemAlta(chave: string): Promise<string | null> {
    if (!this.isDBReady()) {
      return null;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.STORE_IMAGES], 'readonly');
        const store = transaction.objectStore(this.STORE_IMAGES);
        const request = store.get(chave);

        request.onsuccess = () => {
          if (request.result) {
            const blob = request.result.data as Blob;
            const reader = new FileReader();

            reader.onload = () => {
              resolve(reader.result as string);
            };

            reader.onerror = () => {
              console.error('Erro ao ler blob:', reader.error);
              resolve(null);
            };

            reader.readAsDataURL(blob);
          } else {
            resolve(null);
          }
        };

        request.onerror = () => {
          console.error('Erro ao recuperar imagem:', request.error);
          resolve(null);
        };
      } catch (error) {
        console.error('Erro na transação do IndexedDB:', error);
        resolve(null);
      }
    });
  }

  /**
   * Deleta uma imagem do IndexedDB
   */
  async deletarImagem(chave: string): Promise<boolean> {
    if (!this.isDBReady()) {
      return false;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(this.STORE_IMAGES);
        const request = store.delete(chave);

        request.onsuccess = () => {
          console.log(`Imagem deletada: ${chave}`);
          resolve(true);
        };

        request.onerror = () => {
          console.error('Erro ao deletar imagem:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('Erro na transação de deleção:', error);
        resolve(false);
      }
    });
  }

  /**
   * Limpa imagens antigas do IndexedDB para liberar espaço
   * Agora com retry e melhor tratamento de erros
   */
  async limparImagensAntigas(manter: number = 20): Promise<number> {
    if (!this.isDBReady()) {
      console.warn('⚠️ IndexedDB não pronto. Não posso limpar imagens.');
      return 0;
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.STORE_IMAGES], 'readwrite');
        const store = transaction.objectStore(this.STORE_IMAGES);

        // Primeiro: obter TODAS as imagens
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          try {
            const allImages = getAllRequest.result as StoredImage[];
            
            if (!allImages || allImages.length === 0) {
              console.log('📊 IndexedDB vazio - nenhuma imagem para limpar');
              resolve(0);
              return;
            }

            console.log(`📊 Encontradas ${allImages.length} imagens no IndexedDB`);

            // Ordena por data (mais antigas primeiro)
            allImages.sort((a, b) => {
              const dataA = new Date(a.dataCriacao).getTime();
              const dataB = new Date(b.dataCriacao).getTime();
              return dataA - dataB; // Mais antigas primeiro
            });

            // Deleta as N imagens mais antigas
            let deletadas = 0;
            let espacoLiberado = 0;

            for (let i = 0; i < allImages.length - manter; i++) {
              const imagem = allImages[i];
              const deleteReq = store.delete(imagem.id);

              deleteReq.onsuccess = () => {
                deletadas++;
                espacoLiberado += imagem.tamanho;
                console.log(`🗑️ [${deletadas}] Deletado: ${imagem.id} (${imagem.tamanho} bytes)`);
              };

              deleteReq.onerror = () => {
                console.error(`❌ Erro ao deletar ${imagem.id}:`, deleteReq.error);
              };
            }

            // Aguarda transação completar
            transaction.oncomplete = () => {
              console.log(`📊 Limpeza concluída: ${deletadas} imagens removidas, ${espacoLiberado} bytes liberados`);
              resolve(deletadas);
            };

            transaction.onerror = () => {
              console.error('❌ Erro na transação de limpeza:', transaction.error);
              resolve(deletadas);
            };
          } catch (error) {
            console.error('❌ Erro ao processar imagens:', error);
            resolve(0);
          }
        };

        getAllRequest.onerror = () => {
          console.error('❌ Erro ao obter imagens:', getAllRequest.error);
          resolve(0);
        };
      } catch (error) {
        console.error('❌ Erro geral na limpeza:', error);
        resolve(0);
      }
    });
  }

  /**
   * Salva análises no localStorage preservando os dados necessários para o modal
   * Remove apenas campos pesados por folha (ex.: contorno) para reduzir tamanho.
   */
  async salvarAnalises(analises: StoredAnalysis[]): Promise<boolean> {
    try {
      console.log(`📝 Tentando salvar ${analises.length} análises...`);

      // Preserva dados exibidos no histórico/modal/exportação e remove campos pesados.
      const analisesPersistidas = analises.map(a => this.criarAnalisePersistida(a));

      const ajustadas = this.ajustarAnalisesAoLimite(analisesPersistidas);
      const dados = JSON.stringify(ajustadas);
      const sizeInBytes = new Blob([dados]).size;

      console.log(`📦 Tamanho otimizado: ${sizeInBytes} bytes`);

      localStorage.setItem(this.STORAGE_KEY_ANALYSIS, dados);
      console.log(`✅ Análises salvas com sucesso (${ajustadas.length} registros)`);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao salvar análises:', error?.message);
      
      // Se falhar, tenta salvar apenas últimas 10 análises
      try {
        const ultimas = analises
          .slice(0, 10)
          .map(a => this.criarAnalisePersistida(a));
        
        localStorage.setItem(this.STORAGE_KEY_ANALYSIS, JSON.stringify(ultimas));
        console.log('🆘 Salvo em modo leve: 10 análises apenas');
        return true;
      } catch (e) {
        console.error('❌ Falha crítica. Tentando salvar uma análise essencial...');
        
        // Último fallback: mantém ao menos a análise mais recente com métricas.
        try {
          const minimas = analises
            .slice(0, 1)
            .map(a => this.criarAnalisePersistida(a));

          localStorage.setItem(this.STORAGE_KEY_ANALYSIS, JSON.stringify(minimas));
          console.log('🆘 Salvo modo ultra-leve: 1 análise essencial');
          return true;
        } catch (final) {
          console.error('❌ localStorage bloqueado completamente');
          return false;
        }
      }
    }
  }

  /**
   * Recupera análises do localStorage e normaliza dados para compatibilidade
   */
  carregarAnalises(): StoredAnalysis[] {
    try {
      const dados = localStorage.getItem(this.STORAGE_KEY_ANALYSIS)
        || localStorage.getItem('historico');
      if (!dados) {
        console.log('📭 Nenhuma análise armazenada');
        return [];
      }

      const analises = JSON.parse(dados);
      console.log(`📥 Carregadas ${analises.length} análises do localStorage`);
      
      // Converte strings de data e preenche campos ausentes (compatibilidade com versões antigas).
      return analises.map((a: any) => ({
        ...a,
        data: typeof a.data === 'string' ? new Date(a.data) : a.data,
        especie: a.especie || 'Não informada',
        tratamento: a.tratamento || 'Não informado',
        replica: a.replica || 'Não informada',
        nomeImagem: a.nomeImagem || a.imageName || 'Sem nome',
        areaEscala: a.areaEscala ?? a.scalePatternArea ?? null,
        unidade: a.unidade || a.unit || 'cm',
        resultados: Array.isArray(a.resultados)
          ? a.resultados
          : (Array.isArray(a.leaves) ? a.leaves : []),
        resultadosAgregados: a.resultadosAgregados || a.aggregatedMetrics || null,
        imagemKey: a.imagemKey || null,
        imagemThumbnail: a.imagemThumbnail || null
      }));
    } catch (error) {
      console.error('❌ Erro ao carregar análises:', error);
      return [];
    }
  }

  /**
   * Remove campos pesados e mantém apenas o necessário para histórico/modal/exportação.
   */
  private criarAnalisePersistida(a: StoredAnalysis): any {
    return {
      id: a.id,
      data: a.data,
      especie: a.especie,
      tratamento: a.tratamento,
      replica: a.replica,
      nomeImagem: a.nomeImagem,
      areaEscala: a.areaEscala,
      unidade: a.unidade,
      resultados: Array.isArray(a.resultados)
        ? a.resultados.map((r: any) => ({
            id: r?.id,
            area: r?.area,
            perimetro: r?.perimetro,
            comprimento: r?.comprimento,
            largura: r?.largura,
            relacaoLarguraComprimento: r?.relacaoLarguraComprimento,
            uid: r?.uid
          }))
        : [],
      resultadosAgregados: a.resultadosAgregados || null,
      imagemKey: a.imagemKey || null,
      imagemThumbnail: a.imagemThumbnail || null
    };
  }

  /**
   * Garante que o JSON final caiba no limite do localStorage mantendo as análises mais recentes.
   */
  private ajustarAnalisesAoLimite(analises: any[]): any[] {
    if (!analises.length) {
      return analises;
    }

    let limite = Math.min(this.MAX_LOCALSTORAGE_BYTES, 3800000);
    let ajustadas = [...analises];

    while (ajustadas.length > 1) {
      const dados = JSON.stringify(ajustadas);
      const tamanho = new Blob([dados]).size;

      if (tamanho <= limite) {
        return ajustadas;
      }

      // Remove as mais antigas no fim da lista.
      ajustadas.pop();
    }

    return ajustadas;
  }

  /**
   * Trata especificamente erros de quota exceeded
   */
  private async tratarErroQuota(error: any, analises: StoredAnalysis[]): Promise<boolean> {
    const nomeErro = error?.name || '';
    const mensagemErro = error?.message || '';

    const ehErroQuota = this.QUOTA_ERROR_PATTERNS.some(
      pattern => nomeErro.includes(pattern) || mensagemErro.includes(pattern)
    );

    if (ehErroQuota) {
      console.error('ERRO DE QUOTA: Limite de armazenamento excedido!', error);
      
      // Tenta agressivamente liberar espaço
      await this.limparImagensAntigas(5);
      
      // Reduz drasticamente as análises
      const analisesMinimas = analises.slice(0, 5);
      try {
        localStorage.setItem(this.STORAGE_KEY_ANALYSIS, JSON.stringify(analisesMinimas));
        console.log('Análises reduzidas para versão mínima e salvas');
        return true;
      } catch (e) {
        console.error('Impossível salvar nem versão mínima:', e);
        return false;
      }
    } else {
      console.error('Erro desconhecido ao salvar análises:', error);
      return false;
    }
  }

  /**
   * Remove dados antigos do localStorage que podem estar ocupando espaço
   */
  private limparLocalStorageAntigo(): void {
    try {
      // Remove chaves antigas que podem estar lá
      const chavesAntiga = ['historico', 'historico_json', 'images_history', 'analises'];
      chavesAntiga.forEach(chave => {
        if (localStorage.getItem(chave)) {
          localStorage.removeItem(chave);
          console.log(`🗑️ Removido: ${chave}`);
        }
      });

      // Remove todas as chaves que começam com 'img_' (imagens antigas)
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const chave = localStorage.key(i);
        if (chave && chave.startsWith('img_')) {
          localStorage.removeItem(chave);
          console.log(`🗑️ Removido: ${chave}`);
        }
      }
    } catch (error) {
      console.error('Erro ao limpar localStorage antigo:', error);
    }
  }

  /**
   * Limpeza nuclear do localStorage - último recurso (público)
   */
  limparLocalStorageCompletamente(): void {
    try {
      console.log('⚠️ LIMPEZA NUCLEAR: Removendo TUDO do localStorage...');
      localStorage.clear();
      console.log('✅ localStorage completamente limpo');
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
  }

  /**
   * Converte base64 em Blob (mais eficiente que armazenar como string)
   */
  private base64ToBlob(base64: string): Blob {
    // Remove o prefixo de data URI se presente
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);

    return new Blob([byteArray], { type: 'image/jpeg' });
  }

  /**
   * Fallback para localStorage se IndexedDB não disponível
   */
  private salvarImagemFallback(imagemBase64: string, chave: string): boolean {
    try {
      localStorage.setItem(chave, imagemBase64);
      console.log(`Imagem salva em localStorage (fallback): ${chave}`);
      return true;
    } catch (error: any) {
      if (this.QUOTA_ERROR_PATTERNS.some(p => error?.name?.includes(p) || error?.message?.includes(p))) {
        console.error('localStorage também cheio. Impossível salvar imagem.');
        return false;
      }
      console.error('Erro ao salvar em localStorage:', error);
      return false;
    }
  }

  /**
   * Obtém estatísticas de uso do IndexedDB
   */
  async obterEstatisticas(): Promise<{ totalImagens: number; tamanhoTotal: number }> {
    if (!this.isDBReady()) {
      return { totalImagens: 0, tamanhoTotal: 0 };
    }

    return new Promise((resolve) => {
      try {
        const transaction = this.db!.transaction([this.STORE_IMAGES], 'readonly');
        const store = transaction.objectStore(this.STORE_IMAGES);
        const getAllRequest = store.getAll();

        getAllRequest.onsuccess = () => {
          const imagens = getAllRequest.result as StoredImage[];
          const tamanhoTotal = imagens.reduce((sum, img) => sum + img.tamanho, 0);
          resolve({
            totalImagens: imagens.length,
            tamanhoTotal: tamanhoTotal
          });
        };

        getAllRequest.onerror = () => {
          console.error('Erro ao obter estatísticas:', getAllRequest.error);
          resolve({ totalImagens: 0, tamanhoTotal: 0 });
        };
      } catch (error) {
        console.error('Erro na transação de estatísticas:', error);
        resolve({ totalImagens: 0, tamanhoTotal: 0 });
      }
    });
  }

  /**
   * Gera um thumbnail otimizado com compressão JPEG agressiva
   * Para uso em previsualizações, sem bloquear a UI
   * 
   * NUNCA retorna vazio - sempre retorna algo comprimido
   * 
   * Características:
   * - Redimensiona para largura máxima (default 400px)
   * - Compressão JPEG configurável (default 0.5 = 50% qualidade)
   * - Usa Canvas 2D nativo (sem dependências)
   * - Retorna base64 JPEG (não PNG, mais leve)
   * - Fallback garantido: nunca retorna string vazia
   */
  async gerarThumbnailOtimizado(
    imagemBase64: string,
    maxWidth: number = 400,
    qualidadeCompreasao: number = 0.5
  ): Promise<string> {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        let timeoutId: any = null;

        img.onload = () => {
          clearTimeout(timeoutId);
          
          try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: false });

            if (!ctx) {
              console.warn('Canvas 2D context não disponível. Retornando fallback.');
              // Fallback: retorna JPEG forçado
              resolve(this.forcarFormatoJPEG(imagemBase64, qualidadeCompreasao * 0.8));
              return;
            }

            // Calcula dimensões mantendo aspect ratio
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }

            // Define canvas
            canvas.width = width;
            canvas.height = height;

            // Desenha com fundo branco (evita transparência em JPEG)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);

            // Desenha imagem
            ctx.drawImage(img, 0, 0, width, height);

            // Exporta como JPEG com compressão configurável
            const thumbnail = canvas.toDataURL('image/jpeg', qualidadeCompreasao);

            if (!thumbnail || thumbnail.length === 0) {
              console.warn('Canvas toDataURL retornou vazio. Usando fallback.');
              resolve(this.forcarFormatoJPEG(imagemBase64, qualidadeCompreasao));
              return;
            }

            console.log(
              `✅ Thumbnail gerado: ${width}x${height}px, qualidade ${qualidadeCompreasao * 100}%`
            );

            resolve(thumbnail);
          } catch (error) {
            console.error('Erro ao processar canvas:', error);
            // Fallback: se tudo falhar, força JPEG
            resolve(this.forcarFormatoJPEG(imagemBase64, Math.max(0.2, qualidadeCompreasao - 0.2)));
          }
        };

        img.onerror = () => {
          clearTimeout(timeoutId);
          console.warn('Erro ao carregar imagem para thumbnail. Usando original comprimido.');
          // Fallback: usa original forçado em JPEG
          resolve(this.forcarFormatoJPEG(imagemBase64, qualidadeCompreasao));
        };

        img.src = imagemBase64;

        // Timeout de 5 segundos com fallback garantido
        timeoutId = setTimeout(() => {
          img.src = ''; // Cancela carregamento
          console.warn('Timeout ao carregar imagem. Usando fallback JPEG.');
          resolve(this.forcarFormatoJPEG(imagemBase64, qualidadeCompreasao));
        }, 5000);
      } catch (error) {
        console.error('Erro geral ao gerar thumbnail:', error);
        // Último recurso: retorna original (melhor que nada)
        resolve(imagemBase64);
      }
    });
  }

  /**
   * Converte uma imagem base64 PNG para JPEG com compressão
   * Útil como fallback quando Canvas não funciona
   */
  private forcarFormatoJPEG(imagemBase64: string, qualidade: number = 0.5): string {
    try {
      const img = new Image();
      img.src = imagemBase64;

      if (img.complete) {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          return canvas.toDataURL('image/jpeg', qualidade);
        }
      }
      return imagemBase64;
    } catch (error) {
      console.warn('Erro ao forçar formato JPEG:', error);
      return imagemBase64;
    }
  }
}
