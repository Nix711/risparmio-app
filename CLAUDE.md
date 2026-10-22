# BalanceBook — Project Guide

## Stack
- **Framework**: Next.js 16.1.1 (App Router)
- **Database**: PostgreSQL — Neon in produzione (connection pooler), Docker in locale
- **ORM**: Prisma 6.19.1 — usa `$extends` per le query extensions, NON `$use` (rimosso in v6)
- **Auth**: NextAuth v5 beta — JWT strategy, credentials provider
- **Styling**: CSS Modules (`.module.css`) per ogni componente/pagina
- **Charts**: Chart.js + react-chartjs-2 (statistics page) + SVG server-side (dashboard trend)
- **Font**: Inter via `next/font/google`
- **Test**: Vitest 5 — unit e integrazione su Postgres, coverage con v8
- **CI**: GitHub Actions — lint, type-check, test e build su ogni pull request

---

## Architettura delle pagine
| Pagina | Tipo | Note |
|--------|------|-------|
| `app/(dashboard)/page.tsx` | Server Component | Chiama `lib/services/dashboard.ts` |
| `app/(dashboard)/expenses/` | Client Component | Usa API routes |
| `app/(dashboard)/statistics/` | Client Component | Usa API routes |
| `app/(dashboard)/profile/` | Client Component | Usa API routes |
| `app/(auth)/login/` | Client Component | NextAuth signIn |

---

## API e livello di servizio
```
route handler (app/api/)  →  servizio (lib/services/)  →  Prisma
```
- **Route handler**: leggono la richiesta, chiamano un servizio e convertono gli importi con `serializeMoney`. Si scrivono con `authedRoute` di `lib/api/route.ts`, che risponde 401 senza sessione, o con `publicRoute` (solo la registrazione); il corpo si legge con `parseBody(request, schema)`
- **Servizi**: la logica e le query. Ricevono `userId`, mai la sessione, e non conoscono HTTP: si possono chiamare anche da un Server Component, come fa la dashboard
- **Errori**: un servizio lancia `NotFoundError` (404) o `InvalidRequestError` (400) di `lib/services/errors.ts`, e la route li traduce in status. Ogni altro errore diventa un 500 con il messaggio dato alla route e finisce nel log: l'errore vero non arriva al client
- **Proprietà**: update e delete filtrano per `{ id, userId }` nella scrittura stessa, e `notFoundIfMissing` trasforma il P2025 di Prisma in `NotFoundError`. La risorsa di un altro utente risponde come una inesistente, mai 403
- **Categorie**: l'utente vede le predefinite e le sue (`visibleTo` in `lib/services/categories.ts`), e un movimento può usare solo quelle (`assertUsableCategory`)
- Gli importi restano `Decimal` nei servizi e diventano `number` nella route. Eccezione: `getDashboardData` restituisce già i numeri pronti per la pagina

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

## Test
Vitest con due progetti, configurati in `vitest.config.mts`:

| Progetto | File | Cosa serve |
|----------|------|------------|
| `unit` | `lib/**/*.test.ts`, accanto al codice che testano | niente |
| `integration` | `tests/**/*.test.ts` | Postgres acceso (`npm run db:up`) |

```bash
npm test                # tutti i test
npm run test:unit       # solo unit, senza Docker
npm run test:watch      # rilancia i test a ogni modifica
npm run test:coverage   # coverage di lib/: fallisce se una misura scende sotto l'80%
```

**Test d'integrazione**
- Chiamano i route handler direttamente; `jsonRequest()` e `routeContext()` in `tests/helpers/request.ts` ne costruiscono gli argomenti
- La sessione è simulata con `vi.mock("@/lib/auth")` e si imposta con `signInAs(user)` / `signOut()` di `tests/helpers/session.ts`; validazione, Prisma, cifratura e database sono quelli veri
- Usano il database `balancebook_test` nello stesso container: prima dei test `prisma migrate deploy` lo crea e lo porta all'ultima migration, prima di ogni test le tabelle vengono svuotate. I file girano uno alla volta
- Una guardia ferma i test se la URL non punta a un database locale che finisce in `_test`
- I dati si creano con `tests/helpers/factories.ts`; `storedDescription()` di `tests/helpers/raw.ts` legge la descrizione com'è nel database, senza l'estensione che la decifra

**Ambiente**: Vitest non legge `.env`. La configurazione imposta una `ENCRYPTION_KEY` di prova e `TZ=UTC`, il fuso dei server di Vercel e di GitHub Actions.

**Per ogni nuova route**: le funzioni prodotte da `authedRoute` vogliono sempre la richiesta, anche quando non la usano (`GET(jsonRequest("GET", "/api/…"))`). Un test per il 401 senza sessione, il 400 con dati non validi, il 404 sulle risorse di un altro utente (che devono restare intatte) e il caso riuscito.

