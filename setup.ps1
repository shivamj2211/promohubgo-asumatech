# Colabatr Project Setup Script for Windows PowerShell
# Run: .\setup.ps1

Write-Host "🚀 Starting Colabatr Project Setup..." -ForegroundColor Green
Write-Host ""

# Step 1: Navigate to project directory
Write-Host "📁 Setting up directories..." -ForegroundColor Blue

# Step 2: Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

# Step 3: Generate Prisma Client
Write-Host "🔧 Generating Prisma Client..." -ForegroundColor Blue
npm run db:generate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to generate Prisma Client" -ForegroundColor Red
    exit 1
}

# Step 4: Setup database
Write-Host "🗄️  Setting up database..." -ForegroundColor Blue
npm run db:push

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to setup database" -ForegroundColor Red
    Write-Host "💡 Make sure PostgreSQL is running and DATABASE_URL is correct in .env.local"
    exit 1
}

# Step 5: Seed database
Write-Host "🌱 Seeding database with test data..." -ForegroundColor Blue
npm run db:seed

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Database seeding encountered an issue (this may be ok if DB already exists)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Cyan
Write-Host "1. Create .env.local file with your environment variables"
Write-Host "2. Update database credentials in .env.local"
Write-Host "3. Add Google OAuth credentials"
Write-Host "4. Run: npm run dev"
Write-Host ""
Write-Host "🌐 Visit: http://localhost:3000" -ForegroundColor Magenta
