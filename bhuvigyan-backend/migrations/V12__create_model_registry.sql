-- V12: Create model_registry and model_deployments
-- Dependencies: V1

CREATE TABLE model_registry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version VARCHAR(50) UNIQUE NOT NULL,
    algorithm VARCHAR(100) NOT NULL,
    feature_count VARCHAR(10) NOT NULL,
    training_date DATE NOT NULL,
    validation_auc NUMERIC(5,4),
    test_auc NUMERIC(5,4),
    status VARCHAR(20) DEFAULT 'STAGING',
    storage_path VARCHAR(500) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE model_deployments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    model_id UUID NOT NULL REFERENCES model_registry(id) ON DELETE CASCADE,
    deployed_at TIMESTAMPTZ DEFAULT NOW(),
    deployed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    previous_model_id UUID REFERENCES model_registry(id) ON DELETE SET NULL,
    notes VARCHAR(500)
);

CREATE INDEX idx_model_registry_status ON model_registry(status);