**Bug noti**: sono test `it.fails`, che passano finché il bug esiste; `grep -rn "it.fails" lib tests` li elenca. Quando un bug viene corretto il test fallisce con "Expect test to fail" e va trasformato in un `it` normale. In un nuovo `it.fails` verificare l'effetto del bug (dati modificati, richiesta accettata), non uno status preciso: una correzione con uno status diverso resterebbe nascosta.

---

## CI
GitHub Actions, in `.github/workflows/`:

| Workflow | Quando | Job |
|----------|--------|-----|
| `ci.yml` | ogni pull request e ogni push su `main` | `Lint e type-check`, `Test`, `Build`, in parallelo |
| `branch-flow.yml` | pull request verso `main`, anche quando ne cambia la destinazione | `PR verso main solo da staging` |

- Il job `Test` avvia un Postgres 17 come servizio, con le credenziali di `docker-compose.yml`, e lancia `npm run test:coverage`: anche la soglia dell'80% blocca la PR
- `next typegen` prima di `tsc` genera in `.next/types` i tipi con cui Next controlla le firme di pagine, layout e route handler
- La versione di Node è `engines.node` in `package.json`, letta sia da `setup-node` sia da Vercel: per cambiarla basta quel campo
- I nomi dei job sono i check obbligatori dei ruleset (Settings → Rules → Rulesets): rinominando un job va aggiornato anche il ruleset, altrimenti le PR restano in attesa di un check che non arriva più

**Ruleset**
- `main`: pull request obbligatoria, con i check verdi
- `dev` e `staging`: solo i check verdi, senza pull request obbligatoria. Così il fast-forward dopo il rilascio viene accettato, perché il commit di `main` ha già i check, mentre un push di codice mai testato viene rifiutato
- Nessuna eccezione, neanche per l'admin. Se la CI si blocca per una causa esterna, si disattiva il ruleset per il tempo necessario

---

## Branch & Deploy
```
branch di lavoro  →  dev  →  staging  →  main
```
- **branch di lavoro** (`fix/…`, `refactor/…`, `test/…`, `chore/…`, `docs/…`): uno per intervento, unito in `dev` con una pull request
- **dev**: integrazione, nessun deploy
- **staging**: branch di rilascio, contiene esattamente ciò che andrà in produzione; nessun deploy
- **main**: deploy automatico su Vercel (produzione). Si aggiorna solo con una pull request da `staging`, mai con push diretto: lo impongono il ruleset di `main` e `branch-flow.yml`
- Solo `main` viene pubblicato: lo stabilisce `git.deploymentEnabled` in `vercel.json`, perché di default Vercel pubblicherebbe ogni branch
- Merge con **Create a merge commit**, non squash, per tenere leggibili i singoli commit

### Dopo ogni rilascio
Quando la CI su `main` è verde, riportare `dev` e `staging` su `main` con un fast-forward. Prima i ruleset rifiuterebbero il push, perché il commit non ha ancora i check:
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
- ⚠️ L'estensione copre solo `create`, `update`, `upsert`, `findMany`, `findFirst` e `findUnique` sui movimenti. `createMany`, `updateMany`, le varianti `…AndReturn` e `…OrThrow` e le query annidate salvano la descrizione in chiaro o la restituiscono cifrata: non usarle sui movimenti finché non è corretta (`it.fails` in `tests/lib/prisma.test.ts`)

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
- Route e pagine non chiamano Prisma: passano da un servizio di `lib/services/` (vedi "API e livello di servizio")
- Usare `$extends` di Prisma v6, mai `$use`
- Ogni modifica allo schema passa da una migration (`prisma migrate dev`), mai da `prisma db push`: senza migration la modifica non si può riprodurre su un altro database
- Riavviare il dev server dopo modifiche a `lib/prisma.ts`
- `prisma.config.ts` carica `.env` esplicitamente: con quel file presente la CLI di Prisma non lo fa più da sola e i comandi `prisma` fallirebbero con `P1012`
- Le variabili senza prefisso `NEXT_PUBLIC_` sono server-side only (corretto per `ENCRYPTION_KEY`)
- La verifica delle credenziali sta in `lib/credentials.ts`, non in `lib/auth.ts`: i test d'integrazione simulano `lib/auth`, quindi lì va solo la configurazione di NextAuth
- `@types/node` segue la versione di Node usata su Vercel (24.x): aggiornarli insieme
- I campi `amount` non sono cifrati per preservare aggregazioni/filtri nel DB
- Modali come bottom sheet con animazione `slideUp` e `backdrop-filter: blur`
- Importi negativi con `\u2212` (segno meno Unicode), non il trattino `-`
