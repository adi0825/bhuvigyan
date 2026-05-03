-- V5: Complete seed data — all districts, taluks, insurers, officers, demo records
-- All demo records tagged with is_demo = true
-- Real dashboard stats show 0 on fresh start

-- ─── STEP 0: add is_demo & land_system columns ─────────────────────────────
ALTER TABLE farmers       ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE claims        ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE carbon_projects ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE location_states ADD COLUMN IF NOT EXISTS land_system VARCHAR(20);
ALTER TABLE location_states ADD COLUMN IF NOT EXISTS land_api_url TEXT;
ALTER TABLE location_states ADD COLUMN IF NOT EXISTS land_api_type VARCHAR(10);
ALTER TABLE admin_officers  ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE csc_operators   ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE udlrn_master    ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE udlrn_master    ADD COLUMN IF NOT EXISTS frozen_reason TEXT;
ALTER TABLE udlrn_master    ADD COLUMN IF NOT EXISTS frozen_until TIMESTAMPTZ;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS flag_breakdown JSONB DEFAULT '{}'::jsonb;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS ndvi_timeline JSONB DEFAULT '[]'::jsonb;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS season_type VARCHAR(10);
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS expected_peak_ndvi DECIMAL(4,3);
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(40);
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS land_verified_at TIMESTAMPTZ;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS bank_verified_at TIMESTAMPTZ;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS satellite_queued_at TIMESTAMPTZ;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS scored_at TIMESTAMPTZ;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS decided_at TIMESTAMPTZ;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS rtc_raw JSONB;
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS area_delta_pct DECIMAL(5,2);
ALTER TABLE claims          ADD COLUMN IF NOT EXISTS claim_number VARCHAR(20);
ALTER TABLE csc_operators   ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE csc_operators   ADD COLUMN IF NOT EXISTS mobile VARCHAR(15);
ALTER TABLE notifications   ADD COLUMN IF NOT EXISTS title VARCHAR(200);
ALTER TABLE notifications   ADD COLUMN IF NOT EXISTS related_claim_id UUID;
ALTER TABLE notifications   ADD COLUMN IF NOT EXISTS farmer_id UUID;

-- ─── STEP 1: land system configs per state ─────────────────────────────────
UPDATE location_states SET
    land_system   = 'BHOOMI',
    land_api_url  = 'https://landrecords.karnataka.gov.in',
    land_api_type = 'REST'
WHERE code = 'KA';

UPDATE location_states SET
    land_system   = 'MAHABHUMI',
    land_api_url  = 'https://bhulekh.mahabhumi.gov.in',
    land_api_type = 'SCRAPE'
WHERE code = 'MH';

UPDATE location_states SET
    land_system   = 'DHARANI',
    land_api_url  = 'https://dharani.telangana.gov.in',
    land_api_type = 'REST'
WHERE code = 'TS';

UPDATE location_states SET
    land_system   = 'JAMABANDI',
    land_api_url  = 'https://jamabandi.punjab.gov.in',
    land_api_type = 'REST'
WHERE code = 'PB';

UPDATE location_states SET
    land_system   = 'BHULEKH',
    land_api_url  = 'https://upbhulekh.gov.in',
    land_api_type = 'REST'
WHERE code = 'UP';

UPDATE location_states SET
    land_system   = 'APNA_KHATA',
    land_api_url  = 'https://apnakhata.rajasthan.gov.in',
    land_api_type = 'REST'
WHERE code = 'RJ';

