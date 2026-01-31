#!/bin/bash
# Remote Deploy Script - Run this on Hetzner server

set -e

echo "🚀 Deploying Trading Agent..."
echo ""

cd /opt/trading-agent

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi
echo "✅ Node.js: $(node --version)"

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    npm install -g pm2
fi

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    echo "📦 Installing Nginx..."
    apt update
    apt install -y nginx
fi

# Install build tools
apt install -y build-essential python3 || true

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "⚠️  Creating .env from .env.example"
    cp .env.example .env
    echo "   ⚠️  YOU MUST EDIT .env WITH YOUR API KEYS!"
fi

# Create directories
mkdir -p data logs
chmod 755 data logs

# Install dependencies
echo "📦 Installing dependencies..."
npm install

cd dashboard
npm install
cd ..

# Build dashboard
echo "🔨 Building dashboard..."
cd dashboard
npm run build
cd ..

# Setup systemd service
echo "⚙️  Setting up systemd service..."
cat > /tmp/trading-agent.service << 'EOF'
[Unit]
Description=Trading Agent - Real Money Trading
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/trading-agent
Environment="NODE_ENV=production"
EnvironmentFile=/opt/trading-agent/.env
ExecStart=/usr/bin/npx ts-node src/trading-agent.ts
Restart=always
RestartSec=10
StandardOutput=append:/opt/trading-agent/logs/trading-agent.log
StandardError=append:/opt/trading-agent/logs/trading-agent-error.log

[Install]
WantedBy=multi-user.target
EOF

sudo mv /tmp/trading-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable trading-agent

# Setup PM2 for dashboard
echo "⚙️  Setting up dashboard..."
cd dashboard
pm2 start npm --name "trading-dashboard" -- start || pm2 restart trading-dashboard || true
pm2 save
pm2 startup || true
cd ..

# Setup Nginx
echo "🌐 Setting up Nginx..."
if [ ! -d /etc/nginx/ssl ]; then
    sudo mkdir -p /etc/nginx/ssl
    sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/key.pem \
        -out /etc/nginx/ssl/cert.pem \
        -subj "/C=FI/ST=State/L=City/O=Org/CN=localhost" 2>/dev/null || true
fi

if [ -f nginx.conf ]; then
    sudo cp nginx.conf /etc/nginx/sites-available/trading-agent
    sudo ln -sf /etc/nginx/sites-available/trading-agent /etc/nginx/sites-enabled/
    sudo nginx -t && sudo systemctl reload nginx || echo "Nginx config skipped"
fi

# Start trading agent
echo "▶️  Starting trading agent..."
sudo systemctl start trading-agent

echo ""
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "📊 Services:"
echo "  - Trading Agent: systemctl status trading-agent"
echo "  - Dashboard: pm2 list"
echo "  - Nginx: systemctl status nginx"
echo ""
echo "📝 Logs:"
echo "  tail -f /opt/trading-agent/logs/trading-agent.log"
echo ""
echo "🌐 Dashboard: http://$(hostname -I | awk '{print $1}'):3000"
echo ""
