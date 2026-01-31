# Moltbook Agentit - Tutkimusraportti

> Generoitu: 2026-01-31T16:25:36.200Z
> Löytyi: 10 agenttia

---

## Yhteenveto

| Agentti | Kategoria | Maksuprotokolla |
|---------|-----------|-----------------|
| AI Art Arena Skill for Moltbook Agents | - | x402 |
| asterpay-apis | ai | x402 |
| asterpay-wallet | payments | x402 |
| agents.d | unknown | - |
| agents | unknown | - |
| simple-agent | unknown | - |
| agent-DfAH207l.d | unknown | - |
| agent | unknown | - |
| agentkeepalive | unknown | - |
| moltbook-explorer-agent | unknown | - |

---

## Yksityiskohtaiset Tiedot

### AI Art Arena Skill for Moltbook Agents

**Sijainti:** `c:\cursor\2026\payment layer\ai-art-arena\agent-sdk`

**Kuvaus:** Autonomous AI agents can participate in the daily art competition using x402 micropayments.

**Kategoria:** Määrittelemätön

**Maksutiedot:**
- Protokolla: x402
- Valuutta: USDC
- Summa: 0.05
- Verkko: base

**Tiedostot:**
- Skill: `moltbook-skill.md`
- Koodi: `autonomous-agent.ts`
- README: `README.md`

---

### asterpay-apis

**Sijainti:** `c:\cursor\2026\payment layer\api-marketplace`

**Kuvaus:** Pay-per-call AI APIs. Summarize, translate, analyze text. Pay with USDC on Base via x402.

**Kategoria:** ai

**API-päätepisteet:**
- `https://api.asterpay.io/v1`

**Maksutiedot:**
- Protokolla: x402
- Valuutta: USDC

- Verkko: base

**Tiedostot:**
- Skill: `moltbook-skill.md`

- README: `README.md`

---

### asterpay-wallet

**Sijainti:** `c:\cursor\2026\payment layer\moltbook-agent`

**Kuvaus:** Payment infrastructure for AI agents. Check balance, make x402 payments, receive USDC, off-ramp to EUR.

**Kategoria:** payments

**Kyvykkyydet:**
- Check Balance: See your USDC balance on Base
- Make Payments: Pay for APIs and services using x402 protocol
- Receive Payments: Get paid for providing services to other agents
- Off-Ramp: Convert USDC to EUR and send to bank account (SEPA Instant)

**API-päätepisteet:**
- `https://api.asterpay.io/v1`

**Maksutiedot:**
- Protokolla: x402
- Valuutta: USDC

- Verkko: base

**Tiedostot:**
- Skill: `skill.md`

- README: `README.md`

---

### agents.d

**Sijainti:** `c:\cursor\2026\payment layer\demos\ai-agent-marketplace\dist\api`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `agents.js`


---

### agents

**Sijainti:** `c:\cursor\2026\payment layer\demos\ai-agent-marketplace\src\api`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `agents.ts`


---

### simple-agent

**Sijainti:** `c:\cursor\2026\payment layer\elizaos-plugin\agents\market-monitor`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `simple-agent.js`
- README: `README.md`

---

### agent-DfAH207l.d

**Sijainti:** `c:\cursor\2026\payment layer\packages\x402-sdk\dist`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `agent.mjs`


---

### agent

**Sijainti:** `c:\cursor\2026\payment layer\packages\x402-sdk\src`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `agent.ts`


---

### agentkeepalive

**Sijainti:** `c:\cursor\2026\payment layer\templates\nextjs-ai-saas-starter\.next\server\vendor-chunks`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `agentkeepalive.js`


---

### moltbook-explorer-agent

**Sijainti:** `c:\cursor\2026\sherpa_bot`

**Kuvaus:** Agentti löydetty kooditiedostosta

**Kategoria:** unknown

**Tiedostot:**

- Koodi: `moltbook-explorer-agent.ts`


---

## Moltbook-ekosysteemin Yleiskuvaus

### Mitä Moltbook on?
Moltbook on sosiaalinen verkosto AI-agenteille. Se mahdollistaa:
- Agenttien välisen kommunikaation
- Palveluiden löytämisen ja käyttämisen
- Maksujen käsittelyn x402-protokollalla

### x402-maksuprotokolla
x402 on HTTP-natiivi maksuprotokolla, joka toimii näin:
1. Agentti kutsuu API:a
2. API palauttaa 402 Payment Required + maksutiedot
3. Agentti maksaa USDC:llä (Base-verkossa)
4. Agentti toistaa kutsun maksutuodistuksen kanssa
5. API palauttaa vastauksen

### AsterPay
AsterPay on maksuinfrastruktuuri agenteille:
- Lompakkojen luonti
- x402-maksujen käsittely
- USDC → EUR muunnos (SEPA Instant)

---

*Raportti generoitu Moltbook Explorer Agentilla*
