// Vercel serverless function — POST /api/subscribe
// Stores email in Supabase subscribers table. No auth required.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  // ── Validate email ─────────────────────────────────────────────────
  const { email } = req.body ?? {};
  if (!email || typeof email !== 'string')
    return res.status(400).json({ error: 'email is required' });

  const clean = email.trim().toLowerCase();
  if (!EMAIL_RE.test(clean))
    return res.status(400).json({ error: 'invalid email address' });
  if (clean.length > 320)
    return res.status(400).json({ error: 'email too long' });

  // ── Upsert into Supabase (ignore duplicate emails) ────────────────
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/subscribers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      // On duplicate email: do nothing (keeps original subscribed_at)
      'Prefer': 'resolution=ignore-duplicates,return=minimal',
    },
    body: JSON.stringify({
      email: clean,
      user_agent: req.headers['user-agent'] ?? null,
    }),
  });

  if (!insertRes.ok) {
    const text = await insertRes.text();
    console.error('Supabase insert failed:', text);
    return res.status(500).json({ error: 'Failed to save subscription' });
  }

  // Return the same success message even for duplicates
  // (avoids leaking "is this email already subscribed?" info)
  return res.status(200).json({ success: true });
};
