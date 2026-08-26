import { incrementStat } from '../../utils/stats.js';

const phishingKeywords = [
  'urgent', 'password reset', 'verify your account', 'bank', 'winner', 'lottery',
  'account suspended', 'unauthorized login', 'click here', 'act now'
];

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const { body } = await request.json();
    if (!body) return new Response(JSON.stringify({ error: 'Email body is required' }), { status: 400 });

    const lowerBody = body.toLowerCase();
    
    // Heuristic Scan
    let matchedKeywords = [];
    for (const keyword of phishingKeywords) {
      if (lowerBody.includes(keyword)) {
        matchedKeywords.push(keyword);
      }
    }

    if (matchedKeywords.length >= 2) {
      await incrementStat(env, 'scamEmails');
      return Response.json({
        safe: false,
        riskLevel: 'HIGH',
        message: `High risk of phishing. Detected suspicious keywords: ${matchedKeywords.join(', ')}`
      });
    }

    if (matchedKeywords.length === 1) {
      await incrementStat(env, 'scamEmails');
      return Response.json({
        safe: false,
        riskLevel: 'MEDIUM',
        message: `Potential phishing attempt. Suspicious keyword detected: ${matchedKeywords[0]}`
      });
    }

    await incrementStat(env, 'safeEmails');
    return Response.json({
      safe: true,
      riskLevel: 'LOW',
      message: 'Email appears safe. No common phishing patterns detected.'
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
