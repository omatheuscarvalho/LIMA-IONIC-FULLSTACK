import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonNote, IonRow, IonTitle, IonToolbar, AlertController, IonImg, IonText, IonList, IonCheckbox, IonSpinner } from '@ionic/angular/standalone';
import { DOCUMENT, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { addIcons } from 'ionicons';
import { camera, download, help, home, moon, sunny, time, trash, logOut, person, calculator, image as imageIcon } from 'ionicons/icons';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../services/theme.service';
import { ImageAnalysisService, LeafMetric, AggregatedMetrics } from '../services/image-analysis.service';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, FormsModule, CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonNote, IonButtons, IonGrid, IonRow, IonCol, IonImg, IonText, IonList, IonCheckbox, IonSpinner],
})
export class HomePage {
  // Variáveis para armazenar os dados do formulário
  especie: string = '';
  tratamento: string = '';
  replica: string = '';
  areaEscala: number = 1;
  
  // Variáveis para as medidas selecionadas
  medidasSelecionadas = {
    area: true,
    perimetro: true,
    comprimento: true,
    largura: true,
    somarAreas: false,
    relacaoLarguraComprimento: false,
    mediaDesvio: false
  };
  
  // Variável para controlar se uma imagem foi selecionada
  imagemSelecionada: string | null = null;
  imagemProcessada: string | null = null; // Imagem com contornos detectados
  nomeImagem: string = '';
  hasImage: boolean = false;
  selectedImageFile: File | null = null;
  
  // Resultados das medições
  resultados: LeafMetric[] = [];
  resultadosAgregados: AggregatedMetrics = {};

  // Controle do tema
  darkMode = false;
  
  // Histórico de análises
  historico: any[] = [];

  // UI State
  isAnalyzing = false;

  // Set to store the IDs of leaves whose details are visible
  visibleLeafDetails = new Set<number>();

  // Controls visibility of the aggregated results section
  aggregatedResultsVisible = false;

  constructor(
    private router: Router, 
    @Inject(DOCUMENT) private document: Document,
    private authService: AuthService,
    private alertController: AlertController,
    private themeService: ThemeService,
    private imageAnalysisService: ImageAnalysisService // Injetar o serviço de análise de imagem
  ) {
    addIcons({ camera, trash, download, sunny, moon, home, time, help, logOut, person, calculator, image: imageIcon });
    this.carregarHistorico();
    
    // Subscrever ao estado do dark mode
    this.themeService.darkMode$.subscribe(isDark => {
      this.darkMode = isDark;
    });
  }

