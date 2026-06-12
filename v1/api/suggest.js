// Vercel serverless function — POST /api/suggest
// Accepts user-suggested missing promises, verifies Google auth via Supabase JWT.

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

  // ── Verify auth ────────────────────────────────────────────────────
  const authHeader  = req.headers['authorization'] ?? '';
  const accessToken = authHeader.replace('Bearer ', '').trim();
  if (!accessToken) return res.status(401).json({ error: 'Not authenticated' });

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${accessToken}` },
  });
  if (!userRes.ok) return res.status(401).json({ error: 'Invalid or expired session' });

  const { email: userEmail } = await userRes.json();
  if (!userEmail) return res.status(401).json({ error: 'Could not identify user' });

  // ── Validate body ──────────────────────────────────────────────────
  const { todo, category, isdone, donedate, deadline, source } = req.body ?? {};

  if (!todo || typeof todo !== 'string' || !todo.trim())
    return res.status(400).json({ error: 'todo is required' });
  if (todo.length > 600)
    return res.status(400).json({ error: 'todo too long (max 600 chars)' });
  if (!category || typeof category !== 'string')
    return res.status(400).json({ error: 'category is required' });
  if (typeof isdone !== 'boolean')
    return res.status(400).json({ error: 'isdone must be boolean' });
  if (isdone && !donedate)
    return res.status(400).json({ error: 'donedate required when isdone is true' });

  // ── Insert into Supabase ───────────────────────────────────────────
  const payload = {
    todo:       todo.trim(),
    category,
    isdone,
    donedate:   donedate  || null,
    deadline:   !isdone ? (deadline || '2030-03-30') : null,
    source:     source?.trim() || null,
    user_email: userEmail,
    user_agent: req.headers['user-agent'] ?? null,
  };

  const insertRes = await fetch(`${supabaseUrl}/rest/v1/suggestions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error('Supabase insert failed:', text);
    return res.status(500).json({ error: 'Failed to save suggestion' });
  }

  return res.status(200).json({ success: true });
};