-- ─── STEP 2: All 31 Karnataka districts ────────────────────────────────────
INSERT INTO location_districts (id, state_code, name) VALUES
  ('KA_BAGALKOT',   'KA', 'Bagalkot'),
  ('KA_BALLARI',    'KA', 'Ballari'),
  ('KA_BELAGAVI',   'KA', 'Belagavi'),
  ('KA_BENRL',      'KA', 'Bengaluru Rural'),
  ('KA_BENUR',      'KA', 'Bengaluru Urban'),
  ('KA_BIDAR',      'KA', 'Bidar'),
  ('KA_CHAMRAJ',    'KA', 'Chamarajanagara'),
  ('KA_CHIKBAL',    'KA', 'Chikkaballapura'),
  ('KA_CHIKMAG',    'KA', 'Chikkamagaluru'),
  ('KA_CHITRAD',    'KA', 'Chitradurga'),
  ('KA_DK',         'KA', 'Dakshina Kannada'),
  ('KA_DAVAN',      'KA', 'Davanagere'),
  ('KA_DHARWAD',    'KA', 'Dharwad'),
  ('KA_GADAG',      'KA', 'Gadag'),
  ('KA_HASSAN',     'KA', 'Hassan'),
  ('KA_HAVERI',     'KA', 'Haveri'),
  ('KA_KALAB',      'KA', 'Kalaburagi'),
  ('KA_KODAGU',     'KA', 'Kodagu'),
  ('KA_KOLAR',      'KA', 'Kolar'),
  ('KA_KOPPAL',     'KA', 'Koppal'),
  ('KA_MANDYA',     'KA', 'Mandya'),
  ('KA_MYSURU',     'KA', 'Mysuru'),
  ('KA_RAICHUR',    'KA', 'Raichur'),
  ('KA_RAMAN',      'KA', 'Ramanagara'),
  ('KA_SHIVAM',     'KA', 'Shivamogga'),
  ('KA_TUMAK',      'KA', 'Tumakuru'),
  ('KA_UDUPI',      'KA', 'Udupi'),
  ('KA_UK',         'KA', 'Uttara Kannada'),
  ('KA_VIJAY',      'KA', 'Vijayapura'),
  ('KA_YADGIR',     'KA', 'Yadgir'),
  ('KA_VIJNAN',     'KA', 'Vijayanagara')
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 3: All 36 Maharashtra districts ──────────────────────────────────
INSERT INTO location_districts (id, state_code, name) VALUES
  ('MH_AHMEDNAGAR',  'MH', 'Ahmednagar'),
  ('MH_AKOLA',       'MH', 'Akola'),
  ('MH_AMRAVATI',    'MH', 'Amravati'),
  ('MH_AURANGABAD',  'MH', 'Chhatrapati Sambhajinagar'),
  ('MH_BEED',        'MH', 'Beed'),
  ('MH_BHANDARA',    'MH', 'Bhandara'),
  ('MH_BULDHANA',    'MH', 'Buldhana'),
  ('MH_CHANDRAPUR',  'MH', 'Chandrapur'),
  ('MH_DHULE',       'MH', 'Dhule'),
  ('MH_GADCHIROLI',  'MH', 'Gadchiroli'),
  ('MH_GONDIA',      'MH', 'Gondia'),
  ('MH_HINGOLI',     'MH', 'Hingoli'),
  ('MH_JALGAON',     'MH', 'Jalgaon'),
  ('MH_JALNA',       'MH', 'Jalna'),
  ('MH_KOLHAPUR',    'MH', 'Kolhapur'),
  ('MH_LATUR',       'MH', 'Latur'),
  ('MH_MUMCITY',     'MH', 'Mumbai City'),
  ('MH_MUMSUB',      'MH', 'Mumbai Suburban'),
  ('MH_NAGPUR',      'MH', 'Nagpur'),
  ('MH_NANDED',      'MH', 'Nanded'),
  ('MH_NANDURBAR',   'MH', 'Nandurbar'),
  ('MH_NASHIK',      'MH', 'Nashik'),
  ('MH_OSMANABAD',   'MH', 'Dharashiv'),
  ('MH_PALGHAR',     'MH', 'Palghar'),
  ('MH_PARBHANI',    'MH', 'Parbhani'),
  ('MH_PUNE',        'MH', 'Pune'),
  ('MH_RAIGAD',      'MH', 'Raigad'),
  ('MH_RATNAGIRI',   'MH', 'Ratnagiri'),
  ('MH_SANGLI',      'MH', 'Sangli'),
  ('MH_SATARA',      'MH', 'Satara'),
  ('MH_SINDHUDURG',  'MH', 'Sindhudurg'),
  ('MH_SOLAPUR',     'MH', 'Solapur'),
  ('MH_THANE',       'MH', 'Thane'),
  ('MH_WARDHA',      'MH', 'Wardha'),
  ('MH_WASHIM',      'MH', 'Washim'),
  ('MH_YAVATMAL',    'MH', 'Yavatmal')
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 4: Sample taluks for demo districts ──────────────────────────────
INSERT INTO location_taluks (id, district_id, name) VALUES
  ('KA_BAGALKOT_T1',  'KA_BAGALKOT', 'Bagalkot'),
  ('KA_BAGALKOT_T2',  'KA_BAGALKOT', 'Badami'),
  ('KA_BAGALKOT_T3',  'KA_BAGALKOT', 'Bilagi'),
  ('KA_BAGALKOT_T4',  'KA_BAGALKOT', 'Hungund'),
  ('KA_BAGALKOT_T5',  'KA_BAGALKOT', 'Jamkhandi'),
  ('KA_BAGALKOT_T6',  'KA_BAGALKOT', 'Mudhol'),
  ('MH_NANDED_T1',    'MH_NANDED',   'Nanded'),
  ('MH_NANDED_T2',    'MH_NANDED',   'Bhokar'),
  ('MH_NANDED_T3',    'MH_NANDED',   'Biloli'),
  ('MH_NANDED_T4',    'MH_NANDED',   'Deglur'),
  ('MH_NANDED_T5',    'MH_NANDED',   'Dharmabad'),
  ('MH_PUNE_T1',      'MH_PUNE',     'Pune City'),
  ('MH_PUNE_T2',      'MH_PUNE',     'Haveli'),
  ('MH_PUNE_T3',      'MH_PUNE',     'Baramati')
