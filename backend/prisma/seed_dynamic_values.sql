-- Dynamic values tables + admin lock column (run once)
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS influencer_values (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (key, value)
);

CREATE INDEX IF NOT EXISTS idx_influencer_values_key_active
  ON influencer_values (key, is_active, sort_order);

CREATE TABLE IF NOT EXISTS brand_values (
  id BIGSERIAL PRIMARY KEY,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  label TEXT,
  meta JSONB DEFAULT '{}'::jsonb,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (key, value)
);

CREATE INDEX IF NOT EXISTS idx_brand_values_key_active
  ON brand_values (key, is_active, sort_order);

-- Influencer values
INSERT INTO influencer_values (key, value, label, meta, sort_order, is_active) VALUES
  ('gender_options', 'male', 'Male', '{}'::jsonb, 0, true),
  ('gender_options', 'female', 'Female', '{}'::jsonb, 1, true),
  ('gender_options', 'non_binary', 'Non-binary', '{}'::jsonb, 2, true),
  ('gender_options', 'prefer_not', 'Prefer not to say', '{}'::jsonb, 3, true),

  ('languages', 'english', 'English', '{}'::jsonb, 0, true),
  ('languages', 'hindi', 'Hindi', '{}'::jsonb, 1, true),
  ('languages', 'tamil', 'Tamil', '{}'::jsonb, 2, true),
  ('languages', 'telugu', 'Telugu', '{}'::jsonb, 3, true),
  ('languages', 'bengali', 'Bengali', '{}'::jsonb, 4, true),
  ('languages', 'marathi', 'Marathi', '{}'::jsonb, 5, true),
  ('languages', 'gujarati', 'Gujarati', '{}'::jsonb, 6, true),

  ('social_channels', 'instagram', 'Add Instagram', '{"title":"Instagram","icon":"instagram","urlPrefix":"https://www.instagram.com/"}'::jsonb, 0, true),
  ('social_channels', 'tiktok', 'Add Tiktok', '{"title":"Tiktok","icon":"tiktok","urlPrefix":"https://www.tiktok.com/@"}'::jsonb, 1, true),
  ('social_channels', 'youtube', 'Add Youtube', '{"title":"Youtube","icon":"youtube","urlPrefix":"https://www.youtube.com/"}'::jsonb, 2, true),
  ('social_channels', 'twitter', 'Add Twitter', '{"title":"Twitter / X","icon":"twitter","urlPrefix":"https://twitter.com/"}'::jsonb, 3, true),
  ('social_channels', 'amazon', 'Add Amazon Storefront', '{"title":"Amazon Storefront","icon":"amazon","urlPrefix":"https://www.amazon.com/shop/"}'::jsonb, 4, true),
  ('social_channels', 'website', 'Add Website', '{"title":"Website","icon":"website","urlPrefix":null}'::jsonb, 5, true),

  ('follower_ranges', '0-1k', '0-1k', '{}'::jsonb, 0, true),
  ('follower_ranges', '1k-10k', '1k-10k', '{}'::jsonb, 1, true),
  ('follower_ranges', '10k-50k', '10k-50k', '{}'::jsonb, 2, true),
  ('follower_ranges', '50k-100k', '50k-100k', '{}'::jsonb, 3, true),
  ('follower_ranges', '100k-500k', '100k-500k', '{}'::jsonb, 4, true),
  ('follower_ranges', '500k-1m', '500k-1m', '{}'::jsonb, 5, true),
  ('follower_ranges', '1m-5m', '1m-5m', '{}'::jsonb, 6, true),
  ('follower_ranges', '5m+', '5m+', '{}'::jsonb, 7, true),

  ('categories', 'model', 'Model', '{}'::jsonb, 0, true),
  ('categories', 'family_children', 'Family & Children', '{}'::jsonb, 1, true),
  ('categories', 'music_dance', 'Music & Dance', '{}'::jsonb, 2, true),
  ('categories', 'entrepreneur_business', 'Entrepreneur & Business', '{}'::jsonb, 3, true),
  ('categories', 'animals_pets', 'Animals & Pets', '{}'::jsonb, 4, true),
  ('categories', 'education', 'Education', '{}'::jsonb, 5, true),
  ('categories', 'athlete_sports', 'Athlete & Sports', '{}'::jsonb, 6, true),
  ('categories', 'adventure_outdoors', 'Adventure & Outdoors', '{}'::jsonb, 7, true),
  ('categories', 'gaming', 'Gaming', '{}'::jsonb, 8, true),
  ('categories', 'technology', 'Technology', '{}'::jsonb, 9, true),
  ('categories', 'celebrity_public_figure', 'Celebrity & Public Figure', '{}'::jsonb, 10, true),
  ('categories', 'actor', 'Actor', '{}'::jsonb, 11, true),
  ('categories', 'healthcare', 'Healthcare', '{}'::jsonb, 12, true),
  ('categories', 'lgbtq2', 'LGBTQ2+', '{}'::jsonb, 13, true),
  ('categories', 'automotive', 'Automotive', '{}'::jsonb, 14, true),
  ('categories', 'vegan', 'Vegan', '{}'::jsonb, 15, true),
  ('categories', 'skilled_trades', 'Skilled Trades', '{}'::jsonb, 16, true),
  ('categories', 'cannabis', 'Cannabis', '{}'::jsonb, 17, true),

  ('profile_hints', 'generic_1', 'I create content that blends education, entertainment, and personal stories. My goal is to inspire, inform, and motivate my audience while keeping things easy to understand and fun to watch.', '{"generic":true}'::jsonb, 0, true),
  ('profile_hints', 'generic_2', 'My content highlights real-world experiences, practical advice, and creative ideas my audience can actually use. I focus on building trust and long-term relationships with the people who follow me.', '{"generic":true}'::jsonb, 1, true),
  ('profile_hints', 'sports_1', 'I am a sports and fitness creator sharing workouts, training sessions, and performance tips. My content focuses on helping people stay active, improve their game, and build a stronger, more confident body.', '{"categories":["athlete_sports"]}'::jsonb, 2, true),
  ('profile_hints', 'music_1', 'I am a music and dance creator sharing choreography, freestyles, and performance clips. I love mixing trending sounds with my own style to create engaging, high-energy content.', '{"categories":["music_dance"]}'::jsonb, 3, true),
  ('profile_hints', 'family_1', 'I create family and lifestyle content that shows real moments at home - from parenting and kids activities to everyday routines. My audience is families and parents who relate to honest, down-to-earth content.', '{"categories":["family_children"]}'::jsonb, 4, true),
  ('profile_hints', 'pets_1', 'I am a pet and animal content creator sharing funny, adorable, and heartwarming moments with animals. My audience loves seeing daily life with pets, training progress, and playful clips.', '{"categories":["animals_pets"]}'::jsonb, 5, true),
  ('profile_hints', 'education_1', 'I create educational content that simplifies complex topics into clear, practical lessons. My audience is students and young professionals who want straightforward explanations they can apply.', '{"categories":["education"]}'::jsonb, 6, true),
  ('profile_hints', 'gaming_1', 'I am a gaming creator who shares gameplay highlights, funny moments, and honest reactions. My content is fast-paced, entertaining, and built around interacting with the gaming community.', '{"categories":["gaming"]}'::jsonb, 7, true),
  ('profile_hints', 'tech_1', 'I create tech content focused on apps, tools, and devices that make everyday life easier. My audience follows me for simple breakdowns, practical reviews, and tips on how to use technology better.', '{"categories":["technology"]}'::jsonb, 8, true),
  ('profile_hints', 'business_1', 'I am a business and entrepreneurship creator sharing lessons from building projects, side hustles, and brands. My audience is people who want practical insights into marketing, growth, and digital income.', '{"categories":["entrepreneur_business"]}'::jsonb, 9, true),
  ('profile_hints', 'niche_1', 'I create niche lifestyle content focused on my specific area of interest. I share tips, experiences, and honest opinions to help people learn more and feel confident exploring this space.', '{"categories":["vegan","cannabis","adventure_outdoors","automotive","skilled_trades","lgbtq2"]}'::jsonb, 10, true),

  ('listing_filters', 'all', 'All', '{}'::jsonb, 0, true),

  ('profile_description_placeholder', 'default', 'Who are you and what type of content do you create? Who is your audience? Be specific as this will help you show up in searches.', '{}'::jsonb, 0, true)
