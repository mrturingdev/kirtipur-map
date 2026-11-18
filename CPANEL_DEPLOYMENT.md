# Hosting Our Kirtipur on cPanel (Bloxrunner Setup)

This project uses the exact same automated deployment architecture as **bloxrunner**: a GitHub Actions workflow that talks to the cPanel UAPI over HTTPS (Port 2083) to automatically clone, update, and deploy via `.cpanel.yml` without needing SSH keys.

---

## Why cPanel API over HTTPS?

On this hosting environment, **inbound SSH from CI is blocked** (TCP 22 opens without an SSH banner), and cPanel's web UI often fails when trying to enter clone credentials manually.

By using `.github/workflows/deploy.yml`:
1. GitHub Actions connects securely to cPanel's REST API over HTTPS (`https://mrturingdev.com:2083/execute`).
2. If the repository doesn't exist yet in cPanel, the workflow instructs cPanel to clone `https://github.com/mrturingdev/kirtipur-map.git` directly on the server.
3. Every push to `main` pulls the latest commits (`VersionControl/update`) and runs `.cpanel.yml` (`VersionControlDeployment/create`) to copy files to `$HOME/kirtipur.mrturingdev.com/`.

---

## 1. Required Repository Secrets

Add the same cPanel secrets used in `bloxrunner` to `mrturingdev/kirtipur-map` (via GitHub: **Settings** &rarr; **Secrets and variables** &rarr; **Actions** &rarr; **New repository secret**):

| Secret | Value | Description |
|---|---|---|
| `CPANEL_HOST` | `mrturingdev.com` *(or server hostname)* | cPanel domain or server address |
| `CPANEL_USER` | *your cPanel username* | Your cPanel login username |
| `CPANEL_TOKEN` | *your API token* | Generated in cPanel &rarr; Security &rarr; **Manage API Tokens** |
| `CPANEL_REPO` | `/home/<user>/repositories/kirtipur-map` | Repository path on cPanel |
| `CPANEL_PORT` | `2083` *(optional, defaults to 2083)* | cPanel SSL Port |

---

## 2. Target Path in `.cpanel.yml`

The deployment recipe [`.cpanel.yml`](.cpanel.yml) is configured to deploy directly to your subdomain:

```yaml
---
deployment:
  tasks:
    - /bin/chmod 755 "$HOME/repositories" "$HOME/repositories/kirtipur-map" 2>/dev/null || true
    - /bin/chmod -R a+rX "$HOME/repositories/kirtipur-map" 2>/dev/null || true
    - export DEPLOYPATH=$HOME/kirtipur.mrturingdev.com/
    - /bin/mkdir -p "$DEPLOYPATH"
    - /bin/cp -Rf index.html favicon.ico 404.html robots.txt sitemap.xml .htaccess img "$DEPLOYPATH"
```

---

## 3. How to Trigger Deployment

Once the 3 main secrets (`CPANEL_HOST`, `CPANEL_USER`, `CPANEL_TOKEN`) are added to GitHub:
- **Automatic**: Every `git push` to `main` deploys automatically.
- **Manual**: Go to GitHub &rarr; **Actions** &rarr; **Deploy to cPanel** &rarr; **Run workflow**.

The workflow output will stream the deployment status and server logs directly into GitHub Actions.
