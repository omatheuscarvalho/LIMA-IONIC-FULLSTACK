import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonText,
  IonTitle,
  IonToolbar,
  IonSearchbar,
  IonGrid,
  IonRow,
  IonCol,
  IonFooter,
  IonSegment,
  IonSegmentButton,
  IonAccordion,
  IonAccordionGroup,
  IonBadge,
  IonCardHeader,
  IonCardTitle,
  IonLabel,
  IonItem,
  IonInput,
  IonList
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  close,
  download,
  trash,
  time,
  pencil,
  checkmark,
  createOutline,
  closeCircleOutline,
  checkmarkCircleOutline,
  trashOutline,
  downloadOutline,
  trashBinOutline,
  analyticsOutline,
  leafOutline,
  documentTextOutline,
  closeCircle,
  arrowBack,
  imageOutline,
  listOutline,
  expand,
  contract,
  closeOutline,
  camera,
  image as imageIcon, checkmarkOutline
} from 'ionicons/icons';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { StorageService } from '../services/storage.service';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonCard,
    IonCardContent,
    IonText,
    IonButton,
    IonIcon,
    IonModal,
    IonSearchbar,
    IonGrid,
    IonRow,
    IonCol,
    IonFooter,
    IonSegment,
    IonSegmentButton,
    IonAccordion,
    IonAccordionGroup,
    IonBadge,
    IonLabel,
    IonItem,
    IonInput,
    IonList
  ]
})
export class HistoryPage implements OnInit {
  historico: any[] = [];
  filteredHistorico: any[] = []; // Adicionado para manter consistência com o HTML
  analiseDetalhada: any = null;
  searchTerm: string = '';

  // edição do modal
  editingDetalhe: boolean = false;
  editModel: any = null;

  // Variável para controlar a aba selecionada no modal
  selectedSegment: string = 'resumo';

  // Modal de imagem ampliada
  imagemAmpliada: string | null = null;

  constructor(
    private router: Router, 
    private alertController: AlertController,
    private storageService: StorageService
  ) {
    addIcons({ downloadOutline, trashOutline, trashBinOutline, close, createOutline, imageOutline, listOutline, closeOutline, checkmarkOutline, analyticsOutline, camera, image: imageIcon, documentTextOutline, closeCircle, checkmark, leafOutline, download, trash, closeCircleOutline, checkmarkCircleOutline, pencil, time, arrowBack, expand, contract });
  }

  ngOnInit() {
    this.carregarHistorico();
  }

  async carregarHistorico() {
    // Carrega análises do StorageService (já com lógica otimizada)
    this.historico = this.storageService.carregarAnalises();

    // Para cada análise, carrega a imagem do IndexedDB se necessário
    for (const analise of this.historico) {
      // Se não tem thumbnail mas tem imagemKey, tenta recuperar do IndexedDB
      if (analise.imagemKey && !analise.imagemProcessada) {
        try {
          const imagemAlta = await this.storageService.recuperarImagemAlta(analise.imagemKey);
          if (imagemAlta) {
            analise.imagemProcessada = imagemAlta;
          }
        } catch (e) {
          console.warn(`Falha ao recuperar imagem ${analise.imagemKey}:`, e);
        }
      }
    }

    // Ordenar por data (mais recente primeiro)
    this.historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());

