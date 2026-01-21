# promohub - Influencer Marketplace

A full-stack Next.js application inspired by Collabstr for connecting content creators with brands.

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **PostgreSQL** database
- **Google OAuth** credentials (for authentication)
- **Resend** API key (for email verification)

### 1. Install Dependencies
```bash
cd promohub-project
npm install
```

### 2. Setup Environment Variables
Create `.env.local` file:
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/promohub"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Resend Email
RESEND_API_KEY="your-resend-api-key"
```

### 3. Setup Database
```bash
# Create database schema
npm run db:push

# Seed database with test data
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```

Visit http://localhost:3000

---

## 📋 Available Commands

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm start            # Start production server
npm run lint         # Run ESLint
```

### Database
```bash
npm run db:push      # Push schema changes to database
npm run db:generate  # Generate Prisma client
npm run db:seed      # Seed database with test data
npm run db:setup     # Push schema + seed (one command)
```

### Testing
```bash
npm test             # Run unit tests (Vitest)
npm run test:e2e     # Run end-to-end tests (Playwright)
npm run test:e2e:ui  # Run E2E tests with UI
```

---

## 🗂️ Project Structure

```
promohub-project/
├── app/                    # Next.js app directory (pages & API routes)
├── components/             # React components
│   ├── ui/                # Reusable UI components
│   └── layout/            # Layout components (Header, Footer)
├── lib/                   # Utility functions & configs
├── prisma/                # Database schema & migrations
├── public/                # Static files
├── tests/                 # Test files
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── .env.local            # Environment variables (create this)
```

---

## 🔐 Authentication

- **Google OAuth**: Sign in with Google
- **Magic Email Link**: Sign in with email verification
- **NextAuth.js**: Handles session management

### Protected Routes
- `/dashboard` - User dashboard (must be logged in)
- `/favorites` - Saved listings (must be logged in)
- `/dashboard/listings` - Seller listings (must be seller)
- `/admin` - Admin panel (must be admin)

---

## 📦 Key Features

### Public Pages
- ✅ Homepage with hero section
- ✅ Explore page with search & filters
- ✅ Listing detail page

### User Features
- ✅ User authentication (Google + Email)
- ✅ Save/favorite listings
- ✅ User profile page

### Seller Features
- ✅ Create, edit, delete listings
- ✅ Seller dashboard
- ✅ Order management
- ✅ Messaging system

### Admin Features
- ✅ Admin dashboard with metrics
- ✅ Content moderation (reviews & reports)
- ✅ Feature flag management
- ✅ Audit logging

---

## 🧪 Testing

### Unit Tests
```bash
npm test
```

### E2E Tests
```bash
npm run test:e2e
```

### Test Coverage
- Authentication flow
- Search & filtering
- Listing CRUD operations
- User favorites
- Admin moderation

---

## 🗄️ Database Models

### Core Models
- **User**: Authentication & profile
- **Seller**: Seller profile & ratings
- **Listing**: Service/product listings
- **Category**: Listing categories
- **Tag**: Listing tags
- **Order**: Transactions between buyers/sellers
- **Message**: Messaging system
- **Review**: Ratings & reviews
- **Favorite**: Saved listings
- **Report**: Content moderation reports

---

## 🔧 Configuration Files

### `tsconfig.json`
TypeScript configuration

### `next.config.js`
Next.js framework configuration

### `tailwind.config.ts`
Tailwind CSS styling configuration

### `.env.local`
Environment variables (create this file)

---

## 🚨 Troubleshooting

### Database Connection Issues
```bash
# Verify DATABASE_URL is correct
echo $DATABASE_URL

# Test connection
npx prisma db pull
```

### Build Errors
```bash
# Clear cache and reinstall
rm -rf node_modules .next
npm install
npm run build
```

### Port Already in Use
```bash
# Run on different port
PORT=3001 npm run dev
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get current session

### Listings
- `GET /api/listings` - Get all listings
- `POST /api/listings` - Create listing (seller only)
- `PATCH /api/listings/[id]` - Update listing
- `DELETE /api/listings/[id]` - Delete listing

### Favorites
- `POST /api/favorites` - Add to favorites
- `DELETE /api/favorites` - Remove from favorites

### Messages
- `GET /api/orders/[id]/messages` - Get order messages
- `POST /api/orders/[id]/messages` - Send message

### Admin
- `PATCH /api/admin/feature-flags/[key]` - Toggle feature flag
- `PATCH /api/admin/reports/[id]` - Mark report resolved

### Utils
- `POST /api/upload` - Upload file
- `GET /api/health` - Health check

---

## 🌐 Deployment

### Vercel (Recommended for Next.js)
```bash
npm install -g vercel
vercel
```

### Docker
```bash
docker build -t promohub .
docker run -p 3000:3000 promohub
```

---

## 📝 Notes

- All API routes require authentication unless marked as public
- File uploads are stored in `/public/uploads`
- Database uses PostgreSQL with Prisma ORM
- Styling uses Tailwind CSS with custom components
- UI components use Radix UI for accessibility

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Support

For issues or questions, please check the documentation or create an issue in the repository.
