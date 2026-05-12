-- V18: Create disaster_events
-- Dependencies: V3

CREATE TABLE disaster_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_name VARCHAR(255) NOT NULL,
    disaster_type VARCHAR(50) NOT NULL,
    affected_districts VARCHAR(500),
    start_date DATE NOT NULL,
    end_date DATE,
    description TEXT,
    declared_by UUID REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disaster_events_status ON disaster_events(status);
CREATE INDEX idx_disaster_events_dates ON disaster_events(start_date, end_date);
