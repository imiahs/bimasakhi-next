-- 014_locations_schema.sql

CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_name TEXT NOT NULL,
    state TEXT,
    slug TEXT UNIQUE NOT NULL,
    population INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS localities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE,
    locality_name TEXT NOT NULL,
    slug TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_city_locality UNIQUE (city_id, slug)
);

CREATE TABLE IF NOT EXISTS pincodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locality_id UUID REFERENCES localities(id) ON DELETE CASCADE,
    pincode TEXT NOT NULL UNIQUE,
    active BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS location_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city_id UUID REFERENCES cities(id) ON DELETE CASCADE UNIQUE,
    visits INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS locality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    locality_id UUID REFERENCES localities(id) ON DELETE CASCADE UNIQUE,
    visits INTEGER DEFAULT 0,
    leads INTEGER DEFAULT 0,
    conversion_rate DECIMAL(5,2) DEFAULT 0.00,
    last_computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
