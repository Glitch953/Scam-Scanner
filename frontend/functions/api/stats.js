import { getStats } from '../utils/stats.js';

export async function onRequestGet(context) {
  const { env } = context;

  try {
    const stats = await getStats(env);
    
    return Response.json({
      success: true,
      stats: stats
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
