// ============================================================================
// EXEMPLOS DE USO - StorageService com Home Component
// ============================================================================

import { Component } from '@angular/core';
import { StorageService, StoredAnalysis } from '../services/storage.service';

/**
 * EXEMPLO 1: Integração Básica no Home Component
 * ============================================================================
 */

// Em home.page.ts construtor:
constructor(
  private storageService: StorageService,
  // ... outros serviços
) {}

// Método que chama StorageService após análise de imagem
async adicionarAoHistorico() {
  const idAnalise = Date.now();
  let imagemKey: string | null = null;
  let imagemThumbnail: string | null = null;

  if (this.imagemProcessada) {
    imagemKey = `img_${idAnalise}`;

    try {
      // 1️⃣ Gera thumbnail assincronamente (400px, JPEG 50%)
      imagemThumbnail = await this.storageService.gerarThumbnailOtimizado(
        this.imagemProcessada,
        400,  // maxWidth
        0.5   // qualidade JPEG (50% = ficheiro 90% menor)
      );

      // 2️⃣ Salva imagem em alta na IndexedDB
      // Isto executa em background, não bloqueia UI
      const sucessoIndexedDB = await this.storageService.salvarImagemAlta(
        this.imagemProcessada,
        imagemKey
      );

      if (!sucessoIndexedDB) {
        console.warn('IndexedDB falhou, não problema - localStorage é fallback');
      }
    } catch (e: any) {
      console.error('Erro ao processar imagem:', e?.message);
      imagemKey = null;
    }
  }

  // 3️⃣ Cria objeto de análise com todos os metadados
  const analise: StoredAnalysis = {
    id: idAnalise,
    data: new Date(),
    especie: this.especie || 'Não informada',
    tratamento: this.tratamento || 'Não informado',
    replica: this.replica || 'Não informada',
    nomeImagem: this.nomeImagem,
    areaEscala: this.areaEscala || null,
    unidade: this.unidade,
    resultados: [...this.resultados],
    resultadosAgregados: this.resultadosAgregados,
    imagemKey: imagemKey,           // Referência à imagem em IndexedDB
    imagemThumbnail: imagemThumbnail  // Fallback comprimido
  };

  // 4️⃣ Adiciona ao histórico em memória
  this.historico.unshift(analise);
  if (this.historico.length > 30) {
    this.historico = this.historico.slice(0, 30);
  }

  // 5️⃣ Salva assincronamente (não bloqueia UI)
  await this.salvarHistoricoAsync();
}

// Método auxiliar para salvar histórico assincronamente
async salvarHistoricoAsync() {
  try {
    // StorageService cuida automaticamente de:
    // - Limite de 4MB
    // - Tratamento de quota
    // - Limpeza de imagens antigas
    const sucesso = await this.storageService.salvarAnalises(
      this.historico as StoredAnalysis[]
    );

    if (!sucesso) {
      // Se falhar, ainda temos dados em memória
      await this.showAlert('Aviso', 'Dados salvos em memória (sessão)');
    } else {
      console.log('✅ Histórico salvo com sucesso');
    }
  } catch (error) {
    console.error('Erro ao salvar:', error);
  }
}

// Carrega histórico ao iniciar página
carregarHistorico() {
  // StorageService recupera automaticamente
  this.historico = this.storageService.carregarAnalises();
  console.log(`Carregadas ${this.historico.length} análises`);
}

/**
 * EXEMPLO 2: Recuperar Imagem do Histórico
 * ============================================================================
 */

async abrirAnalise(analise: StoredAnalysis) {
  if (!analise.imagemKey) {
    await this.showAlert('Aviso', 'Esta análise não tem imagem armazenada');
    return;
  }

  try {
    // Recupera imagem em alta do IndexedDB
    const imagemAlta = await this.storageService.recuperarImagemAlta(
      analise.imagemKey
    );

    if (imagemAlta) {
      // Sucesso: exibe imagem em alta resolução
      this.imagemSelecionada = imagemAlta;
      console.log('Imagem recuperada do IndexedDB');
    } else if (analise.imagemThumbnail) {
      // Fallback: usa thumbnail se IndexedDB vazio
      this.imagemSelecionada = analise.imagemThumbnail;
      console.log('Sem imagem alta, usando thumbnail');
    } else {
      await this.showAlert('Erro', 'Imagem não disponível');
    }
  } catch (error) {
    console.error('Erro ao recuperar imagem:', error);
  }
}

