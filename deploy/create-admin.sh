#!/bin/bash

#===============================================================================
# AMS - Create Admin User Script
# Run: sudo /var/www/ams/deploy/create-admin.sh
#===============================================================================

set -e

APP_DIR="/var/www/ams"

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     AMS - Create Admin User                               ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running from correct directory
if [[ ! -f "$APP_DIR/package.json" ]]; then
    echo "Error: AMS not found at $APP_DIR"
    exit 1
fi

cd "$APP_DIR"

# Load environment
set -a
source "$APP_DIR/.env"
set +a

# Get user input
read -p "Admin name: " admin_name
read -p "Admin email: " admin_email
read -sp "Admin password: " admin_password
echo ""

# Validate input
if [[ -z "$admin_name" || -z "$admin_email" || -z "$admin_password" ]]; then
    echo "Error: All fields are required"
    exit 1
fi

echo ""
echo "Creating admin user..."

# Create and run the script
node << SCRIPT
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');

(async () => {
    try {
        const pool = new Pool({ connectionString: process.env.DATABASE_URL });
        const adapter = new PrismaPg(pool);
        const prisma = new PrismaClient({ adapter });
        
        const hashedPassword = await bcrypt.hash('${admin_password}', 12);
        const hashedPin = await bcrypt.hash('0000', 12);
        
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
        
        console.log('✓ Admin user created successfully!');
        console.log('  Email: ' + user.email);
        console.log('  Role: ADMIN');
        console.log('');
        console.log('You can now login at your application URL.');
        
        await prisma.\$disconnect();
        await pool.end();
    } catch (error) {
        if (error.code === 'P2002') {
            console.log('User with this email already exists');
        } else {
            console.error('Error:', error.message);
            process.exit(1);
        }
    }
})();
SCRIPT

echo ""
