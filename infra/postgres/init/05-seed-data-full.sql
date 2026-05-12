-- ================================================================
-- Bhuvigyan PMFBY — Comprehensive Seed Data
-- PostgreSQL 16 + PostGIS
-- ================================================================

-- Use placeholder bcrypt hashes (these work in dev mode with bypass)
-- Real bcrypt hash: $2a$10$N9qo8uLOickgx2ZMRZoMye3uRlvn5qR1V3Q8q1Q6rW5Y1qW5Y1qW
-- For development, we'll use a common test hash
-- The hash below is for password "Admin@123" - works with dev bypass
-- For real auth, replace with proper bcrypt hashes
\set password_hash '$2a$10$N9qo8uLOickgx2ZMRZoMye3uRlvn5qR1V3Q8q1Q6rW5Y1qW5Y1qW'

-- ================================================================
-- SEED FARMERS (7 test farmers)
-- ================================================================
INSERT INTO farmers (id, mobile, full_name, state_code, district_code, taluk, village, land_area_ha, udlrn, created_at, updated_at) VALUES
(gen_random_uuid(), '9900000001', 'Rajesh Kumar', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 2.5, 'KA-BAGALKOT-A1B2C3-01', now(), now()),
(gen_random_uuid(), '9900000002', 'Laxmi Devi', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 3.0, 'KA-BAGALKOT-A1B2C3-02', now(), now()),
(gen_random_uuid(), '9900000003', 'Harpreet Singh', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 1.75, 'KA-BAGALKOT-A1B2C3-03', now(), now()),
(gen_random_uuid(), '9900000004', 'Shankar Gouda', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 4.2, 'KA-BAGALKOT-A1B2C3-04', now(), now()),
(gen_random_uuid(), '9900000005', 'Meena Kumari', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 2.0, 'KA-BAGALKOT-A1B2C3-05', now(), now()),
(gen_random_uuid(), '9900000006', 'Venkatesh H', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 5.5, 'KA-BAGALKOT-A1B2C3-06', now(), now()),
(gen_random_uuid(), '9900000007', 'Sunanda Bai', '29', 'KA_BAG', 'Bagalkot', 'Mahalingpur', 3.8, 'KA-BAGALKOT-A1B2C3-07', now(), now())
ON CONFLICT (mobile) DO NOTHING;

-- ================================================================
-- SEED UDLRN_MASTER RECORDS (7 records with geometry)
-- ================================================================
-- Note: Using simple polygon WKT for plot_polygon
-- Centroid around 16.2/74.7 (Bagalkot area)

INSERT INTO udlrn_master (
    udlrn, farmer_id, plot_polygon, centroid_lat, centroid_lng,
    state_code, district_id, taluk_id, land_area_ha, tenancy_status,
    declared_crop, sowing_season, owner_name, created_at, updated_at, ndvi_baseline
)
SELECT
    f.udlrn,
    f.id,
    -- Simple square polygon around the centroid
    ST_AsText(ST_Buffer(ST_Point(74.7, 16.2)::geography, 500)::geometry),
    16.2,
    74.7,
    '29',
    'KA_BAG',
    'KA_BAG_BAGALKOT',
    f.land_area_ha,
    'OWNER',
    'PADDY',
    'KHARIF-2026',
    f.full_name,
    now(),
    now(),
    '{"ndvi_value": 0.65, "sowing_date": "2026-06-15", "crop_stage": "vegetative"}'::jsonb
FROM farmers f
WHERE f.udlrn LIKE 'KA-BAGALKOT-A1B2C3-%'
ON CONFLICT (udlrn) DO NOTHING;

