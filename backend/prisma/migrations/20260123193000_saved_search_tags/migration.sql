-- Add tags array to saved_searches
ALTER TABLE "saved_searches"
ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
