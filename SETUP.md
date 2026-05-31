# CAE Ebenezer — Laundry Scheduling Platform

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

Minimum required in `.env`:
```
APP_SECRET=your-random-secret-here
DATABASE_URL=mysql://user:pass@host:3306/cae_ebenezer
JWT_SECRET=another-random-secret
```

### 3. Run database migrations
```bash
npx drizzle-kit push
```

### 4. Seed initial data
```bash
npx tsx db/seed.ts
```
This creates:
- 3 Master Admin accounts + 2 OSE accounts (all password: `admin123`)
- 3 Washing Machines + 2 Dryers
- 9 sample residents (all PIN: `1234`)
- Default system settings

### 5. Start the app
```bash
npm run dev
```
Visit http://localhost:5173

---

## Admin Login
- Email: `admin1@cae-ebenezer.org`
- Password: `admin123`

## Resident Login
- Room: `32` (or any room from the seed)
- PIN: `1234`

---

## Google Sheets Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project → Enable **Google Sheets API**
3. Create a **Service Account** → Download JSON credentials
4. Add to `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   GOOGLE_SHEETS_ID=your-spreadsheet-id-from-url
   ```
5. Share your Google Sheet with the service account email (Editor access)
6. In Admin Panel → Google tab → click **"Criar Abas"** to set up sheet structure
7. Click **"Sincronizar Tudo"** to push all data

## Google Calendar Setup

1. Enable **Google Calendar API** in the same project
2. Create a Google Calendar → Settings → Share with service account (Make changes)
3. Copy the Calendar ID to `.env`:
   ```
   GOOGLE_CALENDAR_ID=xxx@group.calendar.google.com
   ```
4. Restart server — confirmed bookings auto-create calendar events

---

## Languages Supported
🇧🇷 Português · 🇪🇸 Español · 🇬🇧 English · 🇫🇷 Français · 🇸🇦 العربية · 🇮🇷 فارسی

RTL layout is automatic for Arabic and Farsi.

---

## Machines (matching physical setup)
| Machine | Type | Time Slots |
|---------|------|-----------|
| MÁQUINA 01 | Washing | 08:00–22:00 (2h blocks) |
| MÁQUINA 02 | Washing | 08:00–22:00 (2h blocks) |
| MÁQUINA 03 | Washing | 08:00–22:00 (2h blocks) |
| SECADORA 01 | Dryer | 05:00–11:00, 09:00–11:00, 14:00–16:00, 20:00–22:00 |
| SECADORA 02 | Dryer | same as above |

**Rule enforced:** A resident cannot book more than one machine in the same time slot.
