import cv2
from MainWindow import find_objects
import numpy as np


image_path = 'folha_teste.jpg'
image = cv2.imread(image_path)
if image is None:
    print('Imagem não encontrada:', image_path)
else:
    squares, leaves, thresh = find_objects(image)
    print(f'Quadrados detectados: {len(squares)}')
    print(f'Folhas detectadas (antes da filtragem): {len(leaves)}')

    # --- Início da Correção ---

    # 1. Defina a área real do objeto de referência (ex: 1 cm²)
    # Este valor deve ser ajustado conforme o objeto de escala usado na imagem.
    real_area_square = 1.0  # em cm²
    
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
            scaling_factor_area = 1.0 # Fallback
 
        print(f"\nFatores de escala calculados (método C++ replicado):")
        print(f"  - Área: {scaling_factor_area:.8f} cm²/pixel²")
        print(f"  - Linear (via perímetro): {scaling_factor_linear:.8f} cm/pixel")

        # Remove o contorno do quadrado da lista de folhas, se ele estiver lá.
        leaves = [leaf for leaf in leaves if not np.array_equal(leaf, reference_square)]
    else:
        print("AVISO: Nenhum quadrado de referência foi detectado.")

    # --- Fim da Correção ---

    num_leaves = len(leaves)

    # Calcula as métricas em pixels
    areas = [cv2.contourArea(leaf) for leaf in leaves] # Áreas em pixels
    perimeters = [cv2.arcLength(leaf, True) for leaf in leaves] # Perímetros em pixels

    # Aplica os fatores de escala para obter valores em cm/cm² (se a calibração foi bem-sucedida)
    areas_cm = [area_px * scaling_factor_area for area_px in areas]
    perimeters_cm = [p_px * scaling_factor_linear for p_px in perimeters]

    widths = []
    lengths = []
    widlen = []
    for leaf in leaves:
        # Usar o contorno original (não suavizado) para todas as medições garante consistência.
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
        width_cm = min(w_px, l_px) * scaling_factor_linear
        length_cm = max(w_px, l_px) * scaling_factor_linear
        width = min(width_cm, length_cm)
        length = max(width_cm, length_cm)

        widths.append(width)
        lengths.append(length)
        widlen.append(width/length if length != 0 else 0)

    # Cálculos estatísticos
    sum_areas = sum(areas_cm)
    ave_width = np.mean(widths) if widths else 0
    ave_length = np.mean(lengths) if lengths else 0
    ave_area = np.mean(areas_cm) if areas_cm else 0
    ave_perimeter = np.mean(perimeters_cm) if perimeters_cm else 0
    std_width = np.std(widths) if widths else 0
    std_length = np.std(lengths) if lengths else 0
    std_area = np.std(areas_cm) if areas_cm else 0
    std_perimeter = np.std(perimeters_cm) if perimeters_cm else 0

    print(f"\n--- Resultados da Análise ---")
    print(f"\nNúmero de folhas: {num_leaves}")
    for i in range(num_leaves): # Itera sobre cada folha detectada
        print(f"Folha {i+1}:")
        print(f"  Área: {areas_cm[i]:.5f} cm²") # 5 casas decimais
        print(f"  Perímetro: {perimeters_cm[i]:.5f} cm") # 5 casas decimais
        print(f"  Largura: {widths[i]:.5f} cm") # 5 casas decimais
        print(f"  Comprimento: {lengths[i]:.5f} cm") # 5 casas decimais
        print(f"  Relação L/C: {widlen[i]:.6f}\n") # 6 casas decimais

    print(f"--- Resultados Agregados ---")
    print(f"Soma das áreas: {sum_areas:.5f} cm²") # 5 casas decimais
    print(f"Média largura: {ave_width:.5f} (desvio: {std_width:.5f}) cm") # 5 casas decimais
    print(f"Média comprimento: {ave_length:.5f} (desvio: {std_length:.5f}) cm") # 5 casas decimais
    print(f"Média área: {ave_area:.5f} (desvio: {std_area:.5f}) cm²") # 5 casas decimais
    print(f"Média perímetro: {ave_perimeter:.5f} (desvio: {std_perimeter:.5f}) cm") # 5 casas decimais

    # Imagem binarizada
    cv2.imshow('Thresh', thresh)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
