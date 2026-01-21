# 🎯 COLABATR - MASTER SETUP & COMMANDS GUIDE

**Complete Reference for All Commands & Setup Instructions**

---

## 📋 TABLE OF CONTENTS

1. [Project Overview](#-project-overview)
2. [Quick Start](#-quick-start-5-minutes)
3. [Prerequisites](#-prerequisites)
4. [Complete Step-by-Step Setup](#-complete-step-by-step-setup)
5. [All Available Commands](#-all-available-commands)
6. [Environment Setup](#-environment-setup)
7. [Database Operations](#-database-operations)
8. [Development Workflow](#-development-workflow)
9. [Testing Commands](#-testing-commands)
10. [Troubleshooting](#-troubleshooting)
11. [Deployment](#-deployment)

---

## 🌟 PROJECT OVERVIEW

**Colabatr** is a full-stack **Influencer Marketplace** application built with:

- **Frontend**: React 18 + Next.js 14 + TypeScript
- **Backend**: Next.js API Routes
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js with Google OAuth
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI primitives
- **Testing**: Vitest + Playwright

### Key Features
✅ User authentication (Google + Email magic links)
✅ Influencer/creator profiles and listings
✅ Messaging system
✅ Favorites/bookmarks
✅ Reviews and ratings
✅ Admin dashboard
✅ Content moderation
✅ Responsive design

---

## ⚡ QUICK START (5 MINUTES)

### For the Impatient:

```powershell
# 1. Go to project
cd c:\Users\SHIVAM\Desktop\gptpromohub\colabatr-project

# 2. Install
npm install

# 3. Setup database (assumes PostgreSQL running locally)
npm run db:generate
npm run db:push
npm run db:seed

# 4. Start
npm run dev

# 5. Open browser
# http://localhost:3000
```

**But make sure you have `.env.local` with database credentials first!**

---

## ✅ PREREQUISITES

Before starting, verify you have:

### Required Software
- [ ] **Node.js 18+** - https://nodejs.org/
- [ ] **PostgreSQL 14+** - https://www.postgresql.org/download/
- [ ] **Git** - https://git-scm.com/
- [ ] **Code Editor** - VS Code recommended (https://code.visualstudio.com/)

### Required Credentials
- [ ] **Google OAuth** - https://console.cloud.google.com
- [ ] **Resend Email API** - https://resend.com

### Verify Installation

```powershell
# Check versions
node --version        # Should be v18.0.0 or higher
npm --version         # Should be v9.0.0 or higher
git --version         # Should show version info
```

---

## 📦 COMPLETE STEP-BY-STEP SETUP

### STEP 1: Clone/Navigate to Project

```powershell
cd c:\Users\SHIVAM\Desktop\gptpromohub\colabatr-project
```

### STEP 2: Install All Dependencies

```powershell
npm install
```

**Installs:**
- Next.js 14
- React 18
- Prisma ORM
- NextAuth.js
- Tailwind CSS
- Testing libraries
- And 20+ other packages

**Time:** 2-5 minutes depending on internet speed

### STEP 3: Create Environment File

**File path:** `colabatr-project/.env.local`

**Content:**
```env
# ========== DATABASE ==========
DATABASE_URL="postgresql://user:password@localhost:5432/colabatr"

# ========== NEXTAUTH ==========
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="aDVu4Nb0K7vX8pQmR2jL1wZ3yC6tG9sB5eF8hI2kM4"

# ========== GOOGLE OAUTH ==========
# Get from https://console.cloud.google.com
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-client-secret"

# ========== EMAIL SERVICE ==========
# Get from https://resend.com
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# ========== OPTIONAL ==========
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### STEP 4: Setup PostgreSQL

**Option A: Use PostgreSQL Directly**

```powershell
# Create database
createdb -U postgres colabatr

# Or using pgAdmin GUI (easier)
# 1. Open pgAdmin
# 2. Create new database named "colabatr"
# 3. Note the connection details
```

**Option B: Use Docker (Easiest)**

```powershell
# Install Docker from https://www.docker.com

# Start PostgreSQL container
docker run --name colabatr-postgres `
  -e POSTGRES_PASSWORD=password `
  -e POSTGRES_DB=colabatr `
  -p 5432:5432 `
  -d postgres:15

# For DATABASE_URL use:
# postgresql://postgres:password@localhost:5432/colabatr
```

**Verify Connection:**

```powershell
# Test if connection works
npx prisma db execute --stdin
# If you see a prompt, connection is working!
```

### STEP 5: Setup Prisma

```powershell
# Generate Prisma Client (TypeScript types)
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Seed database (adds test data)
npm run db:seed
```

**What gets created:**
- 15+ database tables
- User relationships
- Test data (5 users, 5 categories, 5 listings, etc.)

### STEP 6: Start Development Server

```powershell
npm run dev
```

**Expected output:**
```
  ▲ Next.js 14.0.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✔ Ready in 1234ms
```

### STEP 7: Open in Browser

Navigate to: **http://localhost:3000** 🎉

---

## 🛠️ ALL AVAILABLE COMMANDS

### Development Commands

```powershell
# Start development server (hot reload enabled)
npm run dev

# Start on specific port
PORT=3001 npm run dev

# Build for production
npm run build

# Start production server
npm start

# Check code quality
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Database Commands

```powershell
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push

# Seed database with test data
npm run db:seed

# Push + Seed in one command
npm run db:setup

# Open database visual editor
npx prisma studio

# Reset database (DELETES ALL DATA)
npx prisma migrate reset

# Create new migration
npx prisma migrate dev --name <name>

# Deploy migrations to production
npx prisma migrate deploy
```

### Testing Commands

```powershell
# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# Run E2E tests with UI
npm run test:e2e:ui

# Run specific test
npm test -- specific.test.ts
```

### Installation Commands

```powershell
# Install all dependencies
npm install

# Install new package
npm install package-name

# Install dev dependency
npm install -D package-name

# Update all packages
npm update

# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

### Docker Commands

```powershell
# Start all services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild images
docker-compose up -d --build

# Reset (delete all data!)
docker-compose down -v
```

---

## 🔐 ENVIRONMENT SETUP DETAILED

### DATABASE_URL Format

```
postgresql://[user]:[password]@[host]:[port]/[database]
```

**Examples:**

```env
# Local PostgreSQL
DATABASE_URL="postgresql://postgres:password@localhost:5432/colabatr"

# Docker PostgreSQL
DATABASE_URL="postgresql://postgres:password@postgres:5432/colabatr"

# Remote PostgreSQL (AWS, Heroku, etc.)
DATABASE_URL="postgresql://user:pass@host.region.rds.amazonaws.com:5432/colabatr"
```

### Generate NEXTAUTH_SECRET

**Option 1: Linux/Mac**
```bash
openssl rand -base64 32
```

**Option 2: Windows PowerShell**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object {[char](Get-Random -Min 33 -Max 127)})))
```

**Option 3: Online Generator**
- Use: https://generate-secret.vercel.app/32

### Google OAuth Setup

1. Go to https://console.cloud.google.com
2. Create new project "Colabatr"
3. Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs:
     ```
     http://localhost:3000/api/auth/callback/google
     http://yourdomain.com/api/auth/callback/google
     ```
5. Copy values to `.env.local`

### Resend Email Setup

1. Go to https://resend.com
2. Sign up for free account
3. Navigate to API tokens
4. Create new API token
5. Copy to `RESEND_API_KEY` in `.env.local`

---

## 💾 DATABASE OPERATIONS

### View Database Visually

```powershell
# Open Prisma Studio (visual database editor)
npx prisma studio

# Opens at http://localhost:5555
# Browse tables, view/edit data, etc.
```

### Run Database Queries

```powershell
# Interactive query tool
npx prisma db execute --stdin

# Or use SQL file
npx prisma db execute --stdin < query.sql

# View schema
npx prisma db pull

# Format schema
npx prisma format
```

### Handle Migrations

```powershell
# After changing schema:
npm run db:push

# Or create migration:
npx prisma migrate dev --name add_new_table

# View migration status
npx prisma migrate status

# Deploy migrations to production
npx prisma migrate deploy

# Rollback migration
npx prisma migrate resolve --rolled-back <migration_name>
```

### Reset Database

```powershell
# ⚠️ WARNING: This deletes ALL data!

# Option 1: Via Prisma
npx prisma migrate reset

# Option 2: Manual reset
# 1. Delete database in PostgreSQL
# 2. Create new empty database
# 3. Run: npm run db:push
# 4. Run: npm run db:seed
```

---

## 🚀 DEVELOPMENT WORKFLOW

### Daily Development Cycle

```powershell
# 1. Start development server
npm run dev

# 2. Edit files in your editor
# Changes auto-apply!

# 3. If you change database schema:
npm run db:push
npm run db:generate

# 4. If you add new dependencies:
npm install new-package

# 5. Before committing:
npm run lint -- --fix
npm test
npm run build
```

### Hot Reload Behavior

- **Pages**: Auto-reload when you save
- **Components**: Auto-reload when you save
- **Styles**: Auto-reload when you save
- **API Routes**: Require server restart
- **Database Schema**: Requires manual: `npm run db:push`

### Debugging Tips

```powershell
# 1. Add console.log statements
console.log('Debug:', variable)

# 2. Check browser console (F12)
# 3. Check terminal where npm run dev is running
# 4. Use Prisma Studio to inspect database
npx prisma studio

# 5. Use VS Code debugger
# Add breakpoints and press F5
```

---

## 🧪 TESTING COMMANDS

### Unit Tests (Vitest)

```powershell
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- utils.test.ts

# Show coverage
npm test -- --coverage
```

### E2E Tests (Playwright)

```powershell
# Run E2E tests
npm run test:e2e

# Run with UI (recommended)
npm run test:e2e:ui

# Run specific test file
npx playwright test tests/e2e.spec.ts

# Run in debug mode
npx playwright test --debug
```

### Code Quality

```powershell
# Check linting
npm run lint

# Fix linting issues
npm run lint -- --fix

# Build check
npm run build

# Check for TypeScript errors
npx tsc --noEmit
```

---

## 🚨 TROUBLESHOOTING

### Problem: Port 3000 Already in Use

```powershell
# Solution 1: Use different port
PORT=3001 npm run dev

# Solution 2: Kill process on port 3000
netstat -ano | findstr :3000
# Find PID from output, then:
taskkill /PID <PID> /F

# Solution 3: Check what's using the port
Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
```

### Problem: Database Connection Error

```powershell
# Check if PostgreSQL is running
# Windows:
Get-Service | findstr postgres

# Verify DATABASE_URL in .env.local
# Test connection:
npx prisma db pull

# Check credentials
psql -U postgres -h localhost -d colabatr
# (Enter password when prompted)
```

### Problem: Dependencies Not Installed

```powershell
# Clear npm cache
npm cache clean --force

# Reinstall everything
rm -r node_modules package-lock.json
npm install

# Verify
npm list
```

### Problem: Module Not Found Errors

```powershell
# Regenerate Prisma
npm run db:generate

# Rebuild
npm run build

# Clear Next.js cache
rm -r .next
npm run dev
```

### Problem: Can't Log In with Google

```powershell
# Verify Google credentials in .env.local
# Check Google Cloud Console:
# - OAuth app is created
# - Redirect URI matches: http://localhost:3000/api/auth/callback/google
# - API is enabled

# Test with magic email link instead
```

### Problem: Tests Failing

```powershell
# Update test files
npm test -- --update-snapshot

# Run tests in watch mode to debug
npm test -- --watch

# Check test output
npm test -- --reporter=verbose
```

### Problem: Build Fails

```powershell
# Check for TypeScript errors
npx tsc --noEmit

# Build with verbose output
npm run build -- --debug

# Check for missing imports
npm run lint
```

---

## 🌐 DEPLOYMENT

### Deploy to Vercel (Recommended for Next.js)

```powershell
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Then redeploy: vercel
```

### Deploy with Docker

```powershell
# Build Docker image
docker build -t colabatr:latest .

# Run container
docker run -p 3000:3000 \
  -e DATABASE_URL="..." \
  -e NEXTAUTH_URL="..." \
  colabatr:latest

# Push to Docker Hub
docker tag colabatr:latest username/colabatr:latest
docker push username/colabatr:latest
```

### Deploy with Docker Compose

```powershell
# Update production values in docker-compose.yml
# Then:
docker-compose -f docker-compose.yml up -d

# View logs
docker-compose logs -f
```

### Environment Variables for Production

```env
DATABASE_URL="postgresql://user:password@your-prod-db:5432/colabatr"
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="use-strong-random-value"
GOOGLE_CLIENT_ID="production-client-id"
GOOGLE_CLIENT_SECRET="production-client-secret"
RESEND_API_KEY="production-api-key"
```

---

## 📚 PROJECT STRUCTURE

```
colabatr-project/
├── app/                      # Next.js app directory
│   ├── api/                 # API routes
│   │   ├── auth/            # Authentication endpoints
│   │   ├── listings/        # Listing CRUD
│   │   ├── favorites/       # Favorites endpoints
│   │   ├── orders/          # Order endpoints
│   │   └── admin/           # Admin endpoints
│   ├── dashboard/           # User dashboard pages
│   ├── explore/             # Explore/browse page
│   ├── listing/             # Listing detail page
│   ├── seller/              # Seller profile page
│   ├── admin/               # Admin pages
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Homepage
├── components/
│   ├── ui/                  # Reusable UI components
│   ├── layout/              # Layout components
│   └── *.tsx                # Feature components
├── lib/
│   ├── auth.ts              # NextAuth config
│   ├── prismadb.ts          # Prisma Client
│   ├── email.ts             # Email utilities
│   └── utils.ts             # Helper functions
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Database seed
├── public/
│   └── uploads/             # User uploaded files
├── tests/
│   ├── utils.test.ts        # Unit tests
│   └── e2e.spec.ts          # E2E tests
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
└── .env.local              # Your environment variables
```

---

## 🔑 TEST ACCOUNTS

After running `npm run db:seed`:

| Email | Password | Role |
|-------|----------|------|
| admin@colabatr.com | (magic link) | Admin |
| john@colabatr.com | (magic link) | Seller |
| sarah@colabatr.com | (magic link) | Seller |
| mike@colabatr.com | (magic link) | Seller |
| lisa@colabatr.com | (magic link) | Buyer |

All accounts use magic email links (check terminal).

---

## 📞 SUPPORT & RESOURCES

### Documentation Files
- **README.md** - Project overview
- **SETUP.md** - Step-by-step setup
- **COMMANDS.md** - All commands explained
- **QUICK_REFERENCE.md** - Quick lookup

### External Resources
- **Next.js**: https://nextjs.org/docs
- **Prisma**: https://www.prisma.io/docs
- **NextAuth.js**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs

### Common Issues & Fixes

| Issue | Solution |
|-------|----------|
| Port 3000 in use | `PORT=3001 npm run dev` |
| DB connection error | Verify DATABASE_URL and PostgreSQL is running |
| Module not found | `npm run db:generate` |
| Tests fail | `npm test -- --update-snapshot` |
| Login doesn't work | Check Google OAuth credentials |

---

## 🎉 YOU'RE ALL SET!

You now have a fully functional Colabatr development environment!

**Next steps:**
1. ✅ Run: `npm run dev`
2. ✅ Open: http://localhost:3000
3. ✅ Explore the code
4. ✅ Make changes
5. ✅ Test features
6. ✅ Deploy when ready

**Happy coding! 🚀**

---

*Last Updated: November 2025*
*Colabatr - Influencer Marketplace Platform*
