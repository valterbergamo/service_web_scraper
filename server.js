require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🕷️ SAP Web Scraper Service rodando em http://localhost:${PORT}`);
  console.log(`📚 Documentação da API: http://localhost:${PORT}/api-docs`);
  console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
});