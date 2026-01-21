# Codex Agent Task: Dynamic Values + Listing/Profiles (Influencer/Brand) + Admin Controls

You are working on PromoHubGo codebase (Next.js frontend + Node/Express backend + Postgres + Prisma in backend middleware).
Goal: Remove hardcoded dropdown/filter values from frontend. Make everything dynamic via DB tables for Influencer and Brand.
Also build a listing page like the provided reference screenshots:
- Default toggle: Influencer
- Cards show NO price
- Price/packages show ONLY inside View Profile (detail page)
- Cards have a badge tag: "Influencer" / "Brand"
- Categories/filters must come from DB, editable by Admin only.

## 0) Non-negotiables
- Do NOT reset DB / do NOT drop data.
- Do NOT change table/column names in DB randomly.
- Any admin-only route must verify req.user.isAdmin true.
- If user.isLocked true => deny actions (403).
- Keep dark mode friendly UI.
- Backend must return consistent JSON: { ok: true, data: ... } or { ok:false, error:"..." }.

## 1) Database design for dynamic dropdowns / filters

### Create/ensure two tables:
1) influencer_values
2) brand_values

Each record represents one selectable option for a UI field.

Schema (SQL):
- id (uuid or serial)
- key TEXT NOT NULL                -- e.g. "languages", "profile_hints", "social_platforms", "categories", "followers_ranges"
- value TEXT NOT NULL              -- option label
- meta JSONB NULL                  -- optional extra info: placeholders, regex, icons, min/max, etc
- is_active BOOLEAN DEFAULT true
- sort_order INT DEFAULT 0
- created_at timestamptz default now()
- updated_at timestamptz default now()

Constraints:
- UNIQUE(key, value)
Indexes:
- (key, is_active, sort_order)

### Seed file requirement
Create a SQL seed file `seed_dynamic_values.sql` with ALL the currently hardcoded options.
Include:
- Influencer: languages, profile description hints, categories shown as chips, social platforms list, follower ranges, engagement ranges (if present)
- Brand: business types, approx budget ranges, brand categories, platforms, "hereToDo" options etc
Also include a few demo categories so listing filter works.

Make seed idempotent:
- Use INSERT ... ON CONFLICT (key,value) DO UPDATE SET is_active=EXCLUDED.is_active, sort_order=EXCLUDED.sort_order, meta=EXCLUDED.meta;

## 2) Backend APIs for dynamic values

### Public read endpoints:
GET /api/values?role=INFLUENCER&key=languages
GET /api/values?role=BRAND&key=business_types
Return active options sorted by sort_order then value.

Response:
{ ok:true, data:[ { value, meta, sortOrder } ] }

### Admin CRUD endpoints:
Under /api/admin/values
- GET /api/admin/values?role=INFLUENCER&key=languages (list all including inactive)
- POST /api/admin/values (create)
- PATCH /api/admin/values/:id (edit fields)
- DELETE /api/admin/values/:id (soft delete => set is_active=false, never hard delete unless asked)

Protect with middleware:
requireAuth + requireAdmin

Audit log (if AuditLog table exists):
Log admin actions: create/update/delete value.

## 3) Fix pincode search robustness (do NOT change DB column types)
Some environments have pincode_offices.pincode as TEXT.
Ensure query never fails with "operator does not exist: text = integer".

Wherever pincode search exists:
Use explicit cast:
WHERE pincode = $1::text
and always pass String(pincode).

Return offices array.

## 4) Listing data model usage
We have users + influencerProfile/brandProfile + categories + location + socials.
We need a unified "Listing feed" query for both Influencer and Brand.

### Backend endpoint:
GET /api/listings?type=influencer|brand
Query params:
- q (search by name/title/username)
- category (slug or key)
- city / state / pincode (optional later)
- sort (newest, followers_desc, rating_desc etc - implement basic)
- page, limit (pagination)

Return card fields (NO price):
Common:
- id (userId)
- type: "INFLUENCER" or "BRAND"
- displayName (user.name or username)
- title (influencerProfile.title OR brandProfile.businessType/name)
- avatarUrl (media/profile image if exists else initials)
- categories (array)
- locationLabel (district,state or city_label)
- stats summary:
    Influencer: followers range (if stored), engagement (optional), platforms count
    Brand: business type, budget range (optional)

