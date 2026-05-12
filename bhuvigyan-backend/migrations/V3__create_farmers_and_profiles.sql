-- V3: Create farmers, farmer_addresses, and location master tables
-- Dependencies: V1, V2

CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(100) NOT NULL,
    mobile VARCHAR(15) UNIQUE NOT NULL,
    aadhar_hash VARCHAR(255),
    bank_account VARCHAR(50),
    bank_ifsc VARCHAR(20),
    village_id UUID,
    district_id UUID,
    state_code VARCHAR(2),
    land_area_ha NUMERIC(10,2),
    carbon_eligible BOOLEAN DEFAULT TRUE,
    carbon_enrolled BOOLEAN DEFAULT FALSE,
    is_demo BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE farmer_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    address_type VARCHAR(20) NOT NULL,
    address_line TEXT,
    pincode VARCHAR(10),
    is_primary BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE location_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE location_districts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_id UUID NOT NULL REFERENCES location_states(id) ON DELETE CASCADE,
    district_code VARCHAR(10) NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE location_taluks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    district_id UUID NOT NULL REFERENCES location_districts(id) ON DELETE CASCADE,
    taluk_code VARCHAR(10),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE location_villages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    taluk_id UUID NOT NULL REFERENCES location_taluks(id) ON DELETE CASCADE,
    village_code VARCHAR(10),
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_farmers_mobile ON farmers(mobile);
CREATE INDEX idx_farmers_state ON farmers(state_code);
CREATE INDEX idx_farmers_district ON farmers(district_id);
