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

# Use pg directly with SSL - bypass Prisma completely
node << SCRIPT
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

(async () => {
    try {
        // Parse DATABASE_URL and add SSL
        const connectionString = process.env.DATABASE_URL;
        
        const pool = new Pool({ 
            connectionString: connectionString,
            ssl: {
                rejectUnauthorized: false,
                checkServerIdentity: () => undefined
            }
        });
        
        const hashedPassword = await bcrypt.hash('${admin_password}', 12);
        const hashedPin = await bcrypt.hash('0000', 12);
        
        // Check if user exists
        const existing = await pool.query('SELECT id FROM "User" WHERE email = \$1', ['${admin_email}']);
        
        if (existing.rows.length > 0) {
            // Update existing user
            await pool.query(
                'UPDATE "User" SET name = \$1, password = \$2, role = \$3, "approvalStatus" = \$4 WHERE email = \$5',
                ['${admin_name}', hashedPassword, 'ADMIN', 'APPROVED', '${admin_email}']
            );
            console.log('✓ Admin user updated successfully!');
        } else {
            // Create new user
            await pool.query(
                'INSERT INTO "User" (id, name, email, password, pin, role, "approvalStatus", "createdAt", "updatedAt") VALUES (gen_random_uuid(), \$1, \$2, \$3, \$4, \$5, \$6, NOW(), NOW())',
                ['${admin_name}', '${admin_email}', hashedPassword, hashedPin, 'ADMIN', 'APPROVED']
            );
            console.log('✓ Admin user created successfully!');
        }
        
        console.log('  Email: ${admin_email}');
        console.log('  Role: ADMIN');
        console.log('');
        console.log('You can now login at your application URL.');
        
        await pool.end();
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
SCRIPT

echo ""
