-- Location Master
CREATE TABLE location_states (
    code CHAR(2) PRIMARY KEY,
    name VARCHAR(100) NOT NULL
);

CREATE TABLE location_districts (
    id VARCHAR(15) PRIMARY KEY,
    state_code CHAR(2) REFERENCES location_states(code),
    name VARCHAR(100) NOT NULL,
    kgis_district_code VARCHAR(20),
    census_code VARCHAR(10)
);

CREATE TABLE location_taluks (
    id VARCHAR(20) PRIMARY KEY,
    district_id VARCHAR(15) REFERENCES location_districts(id),
    name VARCHAR(100) NOT NULL,
    kgis_taluk_code VARCHAR(20)
);

CREATE TABLE location_hoblis (
    id VARCHAR(25) PRIMARY KEY,
    taluk_id VARCHAR(20) REFERENCES location_taluks(id),
    name VARCHAR(100) NOT NULL,
    kgis_hobli_code VARCHAR(20)
);

CREATE TABLE location_villages (
    id VARCHAR(30) PRIMARY KEY,
    hobli_id VARCHAR(25) REFERENCES location_hoblis(id),
    name VARCHAR(100) NOT NULL,
    kgis_village_code VARCHAR(20),
    pin_code VARCHAR(6),
    centroid_lat DECIMAL(10,8),
    centroid_lng DECIMAL(11,8)
);

-- Farmer & UDLRN
CREATE TABLE farmers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mobile VARCHAR(10) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    digilocker_id VARCHAR(100),
    protean_verified_name VARCHAR(200),
    voter_epic_no VARCHAR(20),
    identity_match_score DECIMAL(5,2),
    created_at TIMESTAMPTZ DEFAULT now(),
    is_blacklisted BOOLEAN DEFAULT FALSE,
    blacklist_reason TEXT
);

CREATE TABLE udlrn_master (
    udlrn VARCHAR(20) PRIMARY KEY,
    farmer_id UUID REFERENCES farmers(id),
    state_code CHAR(2),
    district_id VARCHAR(15),
    taluk_id VARCHAR(20),
    hobli_id VARCHAR(25),
    village_id VARCHAR(30),
    kgis_village_code VARCHAR(20),
    survey_number VARCHAR(20),
    area_hectares DECIMAL(10,4),
    land_owner_name VARCHAR(200),
    plot_polygon GEOMETRY(POLYGON, 4326),
    centroid_lat DECIMAL(10,8),
    centroid_lng DECIMAL(11,8),
    land_use_type VARCHAR(50),
    payout_account_no VARCHAR(20),
    payout_ifsc VARCHAR(11),
    payout_bank_name VARCHAR(100),
    bank_name_match_score DECIMAL(5,2),
    rto_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_frozen BOOLEAN DEFAULT FALSE
);

CREATE INDEX udlrn_polygon_idx ON udlrn_master 
    USING GIST(plot_polygon);

-- Claims
CREATE TABLE claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_number VARCHAR(20) UNIQUE NOT NULL,
    udlrn VARCHAR(20) REFERENCES udlrn_master(udlrn),
    farmer_id UUID REFERENCES farmers(id),
    csc_operator_id UUID,
    season VARCHAR(20) NOT NULL,
    damage_type VARCHAR(30) NOT NULL,
    damage_date DATE NOT NULL,
    declared_sowing_date DATE NOT NULL,
    declared_crop VARCHAR(50) NOT NULL,
    claim_amount_requested DECIMAL(12,2),
    approved_amount DECIMAL(12,2),
    status VARCHAR(30) DEFAULT 'FILED',
    fraud_score DECIMAL(5,2),
    fraud_flags JSONB DEFAULT '[]',
    satellite_data JSONB,
    true_color_image_url TEXT,
    ndvi_map_url TEXT,
    loss_map_url TEXT,
    ndvi_on_sowing DECIMAL(5,4),
    ndvi_on_claim DECIMAL(5,4),
    ndvi_loss_pct DECIMAL(5,2),
    evidence_pdf_url TEXT,
    reviewer_id UUID,
    review_notes TEXT,
    rejection_reason TEXT,
    esign_doc_id VARCHAR(100),
    esign_status VARCHAR(20) DEFAULT 'PENDING',
    dbt_reference_id VARCHAR(100),
    dbt_status VARCHAR(20),
    rct_mutation_days_before_claim INTEGER,
    imd_weather_confirmed BOOLEAN,
    data_source VARCHAR(30) DEFAULT 'SENTINEL_2',
    model_version VARCHAR(20),
    filed_at TIMESTAMPTZ DEFAULT now(),
    processed_at TIMESTAMPTZ,
    decided_at TIMESTAMPTZ
);

