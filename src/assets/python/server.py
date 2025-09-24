# server.py
from flask import Flask, request, Response
from flask_cors import CORS
import json

# Importa a função de análise do seu script principal
from python_service import analyze_image

app = Flask(__name__)
# Habilita o CORS para permitir que seu app Ionic se conecte
CORS(app)

@app.route('/analyze', methods=['POST'])
def analyze_endpoint():
    print("\n>>> Requisição de análise recebida do aplicativo! <<<", flush=True)

    data = request.get_json()
    if not data or 'base64_image' not in data:
        return Response(json.dumps({"error": "Nenhuma imagem em base64 fornecida"}), status=400, mimetype='application/json')

    base64_image = data['base64_image']
    scale_area = data.get('real_area_square', 1.0)

    # A função analyze_image já retorna uma string JSON, então podemos retorná-la diretamente
    result_json_string = analyze_image(base64_image, scale_area)

    return Response(result_json_string, status=200, mimetype='application/json')

if __name__ == '__main__':
    print(">>> Servidor de análise L.I.M.A. rodando em http://127.0.0.1:5000 <<<")
    print(">>> Deixe este terminal aberto e inicie o aplicativo Ionic em outro terminal. <<<")
    app.run(host='0.0.0.0', port=5000, debug=True)
