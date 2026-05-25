# Handoff: Risparmio — Dark Mode Redesign

## Overview
Redesign completo dell'app di gestione finanze personali "BalanceBook" (riposizionata come **Risparmio**), trasformata in una UI dark-mode moderna ispirata alle migliori personal-finance app (Revolut, Copilot Money, Monarch Money) ma con identità propria.

L'app gestisce: transazioni (spese/entrate), obiettivi di risparmio, budget per categoria, statistiche.

## About the Design Files
Il file `Risparmio.html` in questo bundle è un **riferimento di design creato in HTML/React via Babel inline** — un prototipo interattivo che mostra look, layout e comportamento attesi, **non codice di produzione da copiare direttamente**.

Il task è **ricreare il design nel tuo ambiente target** (React Native, SwiftUI, Flutter, Jetpack Compose, o React web) usando i pattern e le librerie già presenti nel codebase. Se il codebase è all'inizio, scegli il framework più adatto al progetto (per un'app mobile suggerisco React Native + Reanimated, o SwiftUI nativo).

## Fidelity
**High-fidelity.** Tutti i colori, spaziature, tipografia, dimensioni icone, raggi di bordo, ombre, animazioni sono finali e dovrebbero essere riprodotti pixel-perfect. I dati di esempio (transazioni, goal, budget) sono mock — sostituiscili con i dati reali del backend.

---

## Design Tokens

### Colors
```ts
const colors = {
  // Background layers (3 livelli di elevazione)
  bg:           '#0A0A0F',   // app background
  surface:      '#15151D',   // primary card / nav surface
  surfaceUp:    '#1E1E28',   // elevated / hover / selected
  surfaceHover: '#23232E',   // pressed states

  // Borders (hairline, 1px)
  border:       'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.13)',

  // Text
  text:         '#F5F5F7',   // primary
  textDim:      '#9B9BA8',   // secondary
  textMuted:    '#5C5C68',   // tertiary / labels

  // Semantic financial colors
  income:       '#3DDC97',   // green — entrate / positivo
  expense:      '#FF6B6B',   // coral red — spese / negativo
  goal:         '#A78BFA',   // violet — obiettivi
  accent:       '#7B61FF',   // primary brand action
  warn:         '#F59E0B',   // budget warning

  // Category tints (tutti usati al 22% alpha per fill, 33% per border)
  catSpesa:     '#FF6B6B',
  catRistoranti:'#F59E0B',
  catTrasporti: '#60A5FA',
  catSvago:     '#A78BFA',
  catSalute:    '#F472B6',
  catShopping:  '#EC4899',
  catCasa:      '#34D399',
  catSigarette: '#94A3B8',
  catAbbonamenti:'#22D3EE',
  catStipendio: '#3DDC97',
  catFreelance: '#3DDC97',
};
```

### Typography
- **Family**: Inter (400/500/600/700) — fallback `-apple-system, system-ui, sans-serif`
- **Numeri**: sempre `font-variant-numeric: tabular-nums` per allineamento
- **Locale**: `it-IT` per formattazione numeri/date

Scala tipografica:
| Token | Size | Weight | Letter-spacing | Usage |
|---|---|---|---|---|
| display-xl | 42px | 600 | -1.2px | Hero balance |
| display-lg | 30px | 600 | -0.8px | Total savings |
| display-md | 26px | 600 | -0.5px | Screen titles |
| display-sm | 22px | 600 | -0.3px | Greeting |
| body-lg | 16px | 600 | normal | Card titles |
| body | 14-15px | 500 | normal | List item primary |
| label | 12-13px | 500 | normal | Secondary |
| meta | 11.5px | 500 | normal | Muted |
| eyebrow | 11px | 500-600 | +0.5px, uppercase | Section labels |

### Spacing
- Padding orizzontale schermate: **18px**
- Card padding: **18px** (default), **14px** (compatto), **16px** (large)
- Card border-radius: **22px**, mini-card: **18px**, pill: **12px**, button: **14px**
- Gap fra card stack: **14px**
- Gap fra item in lista: **10px**

### Shadows / Glow
- Card hero: gradient overlay `radial-gradient(circle, rgba(123,97,255,0.18), transparent 70%)` in alto-dx
- FAB shadow: `0 8px 22px rgba(123,97,255,0.42), inset 0 1px 0 rgba(255,255,255,0.18)`
- Nessuna ombra hard — solo border hairline + glow tonale

### Animations
- Hover transition: **160ms** (background)
- Modal slide-up: **320ms cubic-bezier(.2,.8,.2,1)**
- Backdrop fade: **240ms**
- Bar fill animate-in: **600ms cubic-bezier(.2,.8,.2,1)**

---

## Screens

### 1. Home (`app-home`)
**Purpose**: Pannello di controllo. Tutto il critico visibile senza scroll oltre la fold del telefono.