ON CONFLICT (key, value)
DO NOTHING;

-- Brand values
INSERT INTO brand_values (key, value, label, meta, sort_order, is_active) VALUES
  ('here_to_do', 'one_time', 'Find influencers for a one-time campaign', '{"icon":"bolt"}'::jsonb, 0, true),
  ('here_to_do', 'ongoing', 'Get ongoing influencer content', '{"icon":"repeat"}'::jsonb, 1, true),
  ('here_to_do', 'exploring', 'I am not sure yet, just exploring', '{"icon":"user"}'::jsonb, 2, true),

  ('approx_budgets', 'under_1000', 'Under $1,000', '{}'::jsonb, 0, true),
  ('approx_budgets', '1000_5000', '$1,000 - $5,000', '{}'::jsonb, 1, true),
  ('approx_budgets', '5000_10000', '$5,000 - $10,000', '{}'::jsonb, 2, true),
  ('approx_budgets', '10000_25000', '$10,000 - $25,000', '{}'::jsonb, 3, true),
  ('approx_budgets', '25000_50000', '$25,000 - $50,000', '{}'::jsonb, 4, true),
  ('approx_budgets', 'over_50000', '$50,000+', '{}'::jsonb, 5, true),

  ('business_types', 'agency', 'Agency', '{"icon":"document"}'::jsonb, 0, true),
  ('business_types', 'ecommerce', 'E-commerce', '{"icon":"cart"}'::jsonb, 1, true),
  ('business_types', 'website_app', 'Website/App', '{"icon":"grid"}'::jsonb, 2, true),
  ('business_types', 'local_business', 'Local Business', '{"icon":"store"}'::jsonb, 3, true),
  ('business_types', 'other', 'Other', '{"icon":"help"}'::jsonb, 4, true),

  ('categories', 'beauty', 'Beauty', '{}'::jsonb, 0, true),
  ('categories', 'fashion', 'Fashion', '{}'::jsonb, 1, true),
  ('categories', 'travel', 'Travel', '{}'::jsonb, 2, true),
  ('categories', 'health_fitness', 'Health & Fitness', '{}'::jsonb, 3, true),
  ('categories', 'food_drink', 'Food & Drink', '{}'::jsonb, 4, true),
  ('categories', 'comedy_entertainment', 'Comedy & Entertainment', '{}'::jsonb, 5, true),
  ('categories', 'art_photography', 'Art & Photography', '{}'::jsonb, 6, true),
  ('categories', 'family_children', 'Family & Children', '{}'::jsonb, 7, true),
  ('categories', 'music_dance', 'Music & Dance', '{}'::jsonb, 8, true),
  ('categories', 'entrepreneur_business', 'Entrepreneur & Business', '{}'::jsonb, 9, true),
  ('categories', 'animals_pets', 'Animals & Pets', '{}'::jsonb, 10, true),
  ('categories', 'education', 'Education', '{}'::jsonb, 11, true),
  ('categories', 'athlete_sports', 'Athlete & Sports', '{}'::jsonb, 12, true),
  ('categories', 'adventure_outdoors', 'Adventure & Outdoors', '{}'::jsonb, 13, true),
  ('categories', 'gaming', 'Gaming', '{}'::jsonb, 14, true),
  ('categories', 'technology', 'Technology', '{}'::jsonb, 15, true),
  ('categories', 'healthcare', 'Healthcare', '{}'::jsonb, 16, true),
  ('categories', 'automotive', 'Automotive', '{}'::jsonb, 17, true),
  ('categories', 'skilled_trades', 'Skilled Trades', '{}'::jsonb, 18, true),
  ('categories', 'cannabis', 'Cannabis', '{}'::jsonb, 19, true),

  ('target_platforms', 'instagram', 'Instagram', '{}'::jsonb, 0, true),
  ('target_platforms', 'tiktok', 'TikTok', '{}'::jsonb, 1, true),
  ('target_platforms', 'ugc', 'User Generated Content', '{}'::jsonb, 2, true),
  ('target_platforms', 'youtube', 'YouTube', '{}'::jsonb, 3, true),
  ('target_platforms', 'twitter', 'Twitter', '{}'::jsonb, 4, true),
  ('target_platforms', 'facebook', 'Facebook', '{}'::jsonb, 5, true),

  ('social_channels', 'instagram', 'Instagram', '{}'::jsonb, 0, true),
  ('social_channels', 'tiktok', 'TikTok', '{}'::jsonb, 1, true),
  ('social_channels', 'youtube', 'YouTube', '{}'::jsonb, 2, true),
  ('social_channels', 'twitter', 'Twitter', '{}'::jsonb, 3, true),
  ('social_channels', 'facebook', 'Facebook', '{}'::jsonb, 4, true),

  ('campaign_types', 'product_launch', 'Product launch', '{}'::jsonb, 0, true),
  ('campaign_types', 'brand_awareness', 'Brand awareness', '{}'::jsonb, 1, true),
  ('campaign_types', 'ugc', 'UGC content', '{}'::jsonb, 2, true),
  ('campaign_types', 'events', 'Events', '{}'::jsonb, 3, true)