Response:
{ ok:true, data:{ items:[...], page, limit, total } }

## 5) View Profile (detail page) behaviour (based on screenshots)
Route examples:
- /listings/influencer/:userId
- /listings/brand/:userId

Detail page includes:
- Header: name, rating (optional), location
- Bio/description
- Media gallery (if exists)
- Social handles list (from influencerSocials / brandPlatforms)
- Packages/pricing section:
    IMPORTANT: price is shown ONLY on detail page, not card.
If packages table doesn’t exist yet:
- Create simple table `packages` (or `listing_packages`) linked to userId + type
Fields: id, userId, type, title, description, price, currency, is_active, sort_order
Seed 2-3 sample packages for demo.
Add API:
GET /api/profile/:userId?type=influencer|brand
GET /api/profile/:userId/packages

The "Contact" button:
- If logged-in brand contacts influencer, create a Message thread/order placeholder (basic).
- For now can open a modal with contact options (social links + in-app message).

## 6) Frontend changes (remove hardcodes)
Replace hardcoded arrays:
- languages select
- profile description hints
- social platforms list
- categories chips on /listings
- any other dropdown options in onboarding/profile

Fetch from /api/values.
Cache results (simple SWR or react query) but must update when admin changes.

### Listing page UI:
- Toggle (Influencer/Brand) default Influencer
- Search bar
- Category chips (DB-driven)
- Cards show:
  - Avatar/initial
  - Name
  - "by @username"
  - Small stats summary (NO price)
  - Buttons: Contact + View Profile
  - Badge tag: Influencer / Brand

### Detail page UI:
Match provided screenshots style:
- Packages list + selected package side panel with price
- Price shown here only

## 7) Admin panel (must exist)
Route: /admin
Admin features:
- Manage dynamic values (influencer_values / brand_values)
  - list by role + key
  - add/edit/disable
- Manage users:
  - list users
  - set isAdmin true/false
  - set isLocked true/false
  - delete user (soft delete preferred; if not available, block via isLocked and mark)

Access control:
- Only admin can access /admin and admin APIs.
- Non-admin => redirect or show 403.

## 8) Prisma alignment (NO destructive push)
If Prisma schema is missing or drift exists:
- Do NOT run migrate reset.
- Prefer introspection: prisma db pull
- Then generate client: prisma generate
- Ensure User model has isAdmin + isLocked boolean fields mapped to users table.

If migrations are needed without data loss:
- Create a non-destructive migration (ALTER TABLE ADD COLUMN only).
- Never drop tables like influencer_values/brand_values/user_identities.
- If prisma db push warns about dropping tables, STOP and instead align schema mappings.

## 9) Commands / smoke tests to provide in final output
After implementation, provide exact commands:
- apply seed file
- generate prisma
- run backend
- run frontend
- smoke test checklist:
  - onboarding selects load from DB
  - listing page shows influencer cards
  - toggle shows brand cards
  - card has badge and no price
  - view profile shows packages + price
  - admin can add a new language and it appears in dropdown without code change
  - locked user blocked

Deliverables:
- List of changed/added files with paths.
- SQL seed file content.
- API route docs short.
- Screenshots not required, but ensure components compile.
# Goal
Make ALL hardcoded dropdowns/hints/social channels/filter chips dynamic from DB, and build an Admin panel to manage them. Ensure only Admin can change values and can lock/edit/delete users. Ensure listings/cards & profile pages render from DB + are responsive, mobile-friendly, and work in light/dark mode.

# Context (current DB tables already exist)
Use existing tables (DO NOT rename):
- public.influencer_values (id, key, value, label, meta jsonb, sort_order, is_active, created_at, updated_at)
- public.brand_values (same columns)
- public.users includes: isAdmin boolean, isLocked boolean, role enum (INFLUENCER/BRAND)
- Use existing Message table for contact/messages flow.

Do NOT drop these tables. Preserve existing rows.

# Required behavior
## 1) Dynamic values API
Create backend endpoints to fetch values by key:

