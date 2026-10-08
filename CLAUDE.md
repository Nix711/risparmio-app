# BalanceBook — Project Guide

## Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **Database**: PostgreSQL — Neon in produzione (connection pooler), Docker in locale
- **ORM**: Prisma 6.19.1 — usa `$extends` per le query extensions, NON `$use` (rimosso in v6)
- **Auth**: NextAuth v5 beta — JWT strategy, credentials provider
- **Styling**: CSS Modules (`.module.css`) per ogni componente/pagina
- **Charts**: Chart.js + react-chartjs-2 (statistics page) + SVG server-side (dashboard trend)
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

## Sviluppo in locale
Il database di sviluppo è un Postgres 17 in Docker (`docker-compose.yml`), mai Neon: in locale non si lavora sui dati di produzione.

```bash
cp .env.example .env    # poi genera AUTH_SECRET ed ENCRYPTION_KEY con: openssl rand -base64 32
npm install
npm run db:up           # avvia Postgres e torna quando il healthcheck è verde
npm run db:reset        # applica le migration e lancia il seed (chiede conferma)
npm run dev             # http://localhost:3000
```

Accesso con l'utente demo: `demo@balancebook.local` / `demo1234`.

- `npm run db:down` ferma il container; i dati restano nel volume `db-data`
- `npm run seed` crea le categorie predefinite; utente e movimenti demo solo se `DATABASE_URL` punta a localhost (guardia in `prisma/seed.ts`)
- In `DATABASE_URL` usare `127.0.0.1`, non `localhost`: la porta è pubblicata solo su IPv4 e `localhost` può risolversi in `::1`

---

## Branch & Deploy
```
branch di lavoro  →  dev  →  staging  →  main
```
- **branch di lavoro** (`fix/…`, `refactor/…`, `chore/…`, `docs/…`): uno per intervento, unito in `dev` con una pull request
- **dev**: integrazione, nessun deploy
- **staging**: branch di rilascio, contiene esattamente ciò che andrà in produzione; nessun deploy
- **main**: deploy automatico su Vercel (produzione). Si aggiorna solo con una pull request da `staging`, mai con push diretto
- Solo `main` viene pubblicato: lo stabilisce `git.deploymentEnabled` in `vercel.json`, perché di default Vercel pubblicherebbe ogni branch
- Merge con **Create a merge commit**, non squash, per tenere leggibili i singoli commit

### Dopo ogni rilascio
Riportare `dev` e `staging` su `main` con un fast-forward:
```bash
git fetch
git push origin origin/main:dev origin/main:staging
```
Ogni PR unita con un merge commit crea un commit che esiste solo sul branch di arrivo: senza questo passo `dev` risulta indietro rispetto a `main` pur avendo lo stesso codice. Una PR `main → dev` non risolve, perché crea un altro merge commit. Se `dev` ha commit che `main` non ha, git rifiuta il push invece di perderli.

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
# Dev server accessibile da altri dispositivi sulla stessa rete
npm run dev -- --hostname 0.0.0.0
# poi accedi da http://<IP della macchina>:3000

# Prisma
npx prisma migrate dev --name <nome>   # Modifica allo schema → nuova migration, applicata in locale
npx prisma migrate status              # Database a cui si è connessi e migration da applicare
npx prisma studio                      # GUI database
npx prisma generate                    # Rigenera client

# Build
npm run build
npm run start
```

---

## Pattern da rispettare
- Usare `$extends` di Prisma v6, mai `$use`
- Ogni modifica allo schema passa da una migration (`prisma migrate dev`), mai da `prisma db push`: senza migration la modifica non si può riprodurre su un altro database
- Riavviare il dev server dopo modifiche a `lib/prisma.ts`
- `prisma.config.ts` carica `.env` esplicitamente: con quel file presente la CLI di Prisma non lo fa più da sola e i comandi `prisma` fallirebbero con `P1012`
- Le variabili senza prefisso `NEXT_PUBLIC_` sono server-side only (corretto per `ENCRYPTION_KEY`)
- I campi `amount` non sono cifrati per preservare aggregazioni/filtri nel DB
- Modali come bottom sheet con animazione `slideUp` e `backdrop-filter: blur`
- Importi negativi con `\u2212` (segno meno Unicode), non il trattino `-`
