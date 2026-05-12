-- V7: Create fraud_scores, fraud_explanations, fraud_feature_snapshots, rule_evaluations
-- Dependencies: V6

CREATE TABLE fraud_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    confidence NUMERIC(3,2) NOT NULL,
    risk_level VARCHAR(20) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    feature_snapshot_id UUID,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fraud_explanations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fraud_score_id UUID NOT NULL REFERENCES fraud_scores(id) ON DELETE CASCADE,
    top_factors JSONB NOT NULL,
    shap_values JSONB,
    human_readable_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE fraud_feature_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    features_json JSONB NOT NULL,
    computed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE rule_evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    rule_name VARCHAR(100) NOT NULL,
    triggered BOOLEAN DEFAULT FALSE,
    details JSONB,
    evaluated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_fraud_scores_claim ON fraud_scores(claim_id);
CREATE INDEX idx_fraud_scores_computed ON fraud_scores(computed_at);
CREATE INDEX idx_fraud_feature_snapshots_claim ON fraud_feature_snapshots(claim_id);
