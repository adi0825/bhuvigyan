-- V4: Create insurers and policies
-- Dependencies: V3

CREATE TABLE insurers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE,
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    policy_number VARCHAR(100) UNIQUE NOT NULL,
    insurer_id UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
    farmer_id UUID NOT NULL REFERENCES farmers(id) ON DELETE CASCADE,
    crop VARCHAR(100) NOT NULL,
    insured_area NUMERIC(10,2) NOT NULL,
    sum_insured NUMERIC(15,2) NOT NULL,
    premium_paid NUMERIC(15,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_policies_policy_number ON policies(policy_number);
CREATE INDEX idx_policies_farmer ON policies(farmer_id);
CREATE INDEX idx_policies_status ON policies(status);
