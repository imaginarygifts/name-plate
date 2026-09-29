# Imaginary Gifts — Cloudflare Catalogue

Cloudflare-native catalogue replacing the old Firebase catalogue.

## Resources
- D1: `imaginary-gifts-db`
- R2: `imaginary-gifts-media`
- Worker: `imaginary-gifts-catalogue`

## Before deployment
1. Put your D1 database ID into `wrangler.jsonc`.
2. Change `SETUP_KEY` to a long random secret.
3. Run `schema.sql` against the D1 database.
4. Deploy with Wrangler or connect this folder to GitHub and deploy from Cloudflare Workers.

## First admin
After deployment, POST JSON to `/api/setup` once:
{
  "setupKey": "YOUR_SETUP_KEY",
  "email": "your-admin-email",
  "password": "your-strong-password"
}
Then change/remove the setup key and redeploy.

## Image storage
Images are uploaded to R2 through the Worker. The browser never receives R2 credentials.
