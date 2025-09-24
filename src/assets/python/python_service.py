import cv2
import numpy as np
import base64
import json
import sys
from io import BytesIO
from PIL import Image

# Constantes do algoritmo original
amin = 1000
amax = 10000000000
cosAngle = 0.3

def cosine_angle(pt1, pt2, pt0):
    # Usa inteiros de 64 bits para evitar o 'overflow warning'
    dx1 = np.int64(pt1[0]) - np.int64(pt0[0])
    dy1 = np.int64(pt1[1]) - np.int64(pt0[1])
    dx2 = np.int64(pt2[0]) - np.int64(pt0[0])
    dy2 = np.int64(pt2[1]) - np.int64(pt0[1])
    
    denominator = np.sqrt(float((dx1*dx1 + dy1*dy1) * (dx2*dx2 + dy2*dy2))) + 1e-10
    if denominator == 0: return 1.0 # Evita divisão por zero
    return float(dx1 * dx2 + dy1 * dy2) / denominator

def find_objects(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    # Alinhado com o C++: Threshold de Otsu imediatamente após a conversão para escala de cinza.
    # O valor 60 no C++ é ignorado quando THRESH_OTSU é usado, então usar 0 aqui está correto.
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)

    # Alinhado com o C++: Usa RETR_LIST para obter todos os contornos, incluindo internos.
    # Isso é crucial para replicar o comportamento exato do C++.
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    square = []
    leaves = []

    for cnt in contours:
        auxper = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, auxper*0.02, True)
        auxarea = abs(cv2.contourArea(cnt))
        # Lógica de classificação alinhada com o LIMA-Desktop original
        if len(approx) == 4 and amin < auxarea < amax and cv2.isContourConvex(approx):
            max_cosine = 0
            for j in range(2, 5):
                cosine = abs(cosine_angle(approx[j%4][0], approx[j-2][0], approx[j-1][0]))
                max_cosine = max(max_cosine, cosine)
            if max_cosine < cosAngle:
                square.append(cnt) # É um quadrado
            else:
                leaves.append(cnt) # É uma forma de 4 lados, mas não um quadrado, então é uma folha
        elif amin < auxarea < amax:
            leaves.append(cnt) # Não tem 4 lados, então é uma folha

    return square, leaves, thresh

