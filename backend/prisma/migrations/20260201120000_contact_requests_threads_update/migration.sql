ALTER TABLE contact_requests
ADD COLUMN IF NOT EXISTS listing_id TEXT;

ALTER TABLE contact_requests
ADD CONSTRAINT contact_requests_listing_id_fkey
FOREIGN KEY (listing_id) REFERENCES "Listing"(id) ON DELETE SET NULL;

ALTER TABLE contact_threads
ADD COLUMN IF NOT EXISTS request_id TEXT;

ALTER TABLE contact_threads
ADD CONSTRAINT contact_threads_request_id_fkey
FOREIGN KEY (request_id) REFERENCES contact_requests(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS contact_threads_request_id_key
ON contact_threads (request_id);

ALTER TABLE contact_threads
ALTER COLUMN request_id SET NOT NULL;
