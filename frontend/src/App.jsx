import { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert, ShieldCheck, Link as LinkIcon, Mail,
  Search, Moon, Sun, Clock, Trash2, Globe, Lock, Zap,
  Download, Puzzle, CheckCircle2, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './App.css';

const API_BASE = ''; // Uses relative path for Cloudflare Pages Functions
const MAX_HISTORY = 8;

// ─── Sanitize display strings (prevent XSS in results) ────────────────────
const sanitize = (str) => String(str).replace(/[<>"'`]/g, '');

function App() {
  const [activeTab, setActiveTab] = useState('url');
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [theme, setTheme] = useState('dark');
  const [showExtModal, setShowExtModal] = useState(false);
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('scan_history') || '[]'); }
    catch { return []; }
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(p => p === 'dark' ? 'light' : 'dark');

  const addToHistory = useCallback((input, type, safe, threat) => {
    const entry = {
      id: Date.now(),
      input: input.length > 60 ? input.slice(0, 60) + '…' : input,
      type,
      safe,
      threat,
      timestamp: new Date().toLocaleTimeString(),
    };
    setHistory(prev => {
      const next = [entry, ...prev].slice(0, MAX_HISTORY);
      localStorage.setItem('scan_history', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('scan_history');
  };

  const handleScan = useCallback(async () => {
    if (!inputValue.trim()) return;
    setLoading(true);
    setResult(null);

    const endpoint = activeTab === 'url' ? '/api/scan/url' : '/api/scan/email';
    const body = activeTab === 'url' ? { url: inputValue.trim() } : { text: inputValue.trim() };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');
      setResult(data);
      addToHistory(inputValue.trim(), activeTab, data.safe, data.threatType);
    } catch (err) {
      setResult({ safe: false, threatType: 'CONNECTION ERROR', message: sanitize(err.message) });
    } finally {
      setLoading(false);
    }
  }, [inputValue, activeTab, addToHistory]);

  // ── Animation variants (state machine) ────────────────────────────────
  const cardVariants = {
    hidden: { opacity: 0, y: 32 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 15 } },
  };
  const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
  };
  const featureItem = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: 'spring', stiffness: 120, damping: 14 } },
  };

  const features = [
    { icon: <Globe size={22} />, title: 'Real-Time URL Scanning', desc: 'Powered by Google Safe Browsing API to detect malware, phishing, and malicious redirects instantly.' },
    { icon: <Mail size={22} />, title: 'Email Threat Analysis', desc: 'AI-powered pattern matching identifies scam keywords, social engineering, and phishing cues in email content.' },
    { icon: <Zap size={22} />, title: 'Instant Results', desc: 'Get a full threat assessment in under a second with detailed risk level and threat type classification.' },
    { icon: <Lock size={22} />, title: 'Privacy First', desc: 'We do not store your URLs or email content. All scans are processed in memory and discarded immediately.' },
  ];

  const howItWorks = [
    { step: '01', title: 'Paste your link or email', desc: 'Enter any suspicious URL or paste email text into the scanner.' },
    { step: '02', title: 'We analyze it instantly', desc: 'Our backend queries Google Safe Browsing and cross-references threat databases.' },
    { step: '03', title: 'Get your verdict', desc: 'Receive a clear Safe or Threat verdict with full details about the risk.' },
  ];

  return (
    <div className="app-container">
      {/* Theme Toggle */}
      <motion.div className="theme-toggle" onClick={toggleTheme}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 200 }}>
        <AnimatePresence mode="wait">
          <motion.div key={theme}
            initial={{ opacity: 0, rotate: -90 }}
            animate={{ opacity: 1, rotate: 0 }}
            exit={{ opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Header */}
      <motion.header className="app-header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}>
        <div className="badge">
          <ShieldCheck size={14} className="badge-icon" />
          <span>Real-Time Phishing & Scam Shield v2.0</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'center' }}>
          <img src="/logo.png" alt="Scam Scanner Logo" style={{ width: '64px', height: '64px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(6,182,212,0.3)' }} />
          <h1 className="main-title">
            Scam <span className="highlight">Scanner</span>
          </h1>
        </div>

        <p className="subtitle">
          Instant AI protection against malicious websites, phishing emails, and deceptive links. Powered by Google Safe Browsing.
        </p>
      </motion.header>

      {/* Scanner Card */}
      <motion.div className="scanner-card" variants={cardVariants} initial="hidden" animate="visible">
        <div className="tabs">
          {[
            { id: 'url', icon: <LinkIcon size={18} />, label: 'URL Scanner' },
            { id: 'email', icon: <Mail size={18} />, label: 'Email Scanner' },
          ].map(tab => (
            <motion.button key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(tab.id); setResult(null); setInputValue(''); }}
              whileTap={{ scale: 0.97 }}>
              {tab.icon} {tab.label}
            </motion.button>
          ))}
        </div>

        <div className="input-group">
          <AnimatePresence mode="wait">
            {activeTab === 'url' ? (
              <motion.input key="url"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                type="url" placeholder="Paste a suspicious URL here (e.g. https://...)"
                value={inputValue} onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()} />
            ) : (
              <motion.textarea key="email"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2 }}
                placeholder="Paste the email content here to analyze…"
                value={inputValue} onChange={e => setInputValue(e.target.value)} />
            )}
          </AnimatePresence>

          <motion.button className="btn-scan" onClick={handleScan}
            disabled={loading || !inputValue.trim()}
            whileHover={{ scale: loading ? 1 : 1.02 }}
            whileTap={{ scale: 0.98 }}>
            {loading ? <div className="loader" /> : <><Search size={20} /> Analyze</>}
          </motion.button>
        </div>

        {/* Result */}
        <AnimatePresence mode="wait">
          {loading && (
            <motion.div key="skel"
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="skeleton-loader h-24 w-full mt-6 rounded-xl" />
          )}
          {!loading && result && (
            <motion.div key="result"
              initial={{ opacity: 0, scale: 0.9, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
              className={`result-card ${result.safe ? 'safe' : 'danger'}`}>
              <div className="result-header">
                {result.safe ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
                {result.safe ? 'Safe' : 'Threat Detected'}
              </div>
              <div className="result-body">
                <p>{sanitize(result.message)}</p>
                {!result.safe && result.threatType && (
                  <span className="threat-type">{sanitize(result.threatType)}</span>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* How It Works */}
      <motion.div className="section-card"
        variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <h2 className="section-title">How It Works</h2>
        <div className="steps-grid">
          {howItWorks.map((step, i) => (
            <motion.div key={i} className="step-box"
              variants={featureItem}
              initial="hidden" whileInView="visible" viewport={{ once: true }}
              custom={i}
              whileHover={{ y: -4, transition: { type: 'spring', stiffness: 300 } }}>
              <span className="step-number">{step.step}</span>
              <h3>{step.title}</h3>
              <p>{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Features */}
      <motion.div className="section-card"
        variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <h2 className="section-title">Why Choose Scam Scanner</h2>
        <motion.div className="features-grid" variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          {features.map((f, i) => (
            <motion.div key={i} className="feature-card"
              variants={featureItem}
              whileHover={{ scale: 1.03, transition: { type: 'spring', stiffness: 250 } }}>
              <span className="feature-icon">{f.icon}</span>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Recent Scans */}
      <AnimatePresence>
        {history.length > 0 && (
          <motion.div className="section-card"
            key="history"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 90 }}>
            <div className="section-header-row">
              <h2 className="section-title" style={{ margin: 0 }}>
                <Clock size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                Recent Scans
              </h2>
              <motion.button className="clear-btn" onClick={clearHistory}
                whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Trash2 size={14} /> Clear
              </motion.button>
            </div>
            <div className="history-list">
              <AnimatePresence>
                {history.map(item => (
                  <motion.div key={item.id} className={`history-item ${item.safe ? 'safe' : 'danger'}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ type: 'spring', stiffness: 120 }}>
                    <span className="history-icon">
                      {item.safe ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                    </span>
                    <div className="history-details">
                      <span className="history-input">{item.input}</span>
                      {!item.safe && <span className="history-threat">{item.threat}</span>}
                    </div>
                    <span className="history-time">{item.timestamp}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Browser Extension Section */}
      <motion.div className="section-card extension-banner-card"
        variants={cardVariants} initial="hidden" whileInView="visible" viewport={{ once: true }}>
        <div className="ext-banner-content">
          <div className="ext-badge">
            <Puzzle size={16} /> Chrome Extension Available
          </div>
          <h2>Get Real-Time Protection in Your Browser</h2>
          <p>
            Automatically detect and block scam websites before they load. Scan emails silently inside Gmail & Outlook with our official extension.
          </p>
          <motion.button className="btn-scan btn-ext" onClick={() => setShowExtModal(true)}
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Download size={18} /> Install Browser Extension
          </motion.button>
        </div>
      </motion.div>

      {/* Extension Download/Installation Modal */}
      <AnimatePresence>
        {showExtModal && (
          <motion.div className="modal-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowExtModal(false)}>
            <motion.div className="modal-card"
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}>
              <button className="modal-close" onClick={() => setShowExtModal(false)}>
                <X size={20} />
              </button>
              
              <div className="modal-header">
                <img src="/logo.png" alt="Logo" style={{ width: '40px', height: '40px', borderRadius: '10px' }} />
                <div>
                  <h3>Install Scam Scanner Extension</h3>
                  <p>Download the official extension package or install unpacked:</p>
                </div>
              </div>

              <div style={{ marginBottom: '20px', display: 'flex', gap: '12px' }}>
                <a href="/ScamScanner-Extension.zip" download="ScamScanner-Extension.zip" style={{ textDecoration: 'none', flex: 1 }}>
                  <motion.button className="btn-scan" style={{ width: '100%', padding: '12px', fontSize: '0.9rem' }}
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Download size={16} /> Download Package (.ZIP)
                  </motion.button>
                </a>
              </div>

              <div className="modal-steps">
                <div className="modal-step">
                  <div className="step-badge">1</div>
                  <div>
                    <strong>Unzip Package or Open Project</strong>
                    <p>Extract <code>ScamScanner-Extension.zip</code> to your computer.</p>
                  </div>
                </div>

                <div className="modal-step">
                  <div className="step-badge">2</div>
                  <div>
                    <strong>Open Chrome Extensions</strong>
                    <p>Go to <code>chrome://extensions</code> and turn on <b>"Developer mode"</b> (top right).</p>
                  </div>
                </div>

                <div className="modal-step">
                  <div className="step-badge">3</div>
                  <div>
                    <strong>Load Unpacked</strong>
                    <p>Click <b>"Load unpacked"</b> and choose the unzipped folder.</p>
                  </div>
                </div>
              </div>

              <div className="modal-footer-note">
                <CheckCircle2 size={16} className="text-success" />
                <span>Ready for Chrome Web Store! Package file: <code>ScamScanner-Extension.zip</code></span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <motion.footer className="app-footer"
        initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }}>
        <ShieldCheck size={18} className="text-success" />
        <span>Scam Scanner — Built to keep you safe online</span>
      </motion.footer>
    </div>
  );
}

export default App;
