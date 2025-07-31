import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCol, IonContent, IonGrid, IonHeader, IonIcon, IonInput, IonItem, IonLabel, IonList, IonNote, IonRow, IonText, IonTitle, IonToolbar, IonImg, IonCheckbox, AlertController } from '@ionic/angular/standalone';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { addIcons } from 'ionicons';
import { camera, download, help, home, moon, sunny, time, trash, logOut, person } from 'ionicons/icons';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { AuthService } from '../auth/auth.service';
import { ThemeService } from '../services/theme.service';


@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, FormsModule, CommonModule, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonItem, IonLabel, IonInput, IonButton, IonIcon, IonNote, IonButtons, IonGrid, IonRow, IonCol, IonList, IonText, IonImg, IonCheckbox],
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
  nomeImagem: string = '';
  hasImage: boolean = false;
  
  // Resultados das medições
  resultados: any[] = [];
  resultadosAgregados = {
    somaAreas: 0,
    mediaArea: 0,
    desvioArea: 0,
    relacaoLarguraComprimento: 0
  };

  // Controle do tema
  darkMode = false;
  
  // Histórico de análises
  historico: any[] = [];

  constructor(
    private router: Router, 
    @Inject(DOCUMENT) private document: Document,
    private authService: AuthService,
    private alertController: AlertController,
    private themeService: ThemeService
  ) {
    addIcons({ camera, trash, download, sunny, moon, home, time, help, logOut, person });
    this.carregarHistorico();
    
    // Subscrever ao estado do dark mode
    this.themeService.darkMode$.subscribe(isDark => {
      this.darkMode = isDark;
    });
  }

  /**
   * Simula a seleção de uma imagem
   */
  selecionarImagem() {
    // Em uma implementação real, isso abriria o seletor de arquivos
    // ou a câmera do dispositivo
    console.log('Selecionando imagem...');
    // Simulando uma imagem selecionada
    this.imagemSelecionada = 'assets/placeholder-image.png';
    this.nomeImagem = 'folha_exemplo.jpg';
    this.hasImage = true;
  }

  /**
   * Simula o cálculo das medidas da folha
   */
  calcular() {
    if (!this.hasImage) {
      console.log('Selecione uma imagem primeiro');
      return;
    }

    if (!this.areaEscala || this.areaEscala <= 0) {
      console.log('Informe a área do padrão de escala');
      return;
    }

    console.log('Calculando medidas...');
    console.log('Espécie:', this.especie);
    console.log('Tratamento:', this.tratamento);
    console.log('Réplica:', this.replica);
    console.log('Área do Padrão de Escala:', this.areaEscala);
    console.log('Medidas selecionadas:', this.medidasSelecionadas);

    // Simulando resultados de cálculo para uma folha
    const novoResultado = {
      id: this.resultados.length + 1,
      area: 45.7,
      perimetro: 28.3,
      comprimento: 12.5,
      largura: 5.8,
      relacaoLarguraComprimento: 5.8 / 12.5
    };
    
    // Adicionar ao array de resultados
    this.resultados.push(novoResultado);
    
    // Calcular resultados agregados
    this.calcularResultadosAgregados();
    
    // Adicionar ao histórico
    this.adicionarAoHistorico();
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
    this.nomeImagem = '';
    this.hasImage = false;
    this.resultados = [];
    this.resultadosAgregados = {
      somaAreas: 0,
      mediaArea: 0,
      desvioArea: 0,
      relacaoLarguraComprimento: 0
    };
    console.log('Dados limpos');
  }

  /**
   * Calcula os resultados agregados com base nos resultados individuais
   */
  calcularResultadosAgregados() {
    if (this.resultados.length === 0) return;
    
    // Calcular soma das áreas
    const areas = this.resultados.map(r => r.area);
    this.resultadosAgregados.somaAreas = areas.reduce((sum, area) => sum + area, 0);
    
    // Calcular média e desvio padrão
    this.resultadosAgregados.mediaArea = this.resultadosAgregados.somaAreas / areas.length;
    
    // Calcular desvio padrão
    const somaDiferencasQuadradas = areas.reduce((sum, area) => {
      const diferenca = area - this.resultadosAgregados.mediaArea;
      return sum + (diferenca * diferenca);
    }, 0);
    
    this.resultadosAgregados.desvioArea = Math.sqrt(somaDiferencasQuadradas / areas.length);
    
    // Calcular média da relação largura/comprimento
    const relacoes = this.resultados.map(r => r.largura / r.comprimento);
    this.resultadosAgregados.relacaoLarguraComprimento = 
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
      resultadosAgregados: {...this.resultadosAgregados}
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
        'Soma', this.resultadosAgregados.somaAreas, '', '', '', ''
      ]);
    }
    
    if (this.medidasSelecionadas.mediaDesvio) {
      linhas.push([
        this.nomeImagem, this.especie, this.tratamento, this.replica, this.areaEscala,
        'Média', this.resultadosAgregados.mediaArea, '', '', '', this.resultadosAgregados.relacaoLarguraComprimento
      ]);
      
      linhas.push([
        this.nomeImagem, this.especie, this.tratamento, this.replica, this.areaEscala,
        'Desvio Padrão', this.resultadosAgregados.desvioArea, '', '', '', ''
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
