# Base URL Verifikaatio - Ongelma ja Ratkaisut

## ❌ Ongelma

Base ei pääse hakemaan URL:ia `https://89.167.27.212/`

**Mahdollisia syitä:**
1. Base ei hyväksy IP-osoitetta (vaatii domainin)
2. Base ei hyväksy self-signed SSL-sertifikaattia
3. Hetzner Cloud Firewall estää Base:n IP:t

---

## ✅ Ratkaisut

### Vaihtoehto 1: Skip Base Nyt (Nopein)

**Jos et tarvitse Base-strategiaa heti:**

1. **Päivitä `.env` Hetzner-serverillä:**
   ```bash
   ssh root@89.167.27.212
   nano /opt/trading-agent/.env
   ```
   
   Muuta:
   ```env
   TOKEN_LAUNCH_ENABLED=false  # Poista käytöstä nyt
   ```

2. **Trading agent toimii ilman Base-strategiaa:**
   - Polymarket-strategia toimii
   - SPY-strategia toimii
   - Voit lisätä Base-strategian myöhemmin kun saat domainin

3. **Lisää Base API-avain myöhemmin:**
   - Kun saat domainin
   - Verifioi URL domainilla
   - Lisää API-avain `.env` tiedostoon

---

### Vaihtoehto 2: Hanki Domain (Suositeltava)

**Jos haluat Base-strategian käyttöön:**

#### 2.1 Osta Domain
- **Namecheap**: https://www.namecheap.com (~10 EUR/vuosi)
- **Cloudflare**: https://www.cloudflare.com/products/registrar/ (~8 EUR/vuosi)
- Valitse mikä tahansa domain (esim. `tradingbot.xyz`)

#### 2.2 Pointoi Domain Hetzner IP:hen
1. Mene domain-rekisteröijän DNS-asetuksiin
2. Lisää A-record:
   ```
   Type: A
   Name: @ (tai www)
   Value: 89.167.27.212
   TTL: 3600
   ```

#### 2.3 Asenna Let's Encrypt SSL
```bash
ssh root@89.167.27.212

# Asenna Certbot
apt install -y certbot python3-certbot-nginx

# Hae sertifikaatti (korvaa your-domain.com)
certbot --nginx -d your-domain.com -d www.your-domain.com

# Automaattinen uusinta
certbot renew --dry-run
```

#### 2.4 Verifioi Base
- App URL: `https://your-domain.com/`
- Base löytää meta-tagin
- Verifikaatio onnistuu!

---

## 🚀 Nopea Ratkaisu Nyt

**Jos haluat jatkaa ilman Base-strategiaa:**

```bash
ssh root@89.167.27.212
nano /opt/trading-agent/.env
```

Muuta:
```env
TOKEN_LAUNCH_ENABLED=false
```

Tallenna ja käynnistä uudelleen:
```bash
systemctl restart trading-agent
```

**Trading agent toimii nyt:**
- ✅ Polymarket-strategia
- ✅ SPY-strategia
- ⏸️ Base-strategia (pois käytöstä)

Voit lisätä Base-strategian myöhemmin kun saat domainin!

---

## 📊 Status

- ✅ Dashboard: http://89.167.27.212:3000
- ✅ HTTPS: https://89.167.27.212 (self-signed)
- ✅ Meta-tagi: Löytyy HTML:stä
- ❌ Base verifikaatio: Vaatii domainin

**Valitse: Skip nyt vai hanki domain?**
