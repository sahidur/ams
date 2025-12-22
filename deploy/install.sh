#!/bin/bash

#===============================================================================
# AMS (Attendance Management System) - Ubuntu Production Installer
# One-click installation script for Ubuntu 20.04/22.04/24.04 LTS
#===============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="ams"
APP_DIR="/var/www/$APP_NAME"
NODE_VERSION="20"
PM2_APP_NAME="ams-production"

# Default values (can be overridden by environment variables or prompts)
GIT_REPO="${GIT_REPO:-}"
DOMAIN="${DOMAIN:-}"
DB_HOST="${DB_HOST:-db-postgresql-ams-do-user-2226216-0.i.db.ondigitalocean.com}"
DB_PORT="${DB_PORT:-25060}"
DB_NAME="${DB_NAME:-defaultdb}"
DB_USER="${DB_USER:-doadmin}"
DB_PASSWORD="${DB_PASSWORD:-}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET:-}"

#===============================================================================
# Helper Functions
#===============================================================================

print_header() {
    echo ""
    echo -e "${BLUE}============================================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}============================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

prompt_input() {
    local prompt="$1"
    local var_name="$2"
    local default="$3"
    local is_secret="$4"
    
    if [[ -n "$default" ]]; then
        prompt="$prompt [$default]"
    fi
    
    if [[ "$is_secret" == "true" ]]; then
        read -sp "$prompt: " value
        echo ""
    else
        read -p "$prompt: " value
    fi
    
    if [[ -z "$value" && -n "$default" ]]; then
        value="$default"
    fi
    
    eval "$var_name='$value'"
}

#===============================================================================
# Installation Steps
#===============================================================================

install_system_dependencies() {
    print_header "Installing System Dependencies"
    
    apt-get update
    apt-get upgrade -y
    
    apt-get install -y \
        curl \
        wget \
        git \
        build-essential \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        htop \
        unzip
    
    print_success "System dependencies installed"
}

install_nodejs() {
    print_header "Installing Node.js $NODE_VERSION"
    
    if command -v node &> /dev/null; then
        current_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
        if [[ "$current_version" -ge "$NODE_VERSION" ]]; then
            print_success "Node.js $(node -v) already installed"
            return
        fi
    fi
    
    curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
    apt-get install -y nodejs
    
    print_success "Node.js $(node -v) installed"
    print_success "npm $(npm -v) installed"
}

install_pm2() {
    print_header "Installing PM2 Process Manager"
    
    if command -v pm2 &> /dev/null; then
        print_success "PM2 already installed"
    else
        npm install -g pm2
        print_success "PM2 installed"
    fi
    
    pm2 startup systemd -u root --hp /root
    print_success "PM2 startup configured"
}

setup_swap() {
    print_header "Setting Up Swap Space (for low-memory servers)"
    
    # Check if swap already exists
    if [[ $(swapon --show | wc -l) -gt 0 ]]; then
        print_success "Swap already configured"
        return
    fi
    
    # Create 2GB swap file
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    
    # Make swap permanent
    echo '/swapfile none swap sw 0 0' | tee -a /etc/fstab
    
    # Optimize swap settings
    sysctl vm.swappiness=10
    echo 'vm.swappiness=10' | tee -a /etc/sysctl.conf
    
    print_success "2GB swap space created"
}

setup_firewall() {
    print_header "Configuring Firewall"
    
    ufw default deny incoming
    ufw default allow outgoing
    ufw allow ssh
    ufw allow 'Nginx Full'
    ufw --force enable
    
    print_success "Firewall configured (SSH + Nginx allowed)"
}

clone_repository() {
    print_header "Setting Up Application Directory"
    
    if [[ -d "$APP_DIR" ]]; then
        print_warning "Directory $APP_DIR already exists"
        read -p "Do you want to remove it and start fresh? (y/N): " confirm
        if [[ "$confirm" =~ ^[Yy]$ ]]; then
            rm -rf "$APP_DIR"
        else
            print_info "Keeping existing directory"
            return
        fi
    fi
    
    mkdir -p "$APP_DIR"
    
    if [[ -n "$GIT_REPO" ]]; then
        git clone "$GIT_REPO" "$APP_DIR"
        print_success "Repository cloned"
    else
        # Copy from current directory (assuming script is run from project root)
        SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
        if [[ -f "$SCRIPT_DIR/package.json" ]]; then
            cp -r "$SCRIPT_DIR"/* "$APP_DIR/"
            cp -r "$SCRIPT_DIR"/.* "$APP_DIR/" 2>/dev/null || true
            print_success "Application files copied"
        else
            print_error "No Git repository specified and no local project found"
            exit 1
        fi
    fi
}

create_env_file() {
    print_header "Creating Environment Configuration"
    
    # Generate NEXTAUTH_SECRET if not provided
    if [[ -z "$NEXTAUTH_SECRET" ]]; then
        NEXTAUTH_SECRET=$(openssl rand -base64 32)
        print_info "Generated new NEXTAUTH_SECRET"
    fi
    
    # Determine the app URL
    if [[ -n "$DOMAIN" ]]; then
        APP_URL="https://$DOMAIN"
    else
        APP_URL="http://$(curl -s ifconfig.me):3000"
    fi
    
    cat > "$APP_DIR/.env" << EOF
# Database (DigitalOcean PostgreSQL)
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}?sslmode=require"

# NextAuth Configuration
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="${APP_URL}"

# Node Environment
NODE_ENV="production"
EOF
    
    chmod 600 "$APP_DIR/.env"
    print_success "Environment file created at $APP_DIR/.env"
}

install_dependencies() {
    print_header "Installing Node.js Dependencies"
    
    cd "$APP_DIR"
    npm ci --production=false
    
    print_success "Dependencies installed"
}

setup_database() {
    print_header "Setting Up Database"
    
    cd "$APP_DIR"
    npx prisma generate
    npx prisma db push
    
    print_success "Database schema synced"
}

build_application() {
    print_header "Building Application for Production"
    
    cd "$APP_DIR"
    npm run build
    
    print_success "Application built successfully"
}

create_pm2_ecosystem() {
    print_header "Creating PM2 Ecosystem Configuration"
    
    cat > "$APP_DIR/ecosystem.config.js" << EOF
module.exports = {
  apps: [
    {
      name: '${PM2_APP_NAME}',
      script: 'npm',
      args: 'start',
      cwd: '${APP_DIR}',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: '/var/log/pm2/${APP_NAME}-error.log',
      out_file: '/var/log/pm2/${APP_NAME}-out.log',
      log_file: '/var/log/pm2/${APP_NAME}-combined.log',
      time: true
    }
  ]
};
EOF
    
    mkdir -p /var/log/pm2
    print_success "PM2 ecosystem file created"
}

configure_nginx() {
    print_header "Configuring Nginx"
    
    local server_name="_"
    if [[ -n "$DOMAIN" ]]; then
        server_name="$DOMAIN www.$DOMAIN"
    fi
    
    cat > "/etc/nginx/sites-available/$APP_NAME" << EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${server_name};

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;

    location / {
        proxy_pass http://localhost:3000;
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

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    location /static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 60m;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
EOF
    
    # Enable the site
    ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/"
    rm -f /etc/nginx/sites-enabled/default
    
    # Test nginx configuration
    nginx -t
    
    # Reload nginx
    systemctl reload nginx
    
    print_success "Nginx configured"
}

setup_ssl() {
    if [[ -z "$DOMAIN" ]]; then
        print_warning "No domain specified, skipping SSL setup"
        return
    fi
    
    print_header "Setting Up SSL Certificate"
    
    read -p "Enter your email for SSL certificate notifications: " ssl_email
    
    certbot --nginx -d "$DOMAIN" -d "www.$DOMAIN" --non-interactive --agree-tos -m "$ssl_email"
    
    # Auto-renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer
    
    print_success "SSL certificate installed and auto-renewal configured"
}

start_application() {
    print_header "Starting Application"
    
    cd "$APP_DIR"
    
    # Stop existing instance if running
    pm2 delete "$PM2_APP_NAME" 2>/dev/null || true
    
    # Start application
    pm2 start ecosystem.config.js
    
    # Save PM2 process list
    pm2 save
    
    print_success "Application started with PM2"
}

download_face_models() {
    print_header "Downloading Face Recognition Models"
    
    cd "$APP_DIR"
    
    if [[ -f "scripts/download-models.sh" ]]; then
        chmod +x scripts/download-models.sh
        bash scripts/download-models.sh
        print_success "Face recognition models downloaded"
    else
        print_warning "Model download script not found, skipping"
    fi
}

create_admin_user() {
    print_header "Create Admin User"
    
    read -p "Do you want to create an admin user now? (y/N): " create_admin
    
    if [[ "$create_admin" =~ ^[Yy]$ ]]; then
        read -p "Admin name: " admin_name
        read -p "Admin email: " admin_email
        read -sp "Admin password: " admin_password
        echo ""
        
        cd "$APP_DIR"
        
        # Create admin user script
        cat > /tmp/create-admin.js << EOF
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

async function main() {
    const { Pool } = require('pg');
    const { PrismaPg } = require('@prisma/adapter-pg');
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });
    
    const hashedPassword = await bcrypt.hash('${admin_password}', 12);
    const hashedPin = await bcrypt.hash('0000', 12);
    
    try {
        const user = await prisma.user.create({
            data: {
                name: '${admin_name}',
                email: '${admin_email}',
                password: hashedPassword,
                pin: hashedPin,
                role: 'ADMIN',
                approvalStatus: 'APPROVED'
            }
        });
        console.log('Admin user created:', user.email);
    } catch (error) {
        if (error.code === 'P2002') {
            console.log('User already exists');
        } else {
            throw error;
        }
    } finally {
        await prisma.\$disconnect();
        await pool.end();
    }
}

main().catch(console.error);
EOF
        
        node /tmp/create-admin.js
        rm /tmp/create-admin.js
        
        print_success "Admin user created"
    fi
}

print_summary() {
    print_header "Installation Complete!"
    
    local app_url
    if [[ -n "$DOMAIN" ]]; then
        app_url="https://$DOMAIN"
    else
        app_url="http://$(curl -s ifconfig.me)"
    fi
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  AMS has been successfully installed!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "  ${BLUE}Application URL:${NC}  $app_url"
    echo -e "  ${BLUE}Application Dir:${NC}  $APP_DIR"
    echo -e "  ${BLUE}PM2 App Name:${NC}     $PM2_APP_NAME"
    echo ""
    echo -e "  ${YELLOW}Useful Commands:${NC}"
    echo -e "    pm2 status              - Check application status"
    echo -e "    pm2 logs $PM2_APP_NAME  - View application logs"
    echo -e "    pm2 restart $PM2_APP_NAME - Restart application"
    echo -e "    pm2 monit               - Monitor resources"
    echo ""
    echo -e "  ${YELLOW}Configuration Files:${NC}"
    echo -e "    $APP_DIR/.env"
    echo -e "    $APP_DIR/ecosystem.config.js"
    echo -e "    /etc/nginx/sites-available/$APP_NAME"
    echo ""
    if [[ -z "$DOMAIN" ]]; then
        echo -e "  ${YELLOW}Note:${NC} To enable SSL, set up a domain and run:"
        echo -e "    certbot --nginx -d yourdomain.com"
    fi
    echo ""
}

#===============================================================================
# Main Installation Flow
#===============================================================================

main() {
    clear
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                           ║${NC}"
    echo -e "${BLUE}║     AMS - Attendance Management System                    ║${NC}"
    echo -e "${BLUE}║     Ubuntu Production Installer                           ║${NC}"
    echo -e "${BLUE}║                                                           ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    check_root
    
    # Gather configuration
    print_header "Configuration"
    
    if [[ -z "$GIT_REPO" ]]; then
        prompt_input "Git repository URL (leave empty to copy local files)" GIT_REPO ""
    fi
    
    prompt_input "Domain name (leave empty for IP-based access)" DOMAIN ""
    
    if [[ -z "$DB_PASSWORD" ]]; then
        prompt_input "Database password" DB_PASSWORD "" true
    fi
    
    echo ""
    echo "Configuration summary:"
    echo "  - Git Repo: ${GIT_REPO:-'Local copy'}"
    echo "  - Domain: ${DOMAIN:-'None (IP-based)'}"
    echo "  - DB Host: $DB_HOST"
    echo "  - DB Port: $DB_PORT"
    echo "  - DB Name: $DB_NAME"
    echo "  - DB User: $DB_USER"
    echo ""
    
    read -p "Proceed with installation? (Y/n): " confirm
    if [[ "$confirm" =~ ^[Nn]$ ]]; then
        print_error "Installation cancelled"
        exit 1
    fi
    
    # Run installation steps
    install_system_dependencies
    install_nodejs
    install_pm2
    setup_swap
    setup_firewall
    clone_repository
    create_env_file
    install_dependencies
    setup_database
    download_face_models
    build_application
    create_pm2_ecosystem
    configure_nginx
    setup_ssl
    start_application
    create_admin_user
    print_summary
}

# Run main function
main "$@"
