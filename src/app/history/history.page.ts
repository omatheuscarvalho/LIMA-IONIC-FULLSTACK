import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonCardSubtitle, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonModal, IonText, IonTitle, IonToolbar, IonSearchbar, IonInput, IonGrid, IonRow, IonCol, IonFooter } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, download, trash, time, pencil, checkmark, createOutline, closeCircleOutline, checkmarkCircleOutline, trashOutline, downloadOutline } from 'ionicons/icons';
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
    IonCardHeader, 
    IonCardTitle, 
    IonCardSubtitle,
    IonCardContent, 
    IonItem, 
    IonLabel, 
    IonText, 
    IonButton, 
    IonIcon, 
    IonModal, 
    IonSearchbar,
    IonInput,
    IonGrid,
    IonRow,
    IonCol,
    IonFooter
  ]
})
export class HistoryPage implements OnInit {
  historico: any[] = [];
  analiseDetalhada: any = null;
  searchTerm: string = '';
  // edição do modal
  editingDetalhe: boolean = false;
  editModel: any = null;

  constructor(private router: Router, private alertController: AlertController) {
    addIcons({download,trash,close,createOutline,closeCircleOutline,checkmarkCircleOutline,trashOutline,downloadOutline,pencil,checkmark,time});
  }

  ngOnInit() {
    this.carregarHistorico();
  }

  carregarHistorico() {
    const historicoSalvo = localStorage.getItem('historico');
    if (historicoSalvo) {
      this.historico = JSON.parse(historicoSalvo);
    }
  }

  get filteredHistorico() {
    if (!this.searchTerm || this.searchTerm.trim() === '') return this.historico;
    const term = this.searchTerm.toLowerCase();
    return this.historico.filter(h => {
      return (h.especie && h.especie.toLowerCase().includes(term)) ||
             (h.tratamento && h.tratamento.toLowerCase().includes(term)) ||
             (h.nomeImagem && h.nomeImagem.toLowerCase().includes(term));
    });
  }

  trackByHistorico(index: number, item: any) {
    return item?.id ?? item?.nomeImagem ?? index;
  }

  getThumbnail(analise: any): string | null {
    if (!analise) return null;
    // possíveis campos que podem armazenar a imagem processada
    return analise.thumbnail || analise.imagemProcessada || analise.imagem || null;
  }

