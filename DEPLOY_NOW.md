# Deploy Hetznerille NYT!

## Nopea Deploy

### Vaihe 1: Anna Hetzner-serverin IP

```bash
# Windows PowerShell:
$env:HETZNER_IP="your-server-ip"
```

**TAI** muokkaa `deploy_now.sh` ja laita IP suoraan sinne.

---

### Vaihe 2: Varmista SSH-yhteys

```bash
# Testaa SSH-yhteys
ssh root@your-server-ip

# Jos toimii, jatka
# Jos ei toimi, tarkista:
# - Onko SSH-avain asennettuna?
# - Onko firewall auki portille 22?
```

---

### Vaihe 3: Deploy!

**Windows PowerShell:**
```powershell
# Aseta Hetzner IP
$env:HETZNER_IP="your-server-ip"

# Deploy (tarvitsee SSH-yhteyden)
bash deploy_now.sh
```

**TAI manuaalisesti Hetzner-serverille:**

```bash
# SSH serverille
ssh root@your-server-ip

# Asenna perusohjelmat
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs nginx git build-essential python3
npm install -g pm2

# Kopioi koodi (joko Git tai SCP)
cd /opt
git clone <your-repo> trading-agent
# TAI jos kopioit paikallisesta:
# scp -r . root@your-server-ip:/opt/trading-agent

cd trading-agent

# Konfiguroi .env
cp .env.example .env
nano .env  # TÄYTÄ API-AVAIMET!

# Deploy
chmod +x QUICK_DEPLOY.sh
./QUICK_DEPLOY.sh
```

---

## ⚠️ TÄRKEÄÄ ENNEN DEPLOYTAUSTA

**Sinun täytyy täyttää `.env` tiedosto API-avaimilla:**

1. **Polymarket:**
   - `POLYMARKET_API_KEY=...`
   - `POLYGON_PRIVATE_KEY=0x...`

2. **Alpaca (LIVE!):**
   - `ALPACA_API_KEY=PK...`
   - `ALPACA_SECRET_KEY=...`
   - `ALPACA_PAPER=false` ✅

3. **Base:**
   - `BASE_PRIVATE_KEY=0x...`
   - `ZEROX_API_KEY=...`

4. **Telegram (suositeltavaa):**
   - `TELEGRAM_BOT_TOKEN=...`
   - `TELEGRAM_CHAT_ID=...`

5. **Varmista:**
   - `AUTO_EXECUTE=true` ✅
   - `ALPACA_PAPER=false` ✅

---

## Tarvitsetko apua?

**Jos sinulla ei ole:**
- Hetzner-serveriä → Luo: https://www.hetzner.com/cloud
- API-avaimia → Katso: `SETUP_GUIDE.md`
- SSH-yhteyttä → Tarkista Hetzner-konsolista

**Kerro minulle:**
1. Onko sinulla Hetzner-serveri? (IP-osoite?)
2. Onko SSH-yhteys toiminnassa?
3. Onko sinulla API-avaimet valmiina?

Sitten voin auttaa deployaamaan!
