-- V5: Create claims and claim_status_history
-- Dependencies: V4

CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_number VARCHAR(50) UNIQUE NOT NULL,
    udlrn VARCHAR(50),
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES policies(id) ON DELETE SET NULL,
    insurer_id UUID REFERENCES insurers(id) ON DELETE SET NULL,
    loss_type VARCHAR(50),
    loss_date DATE,
    affected_area NUMERIC(10,2),
    claim_amount_requested NUMERIC(15,2),
    description TEXT,
    gps_latitude NUMERIC(10,6),
    gps_longitude NUMERIC(10,6),
    declared_crop VARCHAR(100),
    claimed_area_ha NUMERIC(10,2),
    damage_percent NUMERIC(5,2),
    damage_cause VARCHAR(100),
    season VARCHAR(50),
    year INTEGER,
    ndvi_at_claim NUMERIC(5,4),
    status VARCHAR(50) DEFAULT 'DRAFT',
    fraud_score INTEGER DEFAULT 0,
    fraud_verdict VARCHAR(50),
    fraud_signals JSONB,
    fraud_features JSONB,
    fraud_flags JSONB,
    officer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    approved_amount NUMERIC(15,2),
    rejection_reason TEXT,
    review_notes TEXT,
    satellite_data JSONB,
    filed_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    from_status VARCHAR(30),
    to_status VARCHAR(30) NOT NULL,
    actor_id UUID,
    actor_type VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_claims_number ON claims(claim_number);
CREATE INDEX idx_claims_farmer ON claims(farmer_id);
CREATE INDEX idx_claims_policy ON claims(policy_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_filed ON claims(filed_at);
CREATE INDEX idx_claim_status_history_claim ON claim_status_history(claim_id);