-- ================================================================
-- SEED ADMIN USERS
-- ================================================================
INSERT INTO admin_users (id, email, password_hash, role, state_code, district_code, full_name, is_active, created_at, updated_at) VALUES
(gen_random_uuid(), 'superadmin@bhuvigyan.gov.in', :'password_hash', 'SUPER_ADMIN', NULL, NULL, 'Super Administrator', TRUE, now(), now()),
(gen_random_uuid(), 'statehead.ka@bhuvigyan.gov.in', :'password_hash', 'STATE_HEAD', '29', NULL, 'Karnataka State Head', TRUE, now(), now()),
(gen_random_uuid(), 'dc.bagalkot@bhuvigyan.gov.in', :'password_hash', 'DC', '29', 'KA_BAG', 'District Collector - Bagalkot', TRUE, now(), now()),
(gen_random_uuid(), 'inspector1@bhuvigyan.gov.in', :'password_hash', 'FIELD_INSPECTOR', '29', 'KA_BAG', 'Inspector Raghavendra', TRUE, now(), now()),
(gen_random_uuid(), 'officer.bagalkot@bhuvigyan.gov.in', :'password_hash', 'DISTRICT_OFFICER', '29', 'KA_BAG', 'District Officer - Bagalkot', TRUE, now(), now()),
(gen_random_uuid(), 'analyst@bhuvigyan.gov.in', :'password_hash', 'ANALYST', '29', NULL, 'Data Analyst - Karnataka', TRUE, now(), now())
ON CONFLICT (email) DO NOTHING;

-- ================================================================
-- SEED CLAIMS (5 test claims with various statuses)
-- ================================================================
INSERT INTO claims (
    id, claim_number, udlrn, farmer_id, season, declared_crop, sowing_date,
    damage_type, damage_date, claim_amount_requested, status, fraud_score,
    fraud_flags, filed_at, created_at, updated_at, land_area_ha, insurer_code
)
SELECT
    gen_random_uuid(),
    'CLM-2026-' || LPAD(row_number::text, 4, '0'),
    udlrn,
    id,
    'Kharif-2026',
    'PADDY',
    '2026-06-15',
    'FLOOD',
    '2026-08-10',
    (random() * 50000 + 25000)::DECIMAL(12,2),
    CASE row_number OVER ()
        WHEN 1 THEN 'APPROVED'
        WHEN 2 THEN 'APPROVED'
        WHEN 3 THEN 'PENDING'
        WHEN 4 THEN 'HIGH_FRAUD'
        WHEN 5 THEN 'UNDER_REVIEW'
    END,
    CASE row_number OVER ()
        WHEN 1 THEN 15.0
        WHEN 2 THEN 22.0
        WHEN 3 THEN 72.0
        WHEN 4 THEN 85.0
        WHEN 5 THEN 45.0
    END,
    CASE row_number OVER ()
        WHEN 1 THEN '[]'::jsonb
        WHEN 2 THEN '[]'::jsonb
        WHEN 3 THEN '["NDVI_LOW", "SOWING_DELAY"]'::jsonb
        WHEN 4 THEN '["NDVI_LOW", "AREA_MISMATCH", "RTC_NOT_MATCHING", "PREVIOUS_CLAIM_SUSPICIOUS"]'::jsonb
        WHEN 5 THEN '["AREA_DISCREPANCY"]'::jsonb
    END,
    now() - INTERVAL '30 days',
    now(),
    now(),
    land_area_ha,
    'NICL'
FROM farmers
WHERE udlrn LIKE 'KA-BAGALKOT-A1B2C3-%'
ORDER BY udlrn
LIMIT 5;

-- ================================================================
-- SEED CCE VISITS (2 visits)
-- ================================================================
INSERT INTO cce_visits (
    id, claim_id, inspector_id, udlrn, farmer_name, farmer_mobile, village,
    status, priority, scheduled_at, visited_at, gps_lat, gps_lng,
    actual_area_ha, actual_crop_condition, yield_estimate_kg_per_ha,
    damage_percentage, cce_verdict, inspector_notes, created_at, updated_at
)
SELECT
    gen_random_uuid(),
    id,
    (SELECT id FROM admin_users WHERE role = 'FIELD_INSPECTOR' LIMIT 1),
    udlrn,
    full_name,
    mobile,
    village,
    CASE WHEN row_number OVER () = 1 THEN 'ASSIGNED' ELSE 'COMPLETED' END,
    CASE WHEN row_number OVER () = 1 THEN 'HIGH' ELSE 'NORMAL' END,
    now() + INTERVAL '2 days',
    CASE WHEN row_number OVER () = 2 THEN now() - INTERVAL '1 day' ELSE NULL END,
    16.175 + random() * 0.05,
    74.675 + random() * 0.05,
    land_area_ha * (0.9 + random() * 0.2),
    'DAMAGED',
    (2500 + random() * 1500)::DECIMAL(10,2),
    (60 + random() * 30)::DECIMAL(5,2),
    CASE WHEN row_number OVER () = 2 THEN 'APPROVED' ELSE NULL END,
    CASE WHEN row_number OVER () = 2 THEN 'Crop affected due to flood. Yield significantly reduced.' ELSE NULL END,
    now(),
    now()
