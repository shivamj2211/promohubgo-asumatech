## 🚀 COLABATR - COMPLETE STEP-BY-STEP SETUP GUIDE

### ✅ Prerequisites Checklist

Before you begin, ensure you have:

- [ ] **Node.js** 18+ installed ([Download](https://nodejs.org/))
- [ ] **PostgreSQL** installed and running ([Download](https://www.postgresql.org/download/))
- [ ] **Git** installed ([Download](https://git-scm.com/))
- [ ] **Google OAuth credentials** ([Create](https://console.cloud.google.com))
- [ ] **Resend API key** ([Sign up](https://resend.com))
- [ ] Code editor (VS Code recommended)

---

### 🎯 STEP-BY-STEP SETUP

#### **STEP 1: Navigate to Project**

```powershell
cd c:\Users\SHIVAM\Desktop\gptpromohub\colabatr-project
```

---

#### **STEP 2: Install Dependencies**

```powershell
npm install
```

**What this does:**
- Downloads and installs all required packages from `package.json`
- Creates `node_modules` folder
- Generates `package-lock.json`

**Expected output:** Shows progress of installation, ends with `added X packages`

---

#### **STEP 3: Create Environment File**

**Create file:** `.env.local`

**Add this content:**

```env
# Database Configuration
DATABASE_URL="postgresql://postgres:password@localhost:5432/colabatr"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth (from Google Cloud Console)
GOOGLE_CLIENT_ID="your-google-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend Email Service
RESEND_API_KEY="re_xxxxxxxxxxxxx"

# Optional
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

**Where to get these values:**

| Variable | How to Get |
|----------|-----------|
| `DATABASE_URL` | Create PostgreSQL database, then format as shown |
| `NEXTAUTH_SECRET` | Run: `openssl rand -base64 32` |
| `GOOGLE_CLIENT_*` | Go to https://console.cloud.google.com → Create OAuth 2.0 credentials |
| `RESEND_API_KEY` | Sign up at https://resend.com → Get API key from dashboard |

---

#### **STEP 4: Setup PostgreSQL Database**

**Option A: Using PostgreSQL directly**

```powershell
# Connect to PostgreSQL (or use pgAdmin GUI)
# Create a new database named 'colabatr'

CREATE DATABASE colabatr;
```

**Option B: Using Docker (Easier)**

```powershell
# Start PostgreSQL container
docker run --name postgres-colabatr -e POSTGRES_PASSWORD=password -e POSTGRES_DB=colabatr -p 5432:5432 -d postgres:15

# Or use docker-compose (see DOCKER_SETUP.md)
docker-compose up -d postgres
```

**Verify connection:**

```powershell
# Test connection
npx prisma db execute --stdin
# If it connects, you're good to go!
```

---

#### **STEP 5: Generate Prisma Client**

```powershell
npm run db:generate
```

**What this does:**
- Reads `prisma/schema.prisma`
- Generates TypeScript types
- Creates Prisma Client instance

**Expected output:** `✔ Generated Prisma Client`

---

#### **STEP 6: Push Database Schema**

```powershell
npm run db:push
```

**What this does:**
- Creates all database tables based on schema
- Sets up relationships between tables
- Creates indexes for performance

**Expected output:**
```
✔ Database synced, schema is in sync with Prisma schema
```

**To verify, open Prisma Studio:**

```powershell
npx prisma studio
# Opens visual database browser at http://localhost:5555
```

---

#### **STEP 7: Seed Database with Test Data**

```powershell
npm run db:seed
```

**What this does:**
- Creates test users, categories, listings, etc.
- Populates database with demo data for testing
- Creates test accounts for login

**Test Accounts Created:**
- **Admin:** `admin@colabatr.com`
- **Seller 1:** `john@colabatr.com`
- **Seller 2:** `sarah@colabatr.com`
- **Seller 3:** `mike@colabatr.com`
- **Buyer:** `lisa@colabatr.com`

**Expected output:**
```
✅ Database seeded successfully!

📝 Test Accounts:
  Admin: admin@colabatr.com
  Seller 1: john@colabatr.com
  ...
```

---

#### **STEP 8: Start Development Server**

```powershell
npm run dev
```

**What this does:**
- Starts Next.js development server
- Enables hot reloading (automatic refresh on file changes)
- Runs on `http://localhost:3000`

**Expected output:**
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
  - Environments: .env.local
  
  ✔ Ready in 1234ms
```

---

#### **STEP 9: Open in Browser**

Navigate to: **http://localhost:3000**

You should see the Colabatr homepage!

---

### 🔑 Google OAuth Setup (Required for Login)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project: "Colabatr"
3. Enable **Google+ API**
4. Create OAuth 2.0 credentials:
   - Type: Web application
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/callback/google`
     - `http://localhost:3000` (for production)
5. Copy:
   - `Client ID` → `GOOGLE_CLIENT_ID` in `.env.local`
   - `Client Secret` → `GOOGLE_CLIENT_SECRET` in `.env.local`
6. Test login at http://localhost:3000/api/auth/signin

---

### 📧 Resend Email Setup (Required for Magic Links)

1. Sign up at [Resend](https://resend.com)
2. Get your API key from dashboard
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
4. Test email verification:
   - Go to http://localhost:3000/api/auth/signin
   - Enter any email address
   - Check for verification email

---

### 🧪 Testing the Setup

#### Test Homepage
- Navigate to http://localhost:3000
- See hero section with "Find and Hire Top Content Creators"
- Click "Browse Creators" → See listings

#### Test Search & Filter
- Go to http://localhost:3000/explore
- Search for "tech"
- Use filters to narrow results

#### Test Listing Detail
- Click on any creator listing
- See full details, reviews, and seller info
- Click "Save" to add to favorites (if logged in)

#### Test Login
- Click "Login / Register" in header
- Choose "Continue with Google" or enter email
- Receive verification email
- Create account and log in

#### Test Seller Dashboard
- Log in as seller: `john@colabatr.com`
- Navigate to "My Listings"
- Create, edit, or delete listings

#### Test Admin Panel
- Log in as admin: `admin@colabatr.com`
- Go to /admin
- View metrics and manage reports

---

### 🐛 Troubleshooting

#### "DATABASE_URL Connection Error"
```powershell
# Verify PostgreSQL is running
# Check DATABASE_URL format is correct
# Test connection:
psql -U postgres -h localhost -d colabatr
```

#### "Port 3000 Already in Use"
```powershell
# Use different port
PORT=3001 npm run dev

# Or kill process using port 3000 (Windows)
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

#### "Dependencies Not Installed"
```powershell
# Clear cache and reinstall
npm cache clean --force
rm -r node_modules
npm install
```

#### "Module Not Found Errors"
```powershell
# Regenerate Prisma Client
npm run db:generate

# Rebuild project
npm run build
```

#### "Can't Connect to Google OAuth"
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local`
- Check authorized redirect URIs in Google Cloud Console
- Ensure `NEXTAUTH_URL` matches your domain

---

### 📁 Project Structure After Setup

```
colabatr-project/
├── .next/                 # Build output (auto-generated)
├── node_modules/          # Dependencies (auto-generated)
├── app/                   # Next.js pages and API routes
├── components/            # React components
├── lib/                   # Utilities and configs
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Test data seed
├── public/
│   └── uploads/           # User-uploaded files
├── tests/                 # Test files
├── .env.local            # Your environment variables (CREATE THIS)
├── .env.example          # Template
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── postcss.config.js
├── docker-compose.yml    # For Docker setup
├── Dockerfile            # For Docker setup
├── README.md
├── COMMANDS.md           # Command reference
└── SETUP.md              # This file
```

---

### ✨ Next Steps

1. **Explore the code:**
   - Check `app/` for pages and APIs
   - Check `components/` for React components
   - Check `lib/` for utilities

2. **Make changes:**
   - Edit files in your code editor
   - Changes auto-reload in browser

3. **Add new features:**
   - Follow the existing patterns
   - Test in browser
   - Run `npm test` to verify

4. **Deploy:**
   - See DEPLOYMENT.md for hosting options
   - Vercel recommended for Next.js

---

### 📞 Need Help?

- Check README.md for overview
- Check COMMANDS.md for all available commands
- View logs in terminal where `npm run dev` is running
- Check browser console (F12) for frontend errors

---

### 🎉 Success Indicators

You'll know setup is complete when:

✅ `npm run dev` shows "Ready in XXXms"
✅ Browser shows Colabatr homepage
✅ Can navigate to /explore
✅ Can log in with Google or email
✅ Can view listings and seller profiles
✅ Database has test data (verified in Prisma Studio)

Congratulations! Your Colabatr development environment is ready! 🚀
