-- ================================================================
-- Bhuvigyan PMFBY — Additional Tables & Extensions
-- PostgreSQL 16 + PostGIS
-- ================================================================

-- Ensure extensions are available
DO $$ BEGIN
    CREATE EXTENSION IF NOT EXISTS postgis;
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
    CREATE EXTENSION IF NOT EXISTS pg_trgm;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ================================================================
-- ENHANCED CCE_VISITS TABLE
-- ================================================================
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS udlrn VARCHAR(50);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS farmer_name VARCHAR(200);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS farmer_mobile VARCHAR(15);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS village VARCHAR(100);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS priority VARCHAR(10) DEFAULT 'NORMAL';
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ;
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS gps_lat DECIMAL(10,8);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS gps_lng DECIMAL(11,8);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS damage_percentage DECIMAL(5,2);
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_cce_visits_udlrn ON cce_visits(udlrn);
CREATE INDEX IF NOT EXISTS idx_cce_visits_status ON cce_visits(status);
CREATE INDEX IF NOT EXISTS idx_cce_visits_priority ON cce_visits(priority);
CREATE INDEX IF NOT EXISTS idx_cce_visits_scheduled ON cce_visits(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_cce_visits_inspector ON cce_visits(inspector_id);

-- ================================================================
-- INSPECTION_CHECKLIST TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS inspection_checklist (
    id                  SERIAL PRIMARY KEY,
    visit_id            UUID REFERENCES cce_visits(id) ON DELETE CASCADE,
    checklist_item      VARCHAR(200) NOT NULL,
    checklist_category  VARCHAR(50),
    status              VARCHAR(20) DEFAULT 'PENDING',
    notes               TEXT,
    is_verified         BOOLEAN DEFAULT FALSE,
    verified_by         UUID,
    verified_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT now(),
    updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inspection_checklist_visit ON inspection_checklist(visit_id);
CREATE INDEX IF NOT EXISTS idx_inspection_checklist_status ON inspection_checklist(status);

-- ================================================================
-- ENHANCED SETTLEMENTS TABLE
-- ================================================================
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS insurer_code VARCHAR(20);
ALTER TABLE settlements ADD COLUMN IF NOT EXISTS insurer_name VARCHAR(200);

CREATE INDEX IF NOT EXISTS idx_settlements_udlrn ON settlements(udlrn);
CREATE INDEX IF NOT EXISTS idx_settlements_insurer ON settlements(insurer_code);
CREATE INDEX IF NOT EXISTS idx_settlements_payment_date ON settlements(payment_date);

-- ================================================================
-- ENHANCED INSURERS TABLE
-- ================================================================
ALTER TABLE insurers ADD COLUMN IF NOT EXISTS contact_person VARCHAR(200);
ALTER TABLE insurers ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE insurers ADD COLUMN IF NOT EXISTS email VARCHAR(200);
ALTER TABLE insurers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE insurers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- ================================================================
-- ENHANCED VAO_ALERTS TABLE
-- ================================================================
ALTER TABLE vao_alerts ADD COLUMN IF NOT EXISTS farmer_name VARCHAR(200);
ALTER TABLE vao_alerts ADD COLUMN IF NOT EXISTS farmer_mobile VARCHAR(15);
ALTER TABLE vao_alerts ADD COLUMN IF NOT EXISTS village VARCHAR(100);
ALTER TABLE vao_alerts ADD COLUMN IF NOT EXISTS taluk VARCHAR(100);
ALTER TABLE vao_alerts ADD COLUMN IF NOT EXISTS area_ha DECIMAL(10,4);
ALTER TABLE vao_alerts ADD COLUMN IF NOT EXISTS estimated_fraud_amount DECIMAL(12,2);

CREATE INDEX IF NOT EXISTS idx_vao_alerts_farmer_id ON vao_alerts(farmer_id);
CREATE INDEX IF NOT EXISTS idx_vao_alerts_severity ON vao_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_vao_alerts_created ON vao_alerts(created_at);

-- ================================================================
-- ENHANCED FIR_ALERTS TABLE
-- ================================================================
ALTER TABLE fir_alerts ADD COLUMN IF NOT EXISTS farmer_name VARCHAR(200);
ALTER TABLE fir_alerts ADD COLUMN IF NOT EXISTS farmer_mobile VARCHAR(15);
ALTER TABLE fir_alerts ADD COLUMN IF NOT EXISTS village VARCHAR(100);
ALTER TABLE fir_alerts ADD COLUMN IF NOT EXISTS claim_amount DECIMAL(12,2);
ALTER TABLE fir_alerts ADD COLUMN IF NOT EXISTS investigation_status VARCHAR(50);
ALTER TABLE fir_alerts ADD COLUMN IF NOT EXISTS current_stage VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_fir_alerts_claim_id ON fir_alerts(claim_id);
CREATE INDEX IF NOT EXISTS idx_fir_alerts_fraud_score ON fir_alerts(fraud_score);
CREATE INDEX IF NOT EXISTS idx_fir_alerts_filed_at ON fir_alerts(filed_at);

-- ================================================================
-- AUDIT_TRAIL TABLE
-- ================================================================
CREATE TABLE IF NOT EXISTS audit_trail (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor               VARCHAR(200) NOT NULL,
    actor_role          VARCHAR(50),
    action              VARCHAR(100) NOT NULL,
    resource_type       VARCHAR(100),
    resource_id         VARCHAR(100),
    details             JSONB DEFAULT '{}'::jsonb,
    ip_address          INET,
    user_agent          VARCHAR(500),
    severity            VARCHAR(20) DEFAULT 'INFO',
    session_id          VARCHAR(100),
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_actor ON audit_trail(actor);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_resource ON audit_trail(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_severity ON audit_trail(severity);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON audit_trail(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_trail_actor_role ON audit_trail(actor_role);

-- ================================================================
-- CLAIMS ENHANCEMENTS
-- ================================================================
ALTER TABLE claims ADD COLUMN IF NOT EXISTS land_area_ha DECIMAL(10,4);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS insurer_code VARCHAR(20);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS policy_number VARCHAR(50);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS premium_amount DECIMAL(12,2);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS sum_insured DECIMAL(12,2);

CREATE INDEX IF NOT EXISTS idx_claims_udlrn ON claims(udlrn);
CREATE INDEX IF NOT EXISTS idx_claims_status ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_filed_at ON claims(filed_at);
CREATE INDEX IF NOT EXISTS idx_claims_fraud_score ON claims(fraud_score);
CREATE INDEX IF NOT EXISTS idx_claims_insurer ON claims(insurer_code);

-- ================================================================
-- FARMERS ENHANCEMENTS
-- ================================================================
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS udlrn VARCHAR(50);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS land_area_ha DECIMAL(10,4);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(30);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(15);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_farmers_udlrn ON farmers(udlrn);
CREATE INDEX IF NOT EXISTS idx_farmers_state_district ON farmers(state_code, district_code);

-- ================================================================
-- NOTIFICATIONS ENHANCEMENTS
-- ================================================================
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS claim_id UUID;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id VARCHAR(100);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS notification_type VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_notifications_claim ON notifications(claim_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_mobile ON notifications(recipient_mobile);

-- ================================================================
-- UDLRN_MASTER ENHANCEMENTS
-- ================================================================
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS land_area_ha DECIMAL(10,4);
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS ndvi_baseline JSONB;

CREATE INDEX IF NOT EXISTS idx_udlrn_master_farmer ON udlrn_master(farmer_id);
CREATE INDEX IF NOT EXISTS idx_udlrn_master_district ON udlrn_master(district_id);
CREATE INDEX IF NOT EXISTS idx_udlrn_master_declared_crop ON udlrn_master(declared_crop);

-- ================================================================
-- ADDITIONAL UTILITY VIEWS AND FUNCTIONS
-- ================================================================

-- Function to get active alerts count by district
CREATE OR REPLACE FUNCTION get_active_alerts_count(p_district_code VARCHAR)
RETURNS TABLE(alert_type VARCHAR, count INTEGER) AS $$
BEGIN
    RETURN QUERY
    SELECT 'VAO'::VARCHAR, COUNT(*)::INTEGER FROM vao_alerts WHERE status = 'OPEN' AND district_code = p_district_code
    UNION ALL
    SELECT 'FIR'::VARCHAR, COUNT(*)::INTEGER FROM fir_alerts WHERE status != 'CONFIRMED' AND district_code = p_district_code;
END;
$$ LANGUAGE plpgsql;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO PUBLIC;

-- End of file