-- V21: Seed demo users, farmers, officers, CSC operators
-- Dependencies: V2, V3, V4

INSERT INTO farmers (id, full_name, mobile, state_code, is_demo, carbon_eligible, is_active) VALUES
('550e8400-e29b-41d4-a716-000000000001', 'Demo Farmer 1', '9900000001', 'MH', TRUE, TRUE, TRUE),
('550e8400-e29b-41d4-a716-000000000002', 'Demo Farmer 2', '9900000002', 'KA', TRUE, TRUE, TRUE),
('550e8400-e29b-41d4-a716-000000000003', 'Demo Farmer 3', '9900000003', 'TG', TRUE, TRUE, TRUE),
('550e8400-e29b-41d4-a716-000000000004', 'Demo Farmer 4', '9900000004', 'PB', TRUE, TRUE, TRUE),
('550e8400-e29b-41d4-a716-000000000005', 'Demo Farmer 5', '9900000005', 'UP', TRUE, TRUE, TRUE),
('550e8400-e29b-41d4-a716-000000000006', 'Demo Farmer 6', '9900000006', 'RJ', TRUE, TRUE, TRUE);

INSERT INTO users (id, email, role, is_active) VALUES
('550e8400-e29b-41d4-a716-000000000010', 'superadmin@bhuvigyan.gov.in', 'SUPER_ADMIN', TRUE),
('550e8400-e29b-41d4-a716-000000000011', 'admin@bhuvigyan.gov.in', 'ADMIN', TRUE);
