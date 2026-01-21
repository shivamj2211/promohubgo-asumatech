## 🎯 COLABATR - QUICK COMMAND REFERENCE CARD

Print this page for quick reference!

---

### 🚀 FIRST TIME SETUP

```powershell
# 1. Install dependencies
npm install

# 2. Create .env.local with your credentials

# 3. Generate Prisma Client
npm run db:generate

# 4. Push database schema
npm run db:push

# 5. Seed database
npm run db:seed

# 6. Start development server
npm run dev

# 7. Open browser
# http://localhost:3000
```

---

### ⚡ DAILY DEVELOPMENT

```powershell
# Start development (most used command)
npm run dev

# Start with different port
PORT=3001 npm run dev

# Open database manager
npx prisma studio

# View database in VS Code
# Install "SQLTools" extension
```

---

### 💾 DATABASE

```powershell
# Update database after schema changes
npm run db:push

# Regenerate Prisma types
npm run db:generate

# Full database setup (push + seed)
npm run db:setup

# View database visually
npx prisma studio

# Reset database (DELETES ALL DATA!)
npx prisma migrate reset

# Seed database again
npm run db:seed
```

---

### 🏗️ BUILD & DEPLOYMENT

```powershell
# Build for production
npm run build

# Start production server
npm start

# Check for errors
npm run lint
npm run lint -- --fix
```

---

### 🧪 TESTING

```powershell
# Run unit tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run E2E tests
npm run test:e2e

# View E2E tests interactively
npm run test:e2e:ui
```

---

### 🔧 INSTALLATION

```powershell
# Install all dependencies
npm install

# Install specific package
npm install package-name

# Install dev dependency
npm install -D package-name

# Update packages
npm update

# Check vulnerabilities
npm audit
npm audit fix
```

---

### 🐳 DOCKER (Alternative Setup)

```powershell
# Start everything with Docker
docker-compose up -d

# Stop containers
docker-compose down

# View logs
docker-compose logs -f

# Rebuild image
docker-compose up -d --build

# Reset (delete all data)
docker-compose down -v
```

---

### 📝 COMMON SCENARIOS

#### "I need to change database schema"
```powershell
# 1. Edit prisma/schema.prisma
# 2. Run:
npm run db:push
npm run db:generate
npm run dev
```

#### "I added a new npm package"
```powershell
npm install
npm run build
npm run dev
```

#### "I want to reset everything"
```powershell
# Delete local database
npx prisma migrate reset

# Or reset everything
npm run db:seed
```

#### "I need to debug something"
```powershell
# Add console.log in your code
# Check browser console (F12)
# Check terminal where npm run dev is running

# Or open Prisma Studio
npx prisma studio
```

#### "Port 3000 is in use"
```powershell
# Use different port
PORT=3001 npm run dev

# Or kill process using port 3000
taskkill /PID <PID> /F
```

---

### 🚨 EMERGENCY FIXES

```powershell
# Clear cache
npm cache clean --force

# Reinstall everything
rm -r node_modules
npm install

# Regenerate Prisma
npm run db:generate

# Rebuild project
npm run build

# Check disk space
dir C:\
```

---

### 🔍 CHECK STATUS

```powershell
# View installed packages
npm list

# Check Node version
node --version

# Check npm version
npm --version

# Check Next.js version
npx next --version

# Check Prisma version
npx prisma --version

# Check if port 3000 is in use
netstat -ano | findstr :3000
```

---

### 📍 IMPORTANT PATHS

```
Homepage:           http://localhost:3000
Explore:            http://localhost:3000/explore
Database Manager:   http://localhost:5555
API Docs:           Check app/api/ folders
```

---

### 🔑 TEST ACCOUNTS

```
Email: admin@colabatr.com        (Admin)
Email: john@colabatr.com         (Seller)
Email: sarah@colabatr.com        (Seller)
Email: mike@colabatr.com         (Seller)
Email: lisa@colabatr.com         (Buyer)

All use magic links (check terminal for link)
```

---

### 💡 PRODUCTIVITY TIPS

1. **Use VS Code**: Install "REST Client" to test APIs
2. **Prisma Studio**: Run `npx prisma studio` to browse database
3. **Dev Tools**: Press F12 in browser to debug
4. **Hot Reload**: Changes auto-apply when you save
5. **Port Forwarding**: Use `PORT=3001 npm run dev` to try multiple ports

---

### 🆘 WHEN NOTHING WORKS

```powershell
# 1. Check if Node is installed
node --version

# 2. Check if PostgreSQL is running
# (Open PostgreSQL app or check if docker postgres is up)

# 3. Install dependencies
npm install

# 4. Delete and reinstall
rm -r node_modules
npm install

# 5. Restart dev server
npm run dev

# 6. Check .env.local file exists and has all values

# 7. Check database connection:
npx prisma db pull
```

---

### 📚 MORE INFO

- **Full Commands**: See COMMANDS.md
- **Setup Steps**: See SETUP.md
- **Project Info**: See README.md
- **Next.js Docs**: https://nextjs.org/docs
- **Prisma Docs**: https://www.prisma.io/docs

---

### 🎯 REMEMBER

✅ Run `npm run dev` to start
✅ Changes save automatically
✅ Check terminal for errors
✅ Check browser console (F12) for errors
✅ Use `npx prisma studio` to view database
✅ Test accounts are in SETUP.md

Happy coding! 🚀
