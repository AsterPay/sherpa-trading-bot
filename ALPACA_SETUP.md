# Alpaca Setup - Live Trading

## ⚠️ TÄRKEÄÄ: Live Trading (ei Paper Trading!)

Koska haluat treidaa oikealla rahalla, sinun täytyy:

1. **Luo LIVE trading -tili** (ei paper trading)
2. **Hae API-avaimet** live tradingista
3. **Rahoita tili** (200 EUR)

---

## Vaihe 1: Luo Alpaca Live Trading -tili

### 1.1 Rekisteröidy
1. Mene: https://alpaca.markets
2. Klikkaa **"Sign Up"** tai **"Get Started"**
3. **ÄLÄ valitse "Paper Trading"** - valitse **Live Trading**

### 1.2 Täytä tiedot
- Nimi
- Sähköposti
- Salasana
- **Täytä KYC-verifikaatio** (henkilötiedot, osoite, jne.)
- **Täytä verotiedot** (W-9 form US:lle, tai vastaava EU:lle)

### 1.3 Tilin vahvistus
- Vahvista sähköposti
- Lähetä henkilöllisyystodistus (passi, ajokortti)
- Odota hyväksyntää (yleensä 1-2 päivää)

---

## Vaihe 2: Hae API-avaimet

### 2.1 Kirjaudu Dashboardiin
1. Mene: https://app.alpaca.markets
2. Kirjaudu sisään

### 2.2 Hae API-avaimet
1. Mene: **Dashboard → API Keys** (tai **Settings → API**)
2. Klikkaa **"Generate New Key"**
3. Anna nimi (esim. "Trading Bot")
4. **TÄRKEÄÄ:** Valitse **"Live Trading"** (ei Paper Trading!)
5. Kopioi:
   - **API Key ID** (alkaa PK...)
   - **Secret Key** (pitkä merkkijono)

### 2.3 Tallenna turvallisesti
- **ÄLÄ jaa näitä kenellekään!**
- Tallenna salasanojenhallintaan (1Password, Bitwarden, jne.)

---

## Vaihe 3: Rahoita Tili

### 3.1 Lisää rahaa
1. Dashboard → **Deposit**
2. Valitse maksutapa:
   - Wire transfer (suositus, nopea)
   - ACH (vain US)
   - Crypto (jos saatavilla)
3. Lähetä **200 EUR** (tai $200 USD)

### 3.2 Odota käsittelyä
- Wire transfer: 1-2 päivää
- Crypto: nopeampi

---

## Vaihe 4: Konfiguroi Trading Agent

### 4.1 SSH Hetzner-serverille
```bash
ssh root@89.167.27.212
```

### 4.2 Muokkaa .env
```bash
cd /opt/trading-agent
nano .env
```

### 4.3 Täytä Alpaca-asetukset
```env
# ALPACA / SPY (200 EUR)
ALPACA_API_KEY=PK1234567890        # Liitä API Key ID tähän
ALPACA_SECRET_KEY=your_secret_key  # Liitä Secret Key tähän
ALPACA_PAPER=false                 # ✅ LIVE TRADING!
ALPACA_API_BASE=https://api.alpaca.markets
ALPACA_DATA_BASE=https://data.alpaca.markets
```

### 4.4 Tallenna ja käynnistä uudelleen
```bash
# Tallenna: Ctrl+X, sitten Y, sitten Enter

# Käynnistä agentti uudelleen
systemctl restart trading-agent

# Tarkista että toimii
systemctl status trading-agent
tail -f logs/trading-agent.log
```

---

## Vaihe 5: Testaa Yhteys

### 5.1 Tarkista että agentti yhdistää
```bash
# Seuraa lokia
tail -f /opt/trading-agent/logs/trading-agent.log
```

**Pitäisi näkyä:**
- ✅ "Scanning Polymarket markets..."
- ✅ "SPY Gamma Squeeze window active!" (jos klo 15:50 ET)
- ❌ Ei pitäisi näkyä "401 Unauthorized" tai "403 Forbidden"

### 5.2 Tarkista dashboard
- Avaa: http://89.167.27.212:3000
- Pitäisi näkyä agentin status

---

## ⚠️ TÄRKEÄT MUISTUTUKSET

### Live Trading vs Paper Trading

| Paper Trading | Live Trading |
|--------------|--------------|
| Ilmainen | Vaatii rahoituksen |
| Ei oikeaa rahaa | **OIKEAA RAHAA!** |
| API Key: PK... | API Key: PK... (sama muoto) |
| `ALPACA_PAPER=true` | `ALPACA_PAPER=false` ✅ |

### Risk Management

- **Aloita pienellä:** 200 EUR riittää testaamiseen
- **Seuraa aktiivisesti:** Tarkista dashboard usein
- **Aseta stop loss:** `MAX_DAILY_LOSS_EUR=50` on jo asetettu
- **Emergency stop:** `touch /opt/trading-agent/data/stop_trading.flag`

---

## 📊 Market Data

**Real-time data:**
- Alpaca tarjoaa real-time dataa maksullisena
- Ilmainen tier: 15 minuutin viive
- Real-time: ~$9/kk

**SPY-strategia:**
- Voi toimia myös 15 min viiveellä (gamma squeeze on ennustettava)
- Testaa ensin ilmaisella tierillä

---

## ❓ Ongelmia?

### "401 Unauthorized"
- Tarkista että API-avaimet ovat oikein
- Varmista että käytät **Live Trading** -avaimia (ei Paper)

### "403 Forbidden"
- Tarkista että tili on vahvistettu
- Tarkista että tili on rahoitettu

### "Insufficient buying power"
- Tarkista että olet lähettänyt rahaa tilille
- Odota että wire transfer käsitellään

---

## ✅ Checklist

- [ ] Alpaca live trading -tili luotu
- [ ] KYC-verifikaatio täytetty
- [ ] Tili vahvistettu
- [ ] API-avaimet haettu (Live Trading)
- [ ] Tili rahoitettu (200 EUR)
- [ ] `.env` päivitetty Hetzner-serverillä
- [ ] Agentti käynnistetty uudelleen
- [ ] Yhteys testattu (lokeista)
- [ ] Dashboard toimii

**Kun kaikki on valmis, agentti alkaa treidaamaan oikealla rahalla! 🚀**
