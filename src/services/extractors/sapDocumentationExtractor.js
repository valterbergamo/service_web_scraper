class SAPDocumentationExtractor {
  static extractSAPDocumentation($) {
    const documentation = {
      overview: '',
      constructor: {
        description: '',
        parameters: []
      },
      properties: [],
      methods: [],
      events: [],
      examples: []
    };

    try {
      // Extrair overview
      const overviewSelectors = [
        '.sapUiDocumentationOverview',
        '[data-section="overview"]',
        '.overview',
        '.description',
        'p:first-of-type'
      ];
      
      for (const selector of overviewSelectors) {
        const overview = $(selector).first().text().trim();
        if (overview && overview.length > 20) {
          documentation.overview = overview;
          break;
        }
      }

      // Extrair informações do construtor
      const constructorSection = $('#Constructor, [data-section="constructor"]').parent();
      if (constructorSection.length > 0) {
        documentation.constructor.description = constructorSection.find('p').first().text().trim();
        
        constructorSection.find('table tr').each((i, row) => {
          if (i === 0) return;
          const cells = $(row).find('td');
          if (cells.length >= 3) {
            documentation.constructor.parameters.push({
              name: $(cells[0]).text().trim(),
              type: $(cells[1]).text().trim(),
              description: $(cells[2]).text().trim()
            });
          }
        });
      }

      // Usar métodos específicos
      documentation.properties = this.extractProperties($);
      documentation.methods = this.extractMethods($);
      documentation.events = this.extractEvents($);
      documentation.examples = this.extractExamples($);

    } catch (error) {
      console.error('Erro ao extrair documentação SAP:', error.message);
    }

    return documentation;
  }

  static extractProperties($) {
    const properties = [];
    
    const propertiesSection = $('#Properties, [data-section="properties"]').parent();
    propertiesSection.find('.sapUiDocumentationProperty, [class*="property"]').each((i, prop) => {
      const property = {
        name: $(prop).find('h4, h5, .property-name').first().text().trim(),
        type: $(prop).find('.type, [class*="type"]').first().text().trim(),
        defaultValue: $(prop).find('.default, [class*="default"]').first().text().trim(),
        description: $(prop).find('p').first().text().trim(),
        deprecated: $(prop).find('.deprecated, [class*="deprecated"]').length > 0
      };
      
      if (property.name) {
        properties.push(property);
      }
    });
    
    return properties;
  }

  static extractMethods($) {
    const methods = [];
    
    const methodsSection = $('#Methods, [data-section="methods"]').parent();
    methodsSection.find('.sapUiDocumentationMethod, [class*="method"]').each((i, method) => {
      const methodData = {
        name: $(method).find('h4, h5, .method-name').first().text().trim(),
        description: $(method).find('p').first().text().trim(),
        parameters: [],
        returns: {
          type: $(method).find('.returns .type, [class*="return-type"]').first().text().trim(),
          description: $(method).find('.returns p, [class*="return-desc"]').first().text().trim()
        }
      };
      
      $(method).find('table tr').each((j, row) => {
        if (j === 0) return;
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          methodData.parameters.push({
            name: $(cells[0]).text().trim(),
            type: $(cells[1]).text().trim(),
            description: $(cells[2]).text().trim(),
            optional: $(cells[0]).text().includes('?') || $(row).find('[class*="optional"]').length > 0
          });
        }
      });
      
      if (methodData.name) {
        methods.push(methodData);
      }
    });
    
    return methods;
  }

  static extractEvents($) {
    const events = [];
    
    const eventsSection = $('#Events, [data-section="events"]').parent();
    eventsSection.find('.sapUiDocumentationEvent, [class*="event"]').each((i, event) => {
      const eventData = {
        name: $(event).find('h4, h5, .event-name').first().text().trim(),
        description: $(event).find('p').first().text().trim(),
        parameters: []
      };
      
      $(event).find('table tr').each((j, row) => {
        if (j === 0) return;
        const cells = $(row).find('td');
        if (cells.length >= 3) {
          eventData.parameters.push({
            name: $(cells[0]).text().trim(),
            type: $(cells[1]).text().trim(),
            description: $(cells[2]).text().trim()
          });
        }
      });
      
      if (eventData.name) {
        events.push(eventData);
      }
    });
    
    return events;
  }

  static extractExamples($) {
    const examples = [];
    
    $('pre, code, .example, [class*="example"]').each((i, example) => {
      const code = $(example).text().trim();
      if (code && code.length > 10) {
        examples.push({
          type: example.tagName.toLowerCase(),
          code: code,
          language: $(example).attr('class')?.match(/language-(\w+)/)?.[1] || 'javascript'
        });
      }
    });
    
    return examples;
  }
}

module.exports = SAPDocumentationExtractor;