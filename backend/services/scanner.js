const axios = require('axios');

// Mock fallback logic & heuristics
const knownBadDomains = ['scam-site.com', 'free-money.net', 'phishing-login.info', 'malicious-download.org', 'test-malware.com', 'scam', 'phishing', 'fake-bank', 'login-verify-account'];
const scamKeywords = ['urgent', 'account suspended', 'click here to win', 'lottery winner', 'verify your account', 'bank transfer', 'crypto bonus', 'prize winner'];

// Statistics Tracking
let stats = {
  totalScanned: 0,
  safeUrls: 0,
  maliciousUrls: 0,
  safeEmails: 0,
  scamEmails: 0
};

const getStats = () => stats;

const scanUrl = async (url) => {
  stats.totalScanned++;
  
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

  if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
    try {
      const response = await axios.post(
        `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
        {
          client: { clientId: "scam-scanner", clientVersion: "1.0.0" },
          threatInfo: {
            threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: [{ url: url }]
          }
        }
      );

      if (response.data && response.data.matches && response.data.matches.length > 0) {
        stats.maliciousUrls++;
        return {
          safe: false,
          threatType: response.data.matches[0].threatType,
          riskLevel: 'HIGH',
          message: `Flagged as ${response.data.matches[0].threatType} by Google Safe Browsing.`
        };
      } else {
        // Double check against heuristic patterns even if Google Safe Browsing doesn't list it yet
        const lowerUrl = url.toLowerCase();
        const suspiciousMatch = knownBadDomains.find(bad => lowerUrl.includes(bad));
        if (suspiciousMatch) {
          stats.maliciousUrls++;
          return {
            safe: false,
            threatType: 'SUSPICIOUS_DOMAIN',
            riskLevel: 'HIGH',
            message: `URL contains suspicious pattern "${suspiciousMatch}".`
          };
        }

        stats.safeUrls++;
        return {
          safe: true,
          threatType: 'NONE',
          riskLevel: 'LOW',
          message: 'This URL is verified safe by Google Safe Browsing.'
        };
      }
    } catch (err) {
      console.error("Google Safe Browsing API Notice:", err.response ? err.response.data : err.message);
      // If permission denied or API propagating, fallback to smart heuristic scanning
    }
  }

  // Smart Heuristic Fallback logic
  await new Promise(resolve => setTimeout(resolve, 500));
  const lowerUrl = url.toLowerCase();
  const suspiciousMatch = knownBadDomains.find(bad => lowerUrl.includes(bad));

  if (suspiciousMatch) {
    stats.maliciousUrls++;
    return {
      safe: false,
      threatType: 'MALWARE / PHISHING (Detected)',
      riskLevel: 'HIGH',
      message: `Flagged: URL matched threat database keyword "${suspiciousMatch}".`
    };
  }

  stats.safeUrls++;
  return {
    safe: true,
    threatType: 'NONE',
    riskLevel: 'LOW',
    message: 'This URL appears to be safe.'
  };
};

const scanEmail = async (text) => {
  stats.totalScanned++;
  await new Promise(resolve => setTimeout(resolve, 1000));

  const lowerText = text.toLowerCase();
  let score = 0;
  
  scamKeywords.forEach(keyword => {
    if (lowerText.includes(keyword)) score += 1;
  });

  if (score >= 2) {
    stats.scamEmails++;
    return {
      safe: false,
      threatType: 'SCAM EMAIL',
      riskLevel: 'HIGH',
      score: score,
      message: 'This email exhibits multiple signs of being a scam.'
    };
  }

  stats.safeEmails++;
  return {
    safe: true,
    threatType: 'NONE',
    riskLevel: 'LOW',
    score: score,
    message: 'This email appears normal.'
  };
};

module.exports = {
  scanUrl,
  scanEmail,
  getStats
};
