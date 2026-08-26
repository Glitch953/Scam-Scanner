import { incrementStat } from '../../utils/stats.js';

const knownBadDomains = ['scam-site.com', 'free-money.net', 'phishing-login.info', 'malicious-download.org', 'test-malware.com', 'scam', 'phishing', 'fake-bank', 'login-verify-account'];

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { url } = await request.json();
    if (!url) return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    await incrementStat(env, 'totalScanned');

    const apiKey = env.GOOGLE_SAFE_BROWSING_API_KEY;

    if (apiKey && apiKey !== 'YOUR_API_KEY_HERE') {
      try {
        const response = await fetch(`https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client: { clientId: "scam-scanner", clientVersion: "1.0.0" },
            threatInfo: {
              threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
              platformTypes: ["ANY_PLATFORM"],
              threatEntryTypes: ["URL"],
              threatEntries: [{ url: targetUrl }]
            }
          })
        });

        const data = await response.json();

        if (data.matches && data.matches.length > 0) {
          await incrementStat(env, 'maliciousUrls');
          return Response.json({
            safe: false,
            threatType: data.matches[0].threatType,
            riskLevel: 'HIGH',
            message: `Flagged as ${data.matches[0].threatType} by Google Safe Browsing.`
          });
        }
      } catch (err) {
        // Fallback to heuristics
      }
    }

    // Heuristics Check
    const lowerUrl = targetUrl.toLowerCase();
    const suspiciousMatch = knownBadDomains.find(bad => lowerUrl.includes(bad));

    if (suspiciousMatch) {
      await incrementStat(env, 'maliciousUrls');
      return Response.json({
        safe: false,
        threatType: 'SUSPICIOUS_DOMAIN',
        riskLevel: 'HIGH',
        message: `URL contains suspicious pattern "${suspiciousMatch}".`
      });
    }

    await incrementStat(env, 'safeUrls');
    return Response.json({
      safe: true,
      threatType: 'NONE',
      riskLevel: 'LOW',
      message: 'This URL is verified safe.'
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
