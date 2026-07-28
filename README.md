# Expense Tracker

Simple expense tracker frontend connected to Supabase.

## Files
- `index.html` — main page structure
- `style.css` — styling
- `config.js` — Supabase URL + publishable key
- `app.js` — app logic (fetch, add, delete transactions)

## Before it works: check your RLS policy

Your `transactions` table showed **"1 RLS policy"** in Supabase. Row Level Security
(RLS) controls who can read/write data. If the existing policy only allows access
to logged-in users (and this app has no login yet), your inserts/reads will fail
silently or show a permission error.

**Quick fix for now (personal use, no login yet):**
1. Go to Supabase Dashboard → Authentication → Policies (or Table Editor → transactions → RLS)
2. Make sure there's a policy allowing `SELECT`, `INSERT`, and `DELETE` for the
   `anon` role (public access), OR temporarily disable RLS on the table while
   testing locally.
3. Once you add login/auth later, tighten this back up so only the owner can
   access their own data.

## How to run it
Just open `index.html` in your browser (or use VS Code Live Server).
No build step needed — plain HTML/CSS/JS.

## Push to GitHub (do this once it works!)
```bash
git init
git add .
git commit -m "Initial commit: expense tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/expense-tracker.git
git push -u origin main
```

This way kahit ano pang mangyari sa local machine, safe na yung code mo online.
