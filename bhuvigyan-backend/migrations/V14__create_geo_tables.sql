-- V14: Create geo_locations, district_masters, crop_masters
-- Dependencies: V3

CREATE TABLE geo_locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    latitude NUMERIC(10,6),
    longitude NUMERIC(10,6),
    accuracy_meters NUMERIC(10,2),
    source VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE district_masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_code VARCHAR(2) NOT NULL,
    district_code VARCHAR(10) NOT NULL,
    name VARCHAR(255) NOT NULL,
    centroid_lat NUMERIC(10,6),
    centroid_lng NUMERIC(10,6),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE crop_masters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50),
    growing_season VARCHAR(50),
    typical_ndvi_range VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geo_locations_entity ON geo_locations(entity_type, entity_id);
CREATE INDEX idx_district_masters_state ON district_masters(state_code);