**Layout** (top-to-bottom, 18px padding orizz.):
1. **Greeting row** (alt: 56px area sotto status bar)
   - `Marzo 2026` eyebrow 12.5px textMuted
   - `Ciao, Nicola` display-sm
   - Avatar 40×40 round, gradient `linear-gradient(135deg, #7B61FF, #A78BFA)` con iniziale bianca
2. **Hero card "Saldo netto"** — background `linear-gradient(180deg, #1A1A24, #14141C)`, radius 24px, border 1px hairline
   - Eyebrow "Saldo netto del mese" + pill verde `↑ 24%` (income+20 alpha bg, income color, 11px)
   - Numero principale 42px/600/-1.2 letter-spacing, segno `+`/`−` (usa U+2212 minus per `−`)
   - Glow viola in alto-dx (vedi shadows sopra)
   - Sotto: due mini-card affiancate gap 8px:
     - Entrate: bg `rgba(61,220,151,0.08)` border `rgba(61,220,151,0.18)` radius 12px, dot 6px + eyebrow + valore 16/600
     - Spese: stessa struttura con coral
3. **Trend card** "Andamento 6 mesi · Entrate vs Spese"
   - SVG line chart 326×108: 2 linee (income verde, expense coral) con area-fill 22→0 alpha gradient
   - Grid lines orizzontali a 25/50/75% con `stroke="rgba(255,255,255,0.04)" stroke-dasharray="2 4"`
   - Dot 4px sull'ultimo punto di ogni linea con stroke 2px del colore bg
   - Bottone "Dettagli →" accent pill in alto-dx
   - Legend in basso: pillette 18×2.5px + label
4. **Top categorie spese** (section header "TOP CATEGORIE SPESE" + action "Tutte" accent)
   - Card con 4 barre orizzontali. Per ogni cat:
     - Riga superiore: emoji + nome + sub `%` muted + valore tabular a destra
     - Track 8px `rgba(255,255,255,0.05)` radius 999, fill colore categoria pieno
5. **Obiettivi attivi** — carosello orizzontale, scroll snap
   - Card 188px width, radius 18px, padding 14px
   - Icon 32×32 radius 10, tint+22 alpha, border tint+33 alpha
   - Nome + scadenza + valore 17/600 + "di X €" muted + progress 5px + `%` color
6. **Ultime transazioni** (4 items, divider hairline a 50px indent)
   - Section header + action "Tutte"
7. Bottom spacer 110px per la tab bar

**Componenti chiave**:
- `<TransactionRow>`: icona cat 38×38 + descr + cat/data muted + amount (verde se positivo, text altrimenti)
- Numeri: usa funzione `eur(n, { signed, noDecimals })` che genera `+1.234,56 €` con NBSP fra valore e simbolo

### 2. Transazioni (`app-transactions`)
- Titolo `Transazioni` + iconBtn cerca a dx
- Selettore mese (full-width pill `Marzo 2026 ⌄`) — apre date picker
- **Segmented filter**: 3 tab "Tutte / Spese / Entrate" — segmento attivo bg surfaceUp, inattivo textDim
- **3 stat pills** affiancate (Entrate / Spese / Bilancio) — l'attivo (Bilancio) ha bg tint 14 alpha + border tint 30
- **Lista raggruppata per giorno**: card singola, ogni gruppo ha header con label data ("Oggi", "Ieri", "Mercoledì 22 mar") + somma giornaliera. Item separati da hairline 50px indent

### 3. Statistiche (`app-stats`)
- Titolo + iconBtn (filtri/equalizer)
- Period switcher "Settimana / Mese / Anno"
- **Donut chart**: 148px, stroke 20px
  - Track `rgba(255,255,255,0.05)`
  - 5 segmenti con 2px gap (modificando `dasharray`)
  - Center label "TOTALE" + valore 26/600 tabular
  - Lista breakdown a destra (5 categorie, dot 8px + nome + percentuale)
- **Trend card** (stesso line chart della Home ma più alto)
- **Budget card**: barre orizzontali con `value: min(spent, cap)`. Se `spent > cap` → barra colore expense + emoji "⚠️" in sub

### 4. Obiettivi (`app-goals`)
- Card riepilogo: "TOTALE RISPARMIATO" + 30/600 valore + sotto "su X € pianificati"
- Lista card singole, padding 16:
  - Riga: icon 44×44 radius 14 + nome + scadenza muted + `%` grande color goal a dx
  - Barra 8px tutta larghezza, fill `linear-gradient(90deg, accent, accentCC)`
  - Footer: `X €` di `Y €` muted + "mancano Z €" allineato dx

### 5. Profilo (`app-profile`)
- User card: avatar 52 + nome + email + iconBtn edit
- Section "PREFERENZE" → card con SettingRow (label + value muted + chevron)
- Section "CATEGORIE" → card con righe icon + nome + chip "Predefinita"
- Section "ACCOUNT" → righe con chevron (Esporta dati, Privacy, Cambia password)
- Bottone "Esci dall'account" full-width, bg `rgba(255,107,107,0.08)`, border 1px coral 20 alpha, color expense, weight 600