    // Inicializa a lista filtrada
    this.filteredHistorico = [...this.historico];
  }

  // Método chamado pelo ionChange ou ngModelChange do Searchbar
  ngDoCheck() {
    this.filtrar();
  }

  filtrar() {
    if (!this.searchTerm || this.searchTerm.trim() === '') {
      this.filteredHistorico = [...this.historico];
      return;
    }

    const term = this.searchTerm.toLowerCase();
    this.filteredHistorico = this.historico.filter(h => {
      const especie = h.especie ? h.especie.toLowerCase() : '';
      const tratamento = h.tratamento ? h.tratamento.toLowerCase() : '';
      const nome = h.nomeImagem ? h.nomeImagem.toLowerCase() : '';

      return especie.includes(term) || tratamento.includes(term) || nome.includes(term);
    });
  }

  trackByHistorico(index: number, item: any) {
    return item?.id ?? index;
  }

  trackByLeaf(index: number, item: any) {
    return item?.id ?? item?.uid ?? index;
  }

  getThumbnail(analise: any): string | null {
    if (!analise) return null;

    // Primeiro tenta pegar do objeto (cache em memória)
    if (analise.imagemProcessada) return analise.imagemProcessada;
    if (analise.imagemBase64) return analise.imagemBase64;
    if (analise.imagem) return analise.imagem;

    // Usa o thumbnail otimizado se disponível (muito menor)
    if (analise.imagemThumbnail) {
      return analise.imagemThumbnail;
    }

    // Se tem imagemKey, carrega do IndexedDB de forma assíncrona
    if (analise.imagemKey && !analise._loadingImage) {
      analise._loadingImage = true; // Marca como carregando para evitar loops
      
      this.storageService.recuperarImagemAlta(analise.imagemKey)
        .then(imagemAlta => {
          if (imagemAlta) {
            analise.imagemProcessada = imagemAlta;
            analise._loadingImage = false;
          }
        })
        .catch(() => {
          analise._loadingImage = false;
        });
    }

    return null;
  }

  selecionarImagem() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        // Navega para a página de análise com a imagem selecionada
        this.router.navigate(['/home'], {
          queryParams: { imagemBase64: e.target.result, nomeImagem: file.name }
        });
      };
      reader.readAsDataURL(file);
    };

    input.click();
  }

  capturarImagem() {
    // TODO: Implementar captura de imagem via câmera
    // Funcionalidade a ser implementada
  }

  async onDeleteAnalise(analise: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar exclusão',
      message: `Deseja excluir esta análise (#${analise.id})? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive', // Estilo vermelho nativo do Ionic
          handler: async () => {
            // Remove a imagem do IndexedDB se existir
            if (analise.imagemKey) {
              try {
                await this.storageService.deletarImagem(analise.imagemKey);
                console.log(`🗑️ Imagem ${analise.imagemKey} removida do IndexedDB`);
              } catch (e) {
                console.warn('Falha ao remover imagem do IndexedDB:', e);
              }
            }

            // Remove a análise do histórico
            this.historico = this.historico.filter(h => h.id !== analise.id);
            await this.atualizarStorage();

            // Se a análise excluída for a que está aberta no modal, fecha o modal
            if (this.analiseDetalhada && this.analiseDetalhada.id === analise.id) {
              this.fecharDetalhes();
            }
          }
        }
      ]
    });
    await alert.present();
  }

  async limparHistorico() {
    if (!this.historico || this.historico.length === 0) return;

    const alert = await this.alertController.create({
      header: 'Limpar tudo',
      message: 'Deseja realmente apagar TODO o histórico? Esta ação não pode ser desfeita.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Apagar Tudo',
          role: 'destructive',
          handler: async () => {
            // Remove todas as imagens do IndexedDB
            for (const analise of this.historico) {
              if (analise.imagemKey) {
                try {
                  await this.storageService.deletarImagem(analise.imagemKey);
                } catch (e) {
                  console.warn(`Falha ao remover imagem ${analise.imagemKey}:`, e);
                }
              }
            }

            // Limpa tudo usando o StorageService
            this.storageService.limparLocalStorageCompletamente();
            
            // Limpa as variáveis locais
            this.historico = [];
            this.filteredHistorico = [];
            this.analiseDetalhada = null;
            
            console.log('✅ Histórico completamente limpo');
          }
        }
      ]
    });
    await alert.present();
  }

  expandirAnalise(analise: any) {
    // Armazena apenas a referência do ID para encontrar depois
    this.analiseDetalhada = analise;
    this.editingDetalhe = false;
  }

  fecharDetalhes() {
    this.analiseDetalhada = null;
    this.editingDetalhe = false;
    this.editModel = null;
    this.selectedSegment = 'resumo'; // Resetar para a aba principal
  }

  onModalDidDismiss(event: any) {
    // Método chamado quando o modal é fechado
    this.fecharDetalhes();
  }

  abrirImagemAmpliada() {
    if (this.analiseDetalhada) {
      this.imagemAmpliada = this.getThumbnail(this.analiseDetalhada);
    }
  }

  fecharImagemAmpliada() {
    this.imagemAmpliada = null;
  }

  async atualizarStorage() {
    try {
      // Usa o StorageService para salvar (j\u00e1 com l\u00f3gica otimizada e IndexedDB)
      const sucesso = await this.storageService.salvarAnalises(this.historico as any);
      
      if (sucesso) {
        console.log('\u2705 Hist\u00f3rico atualizado com sucesso');
      } else {
        console.warn('\u26a0\ufe0f Falha ao salvar hist\u00f3rico, mas dados est\u00e3o em mem\u00f3ria');
      }
      
      this.filtrar(); // Atualiza a visualiza\u00e7\u00e3o
    } catch (err: any) {
      console.error('Erro ao salvar hist\u00f3rico:', err?.message || err);
    }
  }

  exportarAnalise(analise: any) {
    if (!analise) return;

    // Preparar metadados
    const metadados = [
      ['="========================================================"'],
      ['                 RELATÓRIO DE ANÁLISE - L.I.M.A.         '],
      ['="========================================================"'],
      [''],
      ['--- INFORMAÇÕES GERAIS ---'],
      ['L.I.M.A. - Relatório de Análise'],
      ['ID de análise', analise.id || ''],
      ['Data e Hora', new Date(analise.data).toLocaleString()],
      ['Nome da Imagem', analise.nomeImagem || ''],
      ['Espécie', analise.especie || ''],
      ['Tratamento', analise.tratamento || ''],
      ['Réplica', analise.replica || ''],
      [`Área Padrão (${analise.unidade || 'cm'}²)`, analise.areaEscala || analise.scalePatternArea || ''],
      [''], // Linha em branco
      ['="========================================================"'],
      ['             1. MEDIÇÕES INDIVIDUAIS (POR FOLHA)         '],
      ['="========================================================"'],
      ['']
    ];

    // Preparar cabeçalho das colunas de dados
    const cabecalhoDados = ['Folha', `Área (${analise.unidade || 'cm'}²)`, `Perímetro (${analise.unidade || 'cm'})`, `Comprimento (${analise.unidade || 'cm'})`, `Largura (${analise.unidade || 'cm'})`, 'Relação L/C'];

    // Preparar linhas de dados individuais
    let linhasDados: any[] = [];
    if (analise.resultados && Array.isArray(analise.resultados)) {
      linhasDados = analise.resultados.map((r: any) => {
        return [
          `Folha ${r.id}`,
          (r.area || 0).toString().replace('.', ','),
          (r.perimetro || 0).toString().replace('.', ','),
          (r.comprimento || 0).toString().replace('.', ','),
          (r.largura || 0).toString().replace('.', ','),
          (r.relacaoLarguraComprimento || 0).toString().replace('.', ',')
        ];
      });
    }

    // Adicionar estatísticas agregadas
    const linhasAgregadas = [];
    const agg = analise.resultadosAgregados;

    if (agg) {
      linhasAgregadas.push(['']);
      linhasAgregadas.push(['="========================================================"']);
      linhasAgregadas.push(['             2. ESTATÍSTICAS AGREGADAS (RESUMO)          ']);
      linhasAgregadas.push(['="========================================================"']);
      linhasAgregadas.push(['']);
      linhasAgregadas.push(['Parâmetro', 'Média', 'Desvio Padrão']);

      // Helper para formatar número
      const fmt = (n: any) => (n !== undefined && n !== null) ? Number(n).toFixed(4).replace('.', ',') : '-';

      // Verifica chaves novas (inglês) ou antigas (português)
      linhasAgregadas.push([
        'Largura',
        fmt(agg.averageWidth || agg.mediaLargura),
        fmt(agg.standardDeviationWidth || agg.desvioLargura)
      ]);
      linhasAgregadas.push([
        'Comprimento',
        fmt(agg.averageLength || agg.mediaComprimento),
        fmt(agg.standardDeviationLength || agg.desvioComprimento)
      ]);
      linhasAgregadas.push([
        'Área',
        fmt(agg.averageArea || agg.mediaArea),
        fmt(agg.standardDeviationArea || agg.desvioArea)
      ]);
      linhasAgregadas.push([
        'Perímetro',
        fmt(agg.averagePerimeter || agg.mediaPerimetro),
        fmt(agg.standardDeviationPerimeter || agg.desvioPerimetro)
      ]);

      linhasAgregadas.push(['']);
      linhasAgregadas.push(['Soma Total Áreas', fmt(agg.somaAreas || agg.totalArea)]);
    }

    // Combinar tudo
    const dadosCompletos = [
      ...metadados,
      cabecalhoDados,
      ...linhasDados,
      ...linhasAgregadas
    ];

    // Converter para CSV no formato mais compatível com Excel BR
    const csv = Papa.unparse(dadosCompletos, {
      delimiter: ';',
      quotes: true,
      newline: '\r\n'
    });

    // Criar arquivo
    const nomeLimpo = (analise.especie || 'analise').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dataStr = new Date().toISOString().slice(0, 10);
    const nomeArquivo = `LIMA_${nomeLimpo}_${analise.id}_${dataStr}.csv`;

    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, nomeArquivo);
  }

  // --- MÉTODOS DE EDIÇÃO ---

  toggleEditDetalhe() {
    if (!this.analiseDetalhada) return;

    this.editingDetalhe = true;

    // Copia os valores atuais para o modelo de edição
    this.editModel = {
      especie: this.analiseDetalhada.especie,
      tratamento: this.analiseDetalhada.tratamento,
      replica: this.analiseDetalhada.replica,
      nomeImagem: this.analiseDetalhada.nomeImagem
    };
  }

  cancelEditDetalhe() {
    this.editingDetalhe = false;
    this.editModel = null;
  }

  saveEditDetalhe() {
    if (!this.analiseDetalhada || !this.editModel) return;

    // Encontra o índice no array principal
    const idx = this.historico.findIndex(h => h.id === this.analiseDetalhada.id);
    if (idx < 0) return;

    // Cria um novo objeto limpo com apenas os dados essenciais
    const analiseAtualizada = {
      ...this.historico[idx], // Mantém todos os dados originais
      especie: this.editModel.especie,
      tratamento: this.editModel.tratamento,
      replica: this.editModel.replica,
      nomeImagem: this.editModel.nomeImagem
    };

    // Atualiza no array
    this.historico[idx] = analiseAtualizada;

    // Atualiza a visualização do modal
    this.analiseDetalhada = analiseAtualizada;

    // Salva no storage
    this.atualizarStorage();

    this.editingDetalhe = false;
    this.editModel = null;
  }
}