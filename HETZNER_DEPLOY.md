# Hetzner Deploy - Oikealla Rahalla Trading

## ⚠️ TÄRKEÄÄ ENNEN DEPLOYTAUSTA

**Tämä järjestelmä käyttää OIKEAA RAHAA!**

- Varmista että sinulla on kaikki API-avaimet
- Varmista että walletit on rahoitettu (200 EUR per strategia)
- Aloita pienillä summilla
- Seuraa aktiivisesti ensimmäiset päivät
- Älä käytä enempää kuin voit menettää

---

## 🚀 Hetzner Deploy - Nopea Ohje

### Vaihe 1: Hetzner Server Setup

**Jos sinulla ei ole Hetzner-serveriä:**
1. Mene: https://www.hetzner.com/cloud
2. Luo tili
3. Luo uusi Cloud Server:
   - **OS:** Ubuntu 22.04
   - **Type:** CX11 (2 vCPU, 4 GB RAM) riittää
   - **Location:** Valitse lähin
   - **SSH Key:** Lisää SSH-avain (suositeltavaa)

**Jos sinulla on jo serveri:**
- SSH serverille: `ssh root@your-server-ip`

---

### Vaihe 2: Serverin Valmistelu

**SSH serverille ja aja:**

```bash
# Päivitä system
apt update && apt upgrade -y

# Asenna Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Asenna PM2 (dashboardia varten)
npm install -g pm2

# Asenna Nginx
apt install -y nginx

# Asenna Git (jos kopioit koodin Gitistä)
apt install -y git

# Asenna build tools (better-sqlite3 varten)
apt install -y build-essential python3

# Varmista että firewall sallii SSH ja HTTP/HTTPS
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

---

### Vaihe 3: Kopioi Koodi Serverille

**Vaihtoehto A: Git (suositeltava)**
```bash
cd /opt
git clone <your-repo-url> trading-agent
cd trading-agent
```

**Vaihtoehto B: SCP (paikallisesta koneesta)**
```bash
# Windows PowerShell:
scp -r . root@your-server-ip:/opt/trading-agent

# Serverillä:
cd /opt/trading-agent
```

---

### Vaihe 4: Konfiguroi .env

```bash
cd /opt/trading-agent

# Kopioi .env.example
cp .env.example .env

# Avaa editori
nano .env
```

**TÄYTÄ NÄMÄ PAKOLLISET:**

```env
# ============================================
# EXECUTION - PRODUCTION
# ============================================
AUTO_EXECUTE=true              # ✅ PÄÄLLE!
ALPACA_PAPER=false             # ✅ EI PAPER TRADINGIA!

# ============================================
# STRATEGY ENABLEMENT
# ============================================
POLYMARKET_ENABLED=true        # Jos käytät Polymarkettia
SPY_ENABLED=true               # Jos käytät SPY:tä
TOKEN_LAUNCH_ENABLED=true      # Jos käytät token launchia

# ============================================
# CAPITAL ALLOCATION (EUR)
# ============================================
POLYMARKET_CAPITAL=200
SPY_CAPITAL=200
TOKEN_CAPITAL=200

# ============================================
# RISK MANAGEMENT
# ============================================
MAX_POSITION_SIZE_USD=50       # Aloita pienellä!
MAX_DAILY_LOSS_EUR=50          # Päivätappioraja
MAX_TRADES_PER_DAY=10
MIN_CONFIDENCE=high            # Vain korkea luottamus

# ============================================
# POLYMARKET API KEYS
# ============================================
POLYMARKET_API_KEY=your_key_here
POLYGON_PRIVATE_KEY=0x...      # Polygon wallet private key
POLYGON_RPC=https://polygon-rpc.com

# ============================================
# ALPACA API KEYS (LIVE TRADING!)
# ============================================
ALPACA_API_KEY=PK...           # Live trading API key
ALPACA_SECRET_KEY=...          # Live trading secret
ALPACA_PAPER=false             # ✅ LIVE TRADING!

# ============================================
# BASE / TOKEN LAUNCHES
# ============================================
BASE_PRIVATE_KEY=0x...         # Base wallet private key
BASE_RPC=https://mainnet.base.org
ZEROX_API_KEY=...              # 0x API key

# ============================================
# TELEGRAM ALERTS (SUOSITELLUT!)
# ============================================
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...

# ============================================
# DATABASE & LOGGING
# ============================================
DB_PATH=./data/trading.json
LOG_FILE=./logs/trading-agent.log
STOP_FILE=./data/stop_trading.flag
```

**Tallenna:** `Ctrl+X`, sitten `Y`, sitten `Enter`

---

### Vaihe 5: Asenna Riippuvuudet

```bash
cd /opt/trading-agent

# Asenna backend riippuvuudet
npm install

# Asenna dashboard riippuvuudet
cd dashboard
npm install
cd ..
```

---

### Vaihe 6: Deploy

```bash
# Tee deploy-skripti suoritettavaksi
chmod +x deploy.sh

