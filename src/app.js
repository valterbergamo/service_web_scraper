const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cors = require('cors');
const path = require('path');

const errorHandler = require('./middlewares/error');
const scraperRoutes = require('./routes/scraper');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Logging middleware
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    service: 'SAP Web Scraper Service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Documentation endpoint
app.get('/api-docs', (req, res) => {
  res.json({
    service: 'SAP Web Scraper Service',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'POST /scraper/test': 'Test scraping de uma URL',
      'POST /scraper/batch': 'Scraping em lote com fila',
      'GET /scraper/status/:jobId': 'Status de um job de scraping',
      'POST /scraper/sap-docs': 'Scraping específico para documentação SAP'
    }
  });
});

// Routes
app.use('/scraper', scraperRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint não encontrado',
    message: `Rota ${req.method} ${req.originalUrl} não existe`
  });
});

// Error handling middleware (deve ser o último)
app.use(errorHandler);

module.exports = app;