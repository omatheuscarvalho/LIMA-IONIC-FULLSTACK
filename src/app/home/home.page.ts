import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonCol, IonContent, IonGrid, IonTitle, IonHeader, IonIcon, IonInput, IonItem, IonLabel,
  IonNote, IonRow, IonToolbar, IonImg, IonText, IonList, IonCheckbox,
  IonSpinner, AlertController, AlertInput, IonSelect, IonSelectOption
} from '@ionic/angular/standalone';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  camera, download, help, home, moon, sunny, time,
  trash, logOut, person, calculator, image as imageIcon, chevronDownOutline
} from 'ionicons/icons';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';

import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../services/theme.service';
import { StorageService, StoredAnalysis } from '../services/storage.service';
import { ImageAnalysisService, LeafMetric, AggregatedMetrics } from '../services/image-analysis.service';
import { ChangeDetectorRef } from '@angular/core';
/**
 * Tipagem das chaves das medidas (declarada OUTSIDE da classe)
 */
type MedidaKey =
  'area' | 'perimetro' | 'comprimento' | 'largura' |
  'somarAreas' | 'relacaoLarguraComprimento' | 'mediaDesvio';

type UnidadeKey = 'cm' | 'mm';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, FormsModule, CommonModule, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton,
    IonIcon, IonNote, IonButtons, IonGrid, IonRow, IonCol, IonImg, IonText, IonList,
    IonCheckbox, IonSpinner, IonSelect, IonSelectOption
  ],
})
export class HomePage {
  // --- dados do experimento ---
  especie = '';
  tratamento = '';
  replica = '';
  areaEscala = 1;
  unidade: UnidadeKey = 'cm';
  unitSelectInterfaceOptions = {
    header: 'Escolha uma unidade de medida',
    message: 'A unidade selecionada será usada nos resultados e na exportação dos dados.'
  };

  // Lista tipada de medidas (usada no template com *ngFor)
  medidasOptions: { key: MedidaKey; label: string }[] = [
    { key: 'area', label: 'Área' },
    { key: 'perimetro', label: 'Perímetro' },
    { key: 'comprimento', label: 'Comprimento' },
    { key: 'largura', label: 'Largura' },
    { key: 'somarAreas', label: 'Somar áreas' },
    { key: 'relacaoLarguraComprimento', label: 'Relação L/C' },
    { key: 'mediaDesvio', label: 'Média e desvio' }
  ];

  // Estado das medidas (tipado com Record)
  medidasSelecionadas: Record<MedidaKey, boolean> = {
    area: true,
    perimetro: true,
    comprimento: true,
    largura: true,
    somarAreas: false,
    relacaoLarguraComprimento: false,
    mediaDesvio: false
  };

  // --- imagens / seleção ---
  imagemSelecionada: string | null = null;
  imagemProcessada: string | null = null;
  nomeImagem = '';
  hasImage = false;
  selectedImageFile: File | null = null;

  // --- resultados ---
  resultados: LeafMetric[] = [];
  resultadosAgregados: AggregatedMetrics | null = null;

  // --- histórico, UI e tema ---
  historico: any[] = [];
  darkMode = false;
  isAnalyzing = false;

