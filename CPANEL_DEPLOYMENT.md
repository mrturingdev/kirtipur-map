# Hosting Our Kirtipur on cPanel

This repository is configured for static web hosting on any **cPanel** server running Apache or LiteSpeed. No Node.js runtime or backend server is needed on the cPanel host—everything runs client-side using WebGL and Three.js.

---

## What's Included

- **`.cpanel.yml`**: Native deployment recipe for cPanel Git™ Version Control.
- **`.htaccess`**: Optimized server configuration:
  - **Gzip & Brotli compression**: Shrinks `index.html` from ~400 KB down to ~120 KB (~70% reduction) for ultra-fast initial loads.
  - **Browser Caching**: 1-year immutable caching for photos and icons; instant cache invalidation for HTML updates.
  - **Security Headers**: HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Content-Security-Policy (CSP) tailored for Three.js CDN & Google Fonts.
  - **HTTPS Redirection**: Automatic redirect from HTTP to HTTPS.
  - **Sensitive File Protection**: Blocks web access to `.git`, `.cpanel.yml`, `tools/`, `src/`, `tests/`, and markdown/script files.
- **`robots.txt` & `sitemap.xml`**: Pre-configured search engine crawling and place deep links.
- **`404.html`**: Themed 404 page matching the diorama's warm palette and pixel typography.
- **`tools/package_cpanel.mjs`**: Local packaging script to generate a clean `dist/` folder and `kirtipur-map-cpanel.zip`.

---

## Deployment Methods

### Method 1: Automated Deployment via cPanel Git™ Version Control (Recommended)

1. **Log in to cPanel** and navigate to **Git™ Version Control** (under *Files*).
2. Click **Create** to set up a new repository:
   - **Clone URL**: Your GitHub / Git repository URL.
   - **Repository Path**: `repositories/kirtipur-map` (inside your cPanel `$HOME`).
   - **Repository Name**: `kirtipur-map`.
3. Click **Create**.
4. By default, `.cpanel.yml` deploys files to `$HOME/public_html/`.
   - If deploying to a **subdomain** (e.g., `kirtipur.yourdomain.com` mapped to `$HOME/kirtipur.yourdomain.com/`) or a subfolder (e.g., `$HOME/public_html/kirtipur/`), edit `.cpanel.yml`:
     ```yaml
     export DEPLOYPATH=$HOME/kirtipur.yourdomain.com/
     ```
5. Click **Manage** next to the repository in cPanel, go to the **Deploy** tab, and click **Deploy HEAD Commit**.
6. Every time you push a commit or pull changes in cPanel, clicking **Deploy HEAD Commit** automatically refreshes the live site!

---

### Method 2: Manual Upload via cPanel File Manager (Zip Archive)

1. On your local machine, run the packaging script:
   ```bash
   npm run pack:cpanel
   ```
   *(or `node tools/package_cpanel.mjs`)*
   This generates `kirtipur-map-cpanel.zip` (~2.6 MB).
2. Open **cPanel > File Manager**.
3. Navigate to your target directory (e.g., `public_html` or your subdomain's document root).
4. Click **Upload** and select `kirtipur-map-cpanel.zip`.
5. Once uploaded, right-click `kirtipur-map-cpanel.zip` in File Manager and select **Extract**.
6. Delete the `.zip` file from the server. Your site is live!

---

### Method 3: FTP / SFTP

1. Run:
   ```bash
   npm run pack:cpanel
   ```
2. Connect to your cPanel hosting using FileZilla, Cyberduck, or your preferred FTP/SFTP client.
3. Upload all files and folders inside the generated `dist/` directory directly into `public_html/` (or your subdomain directory).

---

## SSL / HTTPS Setup

1. In cPanel, navigate to **SSL/TLS Status**.
2. Select your domain or subdomain and click **Run AutoSSL** to obtain a free Let's Encrypt / cPanel SSL certificate.
3. The `.htaccess` file will automatically redirect all unencrypted HTTP traffic to HTTPS.

---

## Verifying the Deployment

1. Open `https://yourdomain.com/` in your browser.
2. Confirm the 3D map loads and navigation works (keys 1–6, pan/zoom, place details panel).
3. Open browser DevTools (**Network tab**):
   - Check `index.html`: verify `content-encoding: gzip` (or `br`) is active.
   - Check images: verify `cache-control: public, max-age=...` is returned.
4. Test a non-existent URL (e.g. `https://yourdomain.com/non-existent`) to confirm the themed `404.html` appears.
