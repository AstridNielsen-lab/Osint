// Variáveis globais
let currentAnalysis = null;
let progressInterval = null;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    setupFormValidation();
});

// Configurar event listeners
function initializeEventListeners() {
    const searchBtn = document.getElementById('searchBtn');
    const domainInput = document.getElementById('domainInput');
    
    // Botão de busca
    searchBtn.addEventListener('click', handleSearch);
    
    // Enter no input
    domainInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });
    
    // Validação em tempo real
    domainInput.addEventListener('input', validateInput);
}

// Configurar validação do formulário
function setupFormValidation() {
    const domainInput = document.getElementById('domainInput');
    const inputGroup = domainInput.parentElement;
    
    domainInput.addEventListener('blur', function() {
        const domain = cleanDomain(this.value);
        if (domain && !isValidDomain(domain)) {
            inputGroup.classList.add('error');
            inputGroup.classList.remove('success');
        } else if (domain) {
            inputGroup.classList.add('success');
            inputGroup.classList.remove('error');
        } else {
            inputGroup.classList.remove('error', 'success');
        }
    });
}

// Validar input em tempo real
function validateInput() {
    const domainInput = document.getElementById('domainInput');
    const inputGroup = domainInput.parentElement;
    const domain = cleanDomain(domainInput.value);
    
    if (domain.length > 0) {
        if (isValidDomain(domain)) {
            inputGroup.classList.add('success');
            inputGroup.classList.remove('error');
        } else {
            inputGroup.classList.add('error');
            inputGroup.classList.remove('success');
        }
    } else {
        inputGroup.classList.remove('error', 'success');
    }
}

// Limpar e validar domínio
function cleanDomain(input) {
    if (!input) return '';
    
    // Remove protocolo
    let domain = input.replace(/^https?:\\/\\//, '');
    // Remove www
    domain = domain.replace(/^www\\./, '');
    // Remove path
    domain = domain.split('/')[0];
    // Remove porta
    domain = domain.split(':')[0];
    
    return domain.toLowerCase().trim();
}

// Validar formato do domínio
function isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}$/;
    return domainRegex.test(domain);
}

// Definir exemplo de domínio
function setExample(domain) {
    const domainInput = document.getElementById('domainInput');
    domainInput.value = domain;
    validateInput();
    domainInput.focus();
}

// Manipular busca
async function handleSearch() {
    const domainInput = document.getElementById('domainInput');
    const domain = cleanDomain(domainInput.value);
    
    if (!domain) {
        showError('Por favor, digite um domínio válido.');
        return;
    }
    
    if (!isValidDomain(domain)) {
        showError('Formato de domínio inválido. Use o formato: exemplo.com');
        return;
    }
    
    // Mostrar loading
    showLoading();
    setSearchButtonLoading(true);
    
    try {
        // Fazer requisição para análise
        const response = await fetch('/api/osint/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ domain: domain })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Erro na análise');
        }
        
        const result = await response.json();
        currentAnalysis = result;
        
        // Mostrar resultados
        hideLoading();
        displayResults(result);
        
    } catch (error) {
        console.error('Erro na análise:', error);
        hideLoading();
        showError('Erro ao analisar domínio: ' + error.message);
    } finally {
        setSearchButtonLoading(false);
    }
}

// Mostrar loading modal
function showLoading() {
    const modal = document.getElementById('loadingModal');
    const loadingText = document.getElementById('loadingText');
    const progressFill = document.getElementById('progressFill');
    
    modal.style.display = 'block';
    
    // Simular progresso
    let progress = 0;
    const steps = [
        'Validando domínio...',
        'Coletando dados WHOIS...',
        'Extraindo informações...',
        'Analisando com IA...',
        'Gerando relatório...'
    ];
    
    progressInterval = setInterval(() => {
        progress += Math.random() * 20;
        if (progress > 90) progress = 90;
        
        progressFill.style.width = progress + '%';
        
        const stepIndex = Math.floor(progress / 20);
        if (stepIndex < steps.length) {
            loadingText.textContent = steps[stepIndex];
        }
    }, 800);
}

// Esconder loading modal
function hideLoading() {
    const modal = document.getElementById('loadingModal');
    const progressFill = document.getElementById('progressFill');
    
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
    
    // Completar progresso
    progressFill.style.width = '100%';
    
    setTimeout(() => {
        modal.style.display = 'none';
        progressFill.style.width = '0%';
    }, 500);
}

// Definir estado de loading do botão
function setSearchButtonLoading(loading) {
    const searchBtn = document.getElementById('searchBtn');
    
    if (loading) {
        searchBtn.classList.add('loading');
        searchBtn.disabled = true;
    } else {
        searchBtn.classList.remove('loading');
        searchBtn.disabled = false;
    }
}

// Mostrar erro
function showError(message) {
    alert('Erro: ' + message);
}