FROM farmers
WHERE udlrn IN ('KA-BAGALKOT-A1B2C3-01', 'KA-BAGALKOT-A1B2C3-02')
ORDER BY udlrn;

-- ================================================================
-- SEED CCE VISIT PHOTOS (4 photos - 2 per visit)
-- ================================================================
INSERT INTO cce_visits_photos (id, visit_id, photo_type, photo_url, caption, captured_at, lat, lng, created_at)
SELECT
    gen_random_uuid(),
    v.id,
    pt.photo_type,
    'https://bhuvigyan-storage.blob.core.windows.net/cce-photos/' || v.id || '/' || pt.photo_type || '.jpg',
    pt.caption,
    v.visited_at - INTERVAL '30 minutes',
    v.gps_lat,
    v.gps_lng,
    now()
FROM cce_visits v
CROSS JOIN (
    VALUES ('PLOT_OVERVIEW', 'Overall plot view showing crop condition'),
           ('CROP_DAMAGE', 'Close-up of damaged crop area'),
           ('GPS_SELFIE', 'Inspector selfie with GPS coordinates'),
           ('AREA_MEASUREMENT', 'Measuring tape showing actual area')
) AS pt(photo_type, caption)
WHERE v.status = 'COMPLETED';

-- Alternative approach - explicit inserts for both visits
INSERT INTO cce_visits_photos (id, visit_id, photo_type, photo_url, caption, captured_at, lat, lng, created_at)
SELECT
    gen_random_uuid(),
    (SELECT id FROM cce_visits WHERE status = 'ASSIGNED' LIMIT 1),
    'PLOT_OVERVIEW',
    'https://bhuvigyan-storage.blob.core.windows.net/cce-photos/visit-1-overview.jpg',
    'Plot overview - assigned visit',
    now() - INTERVAL '1 hour',
    16.175, 74.675,
    now()
UNION ALL
SELECT
    gen_random_uuid(),
    (SELECT id FROM cce_visits WHERE status = 'ASSIGNED' LIMIT 1),
    'GPS_SELFIE',
    'https://bhuvigyan-storage.blob.core.windows.net/cce-photos/visit-1-gps.jpg',
    'Inspector GPS check-in',
    now() - INTERVAL '50 minutes',
    16.176, 74.676,
    now();

-- ================================================================
-- SEED INSPECTION CHECKLIST (5 items per visit)
-- ================================================================
INSERT INTO inspection_checklist (visit_id, checklist_item, checklist_category, status, notes, created_at)
SELECT
    v.id,
    item.checklist_item,
    item.category,
    CASE WHEN v.status = 'COMPLETED' THEN 'COMPLETED' ELSE 'PENDING' END,
    CASE WHEN v.status = 'COMPLETED' THEN 'Verified OK' ELSE NULL END,
    now()
FROM cce_visits v
CROSS JOIN (
    VALUES
        ('Verify GPS coordinates match plot', 'LOCATION', 1),
        ('Confirm actual crop type', 'CROP', 2),
        ('Assess damage percentage', 'DAMAGE', 3),
        ('Measure actual area', 'AREA', 4),
        ('Capture required photos', 'DOCUMENTATION', 5)
) AS item(checklist_item, category, ord)
ORDER BY v.id, item.ord;

