-- V4: Carbon Module Schema

CREATE TABLE IF NOT EXISTS carbon_projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    udlrn            VARCHAR(20) REFERENCES udlrn_master(udlrn),
    farmer_id        UUID REFERENCES farmers(id),
    project_type     VARCHAR(50),
    methodology      VARCHAR(50),
    enrolment_date   DATE,
    verification_due DATE,
    status           VARCHAR(30) DEFAULT 'ENROLLED',
    satellite_monitoring_enabled BOOLEAN DEFAULT TRUE,
    created_at       TIMESTAMPTZ DEFAULT now(),
    updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carbon_measurements (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id           UUID REFERENCES carbon_projects(id),
    measurement_date     DATE NOT NULL,
    ndvi_value           DECIMAL(5,4),
    soil_organic_carbon  DECIMAL(8,4),
    estimated_sequestration DECIMAL(10,4),
    satellite_source     VARCHAR(30),
    measurement_method   VARCHAR(30),
    verified             BOOLEAN DEFAULT FALSE,
    created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carbon_credits (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id        UUID REFERENCES carbon_projects(id),
    farmer_id         UUID REFERENCES farmers(id),
    udlrn             VARCHAR(20),
    credits_amount    DECIMAL(10,4),
    vintage_year      INTEGER,
    registry          VARCHAR(50),
    registry_id       VARCHAR(100),
    market_price_usd  DECIMAL(8,2),
    farmer_share_pct  DECIMAL(5,2) DEFAULT 75.0,
    farmer_payout_inr DECIMAL(12,2),
    status            VARCHAR(30) DEFAULT 'PENDING_VERIFICATION',
    issued_at         TIMESTAMPTZ,
    sold_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS carbon_practices (
    id              SERIAL PRIMARY KEY,
    udlrn           VARCHAR(20),
    practice_type   VARCHAR(50),
    start_date      DATE,
    end_date        DATE,
    satellite_confirmed BOOLEAN DEFAULT FALSE,
    field_confirmed BOOLEAN DEFAULT FALSE
);

ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_enrolled BOOLEAN DEFAULT FALSE;
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS carbon_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS carbon_credits_earned DECIMAL(10,4) DEFAULT 0;