  visibleLeafDetails = new Set<number>();
  aggregatedResultsVisible = true;
  private usuarioAnterior: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private themeService: ThemeService,
    private storageService: StorageService,
    private imageService: ImageAnalysisService,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
  ) {
    // Registrar ícones (sem duplicatas)
    addIcons({
      person,
      logOut,
      calculator,
      trash,
      camera,
      time,
      help,
      download,
      sunny,
      moon,
      home,
      image: imageIcon,
      'chevron-down-outline': chevronDownOutline
    });

    this.carregarHistorico();
    this.themeService.darkMode$.subscribe(v => this.darkMode = v);
  }

  // ------- ciclo de vida -------
  ionViewWillEnter() {
    const usuario = this.authService.getCurrentUser()?.id ?? null;
    if (usuario !== this.usuarioAnterior) {
      this.resetAnalise();
      this.usuarioAnterior = usuario;
    }
  }

  // ------- utilitários de agregados -------
  private initAggregatedMetrics(): AggregatedMetrics {
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
      // adicione aqui outros campos esperados pelo seu AggregatedMetrics
    } as AggregatedMetrics;
  }

  private ensureAggregatedInitialized() {
    if (!this.resultadosAgregados) {
      this.resultadosAgregados = this.initAggregatedMetrics();
    }
  }

  // ------- reset / seleção de imagem -------
  resetAnalise() {
    this.especie = '';
    this.tratamento = '';
    this.replica = '';
    this.areaEscala = 1;
    this.imagemSelecionada = null;
    this.imagemProcessada = null;
    this.nomeImagem = '';
    this.hasImage = false;
    this.selectedImageFile = null;
    this.resultados = [];
    this.resultadosAgregados = null;
    this.isAnalyzing = false;
    this.visibleLeafDetails.clear();
    this.aggregatedResultsVisible = true;
  }

  selecionarImagem() {
    this.resetAnalise();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = (event: any) => {
      const file = event.target.files?.[0];
      if (!file) return;

      this.selectedImageFile = file;
      this.nomeImagem = file.name;
      this.hasImage = true;

      const reader = new FileReader();
      reader.onload = (e: any) => this.imagemSelecionada = e.target.result;
      reader.readAsDataURL(file);
    };

    input.click();
  }

  async capturarImagem() {
    try {
      // Captura imagem via câmera do dispositivo
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Base64, // Retorna em base64
        source: CameraSource.Camera, // Usa a câmera traseira do dispositivo
        promptLabelPhoto: 'Selecionar Foto',
        promptLabelPicture: 'Tirar Foto',
        promptLabelCancel: 'Cancelar'
      });

      // Se conseguiu capturar, processa a imagem
      if (image.base64String) {
        this.resetAnalise(); // Limpa análise anterior se houver
        
        // Cria URI de dados em base64
        const base64Image = `data:image/jpeg;base64,${image.base64String}`;
        
        this.imagemSelecionada = base64Image;
        
        // Define nome da imagem com timestamp
        const timestamp = new Date().toLocaleString('pt-BR');
        this.nomeImagem = `captura_${Date.now()}.jpg`;
        
        this.hasImage = true;
        this.selectedImageFile = null; // Sem arquivo File no caso de câmera
      }
    } catch (error: any) {
      // Se o usuário cancelou, não mostra erro
      if (error.message === 'User cancelled photos app') {
        return;
      }
      
      // Mostra erro se houver outro problema
      await this.showAlert('Erro', `Falha ao capturar imagem: ${error?.message || 'Desconhecido'}`);
      console.error('Erro ao capturar imagem:', error);
    }
  }

  private createImg(base64: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Falha ao carregar imagem.'));
      img.src = base64;
    });
  }

  // ------- processamento -------
  async calcular() {
    if (!this.hasImage || !this.imagemSelecionada) {
      return this.showAlert('Atenção', 'Selecione uma imagem primeiro.');
    }

    if (!(this.areaEscala > 0)) {
      return this.showAlert('Atenção', 'Informe uma área de escala válida.');
    }

    this.isAnalyzing = true;
    this.resultados = [];
    this.resultadosAgregados = null;

    try {
      const img = await this.createImg(this.imagemSelecionada);
      const r = await this.imageService.processImageDirect(img, this.areaEscala);

      if (r.error) {
        await this.showAlert('Erro', r.error);
        return;
      }

      this.resultados = r.leaves ?? [];
      this.resultadosAgregados = r.aggregatedMetrics ?? this.initAggregatedMetrics();
      this.imagemProcessada = r.processedImage ?? null;
      await this.adicionarAoHistorico();
    } catch (e: any) {
      await this.showAlert('Erro', e?.message ?? 'Falha inesperada.');
    } finally {
      this.isAnalyzing = false;
    }
  }

  // ------- detalhes / toggles -------
  toggleLeafDetails(id: number) {
    this.visibleLeafDetails.has(id) ? this.visibleLeafDetails.delete(id) : this.visibleLeafDetails.add(id);
  }

  // trackBy function for ngFor to prevent DOM reuse issues when IDs are renumbered
  trackByLeaf(index: number, item: any) {
    // prefer stable uid if present
    return item?.uid ?? item?.id ?? index;
  }

  // Clique no ícone de lixeira de uma única folha: abre confirmação sem acionar toggle
  onDeleteClick(id: number, event: Event) {
    event.stopPropagation();
    this.presentFinalConfirmationAlert([id], `a folha ${id}`);
  }

  toggleAggregatedResults() {
    this.aggregatedResultsVisible = !this.aggregatedResultsVisible;
  }

  // ------- recalculo agregados (seguro) -------
  private recalcAggregated() {
    if (!this.resultados || this.resultados.length === 0) {
      this.resultadosAgregados = this.initAggregatedMetrics();
      return;
    }

    this.resultadosAgregados = this.initAggregatedMetrics();

    const toFinite = (value: number | null | undefined) =>
      Number.isFinite(value as number) ? (value as number) : 0;
    const mean = (values: number[]) =>
      values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : 0;
    const stdDev = (values: number[], avg: number) =>
      values.length > 0
        ? Math.sqrt(values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length)
        : 0;

    const areas = this.resultados.map(r => toFinite(r.area));
    const perimetros = this.resultados.map(r => toFinite(r.perimetro));
    const larguras = this.resultados.map(r => toFinite(r.largura));
    const comprimentos = this.resultados.map(r => toFinite(r.comprimento));
    const relacoes = this.resultados.map(r => toFinite(r.relacaoLarguraComprimento));

    const totalArea = areas.reduce((sum, v) => sum + v, 0);
    const averageArea = mean(areas);
    const averagePerimeter = mean(perimetros);
    const averageWidth = mean(larguras);
    const averageLength = mean(comprimentos);

    this.resultadosAgregados.totalArea = totalArea;
    this.resultadosAgregados.averageArea = averageArea;
    this.resultadosAgregados.standardDeviationArea = stdDev(areas, averageArea);
    this.resultadosAgregados.averagePerimeter = averagePerimeter;
    this.resultadosAgregados.standardDeviationPerimeter = stdDev(perimetros, averagePerimeter);
    this.resultadosAgregados.averageWidth = averageWidth;
    this.resultadosAgregados.standardDeviationWidth = stdDev(larguras, averageWidth);
    this.resultadosAgregados.averageLength = averageLength;
    this.resultadosAgregados.standardDeviationLength = stdDev(comprimentos, averageLength);
    this.resultadosAgregados.averageWidthToLengthRatio = mean(relacoes);
  }

  // ------- excluir folhas (alerts) -------
  async presentDeleteSelectionAlert() {
    const inputs: AlertInput[] = this.resultados.map(f => ({
      name: `leaf-${f.id}`,
      type: 'checkbox',
      label: `Folha ${f.id}`,
      value: f.id
    }));

    const alert = await this.alertCtrl.create({
      header: 'Excluir Folhas',
      cssClass: 'delete-selection-alert',
      message: 'Selecione as folhas que deseja remover da análise.',
      inputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
          handler: () => true
        },
        {
          text: 'Excluir',
          cssClass: 'alert-button-confirm',
          handler: async (selectedLeafIds: number[]) => {
            if (selectedLeafIds && selectedLeafIds.length) {
              await this.presentFinalConfirmationAlert(selectedLeafIds, `${selectedLeafIds.length} folha(s) selecionada(s)`);
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async presentFinalConfirmationAlert(idsToDelete: number[], messageExtra: string) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir ${messageExtra}? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          cssClass: 'alert-button-danger',
          handler: () => {
            this.deleteSelectedLeaves(idsToDelete);
            return true;
          }
        }
      ]
    });
    await alert.present();
  }

  private async deleteSelectedLeaves(idsToDelete: number[]) {
    // Remove as folhas selecionadas
    this.resultados = this.resultados.filter(leaf => !idsToDelete.includes(leaf.id));

    // Renumera as folhas restantes (1..n) para redefinir a contagem
    this.resultados = this.resultados.map((leaf, idx) => ({ ...leaf, id: idx + 1 }));

    // Limpa quaisquer detalhes/toggles que poderiam referenciar ids antigos
    this.visibleLeafDetails.clear();

    // Recalcula métricas agregadas com os resultados atualizados
    this.recalcAggregated();

    // Atualiza a imagem processada: redesenha os rótulos sobre a imagem base
    // usa o imagemSelecionada (base) para gerar uma nova imagem com apenas os labels atuais
    if (this.imagemSelecionada) {
      const baseImg = this.imagemSelecionada;
      try {
        // chamada assíncrona — tenta redesenhar contornos + labels usando OpenCV (mesmo estilo)
        let processedImage = await this.imageService.drawContoursAndLabelsOnImage(baseImg, this.resultados)
          // se falhar (ex.: contornos não persistidos), regrada com drawLabelsOnImage como fallback
          .catch(() => this.imageService.drawLabelsOnImage(baseImg, this.resultados));
        
        this.imagemProcessada = processedImage || this.imagemSelecionada;
        
        // força re-render da view
        await Promise.resolve();
        this.cdr.detectChanges();
        
        // Aguarda histórico ser salvo
        await this.adicionarAoHistorico();
      } catch (err) {
        // se falhar, apenas atualiza agregados e histórico
        console.warn('Falha ao regenerar imagem processada:', err);
        await Promise.resolve();
        this.cdr.detectChanges();
        await this.adicionarAoHistorico();
      }
      return;
    }

    // re-render obrigatório aqui
    await Promise.resolve();
    this.cdr.detectChanges();

    await this.adicionarAoHistorico();
  }

  // ------- histórico -------
  async adicionarAoHistorico() {
    // Sempre recarrega o histórico do localStorage antes de adicionar
    this.carregarHistorico();

    const idAnalise = Date.now();
    let imagemKey: string | null = null;
    let imagemThumbnail: string | null = null;

    if (this.imagemProcessada) {
      imagemKey = `img_${idAnalise}`;

      try {
        console.log('🖼️ Iniciando processamento de imagem...');
        
        // Gera thumbnail otimizado de forma assíncrona (não bloqueia UI)
        console.log('🔄 Gerando thumbnail otimizado...');
        imagemThumbnail = await this.storageService.gerarThumbnailOtimizado(
          this.imagemProcessada,
          400, // maxWidth
          0.5  // 50% qualidade
        );

        if (!imagemThumbnail || imagemThumbnail.length === 0) {
          console.warn('⚠️ Thumbnail gerado vazio, usando fallback.');
          imagemThumbnail = await this.storageService.gerarThumbnailOtimizado(
            this.imagemProcessada,
            300,
            0.3
          );
        }

        console.log(`✅ Thumbnail gerado: ${imagemThumbnail?.length || 0} bytes`);

        // Salva imagem em alta resolução no IndexedDB (assíncrono, não bloqueia)
        console.log('💾 Salvando imagem em alta resolução (IndexedDB)...');
        const sucessoIndexedDB = await this.storageService.salvarImagemAlta(
          this.imagemProcessada,
          imagemKey
        );

        if (sucessoIndexedDB) {
          console.log('✅ Imagem salva com sucesso no IndexedDB');
        } else {
          console.warn('⚠️ Falha ao salvar no IndexedDB. Imagem será recuperada do fallback se necessário.');
        }
      } catch (e: any) {
        console.error('❌ Erro ao processar imagem:', e?.message);
        imagemKey = null;
      }
    }

    // Cria objeto de análise com metadados
    const analise: StoredAnalysis = {
      id: idAnalise,
      data: new Date(),
      especie: (this.especie && this.especie.trim() !== '') ? this.especie : 'Não informada',
      tratamento: (this.tratamento && this.tratamento.trim() !== '') ? this.tratamento : 'Não informado',
      replica: (this.replica && this.replica.trim() !== '') ? this.replica : 'Não informada',
      nomeImagem: this.nomeImagem,
      areaEscala: this.areaEscala || null,
      unidade: this.unidade,
      resultados: [...this.resultados],
      resultadosAgregados: this.resultadosAgregados ? { ...this.resultadosAgregados } : null,
      imagemKey: imagemKey,
      imagemThumbnail: imagemThumbnail
    };

    // Adiciona ao histórico em memória
    this.historico.unshift(analise);

    // Mantém apenas 30 análises mais recentes
    if (this.historico.length > 30) {
      this.historico = this.historico.slice(0, 30);
    }

    console.log(`📊 Análise adicionada ao histórico. Total: ${this.historico.length}`);

    // Salva assincronamente (não bloqueia UI)
    await this.salvarHistoricoAsync();
  }

  /**
   * Remove a função gerarThumbnail() do componente
   * Agora está otimizada no StorageService
   */

  async salvarHistoricoAsync() {
    try {
      console.log(`📝 Salvando histórico (${this.historico.length} análises)...`);
      
      // Usa o novo serviço para salvar (agora com dados otimizados)
      const sucesso = await this.storageService.salvarAnalises(
        this.historico as StoredAnalysis[]
      );

      if (sucesso) {
        console.log(`✅ Histórico salvo com sucesso!`);
      } else {
        console.warn(`⚠️ Falha ao salvar histórico, mas dados estão em memória`);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar histórico assincronamente:', error);
      console.log(`⚠️ Histórico em memória com ${this.historico.length} análises`);
    }
  }

  /**
   * Salva histórico (compatível com código antigo, agora em background)
   * Para não bloquear, o método é assíncrono
   */
  salvarHistorico() {
    // Executa em background sem bloqueair
    this.salvarHistoricoAsync().catch(e => console.error('Background save error:', e));
  }

  carregarHistorico() {
    // Usa o StorageService para carregar análises
    this.historico = this.storageService.carregarAnalises();
    console.log(`Histórico carregado: ${this.historico.length} análises`);
  }

  limparHistorico() {
    const limpar = confirm('Tem certeza que deseja limpar TUDO? Isto inclui todo o armazenamento de análises e imagens.');
    
    if (!limpar) return;
    
    console.log('🧹 Iniciando limpeza completa...');
    
    // Limpa em memória
    this.historico = [];
    
    // Limpa localStorage
    localStorage.removeItem('historico_analises');
    localStorage.removeItem('historico');
    
    // Limpa IndexedDB (se possível)
    if (this.storageService) {
      this.storageService.limparLocalStorageCompletamente();
    }
    
    console.log('✅ Tudo limpo! Refresque a página para continuar.');
  }

  // ------- navegação / utilitários -------
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  navegarParaHistorico() {
    this.router.navigateByUrl('/history');
  }

  navegarParaAjuda() {
    this.router.navigateByUrl('/help');
  }

  exportarResultados() {
    if (!this.resultados || this.resultados.length === 0) {
      console.log('Não há resultados para exportar');
      return;
    }

    // Cabeçalhos
    const header = [
      'Folha',
      `Área (${this.unidade}²)`,
      `Perímetro (${this.unidade})`,
      `Comprimento (${this.unidade})`,
      `Largura (${this.unidade})`,
      'Relação L/C'
    ];

    // Linhas individuais
    const linhas = this.resultados.map(r => ({
      Folha: `Folha ${r.id}`,
      [`Área (${this.unidade}²)`]: r.area ?? '',
      [`Perímetro (${this.unidade})`]: r.perimetro ?? '',
      [`Comprimento (${this.unidade})`]: r.comprimento ?? '',
      [`Largura (${this.unidade})`]: r.largura ?? '',
      'Relação L/C': r.relacaoLarguraComprimento ?? ''
    }));

    // Informações de metadados (cabecalho separado)
    const metadados = [
      ['Nome da Imagem', this.nomeImagem],
      ['Espécie', this.especie],
      ['Tratamento', this.tratamento],
      ['Réplica', this.replica],
      ['Área de Escala (cm²)', this.areaEscala]
    ];

    // Estatísticas agregadas
    const agregados: any[] = [];
    if (this.medidasSelecionadas.somarAreas || this.medidasSelecionadas.mediaDesvio) {
      agregados.push([]);
      agregados.push(['---- Estatísticas Agregadas ----']);

      if (this.medidasSelecionadas.somarAreas) {
        agregados.push(['Soma Total das Áreas (' + this.unidade + '²)', this.resultadosAgregados?.totalArea ?? 0]);
      }
      if (this.medidasSelecionadas.mediaDesvio) {
        agregados.push(['Média da Área (' + this.unidade + '²)', this.resultadosAgregados?.averageArea ?? 0]);
        agregados.push(['Média da Relação L/C', this.resultadosAgregados?.averageWidthToLengthRatio ?? 0]);
        agregados.push(['Desvio Padrão (Área)', this.resultadosAgregados?.standardDeviationArea ?? 0]);
      }
    }

    // Montagem final do CSV
    const csv = Papa.unparse(linhas, {
      delimiter: ';', // ✅ aqui, e não no objeto fields/data
      quotes: true
    });

    // Inserir metadados antes do CSV e agregados depois
    const csvFinal =
      metadados.map(m => m.join(';')).join('\n') +
      '\n\n---- Resultados Individuais ----\n' +
      csv +
      (agregados.length ? '\n\n' + agregados.map(a => a.join(';')).join('\n') : '');

    const blob = new Blob([csvFinal], { type: 'text/csv;charset=utf-8' });
    const filename = `LIMA_${this.especie}_${this.tratamento}_${new Date().toISOString().split('T')[0]}.csv`;

    try {
      saveAs(blob, filename);
      console.log('CSV exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar CSV:', error);
    }
  }


  async showAlert(header: string, message: string) {
    const a = await this.alertCtrl.create({ header, message, buttons: ['OK'] });
    await a.present();
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  async confirmarLogout() {
    const a = await this.alertCtrl.create({
      header: 'Confirmar Logout',
      message: 'Tem certeza que deseja sair da sua conta?',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Sair', handler: () => { this.logout(); return true; } }
      ]
    });
    await a.present();
  }

  logout() {
    this.resetAnalise();
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