  async onDeleteAnalise(analise: any) {
    const alert = await this.alertController.create({
      header: 'Confirmar exclusão',
      message: `Deseja excluir esta análise (${analise.nomeImagem || analise.especie || ''})? Esta ação não pode ser desfeita.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Excluir', cssClass: 'danger', handler: () => {
            this.historico = this.historico.filter(h => h !== analise);
            localStorage.setItem('historico', JSON.stringify(this.historico));
            if (this.analiseDetalhada === analise) this.analiseDetalhada = null;
          }
        }
      ]
    });
    await alert.present();
  }

  async limparHistorico() {
    if (!this.historico || this.historico.length === 0) return;
    const alert = await this.alertController.create({
      header: 'Limpar histórico',
      message: 'Deseja realmente limpar todo o histórico? Esta ação não pode ser desfeita.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Confirmar', cssClass: 'danger', handler: () => {
            localStorage.removeItem('historico');
            this.historico = [];
            this.analiseDetalhada = null;
          }
        }
      ]
    });
    await alert.present();
  }

  expandirAnalise(analise: any) {
    this.analiseDetalhada = analise;
  }

  fecharDetalhes() {
    this.analiseDetalhada = null;
  }

  exportarAnalise(analise: any) {
    // Preparar cabeçalho com metadados
    const metadados = [
      ['Nome da Imagem', analise.nomeImagem || ''],
      ['Espécie', analise.especie || ''],
      ['Tratamento', analise.tratamento || ''],
      ['Réplica', analise.replica || ''],
      ['Área do Padrão de Escala (cm²)', analise.areaEscala || ''],
      ['Data da Análise', new Date(analise.data).toLocaleString()],
      [''] // Linha em branco para separar metadados dos dados
    ];

    // Preparar cabeçalho das colunas de dados
    const cabecalhoDados = ['Folha'];
    if (analise.resultados[0].area !== undefined) cabecalhoDados.push('Área (cm²)');
    if (analise.resultados[0].perimetro !== undefined) cabecalhoDados.push('Perímetro (cm)');
    if (analise.resultados[0].comprimento !== undefined) cabecalhoDados.push('Comprimento (cm)');
    if (analise.resultados[0].largura !== undefined) cabecalhoDados.push('Largura (cm)');
    if (analise.resultados[0].relacaoLarguraComprimento !== undefined) cabecalhoDados.push('Relação L/C');

    // Preparar linhas de dados
    const linhasDados = analise.resultados.map((resultado: any) => {
      const linha = [`Folha ${resultado.id}`];
      if (resultado.area !== undefined) linha.push(resultado.area);
      if (resultado.perimetro !== undefined) linha.push(resultado.perimetro);
      if (resultado.comprimento !== undefined) linha.push(resultado.comprimento);
      if (resultado.largura !== undefined) linha.push(resultado.largura);
      if (resultado.relacaoLarguraComprimento !== undefined) linha.push(resultado.relacaoLarguraComprimento);
      return linha;
    });

    // Adicionar linha em branco e resultados agregados se existirem
    const linhasAgregadas = [];
    if (analise.resultadosAgregados) {
      linhasAgregadas.push(['']); // Linha em branco
      linhasAgregadas.push(['Resultados Agregados']);
      
      if (analise.resultadosAgregados.somaAreas !== undefined) {
        linhasAgregadas.push(['Soma das Áreas (cm²)', analise.resultadosAgregados.somaAreas]);
      }
      
      if (analise.resultadosAgregados.mediaArea !== undefined) {
        linhasAgregadas.push(['Média da Área (cm²)', analise.resultadosAgregados.mediaArea]);
      }
      
      if (analise.resultadosAgregados.desvioArea !== undefined) {
        linhasAgregadas.push(['Desvio Padrão da Área (cm²)', analise.resultadosAgregados.desvioArea]);
      }
      
      if (analise.resultadosAgregados.relacaoLarguraComprimento !== undefined) {
        linhasAgregadas.push(['Média da Relação L/C', analise.resultadosAgregados.relacaoLarguraComprimento]);
      }
    }

    // Combinar todos os dados
    const dadosCompletos = [
      ...metadados,
      cabecalhoDados,
      ...linhasDados,
      ...linhasAgregadas
    ];

    // Converter para CSV
    const csv = Papa.unparse(dadosCompletos);
    
    // Criar nome do arquivo
    const dataFormatada = new Date().toISOString().split('T')[0];
    const nomeArquivo = `LIMA_${analise.especie || 'analise'}_${dataFormatada}.csv`;
    
    // Criar blob e fazer download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, nomeArquivo);
  }

  // --- edição ---
  toggleEditDetalhe() {
    if (!this.analiseDetalhada) return;
    this.editingDetalhe = true;
    // cópia rasa suficiente para editar campos de metadados
    this.editModel = {
      especie: this.analiseDetalhada.especie,
      tratamento: this.analiseDetalhada.tratamento,
      replica: this.analiseDetalhada.replica,
      nomeImagem: this.analiseDetalhada.nomeImagem,
      areaEscala: this.analiseDetalhada.areaEscala
    };
  }

  cancelEditDetalhe() {
    this.editingDetalhe = false;
    this.editModel = null;
  }

  saveEditDetalhe() {
    if (!this.analiseDetalhada || !this.editModel) return;
    // aplicar placeholders se necessário
    this.analiseDetalhada.especie = (this.editModel.especie && this.editModel.especie.trim() !== '') ? this.editModel.especie : 'Não informada';
    this.analiseDetalhada.tratamento = (this.editModel.tratamento && this.editModel.tratamento.trim() !== '') ? this.editModel.tratamento : 'Não informado';
    this.analiseDetalhada.replica = (this.editModel.replica && this.editModel.replica.trim() !== '') ? this.editModel.replica : 'Não informada';
    this.analiseDetalhada.nomeImagem = this.editModel.nomeImagem || this.analiseDetalhada.nomeImagem;
    this.analiseDetalhada.areaEscala = this.editModel.areaEscala ?? this.analiseDetalhada.areaEscala;

    // atualizar o array historico e persistir
    const idx = this.historico.findIndex(h => h.id === this.analiseDetalhada.id);
    if (idx >= 0) {
      this.historico[idx] = { ...this.historico[idx], ...this.analiseDetalhada };
      localStorage.setItem('historico', JSON.stringify(this.historico));
    }

    this.editingDetalhe = false;
    this.editModel = null;
  }

  // Garantir que, quando o modal for fechado por backdrop ou botão físico,
  // o estado local seja limpo e não deixe a UI travada com overlay invisível.
  onModalDidDismiss(event?: any) {
    // limpar flags de edição e modelo temporário
    if (this.editingDetalhe) {
      this.editingDetalhe = false;
      this.editModel = null;
    }

    // limpar detalhe aberto
    this.analiseDetalhada = null;
  }
}
