# Setup Guide - Step by Step

## Phase 1: Account Setup (Your Task)

### 1.1 Polymarket Setup
1. Go to https://polymarket.com
2. Create account
3. Navigate to Settings → API
4. Generate API key
5. Copy API key to `.env` as `POLYMARKET_API_KEY`

### 1.2 Polygon Wallet Setup
1. Install MetaMask browser extension
2. Create new wallet (or use existing)
3. Add Polygon network:
   - Network Name: Polygon Mainnet
   - RPC URL: https://polygon-rpc.com
   - Chain ID: 137
   - Currency Symbol: MATIC
4. Export private key:
   - MetaMask → Account → Account Details → Export Private Key
   - **SECURITY WARNING**: Never share this key!
5. Copy private key to `.env` as `POLYGON_PRIVATE_KEY`
6. Fund wallet:
   - Buy USDC on exchange (Coinbase, Binance, etc.)
   - Bridge USDC to Polygon (use Polygon Bridge or exchange)
   - Send ~200 EUR worth of USDC to your Polygon wallet

### 1.3 Alpaca Setup
1. Go to https://alpaca.markets
2. Sign up for account
3. Complete verification (may require SSN for US, or use Alpaca International)
4. Go to Dashboard → API Keys
5. Generate new API key
6. Copy API Key ID to `.env` as `ALPACA_API_KEY`
7. Copy Secret Key to `.env` as `ALPACA_SECRET_KEY`
8. **Start with paper trading**: Set `ALPACA_PAPER=true` in `.env`

### 1.4 Base Wallet Setup
1. In MetaMask, add Base network:
   - Network Name: Base Mainnet
   - RPC URL: https://mainnet.base.org
   - Chain ID: 8453
   - Currency Symbol: ETH
2. Export private key (create separate wallet for trading!)
3. Copy to `.env` as `BASE_PRIVATE_KEY`
4. Fund wallet:
   - Buy ETH on exchange
   - Bridge to Base (use Base Bridge or exchange)
   - Send ~200 EUR worth of ETH + small amount for gas

### 1.5 0x API Setup
1. Go to https://dashboard.0x.org
2. Sign up (free)
3. Create API key
4. Copy to `.env` as `ZEROX_API_KEY`

### 1.6 Telegram Bot (Optional)
1. Open Telegram, search for @BotFather
2. Send `/newbot`
3. Follow instructions to create bot
4. Copy bot token to `.env` as `TELEGRAM_BOT_TOKEN`
5. Open @userinfobot
6. Send `/start`
7. Copy your chat ID to `.env` as `TELEGRAM_CHAT_ID`

## Phase 2: Local Testing

### 2.1 Install Dependencies
```bash
npm install
cd dashboard && npm install && cd ..
```

### 2.2 Configure Environment
```bash
cp .env.example .env
nano .env  # Edit with your values
```

**Critical settings for testing:**
```env
AUTO_EXECUTE=false          # Don't execute real trades yet!
ALPACA_PAPER=true           # Use paper trading
POLYMARKET_ENABLED=true
SPY_ENABLED=true
TOKEN_LAUNCH_ENABLED=true
```

### 2.3 Test Database
```bash
# Create data directory
mkdir -p data logs

# Run agent once to initialize database
npm start
# Press Ctrl+C after a few seconds
```

### 2.4 Test Dashboard
```bash
cd dashboard
npm run dev
```

Open http://localhost:3000

### 2.5 Verify API Connections
Check logs for:
- ✅ Polymarket: "Scanning Polymarket markets..."
- ✅ Alpaca: Should connect (check account balance)
- ✅ Base: Should check ETH balance
- ❌ Any errors? Fix API keys

## Phase 3: Paper Trading

### 3.1 Enable Paper Trading Only
```env
AUTO_EXECUTE=true           # Enable execution
ALPACA_PAPER=true           # Paper trading only
POLYMARKET_ENABLED=false    # Skip Polymarket (requires real funds)
TOKEN_LAUNCH_ENABLED=false  # Skip tokens (requires real funds)
SPY_ENABLED=true            # Test SPY only
```

### 3.2 Run for 24-48 Hours
```bash
npm start
```

Monitor:
- Dashboard: http://localhost:3000
- Logs: `tail -f logs/trading-agent.log`
- Telegram alerts (if configured)

### 3.3 Verify Behavior
- ✅ Trades appear in dashboard
- ✅ P&L tracking works
- ✅ Risk limits respected
- ✅ No unexpected trades

## Phase 4: Deploy to Hetzner

### 4.1 Server Setup
```bash
# SSH into Hetzner server
ssh root@your-server-ip

# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2
npm install -g pm2

# Install Nginx
apt install -y nginx
```

### 4.2 Upload Code
```bash
# On your local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
  ./ user@server:/opt/trading-agent/

# Or use git
git clone <your-repo> /opt/trading-agent
```

### 4.3 Configure on Server
```bash
cd /opt/trading-agent

# Create .env
nano .env  # Copy from local .env

# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Create directories
mkdir -p data logs
chmod 755 data logs
```

### 4.4 Deploy
```bash
chmod +x deploy.sh
./deploy.sh
```

### 4.5 Verify
```bash
# Check services
systemctl status trading-agent
pm2 list
systemctl status nginx

# Check logs
tail -f logs/trading-agent.log
journalctl -u trading-agent -f
```

## Phase 5: Go Live (Small Amounts)

### 5.1 Start Small
```env
POLYMARKET_CAPITAL=50    # Start with 50 EUR
SPY_CAPITAL=50
TOKEN_CAPITAL=50
MAX_POSITION_SIZE_USD=25
MAX_DAILY_LOSS_EUR=25
```

### 5.2 Enable All Strategies
```env
AUTO_EXECUTE=true
ALPACA_PAPER=false       # Switch to live trading
POLYMARKET_ENABLED=true
SPY_ENABLED=true
TOKEN_LAUNCH_ENABLED=true
```

### 5.3 Monitor Closely
- Check dashboard multiple times per day
- Review all trades
- Adjust risk limits based on performance
- Scale up gradually if profitable

## Troubleshooting

### "Database locked" error
```bash
# Stop agent
systemctl stop trading-agent

# Check for stale locks
rm -f data/trading.db-shm data/trading.db-wal

# Restart
systemctl start trading-agent
```

### "Insufficient balance" errors
- Verify wallet funding
- Check correct network (Polygon vs Base)
- Ensure gas tokens available (ETH for Base, MATIC for Polygon)

### Dashboard not loading
```bash
# Check PM2
pm2 list
pm2 logs trading-dashboard

# Restart
pm2 restart trading-dashboard
```

### API errors
- Verify API keys in `.env`
- Check API rate limits
- Review platform status pages

## Security Checklist

- [ ] `.env` file not committed to git
- [ ] Private keys encrypted/secure
- [ ] Separate trading wallets (not main wallet)
- [ ] Firewall enabled on server
- [ ] Strong passwords on all accounts
- [ ] 2FA enabled where possible
- [ ] Regular backups of database
- [ ] Monitoring alerts configured

## Next Steps

1. ✅ Complete account setup
2. ✅ Test locally
3. ✅ Paper trade for 1-2 days
4. ✅ Deploy to Hetzner
5. ✅ Start with small amounts
6. ✅ Scale gradually

Good luck! 🚀
