# Tiszakoveto.hu — Deployment & DB Setup

## File structure

```
tiszakoveto.hu/
├── index.html          ← main page
├── style.css
├── app.js
├── vallalasok.json     ← edit this to update promise status
├── api/
│   └── comment.js      ← Vercel serverless function (stores comments)
├── vercel.json
├── .gitignore
└── .env.local.example  ← copy to .env.local with your keys
```

---

## 1 · GitHub — one-time setup

```powershell
# In the project folder
git init
git add .
git commit -m "Initial commit"

# Create a repo on github.com (name: tiszakoveto), then:
git remote add origin https://github.com/YOUR_USERNAME/tiszakoveto.git
git branch -M main
git push -u origin main
```

After this, **every push to `main` auto-deploys to Vercel** (≈30 s).

---

## 2 · Vercel — one-time setup

1. Go to **vercel.com** → New Project → Import from GitHub → select `tiszakoveto`
2. Leave Build Command and Output Directory blank (it's a static site + API)
3. Click **Deploy**

### Add environment variables in Vercel

Settings → Environment Variables → add both:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://xxxx.supabase.co` |
| `SUPABASE_SERVICE_KEY` | `eyJhbGci...` (service role key, NOT anon) |

### Custom domain

Settings → Domains → add `tiszakoveto.hu` and `tiszakoveto.com`
Then add the DNS records Vercel shows you in your domain registrar.

---

## 3 · Supabase — one-time setup

1. Go to **supabase.com** → New project
2. Note your **Project URL** and **service_role key** (Settings → API)
3. Open the SQL Editor and run:

```sql
-- Comments table (stores user feedback per promise)
CREATE TABLE comments (
  id          BIGSERIAL PRIMARY KEY,
  promise_id  INTEGER NOT NULL,
  comment     TEXT NOT NULL CHECK (char_length(comment) <= 2000),
  name        TEXT CHECK (char_length(name) <= 80),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Subscribers table (optional, for the email signup)
CREATE TABLE subscribers (
  id         BIGSERIAL PRIMARY KEY,
  email      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable public read access to comments (we read via Supabase dashboard)
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Allow inserts from the service key only (API function uses service key)
CREATE POLICY "service insert comments"
  ON comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service insert subscribers"
  ON subscribers FOR INSERT
  WITH CHECK (true);
```

4. To **read comments** anytime: go to supabase.com → your project → Table Editor → `comments`.
   You'll see all submissions with `promise_id`, `name`, `comment`, and `created_at`.

---

## 4 · Updating a promise (daily workflow)

1. Open `vallalasok.json`
2. Find the promise by its `todo` text
3. Change `"isdone": false` → `"isdone": true` and set `"donedate": "YYYY-MM-DD"`
4. Save and run:

```powershell
git add vallalasok.json
git commit -m "Mark promise #X as done"
git push
```

Vercel deploys in ~30 seconds. Done.

---

## 5 · Database design rationale

### Why JSON in Git for vallalasok?

- Zero backend needed — Vercel serves it as a static file
- Admin workflow is just edit + push; no CMS or DB migrations
- Full history in Git (you can see exactly when each promise was marked done)
- Works offline; no external dependency for reads

### Why Supabase for comments?

- Comments are user-generated at runtime — can't be in the static repo
- Supabase free tier: 500 MB storage, 2 GB bandwidth/month — more than enough
- Table Editor in the dashboard is the "readable for us" interface — no SQL needed
- Service-key insert means the public can submit but cannot read — private by default
- If comments grow large, export to CSV in one click

### Comments schema decision

Comments are intentionally **not** linked to a `promises` table in the DB — only the `promise_id` integer is stored. This keeps the schema simple: the source of truth for promise data stays in `vallalasok.json`, not Supabase.
