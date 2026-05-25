# BalanceBook — Project Guide

## Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **Database**: PostgreSQL on Neon (connection pooler)
- **ORM**: Prisma 6.19.1 — usa `$extends` per le query extensions, NON `$use` (rimosso in v6)
- **Auth**: NextAuth v5 beta — JWT strategy, credentials provider
- **Styling**: CSS Modules (`.module.css`) per ogni componente/pagina
- **Charts**: Recharts (statistics page) + SVG server-side (dashboard trend)
- **Font**: Inter via `next/font/google`

---

## Architettura delle pagine
| Pagina | Tipo | Note |
|--------|------|-------|
| `app/(dashboard)/page.tsx` | Server Component | Chiama Prisma direttamente |
| `app/(dashboard)/expenses/` | Client Component | Usa API routes |
| `app/(dashboard)/statistics/` | Client Component | Usa API routes |
| `app/(dashboard)/profile/` | Client Component | Usa API routes |
| `app/(auth)/login/` | Client Component | NextAuth signIn |

---

## Branch & Deploy
```
dev  →  staging  →  main
```
- **dev**: sviluppo locale, nessun deploy automatico
- **staging**: deploy automatico su Vercel (branch di preview)
- **main**: deploy automatico su Vercel (produzione)

### Vercel — variabili d'ambiente richieste
| Variabile | Note |
|-----------|-------|
| `DATABASE_URL` | Neon connection pooler URL |
| `AUTH_SECRET` | Segreto NextAuth |
| `AUTH_TRUST_HOST` | Deve essere `true` — obbligatorio per NextAuth v5 su Vercel |
| `ENCRYPTION_KEY` | Chiave AES-256-GCM base64 (32 byte) |

> ⚠️ Senza `AUTH_TRUST_HOST=true` il login fallisce silenziosamente in produzione.

---

## Encryption
- Campo `Expense.description` cifrato con **AES-256-GCM**
- Implementato via Prisma Client Extensions in `lib/prisma.ts`
- Utility in `lib/encryption.ts`
- Backward compatible: `decrypt()` restituisce testo in chiaro se il formato non corrisponde
- Script di migrazione dati esistenti: `npm run encrypt-existing`

---

## Comandi utili
```bash
# Dev server locale
npm run dev

# Dev server accessibile da altri dispositivi sulla stessa rete
npm run dev -- --hostname 0.0.0.0
# poi accedi da http://$(ipconfig getifaddr en0):3000

# Prisma
npx prisma studio          # GUI database
npx prisma db push         # Sync schema → DB
npx prisma generate        # Rigenera client

# Build
npm run build
npm run start
```

---

## Git — credenziali GitHub per questo repo
Per impostare un account GitHub specifico per questo progetto (HTTPS):

```bash
# 1. Imposta username nell'URL remote
git remote set-url origin https://TUO_USERNAME@github.com/OWNER/risparmio.git

# 2. Verifica
git remote -v

# 3. Al prossimo push inserisci:
#    Username: GitHub username
#    Password: Personal Access Token (NON la password GitHub)
#    → GitHub → Settings → Developer settings → Personal access tokens → repo scope
```

Le credenziali vengono salvate automaticamente nel keychain macOS dopo il primo push.

---

## Pattern da rispettare
- Usare `$extends` di Prisma v6, mai `$use`
- Riavviare il dev server dopo modifiche a `lib/prisma.ts`
- Le variabili senza prefisso `NEXT_PUBLIC_` sono server-side only (corretto per `ENCRYPTION_KEY`)
- I campi `amount` non sono cifrati per preservare aggregazioni/filtri nel DB
- Modali come bottom sheet con animazione `slideUp` e `backdrop-filter: blur`
- Importi negativi con `\u2212` (segno meno Unicode), non il trattino `-`
