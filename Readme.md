# TabCheck

Split expenses with friends - no backend required. Data lives in **Google Sheets**, the app deploys to **GitHub Pages**.

## Features

- Add friends (crew) with optional phone + password
- Log shared expenses and optional line-item breakdowns
- Equal splits with participant selection
- Track who already paid (partial payments)
- Smart dues: who you owe / who owes you
- Demo mode when Sheets isn’t configured yet

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- Framer Motion
- Google Apps Script ↔ Sheets

## Design

- **Fonts:** Syne (display / brand) + DM Sans (UI)
- **Palette:** espresso ink, champagne gold, soft mint, warm pearl

## Quick start

```bash
cd Tabcheck
npm install
npm run dev
```

Open the local URL. Demo data loads automatically until you wire Sheets.

## Connect Google Sheets

1. Create a Google Sheet with these tabs:

| Tab | Headers |
|-----|---------|
| **Friends** | `Name` \| `Phone` \| `Password` |
| **Expenses** | `Name` \| `Amount` \| `Paid By` \| `Date` \| `Participants` |
| **Splits** | `Expense` \| `Person` \| `Amount` |
| **SubExpenses** | `Parent Expense` \| `Name` \| `Amount` \| `Participants` |

   (`Travellers` still works as a fallback name for Friends.)

2. **Extensions → Apps Script** - paste `google-apps-script/Code.gs`
3. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Copy the web app URL into `.env`:

```bash
cp .env.example .env
# VITE_GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/.../exec
```

5. Restart `npm run dev`

### Optional: admin delete control

```bash
VITE_ADMIN_USERS=Alex,Maya
```

Empty = everyone can delete. Users with a password in the sheet must unlock on login.

## Custom domain (kirae.tech)

**No GitHub Pro needed** for custom domains on a **public** repo.

### App config (already in repo)

- `public/CNAME` → `kirae.tech` (copied into `dist` on build)
- CI builds with `VITE_BASE_PATH=/` so assets load at the domain root

### GitHub Pages settings

1. **Settings → Pages → Build and deployment → Source: GitHub Actions**  
   (not “Deploy from a branch” - that skips our workflow)
2. **Custom domain:** enter `kirae.tech` → **Save**
3. After DNS verifies, turn on **Enforce HTTPS**

### DNS at your domain registrar

For apex domain `kirae.tech`, add these **A** records:

| Type | Name | Value |
|------|------|--------|
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

Optional `www`:

| Type | Name | Value |
|------|------|--------|
| CNAME | `www` | `md5-juven.github.io` |

DNS can take a few minutes to 48 hours. GitHub will show a checkmark when it’s verified.

## Deploy to GitHub Pages

This repo includes `.github/workflows/deploy.yml`. On every push to `main`, it builds and publishes to Pages.

### 1. Create the GitHub repo & push

```bash
cd Tabcheck
git init
git add .
git commit -m "Initial TabCheck app"
gh repo create tabcheck --public --source=. --remote=origin --push
```

### 2. Add repository secrets

**Settings → Secrets and variables → Actions → New repository secret**

| Secret | Example | Required |
|--------|---------|----------|
| `VITE_GOOGLE_SCRIPT_URL` | `https://script.google.com/macros/s/.../exec` | Yes |
| `VITE_ADMIN_USERS` | `Sujay` (comma-separated) | Optional |

`VITE_BASE_PATH` is set automatically to `/<repo-name>/` in CI.

### 3. Enable Pages

**Settings → Pages → Build and deployment → Source: GitHub Actions**

After the workflow finishes, the app is at:

`https://<your-username>.github.io/<repo-name>/`

### Local vs CI

- Local: keep secrets in `.env` (gitignored)
- CI: secrets come from GitHub only - `.env` is never pushed

> Note: `VITE_*` values are embedded in the public JS bundle at build time. Secrets keep them out of git history; they are still visible in the built site (expected for a no-backend Sheets app).

## Project layout

```
Tabcheck/
  google-apps-script/Code.gs
  src/
    components/   # UI screens
    hooks/        # data hooks
    services/     # Sheets API
    utils/        # balances & dues math
  .env.example
```

## Demo login

Any demo user works with password `tab123`:

| Username | Password |
|----------|----------|
| Alex | `tab123` |
| Maya | `tab123` |
| Rohan | `tab123` |
| Priya | `tab123` |
| Kabir | `tab123` |