  /**
   * Abre o seletor de arquivos para escolher uma imagem
   */
  selecionarImagem() {
    // Limpa os resultados e a imagem da análise anterior
    this.limpar();

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (event: any) => {
      const file = event.target.files[0];
      if (file) {
        this.selectedImageFile = file;
        this.nomeImagem = file.name;
        this.hasImage = true;
        
        // Criar URL para preview da imagem
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagemSelecionada = e.target.result;
        };
        reader.readAsDataURL(file);
        
        console.log('Imagem selecionada:', file.name);
      }
    };
    input.click();
  }

  /**
   * Converte um arquivo de imagem para uma string base64.
   */
  private convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // O resultado é "data:image/jpeg;base64,LzlqLzRBQ...".
        // O script Python espera apenas a parte depois da vírgula.
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Analisa a imagem selecionada e calcula as medidas das folhas
   */
  async calcular() {
    if (!this.hasImage || !this.selectedImageFile) {
      this.presentErrorAlert('Atenção', 'Por favor, selecione uma imagem primeiro.');
      return;
    }

    if (!this.areaEscala || this.areaEscala <= 0) {
      this.presentErrorAlert('Atenção', 'Por favor, informe um valor válido para a área do padrão de escala (maior que zero).');
      return;
    }

    this.isAnalyzing = true;
    this.imagemProcessada = null;
    this.resultados = [];
    this.resultadosAgregados = {};

    console.log('Iniciando análise da imagem...');

    try {
      // MODIFICAÇÃO: Usar a string base64 (imagemSelecionada) que já foi carregada,
      // em vez de tentar reler o 'selectedImageFile', o que falha no Android.
      const imgElement = await this.createImageElementFromBase64(this.imagemSelecionada!);
      const result = await this.imageAnalysisService.processImageDirect(imgElement, this.areaEscala); // O serviço já espera um HTMLImageElement

      if (result.error) {
        this.presentErrorAlert('Analysis Error', result.error);
        return;
      }

      this.resultados = result.leaves;
      this.resultadosAgregados = result.aggregatedMetrics;
      this.imagemProcessada = result.processedImage;

      console.log(`Analysis complete: ${result.numberOfLeaves} leaves detected.`);
      this.adicionarAoHistorico();

    } catch (error: any) {
      console.error('Error during analysis calculation:', error);
      this.presentErrorAlert('Error', error.message || 'An unknown error occurred during analysis.');
    } finally {
      this.isAnalyzing = false;
    }
  }

  /**
   * Exibe um alerta de erro para o usuário.
   */
  async presentErrorAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }

  /**
   * Limpa todos os dados e resultados
   */
  limpar() {
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
    this.resultadosAgregados = {};
    this.isAnalyzing = false;
    this.visibleLeafDetails.clear();
    this.aggregatedResultsVisible = false;
    console.log('Dados limpos');
  }

  /**
   * Cria um HTMLImageElement a partir de uma string de imagem base64 (Data URL).
   * Este método é mais robusto para ambientes móveis (Android/iOS).
   * @param base64String A string da imagem no formato Data URL.
   */
  private createImageElementFromBase64(base64String: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve(img);
      };
      img.onerror = (err) => reject(new Error('Falha ao carregar a imagem a partir do base64.'));
      img.src = base64String;
    });
  }

  /**
   * Toggles the visibility of a leaf's details.
   * @param leafId The ID of the leaf.
   */
  toggleLeafDetails(leafId: number) {
    if (this.visibleLeafDetails.has(leafId)) {
      this.visibleLeafDetails.delete(leafId);
    } else {
      this.visibleLeafDetails.add(leafId);
    }
  }

  /**
   * Toggles the visibility of the aggregated results section.
   */
  toggleAggregatedResults() {
    this.aggregatedResultsVisible = !this.aggregatedResultsVisible;
  }

  async presentDeleteSelectionAlert() {
    // Cria as opções do checkbox a partir dos resultados atuais
    const alertInputs = this.resultados.map(leaf => ({
      name: `leaf-${leaf.id}`,
      type: 'checkbox' as const, // O tipo precisa ser 'checkbox'
      label: `Folha ${leaf.id}`,
      value: leaf.id,
      checked: false
    }));

    const alert = await this.alertController.create({
      header: 'Excluir Folhas',
      cssClass: 'delete-selection-alert', // Classe CSS para estilização
      message: 'Selecione as folhas que deseja remover da análise.',
      inputs: alertInputs,
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel',
          cssClass: 'alert-button-cancel',
        },
        {
          text: 'Excluir',
          cssClass: 'alert-button-confirm',
          handler: (selectedLeafIds: number[]) => {
            if (selectedLeafIds && selectedLeafIds.length > 0) {
              // Em vez de excluir diretamente, chama o alerta de confirmação final
              this.presentFinalConfirmationAlert(selectedLeafIds);
            }
          }
        },
      ]
    });

    await alert.present();
  }

  private async presentFinalConfirmationAlert(idsToDelete: number[]) {
    const alert = await this.alertController.create({
      header: 'Confirmar Exclusão',
      message: `Tem certeza que deseja excluir ${idsToDelete.length} folha(s) selecionada(s)? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Confirmar',
          cssClass: 'alert-button-danger',
          handler: () => this.deleteSelectedLeaves(idsToDelete),
        },
      ],
    });
    await alert.present();
  }

  private deleteSelectedLeaves(idsToDelete: number[]) {
    // Filtra o array de resultados, mantendo apenas as folhas não selecionadas
    this.resultados = this.resultados.filter(leaf => !idsToDelete.includes(leaf.id));

    // Recalcula os resultados agregados com base nos dados restantes
    this.calcularResultadosAgregados();

    // Atualiza o histórico com a análise corrigida
    this.adicionarAoHistorico();
    console.log(`${idsToDelete.length} folha(s) foram excluídas.`);
  }
  /**
   * Calcula os resultados agregados com base nos resultados individuais
   */
  calcularResultadosAgregados() {
    if (this.resultados.length === 0) return;
    
    // Calcular soma das áreas
    const areas = this.resultados.map(r => r.area);
    this.resultadosAgregados.totalArea = areas.reduce((sum, area) => sum + area, 0);
    
    // Calcular média e desvio padrão
    this.resultadosAgregados.averageArea = (this.resultadosAgregados.totalArea ?? 0) / areas.length;
    
    // Calcular desvio padrão
    const somaDiferencasQuadradas = areas.reduce((sum, area) => {
      const diferenca = area - (this.resultadosAgregados.averageArea ?? 0);
      return sum + (diferenca * diferenca);
    }, 0);
    
    this.resultadosAgregados.standardDeviationArea = Math.sqrt(somaDiferencasQuadradas / areas.length);
    
    // Calcular média da relação largura/comprimento
    const relacoes = this.resultados.map(r => r.relacaoLarguraComprimento);
    this.resultadosAgregados.averageWidthToLengthRatio = 
      relacoes.reduce((sum, rel) => sum + rel, 0) / relacoes.length;
  }
  
  adicionarAoHistorico() {
    // Criar objeto de análise com os dados atuais
    const analise = {
      id: Date.now(),
      data: new Date(),
      especie: this.especie,
      tratamento: this.tratamento,
      replica: this.replica,
      nomeImagem: this.nomeImagem,
      resultados: [...this.resultados],
      resultadosAgregados: { ...this.resultadosAgregados }
    };
    this.historico.unshift(analise);
    if (this.historico.length > 50) {
      this.historico = this.historico.slice(0, 50);
    }
    this.salvarHistorico();
  }

  salvarHistorico() {
    localStorage.setItem('historico', JSON.stringify(this.historico));
  }

  carregarHistorico() {
    const historicoSalvo = localStorage.getItem('historico');
    if (historicoSalvo) {
      this.historico = JSON.parse(historicoSalvo);
    }
  }

  limparHistorico() {
    this.historico = [];
    localStorage.removeItem('historico');
  }
  
  navegarParaHistorico() {
    this.router.navigateByUrl('/history');
  }
  
  navegarParaAjuda() {
    this.router.navigateByUrl('/help');
  }
  
  /**
   * Simula a exportação dos resultados
   */
  exportarResultados() {
    if (this.resultados.length === 0) {
      console.log('Não há resultados para exportar');
      return;
    }
    
    console.log('Exportando resultados...');
    
    // Criar cabeçalho do CSV
    const cabecalho = [
      'Nome da Imagem', 'Espécie', 'Tratamento', 'Réplica', 'Área do Padrão de Escala (cm²)',
      'Folha', 'Área (cm²)', 'Perímetro (cm)', 'Comprimento (cm)', 'Largura (cm)', 'Relação L/C'
    ];
    
    // Criar linhas de dados
    const linhas = this.resultados.map(r => [
      this.nomeImagem, this.especie, this.tratamento, this.replica, this.areaEscala,
      `Folha ${r.id}`, r.area, r.perimetro, r.comprimento, r.largura, r.relacaoLarguraComprimento
    ]);
    
    // Adicionar resultados agregados se necessário
    if (this.medidasSelecionadas.somarAreas) {
      linhas.push([
        this.nomeImagem, this.especie, this.tratamento, this.replica, this.areaEscala,
        'Soma', this.resultadosAgregados.totalArea ?? 0, '', '', '', ''
      ]);
    }
    
    if (this.medidasSelecionadas.mediaDesvio) {
      linhas.push([
        this.nomeImagem, this.especie, this.tratamento, this.replica, this.areaEscala,
        'Média', this.resultadosAgregados.averageArea ?? 0, '', '', '', this.resultadosAgregados.averageWidthToLengthRatio ?? 0
      ]);
      
      linhas.push([
        this.nomeImagem, this.especie, this.tratamento, this.replica, this.areaEscala,
        'Desvio Padrão', this.resultadosAgregados.standardDeviationArea ?? 0, '', '', '', ''
      ]);
    }
    
    // Converter para CSV
    const csv = Papa.unparse({
      fields: cabecalho,
      data: linhas
    });
    
    // Criar blob e fazer download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const filename = `LIMA_${this.especie}_${this.tratamento}_${new Date().toISOString().split('T')[0]}.csv`;
    
    try {
      saveAs(blob, filename);
      console.log('Arquivo CSV exportado com sucesso');
    } catch (error) {
      console.error('Erro ao exportar arquivo CSV:', error);
    }
  }

  /**
   * Inicializa o tema baseado nas preferências do usuário
   * Este método não é mais necessário pois a lógica foi movida para o construtor
   */

  /**
   * Alterna entre os temas claro e escuro
   */
  toggleTheme() {
    this.themeService.toggleTheme();
  }

  /**
   * Obtém o usuário atual
   */
  getCurrentUser() {
    return this.authService.getCurrentUser();
  }

  /**
   * Confirma e realiza logout
   */
  async confirmarLogout() {
    const alert = await this.alertController.create({
      header: 'Confirmar Logout',
      message: 'Tem certeza que deseja sair da sua conta?',
      buttons: [
        {
          text: 'Cancelar',
          role: 'cancel'
        },
        {
          text: 'Sair',
          handler: () => {
            this.logout();
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Realiza logout
   */
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  /**
   * Abre a página de histórico
   */
  openHistory() {
    this.router.navigate(['/history']);
  }

  /**
   * Abre a página de ajuda
   */
  openHelp() {
    this.router.navigate(['/help']);
  }
}
