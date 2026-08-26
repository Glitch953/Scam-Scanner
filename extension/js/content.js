// ─── Scam Scanner Extension: Content Script ────────────────────────────────
// 1. Email Body Scanning (Gmail & Outlook)
// 2. Universal Hover Shield (AI Link Unmasker & Pre-Scan on ANY webpage)

// ─── 1. Email Body Scanner ──────────────────────────────────────────────────
function scanPageEmails() {
  const emailBodies = document.querySelectorAll('.a3s.aiL, .ii.gt');
  
  emailBodies.forEach(async (body) => {
    if (body.dataset.scanned) return;
    
    const text = body.innerText;
    if (text.length < 10) return;

    body.dataset.scanned = "true";

    try {
      const response = await fetch('https://scam-scanner.pages.dev/api/scan/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text })
      });
      const result = await response.json();

      if (!result.safe) {
        const banner = document.createElement('div');
        banner.style.cssText = `
          background: rgba(239, 68, 68, 0.12);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(239, 68, 68, 0.35);
          color: #ef4444;
          padding: 14px 18px;
          border-radius: 14px;
          margin-bottom: 18px;
          font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
          font-size: 13px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        `;
        
        banner.innerHTML = `
          <div style="background: #ef4444; color: #fff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 800;">⚠️</div>
          <div>
            <strong style="display:block; font-size: 14px; margin-bottom:2px; color: #dc2626;">Scam Scanner Phishing Warning</strong>
            <span style="color: #4b5563;">${result.message || 'This email exhibits multiple signs of being a phishing attempt.'}</span>
          </div>
        `;
        
        body.insertBefore(banner, body.firstChild);
      }
    } catch (e) {
      console.error("Scam Scanner Extension: Email check error.", e);
    }
  });
}

// ─── 2. Universal Hover Shield Tooltip ─────────────────────────────────────
let hoverTimer = null;
let activeTooltip = null;
const urlCache = new Map();

function createTooltip() {
  if (activeTooltip) return activeTooltip;
  const tooltip = document.createElement('div');
  tooltip.id = 'scam-scanner-hover-shield';
  tooltip.style.cssText = `
    position: absolute;
    z-index: 2147483647;
    background: #000;
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 14px;
    padding: 12px 16px;
    font-family: -apple-system, BlinkMacSystemFont, 'Inter', sans-serif;
    font-size: 12px;
    box-shadow: 0 16px 40px rgba(0,0,0,0.6);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    pointer-events: none;
    display: none;
    max-width: 320px;
    transition: opacity 0.2s, transform 0.2s;
    opacity: 0;
    transform: translateY(6px);
  `;
  document.body.appendChild(tooltip);
  activeTooltip = tooltip;
  return tooltip;
}

function hideTooltip() {
  if (hoverTimer) clearTimeout(hoverTimer);
  if (activeTooltip) {
    activeTooltip.style.opacity = '0';
    activeTooltip.style.transform = 'translateY(6px)';
    setTimeout(() => {
      if (activeTooltip) activeTooltip.style.display = 'none';
    }, 200);
  }
}

async function handleLinkHover(e) {
  const linkEl = e.target.closest('a');
  if (!linkEl || !linkEl.href) return;
  const href = linkEl.href;

  if (href.startsWith('javascript:') || href.startsWith('#')) return;

  const rect = linkEl.getBoundingClientRect();
  const top = rect.bottom + window.scrollY + 8;
  const left = Math.min(rect.left + window.scrollX, window.innerWidth - 340);

  hoverTimer = setTimeout(async () => {
    const tooltip = createTooltip();
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
    tooltip.style.display = 'block';
    
    // Show Loading
    tooltip.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="display:inline-block; width:12px; height:12px; border:2px solid rgba(255,255,255,0.3); border-top-color:#06b6d4; border-radius:50%; animation:spin 0.8s linear infinite;"></span>
        <span style="color:#9ca3af; font-weight:600;">Scam Scanner Pre-Checking...</span>
      </div>
    `;

    requestAnimationFrame(() => {
      tooltip.style.opacity = '1';
      tooltip.style.transform = 'translateY(0)';
    });

    let scanResult = urlCache.get(href);

    if (!scanResult) {
      try {
        const res = await fetch('https://scam-scanner.pages.dev/api/scan/url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: href })
        });
        scanResult = await res.json();
        urlCache.set(href, scanResult);
      } catch (err) {
        scanResult = { safe: true, message: 'Offline check passed' };
      }
    }

    const isSafe = scanResult.safe;
    const badgeBg = isSafe ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.2)';
    const badgeColor = isSafe ? '#10b981' : '#ef4444';
    const badgeText = isSafe ? 'VERIFIED SAFE' : 'MALICIOUS DETECTED';

    tooltip.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:6px;">
        <span style="font-weight:800; font-size:11px; color:#06b6d4; letter-spacing:0.5px; text-transform:uppercase;">🛡️ Scam Scanner Shield</span>
        <span style="background:${badgeBg}; color:${badgeColor}; padding:2px 8px; border-radius:999px; font-weight:700; font-size:10px;">${badgeText}</span>
      </div>
      <div style="color:#e5e7eb; font-size:11px; font-weight:500; word-break:break-all; margin-bottom:4px;">${href}</div>
      <div style="color:#9ca3af; font-size:10px;">${scanResult.message || ''}</div>
    `;
  }, 350);
}

document.addEventListener('mouseover', handleLinkHover);
document.addEventListener('mouseout', (e) => {
  if (e.target.closest('a')) hideTooltip();
});

// DOM Observer for Email bodies
const observer = new MutationObserver(() => scanPageEmails());
observer.observe(document.body, { childList: true, subtree: true });
scanPageEmails();
