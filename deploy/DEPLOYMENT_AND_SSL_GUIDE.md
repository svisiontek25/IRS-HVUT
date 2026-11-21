# Production Deployment Guide: Nginx Reverse Proxy, Custom Domain & SSL (Let's Encrypt)

> **Application:** IRS-HVUT v1.1 (IRS Form 2290 Heavy Highway Vehicle Use Tax Platform)  
> **Target OS:** Ubuntu 22.04 / 24.04 LTS, Debian 12, or Docker Host  
> **Security Baseline:** IRS Pub 4164, NIST SP 800-52 Rev. 2, PCI-DSS v4.0 (Stripe Compliant), SSL Labs A+ Rating  
> **Repository Path:** `deploy/`

---

## 1. Architecture Overview

In production, end users and carriers must never access the Node.js / Next.js application port (`3000`) directly. Instead, traffic flows through **Nginx** as an edge reverse proxy:

```
[ Carrier / User Browser ]
           │
           │ HTTPS (Port 443) / Encrypted TLS 1.3
           ▼
[ Cloudflare / Route 53 / Public DNS ]
           │
           ▼
[ Linux Server Firewall (ufw: allow 80, 443) ]
           │
           ▼
┌──────────────────────────────────────────────────────────────┐
│  Nginx Edge Reverse Proxy (:80, :443)                        │
│  - Port 80 -> 301 Permanent Redirect to HTTPS                │
│  - SSL / TLS Termination (Let's Encrypt Certificates)        │
│  - Security Headers (HSTS, CSP, X-Frame-Options, nosniff)    │
│  - Next.js Static Asset Caching (/_next/static -> 1 Year)   │
│  - Rate Limiting Zones (/api/auth/login, /api/auth/register) │
│  - WebSocket Upgrade Support ($http_upgrade)                 │
└──────────────────────────────┬───────────────────────────────┘
                               │
                               │ HTTP/1.1 Loopback (127.0.0.1:3000)
                               ▼
┌──────────────────────────────────────────────────────────────┐
│  Next.js 15 Application Daemon (Systemd / PM2 / Docker)       │
│  - Server-Side Rendering (SSR) & API Endpoints               │
│  - Form 2290 PDF Generation Engine (pdf-lib)                 │
│  - Stripe Elements Payment Processing                        │
│  - IRS Modernized e-File (MeF) SOAP/XML Gateway              │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Requisites & DNS Setup

Before configuring Nginx and SSL, configure your public DNS records with your registrar (GoDaddy, Namecheap, Cloudflare, AWS Route 53, etc.):

| Record Type | Host / Name | Value / Destination | TTL |
|---|---|---|---|
| **A Record** | `@` (or `yourdomain.com`) | `YOUR_SERVER_PUBLIC_IP` (e.g. `203.0.113.50`) | Automatic or 300s |
| **A Record** or **CNAME** | `www` | `yourdomain.com` (or server IP) | Automatic or 300s |

Verify DNS propagation from your terminal:
```bash
dig +short yourdomain.com
dig +short www.yourdomain.com
```

Ensure ports **80** (HTTP) and **443** (HTTPS) are allowed through your server firewall:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
sudo ufw status
```

---

## 3. Option A: Native Linux Deployment (Ubuntu/Debian) — Recommended

### Step 1: Install System Dependencies
```bash
sudo apt-get update && sudo apt-get upgrade -y
sudo apt-get install -y nginx certbot python3-certbot-nginx git curl openssl
```

Install Node.js 22 LTS (via NodeSource):
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v # Should display v22.x.x
```

---

### Step 2: Deploy and Build the Application

Clone your repository into `/var/www/irs-hvut`:
```bash
sudo mkdir -p /var/www/irs-hvut
sudo chown -R $USER:$USER /var/www/irs-hvut
git clone https://github.com/svisiontek25/IRS-HVUT.git /var/www/irs-hvut
cd /var/www/irs-hvut

# Install dependencies and build optimized production bundle
npm ci
npm run build
```

Configure permissions so the system user can run the service and write to the database:
```bash
sudo mkdir -p /var/www/irs-hvut/data
sudo chown -R www-data:www-data /var/www/irs-hvut
sudo chmod -R 775 /var/www/irs-hvut/data
```

---

### Step 3: Install & Start the Systemd Service

Copy the production systemd service unit:
```bash
sudo cp deploy/systemd/irs-hvut.service /etc/systemd/system/irs-hvut.service

