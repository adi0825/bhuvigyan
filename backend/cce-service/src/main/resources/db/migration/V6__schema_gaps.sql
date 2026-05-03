-- V6: MinIO bucket name alignment, pre-signed URL fields, CSC Redis rate limit fields
-- Adds missing columns referenced in spec

-- MinIO evidence pdf URL column already exists. Add ndvi_timeline_url column
ALTER TABLE claims ADD COLUMN IF NOT EXISTS ndvi_timeline_url TEXT;
ALTER TABLE claims ADD COLUMN IF NOT EXISTS data_source VARCHAR(30) DEFAULT 'SENTINEL_2';
ALTER TABLE claims ADD COLUMN IF NOT EXISTS landsat_max_ndvi DECIMAL(5,4);
ALTER TABLE claims ADD COLUMN IF NOT EXISTS imd_weather_confirmed BOOLEAN;

-- CSC Redis daily count
ALTER TABLE csc_operators ADD COLUMN IF NOT EXISTS redis_daily_count INTEGER DEFAULT 0;

-- Admin officers: TOTP secret for all roles
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS totp_secret VARCHAR(100);
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) DEFAULT 'en';

-- UDLRN: carbon eligibility
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS carbon_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS kgis_area_ha DECIMAL(10,4);
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS rtc_area_ha DECIMAL(10,4);

-- Fraud heatmap daily: add top_fraud_type and top_fraud_flag columns
ALTER TABLE fraud_heatmap_daily ADD COLUMN IF NOT EXISTS top_fraud_type VARCHAR(50);
ALTER TABLE fraud_heatmap_daily ADD COLUMN IF NOT EXISTS top_fraud_flag VARCHAR(50);
ALTER TABLE fraud_heatmap_daily ADD COLUMN IF NOT EXISTS amount_at_risk DECIMAL(15,2) DEFAULT 0;

-- Notifications: add farmer_id FK properly
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS claim_number VARCHAR(20);

-- DBT payouts: add retry fields
ALTER TABLE dbt_payouts ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;
ALTER TABLE dbt_payouts ADD COLUMN IF NOT EXISTS last_retry_at TIMESTAMPTZ;
ALTER TABLE dbt_payouts ADD COLUMN IF NOT EXISTS error_message TEXT;

-- CCE visits: add due_by and priority  
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS due_by TIMESTAMPTZ;
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'NORMAL';
ALTER TABLE cce_visits ADD COLUMN IF NOT EXISTS contradiction_detected BOOLEAN DEFAULT FALSE;

-- Claim appeals: add photo_uploads
ALTER TABLE claim_appeals ADD COLUMN IF NOT EXISTS photo_urls JSONB DEFAULT '[]'::jsonb;

-- UDLRN season lock: if missing
CREATE TABLE IF NOT EXISTS udlrn_season_lock (
    udlrn VARCHAR(20),
    season_code VARCHAR(20),
    state_code CHAR(2),
    claim_id UUID,
    locked_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (udlrn, season_code)
);

-- Create insurer_accounts view alias
CREATE OR REPLACE VIEW insurer_accounts AS SELECT * FROM insurers;
