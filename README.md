# NIT3004 Engineering Studio Portal

React + Vite + TypeScript portal for the final four weeks of NIT3004.

## Features
- Four-week journey: Commit → Prove → Validate → Deliver
- Week 1 check-in, class pulse, team conversation and promise
- Week 3 poster peer review
- Supabase persistence with Row Level Security
- Protected teacher dashboard at `/admin`

## Local setup
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Supabase
Run `supabase/schema.sql` in the Supabase SQL Editor. Create a teacher user and set `app_metadata.role` to `teacher`.

## Vercel
Import this repository and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Build command: `npm run build`; output directory: `dist`.

The Supabase publishable key is safe for browser use. Never commit a service-role or secret key.
