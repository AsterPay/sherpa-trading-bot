# Seuraavat Askeleet - Trading Agent

## ✅ Mitä on tehty

1. ✅ Riippuvuudet asennettu
2. ✅ Tietokanta toimii (JSON)
3. ✅ Dashboard käynnissä (http://localhost:3000)
4. ✅ Agentti rakennettu ja valmis

---

## 📋 Seuraava vaihe: Paper Trading

### Vaihe 1: Alpaca Paper Trading Setup

**Aika:** ~10 minuuttia

1. **Luo Alpaca-tili**
   - Mene: https://alpaca.markets
   - Klikkaa "Sign Up" (ilmainen)
   - Valitse "Paper Trading" kun luot tilin
   - Täytä perustiedot

2. **Hae API-avaimet**
   - Kirjaudu Alpaca Dashboardiin
   - Mene: Dashboard → Your API Keys
   - Klikkaa "Generate New Key"
   - Kopioi:
     - **API Key ID** (esim. `PK1234567890`)
     - **Secret Key** (pitkä merkkijono)

3. **Päivitä .env tiedosto**
   ```bash
   # Avaa .env tiedosto editorissa
   notepad .env
   ```
   
   Päivitä nämä rivit:
   ```env
   ALPACA_API_KEY=PK1234567890        # Liitä API Key ID tähän
   ALPACA_SECRET_KEY=your_secret_key   # Liitä Secret Key tähän
   ALPACA_PAPER=true                   # Paper trading päällä
   SPY_ENABLED=true                    # SPY-strategia päällä
   AUTO_EXECUTE=true                   # Paper tradingissa voi olla päällä
   ```

4. **Testaa yhteys**
   ```bash
   npm start
   ```
   
   Odota 30 sekuntia ja tarkista lokit:
   ```bash
   Get-Content logs/trading-agent.log -Tail 20
   ```
   
   Pitäisi näkyä:
   - ✅ "Scanning Polymarket markets..." (jos päällä)
   - ✅ "SPY Gamma Squeeze window active!" (jos klo 15:50 ET)
   - ❌ Ei pitäisi näkyä API-virheitä

---

### Vaihe 2: Testaa SPY-strategia

**Mitä tapahtuu:**

1. **Agentti skannaa SPY-hintoja**
   - Tarkistaa onko klo 15:50 ET (arkipäivinä)
   - Hakee SPY-hinnan Yahoo Financesta
   - Jos löytää gamma squeeze -ikkunan, luo opportunity

2. **Paper trading**
   - Jos `AUTO_EXECUTE=true`, agentti tekee paper-tradeja
   - Trade näkyy dashboardissa
   - Ei käytä oikeaa rahaa!

3. **Seuranta**
   - Dashboard: http://localhost:3000
   - Päivittyy automaattisesti 5 sekunnin välein
   - Näet trades, P&L, stats

**Testausaika:**
- Jos ei ole 15:50 ET, muuta `.env`:
  ```env
  SPY_SQUEEZE_TIME=20:20  # Testaa heti (muuta nykyiseen aikaan + 2 min)
  ```

---

### Vaihe 3: Seuraa tuloksia

**Dashboard:**
- Avaa: http://localhost:3000
- Näet:
  - Total P&L
  - Trades count
  - Strategy performance
  - Recent trades

**Lokit:**
```bash
# Seuraa reaaliaikaisia lokkeja
Get-Content logs/trading-agent.log -Wait -Tail 50
```

**Tietokanta:**
```bash
# Katso kaikki trades
Get-Content data/trading.json | ConvertFrom-Json | Select-Object -ExpandProperty trades
```

---

## 🚀 Hetzner Deploy (kun paper trading toimii)

### Valmistaudu:

1. **Testaa vähintään 1 päivä paper tradingia**
   - Varmista että agentti löytää opportunities
   - Tarkista että trades tallennetaan
   - Varmista että dashboard toimii

2. **Hanki kaikki API-avaimet:**
   - ✅ Alpaca (paper trading)
   - ⏳ Polymarket (kun haluat käyttää)
   - ⏳ Base wallet (kun haluat käyttää)
   - ⏳ 0x API key (kun haluat käyttää)

3. **Valmistele Hetzner server:**
   - SSH-yhteys
   - Node.js asennettuna
   - Nginx asennettuna

4. **Deploy:**
   ```bash
   # Serverillä
   git clone <repo>
   cd sherpa_bot
   cp .env.example .env
   # Täytä .env
   ./deploy.sh
   ```

---

## 📊 Nykyinen tila

- ✅ **Dashboard:** Käynnissä http://localhost:3000
- ✅ **Tietokanta:** `data/trading.json` toimii
- ⏳ **Agentti:** Odottaa API-avaimia
- ⏳ **Paper Trading:** Odottaa Alpaca-tiliä

---

## 🎯 Nyt tehtäväksi

1. **Luo Alpaca paper trading -tili** (5-10 min)
   - https://alpaca.markets
   - Sign up → Paper Trading

2. **Kopioi API-avaimet .env-tiedostoon** (2 min)

3. **Käynnistä agentti** (1 min)
   ```bash
   npm start
   ```

4. **Avaa dashboard** 
   - http://localhost:3000
   - Seuraa mitä tapahtuu

---

## ❓ Tarvitsetko apua?

- **API-avaimet:** Katso `SETUP_GUIDE.md`
- **Ongelmia:** Tarkista `logs/trading-agent.log`
- **Dashboard:** Varmista että Next.js on käynnissä

**Onnea paper tradingiin! 🚀**
