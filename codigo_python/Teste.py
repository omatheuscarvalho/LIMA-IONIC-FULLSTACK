import cv2
from MainWindow import find_objects


image_path = 'folha_teste.jpg'
image = cv2.imread(image_path)
if image is None:
    print('Imagem não encontrada:', image_path)
else:
    squares, leaves, thresh = find_objects(image)
    print(f'Quadrados detectados: {len(squares)}')
    print(f'Folhas detectadas: {len(leaves)}')

   
    for i, sq in enumerate(squares):
        rect = cv2.boundingRect(sq)
        w = rect[2]
        l = rect[3]
        area = cv2.contourArea(sq)
        print(f"Quadrado {i+1}: largura={w}, comprimento={l}, área={area:.2f}")

    
    import numpy as np
    num_leaves = len(leaves)
    areas = [cv2.contourArea(leaf) for leaf in leaves]
    perimeters = [cv2.arcLength(leaf, True) for leaf in leaves]
    widths = []
    lengths = []
    widlen = []
    for leaf in leaves:
        rect = cv2.boundingRect(leaf)
        w = rect[2]
        l = rect[3]
        width = min(w, l)
        length = max(w, l)
        widths.append(width)
        lengths.append(length)
        widlen.append(width/length if length != 0 else 0)

    sum_areas = sum(areas)
    ave_width = np.mean(widths) if widths else 0
    ave_length = np.mean(lengths) if lengths else 0
    ave_area = np.mean(areas) if areas else 0
    ave_perimeter = np.mean(perimeters) if perimeters else 0
    std_width = np.std(widths) if widths else 0
    std_length = np.std(lengths) if lengths else 0
    std_area = np.std(areas) if areas else 0
    std_perimeter = np.std(perimeters) if perimeters else 0

    print(f"\nNúmero de folhas: {num_leaves}")
    for i in range(num_leaves):
        print(f"Folha {i+1}:\n  Área: {areas[i]:.2f}\n  Perímetro: {perimeters[i]:.2f}\n  Largura: {widths[i]:.2f}\n  Comprimento: {lengths[i]:.2f}\n  Largura/Comprimento: {widlen[i]:.2f}\n")
    print(f"Soma das áreas: {sum_areas:.2f}")
    print(f"Média largura: {ave_width:.2f} (desvio: {std_width:.2f})")
    print(f"Média comprimento: {ave_length:.2f} (desvio: {std_length:.2f})")
    print(f"Média área: {ave_area:.2f} (desvio: {std_area:.2f})")
    print(f"Média perímetro: {ave_perimeter:.2f} (desvio: {std_perimeter:.2f})")

    # Imagem binarizada
    cv2.imshow('Thresh', thresh)
    cv2.waitKey(0)
    cv2.destroyAllWindows()
    
    import numpy as np
    num_leaves = len(leaves)
    areas = [cv2.contourArea(leaf) for leaf in leaves]
    perimeters = [cv2.arcLength(leaf, True) for leaf in leaves]
    widths = []
    lengths = []
    widlen = []
    for leaf in leaves:
        rect = cv2.boundingRect(leaf)
        w = rect[2]
        l = rect[3]
        width = min(w, l)
        length = max(w, l)
        widths.append(width)
        lengths.append(length)
        widlen.append(width/length if length != 0 else 0)

    sum_areas = sum(areas)
    ave_width = np.mean(widths) if widths else 0
    ave_length = np.mean(lengths) if lengths else 0
    ave_area = np.mean(areas) if areas else 0
    ave_perimeter = np.mean(perimeters) if perimeters else 0
    std_width = np.std(widths) if widths else 0
    std_length = np.std(lengths) if lengths else 0
    std_area = np.std(areas) if areas else 0
    std_perimeter = np.std(perimeters) if perimeters else 0

    print(f"\nNúmero de folhas: {num_leaves}")
    for i in range(num_leaves):
        print(f"Folha {i+1}:\n  Área: {areas[i]:.2f}\n  Perímetro: {perimeters[i]:.2f}\n  Largura: {widths[i]:.2f}\n  Comprimento: {lengths[i]:.2f}\n  Largura/Comprimento: {widlen[i]:.2f}\n")
    print(f"Soma das áreas: {sum_areas:.2f}")
    print(f"Média largura: {ave_width:.2f} (desvio: {std_width:.2f})")
    print(f"Média comprimento: {ave_length:.2f} (desvio: {std_length:.2f})")
    print(f"Média área: {ave_area:.2f} (desvio: {std_area:.2f})")
    print(f"Média perímetro: {ave_perimeter:.2f} (desvio: {std_perimeter:.2f})")
