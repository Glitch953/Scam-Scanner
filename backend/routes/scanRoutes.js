const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const { scanUrl, scanEmail, getStats } = require('../services/scanner');

// ─── Validation Middleware ─────────────────────────────────────────────────
const validateUrl = [
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .isLength({ max: 2048 }).withMessage('URL too long')
    .custom((value) => {
      try {
        const url = new URL(value.startsWith('http') ? value : `https://${value}`);
        return ['http:', 'https:'].includes(url.protocol);
      } catch {
        throw new Error('Invalid URL format');
      }
    }),
];

const validateEmail = [
  body('text')
    .trim()
    .notEmpty().withMessage('Email text is required')
    .isLength({ max: 50000 }).withMessage('Email text too long (max 50,000 characters)'),
];

const handleValidation = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
  next();
};

// ─── URL Scan ─────────────────────────────────────────────────────────────
router.post('/url', validateUrl, handleValidation, async (req, res) => {
  try {
    // Normalize URL
    const raw = req.body.url;
    const url = raw.startsWith('http') ? raw : `https://${raw}`;
    const result = await scanUrl(url);
    res.json(result);
  } catch (error) {
    console.error('URL scan error:', error.message);
    res.status(500).json({ error: 'Error scanning URL' });
  }
});

// ─── Email Scan ───────────────────────────────────────────────────────────
router.post('/email', validateEmail, handleValidation, async (req, res) => {
  try {
    const result = await scanEmail(req.body.text);
    res.json(result);
  } catch (error) {
    console.error('Email scan error:', error.message);
    res.status(500).json({ error: 'Error scanning email' });
  }
});

// ─── Stats ────────────────────────────────────────────────────────────────
router.get('/stats', (req, res) => {
  res.json(getStats());
});

module.exports = router;
