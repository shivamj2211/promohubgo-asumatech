#!/bin/bash
# Colabatr Project Setup Script
# This script automates the project setup

set -e  # Exit on error

echo "🚀 Starting Colabatr Project Setup..."
echo ""

# Step 1: Navigate to project directory
echo "📁 Setting up directories..."
cd "$(dirname "$0")"

# Step 2: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 3: Generate Prisma Client
echo "🔧 Generating Prisma Client..."
npm run db:generate

# Step 4: Setup database
echo "🗄️  Setting up database..."
npm run db:push

# Step 5: Seed database
echo "🌱 Seeding database with test data..."
npm run db:seed

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Next steps:"
echo "1. Create .env.local file with your environment variables"
echo "2. Update database credentials in .env.local"
echo "3. Add Google OAuth credentials"
echo "4. Run: npm run dev"
echo ""
echo "🌐 Visit: http://localhost:3000"
