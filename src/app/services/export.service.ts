import { Injectable } from '@angular/core';
import * as Papa from 'papaparse';
import { saveAs } from 'file-saver';
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import * as html2pdfPlugin from 'html2pdf.js';
import { AggregatedMetrics, LeafMetric } from './image-analysis.service';

@Injectable({
    providedIn: 'root'
})
export class ExportService {

    constructor() { }

    // =========================================================================
    // EXPORTAÇÃO EM CSV
    // =========================================================================
    async exportarCSV(
        analise: any,
        medidasSelecionadas: any,
        unidadeCalculada: string,
        resultados: LeafMetric[],
        resultadosAgregados: AggregatedMetrics | null
    ) {
        if (!resultados || resultados.length === 0) {
            throw new Error('Não há resultados para exportar.');
        }

        const formatarNumero = (valor: unknown, casas = 3): string => {
            if (valor === null || valor === undefined || valor === '') return '';
            let numero: number;
            if (typeof valor === 'number') {
                numero = valor;
            } else {
                const bruto = String(valor).trim();
                if (!bruto) return '';
                let normalizado = bruto.replace(/\s+/g, '');
                if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(normalizado)) {
                    normalizado = normalizado.replace(/\./g, '').replace(',', '.');
                } else if (/^-?\d{1,3}(,\d{3})+\.\d+$/.test(normalizado)) {
                    normalizado = normalizado.replace(/,/g, '');
                } else if (/^-?\d+,\d+$/.test(normalizado)) {
                    normalizado = normalizado.replace(',', '.');
                }
                numero = Number(normalizado);
            }
            if (!Number.isFinite(numero)) return '';
            const [inteiro, decimal] = numero.toFixed(casas).split('.');
            return decimal ? `${inteiro},${decimal}` : inteiro;
        };

        const linhasExportacao: (string | number)[][] = [];

        linhasExportacao.push(['Nome da Imagem:', analise.nomeImagem || '']);
        linhasExportacao.push(['Espécie:', analise.especie || '']);
        linhasExportacao.push(['Tratamento:', analise.tratamento || '']);
        linhasExportacao.push(['Réplica:', analise.replica || '']);
        linhasExportacao.push(['Área de Escala:', formatarNumero(analise.areaEscala, 4)]);
        linhasExportacao.push(['Número de folhas:', resultados.length]);
        linhasExportacao.push([]);

        const cabecalhosResultados: string[] = ['Número da folha'];
        if (medidasSelecionadas.largura) cabecalhosResultados.push(`Largura (${unidadeCalculada})`);
        if (medidasSelecionadas.comprimento) cabecalhosResultados.push(`Comprimento (${unidadeCalculada})`);
        if (medidasSelecionadas.relacaoLarguraComprimento) cabecalhosResultados.push('Relação L/C');
        if (medidasSelecionadas.area) cabecalhosResultados.push(`Área (${unidadeCalculada}²)`);
        if (medidasSelecionadas.perimetro) cabecalhosResultados.push(`Perímetro (${unidadeCalculada})`);

        linhasExportacao.push(cabecalhosResultados);
        linhasExportacao.push([]);

        resultados.forEach((r, index) => {
            const linha: (string | number)[] = [index + 1];
            if (medidasSelecionadas.largura) linha.push(formatarNumero(r.largura));
            if (medidasSelecionadas.comprimento) linha.push(formatarNumero(r.comprimento));
            if (medidasSelecionadas.relacaoLarguraComprimento) linha.push(formatarNumero(r.relacaoLarguraComprimento));
            if (medidasSelecionadas.area) linha.push(formatarNumero(r.area));
            if (medidasSelecionadas.perimetro) linha.push(formatarNumero(r.perimetro));
            linhasExportacao.push(linha);
        });

        linhasExportacao.push([]);

