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
  IonCardHeader, 
  IonCardTitle, 
  IonCardSubtitle, 
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
  IonList,    // Adicionado
  IonItem,    // Adicionado
  IonLabel,   // Adicionado
  IonInput,   // Adicionado
  IonNote     // Adicionado
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
  closeCircle, // Adicionado
  arrowBack    // Adicionado
} from 'ionicons/icons';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';

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
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonText, 
    IonButton, 
    IonIcon, 
    IonModal, 
    IonSearchbar,
    IonGrid,
    IonRow,
    IonCol,
    IonFooter,
    IonList,    // Importado
    IonItem,    // Importado
    IonLabel,   // Importado
    IonInput,   // Importado
    IonNote     // Importado
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

  constructor(private router: Router, private alertController: AlertController) {
    addIcons({
      documentTextOutline,
      downloadOutline,
      trashOutline,
      trashBinOutline,
      close,
      createOutline,
      closeCircle,
      checkmark,
      analyticsOutline,
      leafOutline,
      download,
      trash,
      closeCircleOutline,
      checkmarkCircleOutline,
      pencil,
      time,
      arrowBack
    });
  }

  ngOnInit() {
    this.carregarHistorico();
  }

  carregarHistorico() {
    // Usando a chave correta 'historico_analises' que definimos na Home anteriormente
    // Se o seu app usa 'historico', mantenha 'historico'. 
    // Vou usar um fallback para garantir.
    const historicoSalvo = localStorage.getItem('historico_analises') || localStorage.getItem('historico');
    
    if (historicoSalvo) {
      try {
        this.historico = JSON.parse(historicoSalvo);
        // Ordenar por data (mais recente primeiro)
        this.historico.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
      } catch (e) {
        console.error('Erro ao fazer parse do histórico', e);
        this.historico = [];
      }
    }
    
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

  getThumbnail(analise: any): string | null {
    if (!analise) return null;
    // Tenta pegar a imagem processada (base64) ou a original
    return analise.imagemProcessada || analise.imagemBase64 || analise.imagem || null;
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
          handler: () => {
            this.historico = this.historico.filter(h => h.id !== analise.id);
            this.atualizarStorage();
            
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
          handler: () => {
            this.historico = [];
            this.filteredHistorico = [];
            localStorage.removeItem('historico_analises');
            localStorage.removeItem('historico'); // Limpa a chave legado também
            this.analiseDetalhada = null;
          }
        }
      ]
    });
    await alert.present();
  }

  expandirAnalise(analise: any) {
    this.analiseDetalhada = analise;
    this.editingDetalhe = false;
  }

  fecharDetalhes() {
    this.analiseDetalhada = null;
    this.editingDetalhe = false;
    this.editModel = null;
  }

  atualizarStorage() {
    // Salva na chave principal
    localStorage.setItem('historico_analises', JSON.stringify(this.historico));
    this.filtrar(); // Atualiza a visualização
  }

  exportarAnalise(analise: any) {
    if (!analise) return;

    // Preparar metadados
    const metadados = [
      ['L.I.M.A. - Relatório de Análise'],
      ['ID', analise.id || ''],
      ['Data', new Date(analise.data).toLocaleString()],
      ['Imagem', analise.nomeImagem || ''],
      ['Espécie', analise.especie || ''],
      ['Tratamento', analise.tratamento || ''],
      ['Réplica', analise.replica || ''],
      ['Área Padrão (cm²)', analise.areaEscala || analise.scalePatternArea || ''],
      [''] // Linha em branco
    ];

    // Preparar cabeçalho das colunas de dados
    const cabecalhoDados = ['Folha', 'Área (cm²)', 'Perímetro (cm)', 'Comprimento (cm)', 'Largura (cm)', 'Relação L/C'];

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
      linhasAgregadas.push(['ESTATÍSTICAS AGREGADAS']);
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

    // Converter para CSV
    const csv = Papa.unparse(dadosCompletos, { delimiter: ';' }); // Ponto e vírgula é melhor para Excel BR
    
    // Criar arquivo
    const nomeLimpo = (analise.especie || 'analise').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const dataStr = new Date().toISOString().slice(0,10);
    const nomeArquivo = `LIMA_${nomeLimpo}_${analise.id}_${dataStr}.csv`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
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
      nomeImagem: this.analiseDetalhada.nomeImagem,
      areaEscala: this.analiseDetalhada.areaEscala !== undefined ? this.analiseDetalhada.areaEscala : this.analiseDetalhada.scalePatternArea
    };
  }

  cancelEditDetalhe() {
    this.editingDetalhe = false;
    this.editModel = null;
  }

  saveEditDetalhe() {
    if (!this.analiseDetalhada || !this.editModel) return;

    // Atualiza o objeto local (referência na memória)
    this.analiseDetalhada.especie = this.editModel.especie;
    this.analiseDetalhada.tratamento = this.editModel.tratamento;
    this.analiseDetalhada.replica = this.editModel.replica;
    this.analiseDetalhada.nomeImagem = this.editModel.nomeImagem;
    
    // Atualiza a área (tratando nulos)
    if (this.editModel.areaEscala !== undefined && this.editModel.areaEscala !== null) {
      this.analiseDetalhada.areaEscala = this.editModel.areaEscala;
    }

    // Encontra o índice no array principal e atualiza
    const idx = this.historico.findIndex(h => h.id === this.analiseDetalhada.id);
    if (idx >= 0) {
      this.historico[idx] = this.analiseDetalhada;
      this.atualizarStorage();
    }

    this.editingDetalhe = false;
    this.editModel = null;
  }

  onModalDidDismiss(event?: any) {
    this.editingDetalhe = false;
    this.editModel = null;
    this.analiseDetalhada = null;
  }
}