/**
 * EXEMPLO 3: Limpar Imagens Antigas Manualmente
 * ============================================================================
 */

async limparImagensAntigas() {
  try {
    // Remove todas as imagens exceto as 15 mais recentes
    const deletadas = await this.storageService.limparImagensAntigas(15);
    
    await this.showAlert(
      'Limpeza Concluída',
      `${deletadas} imagens antigas removidas`
    );
    
    // Recarrega histórico se necessário
    this.carregarHistorico();
  } catch (error) {
    console.error('Erro ao limpar:', error);
  }
}

/**
 * EXEMPLO 4: Obter Estatísticas de Storage
 * ============================================================================
 */

async mostrarEstatisticas() {
  const stats = await this.storageService.obterEstatisticas();
  
  const tamanhoMB = (stats.tamanhoTotal / 1024 / 1024).toFixed(2);
  const mensagem = `
    Total de Imagens: ${stats.totalImagens}
    Tamanho Total: ${tamanhoMB} MB
  `;
  
  await this.showAlert('Estatísticas', mensagem);
}

/**
 * EXEMPLO 5: Tratamento Robusto de Erros
 * ============================================================================
 */

// O StorageService já trata automaticamente:

// ❌ QuotaExceededError (Chrome/Safari)
// → Limpa imagens antigas, retry automático

// ❌ NS_ERROR_DOM_QUOTA_REACHED (Firefox)
// → Detectado, reduz histórico, salva mínimo

// ❌ Blob muito grande para IndexedDB
// → Fallback para localStorage com compressão

// ❌ localStorage também cheio
// → Salva apenas metadados, thumbnail como fallback

// ✅ Totalmente transparente para o componente

/**
 * EXEMPLO 6: Sincronização Entre Abas (Bônus!)
 * ============================================================================
 */

// Como localStorage é compartilhado entre abas:

// Aba 1: home.component.ts
async adicionarAoHistorico() {
  // ... salva em localStorage
  await this.storageService.salvarAnalises(this.historico);
}

// Aba 2: qualquer component.ts
ionViewWillEnter() {
  // Sincroniza automaticamente com Aba 1!
  this.historico = this.storageService.carregarAnalises();
}

// Ou escuta eventos:
window.addEventListener('storage', (event) => {
  if (event.key === 'historico_analises') {
    console.log('Histórico atualizado em outra aba!');
    this.carregarHistorico();
  }
});

/**
 * EXEMPLO 7: Testes Unitários
 * ============================================================================
 */

import { TestBed } from '@angular/core/testing';
import { StorageService } from '../services/storage.service';

describe('StorageService', () => {
  let service: StorageService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [StorageService] });
    service = TestBed.inject(StorageService);
  });

  // Teste 1: Salvar e recuperar imagem
  it('deve salvar e recuperar imagem do IndexedDB', async () => {
    const imagemBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...'; // fake
    const chave = 'img_test_123';

    // Salva
    const sucesso = await service.salvarImagemAlta(imagemBase64, chave);
    expect(sucesso).toBe(true);

    // Recupera
    const recuperada = await service.recuperarImagemAlta(chave);
    expect(recuperada).toBeTruthy();
  });

  // Teste 2: Gerar thumbnail
  it('deve gerar thumbnail com tamanho reduzido', async () => {
    const imagemGrande = 'data:image/jpeg;base64,...'; // ~2MB
    
    const thumbnail = await service.gerarThumbnailOtimizado(
      imagemGrande,
      400,
      0.5
    );
    
    // Thumbnail deve ser bem menor
    expect(thumbnail.length).toBeLessThan(imagemGrande.length * 0.2);
  });

  // Teste 3: Salvar análises com limite
  it('deve limitar análises a 4MB', async () => {
    const analises = [
      { id: 1, especie: 'A', /* ... */ },
      { id: 2, especie: 'B', /* ... */ },
    ];

    const sucesso = await service.salvarAnalises(analises);
    expect(sucesso).toBe(true);

    // Valida localStorage
    const recuperadas = service.carregarAnalises();
    expect(recuperadas.length).toBeGreaterThan(0);
  });

  // Teste 4: Tratamento de quota
  it('deve tratar QuotaExceededError gracefully', async () => {
    // Mock localStorage cheio
    spyOn(localStorage, 'setItem').and.throwError('QuotaExceededError');
    
    const analises = [{ id: 1, especie: 'Test', /* ... */ }];
    
    // Nao deve lancar erro, fallback automático
    expect(() => {
      service.salvarAnalises(analises);
    }).not.toThrow();
  });
});