def analyze_image(base64_image, real_area_square=1.0):
    try:
        # Decodificar a imagem base64
        image_data = base64.b64decode(base64_image)
        image = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)

        if image is None:
            return json.dumps({"error": "Não foi possível decodificar a imagem"})

        # Encontrar objetos na imagem
        squares, leaves, thresh = find_objects(image)

        # Lógica de calibração e escala
        scaling_factor_area = 1.0
        scaling_factor_linear = 1.0
        if squares:
            reference_square = squares[0]

            # --- LÓGICA DE ESCALA 100% ALINHADA COM O C++ ---
            # 1. Fator de escala LINEAR (baseado no PERÍMETRO)
            pixels_per_square = cv2.arcLength(reference_square, True)
            real_side_square = np.sqrt(real_area_square)
            scaling_factor_linear = real_side_square / (pixels_per_square / 4.0)

            # 2. Fator de escala de ÁREA (baseado na ÁREA DO CONTORNO)
            pixels_area_square = cv2.contourArea(reference_square)
            if pixels_area_square > 0:
                scaling_factor_area = real_area_square / pixels_area_square
        else:
            print("AVISO: Nenhum quadrado de referência foi detectado. Todas as formas são tratadas como folhas.", file=sys.stderr)

        # Calcular métricas para cada folha (após a calibração)
        leaf_metrics = []
        all_areas_cm = []
        all_perimeters_cm = []
        all_widths_cm = []
        all_lengths_cm = []
        all_ratios = []

        # Ordenar folhas por área (da maior para a menor) para consistência
        # leaves.sort(key=cv2.contourArea, reverse=True) # Removido para alinhar com a lógica C++ que não ordena explicitamente aqui

        for i, leaf in enumerate(leaves):
            # Medidas em pixels
            area_px = cv2.contourArea(leaf)

            # Usar o contorno original (não suavizado) para todas as medições garante consistência.
            perimeter_px = cv2.arcLength(leaf, True)

            # CÓDIGO FINAL E CORRIGIDO
            # --- Lógica de PCA para Largura/Comprimento (Com cálculo manual do centroide) ---
            if len(leaf) >= 5: # PCA requer um número mínimo de pontos
                # Usa np.float64 para corresponder ao 'double' do C++
                data_pts = leaf.reshape(-1, 2).astype(np.float64)

                manual_mean = np.mean(data_pts, axis=0)
                _, eigenvectors, _ = cv2.PCACompute2(data_pts, mean=None)
                
                translated_pts = data_pts - manual_mean
                rotated_pts = translated_pts @ eigenvectors
                
                # ## CORREÇÃO CRÍTICA ##
                # Converte os pontos para float32 ANTES de passar para a função boundingRect
                rotated_pts_for_bounding = rotated_pts.astype(np.float32)
                x, y, w, h = cv2.boundingRect(rotated_pts_for_bounding)
                
                w_px, l_px = w, h
            else: # Fallback para contornos muito pequenos
                rect_rot = cv2.minAreaRect(leaf)
                (w_px, l_px) = rect_rot[1]

            # Aplica o fator de escala linear (calculado via perímetro para alinhar com o C++)
            area_cm = area_px * scaling_factor_area
            perimeter_cm = perimeter_px * scaling_factor_linear
            width_cm = min(w_px, l_px) * scaling_factor_linear
            length_cm = max(w_px, l_px) * scaling_factor_linear
            ratio = width_cm / length_cm if length_cm != 0 else 0

            # Adiciona as métricas calculadas
            all_areas_cm.append(area_cm)
            all_perimeters_cm.append(perimeter_cm)
            all_widths_cm.append(width_cm)
            all_lengths_cm.append(length_cm)
            all_ratios.append(ratio)

            leaf_metrics.append({
                "id": i + 1, # ID da folha
                "area": round(area_cm, 4), # 4 casas decimais
                "perimeter": round(perimeter_cm, 4), # 4 casas decimais
                "width": round(width_cm, 4), # 4 casas decimais
                "length": round(length_cm, 5), # 5 casas decimais
                "widthToLengthRatio": round(ratio, 6)
            })

        # Calcular métricas agregadas
        num_leaves = len(leaves)
        total_area = sum(all_areas_cm)
        avg_area = np.mean(all_areas_cm) if num_leaves > 0 else 0
        std_area = np.std(all_areas_cm) if num_leaves > 0 else 0
        avg_perimeter = np.mean(all_perimeters_cm) if num_leaves > 0 else 0
        std_perimeter = np.std(all_perimeters_cm) if num_leaves > 0 else 0
        avg_width = np.mean(all_widths_cm) if num_leaves > 0 else 0
        std_width = np.std(all_widths_cm) if num_leaves > 0 else 0
        avg_length = np.mean(all_lengths_cm) if num_leaves > 0 else 0
        std_length = np.std(all_lengths_cm) if num_leaves > 0 else 0
        avg_ratio = np.mean(all_ratios) if num_leaves > 0 else 0

        # Criar resultado da análise
        result = {
            "numberOfLeaves": num_leaves,
            "leaves": leaf_metrics,
            "aggregatedMetrics": {
                "totalArea": total_area,
                "averageArea": avg_area,
                "standardDeviationArea": std_area,
                "averagePerimeter": avg_perimeter,
                "standardDeviationPerimeter": std_perimeter,
                "averageWidth": avg_width,
                "standardDeviationWidth": std_width,
                "averageLength": avg_length,
                "standardDeviationLength": std_length,
                "averageWidthToLengthRatio": avg_ratio
            }
        }

        # Gerar imagem com contornos para visualização
        for leaf in leaves:
            cv2.polylines(image, [leaf], True, (0, 0, 255), 2)
        for sq in squares:
            cv2.polylines(image, [sq], True, (0, 255, 0), 2)

        # Converter imagem processada para base64
        _, buffer = cv2.imencode('.png', image)
        processed_image_base64 = base64.b64encode(buffer).decode('utf-8')

        # Adicionar imagem processada ao resultado
        result["processedImage"] = processed_image_base64

        # --- INÍCIO DO LOG PARA O TERMINAL ---
        # Imprime um resumo legível no terminal (stderr) sem afetar a saída JSON (stdout).
        print("--- LOG DA ANÁLISE (python_service.py) ---", file=sys.stderr)
        print(f"Número de folhas detectadas: {num_leaves}", file=sys.stderr)
        if squares:
            print(f"Quadrado de referência detectado. Fator de escala linear: {scaling_factor_linear:.6f}", file=sys.stderr)
        else:
            print("AVISO: Nenhum quadrado de referência detectado. Medidas em pixels.", file=sys.stderr)

        for metric in leaf_metrics:
            print(f"\nFolha {metric['id']}:", file=sys.stderr)
            print(f"  - Área: {metric['area']:.4f} cm²", file=sys.stderr) # 4 casas decimais
            print(f"  - Perímetro: {metric['perimeter']:.4f} cm", file=sys.stderr) # 4 casas decimais
            print(f"  - Largura: {metric['width']:.4f} cm", file=sys.stderr) # 4 casas decimais
            print(f"  - Comprimento: {metric['length']:.5f} cm", file=sys.stderr) # 5 casas decimais

        if num_leaves > 0:
            print("\nResultados Agregados:", file=sys.stderr)
            print(f"  - Soma das Áreas: {total_area:.4f} cm²", file=sys.stderr) # 4 casas decimais
            print(f"  - Média da Área: {avg_area:.4f} cm²", file=sys.stderr) # 4 casas decimais
        print("--- FIM DO LOG ---", file=sys.stderr, flush=True)
        # --- FIM DO LOG ---

        return json.dumps(result)

    except Exception as e:
        # Adiciona um log detalhado em caso de erro para facilitar a depuração.
        # Isso garante que, se o script falhar, a causa do erro seja impressa no terminal.
        import traceback
        print("--- ERRO DURANTE A EXECUÇÃO DO SCRIPT PYTHON ---", file=sys.stderr)
        print(f"Exceção: {str(e)}", file=sys.stderr, flush=True)
        traceback.print_exc(file=sys.stderr)
        return json.dumps({"error": f"Erro no servidor Python: {str(e)}"})

# Função principal para processar argumentos da linha de comando
if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Ler a imagem base64 do primeiro argumento
        base64_image = sys.argv[1]

        # Ler a área de escala do segundo argumento (se fornecido)
        real_area_square = 1.0
        if len(sys.argv) > 2:
            try:
                real_area_square = float(sys.argv[2])
            except ValueError:
                pass

        # Analisar a imagem e imprimir o resultado JSON
        result = analyze_image(base64_image, real_area_square)
        print(result)
    else:
        print(json.dumps({"error": "Nenhuma imagem fornecida"}))