ON CONFLICT (key, value)
DO NOTHING;

CREATE TABLE IF NOT EXISTS packages (
  id BIGSERIAL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS packages_user_type_title_key
  ON packages ("userId", type, title);

INSERT INTO packages ("userId", type, title, description, price, currency, sort_order, is_active)
SELECT u.id, 'INFLUENCER', 'Starter Story',
  'One sponsored story with a short shoutout.', 150, 'USD', 0, true
FROM users u
WHERE u.role = 'INFLUENCER'
ORDER BY u."createdAt" ASC
LIMIT 1
ON CONFLICT ("userId", type, title)
DO NOTHING;

INSERT INTO packages ("userId", type, title, description, price, currency, sort_order, is_active)
SELECT u.id, 'INFLUENCER', 'Feed Feature',
  'One feed post plus link in bio for 24 hours.', 300, 'USD', 1, true
FROM users u
WHERE u.role = 'INFLUENCER'
ORDER BY u."createdAt" ASC
LIMIT 1
ON CONFLICT ("userId", type, title)
DO NOTHING;

INSERT INTO packages ("userId", type, title, description, price, currency, sort_order, is_active)
SELECT u.id, 'BRAND', 'Campaign Strategy',
  'Full creative direction and influencer matchmaking.', 500, 'USD', 0, true
FROM users u
WHERE u.role = 'BRAND'
ORDER BY u."createdAt" ASC
LIMIT 1
ON CONFLICT ("userId", type, title)
DO NOTHING;
