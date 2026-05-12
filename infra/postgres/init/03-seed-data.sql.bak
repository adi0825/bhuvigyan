-- ================================================================
-- Bhuvigyan — Seed Data
-- ================================================================

-- ---------- STATES -------------------------------------------------
INSERT INTO location_states (code, name, country, api_adapter) VALUES
('29', 'Karnataka', 'India', 'karnataka'),
('27', 'Maharashtra', 'India', 'maharashtra')
ON CONFLICT (code) DO NOTHING;

-- ---------- KARNATAKA DISTRICTS & TALUKS -------------------------
INSERT INTO location_districts (id, state_code, name) VALUES
('KA_BAG', '29', 'Bagalkot'),
('KA_BAL', '29', 'Ballari'),
('KA_BEL', '29', 'Belagavi')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name) VALUES
('KA_BAG_BAG', 'KA_BAG', 'Bagalkot'),
('KA_BAG_BAD', 'KA_BAG', 'Badami'),
('KA_BAG_BIL', 'KA_BAG', 'Bilgi'),
('KA_BAL_BAL', 'KA_BAL', 'Ballari'),
('KA_BAL_HAR', 'KA_BAL', 'Harapanahalli'),
('KA_BEL_ATH', 'KA_BEL', 'Athni'),
('KA_BEL_BAI', 'KA_BEL', 'Bailhongal')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name) VALUES
('KA_BAG_BAG_H1', 'KA_BAG_BAG', 'Bagalkot Central'),
('KA_BAG_BAG_H2', 'KA_BAG_BAG', 'Bagalkot Rural')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, pin_code) VALUES
('KA_BAG_BAG_H1_V1', 'KA_BAG_BAG_H1', 'Village A', '587101'),
('KA_BAG_BAG_H1_V2', 'KA_BAG_BAG_H1', 'Village B', '587102')
ON CONFLICT (id) DO NOTHING;

-- ---------- ADMIN USERS (DEV MODE) -------------------------------
INSERT INTO admin_users (id, email, password_hash, totp_secret, role, full_name) VALUES
('11111111-1111-1111-1111-111111111111', 'super@bhuvigyan.gov.in', '$2a$10$dummyhash', 'dummysecret', 'SUPER_ADMIN', 'Super Admin'),
('22222222-2222-2222-2222-222222222222', 'state@bhuvigyan.gov.in', '$2a$10$dummyhash', 'dummysecret', 'STATE_HEAD', 'State Head'),
('33333333-3333-3333-3333-333333333333', 'dc@bhuvigyan.gov.in', '$2a$10$dummyhash', 'dummysecret', 'DC', 'District Collector')
ON CONFLICT (email) DO NOTHING;
