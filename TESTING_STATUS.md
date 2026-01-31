# Testing Status - Trading Agent

## ✅ Vaihe 1: Paikallinen testaus - VALMIS

### Mitä on testattu:

1. **Riippuvuudet asennettu**
   - ✅ Node.js paketit
   - ✅ Dashboard riippuvuudet
   - ✅ JSON-tietokanta (Windows-yhteensopiva)

2. **Konfiguraatio**
   - ✅ `.env` tiedosto luotu
   - ✅ `data/` ja `logs/` hakemistot luotu
   - ✅ Tietokanta toimii (`data/trading.json`)

3. **Agentti**
   - ✅ Trading agent käynnistyy
   - ✅ Tietokanta tallentaa tradeja
   - ⚠️ API-avaimet puuttuvat (normaalia testauksessa)

4. **Dashboard**
   - ✅ Next.js käynnistyy
   - ✅ Dashboard näkyy http://localhost:3000
   - ✅ API-reitit toimivat

### Testidata:
- 1 test-trade luotu tietokantaan
- Tietokanta: `data/trading.json`

---

## 📋 Seuraava vaihe: Paper Trading

### Vaihe 2.1: Alpaca Paper Trading Setup

**Tavoite:** Testata SPY-strategiaa ilman oikeaa rahaa

**Tehtävät:**

1. **Luo Alpaca-tili**
   - Mene: https://alpaca.markets
   - Rekisteröidy (ilmainen)
   - Valitse "Paper Trading" kun luot tilin

2. **Hae API-avaimet**
   - Dashboard → API Keys
   - Generate new key
   - Kopioi:
     - API Key ID → `.env` → `ALPACA_API_KEY`
     - Secret Key → `.env` → `ALPACA_SECRET_KEY`

3. **Päivitä .env**
   ```env
   ALPACA_API_KEY=your_key_here
   ALPACA_SECRET_KEY=your_secret_here
   ALPACA_PAPER=true
   SPY_ENABLED=true
   AUTO_EXECUTE=true  # Paper tradingissa voi olla päällä
   ```

4. **Testaa yhteys**
   ```bash
   npm start
   ```
   - Agentti yrittää yhdistää Alpacaan
   - Tarkista lokit: `logs/trading-agent.log`

---

### Vaihe 2.2: Testaa SPY Gamma Squeeze

**Mitä tapahtuu:**
- Agentti skannaa SPY-hintoja
- Klo 15:50 ET (arkipäivinä) se havaitsee gamma squeeze -ikkunan
- Jos `AUTO_EXECUTE=true`, se tekee paper-tradeja

**Seuranta:**
- Dashboard: http://localhost:3000
- Lokit: `logs/trading-agent.log`
- Tietokanta: `data/trading.json`

**Testausaika:**
- Jos ei ole 15:50 ET, odota seuraavaa arkipäivää
- TAI muuta `.env`: `SPY_SQUEEZE_TIME=20:15` (testaa heti)

---

## 🚀 Vaihe 3: Deploy Hetznerille

### Kun paper trading toimii:

1. **Valmista deployment**
   - Varmista että kaikki toimii paikallisesti
   - Tarkista `.env` tiedosto
   - Testaa että agentti pysyy käynnissä

2. **Hetzner server**
   - SSH serverille
   - Kopioi koodi
   - Aja `deploy.sh`

3. **Production .env**
   - Luo uusi `.env` serverille
   - Täytä kaikki API-avaimet
   - **ÄLÄ käytä paper tradingia productionissa**

---

## 📊 Nykyinen tila

### Käynnissä:
- ✅ Dashboard: http://localhost:3000
- ⚠️ Agentti: Tarkista onko käynnissä

### Tietokanta:
- Sijainti: `data/trading.json`
- Trades: 1 test-trade

### Seuraavat askeleet:
1. **Luo Alpaca paper trading -tili** (5 min)
2. **Päivitä .env API-avaimilla** (2 min)
3. **Käynnistä agentti uudelleen** (1 min)
4. **Seuraa dashboardia** (jatkuvaa)

---

## 🔍 Debugging

### Agentti ei käynnisty:
```bash
# Tarkista .env
cat .env

# Tarkista lokit
Get-Content logs/trading-agent.log -Tail 50
```

### Dashboard ei näy:
```bash
# Tarkista onko Next.js käynnissä
Get-Process -Name node

# Käynnistä uudelleen
cd dashboard
npm run dev
```

### API ei toimi:
- Tarkista että `data/trading.json` on olemassa
- Tarkista polku dashboardin API-reiteissä

---

## ✅ Checklist ennen Hetzner-deployausta

- [ ] Paper trading testattu vähintään 1 päivä
- [ ] Agentti löytää opportunities
- [ ] Dashboard näyttää datan oikein
- [ ] Kaikki API-avaimet hankittu
- [ ] `.env` täytetty oikein
- [ ] Risk limits asetettu
- [ ] Telegram alertit toimivat (optional)

---

**Status:** ✅ Paikallinen testaus valmis → Seuraavaksi: Paper Trading
