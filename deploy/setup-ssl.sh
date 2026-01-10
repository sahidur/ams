#!/bin/bash

#===============================================================================
# AMS - SSL Setup Script
# Run: sudo /var/www/ams/deploy/setup-ssl.sh
#===============================================================================

set -e

APP_DIR="/var/www/ams"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     AMS - SSL Certificate Setup                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Get domain from user or use default
read -p "Enter your domain (e.g., ams.somadhanhobe.com): " DOMAIN
DOMAIN=${DOMAIN:-ams.somadhanhobe.com}

echo ""
echo "Setting up SSL for: $DOMAIN"
echo ""

# Step 1: Update Nginx configuration
echo "Step 1: Configuring Nginx..."
cat > /etc/nginx/sites-available/ams << EOF
server {
    listen 80;
    server_name $DOMAIN;

    # Allow large file uploads (2GB max)
    client_max_body_size 2G;
    
    # Increase timeouts for large uploads
    proxy_connect_timeout 600;
    proxy_send_timeout 600;
    proxy_read_timeout 600;
    send_timeout 600;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site and remove default
ln -sf /etc/nginx/sites-available/ams /etc/nginx/sites-enabled/ams
rm -f /etc/nginx/sites-enabled/default

# Test and restart Nginx
nginx -t
systemctl restart nginx
echo "✓ Nginx configured"

# Step 2: Allow HTTPS in firewall
echo ""
echo "Step 2: Configuring firewall..."
ufw allow 443/tcp >/dev/null 2>&1 || true
echo "✓ Firewall configured"

# Step 3: Install SSL certificate
echo ""
echo "Step 3: Installing SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email --redirect

echo "✓ SSL certificate installed"

# Step 4: Update .env with HTTPS URL
echo ""
echo "Step 4: Updating application configuration..."
if [[ -f "$APP_DIR/.env" ]]; then
    sed -i "s|NEXTAUTH_URL=.*|NEXTAUTH_URL=https://$DOMAIN|" "$APP_DIR/.env"
    echo "✓ NEXTAUTH_URL updated to https://$DOMAIN"
else
    echo "Warning: .env file not found at $APP_DIR/.env"
fi

# Step 5: Restart the application
echo ""
echo "Step 5: Restarting application..."
cd "$APP_DIR"
sudo -u $(stat -c '%U' $APP_DIR) pm2 restart ams-production 2>/dev/null || pm2 restart ams-production 2>/dev/null || echo "Note: Restart PM2 manually if needed"
echo "✓ Application restarted"

# Step 6: Setup auto-renewal
echo ""
echo "Step 6: Setting up SSL auto-renewal..."
systemctl enable certbot.timer >/dev/null 2>&1 || true
systemctl start certbot.timer >/dev/null 2>&1 || true
echo "✓ Auto-renewal configured"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     SSL Setup Complete!                                   ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""
echo "Your site is now available at: https://$DOMAIN"
echo ""
echo "Next steps:"
echo "  1. Create admin user: sudo $APP_DIR/deploy/create-admin.sh"
echo "  2. Visit https://$DOMAIN and login"
echo ""
