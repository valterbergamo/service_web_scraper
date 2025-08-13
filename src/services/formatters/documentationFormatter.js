class DocumentationFormatter {
  /**
   * Formatar documentação SAP em texto estruturado
   * @param {Object} documentation - Documentação extraída
   * @returns {string} Texto formatado
   */
  static formatDocumentationOutput(documentation) {
    if (!documentation || !documentation.sapDocumentation) {
      return this.formatToText(documentation);
    }

    const sapDoc = documentation.sapDocumentation;
    let output = [];

    // Cabeçalho
    output.push('================================================================================');
    output.push(`DOCUMENTAÇÃO SAP UI5: ${sapDoc.className || 'Classe não identificada'}`);
    output.push('================================================================================');
    output.push('');

    // Overview
    if (sapDoc.overview) {
      output.push('📋 OVERVIEW');
      output.push('─'.repeat(50));
      output.push(sapDoc.overview);
      output.push('');
    }

    // Constructor
    if (sapDoc.constructor && (sapDoc.constructor.description || sapDoc.constructor.parameters.length > 0)) {
      output.push('🏗️ CONSTRUCTOR');
      output.push('─'.repeat(50));
      
      if (sapDoc.constructor.description) {
        output.push(sapDoc.constructor.description);
        output.push('');
      }
      
      if (sapDoc.constructor.since) {
        output.push(`Since: ${sapDoc.constructor.since}`);
        output.push('');
      }
      
      if (sapDoc.constructor.parameters.length > 0) {
        output.push('Parâmetros:');
        sapDoc.constructor.parameters.forEach(param => {
          output.push(`  • ${param.name}${param.optional ? '?' : ''} (${param.type}): ${param.description}`);
        });
        output.push('');
      }
    }

    // Properties
    if (sapDoc.properties && sapDoc.properties.length > 0) {
      output.push('🔧 PROPERTIES');
      output.push('─'.repeat(50));
      
      sapDoc.properties.forEach(prop => {
        output.push(`${prop.name} (${prop.type})`);
        if (prop.defaultValue) {
          output.push(`  Default: ${prop.defaultValue}`);
        }
        if (prop.description) {
          output.push(`  ${prop.description}`);
        }
        if (prop.since) {
          output.push(`  Since: ${prop.since}`);
        }
        if (prop.deprecated) {
          output.push(`  ⚠️ DEPRECATED`);
        }
        output.push('');
      });
    }

    // Methods
    if (sapDoc.methods && sapDoc.methods.length > 0) {
      output.push('⚙️ METHODS');
      output.push('─'.repeat(50));
      
      sapDoc.methods.forEach(method => {
        output.push(`${method.name}()`);
        if (method.description) {
          output.push(`  ${method.description}`);
        }
        
        if (method.parameters.length > 0) {
          output.push('  Parâmetros:');
          method.parameters.forEach(param => {
            output.push(`    • ${param.name}${param.optional ? '?' : ''} (${param.type}): ${param.description}`);
          });
        }
        
        if (method.returns && method.returns.type) {
          output.push(`  Retorna: ${method.returns.type}`);
          if (method.returns.description) {
            output.push(`    ${method.returns.description}`);
          }
        }
        
        if (method.since) {
          output.push(`  Since: ${method.since}`);
        }
        
        if (method.deprecated) {
          output.push(`  ⚠️ DEPRECATED`);
        }
        
        output.push('');
      });
    }

    // Events
    if (sapDoc.events && sapDoc.events.length > 0) {
      output.push('📡 EVENTS');
      output.push('─'.repeat(50));
      
      sapDoc.events.forEach(event => {
        output.push(`${event.name}`);
        if (event.description) {
          output.push(`  ${event.description}`);
        }
        
        if (event.parameters.length > 0) {
          output.push('  Parâmetros:');
          event.parameters.forEach(param => {
            output.push(`    • ${param.name} (${param.type}): ${param.description}`);
          });
        }
        
        if (event.since) {
          output.push(`  Since: ${event.since}`);
        }
        
        output.push('');
      });
    }

    // Examples
    if (sapDoc.examples && sapDoc.examples.length > 0) {
      output.push('💡 EXAMPLES');
      output.push('─'.repeat(50));
      
      sapDoc.examples.forEach((example, index) => {
        output.push(`Exemplo ${index + 1} (${example.language}):`);
        if (example.description) {
          output.push(example.description);
        }
        output.push('```' + example.language);
        output.push(example.code);
        output.push('```');
        output.push('');
      });
    }

    // Inheritance
    if (sapDoc.inheritance && sapDoc.inheritance.length > 0) {
      output.push('🔗 INHERITANCE');
      output.push('─'.repeat(50));
      output.push('Extends: ' + sapDoc.inheritance.join(' → '));
      output.push('');
    }

    return output.join('\n');
  }

  static formatToMarkdown(doc) {
    return this.formatDocumentationOutput(doc);
  }

  static formatToJSON(doc) {
    try {
      return JSON.stringify(doc, null, 2);
    } catch (error) {
      console.error('Erro ao formatar JSON:', error.message);
      return JSON.stringify({ error: error.message }, null, 2);
    }
  }

  static formatToHTML(doc) {
    const markdown = this.formatToMarkdown(doc);
    // Conversão básica de Markdown para HTML
    return markdown
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/\n/gim, '<br>');
  }
}

module.exports = DocumentationFormatter;