### 6. Nuova Transazione (bottom sheet)
- Backdrop `rgba(0,0,0,0.6)` + `backdrop-filter: blur(6px)`, fade 240ms
- Sheet: `#0D0D14` bg, top-radius 28, border 1px borderStrong, slide-up 320ms cubic-bezier(.2,.8,.2,1)
- Grabber 36×4 centrato
- **Type segmented** "− Spesa / + Entrata" — segmento attivo usa il colore semantico (coral/green) al 20 alpha bg + border 40 alpha
- **Amount display** centrato: `−`/`+` 28/500 muted + numero 56/600/-2.5 letter-spacing nel colore del tipo + `€` muted
- **Category grid** 4 colonne: cell 12×6 padding, emoji 22px + label 10.5px, attivo bg tint 20 + border tint 60
- Input descrizione full-width
- Date row con calendar icon + "Oggi · 25 mar 2026"
- **Numeric keypad** 3×4: 1-9 + , + 0 + ⌫ (backspace)
- Submit button full-width, bg colore tipo, text `#0A0A0F`

### Bottom Nav (sticky)
- Position absolute bottom 0, paddingBottom 26, paddingTop 8
- Gradient fade-in dal trasparente al `#0A0A0F` al 60%
- Container pill: bg `rgba(21,21,29,0.85)` + `backdrop-filter: blur(20px)`, margin 14px, radius 22, padding 6/8
- 5 items: Home, Trans., **[+]**, Stats, Profilo
- Tab attivo: color accent, icona stroke 2.2; inattivo color textMuted, stroke 1.8
- FAB centrale: 52×52 radius 18 bg gradient brand, sollevato -12px margin top, shadow viola

---

## Interactions & Behavior

- **Navigation**: state `screen` in React, click su tab → setState. Scroll resettato a 0 ad ogni cambio.
- **FAB**: apre `<AddTransactionSheet open={true}>` — backdrop click chiude.
- **Keypad**: gestisce input numerico, max 7 cifre, max 2 decimali, virgola singola. `⌫` rimuove ultimo char (torna a `0` se vuoto). Inserimento iniziale sostituisce `0`.
- **Type toggle nel modal**: cambia colore display + filtra categorie disponibili (spese vs entrate).
- **Date label dynamic**: oggi/ieri/`Giovedì 21 mar` rispetto alla data corrente del prototipo (25 mar 2026).
- **Hover**: card interactive flip `surface → surfaceUp` in 160ms.

---

## State Management

```ts
// app state
type ScreenId = 'home' | 'transactions' | 'stats' | 'goals' | 'profile';
const [screen, setScreen] = useState<ScreenId>('home');
const [addOpen, setAddOpen] = useState(false);

// transactions screen state
const [filter, setFilter] = useState<'all'|'expense'|'income'>('all');
const [month, setMonth] = useState('Marzo');

// add modal state
const [type, setType] = useState<'expense'|'income'>('expense');
const [amount, setAmount] = useState('0');
const [cat, setCat] = useState('spesa');
const [desc, setDesc] = useState('');
```

### Data shape
Vedi `MOCK` nel sorgente per il modello completo. Forme essenziali:
```ts
type Transaction = {
  id: string; date: string; // ISO yyyy-mm-dd
  cat: CategoryId; desc: string; amount: number; // negativo = spesa
};
type Goal = { id: string; name: string; emoji: string;
  saved: number; target: number; due: string; accent: string; };
type Budget = { cat: CategoryId; spent: number; cap: number };
type Category = { id: string; name: string; emoji: string; tint: string };
```

---

## Assets
- **Font**: Inter via Google Fonts.
- **Icons**: SVG inline (feather-style, stroke 1.8/2/2.5). Sostituibili con icon library del codebase target.
- **Emoji categorie**: usa quelle native del sistema (📛, 🛒, ecc.) — NON sostituire con illustrazioni custom.

---

## UX Improvements vs Original App
Risolti rispetto agli screenshot originali:
1. Header transazioni con 4 dropdown impilati → un selettore mese + segmented filter compatto
2. Card spese mostrava entrate in verde dentro un viola = ambiguità semantica → due card separate con colore semantico
3. Tre CTA per aggiungere transazione (header button + tab + FAB) → un solo FAB centrale
4. "Nessun dato disponibile" placeholder testuale → donut + breakdown sempre visibile
5. Profilo monolitico (info + password + categorie + logout) → suddiviso in card semantiche per gruppo
6. Mancavano: trend mensile, budget tracker, hero del bilancio netto → tutti aggiunti

---

## Files
- `Risparmio.html` — prototipo completo, single-file (Babel inline). Apri in browser per esplorare.
- Il sorgente JSX è contenuto in un unico `<script type="text/babel">` con sezioni delimitate da commenti (data → charts → screen-home → screens-rest → bootstrap).