-- CSC Operators
CREATE TABLE csc_operators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    csc_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    email VARCHAR(200) UNIQUE,
    district_id VARCHAR(15),
    is_blocked BOOLEAN DEFAULT FALSE,
    blocked_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin Officers
CREATE TABLE admin_officers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(200) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    role VARCHAR(30) NOT NULL,
    state_code CHAR(2),
    district_id VARCHAR(15),
    password_hash VARCHAR(255) NOT NULL,
    totp_secret VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Admin roles: SUPER_ADMIN, STATE_HEAD, DC, 
--              DISTRICT_OFFICER, FIELD_INSPECTOR

-- CCE Visits
CREATE TABLE cce_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id),
    inspector_id UUID REFERENCES admin_officers(id),
    assigned_at TIMESTAMPTZ DEFAULT now(),
    visited_at TIMESTAMPTZ,
    gps_checkin_lat DECIMAL(10,8),
    gps_checkin_lng DECIMAL(11,8),
    distance_from_plot_meters DECIMAL(10,2),
    actual_area_ha DECIMAL(10,4),
    actual_crop_condition VARCHAR(50),
    yield_estimate_kg_per_ha DECIMAL(10,2),
    photo_urls JSONB DEFAULT '[]',
    inspector_notes TEXT,
    cce_verdict VARCHAR(30),
    status VARCHAR(20) DEFAULT 'ASSIGNED'
);

-- Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_mobile VARCHAR(10),
    recipient_type VARCHAR(20),
    message TEXT NOT NULL,
    channel VARCHAR(20) DEFAULT 'WHATSAPP',
    status VARCHAR(20) DEFAULT 'PENDING',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- DBT Payouts
CREATE TABLE dbt_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id),
    udlrn VARCHAR(20),
    beneficiary_name VARCHAR(200),
    account_no VARCHAR(20),
    ifsc VARCHAR(11),
    amount DECIMAL(12,2),
    scheme_code VARCHAR(20) DEFAULT 'PMFBY',
    pfms_reference_id VARCHAR(100),
    status VARCHAR(20) DEFAULT 'PENDING',
    triggered_at TIMESTAMPTZ DEFAULT now()
);

-- UDLRN Season Lock (cross-state duplicate detection)
CREATE TABLE udlrn_season_lock (
    udlrn VARCHAR(20),
    season_code VARCHAR(20),
    state_code CHAR(2),
    claim_id UUID,
    locked_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (udlrn, season_code)
);

-- Fraud Heatmap (precomputed nightly)
CREATE TABLE fraud_heatmap_daily (
    district_id VARCHAR(15),
    computed_date DATE,
    total_claims INTEGER,
    fraud_claims INTEGER,
    fraud_rate DECIMAL(5,2),
    total_amount_at_risk DECIMAL(15,2),
    PRIMARY KEY (district_id, computed_date)
);

-- Appeal
CREATE TABLE claim_appeals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID REFERENCES claims(id),
    farmer_id UUID,
    appeal_text TEXT NOT NULL,
    photo_urls JSONB DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'SUBMITTED',
    reviewed_by UUID,
    review_notes TEXT,
    submitted_at TIMESTAMPTZ DEFAULT now()
);
