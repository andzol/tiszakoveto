// Vercel serverless function — POST /api/comment
// Stores user comments to Supabase (not displayed publicly).
// Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { promise_id, name, comment } = req.body ?? {};

  if (!promise_id || typeof promise_id !== 'number') {
    return res.status(400).json({ error: 'promise_id is required and must be a number' });
  }
  if (!comment || typeof comment !== 'string' || comment.trim().length === 0) {
    return res.status(400).json({ error: 'comment is required' });
  }
  if (comment.length > 2000) {
    return res.status(400).json({ error: 'comment too long (max 2000 chars)' });
  }
  if (name && name.length > 80) {
    return res.status(400).json({ error: 'name too long (max 80 chars)' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY env vars');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  const payload = {
    promise_id,
    comment: comment.trim(),
    name: name ? name.trim() : null,
    user_agent: req.headers['user-agent'] ?? null,
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('Supabase insert failed:', text);
    return res.status(500).json({ error: 'Failed to save comment' });
  }

  return res.status(200).json({ success: true });
};
