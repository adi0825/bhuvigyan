-- ================================================================
-- Bhuvigyan — Primary PostgreSQL Schema
-- Production schema for PMFBY fraud detection.
-- Owned by Spring services (Flyway V1__init.sql mirrors this file).
-- ================================================================

-- ---------- FARMERS -------------------------------------------------
CREATE TABLE IF NOT EXISTS farmers (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    udlrn               VARCHAR(20) UNIQUE NOT NULL,
    aadhaar_hash        VARCHAR(64) NOT NULL,               -- SHA-256, never raw
    name                VARCHAR(200) NOT NULL,
    mobile              VARCHAR(15)  UNIQUE NOT NULL,
    state_code          VARCHAR(2)      NOT NULL,
    district_code       VARCHAR(10)  NOT NULL,
    taluk               VARCHAR(100) NOT NULL,
    village             VARCHAR(100) NOT NULL,
    survey_no           VARCHAR(50)  NOT NULL,
    preferred_language  VARCHAR(5) DEFAULT 'en',
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_blacklisted      BOOLEAN     NOT NULL DEFAULT FALSE,
    blacklist_reason    TEXT,
    blacklisted_at      TIMESTAMPTZ,
    digilocker_id       VARCHAR(100),
    protean_verified_name VARCHAR(200),
    voter_epic_no       VARCHAR(50),
    identity_match_score DOUBLE PRECISION
);

CREATE INDEX IF NOT EXISTS idx_farmers_mobile   ON farmers(mobile);
CREATE INDEX IF NOT EXISTS idx_farmers_state    ON farmers(state_code);
CREATE INDEX IF NOT EXISTS idx_farmers_district ON farmers(district_code);


