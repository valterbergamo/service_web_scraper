class DocumentationFormatter {
  static formatDocumentationOutput(doc) {
    let output = '';
    
    try {
      if (doc.title) {
        output += `# ${doc.title}\n\n`;
      }
      
      if (doc.overview || (doc.sapDocumentation && doc.sapDocumentation.overview)) {
        const overview = doc.overview || doc.sapDocumentation.overview;
        output += `## Overview\n${overview}\n\n`;
      }
      
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
      
      const examples = doc.sapDocumentation?.examples || doc.examples || [];
      if (examples.length > 0) {
        output += `## Examples\n`;
        examples.forEach((example, index) => {
          output += `### Example ${index + 1}\n`;
          output += `\`\`\`${example.language || 'javascript'}\n${example.code}\n\`\`\`\n\n`;
        });
      }
      
      if (doc.content && !doc.sapDocumentation) {
        output += `## Content\n${doc.content}\n\n`;
      }
      
    } catch (error) {
      console.error('Erro ao formatar documentação:', error.message);
      output += `\n\n**Erro na formatação:** ${error.message}\n`;
    }
    
    return output;
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