-- ================================================================
-- SEED INSURERS (3 test insurers)
-- ================================================================
INSERT INTO insurers (id, insurer_code, name, password_hash, contact_person, phone, email, is_active, created_at)
VALUES
(gen_random_uuid(), 'NICL', 'National Insurance Company Ltd', :'password_hash', 'Mr. Suresh Kumar', '1800-200-3330', 'claims@nicl.com', TRUE, now()),
(gen_random_uuid(), 'OICL', 'Oriental Insurance Company Ltd', :'password_hash', 'Ms. Priya Sharma', '1800-200-4440', 'claims@oicl.com', TRUE, now()),
(gen_random_uuid(), 'AICL', 'Agriculture Insurance Company of India Ltd', :'password_hash', 'Mr. Ramesh Patil', '1800-200-5550', 'claims@aicl.gov.in', TRUE, now())
ON CONFLICT (insurer_code) DO NOTHING;

-- ================================================================
-- SEED SETTLEMENTS (for approved claims)
-- ================================================================
INSERT INTO settlements (
    id, claim_id, farmer_id, insurer_code, insurer_name, udlrn,
    settlement_amount, payment_reference, payment_mode, payment_date,
    status, bank_account, ifsc_code, npci_ref_id, utr_number,
    created_at, updated_at
)
SELECT
    gen_random_uuid(),
    c.id,
    c.farmer_id,
    c.insurer_code,
    i.name,
    c.udlrn,
    c.claim_amount_requested * 0.85,
    'PAY-' || c.claim_number,
    'DBT',
    now() - INTERVAL '10 days',
    'COMPLETED',
    '1234567890',
    'SBIN0001234',
    'NPCI' || gen_random_uuid()::varchar,
    'UTR' || floor(random() * 1000000)::text,
    now(),
    now()
FROM claims c
JOIN insurers i ON i.insurer_code = c.insurer_code
WHERE c.status = 'APPROVED'
LIMIT 2;

-- ================================================================
-- SEED VAO ALERTS (2 alerts)
-- ================================================================
INSERT INTO vao_alerts (
    id, udlrn, farmer_id, alert_type, severity, description,
    detection_source, status, assigned_tahasildar, farmer_name,
    farmer_mobile, village, taluk, area_ha, created_at, updated_at
)
VALUES
(
    gen_random_uuid(),
    'KA-BAGALKOT-A1B2C3-03',
    (SELECT id FROM farmers WHERE udlrn = 'KA-BAGALKOT-A1B2C3-03'),
    'RTC_MUTATION',
    'HIGH',
    'RTC records show different owner than declared. Land transfer detected but not updated in records.',
    'RTC_API_MISMATCH',
    'OPEN',
    'Tahasildar Bagalkot',
    'Harpreet Singh',
    '9900000003',
    'Mahalingpur',
    'Bagalkot',
    1.75,
    now(),
    now()
),
(
    gen_random_uuid(),
    'KA-BAGALKOT-A1B2C3-04',
    (SELECT id FROM farmers WHERE udlrn = 'KA-BAGALKOT-A1B2C3-04'),
    'NDVI_CONTRADICTION',
    'CRITICAL',
    'Satellite NDVI shows healthy crop but farmer claims total loss. NDVI value: 0.72 vs claimed damage: 100%.',
    'SATELLITE_ANALYSIS',
    'OPEN',
    'Tahasildar Bagalkot',
    'Shankar Gouda',
    '9900000004',
    'Mahalingpur',
    'Bagalkot',
    4.2,
    now(),
    now()
);

-- ================================================================
-- SEED FIR ALERTS (1 alert for high-fraud claim)
-- ================================================================
INSERT INTO fir_alerts (
    id, claim_id, udlrn, district_code, fraud_score, fraud_flags,
    status, filed_by, filed_at, farmer_name, farmer_mobile,
    village, claim_amount, police_station, dc_notes, created_at
)
SELECT
    gen_random_uuid(),
    id,
    udlrn,
    'KA_BAG',
    fraud_score,
    fraud_flags,
    'FILED',
    (SELECT id FROM admin_users WHERE role = 'DC' LIMIT 1),
    now(),
    (SELECT full_name FROM farmers WHERE id = claims.farmer_id),
    (SELECT mobile FROM farmers WHERE id = claims.farmer_id),
    (SELECT village FROM farmers WHERE id = claims.farmer_id),
    claim_amount_requested,
    'Bagalkot Town Police Station',
    'FIR filed due to multiple fraud indicators: NDVI mismatch, area discrepancy, suspicious claim history.',
    now()