# Aja deploy
./deploy.sh
```

**Deploy-skripti tekee:**
- ✅ Luo hakemistot (data/, logs/)
- ✅ Asentaa riippuvuudet
- ✅ Buildaa dashboardin
- ✅ Luo systemd servicen trading-agentille
- ✅ Konfiguroi Nginx
- ✅ Käynnistää kaikki palvelut

---

### Vaihe 7: Varmista että Kaikki Toimii

```bash
# Tarkista trading agent
systemctl status trading-agent
journalctl -u trading-agent -f  # Seuraa lokia

# Tarkista dashboard
pm2 list
pm2 logs trading-dashboard

# Tarkista Nginx
systemctl status nginx

# Tarkista että portit ovat auki
netstat -tlnp | grep -E '3000|80|443'
```

---

### Vaihe 8: SSL-sertifikaatti (Let's Encrypt)

**Suositeltavaa productionissa:**

```bash
# Asenna Certbot
apt install -y certbot python3-certbot-nginx

# Hae sertifikaatti (korvaa domain.com omalla domainillasi)
certbot --nginx -d your-domain.com

# Automaattinen uusinta
certbot renew --dry-run
```

**Jos sinulla ei ole domainia:**
- Käytä Hetznerin IP-osoitetta
- TAI osta domain (esim. Namecheap, ~10 EUR/vuosi)
- TAI käytä Hetznerin DNS (ilmainen)

---

## 📊 Monitoring

### Dashboard
- **URL:** `http://your-server-ip:3000` (tai domain)
- **Nginx:** `https://your-domain.com` (jos SSL)

### Lokit

```bash
# Trading agent lokit
tail -f /opt/trading-agent/logs/trading-agent.log

# Systemd lokit
journalctl -u trading-agent -f

# Dashboard lokit
pm2 logs trading-dashboard

# Nginx lokit
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

### Tietokanta

```bash
# Katso trades
cat /opt/trading-agent/data/trading.json | jq '.trades | length'

# Viimeisimmät trades
cat /opt/trading-agent/data/trading.json | jq '.trades[-5:]'
```

---

## 🛑 Emergency Stop

**Nopein tapa:**

```bash
# Pysäytä trading agent
systemctl stop trading-agent

# TAI luo stop-flag
touch /opt/trading-agent/data/stop_trading.flag
```

**Dashboardista:**
- Klikkaa "Emergency Stop" -nappia

---

## 🔒 Turvallisuus

### 1. .env Tiedosto
```bash
# Varmista että .env on suojattu
chmod 600 .env
chown $USER:$USER .env
```

### 2. Firewall
```bash
# Varmista että vain tarvittavat portit ovat auki
ufw status
```

### 3. SSH
```bash
# Käytä SSH-avaimia, älä salasanoja
# Poista root-kirjautuminen (suositeltavaa)
```

### 4. Private Keys
- **ÄLÄ koskaan commitoi .env tiedostoa Gitiin!**
- Säilytä private keyt turvallisesti
- Käytä erillisiä "hot walletteja" vain tradingiin

---

## 🔄 Päivitykset

**Kun haluat päivittää koodin:**

```bash
cd /opt/trading-agent

# Pysäytä agentti
systemctl stop trading-agent

# Päivitä koodi
git pull  # TAI kopioi uudet tiedostot

# Asenna uudet riippuvuudet
npm install
cd dashboard && npm install && cd ..

# Käynnistä uudelleen
systemctl start trading-agent
pm2 restart trading-dashboard
```

---

## ❓ Troubleshooting

### Agentti ei käynnisty
```bash
# Tarkista .env
cat .env | grep -v "PRIVATE_KEY\|SECRET"  # Älä näytä salaisuuksia!

# Tarkista lokit
journalctl -u trading-agent -n 50

# Tarkista että Node.js on oikea versio
node --version  # Pitäisi olla v20+
```

### Dashboard ei näy
```bash
# Tarkista PM2
pm2 list
pm2 logs trading-dashboard

# Tarkista Nginx
nginx -t
systemctl status nginx

# Tarkista portit
netstat -tlnp | grep 3000
```

### Trades eivät mene läpi
```bash
# Tarkista että AUTO_EXECUTE=true
grep AUTO_EXECUTE .env

# Tarkista API-avaimet
# Tarkista wallet balance
# Tarkista lokit virheistä
```

---

## ✅ Checklist Ennen Live Tradingia

- [ ] Kaikki API-avaimet hankittu ja testattu
- [ ] Walletit rahoitettu (200 EUR per strategia)
- [ ] `.env` täytetty oikein
- [ ] `AUTO_EXECUTE=true`
- [ ] `ALPACA_PAPER=false`
- [ ] Risk limits asetettu
- [ ] Telegram alertit toimivat
- [ ] Dashboard näkyy ja toimii
- [ ] Lokit toimivat
- [ ] Emergency stop testattu
- [ ] SSL-sertifikaatti asennettu (suositeltavaa)

---

## 🎯 Seuraavat Askeleet

1. **Deploy Hetznerille** (tämä ohje)
2. **Testaa 1-2 päivää pienillä summilla**
3. **Seuraa aktiivisesti**
4. **Skaalaa vähitellen jos menee hyvin**

**Onnea! 🚀**
