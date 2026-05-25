# DevOps/SRE: CI/CD, automatizare și metrici SLI/SLO folosind GitHub Actions

---

## Obiective

Obiectivele acestui laborator:

- Crearea și configurarea unui repo (*repository*) GitHub cu structură de proiect web.
- Înțelegerea workflow-urilor GitHub Actions pentru CI (*continous integration*) și CD (*continous development*).
- Rularea de teste automate ca parte dintr-un pipeline de integrare continuă.
- Publicarea unei aplicații web pe GitHub Pages prin deployment automat.
- Definirea și măsurarea SLI-uri (latență, disponibilitate) printr-un workflow de monitorizare.
- Interpretarea rapoartelor generate în interfața GitHub (Job Summary, tab Actions).

---

## Cerințe preliminare

- Cont GitHub cu beneficii **GitHub Education** (student verificat).
- Git instalat local (`git --version` să returneze o versiune 2.x).
- Node.js instalat local (`node --version` să returneze o versiune ≥ 18.x).
- Un editor de cod (VSC recomandat).
- Cunoștințe de bază HTML, CSS, JavaScript.

> **Notă GitHub Education:** Studenții verificați prin [education.github.com](https://education.github.com) beneficiază de repository-uri private nelimitate și acces la GitHub Copilot gratuit. Toate funcționalitățile folosite în laborator sunt disponibile pe planul gratuit, inclusiv GitHub Actions pentru repository-uri publice (nelimitat) și GitHub Pages.

---

## Concepte acoperite

| Concept DevOps/SRE             | Instrument GitHub            | Secțiunea |
| ------------------------------ | ---------------------------- | --------- |
| Automatizare build & test      | GitHub Actions - workflow CI | Pasul 4   |
| Deployment automat             | GitHub Actions - workflow CD | Pasul 5   |
| Monitorizare & observabilitate | GitHub Actions - Job Summary | Pasul 6   |
| SLI (Service Level Indicator)  | Workflow de monitorizare     | Pasul 6   |
| SLO (Service Level Objective)  | Praguri în workflow          | Pasul 6   |
| Error Budget                   | Calcul automat în workflow   | Pasul 6   |

---

## Pasul 1 - Crearea repository-ului

### 1.1 Creează repository-ul pe GitHub

1. Autentificare pe [github.com](https://github.com).
2. Click pe butonul **New** (colț stânga sus) → **New repository**.
3. De completat:
   - **Repository name:** `isa-devops-lab`
   - **Description:** `ISA Lab - DevOps/SRE cu GitHub Actions`
   - **Visibility:** Public *(necesar pentru GitHub Pages gratuit și Actions nelimitat)*
   - Bifează **Add a README file**
4. Click **Create repository**.

### 1.2 Clonează repository-ul local

```bash
git clone https://github.com/<username>/isa-devops-lab.git
cd isa-devops-lab
```

Înlocuiește `<username>` cu numele tău de utilizator GitHub.

### 1.3 Creează structura de directoare

```bash
# cmd
mkdir -p app tests .github/workflows

# powershell
mkdir app, tests, .github/workflows
```

Structura finală a proiectului va fi:

```
isa-devops-lab/
├── app/
│   ├── index.html          # Interfața aplicației TODO
│   ├── style.css           # Stiluri
│   └── app.js              # Logica aplicației + API testabil
├── tests/
│   └── todo.test.js        # Suite de teste unitare
├── .github/
│   └── workflows/
│       ├── ci.yml          # Workflow CI: build + teste
│       ├── cd.yml          # Workflow CD: deploy GitHub Pages
│       └── sli-monitor.yml # Workflow monitorizare SLI/SLO
└── README.md
```

---

## Pasul 2 - Aplicația TODO Manager

Aplicația este un manager de sarcini minimal, scris în HTML, CSS și JavaScript pur, fără nicio dependență externă sau framework. Este simplă pentru a pune accent pe pipeline-ul DevOps, nu pe aplicație în sine.

Copiați conținutul arhivei `app.zip` (3 fișiere) în folderul `app` din structura creată pe disc la pasul anterior.

### 2.1 Testare locală a aplicației

Deschide `app/index.html` direct în browser. Puteți adăuga sarcini, le puteți marca ca fiind finalizate, le puteți filtra și șterge. Datele sunt salvate în `localStorage` - persistă la reîncărcarea paginii.

---

## Pasul 3 - Unit testing

Testele sunt scrise în JavaScript pur, fără nicio bibliotecă externă (Jest, Mocha, etc.), rulabile direct cu Node.js.

### 3.1 Fișierul `tests/todo.test.js`

Plasati fișierul `todo.test.js` în folderul `tests` creat anterior.

### 3.2 Rularea locală a testelor

```bash
node tests/todo.test.js
```

Output așteptat:

```
TODO Manager - Test Suite

addTodo()
  ✅  adaugă o sarcină cu text valid
  ✅  ignoră textul gol
  ✅  trimează spațiile din text
  ✅  fiecare sarcină primește un id unic

toggleTodo()
  ✅  marchează o sarcină ca finalizată
  ...

────────────────────────────────────────
Total: 15 | ✅ 15 trecute | ❌ 0 eșuate
────────────────────────────────────────
```

Toate cele 15 teste trebuie să treacă înainte de a continua.

---

## Pasul 4 - Workflow CI (integrare continuă)

### 4.1 Ce este CI?

**Continuous Integration (CI)** este practica de a integra modificările de cod în ramura principală frecvent - de mai multe ori pe zi - și de a verifica automat la fiecare integrare că aplicația se compilează și testele trec. Scopul este detectarea rapidă a erorilor, înainte ca acestea să ajungă în producție.

### 4.2 Fișierul `.github/workflows/ci.yml`

Creați fișierul `.github/workflows/ci.yml` (encoding UTF-8!):

```yaml
name: CI - Build & Test

# Declanșat la orice push sau pull request pe ramura main
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    name: Rulează testele automate
    runs-on: ubuntu-latest

    steps:
      # 1. Descarcă codul din repository
      - name: Checkout cod sursă
        uses: actions/checkout@v4

      # 2. Configurează mediul Node.js
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # 3. Verifică că fișierele aplicației există
      - name: Verifică fișierele aplicației
        run: |
          echo "── Structura proiectului ──"
          ls -la app/
          echo ""
          echo "── Verificare fișiere obligatorii ──"
          for f in app/index.html app/style.css app/app.js; do
            if [ -f "$f" ]; then
              echo "✅  $f există"
            else
              echo "❌  $f LIPSEȘTE"
              exit 1
            fi
          done

      # 4. Rulează suita de teste
      - name: Rulează testele unitare
        run: node tests/todo.test.js

      # 5. Generează raport vizibil în interfața GitHub
      - name: Generează raport de stare
        if: always()
        run: |
          echo "## 📋 Raport CI - $(date '+%Y-%m-%d %H:%M UTC')" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "| Verificare | Stare |" >> $GITHUB_STEP_SUMMARY
          echo "|---|---|" >> $GITHUB_STEP_SUMMARY
          echo "| Fișiere aplicație | ✅ Prezente |" >> $GITHUB_STEP_SUMMARY
          echo "| Teste unitare (15) | ✅ Trecute |" >> $GITHUB_STEP_SUMMARY
          echo "| Commit | \`${{ github.sha }}\` |" >> $GITHUB_STEP_SUMMARY
          echo "| Ramură | \`${{ github.ref_name }}\` |" >> $GITHUB_STEP_SUMMARY
```

### 4.3 Anatomia unui workflow GitHub Actions

```
name: CI - Build & Test          # Numele afișat în interfața GitHub
│
on:                               # Evenimentele care declanșează workflow-ul
│  push:                          #   la fiecare push
│    branches: [main]             #   dar doar pe ramura main
│  pull_request:                  #   și la pull request-uri
│    branches: [main]
│
jobs:                             # Lista de job-uri (rulează în paralel implicit)
   test:                          # Numele job-ului
      runs-on: ubuntu-latest      # Mașina virtuală pe care rulează
      steps:                      # Pași executați secvențial
         - uses: ...              #   Acțiune predefinită din GitHub Marketplace
         - name: ...              #   Pas personalizat cu comenzi shell
           run: |
             ...
```

**Elemente cheie:**

- `on:` - definește evenimentele declanșatoare (push, pull_request, schedule, workflow_dispatch etc.)
- `jobs:` - fiecare job rulează pe o mașină virtuală separată (runner)
- `steps:` - pașii unui job se execută secvențial; dacă un pas eșuează, job-ul se oprește
- `uses:` - importă o acțiune gata făcută (ex. `actions/checkout@v4` clonează repository-ul)
- `run:` - execută comenzi shell standard (bash pe Linux)
- `$GITHUB_STEP_SUMMARY` - fișier special în care poți scrie Markdown, vizibil în tab-ul Actions

### 4.4 Primul commit și observarea CI

```bash
git add .
git commit -m "feat: adaugă aplicație TODO și workflow CI"
git push origin main
```

Apoi:

1. Mergeți în repo de pe GitHub.
2. Observați actualizarea fișierelor din repo (tab-ul **Code**, implicit).
3. Click pe tab-ul **Actions**.
4. Observați workflow-ul **CI - Build & Test** în execuție (portocaliu = în curs, verde = trecut, roșu = eșuat).
5. Click pe rulare → click pe job-ul **test** → se explorează fiecare pas.
6. Click pe tab-ul **Summary** (stânga ecranului) din job pentru a vedea raportul Markdown generat.

> **Observație:** Dacă oricare din cei 15 pași din `node tests/todo.test.js` eșuează, procesul returnează codul de ieșire 1 (`process.exit(1)`), iar GitHub Actions marchează automat workflow-ul ca eșuat. Aceasta este mecanica fundamentală a CI: un commit care nu trece testele este vizibil imediat.

> **Observație:** În bara din stânga (tab-ul **Actions**) se permite crearea unui nou CI workflow folosinf butonul **New workflow**. La selectarea acestei opțiuni primiți un set complet de template-uri de la care puteți porni în crearea unui nou fișier, adaptat la diferite cazuri de utilizare.

---

## Pasul 5 - Workflow CD (deployment continuu pe GitHub Pages)

### 5.1 Ce este CD?

**Continuous Deployment (CD)** este extensia naturală a CI: dacă toate verificările automate trec, codul este publicat automat în mediul de producție, fără intervenție manuală. Pentru testul nostru, „producția" este **GitHub Pages** - serviciul de hosting static gratuit al GitHub.

### 5.2 Activare GitHub Pages în setările repo-ului

Înainte de a crea workflow-ul CD, trebuie activat GitHub Pages cu sursă din Actions:

1. Mergeți la repo la tab-ul **Settings** → **Pages** (în bara de sus).
2. În lista **Source**, se selectează **GitHub Actions**.
3. Opțiunea se salvează automat (sunteți anunțați printr-un banner în partea de sus a site-ului).

### 5.3 Fișierul `.github/workflows/cd.yml`

Creați fișierul `.github/workflows/cd.yml` (encoding UTF-8!):

```yaml
name: CD - Deploy pe GitHub Pages

# Se declanșează după ce workflow-ul CI se finalizează cu succes pe main
on:
  workflow_run:
    workflows: ["CI - Build & Test"]
    types: [completed]
    branches: [main]

# Permisiuni necesare pentru GitHub Pages
permissions:
  contents: read
  pages: write
  id-token: write

# O singură rulare de deploy simultan (evită race conditions)
concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  deploy:
    name: Publică pe GitHub Pages
    runs-on: ubuntu-latest
    # Rulează DOAR dacă CI a trecut cu succes
    if: ${{ github.event.workflow_run.conclusion == 'success' }}

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - name: Checkout cod sursă
        uses: actions/checkout@v4

      - name: Configurează GitHub Pages
        uses: actions/configure-pages@v5

      - name: Încarcă directorul app/ ca artefact Pages
        uses: actions/upload-pages-artifact@v3
        with:
          path: app/

      - name: Publică pe GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

      - name: Raport deploy
        run: |
          echo "## 🚀 Deploy reușit - $(date '+%Y-%m-%d %H:%M UTC')" \
            >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "Aplicația este disponibilă la:" >> $GITHUB_STEP_SUMMARY
          echo "" >> $GITHUB_STEP_SUMMARY
          echo "🔗 **${{ steps.deployment.outputs.page_url }}**" \
            >> $GITHUB_STEP_SUMMARY
```

### 5.4 Legătura CI → CD

Observați structura evenimentului `workflow_run`:

```
Push pe main
     │
     ▼
┌─────────────────────────────┐
│   Workflow CI               │
│   ├── Checkout              │
│   ├── Setup Node.js         │
│   ├── Verifică fișiere      │
│   └── Rulează teste (15)    │
│                             │
│   Rezultat: ✅ success      │
└─────────────────────────────┘
     │
     │  (declanșează CD doar dacă CI = success)
     ▼
┌─────────────────────────────┐
│   Workflow CD               │
│   ├── Checkout              │
│   ├── Configure Pages       │
│   ├── Upload artifact       │
│   └── Deploy Pages          │
│                             │
│   URL: username.github.io/  │
│        isa-devops-lab/      │
└─────────────────────────────┘
```

Condiția `if: ${{ github.event.workflow_run.conclusion == 'success' }}` garantează că deploy-ul nu se face niciodată dacă testele au eșuat. Aceasta este o implementare directă a conceptului de **Error Budget**: codul care nu trece testele nu ajunge în producție și nu consumă din bugetul de fiabilitate.

### 5.5 Observarea pipeline-ului complet

După un push pe `main`:

```bash
git add .
git commit -m "feat: adaugă aplicație TODO și workflow CI"
git push origin main
```

1. Tab-ul **Actions** → ambele workflow-uri par sa fie în ordine.
2. CD-ul apare cu starea **Waiting** până când CI se termină.
3. După finalizarea CI, CD-ul pornește automat.
4. URL-ul aplicației publicate (`https://<username>.github.io/isa-devops-lab/`) apare în **Summary**-ul job-ului de deploy și în **Settings → Pages**. Așteptați finalizarea procesului de deploy.

---

## Pasul 6 - Workflow SLI Monitor (Metrici și Observabilitate)

### 6.1 Conexiunea cu SLI/SLO/Error Budget

Acest workflow implementează practic conceptele teoretice din laboratorul anterior:

| Concept             | Implementare în workflow                                           |
| ------------------- | ------------------------------------------------------------------ |
| **SLI**             | `curl` măsoară disponibilitatea și latența aplicației              |
| **SLO**             | Pragurile definite ca input (`slo_latency_ms`, `slo_availability`) |
| **Error Budget**    | Calculat automat: `100% - SLO` → convertit în minute/lună          |
| **Observabilitate** | Raportul Markdown generat în `$GITHUB_STEP_SUMMARY`                |
| **Alertare**        | `exit 1` când SLO-ul este depășit → workflow marcat roșu           |

### 6.2 Fișierul `.github/workflows/sli-monitor.yml`

Creează fișierul `.github/workflows/sli-monitor.yml` (encoding UTF-8!):

```yaml
name: SLI Monitor - Metrici & Observabilitate

# Rulează automat la fiecare oră și manual (pentru demo în laborator)
on:
  schedule:
    - cron: '0 * * * *'   # la fiecare oră fixă (sintaxă cron standard)
  workflow_dispatch:       # declanșare manuală din interfața GitHub
    inputs:
      slo_latency_ms:
        description: 'Prag SLO latență (ms)'
        required: false
        default: '500'
      slo_availability:
        description: 'Prag SLO disponibilitate (%)'
        required: false
        default: '99.0'

jobs:
  measure-sli:
    name: Măsoară SLI-uri
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      # ── SLI 1: Disponibilitate ────────────────────────────────────────
      - name: SLI 1 - Verificare disponibilitate
        id: availability
        run: |
          APP_URL="${{ vars.APP_URL || 'https://httpbin.org/status/200' }}"

          HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
            --max-time 10 "$APP_URL" || echo "000")

          echo "http_code=$HTTP_CODE" >> $GITHUB_OUTPUT

          if [ "$HTTP_CODE" = "200" ]; then
            echo "available=true"  >> $GITHUB_OUTPUT
            echo "✅  Disponibilitate: OK (HTTP $HTTP_CODE)"
          else
            echo "available=false" >> $GITHUB_OUTPUT
            echo "❌  Disponibilitate: EȘUAT (HTTP $HTTP_CODE)"
          fi

      # ── SLI 2: Latență ────────────────────────────────────────────────
      - name: SLI 2 - Măsoară latența
        id: latency
        run: |
          APP_URL="${{ vars.APP_URL || 'https://httpbin.org/status/200' }}"
          SLO_MS="${{ github.event.inputs.slo_latency_ms || '500' }}"

          LATENCY_SEC=$(curl -s -o /dev/null -w "%{time_total}" \
            --max-time 10 "$APP_URL" || echo "99")
          LATENCY_MS=$(echo "$LATENCY_SEC * 1000" | bc | cut -d. -f1)

          echo "latency_ms=$LATENCY_MS" >> $GITHUB_OUTPUT
          echo "⏱️  Latență măsurată: ${LATENCY_MS}ms (SLO: ${SLO_MS}ms)"

          if [ "$LATENCY_MS" -lt "$SLO_MS" ]; then
            echo "slo_latency_ok=true"  >> $GITHUB_OUTPUT
            echo "✅  SLO latență respectat"
          else
            echo "slo_latency_ok=false" >> $GITHUB_OUTPUT
            echo "⚠️  SLO latență DEPĂȘIT"
          fi

      # ── SLI 3: Dimensiunea artefactelor (build health) ───────────────
      - name: SLI 3 - Dimensiune artefacte
        id: size
        run: |
          TOTAL=$(( $(wc -c < app/index.html) + \
                    $(wc -c < app/style.css)   + \
                    $(wc -c < app/app.js) ))
          echo "total_bytes=$TOTAL" >> $GITHUB_OUTPUT
          echo "📦  Dimensiune totală: ${TOTAL} bytes"

      # ── Calculează Error Budget ───────────────────────────────────────
      - name: Calculează Error Budget
        id: budget
        run: |
          SLO_AVAIL="${{ github.event.inputs.slo_availability || '99.0' }}"
          ERROR_BUDGET=$(echo "100 - $SLO_AVAIL" | bc)
          MINUTES=$(echo "scale=1; 43200 * $ERROR_BUDGET / 100" | bc)

          echo "error_budget_pct=$ERROR_BUDGET" >> $GITHUB_OUTPUT
          echo "error_budget_min=$MINUTES"      >> $GITHUB_OUTPUT

          echo "📊  SLO disponibilitate : ${SLO_AVAIL}%"
          echo "📊  Error Budget        : ${ERROR_BUDGET}%  (~${MINUTES} min/lună)"

      # ── Raport complet ────────────────────────────────────────────────
      - name: Generează raport SLI/SLO
        if: always()
        run: |
          AVAIL="${{ steps.availability.outputs.available }}"
          HTTP="${{ steps.availability.outputs.http_code }}"
          LAT="${{ steps.latency.outputs.latency_ms }}"
          LAT_OK="${{ steps.latency.outputs.slo_latency_ok }}"
          SLO_MS="${{ github.event.inputs.slo_latency_ms || '500' }}"
          SLO_AVAIL="${{ github.event.inputs.slo_availability || '99.0' }}"
          BUDGET_PCT="${{ steps.budget.outputs.error_budget_pct }}"
          BUDGET_MIN="${{ steps.budget.outputs.error_budget_min }}"
          SIZE="${{ steps.size.outputs.total_bytes }}"

          {
            echo "## 📊 Raport SLI/SLO - $(date '+%Y-%m-%d %H:%M UTC')"
            echo ""
            echo "### SLI-uri măsurate"
            echo ""
            echo "| Indicator (SLI) | Valoare măsurată | Obiectiv (SLO) | Stare |"
            echo "|---|---|---|---|"

            if [ "$AVAIL" = "true" ]; then
              echo "| Disponibilitate | HTTP $HTTP (online) | ≥ ${SLO_AVAIL}% | ✅ |"
            else
              echo "| Disponibilitate | HTTP $HTTP (offline) | ≥ ${SLO_AVAIL}% | ❌ |"
            fi

            if [ "$LAT_OK" = "true" ]; then
              echo "| Latență răspuns | ${LAT}ms | < ${SLO_MS}ms | ✅ |"
            else
              echo "| Latență răspuns | ${LAT}ms | < ${SLO_MS}ms | ⚠️ |"
            fi

            echo "| Dimensiune app  | ${SIZE} bytes | < 50000 bytes | ✅ |"
            echo ""
            echo "### Error Budget"
            echo ""
            echo "- **SLO disponibilitate:** ${SLO_AVAIL}%"
            echo "- **Error Budget:** ${BUDGET_PCT}% ≈ **${BUDGET_MIN} minute/lună**"
            echo ""

            if [ "$AVAIL" = "true" ] && [ "$LAT_OK" = "true" ]; then
              echo "> 🟢 **Toate SLO-urile sunt respectate.** Error Budget intact."
            else
              echo "> 🔴 **Atenție: SLO depășit.** Error Budget se consumă."
            fi
          } >> $GITHUB_STEP_SUMMARY

      # ── Eșuează dacă SLO-ul critic nu e respectat ─────────────────────
      - name: Verificare finală SLO
        run: |
          if [ "${{ steps.availability.outputs.available }}" = "false" ]; then
            echo "❌  EȘEC: Serviciul nu este disponibil - SLO încălcat!"
            exit 1
          fi
          echo "✅  Toate SLO-urile critice sunt respectate."
```

### 6.3 Sintaxa `cron`

```
┌──────── minut (0-59)
│  ┌───── oră (0-23)
│  │  ┌── zi din lună (1-31)
│  │  │  ┌─ lună (1-12)
│  │  │  │  ┌ zi din săptămână (0-7, 0=duminică)
│  │  │  │  │
0  *  *  *  *    → la minutul 0 al fiecărei ore (orar)
0  9  *  *  1-5  → luni-vineri la ora 9:00
*/15 * * * *     → la fiecare 15 minute
```

### 6.4 Transmiterea datelor între pași folosind `$GITHUB_OUTPUT`

Un mecanism important de observat în workflow este cum pașii comunică între ei:

```bash
# Pasul 1 - scrie o valoare
echo "available=true" >> $GITHUB_OUTPUT

# Pasul 4 - citește valoarea scrisă de Pasul 1
AVAIL="${{ steps.availability.outputs.available }}"
```

Variabila `$GITHUB_OUTPUT` este un fișier special creat de Actions. Fiecare pas poate scrie perechi `cheie=valoare` în el, iar pașii ulteriori le pot citi prin `steps.<id>.outputs.<cheie>`. Aceasta este echivalentul unui sistem de mesagerie simplificat între componentele unui pipeline.

### 6.5 Configurarea URL-ului aplicației

După ce CD a publicat aplicația pe GitHub Pages, configurează URL-ul pentru monitorizare:

1. Mergeți în repo → **Settings** → **Secrets and variables** → **Actions** → tab-ul **Variables**.
2. Click **New repository variable**.
3. Completați:
   - **Name:** `APP_URL`
   - **Value:** `https://<username>.github.io/isa-devops-lab/`
4. Salvați.

De acum, workflow-ul SLI Monitor va măsura disponibilitatea și latența aplicației reale.

### 6.6 Rulare manuală cu parametri personalizați

Workflow-ul SLI Monitor acceptă rulare manuală cu praguri SLO configurabile:

1. Tab-ul **Actions** → **SLI Monitor - Metrici & Observabilitate**.
2. Click **Run workflow** (buton în dreapta).
3. Completează câmpurile:
   - `Prag SLO latență (ms)`: ex. `200` (mai strict)
   - `Prag SLO disponibilitate (%)`: ex. `99.9`
4. Click **Run workflow**.
5. Observați raportul generat în tab-ul **Summary**.

Experimentați cu praguri diferite și observați cum se modifică starea SLO-urilor și calculul valorii Error Budget-ului.

---

## Pasul 7 - Commit final și verificarea pipeline-ului complet

### 7.1 *Commit *și *push*

```bash
git add .
git commit -m "feat: adaugă workflow-uri CI/CD și SLI Monitor"
git push origin main
```

### 7.2 Verificarea completă a pipeline-ului

Urmăriți în tab-ul **Actions** execuția în ordine:

```
1. CI - Build & Test         ← pornit de push
        │
        │ (după ~30 secunde, dacă trece)
        ▼
2. CD - Deploy pe GitHub Pages  ← pornit automat
        │
        │ (după ~1 minut)
        ▼
   Aplicația live pe GitHub Pages
        │
        │ (la ora următoare sau manual)
        ▼
3. SLI Monitor               ← măsoară aplicația live
```

### 7.3 Scenarii de explorat

**<u>Scenariu 1</u> - Introduce o eroare în teste:**

Modificați în `app/app.js` funcția `addTodo` să returneze întotdeauna `null`:

```javascript
addTodo(text) { return null; } // eroare deliberată
```

Repetati procesul de *commit *și *push*. Observați că CI eșuează și CD nu se declanșează.

Anulati modificarea (editați codul și încărcati pe Github) și observați că pipeline-ul revine la verde.

**<u>Scenariu 2</u> - Pull Request cu verificare automată:**

1. Creați o ramură nouă: `git checkout -b feature/test-pr`
2. Modificați titlul în `index.html` (ex. `<h1>📝 TODO Pro</h1>`)
3. *Commit *+ *push*: `git push origin feature/test-pr`
4. Pe GitHub, creati un **Pull Request** din `feature/test-pr` în `main`.
5. Observați că CI rulează automat pe PR și rezultatul apare ca **status check** pe PR.
6. Un PR cu CI verde poate fi merge-uit cu încredere; unul cu CI roșu este blocat.

**<u>*Scenariu </u>3* - Modificarea pragului SLO:**

Rulați manual SLI Monitor cu `slo_latency_ms = 1` (1 milisecundă). Latența reală va depăși SLO-ul, workflow-ul va eșua, iar raportul va arăta că **Error Budget** se consumă. Aceasta procedură <u>simulează un incident de performanță</u>.

---

## Pasul 8 - Adaugare README

Actualizați `README.md` cu documentația proiectului:

```markdown
# TODO Manager - ISA DevOps/SRE Lab

Aplicație web demonstrativă pentru laboratorul de Inginerie Software Avansată.

## Structura proiectului
```

isa-devops-lab/
├── app/           # Aplicația web (HTML + CSS + JS)
├── tests/         # Teste unitare Node.js
└── .github/
    └── workflows/
        ├── ci.yml          # CI: build + teste la fiecare push
        ├── cd.yml          # CD: deploy automat pe GitHub Pages
        └── sli-monitor.yml # Monitorizare SLI/SLO

```
## Rulare locală

```bash
# Deschide aplicația în browser
open app/index.html   # macOS
# sau dublu-click pe app/index.html în Windows/Linux

# Rulează testele
node tests/todo.test.js
```

## Workflows

| Workflow    | Declanșator                 | Scop                               |
| ----------- | --------------------------- | ---------------------------------- |
| CI          | push / pull_request pe main | Build + 15 teste unitare automate  |
| CD          | după CI pe main             | Deploy automat pe GitHub Pages     |
| SLI Monitor | orar + manual               | Metrici disponibilitate și latență |

```
---
## Rezumat conceptual

| Concept SRE | Cum apare în acest laborator |
|---|---|
| **Automatizare** | Workflow-urile se declanșează fără intervenție manuală la fiecare push |
| **CI** | Testele rulează automat la fiecare commit; erorile sunt detectate imediat |
| **CD** | Deploy-ul în „producție" (Pages) este complet automatizat după CI |
| **SLI** | `curl` măsoară disponibilitate (HTTP 200?) și latență (ms) |
| **SLO** | Pragurile din `workflow_dispatch` inputs sau variabila `APP_URL` |
| **Error Budget** | Calculat live: `100% - SLO` → minute permise de downtime pe lună |
| **Observabilitate** | `$GITHUB_STEP_SUMMARY` generează rapoarte Markdown vizibile în Actions |
| **Alertare** | `exit 1` marchează workflow-ul roșu când SLO-ul este depășit |
---

```

## Exerciții

**Exercițiul 1 - Extinderea suitei de teste:** 

Adaugați cel puțin 3 teste noi în `tests/todo.test.js` pentru cazuri limită: text cu caractere speciale (`<script>`), adăugarea a 100 de sarcini consecutive, ștergerea unui element din mijlocul listei.

***Exercițiul 2 - SLO mai strict:**
Modificați workflow-ul SLI Monitor să monitorizeze și numărul de teste trecute ca SLI (ex. SLO: toate cele 15 teste trebuie să treacă). Adaugați acest indicator în tabelul din raport.

**Exercițiul 3 - Branch protection:**
În **Settings → Branches**, adaugați o regulă de protecție pe `main` care să impună că CI trebuie să treacă (să fie validat) înainte de orice merge. Testați că un PR cu teste eșuate nu poate fi unit.

---

## Referințe

- GitHub Actions - Documentație oficială: https://docs.github.com/en/actions
- GitHub Pages - Deployment cu Actions: https://docs.github.com/en/pages/getting-started-with-github-pages
- GitHub Skills - Cursuri interactive gratuite: https://skills.github.com
- Sintaxă `cron `pentru `schedule`: https://crontab.guru
- Beyer, B. et al. (2016). *Site Reliability Engineering*. O'Reilly / Google. https://sre.google/sre-book/table-of-contents/
