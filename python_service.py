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
    dx1 = pt1[0] - pt0[0]
    dy1 = pt1[1] - pt0[1]
    dx2 = pt2[0] - pt0[0]
    dy2 = pt2[1] - pt0[1]
    return (dx1*dx2 + dy1*dy2) / np.sqrt((dx1*dx1 + dy1*dy1)*(dx2*dx2 + dy2*dy2) + 1e-10)

def find_objects(image):
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    _, thresh = cv2.threshold(gray, 60, 255, cv2.THRESH_BINARY_INV | cv2.THRESH_OTSU)
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    square = []
    leaves = []
    for cnt in contours:
        auxper = cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, auxper*0.02, True)
        auxarea = abs(cv2.contourArea(cnt))
        if len(approx) == 4 and amin < auxarea < amax and cv2.isContourConvex(approx):
            max_cosine = 0
            for j in range(2, 5):
                cosine = abs(cosine_angle(approx[j%4][0], approx[j-2][0], approx[j-1][0]))
                max_cosine = max(max_cosine, cosine)
            if max_cosine < cosAngle:
                square.append(cnt)
            else:
                leaves.append(cnt)
        elif amin < auxarea < amax:
            leaves.append(cnt)
    return square, leaves, thresh

def analyze_image(base64_image, scale_area=1.0):
    try:
        # Decodificar a imagem base64
        image_data = base64.b64decode(base64_image)
        image = cv2.imdecode(np.frombuffer(image_data, np.uint8), cv2.IMREAD_COLOR)
        
        if image is None:
            return json.dumps({"error": "Não foi possível decodificar a imagem"})
        
        # Encontrar objetos na imagem
        squares, leaves, thresh = find_objects(image)
        
        # Calcular métricas para cada folha
        leaf_metrics = []
        areas = []
        perimeters = []
        widths = []
        lengths = []
        width_length_ratios = []
        
        for leaf in leaves:
            area = cv2.contourArea(leaf) * scale_area
            perimeter = cv2.arcLength(leaf, True)
            rect = cv2.boundingRect(leaf)
            w = rect[2]
            l = rect[3]
            width = min(w, l)
            length = max(w, l)
            width_length_ratio = width/length if length != 0 else 0
            
            areas.append(area)
            perimeters.append(perimeter)
            widths.append(width)
            lengths.append(length)
            width_length_ratios.append(width_length_ratio)
            
            leaf_metrics.append({
                "area": area,
                "perimeter": perimeter,
                "width": width,
                "length": length,
                "widthToLengthRatio": width_length_ratio
            })
        
        # Calcular métricas agregadas
        total_area = sum(areas) if areas else 0
        avg_area = np.mean(areas) if areas else 0
        std_area = np.std(areas) if areas else 0
        avg_width = np.mean(widths) if widths else 0
        std_width = np.std(widths) if widths else 0
        avg_length = np.mean(lengths) if lengths else 0
        std_length = np.std(lengths) if lengths else 0
        avg_perimeter = np.mean(perimeters) if perimeters else 0
        std_perimeter = np.std(perimeters) if perimeters else 0
        avg_width_length_ratio = np.mean(width_length_ratios) if width_length_ratios else 0
        
        # Criar resultado da análise
        result = {
            "numberOfLeaves": len(leaves),
            "leaves": leaf_metrics,
            "aggregatedMetrics": {
                "totalArea": total_area,
                "averageArea": avg_area,
                "standardDeviationArea": std_area,
                "averageWidth": avg_width,
                "standardDeviationWidth": std_width,
                "averageLength": avg_length,
                "standardDeviationLength": std_length,
                "averagePerimeter": avg_perimeter,
                "standardDeviationPerimeter": std_perimeter,
                "averageWidthToLengthRatio": avg_width_length_ratio
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
        
        return json.dumps(result)
    
    except Exception as e:
        return json.dumps({"error": str(e)})

# Função principal para processar argumentos da linha de comando
if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Ler a imagem base64 do primeiro argumento
        base64_image = sys.argv[1]
        
        # Ler a área de escala do segundo argumento (se fornecido)
        scale_area = 1.0
        if len(sys.argv) > 2:
            try:
                scale_area = float(sys.argv[2])
            except ValueError:
                pass
        
        # Analisar a imagem e imprimir o resultado JSON
        result = analyze_image(base64_image, scale_area)
        print(result)
    else:
        print(json.dumps({"error": "Nenhuma imagem fornecida"}))