-- ---------- UDLRN MASTER -------------------------------------------
CREATE TABLE IF NOT EXISTS udlrn_master (
    udlrn                   VARCHAR(20) PRIMARY KEY
                            REFERENCES farmers(udlrn) ON DELETE CASCADE,
    plot_polygon            GEOMETRY(Polygon, 4326),
    centroid_lat            DECIMAL(10, 8),
    centroid_lng            DECIMAL(11, 8),
    land_area_ha            DECIMAL(8, 4),
    land_use_type           VARCHAR(50),          -- agricultural / non-agricultural / forest / govt
    owner_name              VARCHAR(200),
    co_owners               JSONB DEFAULT '[]'::jsonb,
    tenancy_status          VARCHAR(50),
    declared_crop           VARCHAR(100),
    sowing_season           VARCHAR(50),
    crop_history            JSONB DEFAULT '[]'::jsonb,   -- 10 yr
    bank_account_masked     VARCHAR(20),
    ifsc_code               VARCHAR(15),
    dbt_eligible            BOOLEAN DEFAULT FALSE,
    ndvi_baseline           JSONB DEFAULT '{}'::jsonb,   -- { "YYYY-MM-DD": ndvi }
    mutation_date           DATE,
    mutation_reason         TEXT,
    rtc_data_raw            JSONB,
    fraud_score_history     JSONB DEFAULT '[]'::jsonb,
    last_land_api_sync      TIMESTAMPTZ,
    last_ndvi_baseline_sync TIMESTAMPTZ,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_frozen               BOOLEAN NOT NULL DEFAULT FALSE,
    frozen_reason           TEXT,
    frozen_until            TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_udlrn_polygon ON udlrn_master USING GIST (plot_polygon);
CREATE INDEX IF NOT EXISTS idx_udlrn_land_use ON udlrn_master(land_use_type);


-- ---------- ADMIN USERS --------------------------------------------
CREATE TABLE IF NOT EXISTS admin_users (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email          VARCHAR(200) UNIQUE NOT NULL,
    password_hash  VARCHAR(255) NOT NULL,
    totp_secret    VARCHAR(255) NOT NULL,          -- encrypted at rest (AES-GCM)
    role           VARCHAR(50)  NOT NULL
                   CHECK (role IN ('SUPER_ADMIN','STATE_HEAD','DC',
                                   'DISTRICT_OFFICER','FIELD_INSPECTOR')),
    state_code     VARCHAR(2),
    district_code  VARCHAR(10),
    taluk          VARCHAR(100),
    full_name      VARCHAR(200),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    created_by     UUID REFERENCES admin_users(id),
    last_login     TIMESTAMPTZ,
    failed_logins  INTEGER NOT NULL DEFAULT 0,
    locked_until   TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_juris ON admin_users(state_code, district_code);


-- ---------- CSC OPERATORS ------------------------------------------
CREATE TABLE IF NOT EXISTS csc_operators (
    id                   VARCHAR(50) PRIMARY KEY,
    name                 VARCHAR(200),
    state_code           VARCHAR(2),
    district_code        VARCHAR(10),
    daily_claim_count    INTEGER NOT NULL DEFAULT 0,
    daily_counter_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
    total_claims_filed   INTEGER NOT NULL DEFAULT 0,
    fraud_claim_count    INTEGER NOT NULL DEFAULT 0,
    is_blocked           BOOLEAN NOT NULL DEFAULT FALSE,
    blocked_reason       TEXT,
    blocked_at           TIMESTAMPTZ,
    created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------- CLAIMS -------------------------------------------------
CREATE TABLE IF NOT EXISTS claims (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    udlrn                    VARCHAR(20) NOT NULL REFERENCES udlrn_master(udlrn),
    season                   VARCHAR(20) NOT NULL,          -- Kharif-2025 / Rabi-2025
    declared_crop            VARCHAR(100) NOT NULL,
    sowing_date              DATE NOT NULL,
    damage_type              VARCHAR(50) NOT NULL
                             CHECK (damage_type IN ('FLOOD','DROUGHT','PEST','HAIL','CYCLONE','FIRE','OTHER')),
    damage_date              DATE NOT NULL,
    claim_amount_requested   DECIMAL(12,2) NOT NULL,
    claim_amount_approved    DECIMAL(12,2),
    csc_operator_id          VARCHAR(50) REFERENCES csc_operators(id),
    bank_account_masked      VARCHAR(20),
    ifsc_code                VARCHAR(15),
    payout_account_no        VARCHAR(30),
    payout_ifsc              VARCHAR(15),
    npci_bank_name           VARCHAR(200),
    bank_match_score         DECIMAL(5,4),
    esign_doc_id             VARCHAR(100),
    esign_status             VARCHAR(20),
    status                   VARCHAR(40) NOT NULL DEFAULT 'INGESTED',
    fraud_score              INTEGER,
    fraud_flags              JSONB DEFAULT '[]'::jsonb,
    satellite_job_id         UUID,
    evidence_pdf_url         TEXT,
    true_color_image_url     TEXT,
    ndvi_map_url             TEXT,
    loss_map_url             TEXT,
    ndvi_at_sowing           DECIMAL(5,4),
    ndvi_at_claim            DECIMAL(5,4),
    area_rtc_ha              DECIMAL(8,4),
    area_satellite_ha        DECIMAL(8,4),
    model_version            JSONB,
    recommendation           VARCHAR(40),
    confidence               DECIMAL(4,3),
    resolved_by              UUID REFERENCES admin_users(id),
    resolution_note          TEXT,
    is_appealed              BOOLEAN NOT NULL DEFAULT FALSE,
    appeal_reason            TEXT,
    appeal_outcome           VARCHAR(50),
    appealed_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at              TIMESTAMPTZ,
    CONSTRAINT chk_fraud_score_range CHECK (fraud_score IS NULL OR fraud_score BETWEEN 0 AND 100),
    CONSTRAINT chk_status CHECK (status IN (
        'INGESTED','LAND_VERIFIED','SATELLITE_PENDING','FEATURES_ENGINEERED',
        'SCORED','APPROVED','REJECTED_FRAUD','REJECTED_HARDFAIL',
        'OFFICER_REVIEW','CCE_VISIT','APPEALED','CLOSED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_claims_udlrn_season
    ON claims(udlrn, season)
    WHERE status NOT IN ('REJECTED_FRAUD','REJECTED_HARDFAIL','CLOSED');

CREATE INDEX IF NOT EXISTS idx_claims_udlrn       ON claims(udlrn);
CREATE INDEX IF NOT EXISTS idx_claims_status      ON claims(status);
CREATE INDEX IF NOT EXISTS idx_claims_fraud_score ON claims(fraud_score);
CREATE INDEX IF NOT EXISTS idx_claims_created_at  ON claims(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_csc         ON claims(csc_operator_id);


-- ---------- SATELLITE JOBS -----------------------------------------
CREATE TABLE IF NOT EXISTS satellite_jobs (
    id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id           UUID REFERENCES claims(id) ON DELETE CASCADE,
    udlrn              VARCHAR(20) NOT NULL,
    status             VARCHAR(30) NOT NULL DEFAULT 'QUEUED'
                       CHECK (status IN ('QUEUED','PROCESSING','COMPLETED','FAILED')),
    polygon            GEOMETRY(Polygon, 4326),
    sowing_date        DATE,
    claim_date         DATE,
    gee_task_id        VARCHAR(100),
    result             JSONB,
    error_message      TEXT,
    processing_time_ms INTEGER,
    retry_count        INTEGER NOT NULL DEFAULT 0,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sat_jobs_claim  ON satellite_jobs(claim_id);
CREATE INDEX IF NOT EXISTS idx_sat_jobs_status ON satellite_jobs(status);


-- ---------- FRAUD HEATMAP CACHE (materialized) ---------------------
CREATE TABLE IF NOT EXISTS fraud_heatmap_cache (
    state_code         VARCHAR(2)      NOT NULL,
    district_code      VARCHAR(10)  NOT NULL,
    taluk              VARCHAR(100) NOT NULL,
    village            VARCHAR(100) NOT NULL,
    total_claims_30d   INTEGER NOT NULL DEFAULT 0,
    fraud_claims_30d   INTEGER NOT NULL DEFAULT 0,
    fraud_rate_pct     DECIMAL(5,2) NOT NULL DEFAULT 0,
    avg_fraud_score    DECIMAL(5,2) NOT NULL DEFAULT 0,
    last_refreshed     TIMESTAMPTZ  NOT NULL DEFAULT now(),
    PRIMARY KEY (state_code, district_code, taluk, village)
);

CREATE INDEX IF NOT EXISTS idx_heatmap_state_district
    ON fraud_heatmap_cache(state_code, district_code);


-- ---------- OTP SESSIONS (short-lived) -----------------------------
CREATE TABLE IF NOT EXISTS otp_sessions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mobile      VARCHAR(15) NOT NULL,
    purpose     VARCHAR(30) NOT NULL,     -- REGISTER / LOGIN
    otp_hash    VARCHAR(64) NOT NULL,
    attempts    INTEGER NOT NULL DEFAULT 0,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_otp_mobile ON otp_sessions(mobile, purpose);


-- ---------- REFRESH TOKENS -----------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject      VARCHAR(200) NOT NULL,
    token_hash   VARCHAR(64) UNIQUE NOT NULL,
    issued_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at   TIMESTAMPTZ NOT NULL,
    revoked_at   TIMESTAMPTZ,
    user_agent   TEXT,
    ip_address   INET
);
CREATE INDEX IF NOT EXISTS idx_refresh_subject ON refresh_tokens(subject);


-- ---------- FIELD VISIT REPORTS (CCE) ------------------------------
CREATE TABLE IF NOT EXISTS field_visits (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id            UUID NOT NULL REFERENCES claims(id),
    inspector_id        UUID NOT NULL REFERENCES admin_users(id),
    scheduled_at        TIMESTAMPTZ NOT NULL,
    visited_at          TIMESTAMPTZ,
    gps_captured_lat    DECIMAL(10,8),
    gps_captured_lng    DECIMAL(11,8),
    photos              JSONB DEFAULT '[]'::jsonb,
    observations        TEXT,
    recommendation      VARCHAR(40),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fv_inspector ON field_visits(inspector_id);
CREATE INDEX IF NOT EXISTS idx_fv_claim     ON field_visits(claim_id);


-- ---------- STATE / DISTRICT REFERENCE -----------------------------
CREATE TABLE IF NOT EXISTS location_states (
    code           CHAR(2) PRIMARY KEY,
    name           VARCHAR(100) NOT NULL,
    country        VARCHAR(50) NOT NULL DEFAULT 'India',
    api_adapter    VARCHAR(50)  NOT NULL DEFAULT 'default'
);

CREATE TABLE IF NOT EXISTS location_districts (
    id             VARCHAR(10) PRIMARY KEY,
    state_code     CHAR(2) REFERENCES location_states(code),
    name           VARCHAR(100) NOT NULL,
    census_code    VARCHAR(10)
);

CREATE TABLE IF NOT EXISTS location_taluks (
    id             VARCHAR(15) PRIMARY KEY,
    district_id    VARCHAR(10) REFERENCES location_districts(id),
    name           VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS location_hoblis (
    id             VARCHAR(20) PRIMARY KEY,
    taluk_id       VARCHAR(15) REFERENCES location_taluks(id),
    name           VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS location_villages (
    id             VARCHAR(25) PRIMARY KEY,
    hobli_id       VARCHAR(20) REFERENCES location_hoblis(id),
    name           VARCHAR(100) NOT NULL,
    pin_code       VARCHAR(6)
);

CREATE INDEX IF NOT EXISTS idx_villages_hobli ON location_villages(hobli_id);


-- ---------- CROP PHENOLOGY CALENDAR ----------------------------------
-- Used by ML service to detect CROP_MISMATCH flags
-- Different crops peak at different times; expected NDVI varies by season
CREATE TABLE IF NOT EXISTS crop_phenology_calendar (
    id                  SERIAL PRIMARY KEY,
    crop_type           VARCHAR(50) NOT NULL,
    season              VARCHAR(10) NOT NULL CHECK (season IN ('KHARIF', 'RABI')),
    sowing_month_start  INTEGER NOT NULL CHECK (sowing_month_start BETWEEN 1 AND 12),
    sowing_month_end    INTEGER NOT NULL CHECK (sowing_month_end BETWEEN 1 AND 12),
    harvest_month       INTEGER NOT NULL CHECK (harvest_month BETWEEN 1 AND 12),
    peak_ndvi_month     INTEGER NOT NULL CHECK (peak_ndvi_month BETWEEN 1 AND 12),
    expected_peak_ndvi  DECIMAL(4,3) NOT NULL CHECK (expected_peak_ndvi BETWEEN 0 AND 1),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crop_phenology_crop ON crop_phenology_calendar(crop_type);


-- ---------- NOTIFICATIONS (in-app + WhatsApp) -----------------------
CREATE TABLE IF NOT EXISTS notifications (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_mobile    VARCHAR(15) NOT NULL,
    recipient_type      VARCHAR(20) NOT NULL CHECK (recipient_type IN ('FARMER', 'OFFICER', 'CSC', 'INSPECTOR')),
    message             TEXT NOT NULL,
    channel             VARCHAR(20) NOT NULL CHECK (channel IN ('IN_APP', 'WHATSAPP', 'SMS', 'EMAIL')),
    status              VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SENT', 'FAILED', 'READ')),
    metadata            JSONB,
    read_at             TIMESTAMPTZ,
    sent_at             TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_mobile, recipient_type);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(recipient_mobile, read_at) WHERE read_at IS NULL;


-- ---------- SEED DATA: CROP PHENOLOGY -------------------------------
INSERT INTO crop_phenology_calendar (crop_type, season, sowing_month_start, sowing_month_end, harvest_month, peak_ndvi_month, expected_peak_ndvi) VALUES
-- Kharif Crops (Monsoon)
('PADDY', 'KHARIF', 6, 7, 10, 8, 0.650),
('PADDY', 'KHARIF', 6, 7, 11, 9, 0.650),
('COTTON', 'KHARIF', 5, 6, 10, 8, 0.550),
('COTTON', 'KHARIF', 5, 6, 11, 8, 0.550),
('MAIZE', 'KHARIF', 6, 7, 10, 8, 0.600),
('MAIZE', 'KHARIF', 6, 7, 11, 9, 0.600),
('SOYBEAN', 'KHARIF', 6, 7, 10, 8, 0.580),
('GROUNDNUT', 'KHARIF', 5, 6, 10, 8, 0.520),
('TUR', 'KHARIF', 6, 7, 10, 9, 0.550),
('BENGAL GRAM', 'KHARIF', 6, 7, 10, 8, 0.500),
-- Rabi Crops (Winter)
('WHEAT', 'RABI', 11, 12, 3, 1, 0.600),
('WHEAT', 'RABI', 11, 12, 4, 2, 0.600),
('BARLEY', 'RABI', 11, 12, 3, 1, 0.550),
('BARLEY', 'RABI', 11, 12, 4, 2, 0.550),
('GRAM', 'RABI', 10, 11, 3, 1, 0.520),
('GRAM', 'RABI', 10, 11, 4, 2, 0.520),
('MUSTARD', 'RABI', 10, 11, 3, 1, 0.480),
('MUSTARD', 'RABI', 10, 11, 4, 2, 0.480),
-- Year-round crops
('SUGARCANE', 'KHARIF', 1, 3, 12, 6, 0.700),
('SUGARCANE', 'RABI', 1, 3, 12, 12, 0.700)
ON CONFLICT (id) DO NOTHING;


INSERT INTO location_states(code, name, api_adapter) VALUES
    ('29','Karnataka','karnataka'),
    ('27','Maharashtra','maharashtra'),
    ('36','Telangana','telangana'),
    ('03','Punjab','punjab'),
    ('09','Uttar Pradesh','up'),
    ('08','Rajasthan','rajasthan')
ON CONFLICT (code) DO NOTHING;


-- Trigger to auto-update updated_at --------------------------------
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['farmers','udlrn_master','admin_users','claims']) LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS %I_upd ON %I;
       CREATE TRIGGER %I_upd BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();', t,t,t,t);
  END LOOP;
END $$;
