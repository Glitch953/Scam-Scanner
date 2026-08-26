const API_URL = 'https://scam-scanner.pages.dev/api/scan/url';

// Cache to avoid rescanning same URLs
const scanCache = new Map();
const bypassedUrls = new Set();

function getHost(u) {
  try { return new URL(u).hostname; }
  catch { return u; }
}

// Listen for bypass requests from block.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ALLOW_URL' && message.url) {
    const targetUrl = message.url;
    const host = getHost(targetUrl);
    bypassedUrls.add(targetUrl);
    bypassedUrls.add(host);
    // Override cache to safe
    scanCache.set(targetUrl, { safe: true, threatType: 'NONE', message: 'User Bypassed' });
    sendResponse({ success: true });
  }
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check top-level frame navigations (not iframes)
  if (details.frameId !== 0) return;

  const url = details.url;
  const host = getHost(url);

  // Skip extension pages, local urls, or user-bypassed URLs/domains
  if (url.startsWith('chrome-extension://') || url.startsWith('chrome://') || url.startsWith('about:')) return;
  if (bypassedUrls.has(url) || bypassedUrls.has(host)) return;

  if (scanCache.has(url)) {
    const cachedResult = scanCache.get(url);
    if (!cachedResult.safe) {
      redirectToBlockPage(details.tabId, url, cachedResult);
    }
    return;
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ url: url })
    });

    const result = await response.json();
    scanCache.set(url, result);

    if (!result.safe) {
      redirectToBlockPage(details.tabId, url, result);
    }
  } catch (error) {
    console.error('Error scanning URL:', error);
  }
});

function redirectToBlockPage(tabId, originalUrl, threatResult) {
  const blockPageUrl = chrome.runtime.getURL('html/block.html');
  // Pass details via query parameters
  const params = new URLSearchParams({
    url: originalUrl,
    threat: threatResult.threatType,
    message: threatResult.message
  });
  
  chrome.tabs.update(tabId, { url: `${blockPageUrl}?${params.toString()}` });
}