ON CONFLICT (id) DO NOTHING;

-- Sample hoblis
INSERT INTO location_hoblis (id, taluk_id, name) VALUES
  ('KA_BAGALKOT_H1', 'KA_BAGALKOT_T1', 'Bagalkot'),
  ('KA_BAGALKOT_H2', 'KA_BAGALKOT_T2', 'Badami'),
  ('MH_NANDED_H1',   'MH_NANDED_T1',   'Nanded'),
  ('MH_NANDED_H2',   'MH_NANDED_T2',   'Bhokar')
ON CONFLICT (id) DO NOTHING;

-- Sample villages
INSERT INTO location_villages (id, hobli_id, name) VALUES
  ('KA_BAG_V1', 'KA_BAGALKOT_H1', 'Gaddankeri'),
  ('KA_BAG_V2', 'KA_BAGALKOT_H1', 'Mahalingpur'),
  ('KA_BAG_V3', 'KA_BAGALKOT_H2', 'Aihole'),
  ('MH_NAN_V1', 'MH_NANDED_H1',   'Vazirabad'),
  ('MH_NAN_V2', 'MH_NANDED_H2',   'Kandhar')
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 5: Additional crop phenology rows ─────────────────────────────────
INSERT INTO crop_phenology_calendar (crop_type, season, sowing_month_start, sowing_month_end, harvest_month, peak_ndvi_month, expected_peak_ndvi) VALUES
  ('JOWAR',     'KHARIF', 6, 7, 10, 8, 0.500),
  ('BAJRA',     'KHARIF', 6, 7,  9, 8, 0.450),
  ('RAGI',      'KHARIF', 7, 8, 11, 9, 0.520),
  ('SUNFLOWER', 'RABI',  11,12,  3, 1, 0.500)
ON CONFLICT DO NOTHING;

-- ─── STEP 6: All 8 insurer accounts ─────────────────────────────────────────
INSERT INTO insurers (insurer_code, name, password_hash, state_codes) VALUES
  ('UNIVERSAL_SOMPO', 'Universal Sompo General Insurance',
   '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH']),
  ('IFFCO_TOKIO', 'IFFCO-Tokio General Insurance',
   '$2a$12$LJ3m.F0zE8f5f5g5g5g5gOMxH.H0H0H0H0H0H0H0H0H0H0H0H0H', ARRAY['KA','MH','AP'])