// Exibir resultados
function displayResults(data) {
    const resultsSection = document.getElementById('results');
    const reportContent = document.getElementById('reportContent');
    
    // Gerar HTML do relatório
    const reportHTML = generateReportHTML(data);
    reportContent.innerHTML = reportHTML;
    
    // Mostrar seção de resultados
    resultsSection.style.display = 'block';
    resultsSection.classList.add('fade-in-up');
    
    // Scroll para resultados
    resultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Gerar HTML do relatório
function generateReportHTML(data) {
    const timestamp = new Date(data.timestamp).toLocaleString('pt-BR');
    
    return `
        <div class="report-section">
            <h3><i class="fas fa-info-circle"></i> Informações Gerais</h3>
            <div class="data-grid">
                <div class="data-item">
                    <strong>Domínio Analisado:</strong><br>
                    ${data.domain}
                </div>
                <div class="data-item">
                    <strong>Data da Análise:</strong><br>
                    ${timestamp}
                </div>
            </div>
        </div>
        
        <div class="report-section">
            <h3><i class="fas fa-database"></i> Dados WHOIS</h3>
            ${generateWhoisSection(data.whois_data)}
        </div>
        
        <div class="report-section">
            <h3><i class="fas fa-search"></i> Informações Extraídas</h3>
            ${generateExtractedInfoSection(data.extracted_info)}
        </div>
        
        <div class="report-section">
            <h3><i class="fas fa-brain"></i> Análise Inteligente</h3>
            <div class="gemini-analysis">
                ${formatAnalysisText(data.gemini_analysis)}
            </div>
        </div>
        
        <div class="report-section">
            <h3><i class="fas fa-shield-alt"></i> Disclaimer</h3>
            <p><em>${data.disclaimer}</em></p>
        </div>
    `;
}

// Gerar seção WHOIS
function generateWhoisSection(whoisData) {
    if (whoisData.error) {
        return `<p class="error">Erro ao obter dados WHOIS: ${whoisData.error}</p>`;
    }
    
    const importantFields = {
        'registrar': 'Registrador',
        'creation_date': 'Data de Criação',
        'expiration_date': 'Data de Expiração',
        'updated_date': 'Última Atualização',
        'status': 'Status',
        'name_servers': 'Servidores DNS'
    };
    
    let html = '<div class="data-grid">';
    
    for (const [key, label] of Object.entries(importantFields)) {
        if (whoisData[key]) {
            let value = whoisData[key];
            if (Array.isArray(value)) {
                value = value.join(', ');
            }
            html += `
                <div class="data-item">
                    <strong>${label}:</strong><br>
                    ${value}
                </div>
            `;
        }
    }
    
    html += '</div>';
    return html;
}

// Gerar seção de informações extraídas
function generateExtractedInfoSection(extractedInfo) {
    let html = '';
    
    const sections = {
        'emails': { label: 'E-mails Encontrados', icon: 'fas fa-envelope' },
        'names': { label: 'Nomes Identificados', icon: 'fas fa-user' },
        'phones': { label: 'Telefones', icon: 'fas fa-phone' },
        'addresses': { label: 'Endereços', icon: 'fas fa-map-marker-alt' },
        'organizations': { label: 'Organizações', icon: 'fas fa-building' }
    };
    
    for (const [key, config] of Object.entries(sections)) {
        if (extractedInfo[key] && extractedInfo[key].length > 0) {
            html += `
                <div class="data-item">
                    <strong><i class="${config.icon}"></i> ${config.label}:</strong>
                    <ul class="data-list">
                        ${extractedInfo[key].map(item => `<li>${item}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    }
    
    if (!html) {
        html = '<p>Nenhuma informação adicional extraída dos dados WHOIS.</p>';
    }
    
    return html;
}

// Formatar texto da análise
function formatAnalysisText(text) {
    if (!text) return '<p>Análise não disponível.</p>';
    
    // Converter quebras de linha em parágrafos
    return text.split('\\n\\n').map(paragraph => {
        if (paragraph.trim()) {
            return `<p>${paragraph.trim()}</p>`;
        }
    }).filter(Boolean).join('');
}

// Exportar relatório
async function exportReport(format) {
    if (!currentAnalysis) {
        showError('Nenhuma análise disponível para exportar.');
        return;
    }
    
    try {
        if (format === 'pdf') {
            // Para PDF, podemos usar uma biblioteca como jsPDF ou fazer no backend
            showError('Exportação PDF será implementada em breve.');
        } else if (format === 'html') {
            // Exportar como HTML
            const htmlContent = generateFullReportHTML(currentAnalysis);
            downloadHTML(htmlContent, `osint_report_${currentAnalysis.domain}.html`);
        }
    } catch (error) {
        console.error('Erro na exportação:', error);
        showError('Erro ao exportar relatório: ' + error.message);
    }
}

// Gerar HTML completo do relatório
function generateFullReportHTML(data) {
    const timestamp = new Date(data.timestamp).toLocaleString('pt-BR');
    
    return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Relatório OSINT - ${data.domain}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        .header { text-align: center; margin-bottom: 40px; }
        .section { margin-bottom: 30px; }
        .section h2 { color: #1a1a2e; border-bottom: 2px solid #00d4aa; padding-bottom: 10px; }
        .data-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .data-item { background: #f8f9fa; padding: 15px; border-radius: 5px; }
        .data-list { list-style: none; padding: 0; }
        .data-list li { background: #e9ecef; margin: 5px 0; padding: 8px; border-radius: 3px; }
        .analysis { background: #f0f8ff; padding: 20px; border-radius: 10px; border-left: 5px solid #00d4aa; }
        .disclaimer { background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Relatório de Análise OSINT</h1>
        <p><strong>Domínio:</strong> ${data.domain}</p>
        <p><strong>Data:</strong> ${timestamp}</p>
    </div>
    
    <div class="section">
        <h2>Dados WHOIS</h2>
        ${generateWhoisSection(data.whois_data)}
    </div>
    
    <div class="section">
        <h2>Informações Extraídas</h2>
        ${generateExtractedInfoSection(data.extracted_info)}
    </div>
    
    <div class="section">
        <h2>Análise Inteligente</h2>
        <div class="analysis">
            ${formatAnalysisText(data.gemini_analysis)}
        </div>
    </div>
    
    <div class="disclaimer">
        <strong>Aviso Legal:</strong> ${data.disclaimer}
    </div>
</body>
</html>
    `;
}

// Download de arquivo HTML
function downloadHTML(content, filename) {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Smooth scroll para navegação
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

