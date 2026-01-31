# GitHub Pages Setup - Base API Verifikaatio

## ✅ Ratkaisu: GitHub Pages

**Miksi GitHub Pages?**
- ✅ Ilmainen domain + SSL
- ✅ Julkinen HTTPS URL
- ✅ Base API hyväksyy GitHub Pages domainit
- ✅ Helppo setup

---

## 🚀 Vaihe 1: GitHub Pages Deploy

### 1.1 Luo GitHub Actions Workflow

Luo tiedosto: `.github/workflows/deploy-dashboard.yml`

```yaml
name: Deploy Dashboard to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: dashboard/package-lock.json
      
      - name: Install dependencies
        run: |
          cd dashboard
          npm ci
      
      - name: Build
        run: |
          cd dashboard
          npm run build
        env:
          NODE_ENV: production
      
      - name: Setup Pages
        uses: actions/configure-pages@v4
      
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dashboard/out
      
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### 1.2 Päivitä Next.js Config

Päivitä `dashboard/next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/sherpa_bot' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/sherpa_bot' : '',
}

module.exports = nextConfig
```

**HUOM:** Korvaa `sherpa_bot` repon nimelläsi!

### 1.3 Ota GitHub Pages käyttöön

1. Mene GitHub repoon
2. **Settings** → **Pages**
3. **Source**: Valitse **GitHub Actions**
4. Tallenna

### 1.4 Push koodi

```bash
git add .
git commit -m "Add GitHub Pages deployment"
git push origin main
```

### 1.5 Odota deploy

- GitHub Actions → **Deploy Dashboard to GitHub Pages**
- Odota että workflow valmistuu (~2-5 min)
- Dashboard URL: `https://username.github.io/sherpa_bot/`

---

## 🔗 Vaihe 2: Base API Verifikaatio

### 2.1 Varmista meta-tagi

Meta-tagi on jo `dashboard/app/layout.tsx`:
```tsx
<meta name="base:app_id" content="697e51cf2aafa0bc9ad8a313" />
```

### 2.2 Verifioi Base API

1. Mene Base API: https://base.org/api
2. **App URL**: `https://username.github.io/sherpa_bot/`
3. Klikkaa **Verify & Add**
4. ✅ Verifikaatio onnistuu!

---

## 📊 Vaihtoehto: GitHub Codespaces Preview

**Jos GitHub Pages ei toimi, käytä Codespaces:**

### Codespaces Preview URL

1. Avaa repo Codespacesissa
2. Port Forwarding → **Public**
3. Preview URL: `xxx-xxx-xxx.preview.app.github.dev`
4. Lisää Base API: `https://xxx-xxx-xxx.preview.app.github.dev/`

**HUOM:** Codespaces preview URL muuttuu joka kerta kun luot uuden codespacen.

---

## 🎯 Nopea Ratkaisu NYT

**Jos haluat nopean ratkaisun:**

1. **Luo GitHub Pages deploy** (yllä)
2. **Odotetaan deploy valmistuu**
3. **Verifioi Base API** GitHub Pages URL:lla
4. **Lisää Base API-avain** `.env` tiedostoon

**Trading agent jatkaa Hetzner-serverillä, mutta Base verifikaatio käyttää GitHub Pages URL:ia!**

---

## ✅ Status

- ✅ Dashboard: Hetzner (http://89.167.27.212:3000)
- ✅ Base Verifikaatio: GitHub Pages (https://username.github.io/sherpa_bot/)
- ✅ Trading Agent: Hetzner (toimii normaalisti)

**Base API verifikaatio ei vaadi että trading agent pyörii samassa paikassa!**
