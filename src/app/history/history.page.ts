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
  image as imageIcon, checkmarkOutline } from 'ionicons/icons';
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

  constructor(private router: Router, private alertController: AlertController) {
    addIcons({downloadOutline,trashOutline,trashBinOutline,close,createOutline,imageOutline,listOutline,closeOutline,checkmarkOutline,analyticsOutline,camera,image:imageIcon,documentTextOutline,closeCircle,checkmark,leafOutline,download,trash,closeCircleOutline,checkmarkCircleOutline,pencil,time,arrowBack,expand,contract});
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
        
        // Tenta recuperar as imagens do cache
        try {
          const imagensCache = sessionStorage.getItem('historico_imagens');
          if (imagensCache) {
            const imagens = JSON.parse(imagensCache);
            this.historico.forEach((analise: any) => {
              // Se a análise não tem imagem, tenta restaurar do cache
              if ((!analise.imagemProcessada && !analise.imagemBase64 && !analise.imagem) && imagens[analise.id]) {
                analise.imagemProcessada = imagens[analise.id];
              }
            });
          }
        } catch {
          // Ignora erros ao recuperar imagens do cache
        }
        
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

  trackByLeaf(index: number, item: any) {
    return item?.id ?? item?.uid ?? index;
  }

  getThumbnail(analise: any): string | null {
    if (!analise) return null;

    // Primeiro tenta pegar do objeto (cache em memória)
    if (analise.imagemProcessada) return analise.imagemProcessada;
    if (analise.imagemBase64) return analise.imagemBase64;
    if (analise.imagem) return analise.imagem;

    // Se existir referência para a chave de imagem, tenta recuperar do localStorage/sessionStorage
    if (analise.imagemKey) {
      try {
        const imgLocal = localStorage.getItem(analise.imagemKey);
        if (imgLocal) {
          analise.imagemProcessada = imgLocal;
          return imgLocal;
        }
      } catch (e) {
        // Ignora erros de localStorage
      }

      try {
        const imgSession = sessionStorage.getItem(analise.imagemKey);
        if (imgSession) {
          analise.imagemProcessada = imgSession;
          return imgSession;
        }
      } catch (e) {
        // Ignora erros de sessionStorage
      }
    }

    // Fallback: tenta pegar por id (compatibilidade com versões antigas)
    try {
      const imgFallback = localStorage.getItem(`img_${analise.id}`) || sessionStorage.getItem(`img_${analise.id}`);
      if (imgFallback) {
        analise.imagemProcessada = imgFallback;
        // também grava referencia para futuras leituras
        analise.imagemKey = `img_${analise.id}`;
        return imgFallback;
      }
    } catch (e) {
      // ignora
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

  atualizarStorage() {
    try {
      // Sanitiza os dados antes de salvar (mantém imagens para exibir miniaturas)
      const dadosLimpos = this.historico.map(analise => {
        try {
          // Cria uma cópia com os dados essenciais, incluindo a imagem
          const copia: any = {
            id: analise.id,
            data: analise.data,
            especie: analise.especie,
            tratamento: analise.tratamento,
            replica: analise.replica,
            nomeImagem: analise.nomeImagem,
            areaEscala: analise.areaEscala,
            resultados: analise.resultados,
            resultadosAgregados: analise.resultadosAgregados,
            imagemProcessada: analise.imagemProcessada // Mantém a imagem para as miniaturas
          };
          
          // Salva a imagem em sessionStorage também para backup
          if (analise.imagemProcessada) {
            try {
              sessionStorage.setItem(`img_${analise.id}`, analise.imagemProcessada);
            } catch {
              // SessionStorage cheio, ignora
            }
          }
          
          return copia;
        } catch {
          return analise;
        }
      });
      
      // Salva na chave principal (com imagens)
      const dadosStr = JSON.stringify(dadosLimpos);
      
      // Se ainda estiver muito grande, remove as análises mais antigas
      if (dadosStr.length > 5000000) { // ~5MB (aumentado para acomodar imagens)
        const dadosMenores = dadosLimpos.slice(0, 10);
        localStorage.setItem('historico_analises', JSON.stringify(dadosMenores));
      } else {
        localStorage.setItem('historico_analises', dadosStr);
      }
      
      this.filtrar(); // Atualiza a visualização
    } catch (err: any) {
      console.error('Erro ao salvar histórico no localStorage:', err?.message || err);
      
      // Estratégia de emergência: remove as análises mais antigas
      try {
        const dadosMenores = this.historico.slice(0, 5).map(a => ({
          id: a.id,
          data: a.data,
          especie: a.especie,
          tratamento: a.tratamento,
          replica: a.replica,
          nomeImagem: a.nomeImagem,
          areaEscala: a.areaEscala,
          resultados: a.resultados,
          resultadosAgregados: a.resultadosAgregados,
          imagemProcessada: a.imagemProcessada // Mantém a imagem mesmo na emergência
        }));
        localStorage.setItem('historico_analises', JSON.stringify(dadosMenores));
      } catch (e2) {
        console.error('Erro crítico ao salvar histórico');
        // Último recurso: limpa tudo
        localStorage.removeItem('historico_analises');
      }
    }
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