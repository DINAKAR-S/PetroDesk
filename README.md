# PetroDisk

Cloud SaaS for Indian petrol/fuel station management. Replaces paper-based shift tracking with digital reconciliation, stock management, and owner analytics.

## Roles
- **Owner** — full revenue and analytics dashboard
- **Manager** — team performance, shift review
- **Salesman** — shift open/close, meter readings

## Tech Stack
- React 18 + Vite + TypeScript
- Tailwind CSS (Material Design 3 tokens)
- Zustand (state management)
- Supabase (database + auth)

## Getting Started

### 1. Clone
```bash
git clone https://github.com/DINAKAR-S/PetroDesk.git
cd PetroDesk
pnpm install
```

### 2. Set up Supabase
- Create a project at [supabase.com](https://supabase.com)
- Run `SQL_SETUP.sql` in the Supabase SQL Editor (creates tables + seeds demo data)

### 3. Configure environment
```bash
cp apps/web/.env.example apps/web/.env
# Fill in your Supabase URL and publishable key
```

### 4. Run
```bash
cd apps/web
pnpm dev
```

## Demo Login
OTP is always `123456` in demo mode.

| Phone | Role |
|---|---|
| 9999999999 | Owner |
| 8888888888 | Manager |
| 7777777777 | Salesman |

## Deploy to Vercel
1. Import this repo in [Vercel](https://vercel.com)
2. Add environment variables: `VITE_SUPABASE_URL` and `VITE_SUPABASE_KEY`
3. Deploy — `vercel.json` handles the build config automatically
