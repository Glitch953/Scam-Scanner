const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security: HTTP Headers (OWASP Best Practice) ───────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'", 'https://safebrowsing.googleapis.com'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// ─── Security: CORS — Allow frontend, chrome extensions, and webmail ────
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000', 'https://mail.google.com', 'https://outlook.live.com'];
app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile/postman), exact matches, or any chrome-extension:// origin
    if (!origin || allowedOrigins.includes(origin) || origin.startsWith('chrome-extension://')) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation: origin not allowed'));
    }
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

// ─── Security: Request body size limit (prevent payload flood) ────────────
app.use(express.json({ limit: '20kb' }));

// ─── Security: Global Rate Limiter (100 requests / 15 min per IP) ─────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
app.use(globalLimiter);

// ─── Stricter Rate Limiter for scan endpoints (20 requests / 5 min) ───────
const scanLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: { error: 'Scan rate limit exceeded. Please wait before scanning again.' },
});

// ─── Routes ────────────────────────────────────────────────────────────────
const scanRoutes = require('./routes/scanRoutes');
app.use('/api/scan', scanLimiter, scanRoutes);

// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'Scam Scanner API is running', version: '2.0.0' });
});

// ─── 404 Handler ──────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Global Error Handler (never expose stack traces) ────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Scam Scanner API] Secure server running on port ${PORT}`);
});
