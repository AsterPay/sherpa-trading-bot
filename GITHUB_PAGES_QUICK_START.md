# 🚀 GitHub Pages - Nopea Alku

## ✅ Miksi GitHub Pages?

- ✅ **Ilmainen** domain + SSL
- ✅ **Julkinen** HTTPS URL
- ✅ **Base API hyväksyy** GitHub Pages domainit
- ✅ **Helppo setup** (5 min)

---

## 📋 Vaiheet

### 1. Ota GitHub Pages käyttöön

1. Mene GitHub repoon: `https://github.com/username/repo-name`
2. **Settings** → **Pages** (vasemmalla)
3. **Source**: Valitse **GitHub Actions**
4. Tallenna

### 2. Push koodi

```bash
git add .
git commit -m "Add GitHub Pages deployment for Base API verification"
git push origin main
```

### 3. Odota deploy

1. Mene **Actions** välilehteen
2. Odota että **Deploy Dashboard to GitHub Pages** workflow valmistuu (~2-5 min)
3. Dashboard URL: `https://username.github.io/repo-name/`

**HUOM:** Korvaa `username` ja `repo-name` omilla arvoillasi!

### 4. Verifioi Base API

1. Mene Base API: https://base.org/api
2. **App URL**: `https://username.github.io/repo-name/`
3. Klikkaa **Verify & Add**
4. ✅ Verifikaatio onnistuu!

---

## 🎯 Miten se toimii?

1. **GitHub Actions** buildaa dashboardin staattiseksi HTML:ksi
2. **GitHub Pages** hostaa sen ilmaiseksi HTTPS:llä
3. **Base API** löytää meta-tagin (`base:app_id`) automaattisesti
4. **Verifikaatio onnistuu!**

---

## 📊 Status

- ✅ **Dashboard**: Hetzner (http://89.167.27.212:3000) - Trading agent käyttää tätä
- ✅ **Base Verifikaatio**: GitHub Pages (https://username.github.io/repo-name/) - Base API käyttää tätä
- ✅ **Trading Agent**: Hetzner (toimii normaalisti)

**Base API verifikaatio ei vaadi että trading agent pyörii samassa paikassa!**

---

## 🔧 Ongelmat?

### Dashboard ei näy?

1. Tarkista **Actions** → workflow onnistui
2. Tarkista **Settings** → **Pages** → Source on **GitHub Actions**
3. Odota 1-2 min että DNS päivittyy

### Base ei löydä meta-tagia?

1. Tarkista URL: `https://username.github.io/repo-name/` (päätepiste `/`!)
2. Avaa URL selaimessa → View Source → Etsi `<meta name="base:app_id"`
3. Jos meta-tagi puuttuu, tarkista että `dashboard/app/layout.tsx` sisältää sen

### Repo nimi väärin?

1. Tarkista repo nimi: `https://github.com/username/repo-name`
2. Päivitä `.github/workflows/deploy-dashboard.yml` jos tarvitsee

---

## ✅ Valmis!

Kun Base API verifikaatio onnistuu:

1. **Kopioi Base API-avain** Base API dashboardista
2. **Lisää se `.env` tiedostoon** Hetzner-serverillä:
   ```bash
   ssh root@89.167.27.212
   nano /opt/trading-agent/.env
   ```
   Lisää:
   ```env
   ZEROX_API_KEY=your-base-api-key-here
   ```
3. **Käynnistä trading agent uudelleen:**
   ```bash
   systemctl restart trading-agent
   ```

**Base-strategia toimii nyt!** 🎉
