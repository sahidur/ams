#!/bin/bash

#===============================================================================
# AMS Quick Deploy - Download and run the installer
# Run this on a fresh Ubuntu server:
#   curl -fsSL https://raw.githubusercontent.com/YOUR_USERNAME/AMS/main/deploy/quick-deploy.sh | sudo bash
#===============================================================================

set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║     AMS - Quick Deploy Script                             ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "This script must be run as root (use sudo)"
   exit 1
fi

# Configuration - Update these values
GIT_REPO="https://github.com/YOUR_USERNAME/AMS.git"
INSTALL_DIR="/tmp/ams-installer"

# Install git if not present
apt-get update
apt-get install -y git

# Clone the repository
rm -rf "$INSTALL_DIR"
git clone "$GIT_REPO" "$INSTALL_DIR"

# Make installer executable and run
chmod +x "$INSTALL_DIR/deploy/install.sh"
cd "$INSTALL_DIR"
export GIT_REPO="$GIT_REPO"
bash "$INSTALL_DIR/deploy/install.sh"
