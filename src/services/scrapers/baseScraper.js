const puppeteer = require('puppeteer');

class BaseScraper {
  constructor() {
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      this.page = await this.browser.newPage();
      
      // Configurar viewport
      await this.page.setViewport({ width: 1920, height: 1080 });
      
      // Configurar user agent
      await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Bloquear recursos desnecessários para melhor performance
      await this.page.setRequestInterception(true);
      this.page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (resourceType === 'stylesheet' || resourceType === 'font' || resourceType === 'image') {
          req.abort();
        } else {
          req.continue();
        }
      });
      
      console.log('BaseScraper inicializado com sucesso');
    } catch (error) {
      console.error('Erro ao inicializar BaseScraper:', error);
      throw error;
    }
  }

  async scrapeUrl(url, options = {}) {
    try {
      if (!this.page) {
        await this.initialize();
      }
      
      console.log(`Navegando para: ${url}`);
      
      // Navegar para a URL
      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Aguardar seletor específico se fornecido
      if (options.waitForSelector) {
        await this.page.waitForSelector(options.waitForSelector, {
          timeout: 10000
        });
      }
      
      // Aguardar tempo adicional se especificado
      if (options.waitTime) {
        await this.page.waitForTimeout(options.waitTime);
      }
      
      // Extrair conteúdo HTML
      const content = await this.page.content();
      
      // Extrair texto visível
      const textContent = await this.page.evaluate(() => {
        return document.body.innerText || document.body.textContent || '';
      });
      
      // Extrair links
      const links = await this.page.evaluate(() => {
        const linkElements = Array.from(document.querySelectorAll('a[href]'));
        return linkElements.map(link => ({
          text: link.textContent.trim(),
          href: link.href,
          title: link.title || ''
        }));
      });
      
      // Extrair imagens
      const images = await this.page.evaluate(() => {
        const imgElements = Array.from(document.querySelectorAll('img[src]'));
        return imgElements.map(img => ({
          src: img.src,
          alt: img.alt || '',
          title: img.title || ''
        }));
      });
      
      return {
        url,
        title: await this.page.title(),
        content,
        textContent,
        links,
        images,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error(`Erro ao fazer scraping de ${url}:`, error);
      throw error;
    }
  }
  
  async evaluateScript(script) {
    try {
      if (!this.page) {
        throw new Error('Página não inicializada. Chame initialize() primeiro.');
      }
      
      return await this.page.evaluate(script);
    } catch (error) {
      console.error('Erro ao executar script:', error);
      throw error;
    }
  }
  
  async waitForElement(selector, timeout = 10000) {
    try {
      if (!this.page) {
        throw new Error('Página não inicializada. Chame initialize() primeiro.');
      }
      
      await this.page.waitForSelector(selector, { timeout });
      return true;
    } catch (error) {
      console.error(`Erro ao aguardar elemento ${selector}:`, error);
      return false;
    }
  }
  
  async screenshot(options = {}) {
    try {
      if (!this.page) {
        throw new Error('Página não inicializada. Chame initialize() primeiro.');
      }
      
      return await this.page.screenshot({
        fullPage: true,
        type: 'png',
        ...options
      });
    } catch (error) {
      console.error('Erro ao capturar screenshot:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      
      console.log('BaseScraper fechado com sucesso');
    } catch (error) {
      console.error('Erro ao fechar BaseScraper:', error);
    }
  }
  
  // Método para verificar se está inicializado
  isInitialized() {
    return this.browser !== null && this.page !== null;
  }
  
  // Método para obter informações da página atual
  async getPageInfo() {
    if (!this.page) {
      return null;
    }
    
    try {
      return {
        url: this.page.url(),
        title: await this.page.title(),
        viewport: this.page.viewport()
      };
    } catch (error) {
      console.error('Erro ao obter informações da página:', error);
      return null;
    }
  }
}

module.exports = BaseScraper;