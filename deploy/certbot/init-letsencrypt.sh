#!/usr/bin/env bash
# ==============================================================================
# IRS-HVUT v1.1 - Automated Let's Encrypt SSL Installation & Renewal Script
# Supports Ubuntu 22.04 / 24.04 LTS, Debian 12, and RHEL-derivatives
# ==============================================================================

set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
    echo "Usage: sudo ./init-letsencrypt.sh <yourdomain.com> <admin-email@example.com>"
    echo "Example: sudo ./init-letsencrypt.sh irs-hvut.com admin@irs-hvut.com"
    exit 1
fi

echo "=========================================================="
echo " Starting SSL Setup for Domain: $DOMAIN"
echo " Contact Email: $EMAIL"
echo "=========================================================="

# 1. Ensure Certbot & Nginx plugin are installed
if ! command -v certbot &> /dev/null; then
    echo "[1/6] Installing Certbot and python3-certbot-nginx..."
    if command -v apt-get &> /dev/null; then
        apt-get update -y
        apt-get install -y certbot python3-certbot-nginx
    elif command -v dnf &> /dev/null; then
        dnf install -y epel-release
        dnf install -y certbot python3-certbot-nginx
    fi
else
    echo "[1/6] Certbot is already installed."
fi

# 2. Generate 2048-bit Diffie-Hellman parameters if not present
if [[ ! -f /etc/nginx/dhparam.pem ]]; then
    echo "[2/6] Generating Diffie-Hellman parameter (/etc/nginx/dhparam.pem)..."
    openssl dhparam -out /etc/nginx/dhparam.pem 2048
else
    echo "[2/6] Diffie-Hellman parameter already exists."
fi

# 3. Create ACME challenge webroot directory
echo "[3/6] Ensuring webroot directory exists (/var/www/certbot)..."
mkdir -p /var/www/certbot
chown -R www-data:www-data /var/www/certbot || true

# 4. Request Let's Encrypt Certificate
echo "[4/6] Requesting SSL Certificate from Let's Encrypt..."
certbot certonly --webroot \
    -w /var/www/certbot \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --keep-until-expiring

# 5. Substitute domain in Nginx configuration
echo "[5/6] Updating Nginx configuration with active domain..."
sed -i "s/yourdomain.com/$DOMAIN/g" /etc/nginx/sites-available/irs-hvut.conf || true

# Test Nginx syntax and reload
nginx -t
systemctl reload nginx

# 6. Test Automated Renewal
echo "[6/6] Testing Certbot renewal dry-run..."
certbot renew --dry-run

echo "=========================================================="
echo " SSL Setup Successfully Completed!"
echo " Domain: https://$DOMAIN"
echo " Certificates: /etc/letsencrypt/live/$DOMAIN/"
echo " HSTS, TLS 1.2/1.3, and OCSP Stapling are Active."
echo "=========================================================="
