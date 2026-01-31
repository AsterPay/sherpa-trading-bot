# GitHub Repo Setup - Nopea Alku

## ✅ Vaihtoehdot

### Vaihtoehto 1: Käytä Olemassa Olevaa Repoa

Jos sinulla on jo GitHub-repo johon haluat lisätä tämän projektin:

```bash
# 1. Alusta git (jos ei ole vielä)
git init

# 2. Lisää remote (korvaa username ja repo-name)
git remote add origin https://github.com/username/repo-name.git

# 3. Lisää kaikki tiedostot
git add .

# 4. Commit
git commit -m "Add trading agent with GitHub Pages dashboard"

# 5. Push (tai force push jos repo on tyhjä)
git push -u origin main
# TAI jos repo on tyhjä:
# git push -u origin main --force
```

### Vaihtoehto 2: Luo Uusi Repo

Jos haluat luoda uuden repon:

1. **Mene GitHub**: https://github.com/new
2. **Repo nimi**: esim. `sherpa-trading-bot`
3. **Valitse**: Public tai Private
4. **Älä** valitse "Add README" (koska meillä on jo)
5. Klikkaa **Create repository**

Sitten:

```bash
# 1. Alusta git
git init

# 2. Lisää remote (korvaa username ja repo-name)
git remote add origin https://github.com/username/repo-name.git

# 3. Lisää kaikki tiedostot
git add .

# 4. Commit
git commit -m "Initial commit: Trading agent with GitHub Pages dashboard"

# 5. Push
git push -u origin main
```

---

## 🚀 GitHub Pages Aktivointi

Kun repo on GitHubissa:

1. **Mene repoon**: `https://github.com/username/repo-name`
2. **Settings** → **Pages** (vasemmalla)
3. **Source**: Valitse **GitHub Actions**
4. Tallenna

**GitHub Actions deployaa automaattisesti kun pushaat koodin!**

---

## 📋 Nopea Checklist

- [ ] Git alustettu (`git init`)
- [ ] Remote lisätty (`git remote add origin ...`)
- [ ] Tiedostot lisätty (`git add .`)
- [ ] Commit tehty (`git commit -m "..."`)
- [ ] Push tehty (`git push -u origin main`)
- [ ] GitHub Pages aktivoitu (Settings → Pages → GitHub Actions)
- [ ] Odotetaan deploy valmistuu (Actions-välilehti)
- [ ] Dashboard URL: `https://username.github.io/repo-name/`
- [ ] Base API verifikaatio: `https://username.github.io/repo-name/`

---

## ✅ Valmis!

Kun GitHub Pages on deployannut dashboardin:

1. **Kopioi URL**: `https://username.github.io/repo-name/`
2. **Mene Base API**: https://base.org/api
3. **App URL**: Liitä URL yllä
4. **Verify & Add** → ✅ Onnistuu!

**Trading agent jatkaa Hetzner-serverillä normaalisti!**