        if (medidasSelecionadas.somarAreas || medidasSelecionadas.mediaDesvio) {
            linhasExportacao.push([]);
            const header = cabecalhosResultados;
            const findCol = (needle: string) => header.findIndex(h => (h || '').toString().toLowerCase().includes(needle));

            const idxLargura = findCol('largura');
            const idxComprimento = findCol('comprimento');
            const idxRelacao = findCol('relação') >= 0 ? findCol('relação') : findCol('l/c');
            const idxArea = findCol('área');
            const idxPerimetro = findCol('perímetro');

            const totalArea = resultadosAgregados?.totalArea ?? (resultadosAgregados as any)?.somaAreas ?? 0;
            const avgWidth = resultadosAgregados?.averageWidth ?? (resultadosAgregados as any)?.mediaLargura ?? '';
            const avgLength = resultadosAgregados?.averageLength ?? (resultadosAgregados as any)?.mediaComprimento ?? '';
            const avgRelation = resultadosAgregados?.averageWidthToLengthRatio ?? (resultadosAgregados as any)?.mediaRelacao ?? '';
            const avgArea = resultadosAgregados?.averageArea ?? (resultadosAgregados as any)?.mediaArea ?? '';
            const avgPerimeter = resultadosAgregados?.averagePerimeter ?? (resultadosAgregados as any)?.mediaPerimetro ?? '';

            const sdWidth = resultadosAgregados?.standardDeviationWidth ?? (resultadosAgregados as any)?.desvioLargura ?? '';
            const sdLength = resultadosAgregados?.standardDeviationLength ?? (resultadosAgregados as any)?.desvioComprimento ?? '';
            const sdArea = resultadosAgregados?.standardDeviationArea ?? (resultadosAgregados as any)?.desvioArea ?? '';
            const sdPerimeter = resultadosAgregados?.standardDeviationPerimeter ?? (resultadosAgregados as any)?.desvioPerimetro ?? '';

            const somaRow: (string | number)[] = new Array(header.length).fill('');
            somaRow[0] = 'Soma';
            if (idxArea >= 0) somaRow[idxArea] = formatarNumero(totalArea);
            linhasExportacao.push(somaRow);

            const mediaRow: (string | number)[] = new Array(header.length).fill('');
            mediaRow[0] = 'Média';
            if (idxLargura >= 0) mediaRow[idxLargura] = formatarNumero(avgWidth);
            if (idxComprimento >= 0) mediaRow[idxComprimento] = formatarNumero(avgLength);
            if (idxRelacao >= 0) mediaRow[idxRelacao] = formatarNumero(avgRelation);
            if (idxArea >= 0) mediaRow[idxArea] = formatarNumero(avgArea);
            if (idxPerimetro >= 0) mediaRow[idxPerimetro] = formatarNumero(avgPerimeter);
            linhasExportacao.push(mediaRow);

            const desvioRow: (string | number)[] = new Array(header.length).fill('');
            desvioRow[0] = 'Desvio Padrão';
            if (idxLargura >= 0) desvioRow[idxLargura] = formatarNumero(sdWidth);
            if (idxComprimento >= 0) desvioRow[idxComprimento] = formatarNumero(sdLength);
            if (idxArea >= 0) desvioRow[idxArea] = formatarNumero(sdArea);
            if (idxPerimetro >= 0) desvioRow[idxPerimetro] = formatarNumero(sdPerimeter);
            linhasExportacao.push(desvioRow);
        }

        const csvFinal = Papa.unparse(linhasExportacao, {
            delimiter: ';',
            quotes: false,
            newline: '\r\n'
        });

        const dataArquivo = new Date().toISOString().split('T')[0];
        const especieLimpa = (analise.especie || 'analise').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const tratamentoLimpo = (analise.tratamento || 'sem_tratamento').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `LIMA_${especieLimpa}_${tratamentoLimpo}_${dataArquivo}.csv`;

