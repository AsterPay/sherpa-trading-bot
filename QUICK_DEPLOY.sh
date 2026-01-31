#!/bin/bash

# Quick Deploy Script for Hetzner
# Usage: Run this on your Hetzner server after cloning the repo

set -e

echo "🚀 Quick Deploy - Real Money Trading Agent"
echo "=========================================="
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then 
   echo "⚠️  Running as root. Consider using a non-root user."
fi

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
    sudo apt install -y nodejs
fi

echo "✅ Node.js: $(node --version)"

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "   Please create it from .env.example and fill in your API keys"
    exit 1
fi

# Check critical settings
if grep -q "AUTO_EXECUTE=false" .env; then
    echo "⚠️  WARNING: AUTO_EXECUTE=false in .env"
    echo "   Trading will not execute automatically!"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

if grep -q "ALPACA_PAPER=true" .env; then
    echo "⚠️  WARNING: ALPACA_PAPER=true in .env"
    echo "   This is PAPER TRADING, not real money!"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create directories
echo "📁 Creating directories..."
mkdir -p data logs
chmod 755 data logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install --production=false

cd dashboard
npm install --production=false
cd ..

# Build dashboard
echo "🔨 Building dashboard..."
cd dashboard
npm run build
cd ..

# Setup systemd service
echo "⚙️  Setting up systemd service..."
sudo tee /etc/systemd/system/trading-agent.service > /dev/null <<EOF
[Unit]
Description=Trading Agent - Real Money Trading
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment="NODE_ENV=production"
EnvironmentFile=$(pwd)/.env
ExecStart=$(which node) $(which npx) ts-node src/trading-agent.ts
Restart=always
RestartSec=10
StandardOutput=append:$(pwd)/logs/trading-agent.log
StandardError=append:$(pwd)/logs/trading-agent-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable trading-agent

# Setup PM2 for dashboard
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Setup Nginx
echo "🌐 Setting up Nginx..."
if [ ! -d /etc/nginx/ssl ]; then
    sudo mkdir -p /etc/nginx/ssl
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=FI/ST=State/L=City/O=Org/CN=localhost" 2>/dev/null || true
fi

sudo cp nginx.conf /etc/nginx/sites-available/trading-agent 2>/dev/null || true
sudo ln -sf /etc/nginx/sites-available/trading-agent /etc/nginx/sites-enabled/ 2>/dev/null || true
sudo nginx -t && sudo systemctl reload nginx || echo "⚠️  Nginx setup skipped"

# Start services
echo "▶️  Starting services..."

# Start trading agent
sudo systemctl start trading-agent

# Start dashboard
cd dashboard
pm2 start npm --name "trading-dashboard" -- start || pm2 restart trading-dashboard || true
pm2 save
cd ..

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 Services:"
echo "  - Trading Agent: sudo systemctl status trading-agent"
echo "  - Dashboard: pm2 list"
echo "  - Nginx: sudo systemctl status nginx"
echo ""
echo "📝 Logs:"
echo "  - Agent: tail -f logs/trading-agent.log"
echo "  - Systemd: sudo journalctl -u trading-agent -f"
echo "  - Dashboard: pm2 logs trading-dashboard"
echo ""
echo "🌐 Dashboard:"
echo "  - Local: http://localhost:3000"
echo "  - External: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "🛑 Emergency Stop:"
echo "  sudo systemctl stop trading-agent"
echo "  OR: touch data/stop_trading.flag"
echo ""
