-- V8: Create state_adapters
-- Dependencies: V1

CREATE TABLE state_adapters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    state_code VARCHAR(2) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    config_json JSONB NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_state_adapters_code ON state_adapters(state_code);
CREATE INDEX idx_state_adapters_active ON state_adapters(active);
