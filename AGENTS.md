<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Local development

Cloud Agents install dependencies with `.cursor/install.sh` and boot services with `.cursor/start.sh`. That start script launches Docker, runs the local Supabase stack from `supabase/config.toml`, writes `.env.local`, ensures a local admin user, and runs `npm run dev -- --webpack` on port 3000. Webpack is required because Turbopack in Next.js 16.2.9 fails to compile `next/font/google`.

The local admin is `admin@almstead.com` with password `local-dev-password`. The login page only starts Google OAuth, which needs a hosted Supabase project and a Google OAuth client. Against this local stack, sign in with the Auth password grant and store the session in the `sb-127-auth-token` cookie that `@supabase/ssr` already reads.

`NEXT_PUBLIC_AMPLITUDE_API_KEY`, `CRON_SECRET`, and `ZAPIER_DIGEST_WEBHOOK_URL` are optional. Amplitude stays idle without a key, and the digest route rejects calls that do not present `CRON_SECRET`.

Checks: `npm run lint`, `npx tsc --noEmit`, and `npm run build`.