        await this.downloadOuCompartilhar(csvFinal, filename, 'text/csv;charset=utf-8', 'Exportar CSV');
    }

    // =========================================================================
    // EXPORTAÇÃO EM PDF
    // =========================================================================
    async exportarPDF(
        analise: any,
        unidadeCalculada: string,
        resultados: LeafMetric[],
        resultadosAgregados: AggregatedMetrics | null,
        imagemBase64: string
    ) {
        if (!resultados || resultados.length === 0) {
            throw new Error('Não há resultados para exportar.');
        }

        const dataArquivo = new Date().toISOString().split('T')[0];
        const dataHoraGeracao = new Date().toLocaleString('pt-BR');

        // Função auxiliar para formatar números no PDF
        const formatNumber = (num: any) => (num !== undefined && num !== null) ? Number(num).toFixed(3).replace('.', ',') : '-';

        // Construção das linhas da tabela
        const linhasTabela = resultados.map((f, index) => `
      <tr>
          <td>${index + 1}</td>
          <td>${formatNumber(f.largura)}</td>
          <td>${formatNumber(f.comprimento)}</td>
          <td>${formatNumber(f.relacaoLarguraComprimento)}</td>
          <td>${formatNumber(f.area)}</td>
          <td>${formatNumber(f.perimetro)}</td>
      </tr>
    `).join('');

        const htmlTemplate = `
      <div style="background-color: #ffffff; padding: 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #2e3d30;">
          <style>
              .header-banner { background-color: #1b5e20; color: #ffffff; padding: 20px; margin-bottom: 20px; border-radius: 4px; }
              .header-banner table { width: 100%; border-collapse: collapse; }
              .header-banner h1 { margin: 0; font-size: 22px; }
              .header-banner p { margin: 0; font-size: 11px; font-style: italic; opacity: 0.9; }
              .app-id { text-align: right; font-size: 11px; font-weight: bold; opacity: 0.8; }
              
              .section-title { font-size: 13px; color: #1b5e20; border-bottom: 2px solid #a5d6a7; padding-bottom: 4px; margin: 20px 0 10px 0; text-transform: uppercase; font-weight: bold; }
              
              .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .meta-table td { padding: 6px; border-bottom: 1px solid #e8f5e9; font-size: 11px; }
              .meta-label { font-weight: bold; color: #2e7d32; width: 22%; }
              
              .image-analysis-container { text-align: center; margin-bottom: 20px; border: 1px solid #c8e6c9; padding: 10px; border-radius: 4px; background-color: #fff; }
              .image-analysis-container img { max-width: 100%; max-height: 400px; object-fit: contain; }
              .image-caption { font-size: 10px; color: #556b58; font-style: italic; margin-top: 8px; }
              
              .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
              .data-table th { background-color: #2e7d32; color: #ffffff; padding: 8px 4px; font-size: 11px; border: 1px solid #1b5e20; text-align: center; }
              .data-table td { padding: 6px 4px; text-align: center; border: 1px solid #e0e0e0; font-size: 11px; }
              .row-summary-mean { background-color: #e8f5e9; font-weight: bold; border-top: 2px solid #2e7d32; }
              .row-summary-sd { background-color: #e8f5e9; font-weight: bold; border-top: 2px solid #2e7d32;}
              .row-summary-total { background-color: #c8e6c9; font-weight: bold; border-top: 1.5px solid #1b5e20; border-bottom: 2px solid #1b5e20; }
             
              .image-analysis-container, .data-table, tr, .section-title { 
                  page-break-inside: avoid !important; 
                  break-inside: avoid !important; 
              }
             .section-group {
                  page-break-inside: avoid !important;
                  break-inside: avoid !important;
              }
              .footer { margin-top: 30px; border-top: 1px solid #e0e0e0; padding-top: 10px; text-align: center; font-size: 10px; color: #888888; }
          </style>
          
          <div class="header-banner">
              <table>
                  <tr>
                      <td>
                          <h1>L.I.M.A.</h1>
                          <p>Leaf Image Measurement and Analysis</p>
                      </td>
                      <td class="app-id">RELATÓRIO DE EXPORTAÇÃO</td>
                  </tr>
              </table>
          </div>

          <div class="section-title">Dados do Experimento</div>
          <table class="meta-table">
              <tr>
                  <td class="meta-label">Arquivo de Origem:</td>
                  <td>${analise.nomeImagem || ''}</td>
                  <td class="meta-label">Data da Análise:</td>
                  <td>${new Date(analise.data || Date.now()).toLocaleDateString('pt-BR')}</td>
              </tr>
              <tr>

                  <td class="meta-label">Área Padrão:</td>
                  <td>${analise.areaEscala ? formatNumber(analise.areaEscala) : '1,000'} ${unidadeCalculada}²</td>
                  <td class="meta-label">Total de Folhas:</td>
                  <td>${resultados.length}</td>
              </tr>
              <tr>
                  <td class="meta-label">Espécie:</td>
                  <td>${analise.especie || 'Não informada'}</td>
                  <td class="meta-label">Tratamento:</td>
                  <td>${analise.tratamento || 'Não informado'}</td>
              </tr>
              <tr>
                  <td class="meta-label">Réplica:</td>
                  <td>${analise.replica || 'Não informada'}</td>
                  <td class="meta-label"></td>
                  <td></td>
              </tr>
          </table>

          <div class="section-title">Visualização da Imagem Processada</div>
          <div class="image-analysis-container">
              <img src="${imagemBase64.startsWith('data:image') ? imagemBase64 : `data:image/jpeg;base64,${imagemBase64}`}" alt="Imagem Processada">
              <div class="image-caption">Figura 1: Mapeamento, segmentação e indexação das ${resultados.length} folhas.</div>
          </div>
          <div class="section-group">
            <div class="section-title">Resultados da análise</div>
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Folha</th>
                        <th>Largura (${unidadeCalculada})</th>
                        <th>Comprimento (${unidadeCalculada})</th>
                        <th>Relação L/C</th>
                        <th>Área (${unidadeCalculada}²)</th>
                        <th>Perímetro (${unidadeCalculada})</th>
                    </tr>
                </thead>
                <tbody>
                    ${linhasTabela}
                    <tr class="row-summary-mean">
                        <td>Média</td>
                        <td>${formatNumber(resultadosAgregados?.averageWidth ?? (resultadosAgregados as any)?.mediaLargura)}</td>
                        <td>${formatNumber(resultadosAgregados?.averageLength ?? (resultadosAgregados as any)?.mediaComprimento)}</td>
                        <td>${formatNumber(resultadosAgregados?.averageWidthToLengthRatio ?? (resultadosAgregados as any)?.mediaRelacao)}</td>
                        <td>${formatNumber(resultadosAgregados?.averageArea ?? (resultadosAgregados as any)?.mediaArea)}</td>
                        <td>${formatNumber(resultadosAgregados?.averagePerimeter ?? (resultadosAgregados as any)?.mediaPerimetro)}</td>
                    </tr>
                    <tr class="row-summary-sd">
                        <td>Desvio P.</td>
                        <td>${formatNumber(resultadosAgregados?.standardDeviationWidth ?? (resultadosAgregados as any)?.desvioLargura)}</td>
                        <td>${formatNumber(resultadosAgregados?.standardDeviationLength ?? (resultadosAgregados as any)?.desvioComprimento)}</td>
                        <td>-</td>
                        <td>${formatNumber(resultadosAgregados?.standardDeviationArea ?? (resultadosAgregados as any)?.desvioArea)}</td>
                        <td>${formatNumber(resultadosAgregados?.standardDeviationPerimeter ?? (resultadosAgregados as any)?.desvioPerimetro)}</td>
                    </tr>
                    <tr class="row-summary-total">
                        <td>Área Total</td>
                        <td>-</td>
                        <td>-</td>
                        <td>-</td>
                        <td>${formatNumber(resultadosAgregados?.totalArea ?? (resultadosAgregados as any)?.somaAreas)}</td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>
          </div>

          <div class="footer">
              Relatório gerado automaticamente pelo aplicativo L.I.M.A. em ${dataHoraGeracao}.
          </div>
      </div>
    `;

        const especieLimpa = (analise.especie || 'analise').replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const filename = `LIMA_${especieLimpa}_${dataArquivo}.pdf`;

        const options = {
            margin: 10,
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: 'css', avoid: ['tr', '.image-analysis-container', '.section-group'] }
        };

        const geradorPdf = (html2pdfPlugin as any).default || html2pdfPlugin;

        const worker = geradorPdf().set(options).from(htmlTemplate);
        const pdfBlob = await worker.outputPdf('blob');

        await this.downloadOuCompartilhar(pdfBlob, filename, 'application/pdf', 'Exportar PDF');
    }

    // =========================================================================
    // MÉTODO AUXILIAR DE COMPARTILHAMENTO / DOWNLOAD
    // =========================================================================
    private async downloadOuCompartilhar(conteudo: string | Blob, filename: string, mimeType: string, dialogTitle: string) {
        if (Capacitor.isNativePlatform()) {
            // 📱 NO CELULAR NATIVO: Salva no cache e abre a tela de compartilhar (WhatsApp, etc)
            try {
                let base64Data: string;

                if (conteudo instanceof Blob) {
                    base64Data = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(conteudo);
                        reader.onloadend = () => {
                            const result = reader.result as string;
                            resolve(result.split(',')[1]);
                        };
                        reader.onerror = reject;
                    });
                } else {
                    base64Data = btoa(unescape(encodeURIComponent(conteudo as string)));
                }

                const result = await Filesystem.writeFile({
                    path: filename,
                    data: base64Data,
                    directory: Directory.Cache,
                });

                await Share.share({
                    title: 'Resultados L.I.M.A.',
                    text: 'Confira os resultados da análise exportados pelo LIMA.',
                    url: result.uri,
                    dialogTitle: dialogTitle
                });

            } catch (error) {
                console.error('Erro no mobile ao salvar/compartilhar:', error);
                throw new Error('Não foi possível exportar o arquivo neste dispositivo.');
            }
        } else {
            // 💻 NA WEB / NAVEGADOR: Força o download direto sempre!
            const blob = conteudo instanceof Blob ? conteudo : new Blob(['\uFEFF', conteudo as string], { type: mimeType });

            try {
                saveAs(blob, filename);
            } catch (saveError) {
                // Fallback nativo do HTML caso o saveAs falhe
                const url = URL.createObjectURL(blob);
                const anchor = document.createElement('a');
                anchor.href = url;
                anchor.download = filename;
                anchor.style.display = 'none';
                document.body.appendChild(anchor);
                anchor.click();
                document.body.removeChild(anchor);
                URL.revokeObjectURL(url);
            }
        }
    }
}