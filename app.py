import os
from flask import Flask, send_from_directory, request, jsonify
from flask_cors import CORS

# Configuração do Flask
app = Flask(__name__, static_folder='src/static', static_url_path='')
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Habilita CORS para todos os domínios
CORS(app)

# Rota principal que serve o index.html
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# Rota para servir arquivos estáticos
@app.route('/<path:path>')
def serve_static(path):
    try:
        return send_from_directory(app.static_folder, path)
    except:
        # Se o arquivo não for encontrado, retorna o index.html (para SPAs)
        return send_from_directory(app.static_folder, 'index.html')

# API routes
@app.route('/api/test', methods=['GET'])
def test_api():
    return jsonify({"status": "success", "message": "API está funcionando!"})

@app.route('/api/osint/analyze', methods=['POST'])
def analyze_domain():
    try:
        data = request.get_json()
        domain = data.get('domain', '')
        
        if not domain:
            return jsonify({"error": "Domínio não fornecido"}), 400
        
        # Simulação de análise OSINT
        # Em produção, aqui seria implementada a lógica real de análise
        result = {
            "domain": domain,
            "status": "analyzed",
            "whois": {
                "registrar": "Exemplo Registrar",
                "created": "2020-01-01",
                "expires": "2025-01-01",
                "nameservers": ["ns1.example.com", "ns2.example.com"]
            },
            "analysis": {
                "security_score": 85,
                "recommendations": [
                    "Verificar configurações de DNS",
                    "Monitorar certificados SSL",
                    "Revisar políticas de privacidade"
                ]
            }
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# Para desenvolvimento local
if __name__ == '__main__':
    app.run(debug=True)

# Para Vercel - exporta a aplicação
app = app
