# Render + Supabase deployment

The Vercel frontend can call the Render API for all three ONNX endpoints and
authenticated cloud records. Existing Vercel inference stays available when
`VITE_API_BASE_URL` is unset. Solana and the local demo ledger remain separate.

## Current deployment

- Render Free, Singapore: `https://duriantrust-api.onrender.com`
- Service ID: `srv-dars44vavr4c73fvgt20`
- Verified live: health, all three ONNX endpoints, and production-origin CORS.
- `.env.production` contains only the public Render URL so Git deployments use it.
  Hosting environment variables can override that value. Local Vite development
  continues to use its own environment configuration.
- Supabase setup is still pending. Cloud records remain disabled until its URL and
  publishable key are configured and the migration is applied.
- This service uses the public Git repository connection. Deploy later backend
  commits with Render's Manual Deploy control; do not assume automatic deploys.

## 1. Supabase (Free)

1. Create a project in your account. Keep its database password in your password
   manager; do not put it in the repository or chat.
2. Run `supabase/migrations/202609260001_cloud_ledger.sql` once in SQL Editor.
   **Do not run `supabase/test_rls.sql` there**; that file creates fake Auth tables
   and is only for an empty disposable database.
3. Enable Email Auth. In the **Magic Link** email template include
   `Your DurianTrust sign-in code: {{ .Token }}`. The UI accepts email codes, not
   redirect links, so the hash router cannot consume an authentication fragment.
4. Configure a real SMTP provider before inviting arbitrary users. Supabase's
   default email service restricts recipients/rate; initially test with an allowed
   team email. Do not disable verification to work around mail delivery.
5. Copy the project URL and **publishable** key from project settings.

## 2. Render (Free)

Create a Blueprint from `https://github.com/vinhelysia/DurainCheckerDemo` using
the root `render.yaml`. The Git repo root is `durian-web3`, not its parent local
folder. There is no `rootDir` setting to add.

Set these Render environment variables:

| Variable | Value |
|---|---|
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_PUBLISHABLE_KEY` | Your publishable key; never a service/secret key |
| `ALLOWED_ORIGIN` | `https://durian-web3.vercel.app` (no trailing slash) |

Wait for `/health` to return `status: ok` and `cloud_configured: true`.
This means models loaded and variables exist, not that database permissions or
email delivery have been tested. The free service sleeps after inactivity; the
frontend allows up to 90 seconds, then offers an error instead of false success.

## 3. Vercel frontend

Add these environment variables and redeploy:

```text
VITE_API_BASE_URL=https://YOUR-SERVICE.onrender.com
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

`VITE_*` values are public in the browser bundle. No `service_role`, secret key,
database password, wallet secret, or Render API token belongs here.

The management portal then links to `#/manage/cloud`. Public QR records use
`#/cloud?batchId=<uuid>` and are read anonymously. Their immutable UUIDs keep
records distinct even when different users choose the same batch code.

## Security and data boundaries

- New cloud batches are private. The owner explicitly publishes all batch details
  and event history together. Making a record private revokes future anonymous
  reads; it cannot erase copies or screenshots already taken.
- Render forwards the user's Supabase JWT to PostgREST. It does not use a service
  key that bypasses RLS. Direct Data API access is subject to the same policies.
- Owners append events and change visibility. Column grants prevent choosing a
  different owner, backdating `created_at`, rewriting events, or deleting history.
- Input dates are declared event dates; server `created_at` is the time recorded.
  All measurements remain user-entered. Database administrators can change data;
  this is not a tamper-proof blockchain ledger or an authenticated lab report.
- Cloud ownership grants no Solana wallet role. Custody transfers still require
  the existing on-chain signatures. No local demo data is uploaded automatically.
- No images are persisted by the AI endpoints. CORS restricts browser origins,
  but is not authentication or a general abuse defense. AI remains public like
  the existing demo, with bounded request sizes and one concurrent inference.
  Add gateway rate limits if public usage grows.

## Verify before announcing cloud is live

1. Sign in as A via email code. Create a private batch and append an event.
2. Sign in on a second device as A; confirm both are visible.
3. Signed out and as B: the private QR must show not found/private.
4. Publish as A: anonymous QR opens the record and history; B cannot edit either.
5. Make private as A: anonymous access must fail again.
6. Call all three AI endpoints through the deployed frontend and inspect results.
7. Restart Render: records must remain in Supabase.

Local commands:

```sh
pip install -r backend/requirements.txt
python -m unittest backend.test_app -v
uvicorn backend.app:app --host 127.0.0.1 --port 8000
npm run lint
npm test
npm run build
```

Use `ALLOWED_ORIGIN=http://127.0.0.1:5173` for a frontend at that origin.
CI runs real ONNX inference and database isolation checks in disposable PostgreSQL.
Cloud transport tests use mocks; live Auth/PostgREST still require the deployment
checks above.

References: [Render Free](https://render.com/docs/free),
[Blueprint schema](https://render.com/docs/blueprint-spec),
[Supabase Email OTP](https://supabase.com/docs/guides/auth/auth-email-passwordless),
[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
