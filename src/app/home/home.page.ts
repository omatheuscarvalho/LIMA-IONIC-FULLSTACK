import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle,
  IonCol, IonContent, IonGrid, IonTitle, IonHeader, IonIcon, IonInput, IonItem, IonLabel,
  IonNote, IonRow, IonToolbar, IonImg, IonText, IonList, IonCheckbox,
  IonSpinner, AlertController, AlertInput
} from '@ionic/angular/standalone';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import {
  camera, download, help, home, moon, sunny, time,
  trash, logOut, person, calculator, image as imageIcon
} from 'ionicons/icons';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';

import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../services/theme.service';
import { ImageAnalysisService, LeafMetric, AggregatedMetrics } from '../services/image-analysis.service';
import { ChangeDetectorRef } from '@angular/core';
/**
 * Tipagem das chaves das medidas (declarada OUTSIDE da classe)
 */
type MedidaKey =
  'area' | 'perimetro' | 'comprimento' | 'largura' |
  'somarAreas' | 'relacaoLarguraComprimento' | 'mediaDesvio';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent, FormsModule, CommonModule, IonCard,
    IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton,
    IonIcon, IonNote, IonButtons, IonGrid, IonRow, IonCol, IonImg, IonText, IonList,
    IonCheckbox, IonSpinner
  ],
})
export class HomePage {
  // --- dados do experimento ---
  especie = '';
  tratamento = '';
  replica = '';
  areaEscala = 1;

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
  aggregatedResultsVisible = false;
  private usuarioAnterior: string | null = null;

  constructor(
    private router: Router,
    private authService: AuthService,
    private alertCtrl: AlertController,
    private themeService: ThemeService,
    private imageService: ImageAnalysisService,
    @Inject(DOCUMENT) private document: Document,
    private cdr: ChangeDetectorRef,
  ) {
    // Registrar ícones (sem duplicatas)
    addIcons({ person, logOut, calculator, trash, time, help, download, camera, sunny, moon, home, image: imageIcon });

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
    this.aggregatedResultsVisible = false;
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
      this.adicionarAoHistorico();
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
    this.presentFinalConfirmationAlert([id]);
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

    const areas = this.resultados.map(r => r.area ?? 0);
    const total = areas.reduce((a, b) => a + b, 0);
    this.resultadosAgregados.totalArea = total;

    const avg = areas.length > 0 ? total / areas.length : 0;
    this.resultadosAgregados.averageArea = avg;

    const somaDifsQuad = areas.reduce((s, a) => s + Math.pow(a - avg, 2), 0);
    this.resultadosAgregados.standardDeviationArea = areas.length > 0 ? Math.sqrt(somaDifsQuad / areas.length) : 0;

    const relacoes = this.resultados.map(r => r.relacaoLarguraComprimento ?? 0);
    this.resultadosAgregados.averageWidthToLengthRatio = relacoes.length > 0 ? relacoes.reduce((s, v) => s + v, 0) / relacoes.length : 0;
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
              await this.presentFinalConfirmationAlert(selectedLeafIds);
            }
            return true;
          }
        }
      ]
    });

    await alert.present();
  }

  private async presentFinalConfirmationAlert(idsToDelete: number[]) {
    const alert = await this.alertCtrl.create({
      header: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir ${idsToDelete.length} folha(s) selecionada(s)? Esta ação não pode ser desfeita.`,
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

  private deleteSelectedLeaves(idsToDelete: number[]) {
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
      // chamada assíncrona — tenta redesenhar contornos + labels usando OpenCV (mesmo estilo)
      this.imageService.drawContoursAndLabelsOnImage(baseImg, this.resultados)
        // se falhar (ex.: contornos não persistidos), regrada com drawLabelsOnImage como fallback
        .catch(() => this.imageService.drawLabelsOnImage(baseImg, this.resultados))
        .then(base64 => {
          this.imagemProcessada = base64 || this.imagemSelecionada;
          // força re-render da view
          Promise.resolve().then(() => this.cdr.detectChanges());
          this.adicionarAoHistorico();
        })
        .catch(err => {
          // se falhar, apenas atualiza agregados e histórico
          console.warn('Falha ao regenerar imagem processada:', err);
          Promise.resolve().then(() => this.cdr.detectChanges());
          this.adicionarAoHistorico();
        });
      return; // histórico será atualizado na promise
    }

    // re-render obrigatório aqui
    Promise.resolve().then(() => this.cdr.detectChanges());

    this.adicionarAoHistorico();
  }

  // ------- histórico -------
  adicionarAoHistorico() {
    const analise = {
      id: Date.now(),
      data: new Date(),
      especie: this.especie,
      tratamento: this.tratamento,
      replica: this.replica,
      nomeImagem: this.nomeImagem,
      resultados: [...this.resultados],
      resultadosAgregados: this.resultadosAgregados ? { ...this.resultadosAgregados } : null
    };
    this.historico.unshift(analise);
    if (this.historico.length > 50) this.historico = this.historico.slice(0, 50);
    this.salvarHistorico();
  }

  salvarHistorico() {
    localStorage.setItem('historico', JSON.stringify(this.historico));
  }

  carregarHistorico() {
    const h = localStorage.getItem('historico');
    this.historico = h ? JSON.parse(h) : [];
  }

  limparHistorico() {
    this.historico = [];
    localStorage.removeItem('historico');
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
      'Área (cm²)',
      'Perímetro (cm)',
      'Comprimento (cm)',
      'Largura (cm)',
      'Relação L/C'
    ];

    // Linhas individuais
    const linhas = this.resultados.map(r => ({
      Folha: `Folha ${r.id}`,
      'Área (cm²)': r.area ?? '',
      'Perímetro (cm)': r.perimetro ?? '',
      'Comprimento (cm)': r.comprimento ?? '',
      'Largura (cm)': r.largura ?? '',
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
        agregados.push(['Soma Total das Áreas (cm²)', this.resultadosAgregados?.totalArea ?? 0]);
      }
      if (this.medidasSelecionadas.mediaDesvio) {
        agregados.push(['Média da Área (cm²)', this.resultadosAgregados?.averageArea ?? 0]);
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
