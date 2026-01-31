#!/bin/bash

# Trading Agent Deployment Script for Hetzner
# Usage: ./deploy.sh

set -e

echo "🚀 Deploying Trading Agent..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ .env file not found. Please create it from .env.example"
    exit 1
fi

# Create directories
mkdir -p data logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install
cd dashboard && npm install && cd ..

# Build TypeScript (if needed)
echo "🔨 Building TypeScript..."
if [ -f tsconfig.json ]; then
  npx tsc || echo "⚠️ TypeScript build skipped (using ts-node)"
fi
cd dashboard && npm run build && cd ..

# Setup systemd service
echo "⚙️  Setting up systemd service..."
sudo tee /etc/systemd/system/trading-agent.service > /dev/null <<EOF
[Unit]
Description=Trading Agent
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npx ts-node src/trading-agent.ts
EnvironmentFile=$(pwd)/.env
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable trading-agent

# Setup Nginx
echo "🌐 Setting up Nginx..."
if [ ! -d /etc/nginx/ssl ]; then
    sudo mkdir -p /etc/nginx/ssl
    # Generate self-signed cert (replace with Let's Encrypt in production)
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=FI/ST=State/L=City/O=Org/CN=localhost"
fi

sudo cp nginx.conf /etc/nginx/sites-available/trading-agent
sudo ln -sf /etc/nginx/sites-available/trading-agent /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Start services
echo "▶️  Starting services..."
sudo systemctl start trading-agent

# Install PM2 if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Start dashboard
cd dashboard
pm2 start npm --name "trading-dashboard" -- start || pm2 restart trading-dashboard || true
pm2 save
pm2 startup
cd ..

echo "✅ Deployment complete!"
echo ""
echo "Services:"
echo "  - Trading Agent: systemctl status trading-agent"
echo "  - Dashboard: http://localhost:3000"
echo "  - Nginx: systemctl status nginx"
echo ""
echo "Logs:"
echo "  - Agent: tail -f logs/trading-agent.log"
echo "  - Systemd: journalctl -u trading-agent -f"
