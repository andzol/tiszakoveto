// Vercel serverless function — POST /api/comment
// Verifies Supabase Google auth JWT, then stores comment with user_email.

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // ── Verify auth token ──────────────────────────────────────────────
  const authHeader = req.headers['authorization'] ?? '';
  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid or expired session' });

  const userData = await userRes.json();
  const userEmail = userData.email;
  if (!userEmail) return res.status(401).json({ error: 'Could not identify user' });

  // ── Validate body ──────────────────────────────────────────────────
  const { promise_id, comment, fulfilled } = req.body ?? {};
  if (!promise_id || typeof promise_id !== 'number')
    return res.status(400).json({ error: 'promise_id required' });
  if (!comment || typeof comment !== 'string' || !comment.trim())
    return res.status(400).json({ error: 'comment required' });
  if (comment.length > 2000)
    return res.status(400).json({ error: 'comment too long' });

  // ── Insert into Supabase ───────────────────────────────────────────
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      promise_id,
      comment: comment.trim(),
      fulfilled: fulfilled === true,
      user_email: userEmail,
      user_agent: req.headers['user-agent'] ?? null,
    }),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error('Supabase insert failed:', text);
    return res.status(500).json({ error: 'Failed to save comment' });
  }

  return res.status(200).json({ success: true });
};
