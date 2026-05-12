-- V23: Add performance indexes on claims and related tables
-- Dependencies: V5, V16

CREATE INDEX idx_claims_created ON claims(created_at DESC);
CREATE INDEX idx_claims_fraud_score ON claims(fraud_score);
CREATE INDEX idx_claims_decided ON claims(decided_at);
CREATE INDEX idx_claim_documents_hash ON claim_documents(file_hash);