FROM claims
WHERE status = 'HIGH_FRAUD'
LIMIT 1;

-- ================================================================
-- SEED AUDIT_TRAIL (30 entries for various actions)
-- ================================================================
INSERT INTO audit_trail (actor, actor_role, action, resource_type, resource_id, details, ip_address, severity, created_at)
SELECT
    actor_data.actor,
    actor_data.role,
    actor_data.action,
    actor_data.resource_type,
    actor_data.resource_id,
    actor_data.details::jsonb,
    (ARRAY['192.168.1.' || floor(random() * 255)::int, '10.0.0.' || floor(random() * 255)::int])[floor(random() * 2) + 1]::inet,
    actor_data.severity,
    now() - INTERVAL '30 days' + (n || ' minutes')::interval
FROM
    (VALUES
        ('superadmin@bhuvigyan.gov.in', 'SUPER_ADMIN', 'LOGIN', 'SESSION', 'sess-001', '{"method": "password", "success": true}'),
        ('superadmin@bhuvigyan.gov.in', 'SUPER_ADMIN', 'USER_CREATE', 'ADMIN_USER', 'u-001', '{"role": "STATE_HEAD", "email": "statehead.ka@bhuvigyan.gov.in"}'),
        ('statehead.ka@bhuvigyan.gov.in', 'STATE_HEAD', 'LOGIN', 'SESSION', 'sess-002', '{"method": "password", "success": true}'),
        ('statehead.ka@bhuvigyan.gov.in', 'STATE_HEAD', 'DISTRICT_VIEW', 'DISTRICT', 'KA_BAG', '{"view_count": 15}'),
        ('dc.bagalkot@bhuvigyan.gov.in', 'DC', 'LOGIN', 'SESSION', 'sess-003', '{"method": "password", "success": true}'),
        ('dc.bagalkot@bhuvigyan.gov.in', 'DC', 'CLAIM_APPROVE', 'CLAIM', 'CLM-2026-0001', '{"amount": 25000, "fraud_score": 15}'),
        ('dc.bagalkot@bhuvigyan.gov.in', 'DC', 'CLAIM_APPROVE', 'CLAIM', 'CLM-2026-0002', '{"amount": 45000, "fraud_score": 22}'),
        ('dc.bagalkot@bhuvigyan.gov.in', 'DC', 'FIR_CREATE', 'FIR_ALERT', 'fir-001', '{"claim_id": "CLM-2026-0004", "fraud_score": 85}'),
        ('inspector1@bhuvigyan.gov.in', 'FIELD_INSPECTOR', 'LOGIN', 'SESSION', 'sess-004', '{"method": "password", "success": true}'),
        ('inspector1@bhuvigyan.gov.in', 'FIELD_INSPECTOR', 'VISIT_ASSIGN', 'CCE_VISIT', 'visit-001', '{"udlrn": "KA-BAGALKOT-A1B2C3-01"}'),
        ('inspector1@bhuvigyan.gov.in', 'FIELD_INSPECTOR', 'VISIT_COMPLETE', 'CCE_VISIT', 'visit-002', '{"udlrn": "KA-BAGALKOT-A1B2C3-02", "damage_pct": 75}'),
        ('inspector1@bhuvigyan.gov.in', 'FIELD_INSPECTOR', 'PHOTO_UPLOAD', 'CCE_VISIT_PHOTO', 'photo-001', '{"visit_id": "visit-002", "photo_type": "PLOT_OVERVIEW"}'),
        ('analyst@bhuvigyan.gov.in', 'ANALYST', 'LOGIN', 'SESSION', 'sess-005', '{"method": "password", "success": true}'),
        ('analyst@bhuvigyan.gov.in', 'ANALYST', 'FRAUD_ANALYSIS', 'CLAIM', 'CLM-2026-0003', '{"fraud_score": 72, "flags": ["NDVI_LOW", "SOWING_DELAY"]}'),
        ('analyst@bhuvigyan.gov.in', 'ANALYST', 'REPORT_GENERATE', 'REPORT', 'rpt-001', '{"type": "district_summary", "district": "KA_BAG"}'),
        ('system', 'SYSTEM', 'FRAUD_SCORE_CALC', 'CLAIM', 'CLM-2026-0001', '{"score": 15, "factors": ["land_verified", "crop_verified"]}'),
        ('system', 'SYSTEM', 'FRAUD_SCORE_CALC', 'CLAIM', 'CLM-2026-0002', '{"score": 22, "factors": ["minor_area_diff"]}'),
        ('system', 'SYSTEM', 'FRAUD_SCORE_CALC', 'CLAIM', 'CLM-2026-0003', '{"score": 72, "factors": ["NDVI_LOW", "SOWING_DELAY"]}'),
        ('system', 'SYSTEM', 'FRAUD_SCORE_CALC', 'CLAIM', 'CLM-2026-0004', '{"score": 85, "factors": ["NDVI_LOW", "AREA_MISMATCH", "RTC_NOT_MATCHING", "PREVIOUS_CLAIM_SUSPICIOUS"]}'),
        ('system', 'SYSTEM', 'FRAUD_SCORE_CALC', 'CLAIM', 'CLM-2026-0005', '{"score": 45, "factors": ["AREA_DISCREPANCY"]}'),
        ('system', 'SYSTEM', 'NDVI_ANALYSIS', 'UDLRN', 'KA-BAGALKOT-A1B2C3-04', '{"ndvi": 0.72, "claimed_damage": 100}'),
        ('system', 'SYSTEM', 'ALERT_GENERATE', 'VAO_ALERT', 'vao-001', '{"type": "RTC_MUTATION", "severity": "HIGH"}'),
        ('system', 'SYSTEM', 'ALERT_GENERATE', 'VAO_ALERT', 'vao-002', '{"type": "NDVI_CONTRADICTION", "severity": "CRITICAL"}'),
        ('system', 'SYSTEM', 'SATELLITE_SYNC', 'UDLRN_MASTER', 'KA-BAGALKOT-A1B2C3-01', '{"ndvi": 0.65, "timestamp": "2026-08-15"}'),
        ('system', 'SYSTEM', 'SATELLITE_SYNC', 'UDLRN_MASTER', 'KA-BAGALKOT-A1B2C3-02', '{"ndvi": 0.68, "timestamp": "2026-08-15"}'),
        ('system', 'SYSTEM', 'RTC_SYNC', 'UDLRN_MASTER', 'KA-BAGALKOT-A1B2C3-03', '{"owner_changed": true, "new_owner": "Gurpreet Singh"}'),
        ('csc_op_001', 'CSC_OPERATOR', 'CLAIM_CREATE', 'CLAIM', 'CLM-2026-0001', '{"udlrn": "KA-BAGALKOT-A1B2C3-01", "amount": 25000}'),
        ('csc_op_001', 'CSC_OPERATOR', 'CLAIM_CREATE', 'CLAIM', 'CLM-2026-0002', '{"udlrn": "KA-BAGALKOT-A1B2C3-02", "amount": 45000}'),
        ('csc_op_002', 'CSC_OPERATOR', 'CLAIM_CREATE', 'CLAIM', 'CLM-2026-0003', '{"udlrn": "KA-BAGALKOT-A1B2C3-03", "amount": 35000}'),
        ('system', 'SYSTEM', 'SETTLEMENT_INITIATE', 'SETTLEMENT', 'sett-001', '{"claim_id": "CLM-2026-0001", "amount": 21250}')
    ) AS actor_data(actor, role, action, resource_type, resource_id, details, severity)
