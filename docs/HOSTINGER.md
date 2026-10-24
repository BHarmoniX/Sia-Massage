# Hostinger setup (client sites on a Hostinger account)

On standard Hostinger hosting the site is deployed as plain pre-built files (`static`
target): no PHP, no database, nothing running on the server to attack. The build's
`.htaccess` forces HTTPS, sends every security header and refuses to run any PHP or script
file. Live features (forms, payments) need a Cloudflare or Node host instead; on Hostinger,
contact is by phone, email or a third-party booking link.

Deploys go over **SSH with a dedicated key**, never an FTP password: an FTP password can be
phished or guessed and gives full access; a deploy key only works from GitHub's servers,
can be revoked on its own, and the server's identity is pinned so an impostor server can't
receive the upload.

Never paste a key, password or token into a chat, email or a file in a repository.

## 1. In the client's hPanel (needs a plan with SSH: Premium, Business or higher)

1. **Websites → the site → Advanced → SSH Access → Enable.** Note the **IP / host**,
   **port** (usually `65002`) and **username**.
2. **Security → SSL:** make sure the certificate is active and **Force HTTPS** is on.
3. Note the site folder, normally `domains/<domain>/public_html`.
4. Optional staging copy: **Domains → Subdomains → create `staging`**. Note its folder
   (often `domains/<domain>/public_html/staging`) and its address
   (`https://staging.<domain>`). Staging builds are marked noindex automatically.

## 2. Create the deploy key (on your Mac, once per client)

```bash
ssh-keygen -t ed25519 -N "" -C "github-deploy-<client>" -f ~/.ssh/<client>_deploy
```

- `~/.ssh/<client>_deploy.pub` is the **public** key: paste its contents into hPanel →
  Advanced → SSH Access → **Add SSH key**.
- `~/.ssh/<client>_deploy` is the **private** key: it goes only into GitHub (step 4).

## 3. Pin the server's identity

```bash
ssh-keyscan -p 65002 <host> > ~/.ssh/<client>_known_hosts
```

Then confirm it's really Hostinger by logging in once yourself (it should not ask about an
unknown host if you point it at that file):

```bash
ssh -i ~/.ssh/<client>_deploy -p 65002 -o UserKnownHostsFile=~/.ssh/<client>_known_hosts <user>@<host> "pwd"
```

## 4. In the client's GitHub repo

Settings → Secrets and variables → Actions:

| Kind | Name | Value |
|---|---|---|
| Variable | `DEPLOY_HOST` | `hostinger` |
| Variable | `PRODUCTION_URL` | e.g. `https://www.siamassage.com.au` |
| Variable | `HOSTINGER_SSH_PORT` | `65002` |
| Variable | `HOSTINGER_PATH` | e.g. `domains/siamassage.com.au/public_html` |
| Variable | `HOSTINGER_STAGING_PATH` | optional, staging folder from 1.4 |
| Variable | `STAGING_URL` | optional, e.g. `https://staging.siamassage.com.au` |
| Secret | `HOSTINGER_SSH_HOST` | host from 1.1 |
| Secret | `HOSTINGER_SSH_USER` | username from 1.1 |
| Secret | `HOSTINGER_SSH_KEY` | contents of `~/.ssh/<client>_deploy` (the private key) |
| Secret | `HOSTINGER_KNOWN_HOSTS` | contents of `~/.ssh/<client>_known_hosts` |

Once the secrets are in GitHub, delete the private key from your Mac if you won't need it
again (`rm ~/.ssh/<client>_deploy`); a new one can always be made and the old one removed
in hPanel.

## What happens on each push

```
branch → verify → staging folder (noindex) → live security scan of STAGING_URL
main   → verify → production folder         → live security scan of PRODUCTION_URL
```

The upload makes the server an exact copy of the build: stale or planted files are removed,
while certificate checks, Hostinger's `.user.ini` and a nested staging folder are kept.

## Recommended: Cloudflare in front (free)

Hostinger shared hosting has no edge firewall of its own. Pointing the domain's DNS at
Cloudflare (proxied) adds the bot filter, WAF, rate limiting and DNSSEC from
`docs/CLOUDFLARE.md` section B, while the files stay on Hostinger. Set SSL mode to
**Full (strict)** so traffic is encrypted all the way to Hostinger.
