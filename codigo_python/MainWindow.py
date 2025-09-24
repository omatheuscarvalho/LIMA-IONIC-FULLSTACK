import cv2
import numpy as np
from PyQt5.QtWidgets import QApplication, QLabel, QFileDialog, QVBoxLayout, QWidget, QPushButton

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

class MainWindow(QWidget):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("Foliar - Python")
        self.layout = QVBoxLayout()
        self.label = QLabel("Selecione uma imagem")
        self.btn = QPushButton("Abrir imagem")
        self.btn.clicked.connect(self.open_image)
        self.layout.addWidget(self.label)
        self.layout.addWidget(self.btn)
        self.setLayout(self.layout)

    def open_image(self):
        fname, _ = QFileDialog.getOpenFileName(self, "Abrir Imagem", "", "Image Files (*.png *.jpg *.jpeg)")
        if fname:
            image = cv2.imread(fname)
            square, leaves, thresh = find_objects(image)
            for sq in square:
                cv2.polylines(image, [sq], True, (0,255,0), 3)
            for leaf in leaves:
                cv2.polylines(image, [leaf], True, (0,0,255), 3)
            max_width, max_height = 800, 600
            h, w = image.shape[:2]
            scale = min(max_width/w, max_height/h, 1.0)
            if scale < 1.0:
                new_size = (int(w*scale), int(h*scale))
                image = cv2.resize(image, new_size, interpolation=cv2.INTER_AREA)
            cv2.imshow("Resultado", image)
            cv2.waitKey(0)
            cv2.destroyAllWindows()

if __name__ == "__main__":
    app = QApplication([])
    window = MainWindow()
    window.show()
    app.exec_()