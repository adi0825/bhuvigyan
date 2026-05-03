-- V2: UI Overhaul — crop phenology calendar + UDLRN area columns + notifications read_at

-- Crop Phenology Calendar
CREATE TABLE IF NOT EXISTS crop_phenology_calendar (
    id SERIAL PRIMARY KEY,
    crop_type VARCHAR(50) NOT NULL,
    season VARCHAR(20) NOT NULL,
    sowing_month_start INTEGER NOT NULL,
    sowing_month_end INTEGER NOT NULL,
    harvest_month INTEGER NOT NULL,
    peak_ndvi_month INTEGER NOT NULL,
    expected_peak_ndvi DECIMAL(4,3) NOT NULL
);

INSERT INTO crop_phenology_calendar (crop_type, season, sowing_month_start, sowing_month_end, harvest_month, peak_ndvi_month, expected_peak_ndvi) VALUES
('PADDY', 'KHARIF', 6, 7, 10, 8, 0.650),
('PADDY', 'RABI', 11, 12, 3, 1, 0.600),
('COTTON', 'KHARIF', 5, 6, 10, 8, 0.550),
('WHEAT', 'RABI', 11, 12, 3, 1, 0.600),
('SUGARCANE', 'KHARIF', 2, 3, 12, 7, 0.700),
('SUGARCANE', 'RABI', 10, 11, 8, 3, 0.700),
('JOWAR', 'KHARIF', 6, 7, 10, 8, 0.500),
('JOWAR', 'RABI', 10, 11, 2, 12, 0.450),
('BAJRA', 'KHARIF', 6, 7, 9, 8, 0.500),
('GROUNDNUT', 'KHARIF', 6, 7, 10, 8, 0.550),
('SUNFLOWER', 'RABI', 11, 12, 3, 1, 0.500),
('MAIZE', 'KHARIF', 6, 7, 9, 8, 0.600),
('RAGI', 'KHARIF', 7, 8, 11, 9, 0.520),
('TUR', 'KHARIF', 6, 7, 12, 9, 0.480);

-- Add kgis_area_ha and rto_area_ha to udlrn_master if not present
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS kgis_area_ha DECIMAL(10,4);
ALTER TABLE udlrn_master ADD COLUMN IF NOT EXISTS rto_area_ha DECIMAL(10,4);

-- Add read_at to notifications for in-app bell
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMPTZ;

-- Add taluk and district_code to admin_officers for filtering
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS taluk VARCHAR(100);
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS district_code VARCHAR(15);
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS failed_logins INTEGER DEFAULT 0;
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE admin_officers ADD COLUMN IF NOT EXISTS created_by UUID;

-- Insurer Portal
CREATE TABLE IF NOT EXISTS insurers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    insurer_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    state_codes TEXT[], -- states this insurer covers
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO insurers (insurer_code, name, password_hash, state_codes) VALUES
('NICL', 'National Insurance Company Ltd', '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH','TN']),
('AIC', 'Agriculture Insurance Company', '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH','AP']),
('HDFC_ERGO', 'HDFC ERGO General Insurance', '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH']),
('RELIANCE_GI', 'Reliance General Insurance', '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH']),
('BAJAJ_ALLIANZ', 'Bajaj Allianz General Insurance', '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH']),
('SBI_GI', 'SBI General Insurance', '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH','AP','TN']);
