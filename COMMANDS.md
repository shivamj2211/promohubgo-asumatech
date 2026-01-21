## 📋 COLABATR PROJECT - COMMAND REFERENCE

### 🎯 QUICK START (All Commands)

```powershell
# Windows PowerShell - Run these commands in order:

# 1. Navigate to project
cd colabatr-project

# 2. Install all dependencies
npm install

# 3. Create .env.local file and add credentials (see below)
# Edit .env.local with your database and OAuth settings

# 4. Generate Prisma Client
npm run db:generate

# 5. Push database schema
npm run db:push

# 6. Seed database with test data
npm run db:seed

# 7. Start development server
npm run dev

# 8. Open in browser
# Visit http://localhost:3000
```

---

### 📦 INSTALLATION COMMANDS

```bash
# Install all dependencies from package.json
npm install

# Install a specific package
npm install <package-name>

# Install dev dependencies only
npm install --save-dev <package-name>

# Update all packages
npm update

# Check for security vulnerabilities
npm audit
npm audit fix  # Auto-fix if possible
```

---

### 🗄️ DATABASE COMMANDS

```bash
# Initialize/update database schema
npm run db:push

# Generate Prisma Client (required after schema changes)
npm run db:generate

# Seed database with test data
npm run db:seed

# Do both push and seed in one command
npm run db:setup

# Open Prisma Studio (GUI for database)
npx prisma studio

# Reset entire database (warning: deletes all data!)
npx prisma migrate reset

# Create new migration after schema changes
npx prisma migrate dev --name <migration_name>
```

---

### 🚀 DEVELOPMENT SERVER

```bash
# Start development server (hot reload enabled)
npm run dev

# Start on specific port
PORT=3001 npm run dev

# Build for production
npm run build

# Run production server
npm start
```

---

### 🧪 TESTING COMMANDS

```bash
# Run all unit tests (Vitest)
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm test -- --watch

# Run E2E tests (Playwright)
npm run test:e2e

# Run E2E tests with interactive UI
npm run test:e2e:ui

# Run specific test file
npm test -- specific-test.spec.ts
```

---

### 📝 CODE QUALITY

```bash
# Run ESLint to check code style
npm run lint

# Fix auto-fixable linting issues
npm run lint -- --fix

# Build project and check for errors
npm run build
```

---

### 🔑 ENVIRONMENT SETUP

#### Create `.env.local` file with:

```
# Database Connection
DATABASE_URL="postgresql://user:password@localhost:5432/colabatr"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate-with-command-below>"

# Google OAuth (from https://console.cloud.google.com)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Email Service (from https://resend.com)
RESEND_API_KEY="your-resend-api-key"

# Optional
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

#### Generate NEXTAUTH_SECRET:
```bash
# On Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object {[char](Get-Random -Min 33 -Max 127)}))) -join ""

# On Linux/Mac
openssl rand -base64 32
```

---

### 🔧 PRISMA COMMANDS (Advanced)

```bash
# Format Prisma schema
npx prisma format

# Validate schema
npx prisma validate

# Pull schema from existing database
npx prisma db pull

# Seed database (custom seed file)
node prisma/seed.ts
npx ts-node prisma/seed.ts

# Generate SQL migration preview
npx prisma migrate dev --name <name> --create-only

# Deploy migrations to production
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Resolve migration conflicts
npx prisma migrate resolve --rolled-back <migration-name>
```

---

### 🐳 DOCKER COMMANDS (Optional)

```bash
# Build Docker image
docker build -t colabatr:latest .

# Run Docker container
docker run -p 3000:3000 -e DATABASE_URL="..." colabatr:latest

# View logs
docker logs <container-id>

# Stop container
docker stop <container-id>

# Remove container
docker rm <container-id>
```

---

### 🌐 PROJECT STRUCTURE QUICK REFERENCE

```
colabatr-project/
├── app/                    # Next.js pages and API routes
│   ├── api/               # API endpoints
│   ├── page.tsx           # Homepage
│   ├── explore/           # Explore page
│   ├── listing/           # Listing detail pages
│   └── dashboard/         # User dashboard
├── components/
│   ├── ui/                # Reusable UI components
│   ├── layout/            # Layout components
│   └── *.tsx              # Feature components
├── lib/
│   ├── auth.ts            # Authentication config
│   ├── prismadb.ts        # Prisma Client instance
│   ├── email.ts           # Email utilities
│   └── utils.ts           # Utility functions
├── prisma/
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seed script
├── public/                # Static files
├── tests/                 # Test files
├── package.json           # Dependencies
├── tsconfig.json          # TypeScript config
├── next.config.js         # Next.js config
├── tailwind.config.ts     # Tailwind CSS config
├── postcss.config.js      # PostCSS config
├── .env.example           # Example environment variables
└── README.md              # This file
```

---

### 🚨 TROUBLESHOOTING COMMANDS

```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall node_modules
rm -r node_modules package-lock.json
npm install

# Check for port conflicts (Windows)
netstat -ano | findstr :3000

# Kill process on port 3000 (Windows)
taskkill /PID <PID> /F

# View Next.js version
npx next --version

# Check Prisma version
npx prisma --version

# Verify database connection
npx prisma db execute --stdin < query.sql
```

---

### 📚 USEFUL LINKS

- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **NextAuth.js**: https://next-auth.js.org
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React Docs**: https://react.dev
- **TypeScript Docs**: https://www.typescriptlang.org/docs

---

### 💡 DEVELOPMENT TIPS

1. **Hot Reload**: Changes to files automatically reload in development
2. **API Testing**: Use Postman or Insomnia to test API endpoints
3. **Database GUI**: Use `npx prisma studio` to browse/edit database visually
4. **Debug Mode**: Add `console.log()` statements and check browser console
5. **Network Tab**: Use Dev Tools Network tab to inspect API calls

---

### 🎯 COMMON WORKFLOWS

#### Start Fresh Development Session
```bash
npm run dev
# Open http://localhost:3000
```

#### Add New Database Table
```bash
# 1. Edit prisma/schema.prisma
# 2. Run:
npm run db:push
npm run db:generate
npm run dev
```

#### Test Changes Before Commit
```bash
npm run lint
npm test
npm run build
```

#### Reset Database (Warning: Deletes all data!)
```bash
npx prisma migrate reset
npm run db:seed
```

#### Deploy to Production
```bash
npm run build
npm start
# Or use Vercel CLI: vercel deploy
```

---

### 📞 SUPPORT

For issues, check:
1. The README.md file
2. `.env.local` configuration
3. Database connection status
4. Browser console for errors
5. Terminal output for server logs
