-- V20: Seed location and crop masters
-- Dependencies: V3, V14

INSERT INTO location_states (state_code, name) VALUES
('MH', 'Maharashtra'),
('KA', 'Karnataka'),
('TG', 'Telangana'),
('PB', 'Punjab'),
('UP', 'Uttar Pradesh'),
('RJ', 'Rajasthan');

INSERT INTO crop_masters (name, category, growing_season, typical_ndvi_range) VALUES
('Rice', 'Cereal', 'Kharif', '0.40-0.70'),
('Wheat', 'Cereal', 'Rabi', '0.35-0.65'),
('Cotton', 'Fibre', 'Kharif', '0.30-0.60'),
('Sugarcane', 'Cash', 'Annual', '0.45-0.75'),
('Maize', 'Cereal', 'Kharif', '0.35-0.65');
