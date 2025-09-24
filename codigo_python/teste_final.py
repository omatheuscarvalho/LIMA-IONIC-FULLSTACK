
import cv2
import numpy as np

# --- DEFINIÇÕES E CONSTANTES ---
# !! IMPORTANTE !! Coloque aqui o nome da imagem do seu teste
IMAGE_PATH = 'folha_teste.jpg' 
REAL_AREA_SQUARE_CM = 1.0  # Área real do quadrado de referência em cm²

# Constantes do algoritmo C++ original
amin = 1000
amax = 10000000000
cosAngle = 0.3

# --- FUNÇÕES AUXILIARES ---

def cosine_angle(pt1, pt2, pt0):
    """Calcula o cosseno do ângulo entre três pontos."""
    # Usa inteiros de 64 bits para evitar o 'overflow warning'
    dx1 = np.int64(pt1[0]) - np.int64(pt0[0])
    dy1 = np.int64(pt1[1]) - np.int64(pt0[1])
    dx2 = np.int64(pt2[0]) - np.int64(pt0[0])
    dy2 = np.int64(pt2[1]) - np.int64(pt0[1])
    
    denominator = np.sqrt(float((dx1*dx1 + dy1*dy1) * (dx2*dx2 + dy2*dy2))) + 1e-10
    if denominator == 0: return 1.0
    return float(dx1 * dx2 + dy1 * dy2) / denominator

def find_objects(image):
    """Encontra os contornos de quadrados e folhas."""
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    squares = []
    leaves = []
    for cnt in contours:
        auxper = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, auxper * 0.02, True)
        auxarea = abs(cv2.contourArea(cnt))
        
        if amin < auxarea < amax:
            if len(approx) == 4 and cv2.isContourConvex(approx):
                max_cosine = 0
                for j in range(2, 5):
                    cosine = abs(cosine_angle(approx[j % 4][0], approx[j - 2][0], approx[j - 1][0]))
                    max_cosine = max(max_cosine, cosine)
                if max_cosine < cosAngle:
                    squares.append(cnt)
                else:
                    leaves.append(cnt)
            else:
                leaves.append(cnt)
    return squares, leaves

# --- SCRIPT PRINCIPAL ---

print("--- INICIANDO ANÁLISE FINAL v3 (Versão Corrigida) ---")
image = cv2.imread(IMAGE_PATH)

if image is None:
    print(f"ERRO: Imagem não encontrada em '{IMAGE_PATH}'")
else:
    squares, leaves = find_objects(image)
    print(f"Objetos encontrados: {len(squares)} quadrados, {len(leaves)} folhas.")

    leaves.sort(key=lambda c: cv2.contourArea(c), reverse=True)
    
    if not squares or not leaves:
        print("ERRO: Análise não pôde ser concluída.")
    else:
        reference_square = squares[0]
        leaf_to_measure = leaves[0]

        # --- 1. CÁLCULO DE ESCALA ---
        pixels_per_square = cv2.arcLength(reference_square, True)
        scaling_factor_linear = np.sqrt(REAL_AREA_SQUARE_CM) / (pixels_per_square / 4.0)
        
        pixels_area_square = cv2.contourArea(reference_square)
        scaling_factor_area = REAL_AREA_SQUARE_CM / pixels_area_square

        print(f"\nFator de Escala Linear (via Perímetro): {scaling_factor_linear:.8f} cm/pixel")

        # --- 2. MEDIÇÃO (com precisão de 64 bits) ---
        data_pts = leaf_to_measure.reshape(-1, 2).astype(np.float64)

        manual_mean = np.mean(data_pts, axis=0)
        _, eigenvectors, _ = cv2.PCACompute2(data_pts, mean=None)
        
        translated_pts = data_pts - manual_mean
        rotated_pts = translated_pts @ eigenvectors
        
        # ## A CORREÇÃO FINAL ESTÁ AQUI ##
        # Converte os pontos para float32 ANTES de passar para a função boundingRect
        rotated_pts_for_bounding = rotated_pts.astype(np.float32)
        x, y, w, h = cv2.boundingRect(rotated_pts_for_bounding)
        
        w_px, l_px = w, h
        print(f"Medidas em Pixels (L/A pós-rotação): Largura={w_px}, Altura={l_px}")

        # --- 3. RESULTADOS FINAIS ---
        final_width_cm = min(w_px, l_px) * scaling_factor_linear
        final_length_cm = max(w_px, l_px) * scaling_factor_linear
        
        final_area_cm = cv2.contourArea(leaf_to_measure) * scaling_factor_area
        final_perimeter_cm = cv2.arcLength(leaf_to_measure, True) * scaling_factor_linear

        print("\n--- RESULTADO FINAL DA ANÁLISE v3 ---")
        print(f"Largura Final:     {final_width_cm:.5f} cm   (Alvo: 4.0551)")
        print(f"Comprimento Final: {final_length_cm:.5f} cm   (Alvo: 6.35622)")
        print(f"Área Final:        {final_area_cm:.5f} cm²  (Alvo: 14.9103)")
        print(f"Perímetro Final:   {final_perimeter_cm:.5f} cm   (Alvo: 17.5524)")