-- Add sync_status to leads and contact_inquiries for async queue tracking
ALTER TABLE leads
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';

ALTER TABLE contact_inquiries
ADD COLUMN IF NOT EXISTS sync_status TEXT DEFAULT 'pending';
