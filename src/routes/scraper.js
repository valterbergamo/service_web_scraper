const express = require('express');
const path = require('path');
const fs = require('fs');
const WebScraperService = require('../services/webScraper');

const router = express.Router();

// ✅ CRIAR INSTÂNCIA DA CLASSE
const webScraperService = new WebScraperService();

/**
 * POST /scraper/init - Scraping de teste de uma URL
 */
router.post('/init', async (req, res) => {
  try {
    const { url, selector, saveFile = false } = req.body;
    
    if (!url) {
      return res.status(400).json({
        error: 'URL é obrigatória',
        example: { 
          url: 'https://example.com', 
          selector: 'h1',
          saveFile: true 
        }
      });
    }

    console.log(`🕷️ Iniciando scraping de teste: ${url}`);
    if (saveFile) {
      console.log('💾 Arquivo será salvo no servidor');
    }
    
    // ✅ INICIALIZAR O SCRAPER ANTES DE USAR
    await webScraperService.initialize();
    
    // ✅ AGORA FUNCIONA!
    const result = await webScraperService.scrapeUrl(url, {
      selector: selector || null,
      waitForSelector: null,
      maxWaitTime: 5000,
      extractImages: true,
      extractLinks: true,
      removeSelectors: []
    });

    let savedFilePath = null;
    
    // Salvar arquivo se solicitado
    if (saveFile) {
      try {
        // Criar pasta de resultados se não existir
        const resultsDir = path.join(__dirname, '../../scraping-results');
        if (!fs.existsSync(resultsDir)) {
          fs.mkdirSync(resultsDir, { recursive: true });
          console.log('📁 Pasta scraping-results criada');
        }
        
        // Gerar nome do arquivo
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const urlSafe = url.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 50);
        const filename = `scraping_${urlSafe}_${timestamp}.txt`;
        const filepath = path.join(resultsDir, filename);
        
        // ✅ CONTEÚDO MELHORADO DO ARQUIVO
        let fileContent = `SCRAPING RESULT - ${new Date().toISOString()}\n` +
          `URL: ${url}\n` +
          `Título: ${result.title || 'N/A'}\n` +
          `Descrição: ${result.description || 'N/A'}\n` +
          `Tamanho: ${result.content ? result.content.length : 0} caracteres\n` +
          `Selector usado: ${selector || 'página completa'}\n` +
          `\n${'='.repeat(80)}\n` +
          `CONTEÚDO EXTRAÍDO:\n` +
          `${'='.repeat(80)}\n\n` +
          `${result.content || 'Nenhum conteúdo extraído'}\n\n`;

        // ✅ ADICIONAR IMAGENS
        if (result.images && result.images.length > 0) {
          fileContent += `${'='.repeat(80)}\n`;
          fileContent += `IMAGENS ENCONTRADAS (${result.images.length}):\n`;
          fileContent += `${'='.repeat(80)}\n`;
          result.images.forEach((img, i) => {
            fileContent += `${i + 1}. ${img.src}\n`;
            if (img.alt) fileContent += `   Alt: ${img.alt}\n`;
            fileContent += `\n`;
          });
          fileContent += `\n`;
        }

        // ✅ ADICIONAR LINKS
        if (result.links && result.links.length > 0) {
          fileContent += `${'='.repeat(80)}\n`;
          fileContent += `LINKS ENCONTRADOS (${result.links.length}):\n`;
          fileContent += `${'='.repeat(80)}\n`;
          result.links.forEach((link, i) => {
            fileContent += `${i + 1}. ${link.text}\n`;
            fileContent += `   URL: ${link.href}\n\n`;
          });
          fileContent += `\n`;
        }

        // ✅ ADICIONAR TABELAS
        if (result.tables && result.tables.length > 0) {
          fileContent += `${'='.repeat(80)}\n`;
          fileContent += `TABELAS ENCONTRADAS (${result.tables.length}):\n`;
          fileContent += `${'='.repeat(80)}\n`;
          result.tables.forEach((table, i) => {
            fileContent += `\nTABELA ${i + 1}:\n`;
            if (table.caption) {
              fileContent += `Legenda: ${table.caption}\n`;
            }
            
            // Headers
            if (table.headers.length > 0) {
              fileContent += `Cabeçalhos: ${table.headers.join(' | ')}\n`;
              fileContent += `${'-'.repeat(table.headers.join(' | ').length)}\n`;
            }
            
            // Rows
            table.rows.forEach(row => {
              fileContent += `${row.join(' | ')}\n`;
            });
            fileContent += `\n`;
          });
          fileContent += `\n`;
        }

        // Headings e metadados
        fileContent += `${'='.repeat(80)}\n`;
        fileContent += `HEADINGS ENCONTRADOS:\n`;
        fileContent += `${'='.repeat(80)}\n`;
        fileContent += `${result.headings ? result.headings.map(h => `${h.level.toUpperCase()}: ${h.text}`).join('\n') : 'Nenhum heading encontrado'}\n\n`;
        fileContent += `${'='.repeat(80)}\n`;
        fileContent += `METADADOS:\n`;
        fileContent += `${'='.repeat(80)}\n`;
        fileContent += `${JSON.stringify(result.metadata, null, 2)}`;
        
        fs.writeFileSync(filepath, fileContent, 'utf8');
        savedFilePath = filepath;
        
        console.log(`✅ Arquivo salvo: ${filename}`);
        
      } catch (saveError) {
        console.error('❌ Erro ao salvar arquivo:', saveError.message);
      }
    }

    res.json({
      success: true,
      url,
      data: result,
      savedFile: saveFile ? {
        saved: savedFilePath ? true : false,
        path: savedFilePath,
        filename: savedFilePath ? path.basename(savedFilePath) : null
      } : null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no scraping:', error.message);
    res.status(500).json({
      error: 'Erro interno do servidor',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /scraper/health - Health check do scraper
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Web Scraper',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;