export async function incrementStat(env, key) {
  try {
    const currentStr = await env.SCAM_SCANNER_KV.get(key);
    const current = currentStr ? parseInt(currentStr, 10) : 0;
    await env.SCAM_SCANNER_KV.put(key, (current + 1).toString());
  } catch (err) {
    console.error(`KV Error updating ${key}:`, err);
  }
}

export async function getStats(env) {
  try {
    const [total, safeUrls, maliciousUrls, safeEmails, scamEmails] = await Promise.all([
      env.SCAM_SCANNER_KV.get('totalScanned'),
      env.SCAM_SCANNER_KV.get('safeUrls'),
      env.SCAM_SCANNER_KV.get('maliciousUrls'),
      env.SCAM_SCANNER_KV.get('safeEmails'),
      env.SCAM_SCANNER_KV.get('scamEmails')
    ]);

    return {
      totalScanned: parseInt(total || '0', 10),
      safeUrls: parseInt(safeUrls || '0', 10),
      maliciousUrls: parseInt(maliciousUrls || '0', 10),
      safeEmails: parseInt(safeEmails || '0', 10),
      scamEmails: parseInt(scamEmails || '0', 10)
    };
  } catch (err) {
    console.error('KV Error getting stats:', err);
    return {
      totalScanned: 0, safeUrls: 0, maliciousUrls: 0, safeEmails: 0, scamEmails: 0
    };
  }
}
