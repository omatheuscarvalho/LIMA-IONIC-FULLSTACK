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

          leafMetrics.push({
            id: i + 1,
            area: areaPx * scalingFactorArea,
            perimetro: perimeterPx * scalingFactorLinear,
            comprimento: lengthCm,
            largura: widthCm,
            relacaoLarguraComprimento: lengthCm > 0 ? widthCm / lengthCm : 0,
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
        for (const leaf of leaves) {
          const leafVec = new cv.MatVector();
          leafVec.push_back(leaf);
          cv.drawContours(processedImageMat, leafVec, -1, new cv.Scalar(0, 0, 255, 255), 3);
          leafVec.delete();
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