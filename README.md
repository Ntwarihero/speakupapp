# SpeakUp — DP World Kigali Safety Reporting System

Enterprise HSE reporting platform for the DP World Kigali Logistics Platform. Visitors, customers, contractors and drivers report without an account. Employees, safety officers, managers and administrators sign in with credentials issued by HSE administration.

QR codes at gates, warehouses, the container yard and other sites open:

`https://safety.dpworldkigali.com`

Locally the same flow starts at `http://localhost:5173`. Append `?loc=gate-1` (or any location slug) to pre-fill the report location.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 18, Vite, Bootstrap 5, React Router, Axios, SweetAlert2, i18next, Leaflet, Recharts, PWA |
| Backend | Node.js, Express, JWT + refresh tokens, Helmet, rate limiter, express-validator |
| Database | MySQL 8 |
| Files | Multer (JPEG/PNG/WEBP/GIF/PDF) |
| Alerts | Nodemailer + WhatsApp Cloud API (optional) |
| Deploy | Vercel (SPA) + Node API + managed MySQL |

## Quick start

### 1. Start MySQL

Docker Desktop is required for the bundled database:

```bash
docker compose up -d mysql
```

If Docker is not installed, create a MySQL 8 database named `speakup` with user `speakup` / `speakup_dev_password` (or change `.env`) and run `npm run seed`.

### 2. Configure environment

```bash
copy .env.example .env
```

### 3. Install, migrate, seed, run

```bash
npm install
npm run install:all
npm run seed
npm run dev
```

- App: http://localhost:5173  
- API: http://localhost:4000/api/health  

### Demo accounts (change after first login)

| Role | Username | Password |
| --- | --- | --- |
| Administrator | `admin` | `Admin@SpeakUp2026` |
| Safety Manager | `smanager` | `Manager@SpeakUp2026` |
| Safety Officer | `sofficer` | `Officer@SpeakUp2026` |
| Employee | `employee` | `Employee@SpeakUp2026` |

Public users skip login: choose Visitor / Customer / Contractor / Driver on the welcome screen.

## QR posting pack

After the site is live, open **`/posters`**, paste the public website address if needed, and click **Print poster**.

Print that one A4 sheet and post it at every location. Scanning the QR code opens the SpeakUp welcome page:

`https://your-app.vercel.app/`

| Site | Slug |
| --- | --- |
| Gate 1 | `gate-1` |
| Gate 2 | `gate-2` |
| Warehouse A | `warehouse-a` |
| Warehouse B | `warehouse-b` |
| Loading Bay | `loading-bay` |
| Parking | `parking` |
| Fuel Station | `fuel-station` |
| Container Yard | `container-yard` |
| Customs Area | `customs` |
| Main Road | `main-road` |
| Office Block | `office-block` |
| Other | `other` |

| Site | Slug |
| --- | --- |
| Gate 1 | `gate-1` |
| Gate 2 | `gate-2` |
| Warehouse A | `warehouse-a` |
| Warehouse B | `warehouse-b` |
| Loading Bay | `loading-bay` |
| Parking | `parking` |
| Fuel Station | `fuel-station` |
| Container Yard | `container-yard` |
| Customs Area | `customs` |
| Main Road | `main-road` |
| Office Block | `office-block` |
| Other | `other` |

## High / Critical alerts

When severity is **High** or **Critical**, SpeakUp emails:

- Safety Manager  
- Operations Manager  
- Security Team  

and, if WhatsApp Cloud API variables are set, sends the same body:

```
SAFETY ALERT

Report No: {report_no}
Location: {location}
Severity: {severity}
Description: {description}
```

Configure `SMTP_*` and `WHATSAPP_*` in `.env`. Without SMTP, alerts are written to `notification_log` as queued.

## Architecture

```
server/src
  domain            (constants, errors)
  application       (use cases / services)
  infrastructure    (MySQL, JWT, Multer, mail, WhatsApp, audit)
  interfaces/http   (controllers, middleware, routes)
client/src
  locales/en|fr|rw|sw
  pages, components, context
```

Report numbers are allocated as `SAF-YYYY-000001` with a locked sequence table.

Workflow: Open → Assigned → Under Investigation → Corrective Action → Awaiting Verification → Closed.

## Deploy to Vercel (first time)

You do **not** need GitHub for the first deploy. Use the Vercel website + one command from this folder.

### Step 1 — Create a Vercel account

1. Open [https://vercel.com/signup](https://vercel.com/signup)
2. Click **Continue with GitHub** (easiest) or **Continue with Email**
3. Finish the sign-up until you see the Vercel dashboard

### Step 2 — Log in on this computer

Open **PowerShell** or **Command Prompt**:

```powershell
cd "C:\Users\Eric.Burasanzwe\OneDrive - DP World\Desktop\safety-app"
npx vercel login
```

- Choose **Continue with GitHub** or **Continue with Email**
- A browser window opens — approve it
- Return to the terminal. You should see that you are logged in

### Step 3 — Publish the app

Still in the same folder:

```powershell
npx vercel --yes --prod
```

The first run asks a few questions. If it asks, answer:

| Question | Answer |
| --- | --- |
| Set up and deploy? | **Y** |
| Which scope? | your Vercel username |
| Link to existing project? | **N** (first time) |
| Project name? | `speakup` |
| Directory? | **./** (press Enter) |

When it finishes, you get a URL like:

`https://speakup-xxxxx.vercel.app`

Open that URL. You should see the purple SpeakUp welcome page.

### Step 4 — Print the QR poster for the live site

1. Open `https://YOUR-VERCEL-URL/posters`
2. Confirm the website field shows the **Vercel** address, not localhost
3. Click **Print poster**
4. Post that one sheet everywhere

Scanning the QR opens the welcome page on any phone.

### Step 5 — Turn on hazard reports (MySQL)

The welcome page works immediately. Submitting a report needs a **cloud MySQL** database. XAMPP on your PC is not reachable from Vercel.

1. Create a free MySQL database (Aiven, Railway, or similar)
2. In Vercel: **Project → Settings → Environment Variables**, add:

| Name | Example |
| --- | --- |
| `DATABASE_URL` | `mysql://USER:PASSWORD@HOST:3306/speakup` |
| `DB_SSL` | `true` |
| `JWT_ACCESS_SECRET` | a long random string |
| `JWT_REFRESH_SECRET` | a different long random string |
| `CORS_ORIGIN` | `https://your-app.vercel.app` |

3. Run the schema on that cloud database (`database/schema.sql` then `npm run seed` pointed at the cloud DB), or import a dump from your local `speakup` database
4. In Vercel click **Deployments → Redeploy**

### Later: your own domain

In Vercel → **Settings → Domains**, add `safety.dpworldkigali.com`, then reprint the poster so the QR uses that address.

## Security

- Passwords hashed with bcrypt (cost 12)  
- Access JWT 15 minutes, refresh 7 days, hashed at rest  
- Idle logout at 30 minutes in the browser  
- Helmet, CORS allow-list, login + report rate limits  
- Input validation on report create  
- Internal users cannot self-register  
- Audit log on login, report create, status, users, locations  

## Languages

English, Français, Kinyarwanda, Kiswahili. Choice is stored in `localStorage` (`speakup_lang`) and can be changed at any time from the header.
