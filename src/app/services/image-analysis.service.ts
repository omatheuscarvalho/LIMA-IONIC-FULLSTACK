import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

export interface LeafMetrics {
  id: number;
  area: number;
  perimetro: number;
  comprimento: number;
  largura: number;
  relacaoLarguraComprimento: number;
}

export interface AnalysisResult {
  leafMetrics: LeafMetrics[];
  aggregatedMetrics: {
    somaAreas: number;
    mediaArea: number;
    desvioArea: number;
    relacaoLarguraComprimento: number;
  };
  processedImage?: string; // Imagem processada em base64
}

@Injectable({
  providedIn: 'root'
})
export class ImageAnalysisService {  
  // Caminho para o script Python
  private pythonServicePath = 'python_service.py';
  private debugMode = true;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  
  constructor(private http: HttpClient) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
  }
  
  /**
   * Analisa uma imagem e retorna métricas das folhas
   * @param imageFile Arquivo de imagem a ser analisado
   * @param scaleArea Área do padrão de escala em cm²
   * @returns Resultado da análise
   */
  async analyzeImage(imageFile: File, scaleArea: number): Promise<AnalysisResult> {
    try {
      console.log('Iniciando análise de imagem com área de escala:', scaleArea);
      console.log('Arquivo de imagem:', imageFile.name, 'tamanho:', imageFile.size, 'tipo:', imageFile.type);
      
      // Converter a imagem para base64
      const base64Image = await this.fileToBase64(imageFile);
      console.log('Imagem convertida para base64, tamanho:', base64Image.length);
      
      // Extrair apenas os dados base64 (remover o prefixo)
      const base64Data = base64Image.split(',')[1]; // Remover o prefixo 'data:image/jpeg;base64,'
      console.log('Dados base64 extraídos, tamanho:', base64Data.length);
      
      // Tentar usar o serviço Python primeiro
      try {
        console.log('Tentando usar o serviço Python...');
        const pythonResult = await this.callPythonService(base64Data, scaleArea);
        return pythonResult;
      } catch (pythonError) {
        console.error('Erro ao usar o serviço Python:', pythonError);
        console.log('Usando processamento JavaScript como fallback...');
        
        // Fallback para o processamento JavaScript
        const img = new Image();
        const imageUrl = URL.createObjectURL(imageFile);
        console.log('Criado URL para imagem:', imageUrl.substring(0, 30) + '...');
        
        return new Promise((resolve, reject) => {
          img.onload = () => {
            try {
              console.log('Imagem carregada com sucesso, dimensões:', img.width, 'x', img.height);
              const result = this.processImage(img, scaleArea);
              resolve(result);
            } catch (error) {
              console.error('Erro no processamento JavaScript:', error);
              reject(error);
            } finally {
              URL.revokeObjectURL(imageUrl);
            }
          };
          
          img.onerror = () => {
            console.error('Falha ao carregar a imagem no elemento Image');
            URL.revokeObjectURL(imageUrl);
            reject(new Error('Erro ao carregar a imagem'));
          };
          
          img.src = imageUrl;
        });
      }
    } catch (error) {
      console.error('Erro ao analisar imagem:', error);
      throw error;
    }
  }
  
  /**
   * Chama o serviço Python para processar a imagem
   * @param base64Image Imagem em formato base64
   * @param scaleArea Área do padrão de escala em cm²
   * @returns Resultado da análise
   */
  private async callPythonService(base64Image: string, scaleArea: number): Promise<AnalysisResult> {
    try {
      console.log('Chamando serviço Python com área de escala:', scaleArea);
      console.log('Caminho do script Python:', this.pythonServicePath);
      
      // Verificar se o script Python existe
      if (this.debugMode) {
        const fs = require('fs');
        try {
          if (fs.existsSync(this.pythonServicePath)) {
            console.log('Script Python encontrado em:', this.pythonServicePath);
          } else {
            console.error('Script Python NÃO encontrado em:', this.pythonServicePath);
            // Tentar encontrar o script em outros locais comuns
            const possiblePaths = [
              './python_service.py',
              '../python_service.py',
              'assets/python/python_service.py',
              './assets/python/python_service.py',
              '../assets/python/python_service.py'
            ];
            
            for (const path of possiblePaths) {
              if (fs.existsSync(path)) {
                console.log('Script Python encontrado em caminho alternativo:', path);
                this.pythonServicePath = path;
                break;
              }
            }
          }
        } catch (error) {
          console.error('Erro ao verificar existência do script Python:', error);
        }
      }
      
      // Tentando usar o serviço Python real
      try {
        return await this.realCallPythonService(base64Image, scaleArea);
      } catch (innerError) {
        // Se falhar, provavelmente estamos em um ambiente web
        console.error('Erro ao executar Python:', innerError);
        throw new Error('Serviço Python não disponível no ambiente atual');
      }
    } catch (error) {
      console.error('Erro ao chamar serviço Python:', error);
      throw error;
    }
  }
  
  /**
   * Converte um arquivo para base64
   * @param file Arquivo a ser convertido
   * @returns Promise com a string base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  }

  /**
   * Implementação real do serviço Python para ambiente desktop
   * @param base64Image - Imagem em formato base64
   * @param scaleArea - Área de escala para calibração
   * @returns Promise com os resultados da análise
   */
  private realCallPythonService(base64Image: string, scaleArea: number): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      try {
        // Executar o script Python como um processo
        const { exec } = require('child_process');
        
        // Comando para executar o script Python com os argumentos
        // Limitando o tamanho da string de log para evitar sobrecarga
        const commandForLog = `python "${this.pythonServicePath}" "[base64 data]" ${scaleArea}`;
        const command = `python "${this.pythonServicePath}" "${base64Image}" ${scaleArea}`;
        
        console.log('Executando comando Python:', commandForLog);
        
        exec(command, { maxBuffer: 1024 * 1024 * 10 }, (error: any, stdout: string, stderr: string) => {
          if (error) {
            console.error(`Erro ao executar o script Python: ${error.message}`);
            console.error(`stderr: ${stderr}`);
            reject(error);
            return;
          }
          
          if (stderr) {
            console.warn(`Aviso do script Python: ${stderr}`);
          }
          
          try {
            console.log('Saída do comando Python:', stdout.substring(0, 100) + '...');
            // Analisar a saída JSON do script Python
            const result = JSON.parse(stdout);
            
            if (result.error) {
              console.error('Erro retornado pelo script Python:', result.error);
              reject(new Error(result.error || 'Erro desconhecido no script Python'));
              return;
            }
            
            console.log('Resultado do script Python:', 
              'numberOfLeaves:', result.numberOfLeaves,
              'leaves:', result.leaves ? result.leaves.length : 0,
              'processedImage:', result.processedImage ? 'presente' : 'ausente'
            );
            
            // Mapear o resultado para o formato esperado pelo aplicativo
            const leafMetrics = result.leaves ? result.leaves.map((leaf: any, index: number) => ({
              id: index + 1,
              area: leaf.area,
              perimetro: leaf.perimeter,
              comprimento: leaf.length,
              largura: leaf.width,
              relacaoLarguraComprimento: leaf.widthToLengthRatio
            })) : [];
            
            const analysisResult: AnalysisResult = {
              leafMetrics: leafMetrics,
              aggregatedMetrics: {
                somaAreas: result.aggregatedMetrics?.totalArea || 0,
                mediaArea: result.aggregatedMetrics?.averageArea || 0,
                desvioArea: result.aggregatedMetrics?.standardDeviationArea || 0,
                relacaoLarguraComprimento: result.aggregatedMetrics?.averageWidthToLengthRatio || 0
              },
              processedImage: result.processedImage
            };
            
            resolve(analysisResult);
          } catch (parseError) {
            console.error('Erro ao analisar a saída do script Python:', parseError);
            console.error('Saída recebida (primeiros 100 caracteres):', stdout.substring(0, 100));
            reject(parseError);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
  
  /**
   * Processa a imagem e extrai as métricas das folhas (método de fallback)
   * @param img - Elemento de imagem HTML
   * @param scaleArea - Área de escala para calibração
   * @returns Resultado da análise
   */
  private processImage(img: HTMLImageElement, scaleArea: number): AnalysisResult {
    // Configurar canvas com as dimensões da imagem
    this.canvas.width = img.width;
    this.canvas.height = img.height;
    this.ctx.drawImage(img, 0, 0);

    // Obter dados da imagem
    const imageData = this.ctx.getImageData(0, 0, img.width, img.height);
    
    // Converter para escala de cinza e aplicar threshold
    const grayData = this.toGrayscale(imageData);
    const binaryData = this.applyThreshold(grayData, 60);
    
    // Detectar contornos e classificar objetos
    const contours = this.findContours(binaryData, img.width, img.height);
    const { squares, leaves } = this.classifyObjects(contours);
    
    // Calcular métricas das folhas
    const leafMetrics = this.calculateLeafMetrics(leaves, scaleArea);
    const aggregatedMetrics = this.calculateAggregatedMetrics(leafMetrics);
    
    // Desenhar contornos na imagem original para visualização
    const processedImageData = this.drawContours(img, leaves, squares);
    
    return {
      leafMetrics: leafMetrics,
      aggregatedMetrics: aggregatedMetrics,
      processedImage: processedImageData
    };
  }
  
  /**
   * Desenha contornos na imagem
   */
  private drawContours(img: HTMLImageElement, leaves: any[], squares: any[]): string {
    // Criar um novo canvas para não modificar o original
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    
    // Desenhar a imagem original
    ctx.drawImage(img, 0, 0);
    
    // Desenhar contornos das folhas em verde
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    for (const leaf of leaves) {
      ctx.beginPath();
      for (let i = 0; i < leaf.length; i++) {
        const point = leaf[i];
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }
    
    // Desenhar contornos dos quadrados em vermelho
    ctx.strokeStyle = '#FF0000';
    for (const square of squares) {
      ctx.beginPath();
      for (let i = 0; i < square.length; i++) {
        const point = square[i];
        if (i === 0) {
          ctx.moveTo(point.x, point.y);
        } else {
          ctx.lineTo(point.x, point.y);
        }
      }
      ctx.closePath();
      ctx.stroke();
    }
    
    // Converter para base64
    return canvas.toDataURL('image/jpeg');
  }

  /**
   * Converte imagem para escala de cinza
   */
  private toGrayscale(imageData: ImageData): Uint8ClampedArray {
    const data = imageData.data;
    const grayData = new Uint8ClampedArray(imageData.width * imageData.height);
    
    for (let i = 0; i < data.length; i += 4) {
      const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
      grayData[i / 4] = gray;
    }
    
    return grayData;
  }

  /**
   * Aplica threshold binário na imagem
   */
  private applyThreshold(grayData: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
    const binaryData = new Uint8ClampedArray(grayData.length);
    
    for (let i = 0; i < grayData.length; i++) {
      binaryData[i] = grayData[i] < threshold ? 255 : 0;
    }
    
    return binaryData;
  }

  /**
   * Encontra contornos na imagem binária (implementação simplificada)
   */
  private findContours(binaryData: Uint8ClampedArray, width: number, height: number): any[] {
    // Esta é uma implementação simplificada de detecção de contornos
    // Em um ambiente real, você poderia usar bibliotecas como OpenCV.js
    const contours: any[] = [];
    const visited = new Array(width * height).fill(false);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const index = y * width + x;
        if (binaryData[index] === 255 && !visited[index]) {
          const contour = this.traceContour(binaryData, width, height, x, y, visited);
          if (contour.length > 10) { // Filtrar contornos muito pequenos
            contours.push(contour);
          }
        }
      }
    }
    
    return contours;
  }

  /**
   * Traça um contorno a partir de um ponto inicial
   */
  private traceContour(binaryData: Uint8ClampedArray, width: number, height: number, startX: number, startY: number, visited: boolean[]): any[] {
    const contour: any[] = [];
    const stack = [{x: startX, y: startY}];
    
    while (stack.length > 0) {
      const point = stack.pop()!;
      const index = point.y * width + point.x;
      
      if (visited[index] || binaryData[index] !== 255) continue;
      
      visited[index] = true;
      contour.push(point);
      
      // Verificar vizinhos (8-conectividade)
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          
          const newX = point.x + dx;
          const newY = point.y + dy;
          const newIndex = newY * width + newX;
          
          if (newX >= 0 && newX < width && newY >= 0 && newY < height && 
              !visited[newIndex] && binaryData[newIndex] === 255) {
            stack.push({x: newX, y: newY});
          }
        }
      }
    }
    
    return contour;
  }

  /**
   * Classifica objetos em quadrados e folhas
   */
  private classifyObjects(contours: any[]): {squares: any[], leaves: any[]} {
    const squares: any[] = [];
    const leaves: any[] = [];
    const minArea = 1000;
    const maxArea = 10000000;
    
    // Ordenar contornos por área (do maior para o menor)
    const sortedContours = [...contours].sort((a, b) => {
      const areaA = this.calculateContourArea(a);
      const areaB = this.calculateContourArea(b);
      return areaB - areaA; // Ordem decrescente
    });
    
    // Pegar apenas o maior contorno como folha principal
    if (sortedContours.length > 0) {
      const largestContour = sortedContours[0];
      const area = this.calculateContourArea(largestContour);
      
      if (area >= minArea && area <= maxArea) {
        leaves.push(largestContour);
        console.log('Folha principal detectada com área de pixel:', area);
      }
    }
    
    return { squares, leaves };
  }

  /**
   * Calcula a área de um contorno
   */
  private calculateContourArea(contour: any[]): number {
    if (contour.length < 3) return 0;
    
    let area = 0;
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      area += contour[i].x * contour[j].y;
      area -= contour[j].x * contour[i].y;
    }
    
    return Math.abs(area) / 2;
  }

  /**
   * Calcula o perímetro de um contorno
   */
  private calculateContourPerimeter(contour: any[]): number {
    if (contour.length < 2) return 0;
    
    let perimeter = 0;
    for (let i = 0; i < contour.length; i++) {
      const j = (i + 1) % contour.length;
      const dx = contour[j].x - contour[i].x;
      const dy = contour[j].y - contour[i].y;
      perimeter += Math.sqrt(dx * dx + dy * dy);
    }
    
    return perimeter;
  }

  /**
   * Calcula o retângulo delimitador de um contorno
   */
  private calculateBoundingRect(contour: any[]): {x: number, y: number, width: number, height: number} {
    if (contour.length === 0) return {x: 0, y: 0, width: 0, height: 0};
    
    let minX = contour[0].x, maxX = contour[0].x;
    let minY = contour[0].y, maxY = contour[0].y;
    
    for (const point of contour) {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    }
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Calcula as métricas de cada folha
   */
  private calculateLeafMetrics(leaves: any[], scaleArea: number): LeafMetrics[] {
    // Calcular o fator de escala com base na área
    // Se scaleArea é a área em cm² que corresponde a um quadrado de referência na imagem,
    // então o fator de escala linear é a raiz quadrada dessa relação
    const scaleFactor = Math.sqrt(scaleArea);
    
    console.log('Fator de escala calculado:', scaleFactor);
    
    return leaves.map((leaf, index) => {
      // Área em pixels
      const pixelArea = this.calculateContourArea(leaf);
      // Perímetro em pixels
      const pixelPerimeter = this.calculateContourPerimeter(leaf);
      // Dimensões em pixels
      const boundingRect = this.calculateBoundingRect(leaf);
      const pixelWidth = Math.min(boundingRect.width, boundingRect.height);
      const pixelLength = Math.max(boundingRect.width, boundingRect.height);
      
      // Fator de escala para converter pixels em cm
      // Assumindo que scaleArea é a área em cm² de um quadrado de referência
      // e que esse quadrado tem 100x100 pixels na imagem
      // Então 1 cm = 10 pixels, ou 1 pixel = 0.1 cm
      const pixelToCm = 0.1;
      
      // Converter para unidades reais (cm)
      // Área: aplicar o fator de escala ao quadrado
      const area = pixelArea * pixelToCm * pixelToCm;
      // Perímetro: aplicar o fator de escala linear
      const perimeter = pixelPerimeter * pixelToCm;
      // Dimensões: aplicar o fator de escala linear
      const width = pixelWidth * pixelToCm;
      const length = pixelLength * pixelToCm;
      
      const widthToLengthRatio = length !== 0 ? width / length : 0;
      
      console.log(`Folha ${index + 1} - Pixels: área=${pixelArea}, perímetro=${pixelPerimeter}, largura=${pixelWidth}, comprimento=${pixelLength}`);
      console.log(`Folha ${index + 1} - Convertido: área=${area.toFixed(2)}, perímetro=${perimeter.toFixed(2)}, largura=${width.toFixed(2)}, comprimento=${length.toFixed(2)}`);
      
      return {
        id: index + 1,
        area: parseFloat(area.toFixed(2)),
        perimetro: parseFloat(perimeter.toFixed(2)),
        largura: parseFloat(width.toFixed(2)),
        comprimento: parseFloat(length.toFixed(2)),
        relacaoLarguraComprimento: parseFloat(widthToLengthRatio.toFixed(2))
      };
    });
  }

  /**
   * Calcula métricas agregadas
   */
  private calculateAggregatedMetrics(leafMetrics: LeafMetrics[]): any {
    if (leafMetrics.length === 0) {
      return {
        somaAreas: 0,
        mediaArea: 0,
        desvioArea: 0,
        relacaoLarguraComprimento: 0
      };
    }

    const areas = leafMetrics.map(leaf => leaf.area);
    const ratios = leafMetrics.map(leaf => leaf.relacaoLarguraComprimento);

    return {
      somaAreas: this.sum(areas),
      mediaArea: this.mean(areas),
      desvioArea: this.standardDeviation(areas),
      relacaoLarguraComprimento: this.mean(ratios)
    };
  }

  /**
   * Calcula a soma de um array
   */
  private sum(values: number[]): number {
    return values.reduce((sum, value) => sum + value, 0);
  }

  /**
   * Calcula a média de um array
   */
  private mean(values: number[]): number {
    return values.length > 0 ? this.sum(values) / values.length : 0;
  }

  /**
   * Calcula o desvio padrão de um array
   */
  private standardDeviation(values: number[]): number {
    if (!values || values.length <= 1) return 0;
    
    const meanValue = this.mean(values);
    const squaredDifferences = values.map((value) => Math.pow(value - meanValue, 2));
    const variance = this.mean(squaredDifferences);
    
    return Math.sqrt(variance);
  }
}