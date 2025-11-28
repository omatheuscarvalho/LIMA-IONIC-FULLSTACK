import { Injectable } from '@angular/core';

// Declara a variável 'cv' que será injetada pelo script do OpenCV.js
declare var cv: any;

export interface LeafMetric {
  id: number;
  area: number;
  perimetro: number;
  comprimento: number;
  largura: number;
  relacaoLarguraComprimento: number;
  // Centroid coordinates (pixels) - useful for re-drawing labels without re-running full analysis
  cx?: number;
  cy?: number;
  // Contour flattened array [x1,y1,x2,y2,...] - used to redraw contours with OpenCV later
  contour?: number[];
  // Stable UID used by the frontend *ngFor trackBy to avoid DOM reuse issues
  uid?: string;
}

export interface AggregatedMetrics {
  totalArea?: number;
  averageArea?: number;
  standardDeviationArea?: number;
  averagePerimeter?: number;
  standardDeviationPerimeter?: number;
  averageWidth?: number;
  standardDeviationWidth?: number;
  averageLength?: number;
  standardDeviationLength?: number;
  averageWidthToLengthRatio?: number;
}

export interface AnalysisResult {
  leaves: LeafMetric[];
  aggregatedMetrics: AggregatedMetrics;
  processedImage: string | null;
  numberOfLeaves: number;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageAnalysisService {

  constructor() { }

  /**
   * Analyzes an image to detect leaves and calculate metrics using OpenCV.js.
   * This is a direct translation of the Python/C++ logic.
   * @param base64Image The base64 encoded image string.
   * @param realAreaSquare The real-world area of the reference square object in cm².
   * @returns A promise that resolves with the analysis results.
   */
  async processImageDirect(imgElement: HTMLImageElement, realAreaSquare: number = 1.0): Promise<AnalysisResult> {
    return new Promise((resolve, reject) => {
      if (typeof cv === 'undefined' || !cv.imread) {
        return reject(new Error("OpenCV.js is not loaded."));
      }

      // All OpenCV objects created must be pushed to this array for proper memory management.
      const mats: any[] = [];

      let squares: any[] = [];
      let leaves: any[] = [];

      try {
        const src = cv.imread(imgElement);
        mats.push(src);

        const gray = new cv.Mat();
        mats.push(gray);
        cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

        const thresh = new cv.Mat();
        mats.push(thresh);
        cv.threshold(gray, thresh, 0, 255, cv.THRESH_BINARY_INV | cv.THRESH_OTSU);

        const contours = new cv.MatVector();
        mats.push(contours);
        const hierarchy = new cv.Mat();
        mats.push(hierarchy);
        cv.findContours(thresh, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE);

        const amin = 1000;
        const amax = 10000000000;
        const cosAngle = 0.3;

        for (let i = 0; i < contours.size(); ++i) {
          const cnt = contours.get(i);
          const area = cv.contourArea(cnt);

          if (area > amin && area < amax) {
            const perimeter = cv.arcLength(cnt, true);
            const approx = new cv.Mat();
            cv.approxPolyDP(cnt, approx, perimeter * 0.02, true);

            if (approx.rows === 4 && cv.isContourConvex(approx)) {
              let maxCosine = 0;
              const points = [];
              for (let k = 0; k < approx.rows; k++) {
                points.push({ x: approx.data32S[k * 2], y: approx.data32S[k * 2 + 1] });
              }

              for (let j = 2; j < 5; j++) {
                const cosine = Math.abs(this.cosineAngle(points[j % 4], points[j - 2], points[j - 1]));
                maxCosine = Math.max(maxCosine, cosine);
              }
              if (maxCosine < cosAngle) {
                squares.push(cnt);
              } else {
                leaves.push(cnt);
              }
            } else {
              leaves.push(cnt);
            }
            approx.delete();
          } else {
            cnt.delete(); // Delete small contours immediately
          }
        }

        if (squares.length === 0) {
          return resolve({ error: "No reference object (square) found.", leaves: [], aggregatedMetrics: {}, processedImage: null, numberOfLeaves: 0 });
        }

        squares.sort((a, b) => cv.contourArea(b) - cv.contourArea(a));
        const referenceSquare = squares[0];

        // --- Scaling Logic ---
        const pixelsPerSquare = cv.arcLength(referenceSquare, true);
        const scalingFactorLinear = Math.sqrt(realAreaSquare) / (pixelsPerSquare / 4.0);
        const pixelsAreaSquare = cv.contourArea(referenceSquare);
        const scalingFactorArea = realAreaSquare / pixelsAreaSquare;

        // --- Leaf Measurement ---
        const leafMetrics: LeafMetric[] = [];
        for (let i = 0; i < leaves.length; i++) {
          const leaf = leaves[i];
          const areaPx = cv.contourArea(leaf);
          const perimeterPx = cv.arcLength(leaf, true);

          let w_px = 0, l_px = 0;

          // --- ROBUST METHOD: Use minAreaRect for all cases ---
          // This is a standard and stable way to find the length and width of a rotated object,
          // and it avoids the issues with the missing PCA function in the opencv.js build.
          const rotatedRect = cv.minAreaRect(leaf);
          w_px = rotatedRect.size.width;
          l_px = rotatedRect.size.height;

          const widthCm = Math.min(w_px, l_px) * scalingFactorLinear;
          const lengthCm = Math.max(w_px, l_px) * scalingFactorLinear;

          // calcule o centróide agora e armazene para uso posterior na UI
          const M_metrics = cv.moments(leaf, false);
          const cX_metric = Math.round(M_metrics.m10 / (M_metrics.m00 || 1));
          const cY_metric = Math.round(M_metrics.m01 / (M_metrics.m00 || 1));

          // extract contour points into flat array
          const ptsFlat: number[] = [];
          if (leaf && leaf.data32S && leaf.data32S.length) {
            for (let p = 0; p < leaf.data32S.length; p++) ptsFlat.push(leaf.data32S[p]);
          }

          // generate a stable uid for this leaf (unique within this analysis)
          const uid = `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${i}`;

          leafMetrics.push({
            id: i + 1,
            area: areaPx * scalingFactorArea,
            perimetro: perimeterPx * scalingFactorLinear,
            comprimento: lengthCm,
            largura: widthCm,
            relacaoLarguraComprimento: lengthCm > 0 ? widthCm / lengthCm : 0,
            cx: cX_metric,
            cy: cY_metric,
            contour: ptsFlat,
            uid
          });
        }

        // --- Aggregated Metrics ---
        const n = leafMetrics.length;
        const aggregatedMetrics: AggregatedMetrics = {};
        if (n > 0) {
          const getMean = (arr: number[]) => arr.reduce((sum, val) => sum + val, 0) / n;
          const getStdDev = (arr: number[], mean: number) => Math.sqrt(arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n);
 
          const areas = leafMetrics.map(l => l.area);
          aggregatedMetrics.totalArea = areas.reduce((sum, val) => sum + val, 0);
          aggregatedMetrics.averageArea = getMean(areas);
          aggregatedMetrics.standardDeviationArea = getStdDev(areas, aggregatedMetrics.averageArea);

          const perimeters = leafMetrics.map(l => l.perimetro);
          aggregatedMetrics.averagePerimeter = getMean(perimeters);
          aggregatedMetrics.standardDeviationPerimeter = getStdDev(perimeters, aggregatedMetrics.averagePerimeter);

          const widths = leafMetrics.map(l => l.largura);
          aggregatedMetrics.averageWidth = getMean(widths);
          aggregatedMetrics.standardDeviationWidth = getStdDev(widths, aggregatedMetrics.averageWidth);

          const lengths = leafMetrics.map(l => l.comprimento);
          aggregatedMetrics.averageLength = getMean(lengths);
          aggregatedMetrics.standardDeviationLength = getStdDev(lengths, aggregatedMetrics.averageLength);

          const ratios = leafMetrics.map(l => l.relacaoLarguraComprimento);
          aggregatedMetrics.averageWidthToLengthRatio = getMean(ratios);
        }

        // --- Draw Contours for Visualization ---
        const processedImageMat = src.clone();
        mats.push(processedImageMat);
        for (const sq of squares) {
          const sqVec = new cv.MatVector();
          sqVec.push_back(sq);
          cv.drawContours(processedImageMat, sqVec, -1, new cv.Scalar(0, 255, 0, 255), 3);
          sqVec.delete();
        }
        for (let i = 0; i < leaves.length; i++) {
          const leaf = leaves[i];
          const leafVec = new cv.MatVector();
          leafVec.push_back(leaf);
          // Desenha o contorno da folha em azul para melhor contraste
          cv.drawContours(processedImageMat, leafVec, -1, new cv.Scalar(0, 0, 255, 255), 4);
          leafVec.delete();

          // Calcula o centroide da folha para posicionar o número
          const M = cv.moments(leaf, false);
          const cX = Math.round(M.m10 / M.m00);
          const cY = Math.round(M.m01 / M.m00);

          // Prepara e desenha o número da folha
          const text = `${i + 1}`;
          const org = new cv.Point(cX - 25, cY + 25); // Ajuste para o novo tamanho da fonte
          const fontFace = cv.FONT_HERSHEY_SIMPLEX;
          const fontScale = 2.5;
          const color = new cv.Scalar(255, 0, 0, 255); // Cor vermelha
          const thickness = 6; // Aumenta a espessura para um efeito de "negrito"
          cv.putText(processedImageMat, text, org, fontFace, fontScale, color, thickness);

        }

        const canvas = document.createElement('canvas');
        cv.imshow(canvas, processedImageMat);
        const processedImageBase64 = canvas.toDataURL('image/png');

        resolve({
          leaves: leafMetrics,
          aggregatedMetrics: aggregatedMetrics,
          processedImage: processedImageBase64,
          numberOfLeaves: leafMetrics.length,
        });


      } catch (err: any) {
        console.error("Error during OpenCV.js processing:", err);
        reject(new Error(`Analysis failed: ${err.message || err}`));
      } finally {
        // Clean up all allocated memory
        mats.forEach(mat => mat.delete());
        squares.forEach((s: any) => s.delete());
        leaves.forEach((l: any) => l.delete());
      }
    });
  }

  /**
   * Desenha os rótulos (números) das folhas em uma imagem base (base64).
   * Usa as coordenadas de centróide (cx, cy) presentes em cada LeafMetric.
   * Retorna uma dataURL PNG com as marcações atualizadas.
   */
  async drawLabelsOnImage(base64Image: string, leavesToMark: LeafMetric[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!base64Image) return resolve(null as any);

      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
          // Desenha imagem base
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Estilo de marcadores / texto
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // primeiro desenha um 'outline' branco grosso para melhorar contraste
          ctx.lineWidth = Math.max(4, Math.round(canvas.width * 0.003));
          ctx.font = `${Math.max(14, Math.round(canvas.width * 0.025))}px sans-serif`;

          for (const lf of leavesToMark || []) {
            if (typeof lf.cx !== 'number' || typeof lf.cy !== 'number') continue;

            // circle marker
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.arc(lf.cx, lf.cy, Math.max(8, Math.round(canvas.width * 0.01)), 0, Math.PI * 2);
            ctx.fill();

            // text (id) with stroke
            ctx.fillStyle = '#ff0000';
            ctx.lineWidth = Math.max(3, Math.round(canvas.width * 0.006));
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.strokeText(String(lf.id), lf.cx, lf.cy);
            ctx.fillText(String(lf.id), lf.cx, lf.cy);
          }

          resolve(canvas.toDataURL('image/png'));
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (e) => reject(new Error('Falha ao carregar imagem para desenhar labels'));
      img.src = base64Image;
    });
  }

  /**
   * Redesenha contornos e rótulos (números) usando OpenCV para manter o mesmo estilo
   * que o processamento original (mesma cor / espessura / fonte do putText).
   */
  async drawContoursAndLabelsOnImage(base64Image: string, leavesToMark: LeafMetric[]): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!base64Image) return resolve(null as any);

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let mats: any[] = [];
        try {
          const src = cv.imread(img);
          mats.push(src);

          const processed = src.clone();
          mats.push(processed);

          // Para cada folha, recria a Mat de pontos do contorno e desenha
          for (let i = 0; i < (leavesToMark || []).length; i++) {
            const lf = leavesToMark[i];
            if (!lf || !lf.contour || lf.contour.length === 0) continue;

            const pts = cv.matFromArray(lf.contour.length / 2, 1, cv.CV_32SC2, lf.contour);
            mats.push(pts);
            const vec = new cv.MatVector();
            vec.push_back(pts);

            // desenha o contorno com mesma cor/espessura (0,0,255,255) e thickness 4
            cv.drawContours(processed, vec, -1, new cv.Scalar(0, 0, 255, 255), 4);

            // desenha o número (mesmos parâmetros que processImageDirect)
            const cX = lf.cx ?? 0;
            const cY = lf.cy ?? 0;
            const text = `${i + 1}`;
            const org = new cv.Point(cX - 25, cY + 25);
            const fontFace = cv.FONT_HERSHEY_SIMPLEX;
            const fontScale = 2.5;
            const color = new cv.Scalar(255, 0, 0, 255);
            const thickness = 6;
            cv.putText(processed, text, org, fontFace, fontScale, color, thickness);

            vec.delete();
            // pts will be deleted in mats cleanup
          }

          const canvas = document.createElement('canvas');
          cv.imshow(canvas, processed);
          const out = canvas.toDataURL('image/png');
          resolve(out);
        } catch (err) {
          reject(err);
        } finally {
          try { mats.forEach(m => m.delete()); } catch (_) {}
        }
      };
      img.onerror = (e) => reject(new Error('Falha ao carregar imagem para desenhar contours com OpenCV'));
      img.src = base64Image;
    });
  }

  private cosineAngle(pt1: { x: number, y: number }, pt2: { x: number, y: number }, pt0: { x: number, y: number }): number {
    const dx1 = pt1.x - pt0.x;
    const dy1 = pt1.y - pt0.y;
    const dx2 = pt2.x - pt0.x;
    const dy2 = pt2.y - pt0.y;
    const denominator = Math.sqrt((dx1 * dx1 + dy1 * dy1) * (dx2 * dx2 + dy2 * dy2)) + 1e-10;
    if (Math.abs(denominator) < 1e-10) return 1.0;
    return (dx1 * dx2 + dy1 * dy2) / denominator;
  }
}