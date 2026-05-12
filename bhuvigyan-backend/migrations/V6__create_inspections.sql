-- V6: Create inspections, inspection_photos, and cce_visits
-- Dependencies: V5

CREATE TABLE inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    visit_number INTEGER DEFAULT 1,
    status VARCHAR(30) DEFAULT 'ASSIGNED',
    scheduled_date DATE,
    actual_loss_pct NUMERIC(5,2),
    crop_condition VARCHAR(100),
    weather_correlated BOOLEAN,
    gps_latitude NUMERIC(10,6),
    gps_longitude NUMERIC(10,6),
    remarks TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

CREATE TABLE inspection_photos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    inspection_id UUID NOT NULL REFERENCES inspections(id) ON DELETE CASCADE,
    file_hash VARCHAR(255) NOT NULL,
    storage_url VARCHAR(500) NOT NULL,
    gps_latitude NUMERIC(10,6),
    gps_longitude NUMERIC(10,6),
    exif_timestamp TIMESTAMPTZ,
    taken_at TIMESTAMPTZ
);

CREATE TABLE cce_visits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    visit_number INTEGER DEFAULT 1,
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(30) DEFAULT 'ASSIGNED',
    scheduled_date DATE,
    priority VARCHAR(20) DEFAULT 'NORMAL',
    notes_to_officer TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inspections_claim ON inspections(claim_id);
CREATE INDEX idx_inspections_officer ON inspections(officer_id);
CREATE INDEX idx_inspections_status ON inspections(status);
CREATE INDEX idx_cce_visits_claim ON cce_visits(claim_id);
CREATE INDEX idx_cce_visits_assigned ON cce_visits(assigned_to);