Public:
- GET /api/values/influencer?key=languages
- GET /api/values/influencer?key=gender_options
- GET /api/values/influencer?key=social_channels
- GET /api/values/influencer?key=follower_ranges
- GET /api/values/influencer?key=profile_hints
- GET /api/values/influencer?key=profile_description_placeholder
- GET /api/values/influencer?key=listing_filters

- GET /api/values/brand?key=here_to_do
- GET /api/values/brand?key=approx_budgets
- GET /api/values/brand?key=business_types
- GET /api/values/brand?key=categories
- GET /api/values/brand?key=target_platforms
- GET /api/values/brand?key=campaign_types

Rules:
- Only return rows where is_active=true
- Order by sort_order asc, then id asc
- Response should include: { value, label, meta }

## 2) Replace frontend hardcoding everywhere
Replace all hardcoded arrays for:
- languages select
- description hints text
- social channels (add/remove/edit later)
- category chips on listing page
- any dropdowns/options in onboarding

Frontend should fetch from above API and render options dynamically. Add small caching (in-memory or SWR) and show skeleton/loading state.

## 3) Admin Panel (must exist)
Add /admin UI (frontend) + backend admin APIs.
Only allow access if logged-in user isAdmin=true AND isLocked=false.

Admin features:
A) Manage dynamic values
- list values by (table, key)
- add new value (key,value,label,meta,sort_order,is_active)
- edit value
- soft-disable (set is_active=false)
- delete (optional: allow delete but prefer soft-disable)

Backend endpoints (Admin only):
- GET /api/admin/values/:scope(influencer|brand)?key=...
- POST /api/admin/values/:scope
- PATCH /api/admin/values/:scope/:id
- DELETE /api/admin/values/:scope/:id (or disable)

B) Manage users (Admin only)
- list users with role, email/phone, onboardingCompleted, isLocked, isAdmin
- search by email/username/phone
- lock/unlock user (toggle isLocked)
- delete user (hard delete ok if cascades safe OR soft delete if exists; use current DB constraints)
- set/unset admin (isAdmin toggle) with safety: prevent removing admin from last admin account (optional)

Backend endpoints:
- GET /api/admin/users?query=
- PATCH /api/admin/users/:id/lock {isLocked:true|false}
- PATCH /api/admin/users/:id/admin {isAdmin:true|false}
- DELETE /api/admin/users/:id

Add audit logging in AuditLog for admin actions.

## 4) Listings / cards requirement (IMPORTANT)
- Default listing is INFLUENCER (show influencers)
- On listing cards: DO NOT show price. Price should only show on View Profile page (inside profile detail).
- Cards should show: avatar/initial, title/name, username, follower range, engagement if available, and "Contact" + "View Profile" buttons.
- Use Message table for contact flow (create message thread/order later if needed, but for now implement "Contact" as a message send modal/page using Message table with senderId and orderId or a placeholder order if required by schema).

Filtering/sorting:
- Category chips must come from DB values (influencer_values key=categories OR brand_values categories where applicable).
- Support search by name/title.
- Support sort (e.g. newest, followers range order, etc.) if data exists; otherwise implement basic sort by createdAt.

## 5) Seed file for all dynamic values
Create /prisma/seed_dynamic_values.sql (or keep existing) that inserts all default values into influencer_values and brand_values using:
- INSERT ... ON CONFLICT (key,value) DO NOTHING
So running it multiple times is safe.

## 6) Security / Auth
- Any /api/admin/* route must check auth cookie/session AND require isAdmin=true and isLocked=false.
- If user isLocked=true, block protected routes and return 403.

## 7) Smoke tests
Provide a short manual checklist:
- run seed sql
- verify onboarding dropdowns render from DB
- verify listing filters render from DB
- verify admin can add/disable a language and it disappears from onboarding
- verify admin can lock a user and user can’t update profile (403)

# Constraints
- Keep UI minimal (frontend me extra hardcoded content nahi).
- Plain CSS or Tailwind ok.
- Must be responsive and mobile-friendly.
- Must look good in both light and dark mode.
- Do not break existing tables; do not rename or drop existing influencer_values/brand_values/user_identities.
- Ensure every page/component is fully responsive (mobile-first) and supports light/dark mode with proper contrast.

# Deliverables
- list of files changed
- code for APIs + admin UI + frontend replacements
- seed SQL file
- quick test checklist
