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
  IonCheckbox,
  IonCardHeader,
  IonCardTitle,
  IonLabel,
  IonItem,
  IonInput,
  IonList, ActionSheetController
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
  documentOutline,
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
import { ExportService } from '../services/export.service';

type MedidaKey =
  'area' | 'perimetro' | 'comprimento' | 'largura' |
  'somarAreas' | 'relacaoLarguraComprimento' | 'mediaDesvio';

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
    IonCheckbox,
    IonLabel,
    IonItem,
    IonInput,
    IonList
  ]
})
export class HistoryPage implements OnInit {
  medidasOptions: { key: MedidaKey; label: string }[] = [
    { key: 'area', label: 'Área' },
    { key: 'perimetro', label: 'Perímetro' },
    { key: 'comprimento', label: 'Comprimento' },
    { key: 'largura', label: 'Largura' },
    { key: 'somarAreas', label: 'Somar áreas' },
    { key: 'relacaoLarguraComprimento', label: 'Relação L/C' },
    { key: 'mediaDesvio', label: 'Média e desvio' }
  ];

  medidasSelecionadas: Record<MedidaKey, boolean> = this.criarFiltroPadrao();

  viewFilterState: Record<MedidaKey, boolean> = this.criarFiltroPadrao();

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

  private criarFiltroPadrao(): Record<MedidaKey, boolean> {
    return {
      area: true,
      perimetro: true,
      comprimento: true,
      largura: true,
      somarAreas: true,
      relacaoLarguraComprimento: true,
      mediaDesvio: true
    };
  }

  constructor(
    private router: Router,
    private alertController: AlertController,
    private storageService: StorageService,
    private actionSheetCtrl: ActionSheetController,
    private exportService: ExportService
  ) {
    addIcons({
      downloadOutline,
      trashOutline,
      trashBinOutline,
      close,
      createOutline,
      imageOutline,
      listOutline,
      closeOutline,
      checkmarkOutline,
      analyticsOutline,
      camera,
      image: imageIcon,
      documentTextOutline,
      closeCircle,
      checkmark,
      leafOutline,
      download,
      trash,
      closeCircleOutline,
      checkmarkCircleOutline,
      pencil,
      time,
      arrowBack,
      expand,
      contract,
      'document-outline': documentOutline,
      'document-text-outline': documentTextOutline
    });
  }

  ngOnInit() {
    this.resetFiltroExibicao();
    this.carregarHistorico();
  }

  isFilterDisabled(key: MedidaKey): boolean {
    if (key === 'somarAreas') {
      return !this.viewFilterState.area;
    }

    if (key === 'relacaoLarguraComprimento') {
      return !(this.viewFilterState.largura && this.viewFilterState.comprimento);
    }

    return false;
  }

  onFilterChange(key: MedidaKey, checked: boolean) {
    this.viewFilterState[key] = checked;

    if (!checked) {
      if (key === 'area') {
        this.viewFilterState.somarAreas = false;
      }

      if (key === 'largura' || key === 'comprimento') {
        this.viewFilterState.relacaoLarguraComprimento = false;
      }
    }

    if (this.isFilterDisabled('somarAreas')) {
      this.viewFilterState.somarAreas = false;
    }

    if (this.isFilterDisabled('relacaoLarguraComprimento')) {
      this.viewFilterState.relacaoLarguraComprimento = false;
    }
  }