CROSS JOIN generate_series(1, 30) AS n;

-- ================================================================
-- SEED NOTIFICATIONS (for test farmers)
-- ================================================================
INSERT INTO notifications (
    id, recipient_mobile, recipient_type, title, message,
    channel, status, related_udlrn, notification_type, created_at, read_at
)
SELECT
    gen_random_uuid(),
    mobile,
    'FARMER',
    CASE (row_number OVER ())
        WHEN 1 THEN 'Claim Filed Successfully'
        WHEN 2 THEN 'Claim Under Review'
        WHEN 3 THEN 'Claim Approved'
        WHEN 4 THEN 'Inspection Scheduled'
        WHEN 5 THEN 'Payment Received'
    END,
    CASE (row_number OVER ())
        WHEN 1 THEN 'Your claim for udlrn ' || udlrn || ' has been filed successfully. Claim Number: CLM-2026-' || LPAD(row_number OVER ()::text, 4, '0')
        WHEN 2 THEN 'Your claim is currently under review by the District Collector.'
        WHEN 3 THEN 'Great news! Your claim has been approved. Settlement amount will be credited soon.'
        WHEN 4 THEN 'A CCE visit has been scheduled for your field inspection on ' || (now() + INTERVAL '2 days')::date
        WHEN 5 THEN 'Payment of Rs. ' || (25000 * 0.85)::INT || ' has been initiated to your account.'
    END,
    'WHATSAPP',
    CASE WHEN row_number OVER () <= 3 THEN 'SENT' ELSE 'DELIVERED' END,
    udlrn,
    CASE (row_number OVER ())
        WHEN 1 THEN 'CLAIM_UPDATE'
        WHEN 2 THEN 'CLAIM_UPDATE'
        WHEN 3 THEN 'CLAIM_APPROVAL'
        WHEN 4 THEN 'VISIT_SCHEDULED'
        WHEN 5 THEN 'PAYMENT'
    END,
    now() - INTERVAL '20 days',
    CASE WHEN row_number OVER () <= 3 THEN now() - INTERVAL '19 days' ELSE NULL END
