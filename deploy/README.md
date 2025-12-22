# AMS Production Deployment Guide

## One-Click Installation (Ubuntu 20.04/22.04/24.04)

### Option 1: Run from Local Machine

1. **Copy the project to your server:**
   ```bash
   scp -r /path/to/AMS root@your-server-ip:/tmp/ams
   ```

2. **SSH into your server and run:**
   ```bash
   ssh root@your-server-ip
   cd /tmp/ams
   chmod +x deploy/install.sh
   sudo ./deploy/install.sh
   ```

### Option 2: Run from Git Repository

1. **SSH into your server:**
   ```bash
   ssh root@your-server-ip
   ```

2. **Download and run the installer:**
   ```bash
   apt-get update && apt-get install -y git
   git clone https://github.com/YOUR_USERNAME/AMS.git /tmp/ams
   chmod +x /tmp/ams/deploy/install.sh
   sudo /tmp/ams/deploy/install.sh
   ```

### Option 3: One-Line Quick Deploy
```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/AMS/main/deploy/quick-deploy.sh | sudo bash
```

## What the Installer Does

1. ✅ Updates system packages
2. ✅ Installs Node.js 20.x
3. ✅ Installs PM2 process manager
4. ✅ Configures UFW firewall
5. ✅ Clones/copies the application
6. ✅ Creates production `.env` file
7. ✅ Installs npm dependencies
8. ✅ Syncs database schema
9. ✅ Downloads face recognition models
10. ✅ Builds Next.js application
11. ✅ Configures Nginx reverse proxy
12. ✅ Sets up SSL certificate (if domain provided)
13. ✅ Starts application with PM2
14. ✅ Optionally creates admin user

## Configuration

During installation, you'll be prompted for:

| Setting | Description | Default |
|---------|-------------|---------|
| Git Repository | URL to clone (optional) | Local copy |
| Domain | Your domain name (optional) | IP-based access |
| DB Password | PostgreSQL password | Required |

### Environment Variables

You can pre-set values before running the installer:

```bash
export GIT_REPO="https://github.com/user/AMS.git"
export DOMAIN="ams.example.com"
export DB_HOST="your-db-host.com"
export DB_PORT="25060"
export DB_NAME="defaultdb"
export DB_USER="doadmin"
export DB_PASSWORD="your-password"
export NEXTAUTH_SECRET="your-secret-key"

sudo -E ./deploy/install.sh
```

## Post-Installation

### Application Management

```bash
# Check status
pm2 status

# View logs
pm2 logs ams-production

# Restart application
pm2 restart ams-production

# Stop application
pm2 stop ams-production

# Monitor resources
pm2 monit
```

### Update Application

```bash
sudo /var/www/ams/deploy/update.sh
```

### Configuration Files

| File | Purpose |
|------|---------|
| `/var/www/ams/.env` | Environment variables |
| `/var/www/ams/ecosystem.config.js` | PM2 configuration |
| `/etc/nginx/sites-available/ams` | Nginx configuration |

### SSL Certificate

If you didn't set up SSL during installation:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

## Server Requirements

- **OS:** Ubuntu 20.04, 22.04, or 24.04 LTS
- **RAM:** Minimum 1GB (2GB+ recommended)
- **CPU:** 1+ cores
- **Storage:** 10GB+ free space
- **Ports:** 22 (SSH), 80 (HTTP), 443 (HTTPS)

## Database

The application uses DigitalOcean Managed PostgreSQL by default. 

Pre-configured connection:
- **Host:** `db-postgresql-ams-do-user-2226216-0.i.db.ondigitalocean.com`
- **Port:** `25060`
- **Database:** `defaultdb`
- **SSL:** Required

## Troubleshooting

### Application won't start

```bash
# Check logs
pm2 logs ams-production --lines 100

# Check if port 3000 is in use
lsof -i :3000

# Restart PM2
pm2 restart all
```

### Nginx issues

```bash
# Test configuration
sudo nginx -t

# View error logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx
```

### Database connection issues

```bash
# Test connection
cd /var/www/ams
npx prisma db push

# Check .env file
cat /var/www/ams/.env
```

### SSL certificate issues

```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## Security Recommendations

1. **Change default passwords** after installation
2. **Enable automatic updates:**
   ```bash
   sudo apt-get install unattended-upgrades
   sudo dpkg-reconfigure unattended-upgrades
   ```
3. **Set up fail2ban:**
   ```bash
   sudo apt-get install fail2ban
   sudo systemctl enable fail2ban
   ```
4. **Regular backups** of your database
5. **Monitor logs** for suspicious activity

## Support

For issues or questions, please open a GitHub issue.