ON CONFLICT (insurer_code) DO NOTHING;

-- ─── STEP 7: All admin officer roles ────────────────────────────────────────
-- bcrypt of 'Admin@123'
DO $$
DECLARE pwd TEXT := '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh1y';
BEGIN
  INSERT INTO admin_officers (id, email, full_name, role, password_hash, state_code, district_id, is_demo) VALUES
    ('aaaaaaaa-0000-0000-0000-000000000001', 'superadmin@bhuvigyan.gov.in',         'System Super Admin',     'SUPER_ADMIN',      pwd, NULL,  NULL,          TRUE),
    ('aaaaaaaa-0000-0000-0000-000000000002', 'statehead.ka@bhuvigyan.gov.in',       'Karnataka State Head',   'STATE_HEAD',       pwd, 'KA', NULL,          TRUE),
    ('aaaaaaaa-0000-0000-0000-000000000003', 'dc.bagalkot@bhuvigyan.gov.in',        'DC Bagalkot',            'DC',               pwd, 'KA', 'KA_BAGALKOT', TRUE),
    ('aaaaaaaa-0000-0000-0000-000000000004', 'officer.bagalkot@bhuvigyan.gov.in',   'Suresh Kumar (DO)',      'DISTRICT_OFFICER', pwd, 'KA', 'KA_BAGALKOT', TRUE),
    ('aaaaaaaa-0000-0000-0000-000000000005', 'inspector1@bhuvigyan.gov.in',         'Ramesh Field Inspector', 'FIELD_INSPECTOR',  pwd, 'KA', 'KA_BAGALKOT', TRUE)
  ON CONFLICT (id) DO NOTHING;
END $$;

