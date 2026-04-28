require('dotenv').config();
const express = require('express');
const cors = require('cors');

const pdfRoutes = require('./routes/pdf');

const app = express();
const PORT = process.env.PORT || 3001;

// ── CORS — allow GitHub Pages + localhost ──
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://verisentinel.github.io',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (curl, mobile apps) or matched origins
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) {
      cb(null, true);
    } else {
      cb(null, true); // permissive for now — tighten in production
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Routes
app.use('/api', pdfRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start server locally; export for Vercel serverless ──
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n🚀 PDF AI Assistant Backend running on http://localhost:${PORT}\n`);
  });
}

module.exports = app;
