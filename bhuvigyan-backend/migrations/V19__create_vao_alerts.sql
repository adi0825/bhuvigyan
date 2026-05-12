-- V19: Create vao_alerts
-- Dependencies: V3, V14

CREATE TABLE vao_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vao_name VARCHAR(255) NOT NULL,
    vao_id VARCHAR(100),
    district_id UUID REFERENCES district_masters(id) ON DELETE SET NULL,
    claim_id UUID REFERENCES claims(id) ON DELETE SET NULL,
    alert_type VARCHAR(50) NOT NULL,
    details TEXT,
    status VARCHAR(20) DEFAULT 'PENDING',
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_vao_alerts_district ON vao_alerts(district_id);
CREATE INDEX idx_vao_alerts_status ON vao_alerts(status);
