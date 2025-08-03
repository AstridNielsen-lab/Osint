from flask import Blueprint, request, jsonify
import whois
import requests
import re
import json
import time
from datetime import datetime
import logging

osint_bp = Blueprint('osint', __name__)

# Configuração da API Gemini
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent"
GEMINI_API_KEY = "AIzaSyDNSDXAocB4YPm4kY6v9L9C9OtJkQ1y-Uk"

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def clean_domain(url_or_domain):
    """Limpa e extrai o domínio de uma URL ou domínio"""
    # Remove protocolo se presente
    domain = re.sub(r'^https?://', '', url_or_domain)
    # Remove www se presente
    domain = re.sub(r'^www\.', '', domain)
    # Remove path se presente
    domain = domain.split('/')[0]
    # Remove porta se presente
    domain = domain.split(':')[0]
    return domain.lower()

def get_whois_data(domain):
    """Obtém dados WHOIS de um domínio"""
    try:
        logger.info(f"Buscando WHOIS para: {domain}")
        w = whois.whois(domain)
        
        # Converte dados para formato serializável
        whois_data = {}
        for key, value in w.items():
            if value is not None:
                if isinstance(value, list):
                    whois_data[key] = [str(v) for v in value if v is not None]
                elif isinstance(value, datetime):
                    whois_data[key] = value.isoformat()
                else:
                    whois_data[key] = str(value)
        
        return whois_data
    except Exception as e:
        logger.error(f"Erro ao buscar WHOIS: {str(e)}")
        return {"error": f"Erro ao buscar WHOIS: {str(e)}"}

def extract_info_from_whois(whois_data):
    """Extrai informações relevantes dos dados WHOIS"""
    extracted = {
        "emails": [],
        "names": [],
        "phones": [],
        "addresses": [],
        "organizations": []
    }
    
    # Lista de campos que podem conter informações pessoais
    fields_to_check = [
        'registrant_name', 'registrant_email', 'registrant_phone',
        'registrant_address', 'registrant_city', 'registrant_state',
        'registrant_country', 'registrant_postal_code',
        'admin_name', 'admin_email', 'admin_phone',
        'tech_name', 'tech_email', 'tech_phone',
        'billing_name', 'billing_email', 'billing_phone',
        'registrar', 'org', 'organization'
    ]
    
    for field in fields_to_check:
        if field in whois_data and whois_data[field]:
            value = whois_data[field]
            if isinstance(value, list):
                value = value[0] if value else ""
            
            # Extrai emails
            if 'email' in field or '@' in str(value):
                emails = re.findall(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', str(value))
                extracted["emails"].extend(emails)
            
            # Extrai nomes
            elif 'name' in field and value and not '@' in str(value):
                extracted["names"].append(str(value))
            
            # Extrai telefones
            elif 'phone' in field and value:
                phones = re.findall(r'[\+]?[1-9]?[\d\s\-\(\)]{7,15}', str(value))
                extracted["phones"].extend(phones)
            
            # Extrai organizações
            elif any(org_field in field for org_field in ['org', 'registrar']):
                extracted["organizations"].append(str(value))
            
            # Extrai endereços
            elif any(addr_field in field for addr_field in ['address', 'city', 'state', 'country']):
                extracted["addresses"].append(str(value))
    
    # Remove duplicatas
    for key in extracted:
        extracted[key] = list(set(filter(None, extracted[key])))
    
    return extracted

def analyze_with_gemini(data):
    """Analisa os dados coletados usando a API Gemini"""
    try:
        prompt = f"""
        Analise os seguintes dados OSINT coletados de forma pública e legal:
        
        {json.dumps(data, indent=2, ensure_ascii=False)}
        
        Forneça uma análise profissional incluindo:
        1. Resumo dos dados encontrados
        2. Possíveis conexões entre as informações
        3. Recomendações de segurança
        4. Observações sobre a exposição de dados
        
        Mantenha um tom profissional e ético, lembrando que todos os dados são públicos.
        """
        
        headers = {
            'Content-Type': 'application/json',
        }
        
        payload = {
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }]
        }
        
        response = requests.post(
            f"{GEMINI_API_URL}?key={GEMINI_API_KEY}",
            headers=headers,
            json=payload,
            timeout=30
        )
        
        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                return result['candidates'][0]['content']['parts'][0]['text']
        
        return "Análise não disponível no momento."
        
    except Exception as e:
        logger.error(f"Erro na análise Gemini: {str(e)}")
        return f"Erro na análise: {str(e)}"

@osint_bp.route('/analyze', methods=['POST'])
def analyze_domain():
    """Endpoint principal para análise OSINT"""
    try:
        data = request.get_json()
        if not data or 'domain' not in data:
            return jsonify({"error": "Domínio não fornecido"}), 400
        
        domain = clean_domain(data['domain'])
        
        # Validação básica de domínio
        if not re.match(r'^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$', domain):
            return jsonify({"error": "Formato de domínio inválido"}), 400
        
        logger.info(f"Iniciando análise OSINT para: {domain}")
        
        # Coleta dados WHOIS
        whois_data = get_whois_data(domain)
        
        if "error" in whois_data:
            return jsonify({"error": whois_data["error"]}), 500
        
        # Extrai informações relevantes
        extracted_info = extract_info_from_whois(whois_data)
        
        # Análise com Gemini
        gemini_analysis = analyze_with_gemini({
            "domain": domain,
            "whois_data": whois_data,
            "extracted_info": extracted_info
        })
        
        # Monta resultado final
        result = {
            "domain": domain,
            "timestamp": datetime.now().isoformat(),
            "whois_data": whois_data,
            "extracted_info": extracted_info,
            "gemini_analysis": gemini_analysis,
            "disclaimer": "Todas as informações foram coletadas de fontes públicas e não violam políticas de privacidade."
        }
        
        logger.info(f"Análise concluída para: {domain}")
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Erro na análise: {str(e)}")
        return jsonify({"error": f"Erro interno: {str(e)}"}), 500

@osint_bp.route('/health', methods=['GET'])
def health_check():
    """Endpoint de verificação de saúde"""
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})

