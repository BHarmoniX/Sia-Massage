# Cloudflare setup

Cloudflare sits in front of every client site: it serves the pages from its global network,
filters attacks and bots before they reach the site, and runs the live parts (forms,
payments, chat). The base handles the code side; these are the dashboard settings.

Never paste a Cloudflare API token, password or secret key into a chat, an email or a file
in a repository. Tokens go only into GitHub's **Secrets** settings (encrypted) or a Terminal
prompt.

## A. Once, for your Cloudflare account

1. **Turn on two-factor login.** My Profile → Authentication → Two-Factor Authentication.
   Use an authenticator app or security key, not SMS. Your Cloudflare login controls every
   client site, so it's the most valuable key you own.
2. **Note your account ID.** It's in the dashboard URL after `dash.cloudflare.com/`. It's an
   identifier, not a password, but still store it as a GitHub secret, not in code.
3. **Create the deploy token** (one per client repo is safest; one shared token is acceptable
   while client numbers are small):
   1. My Profile → API Tokens → Create Token → template **Edit Cloudflare Workers** → Use template.
   2. **Account Resources:** Include → your account only.
   3. **Zone Resources:** Include → Specific zone → the client's domain (once it's on
      Cloudflare). Before that, choose your account's zones.
   4. **TTL:** set an end date (e.g. 1 year) so a forgotten token expires on its own.
   5. Create, copy it once, and paste it straight into GitHub (step C). Don't save it anywhere else.

## B. Per client domain (when the client's domain moves onto Cloudflare)

The domain stays registered where it is (e.g. Hostinger). Only its nameservers change to
Cloudflare's. Plan this with the client: email records must be copied across exactly.

1. **Add the site:** Websites → Add a domain → Free plan. Cloudflare scans the existing DNS
   records. Check every record, especially email (MX, SPF, DKIM, DMARC), before switching.
2. Change the nameservers at the registrar to the two Cloudflare gives you.
3. **SSL/TLS → Overview:** encryption mode **Full (strict)**.
4. **SSL/TLS → Edge Certificates:**
   - Always Use HTTPS: **On**
   - Minimum TLS Version: **TLS 1.2**
   - TLS 1.3: **On**
   - Automatic HTTPS Rewrites: **On**
   - HSTS: leave off here; the site already sends a two-year HSTS header.
5. **DNS → Settings:** DNSSEC → **Enable**, then add the DS record it shows at the registrar.
   This stops attackers redirecting the domain with forged DNS answers.
6. **Security → Bots:** Bot Fight Mode **On**. Block AI bots / AI Crawl Control: **block
   AI training crawlers** (matches the site's robots.txt).
7. **Security → WAF → Managed rules:** make sure the **Cloudflare Free Managed Ruleset** is
   deployed.
8. **Security → WAF → Rate limiting rules** (the free plan includes one rule):
   - Name: `Protect live endpoints`
   - If: URI Path starts with `/api/`
   - Rate: 20 requests per 10 seconds, per IP → Action: **Block** for 10 seconds.
   This sits in front of the site's own per-visitor limits (wrangler.jsonc), so floods are
   stopped at the edge before they cost anything.
9. **Email spoofing protection** (DNS): if the client doesn't send email from the domain,
   add `TXT @ "v=spf1 -all"` and `TXT _dmarc "v=DMARC1; p=reject;"` so nobody can send
   email pretending to be them. If they do send email, get these from their email provider.
10. **Connect the domain to the site:** add it to the client repo's `wrangler.jsonc`:
    `"routes": [{ "pattern": "www.example.com.au", "custom_domain": true }]`, then deploy.

## C. Per client repo on GitHub

Repo → Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Secret | `CLOUDFLARE_API_TOKEN` | the token from A.3 |
| Secret | `CLOUDFLARE_ACCOUNT_ID` | your account ID |
| Variable | `PRODUCTION_URL` | e.g. `https://www.samassage.com.au` |

## D. Turnstile (spam check on forms), per client

1. Turnstile → Add widget → name it after the client, add the client's domain (and the
   `workers.dev` preview domain), mode **Managed**.
2. The **site key** is public: put it in Cloudflare as a plain variable `TURNSTILE_SITE_KEY`.
3. The **secret key**: Workers & Pages → the client's worker → Settings → Variables and
   Secrets → add **Secret** `TURNSTILE_SECRET_KEY`. Never in GitHub, never in code.
4. Set `turnstile: true` in the client's `config/features.mjs`.

## What happens on each push (client repos)

```
branch / pull request → verify → preview URL (noindex) → live security scan → link posted on the PR
main                  → verify → production deploy    → live security scan of PRODUCTION_URL
```

Nothing deploys if any check fails. Roll back from Workers & Pages → the worker →
Deployments → pick the previous version → Rollback.
