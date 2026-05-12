-- V17: Create integration_runs
-- Dependencies: V1

CREATE TABLE integration_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_name VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500),
    status VARCHAR(20) NOT NULL,
    request_hash VARCHAR(255),
    response_hash VARCHAR(255),
    latency_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_runs_name ON integration_runs(integration_name);
CREATE INDEX idx_integration_runs_created ON integration_runs(created_at);