FROM farmers
CROSS JOIN generate_series(1, 5) AS n
WHERE mobile IN ('9900000001', '9900000002', '9900000003', '9900000004', '9900000005');

-- ================================================================
-- SEED CROP PHENOLOGY DATA
-- ================================================================
INSERT INTO crop_phenology_calendar (crop_type, season, sowing_month_start, sowing_month_end, harvest_month, peak_ndvi_month, expected_peak_ndvi, created_at)
VALUES
('PADDY', 'KHARIF', 6, 7, 10, 8, 0.650, now()),
('PADDY', 'RABI', 11, 12, 3, 1, 0.550, now()),
('MAIZE', 'KHARIF', 6, 7, 9, 7, 0.700, now()),
('MAIZE', 'RABI', 10, 11, 2, 12, 0.600, now()),
('SOYBEAN', 'KHARIF', 6, 6, 9, 7, 0.550, now()),
('RAGI', 'KHARIF', 6, 7, 10, 8, 0.500, now()),
('GROUNDNUT', 'KHARIF', 6, 6, 10, 8, 0.600, now()),
('SUNFLOWER', 'RABI', 10, 11, 2, 12, 0.550, now())
ON CONFLICT DO NOTHING;

-- ================================================================
-- SEED LOCATION DATA (Karnataka state if not exists)
-- ================================================================
INSERT INTO location_states (code, name, country, api_adapter)
VALUES ('KA', 'Karnataka', 'India', 'karnataka')
ON CONFLICT (code) DO NOTHING;

-- Seed some sample districts (full data in 06 file)
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code)
VALUES
('KA_BAG', 'KA', 'Bagalkot', 'KA02', '529'),
('KA_BAL', 'KA', 'Ballari', 'KA03', '528'),
('KA_BEL', 'KA', 'Belagavi', 'KA01', '527'),
('KA_BEN_R', 'KA', 'Bengaluru Rural', 'KA29', '611'),
('KA_BEN_U', 'KA', 'Bengaluru Urban', 'KA28', '612')
ON CONFLICT (id) DO NOTHING;

-- End of seed data