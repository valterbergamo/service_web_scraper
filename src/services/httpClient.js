const axios = require('axios');

class HttpClient {
  constructor() {
    this.baseURL = process.env.EMBEDDINGS_SERVICE_URL || 'http://localhost:3000';
  }

  async sendToEmbeddings(data) {
    try {
      const response = await axios.post(`${this.baseURL}/embeddings`, data, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao enviar para embeddings:', error.message);
      throw error;
    }
  }
}

module.exports = new HttpClient();