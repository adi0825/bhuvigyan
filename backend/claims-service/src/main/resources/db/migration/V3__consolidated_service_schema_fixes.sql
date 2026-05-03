-- V3: Consolidated Service Schema Fixes
-- Merged from individual microservices to prevent Flyway version collisions

-- From admin-service
ALTER TABLE admin_users ALTER COLUMN state_code TYPE VARCHAR(2);

-- From claims-service
ALTER TABLE claims ADD COLUMN IF NOT EXISTS payout_account_no VARCHAR(30);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS payout_ifsc VARCHAR(15);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS npci_bank_name VARCHAR(200);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS bank_match_score DECIMAL(5,4);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS esign_doc_id VARCHAR(100);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS esign_status VARCHAR(20);

ALTER TABLE csc_operators ALTER COLUMN state_code TYPE VARCHAR(2) USING state_code::VARCHAR(2);
ALTER TABLE fraud_heatmap_cache ALTER COLUMN state_code TYPE VARCHAR(2) USING state_code::VARCHAR(2);

-- From farmer-service
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS digilocker_id VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS protean_verified_name VARCHAR(200);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS voter_epic_no VARCHAR(50);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS identity_match_score DOUBLE PRECISION;
ALTER TABLE farmers ALTER COLUMN identity_match_score TYPE DOUBLE PRECISION;
ALTER TABLE farmers ALTER COLUMN state_code TYPE VARCHAR(2);
