const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

class WebScraperService {
  constructor() {
    this.browser = null;
  }

  /**
   * Inicializar o browser Puppeteer
   */
  async initialize() {
    if (this.browser) {
      return;
    }

    try {
      console.log('🚀 Inicializando Puppeteer...');
      
      this.browser = await puppeteer.launch({
        headless: 'new',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      
      console.log('✅ Puppeteer inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar Puppeteer:', error.message);
      throw new Error(`Falha ao inicializar browser: ${error.message}`);
    }
  }

  /**
   * Fazer scraping de uma URL
   * @param {string} url - URL para fazer scraping
   * @param {Object} options - Opções de scraping
   * @returns {Object} Dados extraídos
   */
  async scrapeUrl(url, options = {}) {
    const {
      selector = null,
      waitForSelector = null,
      maxWaitTime = 10000,
      removeSelectors = [],
      extractImages = false,
      extractLinks = false
    } = options;

    await this.initialize();

    let page = null;
    
    try {
      console.log(`🔍 Iniciando scraping: ${url}`);
      
      page = await this.browser.newPage();
      
      // Configurar página
      await page.setViewport({ width: 1920, height: 1080 });
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      
      // Bloquear recursos desnecessários para performance
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['stylesheet', 'font'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      // Navegar para a página
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: maxWaitTime
      });
      
      // Aguardar seletor específico se fornecido
      if (waitForSelector) {
        try {
          await page.waitForSelector(waitForSelector, { timeout: maxWaitTime });
          console.log(`✅ Seletor encontrado: ${waitForSelector}`);
        } catch (error) {
          console.warn(`⚠️ Seletor não encontrado: ${waitForSelector}`);
        }
      }
      
      // Aguardar um pouco para JavaScript carregar
      await page.waitForTimeout(2000);
      
      // Obter HTML da página
      const html = await page.content();
      const $ = cheerio.load(html);
      
      // Remover seletores indesejados
      removeSelectors.forEach(sel => $(sel).remove());
      
      let result = {
        url,
        title: $('title').text().trim(),
        content: '',
        metadata: {
          timestamp: new Date().toISOString(),
          userAgent: await page.evaluate(() => navigator.userAgent)
        }
      };
      
      // Extrair conteúdo baseado no seletor
      if (selector) {
        const selectedElement = $(selector);
        if (selectedElement.length > 0) {
          result.content = selectedElement.text().trim();
          result.html = selectedElement.html();
        } else {
          console.warn(`⚠️ Seletor não encontrado: ${selector}`);
          result.content = $('body').text().trim();
        }
      } else {
        result.content = $('body').text().trim();
      }
      
      // Extrair imagens se solicitado
      if (extractImages) {
        result.images = [];
        $('img').each((i, img) => {
          const src = $(img).attr('src');
          const alt = $(img).attr('alt') || '';
          if (src) {
            result.images.push({ src, alt });
          }
        });
      }
      
      // Extrair links se solicitado
      if (extractLinks) {
        result.links = [];
        $('a[href]').each((i, link) => {
          const href = $(link).attr('href');
          const text = $(link).text().trim();
          if (href) {
            result.links.push({ href, text });
          }
        });
      }
      
      // Tentar extrair documentação SAP se for uma página SAP
      if (url.includes('sapui5') || url.includes('sap.com') || $('[class*="sap"]').length > 0) {
        try {
          const sapDoc = this.extractSAPDocumentation($);
          if (sapDoc && Object.keys(sapDoc).length > 0) {
            result.sapDocumentation = sapDoc;
          }
        } catch (error) {
          console.warn('⚠️ Erro ao extrair documentação SAP:', error.message);
        }
      }
      
      console.log(`✅ Scraping concluído: ${url}`);
      return result;
      
    } catch (error) {
      console.error(`❌ Erro no scraping de ${url}:`, error.message);
      throw new Error(`Falha no scraping: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Extrair documentação específica do SAP UI5 com seletores otimizados
   * @param {Object} $ - Instância do Cheerio
   * @returns {Object} Documentação estruturada
   */
  extractSAPDocumentation($) {
    const documentation = {
      className: '',
      overview: '',
      constructor: {
        description: '',
        parameters: [],
        since: ''
      },
      properties: [],
      methods: [],
      events: [],
      examples: [],
      inheritance: []
    };

    try {
      // Remover elementos de navegação e interface desnecessários
      const removeSelectors = [
        '.sapUiSizeCompact',
        '.sapUiDocumentationNavigation',
        '.sapUiDocumentationHeader',
        '.sapUiDocumentationFooter',
        '.sapUiDocumentationSidebar',
        '[role="navigation"]',
        '[role="banner"]',
        '[role="contentinfo"]',
        '.sapUiDocumentationBreadcrumb',
        '.sapUiDocumentationSearch',
        '.sapUiDocumentationToolbar',
        '.sapUiDocumentationMenu'
      ];
      
      removeSelectors.forEach(sel => $(sel).remove());

      // Extrair nome da classe
      const classNameSelectors = [
        'h1.sapUiDocumentationTitle',
        '.sapUiDocumentationClassName',
        'h1:contains("sap.")',
        '.apiDetailHeader h1'
      ];
      
      for (const selector of classNameSelectors) {
        const className = $(selector).first().text().trim();
        if (className && className.includes('sap.')) {
          documentation.className = className;
          break;
        }
      }

      // Extrair overview/descrição principal
      const overviewSelectors = [
        '.sapUiDocumentationOverview p',
        '.apiDetailOverview',
        '.sapUiDocumentationDescription',
        '[data-sap-ui-area="overview"] p',
        '.overview-section p'
      ];
      
      for (const selector of overviewSelectors) {
        const overview = $(selector).first().text().trim();
        if (overview && overview.length > 50) {
          documentation.overview = overview;
          break;
        }
      }

      // Extrair informações do construtor
      const constructorSection = $('[data-sap-ui-area="constructor"], #constructor, .constructor-section').first();
      if (constructorSection.length > 0) {
        documentation.constructor.description = constructorSection.find('p').first().text().trim();
        documentation.constructor.since = constructorSection.find('.since, [class*="since"]').text().trim();
        
        // Extrair parâmetros do construtor
        constructorSection.find('table.sapUiDocumentationTable tr, .parameters-table tr').each((i, row) => {
          if (i === 0) return; // Skip header
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            documentation.constructor.parameters.push({
              name: $(cells[0]).text().trim(),
              type: $(cells[1]).text().trim(),
              description: $(cells[2]).text().trim(),
              optional: $(cells[0]).text().includes('?')
            });
          }
        });
      }

      // Extrair propriedades
      const propertiesSection = $('[data-sap-ui-area="properties"], #properties, .properties-section');
      propertiesSection.find('.sapUiDocumentationProperty, .property-item').each((i, prop) => {
        const property = {
          name: $(prop).find('.property-name, h4, h5').first().text().trim(),
          type: $(prop).find('.property-type, .type').first().text().trim(),
          defaultValue: $(prop).find('.property-default, .default-value').first().text().trim(),
          description: $(prop).find('.property-description, p').first().text().trim(),
          since: $(prop).find('.since').text().trim(),
          deprecated: $(prop).find('.deprecated').length > 0
        };
        
        if (property.name && !property.name.includes('Linha de mensagem')) {
          documentation.properties.push(property);
        }
      });

      // Extrair métodos
      const methodsSection = $('[data-sap-ui-area="methods"], #methods, .methods-section');
      methodsSection.find('.sapUiDocumentationMethod, .method-item').each((i, method) => {
        const methodData = {
          name: $(method).find('.method-name, h4, h5').first().text().trim(),
          description: $(method).find('.method-description, p').first().text().trim(),
          parameters: [],
          returns: {
            type: $(method).find('.return-type').text().trim(),
            description: $(method).find('.return-description').text().trim()
          },
          since: $(method).find('.since').text().trim(),
          deprecated: $(method).find('.deprecated').length > 0
        };
        
        // Extrair parâmetros do método
        $(method).find('table tr, .parameters tr').each((j, row) => {
          if (j === 0) return; // Skip header
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            methodData.parameters.push({
              name: $(cells[0]).text().trim(),
              type: $(cells[1]).text().trim(),
              description: $(cells[2]).text().trim(),
              optional: $(cells[0]).text().includes('?')
            });
          }
        });
        
        if (methodData.name && !methodData.name.includes('Linha de mensagem')) {
          documentation.methods.push(methodData);
        }
      });

      // Extrair eventos
      const eventsSection = $('[data-sap-ui-area="events"], #events, .events-section');
      eventsSection.find('.sapUiDocumentationEvent, .event-item').each((i, event) => {
        const eventData = {
          name: $(event).find('.event-name, h4, h5').first().text().trim(),
          description: $(event).find('.event-description, p').first().text().trim(),
          parameters: [],
          since: $(event).find('.since').text().trim()
        };
        
        // Extrair parâmetros do evento
        $(event).find('table tr, .parameters tr').each((j, row) => {
          if (j === 0) return; // Skip header
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            eventData.parameters.push({
              name: $(cells[0]).text().trim(),
              type: $(cells[1]).text().trim(),
              description: $(cells[2]).text().trim()
            });
          }
        });
        
        if (eventData.name && !eventData.name.includes('Linha de mensagem')) {
          documentation.events.push(eventData);
        }
      });

      // Extrair exemplos de código
      $('pre code, .code-example, .sapUiDocumentationExample').each((i, example) => {
        const code = $(example).text().trim();
        if (code && code.length > 20 && !code.includes('Linha de mensagem')) {
          documentation.examples.push({
            type: 'code',
            language: $(example).attr('class')?.match(/language-(\w+)/)?.[1] || 'javascript',
            code: code,
            description: $(example).prev('p').text().trim()
          });
        }
      });

      // Extrair hierarquia de herança
      const inheritanceSection = $('[data-sap-ui-area="inheritance"], .inheritance, .extends');
      inheritanceSection.find('a, .class-link').each((i, link) => {
        const className = $(link).text().trim();
        if (className && className.includes('sap.')) {
          documentation.inheritance.push(className);
        }
      });

    } catch (error) {
      console.error('Erro ao extrair documentação SAP:', error.message);
    }

    return documentation;
  }

  /**
   * Extrair conteúdo estruturado de documentação
   * @param {Object} $ - Instância do Cheerio
   * @param {string} selector - Seletor específico
   * @returns {Object} Conteúdo estruturado
   */
  extractDocumentationContent($, selector) {
    let structuredContent = {
      navigation: [],
      sections: [],
      properties: [],
      methods: [],
      events: [],
      examples: []
    };

    try {
      // Extrair navegação/breadcrumb
      $('.sapUiDocumentationBreadcrumb, .breadcrumb, nav').each((i, nav) => {
        const navText = $(nav).text().trim();
        if (navText) {
          structuredContent.navigation.push(navText);
        }
      });

      // Extrair seções principais com hierarquia
      $('h1, h2, h3, h4, h5, h6').each((i, heading) => {
        const level = heading.tagName.toLowerCase();
        const title = $(heading).text().trim();
        const content = [];
        
        // Coletar conteúdo até o próximo heading do mesmo nível ou superior
        let nextElement = $(heading).next();
        while (nextElement.length > 0 && !nextElement.is('h1, h2, h3, h4, h5, h6')) {
          if (nextElement.is('p, div, ul, ol, table, pre, code')) {
            const text = nextElement.text().trim();
            if (text) {
              content.push({
                type: nextElement.prop('tagName').toLowerCase(),
                content: text
              });
            }
          }
          nextElement = nextElement.next();
        }
        
        if (title) {
          structuredContent.sections.push({
            level,
            title,
            content
          });
        }
      });

      // Usar a extração SAP se aplicável
      const sapDoc = this.extractSAPDocumentation($);
      if (sapDoc && Object.keys(sapDoc).length > 0) {
        structuredContent.properties = sapDoc.properties || [];
        structuredContent.methods = sapDoc.methods || [];
        structuredContent.events = sapDoc.events || [];
        structuredContent.examples = sapDoc.examples || [];
      }

    } catch (error) {
      console.error('Erro ao extrair conteúdo estruturado:', error.message);
    }

    return structuredContent;
  }

  /**
   * Formatar documentação em texto estruturado
   * @param {Object} doc - Documentação extraída
   * @returns {string} Texto formatado
   */
  formatDocumentationOutput(doc) {
    let output = '';
    
    try {
      // Cabeçalho
      if (doc.title) {
        output += `# ${doc.title}\n\n`;
      }
      
      // Overview
      if (doc.overview || (doc.sapDocumentation && doc.sapDocumentation.overview)) {
        const overview = doc.overview || doc.sapDocumentation.overview;
        output += `## Overview\n${overview}\n\n`;
      }
      
      // Construtor
      if (doc.sapDocumentation && doc.sapDocumentation.constructor && doc.sapDocumentation.constructor.description) {
        output += `## Constructor\n${doc.sapDocumentation.constructor.description}\n\n`;
        
        if (doc.sapDocumentation.constructor.parameters.length > 0) {
          output += `### Parameters\n`;
          doc.sapDocumentation.constructor.parameters.forEach(param => {
            output += `- **${param.name}** (${param.type}): ${param.description}\n`;
          });
          output += '\n';
        }
      }
      
      // Propriedades
      const properties = doc.sapDocumentation?.properties || doc.properties || [];
      if (properties.length > 0) {
        output += `## Properties\n`;
        properties.forEach(prop => {
          output += `### ${prop.name}\n`;
          if (prop.type) output += `**Type:** ${prop.type}\n`;
          if (prop.defaultValue) output += `**Default:** ${prop.defaultValue}\n`;
          if (prop.description) output += `${prop.description}\n`;
          if (prop.deprecated) output += `**(Deprecated)**\n`;
          output += '\n';
        });
      }
      
      // Métodos
      const methods = doc.sapDocumentation?.methods || doc.methods || [];
      if (methods.length > 0) {
        output += `## Methods\n`;
        methods.forEach(method => {
          output += `### ${method.name}\n`;
          if (method.description) output += `${method.description}\n\n`;
          
          if (method.parameters && method.parameters.length > 0) {
            output += `**Parameters:**\n`;
            method.parameters.forEach(param => {
              const optional = param.optional ? ' (optional)' : '';
              output += `- **${param.name}** (${param.type})${optional}: ${param.description}\n`;
            });
            output += '\n';
          }
          
          if (method.returns && method.returns.type) {
            output += `**Returns:** ${method.returns.type}`;
            if (method.returns.description) {
              output += ` - ${method.returns.description}`;
            }
            output += '\n\n';
          }
        });
      }
      
      // Eventos
      const events = doc.sapDocumentation?.events || doc.events || [];
      if (events.length > 0) {
        output += `## Events\n`;
        events.forEach(event => {
          output += `### ${event.name}\n`;
          if (event.description) output += `${event.description}\n\n`;
          
          if (event.parameters && event.parameters.length > 0) {
            output += `**Parameters:**\n`;
            event.parameters.forEach(param => {
              output += `- **${param.name}** (${param.type}): ${param.description}\n`;
            });
            output += '\n';
          }
        });
      }
      
      // Exemplos
      const examples = doc.sapDocumentation?.examples || doc.examples || [];
      if (examples.length > 0) {
        output += `## Examples\n`;
        examples.forEach((example, index) => {
          output += `### Example ${index + 1}\n`;
          output += `\`\`\`${example.language || 'javascript'}\n${example.code}\n\`\`\`\n\n`;
        });
      }
      
      // Conteúdo adicional
      if (doc.content && !doc.sapDocumentation) {
        output += `## Content\n${doc.content}\n\n`;
      }
      
    } catch (error) {
      console.error('Erro ao formatar documentação:', error.message);
      output += `\n\n**Erro na formatação:** ${error.message}\n`;
    }
    
    return output;
  }

  /**
   * Fazer scraping de múltiplas URLs
   * @param {Array} urls - Array de URLs
   * @param {Object} options - Opções de scraping
   * @returns {Array} Array com resultados
   */
  async scrapeMultipleUrls(urls, options = {}) {
    const results = [];
    const { concurrent = 3, delay = 1000 } = options;
    
    console.log(`🔍 Iniciando scraping de ${urls.length} URLs...`);
    
    // Processar em lotes para evitar sobrecarga
    for (let i = 0; i < urls.length; i += concurrent) {
      const batch = urls.slice(i, i + concurrent);
      const batchPromises = batch.map(url => 
        this.scrapeUrl(url, options).catch(error => ({
          url,
          error: error.message,
          success: false
        }))
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // Delay entre lotes
      if (i + concurrent < urls.length && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.log(`✅ Scraping concluído: ${results.length} URLs processadas`);
    return results;
  }

  /**
   * Fechar o browser
   */
  async close() {
    if (this.browser) {
      console.log('🔒 Fechando browser...');
      await this.browser.close();
      this.browser = null;
      console.log('✅ Browser fechado');
    }
  }
}

// Instância singleton
const webScraperService = new WebScraperService();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, fechando browser...');
  await webScraperService.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, fechando browser...');
  await webScraperService.close();
  process.exit(0);
});

module.exports = WebScraperService;