-- ─── STEP 8: 2 CSC operators ─────────────────────────────────────────────────
INSERT INTO csc_operators (id, csc_id, name, email, district_id, is_demo, password_hash, mobile) VALUES
  ('cccccccc-0001-0000-0000-000000000001', 'CSC-KA-001', 'Ramesh Operators Bagalkot',  'csc.ka01@gmail.com', 'KA_BAGALKOT', TRUE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh1y', '9876500001'),
  ('cccccccc-0002-0000-0000-000000000002', 'CSC-MH-001', 'Nanded CSC Centre',          'csc.mh01@gmail.com', 'MH_NANDED',   TRUE, '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh1y', '9876500002')
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 9: 3 demo farmers with KA/MH/PB plots ──────────────────────────────
INSERT INTO farmers (id, mobile, full_name, is_blacklisted, is_demo) VALUES
  ('f1111111-1111-1111-1111-111111111111', '9876543210', 'Raju Patil',      FALSE, TRUE),
  ('f2222222-2222-2222-2222-222222222222', '9876543211', 'Sunita Desai',    FALSE, TRUE),
  ('f3333333-3333-3333-3333-333333333333', '9876543212', 'Harpreet Singh',  FALSE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 10: UDLRN master records for demo farmers ──────────────────────────
INSERT INTO udlrn_master (udlrn, farmer_id, state_code, district_id, taluk_id, survey_number, area_hectares, land_use_type, is_demo) VALUES
  ('KA-BAGALKOT-A1B2C3-07', 'f1111111-1111-1111-1111-111111111111', 'KA', 'KA_BAGALKOT', 'KA_BAGALKOT_T1', 'SY-101/2A', 2.5, 'AGRICULTURAL', TRUE),
  ('MH-NANDED-D4E5F6-13',   'f2222222-2222-2222-2222-222222222222', 'MH', 'MH_NANDED',   'MH_NANDED_T1',   'GAT-202',   1.8, 'AGRICULTURAL', TRUE),
  ('PB-LUDHIANA-G7H8I9-21', 'f3333333-3333-3333-3333-333333333333', 'PB', NULL,          NULL,             'KHASRA-303', 3.0, 'AGRICULTURAL', TRUE)
ON CONFLICT (udlrn) DO NOTHING;

-- ─── STEP 11: 5 demo claims covering all pipeline statuses ───────────────────
INSERT INTO claims (id, claim_number, udlrn, farmer_id, season, damage_type, damage_date, declared_sowing_date, declared_crop, status, fraud_score, season_type, is_demo, pipeline_stage, flag_breakdown) VALUES
  ('c1111111-0000-0000-0000-000000000001', 'CLM-2026-D0001',
   'KA-BAGALKOT-A1B2C3-07', 'f1111111-1111-1111-1111-111111111111',
   'KHARIF_2025', 'DROUGHT', '2025-10-15', '2025-06-10', 'PADDY',
   'APPROVED', 22, 'KHARIF', TRUE, 'VERDICT_ISSUED',
   '{"WEATHER_MISMATCH": {"weight": 25, "source": "IMD", "description": "Rainfall data confirms minor drought"}}'::jsonb),

  ('c2222222-0000-0000-0000-000000000002', 'CLM-2026-D0002',
   'MH-NANDED-D4E5F6-13', 'f2222222-2222-2222-2222-222222222222',
   'KHARIF_2025', 'FLOOD', '2025-09-10', '2025-06-05', 'COTTON',
   'REJECTED_FRAUD', 88, 'KHARIF', TRUE, 'VERDICT_ISSUED',
   '{"PHANTOM_FARM": {"weight": 80, "source": "SATELLITE", "description": "Baseline NDVI below 0.15 — no prior cultivation detected"}}'::jsonb),

  ('c3333333-0000-0000-0000-000000000003', 'CLM-2026-D0003',
   'KA-BAGALKOT-A1B2C3-07', 'f1111111-1111-1111-1111-111111111111',
   'RABI_2025', 'PEST', '2025-12-05', '2025-11-15', 'WHEAT',
   'OFFICER_REVIEW', 51, 'RABI', TRUE, 'VERDICT_ISSUED',
   '{"AREA_INFLATION": {"weight": 25, "source": "KGIS", "description": "KGIS area vs RTC area delta is 22%"}}'::jsonb),

  ('c4444444-0000-0000-0000-000000000004', 'CLM-2026-D0004',
   'MH-NANDED-D4E5F6-13', 'f2222222-2222-2222-2222-222222222222',
   'RABI_2025', 'HAIL', '2026-01-20', '2025-11-01', 'GRAM',
   'CCE_VISIT', 65, 'RABI', TRUE, 'CCE_ASSIGNED',
   '{"RETROACTIVE_CLAIM": {"weight": 40, "source": "KGIS", "description": "Pre-sowing NDVI was >0.5 — crop was healthy before claimed damage date"}}'::jsonb),

  ('c5555555-0000-0000-0000-000000000005', 'CLM-2026-D0005',
   'KA-BAGALKOT-A1B2C3-07', 'f1111111-1111-1111-1111-111111111111',
   'KHARIF_2024', 'CYCLONE', '2024-11-10', '2024-06-20', 'PADDY',
   'APPEALED', 71, 'KHARIF', TRUE, 'VERDICT_ISSUED',
   '{"LOCATION_MISMATCH": {"weight": 45, "source": "KGIS", "description": "GPS coordinates do not match declared village boundary"}}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ─── STEP 12: 1 demo carbon project ──────────────────────────────────────────
INSERT INTO carbon_projects (id, udlrn, farmer_id, project_type, methodology, enrolment_date, status, is_demo) VALUES
  ('e1111111-0000-0000-0000-000000000001',
   'KA-BAGALKOT-A1B2C3-07', 'f1111111-1111-1111-1111-111111111111',
   'DIRECT_SEEDED_RICE', 'VM0042', '2025-06-01', 'ENROLLED', TRUE)
ON CONFLICT (id) DO NOTHING;
