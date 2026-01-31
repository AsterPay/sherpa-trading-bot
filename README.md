# Real Money Trading Agent

Automated trading system with three strategies:
1. **Polymarket Arbitrage** - Prediction market opportunities
2. **SPY Gamma Squeeze** - Daily 3:50 PM ET window
3. **Token Launch Monitor** - Base chain new token detection

## ⚠️ WARNING

**This system trades with REAL MONEY. Use at your own risk.**

- Start with paper trading
- Test thoroughly before going live
- Never risk more than you can afford to lose
- Monitor actively, especially in the beginning

## 🚀 Quick Start

### 1. Prerequisites

- Node.js 20+
- Hetzner server (or any Linux VPS)
- API keys for trading platforms (see below)

### 2. Setup Accounts & API Keys

#### Polymarket (200 EUR)
1. Create account at [polymarket.com](https://polymarket.com)
2. Get API key from settings
3. Create Polygon wallet (MetaMask)
4. Fund with USDC on Polygon
5. Export private key (keep secure!)

#### Alpaca / SPY (200 EUR)
1. Sign up at [alpaca.markets](https://alpaca.markets)
2. Create paper trading account first
3. Get API key + secret from dashboard
4. For live trading: complete account verification

#### Base / Token Launches (200 EUR)
1. Create Base wallet (MetaMask)
2. Fund with ETH on Base (for gas)
3. Get 0x API key: [dashboard.0x.org](https://dashboard.0x.org)
4. Export private key (keep secure!)

#### Telegram Alerts (Optional)
1. Create bot: [@BotFather](https://t.me/BotFather)
2. Get chat ID: [@userinfobot](https://t.me/userinfobot)

### 3. Installation

```bash
# Clone repository
git clone <repo-url>
cd sherpa_bot

# Install dependencies
npm install
cd dashboard && npm install && cd ..

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
nano .env
```

### 4. Configure .env

Fill in all required values in `.env`:
- API keys
- Private keys (for crypto wallets)
- Capital allocation (default: 200 EUR each)
- Risk limits

### 5. Test Run (Paper Trading)

```bash
# Set AUTO_EXECUTE=false in .env
# Set ALPACA_PAPER=true

# Run agent
npm start

# In another terminal, start dashboard
cd dashboard
npm run dev
```

Visit `http://localhost:3000` to see the dashboard.

### 6. Deploy to Hetzner

```bash
# Make deploy script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh
```

This will:
- Build the application
- Setup systemd service
- Configure Nginx with SSL
- Start all services

## 📊 Dashboard

Access the dashboard at:
- Local: `http://localhost:3000`
- Production: `https://your-domain.com`

Features:
- Real-time P&L tracking
- Trade history
- Strategy performance
- Emergency stop button

## 🔒 Security

**CRITICAL:**
1. **Never commit `.env` to git**
2. Use separate "hot wallets" with only trading capital
3. Encrypt private keys (consider using hardware wallet)
4. Enable firewall on Hetzner server
5. Use strong passwords for all accounts
6. Enable 2FA on exchanges/brokers

## 📁 Project Structure

```
sherpa_bot/
├── src/
│   ├── trading-agent.ts      # Main agent
│   ├── db/
│   │   └── database.ts        # SQLite database
│   └── api/
│       ├── polymarket.ts     # Polymarket client
│       ├── alpaca.ts         # Alpaca client
│       └── dex.ts            # DEX trading client
├── dashboard/                # Next.js dashboard
│   ├── app/
│   │   ├── page.tsx          # Main dashboard
│   │   └── api/              # API routes
├── data/                     # Database & data files
├── logs/                     # Log files
├── Dockerfile                # Docker config
├── docker-compose.yml        # Docker Compose
├── nginx.conf                # Nginx config
├── deploy.sh                 # Deployment script
└── .env.example              # Environment template
```

## 🛠️ Development

```bash
# Run agent in development
npm run trade

# Run dashboard
cd dashboard && npm run dev

# Build for production
npm run build
cd dashboard && npm run build
```

## 📈 Monitoring

```bash
# View agent logs
tail -f logs/trading-agent.log

# View systemd logs
journalctl -u trading-agent -f

# Check database
sqlite3 data/trading.db "SELECT * FROM trades ORDER BY created_at DESC LIMIT 10;"
```

## 🛑 Emergency Stop

**Via Dashboard:**
- Click "Emergency Stop" button

**Via Command:**
```bash
touch data/stop_trading.flag
```

**Via Systemd:**
```bash
sudo systemctl stop trading-agent
```

## 📝 API Documentation

### Polymarket
- Docs: https://docs.polymarket.com/developers/CLOB
- Requires: Polygon wallet with USDC

### Alpaca
- Docs: https://alpaca.markets/docs/api-documentation
- Paper trading: Free
- Live trading: Commission-free

### 0x API
- Docs: https://0x.org/docs/0x-swap-api
- Free tier available

## ⚙️ Configuration

Key settings in `.env`:

| Setting | Default | Description |
|---------|---------|-------------|
| `AUTO_EXECUTE` | `false` | Enable automatic trade execution |
| `MAX_POSITION_SIZE_USD` | `50` | Maximum per-trade size |
| `MAX_DAILY_LOSS_EUR` | `50` | Daily loss limit |
| `MIN_CONFIDENCE` | `high` | Minimum confidence to trade |
| `SCAN_INTERVAL_MS` | `60000` | Scan interval (60s) |

## 🐛 Troubleshooting

**Agent won't start:**
- Check `.env` file exists
- Verify API keys are correct
- Check database permissions: `chmod 755 data/`

**No trades executing:**
- Verify `AUTO_EXECUTE=true` in `.env`
- Check balance/wallet funding
- Review logs for errors

**Dashboard not loading:**
- Check dashboard is running: `pm2 list`
- Verify port 3000 is accessible
- Check Nginx config: `sudo nginx -t`

## 📚 Resources

- [Moltbook Trading Research](./MOLTBOOK_TRADING_RESEARCH.md)
- [Polymarket API Docs](https://docs.polymarket.com)
- [Alpaca API Docs](https://alpaca.markets/docs)
- [0x API Docs](https://0x.org/docs)

## ⚖️ Disclaimer

This software is provided "as is" without warranty. Trading cryptocurrencies and stocks involves substantial risk. Past performance does not guarantee future results. Use at your own risk.

## 📄 License

MIT