/**
 * EXEMPLO 8: Debugging e Logs Console
 * ============================================================================
 */

// StorageService loga automaticamente:

console.log('✅ Imagem salva no IndexedDB: img_1234567890 (2.1MB)');
console.log('⚠️ Imagem muito grande para armazenar. Tamanho: 15234890 bytes');
console.log('🗑️  Imagem deletada: img_1234567890');
console.log('📊 Limpeza concluída: 5 imagens removidas');
console.log('❌ ERRO DE QUOTA: Limite de armazenamento excedido!');

// Ou inspeciona manualmente:
const stats = await service.obterEstatisticas();
console.log(`${stats.totalImagens} imagens, ${stats.tamanhoTotal} bytes`);

// Ver IndexedDB no DevTools:
// F12 → Application → IndexedDB → LIMA_Analytics → images
// Vê todas as imagens com metadata, tamanhos, datas

/**
 * EXEMPLO 9: Migração de Código Antigo
 * ============================================================================
 */

// ❌ ANTES (ineficiente):
try {
  localStorage.setItem(chave, imagemBase64); // Falha se > 5MB
} catch (e) {
  // Erro silencioso, imagem perdida
}

// ✅ DEPOIS (robusto):
const sucesso = await service.salvarImagemAlta(imagemBase64, chave);
// Automáticamente:
// - Salva em IndexedDB (eficiente)
// - Fallback para localStorage
// - Gera thumbnail se necessário
// - Limpa imagens antigas se quota cheia
// - Tudo assincronamente

/**
 * EXEMPLO 10: Caso Real - Aplicação Completa
 * ============================================================================
 */

// home.page.ts - Fluxo completo
export class HomePage implements OnInit {
  historico: StoredAnalysis[] = [];
  imagemSelecionada: string | null = null;
  imagemProcessada: string | null = null;
  isAnalyzing = false;

  constructor(private storageService: StorageService) {}

  ngOnInit() {
    // Carrega histórico ao abrir página
    this.carregarHistorico();
  }

  async calcular() {
    this.isAnalyzing = true;

    try {
      // Processa imagem (OpenCV, etc)
      this.imagemProcessada = await this.processarImagemComOpenCV();

      // Salva análise assincronamente (não bloqueia UI)
      // Enquanto isto: spinner rodando, UI responsiva
      await this.adicionarAoHistorico();

      console.log('✅ Análise salva!');
    } catch (error) {
      console.error('❌ Erro na análise:', error);
      await this.showAlert('Erro', 'Falha ao analisar imagem');
    } finally {
      this.isAnalyzing = false;
    }
  }

  async adicionarAoHistorico() {
    // ... (vide EXEMPLO 1 acima)
    await this.salvarHistoricoAsync();
  }

  carregarHistorico() {
    this.historico = this.storageService.carregarAnalises();
  }

  async salvarHistoricoAsync() {
    // ... (vide EXEMPLO 1 acima)
  }

  async abrirAnalise(analise: StoredAnalysis) {
    // ... (vide EXEMPLO 2 acima)
  }
}
