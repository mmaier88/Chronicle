import express from 'express';
import booksRouter from './routes/books.js';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    console.log(JSON.stringify({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString()
    }));
  });
  next();
});

// API key authentication (optional, enabled via env var)
const API_KEY = process.env.CHRONICLE_API_KEY;
if (API_KEY) {
  app.use('/v1', (req, res, next) => {
    const providedKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
    if (providedKey !== API_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    next();
  });
}

// Routes
app.use('/health', healthRouter);
app.use('/v1/books', booksRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Chronicle API listening on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`API docs: POST /v1/books, GET /v1/books/:id, GET /v1/books/:id/manuscript`);
});
