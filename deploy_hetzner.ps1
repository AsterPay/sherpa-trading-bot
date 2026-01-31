# PowerShell Deploy Script for Hetzner
# Usage: .\deploy_hetzner.ps1 -ServerIP "your-server-ip"

param(
    [Parameter(Mandatory=$true)]
    [string]$ServerIP,
    
    [string]$SSHUser = "root"
)

Write-Host "🚀 Deploying to Hetzner: $ServerIP" -ForegroundColor Green
Write-Host ""

# Check if .env exists
if (-not (Test-Path .env)) {
    Write-Host "⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "   Creating from .env.example..."
    Copy-Item .env.example .env
    Write-Host "   ⚠️  YOU MUST EDIT .env WITH YOUR API KEYS!" -ForegroundColor Red
    Write-Host ""
}

# Copy files to server
Write-Host "📦 Copying files to server..." -ForegroundColor Cyan
$exclude = @('node_modules', '.git', 'data', 'logs', '.next')
$excludeArgs = $exclude | ForEach-Object { "--exclude=$_" }
scp -r $excludeArgs . ${SSHUser}@${ServerIP}:/opt/trading-agent/

Write-Host ""
Write-Host "🔧 Running setup on server..." -ForegroundColor Cyan

# SSH command to run on server
$setupScript = @"
cd /opt/trading-agent

# Install Node.js if needed
if ! command -v node &> /dev/null; then
    echo 'Installing Node.js...'
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
fi

# Install PM2 if needed
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
fi

# Install Nginx if needed
if ! command -v nginx &> /dev/null; then
    apt update
    apt install -y nginx
fi

# Install build tools
apt install -y build-essential python3 || true

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo '⚠️  Created .env from .env.example - EDIT IT WITH API KEYS!'
fi

# Create directories
mkdir -p data logs
chmod 755 data logs

# Install dependencies
echo 'Installing dependencies...'
npm install

cd dashboard
npm install
cd ..

# Build dashboard
echo 'Building dashboard...'
cd dashboard
npm run build
cd ..

# Setup systemd service
echo 'Setting up systemd service...'
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
cd dashboard
pm2 start npm --name "trading-dashboard" -- start || pm2 restart trading-dashboard || true
pm2 save
pm2 startup || true
cd ..

# Setup Nginx
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
echo 'Starting trading agent...'
sudo systemctl start trading-agent

echo ''
echo '✅ Deployment complete!'
echo ''
echo '📊 Check status:'
echo '  systemctl status trading-agent'
echo '  pm2 list'
echo ''
echo '📝 View logs:'
echo '  tail -f /opt/trading-agent/logs/trading-agent.log'
echo ''
"@

ssh ${SSHUser}@${ServerIP} $setupScript

Write-Host ""
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Dashboard: http://${ServerIP}:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  IMPORTANT: Edit .env on server with your API keys!" -ForegroundColor Yellow
Write-Host "   ssh ${SSHUser}@${ServerIP}"
Write-Host "   nano /opt/trading-agent/.env"
Write-Host ""
