# Vercel + Supabase Deployment Checklist

## 1. Create a Supabase Project

1. Create a new project in Supabase.
2. Open SQL Editor and run [supabase/schema.sql](/C:/Users/USER/Desktop/푸른여행알리미/supabase/schema.sql).
3. In `Project Settings -> API Keys`, copy these values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Supabase documents that the public client should use the low-privilege publishable or legacy `anon` key, while server components should use a secret or legacy `service_role` key. [Supabase API keys](https://supabase.com/docs/guides/api/api-keys)

## 2. Prepare VAPID Keys

Web push in production needs fixed VAPID keys.

Set these environment variables:

- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

## 3. Import the Repository into Vercel

1. Go to Vercel and create a new project from GitHub.
2. Choose this repository.
3. Set `Framework Preset` to `Other`.
4. Leave the root directory as the repository root.

Vercel's import flow supports connecting an existing Git repository and lets you adjust build settings during import. [Vercel import docs](https://vercel.com/docs/getting-started-with-vercel/import)

## 4. Add Environment Variables in Vercel

Add the following variables in `Project Settings -> Environment Variables`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JWT_SECRET`
- `VAPID_SUBJECT`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`

Example placeholders are in [api/.env.example](/C:/Users/USER/Desktop/푸른여행알리미/api/.env.example).

## 5. Confirm the Routing Structure

This project is configured so that:

- `/` serves [frontend/index.html](/C:/Users/USER/Desktop/푸른여행알리미/frontend/index.html)
- `/app.js` serves [frontend/app.js](/C:/Users/USER/Desktop/푸른여행알리미/frontend/app.js)
- `/styles.css` serves [frontend/styles.css](/C:/Users/USER/Desktop/푸른여행알리미/frontend/styles.css)
- `/sw.js` serves [frontend/sw.js](/C:/Users/USER/Desktop/푸른여행알리미/frontend/sw.js)
- `/api/*` runs the Vercel Functions in [api](/C:/Users/USER/Desktop/푸른여행알리미/api)

## 6. Verify After Deployment

1. Open `/api/health` and confirm it returns `{"ok":true}`.
2. Test signup and login.
3. Test teacher class creation.
4. Test student class join.
5. Test push subscription on a student account.
6. Test notice creation and delivery.

## 7. Notes

- The current authentication flow still uses the app's own JWT, not Supabase Auth.
- Long term, moving from the `users` table login flow to Supabase Auth would be cleaner.
- Push notifications are sent during API requests, so this setup is suitable for small-scale use rather than high-volume broadcasting.