  private resetFiltroExibicao() {
    this.viewFilterState = this.criarFiltroPadrao();
    this.medidasSelecionadas = { ...this.viewFilterState };
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

  onDeleteLeafClick(leaf: any, event: Event) {
    event.stopPropagation();
    this.presentLeafDeleteConfirmation(leaf);
  }

  private async presentLeafDeleteConfirmation(leaf: any) {
    if (!this.analiseDetalhada || !leaf) return;

    const alert = await this.alertController.create({
      header: 'Confirmar exclusão',
      message: `Deseja excluir a folha ${leaf.id}? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Excluir',
          role: 'destructive',
          handler: async () => {
            await this.deleteLeafFromCurrentAnalysis(leaf.id);
          }
        }
      ]
    });

    await alert.present();
  }

  private async deleteLeafFromCurrentAnalysis(leafId: number) {
    if (!this.analiseDetalhada) return;

    const target = this.historico.find(h => h.id === this.analiseDetalhada.id);
    if (!target || !Array.isArray(target.resultados)) return;

    const updatedResult = target.resultados
      .filter((leaf: any) => leaf.id !== leafId)
      .map((leaf: any, index: number) => ({ ...leaf, id: index + 1 }));

    const updatedAnalysis = {
      ...target,
      resultados: updatedResult,
      resultadosAgregados: this.recalcularAgregados(updatedResult)
    };

    this.historico = this.historico.map(h => h.id === updatedAnalysis.id ? updatedAnalysis : h);
    this.analiseDetalhada = updatedAnalysis;

    await this.atualizarStorage();
  }

  private recalcularAgregados(resultados: any[]) {
    if (!Array.isArray(resultados) || resultados.length === 0) {
      return {
        totalArea: 0,
        averageArea: 0,
        standardDeviationArea: 0,
        averagePerimeter: 0,
        standardDeviationPerimeter: 0,
        averageWidth: 0,
        standardDeviationWidth: 0,
        averageLength: 0,
        standardDeviationLength: 0,
        averageWidthToLengthRatio: 0,
        somaAreas: 0,
        mediaArea: 0,
        desvioArea: 0,
        mediaPerimetro: 0,
        desvioPerimetro: 0,
        mediaLargura: 0,
        desvioLargura: 0,
        mediaComprimento: 0,
        desvioComprimento: 0,
        mediaRelacao: 0
      };
    }

    const toFinite = (value: number | null | undefined) =>
      Number.isFinite(value as number) ? (value as number) : 0;
    const mean = (values: number[]) =>
      values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    const stdDev = (values: number[], average: number) =>
      values.length > 0
        ? Math.sqrt(values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / values.length)
        : 0;

    const areas = resultados.map(result => toFinite(result.area));
    const perimetros = resultados.map(result => toFinite(result.perimetro));
    const larguras = resultados.map(result => toFinite(result.largura));
    const comprimentos = resultados.map(result => toFinite(result.comprimento));
    const relacoes = resultados.map(result => toFinite(result.relacaoLarguraComprimento));

    const totalArea = areas.reduce((sum, value) => sum + value, 0);
    const averageArea = mean(areas);
    const averagePerimeter = mean(perimetros);
    const averageWidth = mean(larguras);
    const averageLength = mean(comprimentos);
    const averageWidthToLengthRatio = mean(relacoes);

    return {
      totalArea,
      averageArea,
      standardDeviationArea: stdDev(areas, averageArea),
      averagePerimeter,
      standardDeviationPerimeter: stdDev(perimetros, averagePerimeter),
      averageWidth,
      standardDeviationWidth: stdDev(larguras, averageWidth),
      averageLength,
      standardDeviationLength: stdDev(comprimentos, averageLength),
      averageWidthToLengthRatio,
      somaAreas: totalArea,
      mediaArea: averageArea,
      desvioArea: stdDev(areas, averageArea),
      mediaPerimetro: averagePerimeter,
      desvioPerimetro: stdDev(perimetros, averagePerimeter),
      mediaLargura: averageWidth,
      desvioLargura: stdDev(larguras, averageWidth),
      mediaComprimento: averageLength,
      desvioComprimento: stdDev(comprimentos, averageLength),
      mediaRelacao: averageWidthToLengthRatio
    };
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
    this.resetFiltroExibicao();
    this.analiseDetalhada = analise;
    this.editingDetalhe = false;
    this.selectedSegment = 'resumo';
  }

  fecharDetalhes() {
    this.analiseDetalhada = null;
    this.editingDetalhe = false;
    this.editModel = null;
    this.selectedSegment = 'resumo'; // Resetar para a aba principal
    this.resetFiltroExibicao();
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

  async exportarAnalise(analise: any) {
    if (!analise || !analise.resultados || analise.resultados.length === 0) {
      const alert = await this.alertController.create({ header: 'Atenção', message: 'Sem resultados para exportar.', buttons: ['OK'] });
      await alert.present();
      return;
    }

    const actionSheet = await this.actionSheetCtrl.create({
      header: 'Escolha o formato de exportação',
      buttons: [
        {
          text: 'Exportar como Planilha (CSV)',
          icon: 'document-text-outline',
          handler: () => {
            this.exportService.exportarCSV(
              analise,
              this.viewFilterState, // Usa a visibilidade atual configurada pelo usuário
              analise.unidade || 'cm',
              analise.resultados,
              analise.resultadosAgregados
            ).catch(e => console.error('Erro na exportação CSV', e));
          }
        },
        {
          text: 'Exportar como Documento (PDF)',
          icon: 'document-outline',
          handler: () => {
            // Garante que tentamos pegar a melhor imagem possível
            const imagem = this.getThumbnail(analise) || '';

            this.exportService.exportarPDF(
              analise,
              analise.unidade || 'cm',
              analise.resultados,
              analise.resultadosAgregados,
              imagem
            ).catch(e => console.error('Erro na exportação PDF', e));
          }
        },
        {
          text: 'Cancelar',
          icon: 'close',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
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