import cv2
from MainWindow import find_objects # Importa a função `find_objects`
import numpy as np

# Certifique-se de que o nome do arquivo de imagem está correto
IMAGE_PATH = 'folha_teste.jpg'
REAL_AREA_SQUARE_CM = 1.0  # Área real do quadrado de referência em cm²

print("--- INICIANDO SCRIPT DE DEPURAÇÃO ---")

image = cv2.imread(IMAGE_PATH)

if image is None:
    print(f"ERRO CRÍTICO: A imagem não foi encontrada no caminho: '{IMAGE_PATH}'")
else:
    print(f"Imagem '{IMAGE_PATH}' carregada com sucesso.")
    # A função find_objects já está alinhada com a lógica C++
    squares, leaves, _ = find_objects(image)
    print(f"Função find_objects executada: {len(squares)} quadrados e {len(leaves)} folhas detectadas.")

    if not squares:
        print("ERRO CRÍTICO: Nenhum quadrado de referência foi encontrado. A análise não pode continuar.")
    elif not leaves:
        print("AVISO: Nenhum contorno de folha foi encontrado para medir.")
    else:
        # Usa o primeiro quadrado e a primeira folha para a análise de depuração
        reference_square = squares[0]
        leaf_to_debug = leaves[0]

        print("\n--- PASSO 1: ANÁLISE DO QUADRADO DE REFERÊNCIA (em pixels) ---")
        area_px_sq = cv2.contourArea(reference_square)
        perimeter_px_sq = cv2.arcLength(reference_square, True)
        print(f"Área Bruta do Quadrado (pixels²): {area_px_sq}")
        print(f"Perímetro Bruto do Quadrado (pixels): {perimeter_px_sq}")

        print("\n--- PASSO 2: COMPARAÇÃO DOS FATORES DE ESCALA LINEAR ---")
        # Método A: Baseado em Área (Lógica original do Python, mais robusta)
        scale_linear_from_area = np.sqrt(REAL_AREA_SQUARE_CM / area_px_sq)
        print(f"Fator de Escala Linear (cálculo via Área):   {scale_linear_from_area:.8f} cm/pixel")

        # Método B: Baseado em Perímetro (Lógica exata do C++)
        pixels_side_square = perimeter_px_sq / 4.0
        real_side_square = np.sqrt(REAL_AREA_SQUARE_CM)
        scale_linear_from_perimeter = real_side_square / pixels_side_square
        print(f"Fator de Escala Linear (cálculo via Perímetro): {scale_linear_from_perimeter:.8f} cm/pixel")

        print("\n--- PASSO 3: COMPARAÇÃO DA MEDIÇÃO L/A DA FOLHA (em pixels) ---")
        data_pts = leaf_to_debug.reshape(-1, 2).astype(np.float32)
        mean, eigenvectors, _ = cv2.PCACompute2(data_pts, mean=None)

        # Método A: Rotação em torno da Origem (0,0) (Lógica Python anterior)
        # Usamos cv2.transform, que rotaciona em torno da origem
        transformed_pts_origin_rot = cv2.transform(np.array([data_pts]), eigenvectors.T)
        x_o, y_o, w_o, h_o = cv2.boundingRect(transformed_pts_origin_rot[0])
        print(f"L/A em pixels (Rotação na Origem 0,0):     Largura={w_o}, Altura={h_o}")

        # Método B: Rotação em torno do Centroide (Lógica exata do C++)
        translated_pts = data_pts - mean
        rotated_pts_centroid = translated_pts @ eigenvectors
        x_c, y_c, w_c, h_c = cv2.boundingRect(rotated_pts_centroid)
        print(f"L/A em pixels (Rotação no Centroide):      Largura={w_c}, Altura={h_c}")

        print("\n--- PASSO 4: RESULTADO FINAL (usando Lógica 100% C++) ---")
        # Usamos os valores do Método B (Perímetro) e Método B (Centroide)
        final_width_px = min(w_c, h_c)
        final_length_px = max(w_c, h_c)
        final_scaling_factor = scale_linear_from_perimeter

        final_width_cm = final_width_px * final_scaling_factor
        final_length_cm = final_length_px * final_scaling_factor

        print(f"Cálculo: (Largura em Pixels {final_width_px}) * (Fator de Escala {final_scaling_factor:.8f})")
        print(f"Resultado Largura Final (cm): {final_width_cm:.5f}")
        
        print(f"Cálculo: (Comprimento em Pixels {final_length_px}) * (Fator de Escala {final_scaling_factor:.8f})")
        print(f"Resultado Comprimento Final (cm): {final_length_cm:.5f}")
        
        print("\n--- FIM DO SCRIPT DE DEPURAÇÃO ---")