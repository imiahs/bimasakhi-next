-- 040_geo_intelligence.sql
-- Phase 5: Geo Intelligence (Bible Section 13)
-- Adds pincode_areas for micro-local expansion, seeds city populations and initial localities

-- 1. pincode_areas table: micro-areas within a pincode
CREATE TABLE IF NOT EXISTS pincode_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pincode_id UUID REFERENCES pincodes(id) ON DELETE CASCADE,
    area_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    delivery_office TEXT,
    area_type TEXT DEFAULT 'residential',
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_pincode_area UNIQUE (pincode_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_pincode_areas_pincode ON pincode_areas(pincode_id);

-- 2. Add coverage tracking columns to cities
ALTER TABLE cities ADD COLUMN IF NOT EXISTS locality_count INTEGER DEFAULT 0;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 0;
ALTER TABLE cities ADD COLUMN IF NOT EXISTS coverage_pct DECIMAL(5,2) DEFAULT 0.00;

-- 3. Add page tracking to localities
ALTER TABLE localities ADD COLUMN IF NOT EXISTS has_page BOOLEAN DEFAULT false;
ALTER TABLE localities ADD COLUMN IF NOT EXISTS page_slug TEXT;
ALTER TABLE localities ADD COLUMN IF NOT EXISTS pincode_count INTEGER DEFAULT 0;

-- 4. Seed city populations (India Census 2011 data)
UPDATE cities SET population = 16787941 WHERE slug = 'delhi';
UPDATE cities SET population = 12442373 WHERE slug = 'mumbai';
UPDATE cities SET population = 8443675  WHERE slug = 'bangalore';
UPDATE cities SET population = 4486679  WHERE slug = 'kolkata';
UPDATE cities SET population = 4681087  WHERE slug = 'chennai';

-- 5. Seed initial localities for Delhi (top 30 by search volume relevance)
INSERT INTO localities (city_id, locality_name, slug, priority, active) 
SELECT c.id, loc.name, loc.slug, loc.priority, true
FROM cities c, (VALUES
    ('Dwarka', 'dwarka', 1),
    ('Rohini', 'rohini', 1),
    ('Janakpuri', 'janakpuri', 1),
    ('Pitampura', 'pitampura', 2),
    ('Laxmi Nagar', 'laxmi-nagar', 2),
    ('Karol Bagh', 'karol-bagh', 2),
    ('Rajouri Garden', 'rajouri-garden', 2),
    ('Saket', 'saket', 2),
    ('Vasant Kunj', 'vasant-kunj', 3),
    ('Paschim Vihar', 'paschim-vihar', 3),
    ('Uttam Nagar', 'uttam-nagar', 3),
    ('Shahdara', 'shahdara', 3),
    ('Nehru Place', 'nehru-place', 3),
    ('Mayur Vihar', 'mayur-vihar', 3),
    ('Krishna Nagar', 'krishna-nagar', 4),
    ('Tilak Nagar', 'tilak-nagar', 4),
    ('Vikaspuri', 'vikaspuri', 4),
    ('Hari Nagar', 'hari-nagar', 4),
    ('Moti Nagar', 'moti-nagar', 4),
    ('Preet Vihar', 'preet-vihar', 4),
    ('Kalkaji', 'kalkaji', 4),
    ('Lajpat Nagar', 'lajpat-nagar', 5),
    ('Defence Colony', 'defence-colony', 5),
    ('Greater Kailash', 'greater-kailash', 5),
    ('Hauz Khas', 'hauz-khas', 5),
    ('Malviya Nagar', 'malviya-nagar', 5),
    ('Patel Nagar', 'patel-nagar', 5),
    ('Connaught Place', 'connaught-place', 5),
    ('Chandni Chowk', 'chandni-chowk', 5),
    ('Sarojini Nagar', 'sarojini-nagar', 5)
) AS loc(name, slug, priority)
WHERE c.slug = 'delhi'
ON CONFLICT (city_id, slug) DO NOTHING;

-- 6. Seed initial localities for Mumbai (top 25)
INSERT INTO localities (city_id, locality_name, slug, priority, active) 
SELECT c.id, loc.name, loc.slug, loc.priority, true
FROM cities c, (VALUES
    ('Andheri', 'andheri', 1),
    ('Borivali', 'borivali', 1),
    ('Thane', 'thane', 1),
    ('Malad', 'malad', 2),
    ('Goregaon', 'goregaon', 2),
    ('Kandivali', 'kandivali', 2),
    ('Bandra', 'bandra', 2),
    ('Powai', 'powai', 3),
    ('Ghatkopar', 'ghatkopar', 3),
    ('Mulund', 'mulund', 3),
    ('Dadar', 'dadar', 3),
    ('Vikhroli', 'vikhroli', 3),
    ('Chembur', 'chembur', 3),
    ('Kurla', 'kurla', 4),
    ('Jogeshwari', 'jogeshwari', 4),
    ('Dahisar', 'dahisar', 4),
    ('Santacruz', 'santacruz', 4),
    ('Vile Parle', 'vile-parle', 4),
    ('Matunga', 'matunga', 5),
    ('Worli', 'worli', 5),
    ('Lower Parel', 'lower-parel', 5),
    ('Churchgate', 'churchgate', 5),
    ('Colaba', 'colaba', 5),
    ('Navi Mumbai', 'navi-mumbai', 2),
    ('Vasai', 'vasai', 3)
) AS loc(name, slug, priority)
WHERE c.slug = 'mumbai'
ON CONFLICT (city_id, slug) DO NOTHING;

-- 7. Seed initial localities for Bangalore (top 20)
INSERT INTO localities (city_id, locality_name, slug, priority, active) 
SELECT c.id, loc.name, loc.slug, loc.priority, true
FROM cities c, (VALUES
    ('Whitefield', 'whitefield', 1),
    ('Electronic City', 'electronic-city', 1),
    ('Koramangala', 'koramangala', 1),
    ('HSR Layout', 'hsr-layout', 2),
    ('Marathahalli', 'marathahalli', 2),
    ('BTM Layout', 'btm-layout', 2),
    ('Jayanagar', 'jayanagar', 2),
    ('Indiranagar', 'indiranagar', 3),
    ('Hebbal', 'hebbal', 3),
    ('Yelahanka', 'yelahanka', 3),
    ('Banashankari', 'banashankari', 3),
    ('JP Nagar', 'jp-nagar', 3),
    ('Rajajinagar', 'rajajinagar', 4),
    ('Basavanagudi', 'basavanagudi', 4),
    ('Malleshwaram', 'malleshwaram', 4),
    ('Vijayanagar', 'vijayanagar', 4),
    ('Sarjapur Road', 'sarjapur-road', 4),
    ('Kengeri', 'kengeri', 5),
    ('Bannerghatta Road', 'bannerghatta-road', 5),
    ('Devanahalli', 'devanahalli', 5)
) AS loc(name, slug, priority)
WHERE c.slug = 'bangalore'
ON CONFLICT (city_id, slug) DO NOTHING;

-- 8. Seed initial localities for Kolkata (top 15)
INSERT INTO localities (city_id, locality_name, slug, priority, active) 
SELECT c.id, loc.name, loc.slug, loc.priority, true
FROM cities c, (VALUES
    ('Salt Lake', 'salt-lake', 1),
    ('New Town', 'new-town', 1),
    ('Howrah', 'howrah', 1),
    ('Dum Dum', 'dum-dum', 2),
    ('Behala', 'behala', 2),
    ('Garia', 'garia', 2),
    ('Jadavpur', 'jadavpur', 3),
    ('Ballygunge', 'ballygunge', 3),
    ('Park Street', 'park-street', 3),
    ('Tollygunge', 'tollygunge', 4),
    ('Baranagar', 'baranagar', 4),
    ('Barrackpore', 'barrackpore', 4),
    ('Lake Town', 'lake-town', 5),
    ('Gariahat', 'gariahat', 5),
    ('Alipore', 'alipore', 5)
) AS loc(name, slug, priority)
WHERE c.slug = 'kolkata'
ON CONFLICT (city_id, slug) DO NOTHING;

-- 9. Seed initial localities for Chennai (top 15)
INSERT INTO localities (city_id, locality_name, slug, priority, active) 
SELECT c.id, loc.name, loc.slug, loc.priority, true
FROM cities c, (VALUES
    ('Anna Nagar', 'anna-nagar', 1),
    ('T Nagar', 't-nagar', 1),
    ('Velachery', 'velachery', 1),
    ('Tambaram', 'tambaram', 2),
    ('Porur', 'porur', 2),
    ('Adyar', 'adyar', 2),
    ('Chromepet', 'chromepet', 3),
    ('Sholinganallur', 'sholinganallur', 3),
    ('Guindy', 'guindy', 3),
    ('Mylapore', 'mylapore', 3),
    ('Perambur', 'perambur', 4),
    ('Ambattur', 'ambattur', 4),
    ('Thiruvanmiyur', 'thiruvanmiyur', 4),
    ('Nungambakkam', 'nungambakkam', 5),
    ('Egmore', 'egmore', 5)
) AS loc(name, slug, priority)
WHERE c.slug = 'chennai'
ON CONFLICT (city_id, slug) DO NOTHING;

-- 10. Update city locality counts
UPDATE cities SET locality_count = (
    SELECT COUNT(*) FROM localities WHERE localities.city_id = cities.id
);

-- 11. Update city page counts from page_index
UPDATE cities SET page_count = (
    SELECT COUNT(*) FROM page_index WHERE page_index.city_id = cities.id
);

-- 12. Calculate coverage percentage
UPDATE cities SET coverage_pct = CASE 
    WHEN locality_count > 0 THEN ROUND((page_count::DECIMAL / locality_count) * 100, 2)
    ELSE 0 
END;
