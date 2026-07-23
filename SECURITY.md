# Security Policy

## Reporting a vulnerability

If you discover a security issue, please **do not open a public issue**. Email the
maintainer privately with details and steps to reproduce. You'll get an
acknowledgement within a few days.

## Handling secrets

- Never commit secrets. `.env` files are git-ignored; only `.env.example`
  (placeholders) is tracked.
- Server secrets (database URLs, the Supabase service-role key, the Supabase JWT
  secret) live only in the server environment / Netlify environment variables.
- The only Supabase key that may ship to the browser is the **anon** public key,
  which is designed to be public and is protected by Row Level Security.
- Rotate keys immediately if one is ever exposed.

## Data sensitivity

Griha stores personal data about household staff (names, phone numbers, salary,
and optionally documents). Treat this data with care:

- Do not store government identity numbers (e.g. Aadhaar) in plaintext.
- Follow least-privilege access; the browser never receives the service-role key.