# Reload systemd daemon, enable on boot, and start
sudo systemctl daemon-reload
sudo systemctl enable irs-hvut
sudo systemctl start irs-hvut

# Check service status
sudo systemctl status irs-hvut
```

Verify that the app is listening locally on port 3000:
```bash
curl -I http://127.0.0.1:3000
```

---

### Step 4: Configure Nginx & Deploy SSL (Let's Encrypt)

1. Generate a 2048-bit Diffie-Hellman parameter for Perfect Forward Secrecy:
```bash
sudo openssl dhparam -out /etc/nginx/dhparam.pem 2048
```

2. Copy the Nginx configuration:
```bash
sudo cp deploy/nginx/irs-hvut.conf /etc/nginx/sites-available/irs-hvut.conf
```

3. Replace `yourdomain.com` with your real domain:
```bash
sudo sed -i 's/yourdomain.com/YOUR_ACTUAL_DOMAIN.com/g' /etc/nginx/sites-available/irs-hvut.conf
```

4. Enable the site and remove the default Nginx welcome page:
```bash
sudo ln -sf /etc/nginx/sites-available/irs-hvut.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

5. Run the automated Let's Encrypt script:
```bash
sudo chmod +x deploy/certbot/init-letsencrypt.sh
sudo ./deploy/certbot/init-letsencrypt.sh YOUR_ACTUAL_DOMAIN.com admin@YOUR_ACTUAL_DOMAIN.com
```

*(Alternatively, you can run Certbot directly)*:
```bash
sudo certbot --nginx -d YOUR_ACTUAL_DOMAIN.com -d www.YOUR_ACTUAL_DOMAIN.com --email admin@YOUR_ACTUAL_DOMAIN.com --agree-tos --redirect
```

6. Test Nginx configuration and reload:
```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

### Step 5: Test Automatic SSL Certificate Renewal

Let's Encrypt certificates are valid for 90 days. Certbot installs a systemd timer that runs twice daily to automatically renew certificates expiring within 30 days.

Test the renewal process with a dry run:
```bash
sudo certbot renew --dry-run
```

Check the active renewal timer:
```bash
sudo systemctl list-timers | grep certbot
```

---

## 4. Option B: Docker Compose Deployment

If you prefer a containerized deployment that packages Next.js, Nginx, and Certbot into Docker containers:

1. Navigate to the Docker deployment directory:
```bash
cd deploy/docker
```

2. Create a `.env` file with your production environment variables:
```bash
cat <<EOF > .env
DOMAIN=yourdomain.com
EMAIL=admin@yourdomain.com
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
EOF
```

3. Launch the container stack:
```bash
docker compose up -d --build
```

4. Check running containers:
```bash
docker compose ps
docker compose logs -f
```

---

## 5. Security & Verification Checklist

Once deployed, run these verification tests:

| Verification Test | Command / URL | Expected Result |
|---|---|---|
| **HTTP to HTTPS Redirect** | `curl -I http://yourdomain.com` | `HTTP/1.1 301 Moved Permanently`<br>`Location: https://yourdomain.com/` |
| **HSTS Header Present** | `curl -I https://yourdomain.com` | `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` |
| **MIME Sniffing Prevention** | `curl -I https://yourdomain.com` | `X-Content-Type-Options: nosniff` |
| **Clickjacking Protection** | `curl -I https://yourdomain.com` | `X-Frame-Options: SAMEORIGIN` |
| **SSL Labs Grade** | `https://www.ssllabs.com/ssltest/analyze.html?d=yourdomain.com` | **Rating: A+** |
| **Static Asset Caching** | Inspect `/_next/static/...` in browser DevTools | `Cache-Control: public, max-age=31536000, immutable` |
| **Rate Limiter Test** | Run 10 rapid POSTs to `/api/auth/login` | `HTTP/1.1 429 Too Many Requests` after burst threshold |
| **Schedule 1 PDF Generation** | Navigate to `/dashboard` -> Download Schedule 1 | Watermarked Schedule 1 PDF streams instantly |

---

## 6. Maintenance Commands Quick Reference

```bash
# Check Next.js application logs in real-time
sudo journalctl -u irs-hvut -f

# Check Nginx access and error logs
sudo tail -f /var/log/nginx/irs-hvut-access.log
sudo tail -f /var/log/nginx/irs-hvut-error.log

# Restart Next.js application after code updates
cd /var/www/irs-hvut
git pull origin main
npm ci
npm run build
sudo systemctl restart irs-hvut

# Test and reload Nginx configuration
sudo nginx -t && sudo systemctl reload nginx
```
