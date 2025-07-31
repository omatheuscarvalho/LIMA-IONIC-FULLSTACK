import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonBackButton, IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonContent, IonHeader, IonIcon, IonItem, IonItemDivider, IonLabel, IonList, IonModal, IonNote, IonText, IonTitle, IonToolbar } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { close, download, trash } from 'ionicons/icons';
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
    IonCardContent, 
    IonList, 
    IonItem, 
    IonLabel, 
    IonText, 
    IonButton, 
    IonIcon, 
    IonModal, 
    IonNote,
    IonItemDivider
  ]
})
export class HistoryPage implements OnInit {
  historico: any[] = [];
  analiseDetalhada: any = null;

  constructor(private router: Router) {
    addIcons({ trash, close, download });
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

  limparHistorico() {
    localStorage.removeItem('historico');
    this.historico = [];
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
}
