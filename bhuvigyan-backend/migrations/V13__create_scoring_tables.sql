-- V13: Create scoring_requests and scoring_results
-- Dependencies: V12, V7

CREATE TABLE scoring_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    model_id UUID REFERENCES model_registry(id) ON DELETE SET NULL,
    latency_ms INTEGER,
    status VARCHAR(20) NOT NULL,
    fallback_used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE scoring_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scoring_request_id UUID NOT NULL REFERENCES scoring_requests(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    confidence NUMERIC(3,2),
    risk_level VARCHAR(20),
    is_shadow BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scoring_requests_claim ON scoring_requests(claim_id);
CREATE INDEX idx_scoring_results_request ON scoring_results(scoring_request_id);
