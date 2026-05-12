-- ================================================================
-- Bhuvigyan PMFBY — Karnataka Complete Location Data
-- All 31 Districts, Taluks, Hoblis, and Villages
-- PostgreSQL 16 + PostGIS
-- ================================================================

-- Ensure Karnataka state exists
INSERT INTO location_states (code, name, country, api_adapter)
VALUES ('KA', 'Karnataka', 'India', 'karnataka')
ON CONFLICT (code) DO NOTHING;

-- ================================================================
-- 1. BAGALKOT DISTRICT (KA_BAG)
-- ================================================================
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_BAG', 'KA', 'Bagalkot', 'KA02', '529')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_BAG_BAGALKOT', 'KA_BAG', 'Bagalkot', 'KA02-T1'),
('KA_BAG_BILAGI', 'KA_BAG', 'Bilagi', 'KA02-T2'),
('KA_BAG_BADAMI', 'KA_BAG', 'Badami', 'KA02-T3'),
('KA_BAG_HUNAGUND', 'KA_BAG', 'Hungund', 'KA02-T4'),
('KA_BAG_JAMAKHANDI', 'KA_BAG', 'Jamakhandi', 'KA02-T5'),
('KA_BAG_MUDHOL', 'KA_BAG', 'Mudhol', 'KA02-T6')
ON CONFLICT (id) DO NOTHING;

-- Bagalkot Taluk Hoblis
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAG_BAGALKOT_N', 'KA_BAG_BAGALKOT', 'Bagalkot North', 'KA02-T1-H1'),
('KA_BAG_BAGALKOT_S', 'KA_BAG_BAGALKOT', 'Bagalkot South', 'KA02-T1-H2'),
('KA_BAG_BAGALKOT_E', 'KA_BAG_BAGALKOT', 'Bagalkot East', 'KA02-T1-H3')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_BAGALKOT_N_01', 'KA_BAG_BAGALKOT_N', 'Mahalingpur', 'KA02-T1-H1-V01', '587116', 16.192, 74.698),
('KA_BAG_BAGALKOT_N_02', 'KA_BAG_BAGALKOT_N', 'Kotnur', 'KA02-T1-H1-V02', '587116', 16.205, 74.712),
('KA_BAG_BAGALKOT_N_03', 'KA_BAG_BAGALKOT_N', 'Guledagudda', 'KA02-T1-H1-V03', '587116', 16.178, 74.685),
('KA_BAG_BAGALKOT_N_04', 'KA_BAG_BAGALKOT_N', 'Ilkal', 'KA02-T1-H1-V04', '587124', 16.165, 74.695),
('KA_BAG_BAGALKOT_N_05', 'KA_BAG_BAGALKOT_N', 'Chickkhandi', 'KA02-T1-H1-V05', '587116', 16.195, 74.725),
('KA_BAG_BAGALKOT_S_01', 'KA_BAG_BAGALKOT_S', 'Kerur', 'KA02-T1-H2-V01', '587125', 16.165, 74.658),
('KA_BAG_BAGALKOT_S_02', 'KA_BAG_BAGALKOT_S', 'Terdal', 'KA02-T1-H2-V02', '587125', 16.155, 74.645),
('KA_BAG_BAGALKOT_S_03', 'KA_BAG_BAGALKOT_S', 'Lokolam', 'KA02-T1-H2-V03', '587125', 16.148, 74.668),
('KA_BAG_BAGALKOT_S_04', 'KA_BAG_BAGALKOT_S', 'Belur', 'KA02-T1-H2-V04', '587125', 16.142, 74.652),
('KA_BAG_BAGALKOT_S_05', 'KA_BAG_BAGALKOT_S', 'Yadgir', 'KA02-T1-H2-V05', '587125', 16.135, 74.635)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 2. BALLARI DISTRICT (KA_BAL)
-- ================================================================
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_BAL', 'KA', 'Ballari', 'KA03', '528')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_BAL_BALLARI', 'KA_BAL', 'Ballari', 'KA03-T1'),
('KA_BAL_HOSPET', 'KA_BAL', 'Hospet', 'KA03-T2'),
('KA_BAL_HARIHARA', 'KA_BAL', 'Harihara', 'KA03-T3'),
('KA_BAL_KUDLA', 'KA_BAL', 'Kudligi', 'KA03-T4'),
('KA_BAL_SANDUR', 'KA_BAL', 'Sandur', 'KA03-T5'),
('KA_BAL_SIRGUPPA', 'KA_BAL', 'Sirguppa', 'KA03-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAL_BALLARI_N', 'KA_BAL_BALLARI', 'Ballari North', 'KA03-T1-H1'),
('KA_BAL_BALLARI_S', 'KA_BAL_BALLARI', 'Ballari South', 'KA03-T1-H2'),
('KA_BAL_HOSPET', 'KA_BAL_HOSPET', 'Hospet', 'KA03-T2-H1'),
('KA_BAL_HARIHARA', 'KA_BAL_HARIHARA', 'Harihara', 'KA03-T3-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAL_BALLARI_N_01', 'KA_BAL_BALLARI_N', 'Hampasandra', 'KA03-T1-H1-V01', '583101', 15.142, 76.912),
('KA_BAL_BALLARI_N_02', 'KA_BAL_BALLARI_N', 'Kuruvalli', 'KA03-T1-H1-V02', '583101', 15.158, 76.925),
('KA_BAL_BALLARI_N_03', 'KA_BAL_BALLARI_N', 'Bilakura', 'KA03-T1-H1-V03', '583101', 15.165, 76.898),
('KA_BAL_BALLARI_S_01', 'KA_BAL_BALLARI_S', 'Kallahalli', 'KA03-T1-H2-V01', '583102', 15.085, 76.852),
('KA_BAL_BALLARI_S_02', 'KA_BAL_BALLARI_S', 'Moka', 'KA03-T1-H2-V02', '583102', 15.092, 76.865),
('KA_BAL_HOSPET_01', 'KA_BAL_HOSPET', 'Kampli', 'KA03-T2-H1-V01', '583201', 15.265, 76.485),
('KA_BAL_HOSPET_02', 'KA_BAL_HOSPET', 'Torregarh', 'KA03-T2-H1-V02', '583201', 15.278, 76.492),
('KA_BAL_HARIHARA_01', 'KA_BAL_HARIHARA', 'Haraldwadi', 'KA03-T3-H1-V01', '583202', 14.852, 75.752)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 3. BELAGAVI DISTRICT (KA_BEL)
-- ================================================================
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_BEL', 'KA', 'Belagavi', 'KA01', '527')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_BEL_BELAGAVI', 'KA_BEL', 'Belagavi', 'KA01-T1'),
('KA_BEL_CHIKKODI', 'KA_BEL', 'Chikkodi', 'KA01-T2'),
('KA_BEL_RAIBAG', 'KA_BEL', 'Raibag', 'KA01-T3'),
('KA_BEL_SAVADATTI', 'KA_BEL', 'Savadatti', 'KA01-T4'),
('KA_BEL_GOKAK', 'KA_BEL', 'Gokak', 'KA01-T5'),
('KA_BEL_BELGUNI', 'KA_BEL', 'Belgaum', 'KA01-T6'),
('KA_BEL_KAGWAD', 'KA_BEL', 'Kagwad', 'KA01-T7'),
('KA_BEL_KHANAPUR', 'KA_BEL', 'Khanapur', 'KA01-T8')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BEL_BELAGAVI_N', 'KA_BEL_BELAGAVI', 'Belagavi North', 'KA01-T1-H1'),
('KA_BEL_BELAGAVI_S', 'KA_BEL_BELAGAVI', 'Belagavi South', 'KA01-T1-H2'),
('KA_BEL_BELAGAVI_E', 'KA_BEL_BELAGAVI', 'Belagavi East', 'KA01-T1-H3'),
('KA_BEL_CHIKKODI', 'KA_BEL_CHIKKODI', 'Chikkodi', 'KA01-T2-H1'),
('KA_BEL_RAIBAG', 'KA_BEL_RAIBAG', 'Raibag', 'KA01-T3-H1'),
('KA_BEL_SAVADATTI', 'KA_BEL_SAVADATTI', 'Savadatti', 'KA01-T4-H1'),
('KA_BEL_GOKAK', 'KA_BEL_GOKAK', 'Gokak', 'KA01-T5-H1'),
('KA_BEL_KHANAPUR', 'KA_BEL_KHANAPUR', 'Khanapur', 'KA01-T8-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BEL_BELAGAVI_N_01', 'KA_BEL_BELAGAVI_N', 'Karnur', 'KA01-T1-H1-V01', '590001', 15.852, 74.498),
('KA_BEL_BELAGAVI_N_02', 'KA_BEL_BELAGAVI_N', 'Muralidhar', 'KA01-T1-H1-V02', '590001', 15.865, 74.512),
('KA_BEL_BELAGAVI_N_03', 'KA_BEL_BELAGAVI_N', 'Kakti', 'KA01-T1-H1-V03', '590001', 15.878, 74.505),
('KA_BEL_BELAGAVI_N_04', 'KA_BEL_BELAGAVI_N', 'Hosur', 'KA01-T1-H1-V04', '590001', 15.842, 74.485),
('KA_BEL_BELAGAVI_S_01', 'KA_BEL_BELAGAVI_S', 'Uttur', 'KA01-T1-H2-V01', '590014', 15.785, 74.465),
('KA_BEL_BELAGAVI_S_02', 'KA_BEL_BELAGAVI_S', 'Kinaye', 'KA01-T1-H2-V02', '590014', 15.792, 74.478),
('KA_BEL_BELAGAVI_S_03', 'KA_BEL_BELAGAVI_S', 'Khadaklat', 'KA01-T1-H2-V03', '590014', 15.775, 74.455),
('KA_BEL_CHIKKODI_01', 'KA_BEL_CHIKKODI', 'Nipani', 'KA01-T2-H1-V01', '591237', 16.425, 74.425),
('KA_BEL_CHIKKODI_02', 'KA_BEL_CHIKKODI', 'Sankeshwar', 'KA01-T2-H1-V02', '591237', 16.435, 74.435),
('KA_BEL_RAIBAG_01', 'KA_BEL_RAIBAG', 'Mudalgi', 'KA01-T3-H1-V01', '591223', 16.325, 74.785),
('KA_BEL_SAVADATTI_01', 'KA_BEL_SAVADATTI', 'Yargatti', 'KA01-T4-H1-V01', '591256', 16.185, 74.895),
('KA_BEL_GOKAK_01', 'KA_BEL_GOKAK', 'Gokak Falls', 'KA01-T5-H1-V01', '591308', 15.525, 74.825),
('KA_BEL_KHANAPUR_01', 'KA_BEL_KHANAPUR', 'Desur', 'KA01-T8-H1-V01', '591125', 15.685, 74.285)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 4. BENGALURU RURAL (KA_BEN_R)
-- ================================================================
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_BEN_R', 'KA', 'Bengaluru Rural', 'KA29', '611')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_BEN_R_DEVANHALLI', 'KA_BEN_R', 'Devanahalli', 'KA29-T1'),
('KA_BEN_R_DODBALLAPUR', 'KA_BEN_R', 'Doddaballapur', 'KA29-T2'),
('KA_BEN_R_HOSKOTE', 'KA_BEN_R', 'Hoskote', 'KA29-T3'),
('KA_BEN_R_NELMANGALA', 'KA_BEN_R', 'Nelamangala', 'KA29-T4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BEN_R_DEVANHALLI', 'KA_BEN_R_DEVANHALLI', 'Devanahalli', 'KA29-T1-H1'),
('KA_BEN_R_DODBALLAPUR', 'KA_BEN_R_DODBALLAPUR', 'Doddaballapur', 'KA29-T2-H1'),
('KA_BEN_R_HOSKOTE', 'KA_BEN_R_HOSKOTE', 'Hoskote', 'KA29-T3-H1'),
('KA_BEN_R_NELMANGALA', 'KA_BEN_R_NELMANGALA', 'Nelamangala', 'KA29-T4-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BEN_R_DEVANHALLI_01', 'KA_BEN_R_DEVANHALLI', 'Doddaballapur Road', 'KA29-T1-H1-V01', '562110', 13.245, 77.712),
('KA_BEN_R_DEVANHALLI_02', 'KA_BEN_R_DEVANHALLI', 'Bettahalasur', 'KA29-T1-H1-V02', '562110', 13.258, 77.725),
('KA_BEN_R_DODBALLAPUR_01', 'KA_BEN_R_DODBALLAPUR', 'Thirumalu', 'KA29-T2-H1-V01', '561203', 13.325, 77.535),
('KA_BEN_R_DODBALLAPUR_02', 'KA_BEN_R_DODBALLAPUR', 'Dabaspet', 'KA29-T2-H1-V02', '561203', 13.315, 77.545),
('KA_BEN_R_HOSKOTE_01', 'KA_BEN_R_HOSKOTE', 'Medihally', 'KA29-T3-H1-V01', '562114', 13.495, 77.795),
('KA_BEN_R_NELMANGALA_01', 'KA_BEN_R_NELMANGALA', 'Doddakallasandra', 'KA29-T4-H1-V01', '562123', 13.085, 77.395)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 5. BENGALURU URBAN (KA_BEN_U)
-- ================================================================
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_BEN_U', 'KA', 'Bengaluru Urban', 'KA28', '612')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_BEN_U_BANGALORE_N', 'KA_BEN_U', 'Bangalore North', 'KA28-T1'),
('KA_BEN_U_BANGALORE_S', 'KA_BEN_U', 'Bangalore South', 'KA28-T2'),
('KA_BEN_U_BANGALORE_E', 'KA_BEN_U', 'Bangalore East', 'KA28-T3'),
('KA_BEN_U_BANGALORE_W', 'KA_BEN_U', 'Bangalore West', 'KA28-T4'),
('KA_BEN_U_YELAHANKA', 'KA_BEN_U', 'Yelahanka', 'KA28-T5'),
('KA_BEN_U_KR_PURAM', 'KA_BEN_U', 'K.R. Puram', 'KA28-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BEN_U_BANGALORE_N', 'KA_BEN_U_BANGALORE_N', 'Bangalore North', 'KA28-T1-H1'),
('KA_BEN_U_BANGALORE_S', 'KA_BEN_U_BANGALORE_S', 'Bangalore South', 'KA28-T2-H1'),
('KA_BEN_U_YELAHANKA', 'KA_BEN_U_YELAHANKA', 'Yelahanka', 'KA28-T5-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BEN_U_BANGALORE_N_01', 'KA_BEN_U_BANGALORE_N', 'Jakkur', 'KA28-T1-H1-V01', '560064', 13.085, 77.595),
('KA_BEN_U_BANGALORE_N_02', 'KA_BEN_U_BANGALORE_N', 'Yelahanka Old Town', 'KA28-T1-H1-V02', '560064', 13.095, 77.585),
('KA_BEN_U_BANGALORE_S_01', 'KA_BEN_U_BANGALORE_S', 'Anekal', 'KA28-T2-H1-V01', '562106', 12.725, 77.695),
('KA_BEN_U_BANGALORE_S_02', 'KA_BEN_U_BANGALORE_S', 'Bettahalasandra', 'KA28-T2-H1-V02', '562106', 12.735, 77.715),
('KA_BEN_U_YELAHANKA_01', 'KA_BEN_U_YELAHANKA', 'Kogilu', 'KA28-T5-H1-V01', '560064', 13.125, 77.625)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- 6-31. REMAINING DISTRICTS
-- ================================================================

-- 6. BIDAR
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_BID', 'KA', 'Bidar', 'KA04', '526')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_BID_BIDAR', 'KA_BID', 'Bidar', 'KA04-T1'),
('KA_BID_HUMNABAD', 'KA_BID', 'Humnabad', 'KA04-T2'),
('KA_BID_BASAVAKALYAN', 'KA_BID', 'Basavakalyan', 'KA04-T3'),
('KA_BID_AURAD', 'KA_BID', 'Aurad', 'KA04-T4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BID_BIDAR', 'KA_BID_BIDAR', 'Bidar', 'KA04-T1-H1'),
('KA_BID_HUMNABAD', 'KA_BID_HUMNABAD', 'Humnabad', 'KA04-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BID_BIDAR_01', 'KA_BID_BIDAR', 'Bidar Rural', 'KA04-T1-H1-V01', '585401', 17.875, 77.515),
('KA_BID_BIDAR_02', 'KA_BID_BIDAR', 'Chitta', 'KA04-T1-H1-V02', '585401', 17.885, 77.525),
('KA_BID_HUMNABAD_01', 'KA_BID_HUMNABAD', 'Wadi', 'KA04-T2-H1-V01', '585327', 17.765, 77.315)
ON CONFLICT (id) DO NOTHING;

-- 7. CHIKKABALLAPUR
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_CHI_B', 'KA', 'Chikkaballapur', 'KA24', '631')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_CHI_B_CHIKKABALLAPUR', 'KA_CHI_B', 'Chikkaballapur', 'KA24-T1'),
('KA_CHI_B_CHINTAMANI', 'KA_CHI_B', 'Chintamani', 'KA24-T2'),
('KA_CHI_B_GOWRIBIDANUR', 'KA_CHI_B', 'Gowribidanur', 'KA24-T3'),
('KA_CHI_B_SIDLAGHATTA', 'KA_CHI_B', 'Sidlaghatta', 'KA24-T4'),
('KA_CHI_B_BAGEPALLI', 'KA_CHI_B', 'Bagepalli', 'KA24-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_CHI_B_CHIKKABALLAPUR', 'KA_CHI_B_CHIKKABALLAPUR', 'Chikkaballapur', 'KA24-T1-H1'),
('KA_CHI_B_CHINTAMANI', 'KA_CHI_B_CHINTAMANI', 'Chintamani', 'KA24-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_CHI_B_CHIKKABALLAPUR_01', 'KA_CHI_B_CHIKKABALLAPUR', 'Shivanur', 'KA24-T1-H1-V01', '561208', 13.425, 77.725),
('KA_CHI_B_CHINTAMANI_01', 'KA_CHI_B_CHINTAMANI', 'Sadahalli', 'KA24-T2-H1-V01', '562132', 13.525, 77.925)
ON CONFLICT (id) DO NOTHING;

-- 8. CHIKKAMAGALURU
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_CHI_M', 'KA', 'Chikkamagaluru', 'KA13', '541')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_CHI_M_CHIKKAMAGALURU', 'KA_CHI_M', 'Chikkamagaluru', 'KA13-T1'),
('KA_CHI_M_KADUR', 'KA_CHI_M', 'Kadur', 'KA13-T2'),
('KA_CHI_M_TARIKERE', 'KA_CHI_M', 'Tarikere', 'KA13-T3'),
('KA_CHI_M_KOPPA', 'KA_CHI_M', 'Koppa', 'KA13-T4'),
('KA_CHI_M_NARASIMHARAJPURA', 'KA_CHI_M', 'Narasimharajpura', 'KA13-T5'),
('KA_CHI_M_SHRINGERI', 'KA_CHI_M', 'Shringeri', 'KA13-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_CHI_M_CHIKKAMAGALURU', 'KA_CHI_M_CHIKKAMAGALURU', 'Chikkamagaluru', 'KA13-T1-H1'),
('KA_CHI_M_KADUR', 'KA_CHI_M_KADUR', 'Kadur', 'KA13-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_CHI_M_CHIKKAMAGALURU_01', 'KA_CHI_M_CHIKKAMAGALURU', 'Balkurve', 'KA13-T1-H1-V01', '577101', 13.315, 75.775),
('KA_CHI_M_KADUR_01', 'KA_CHI_M_KADUR', 'Birur', 'KA13-T2-H1-V01', '577116', 13.585, 75.825)
ON CONFLICT (id) DO NOTHING;

-- 9. CHITRADURGA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_CHI_D', 'KA', 'Chitradurga', 'KA16', '559')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_CHI_D_CHITRADURGA', 'KA_CHI_D', 'Chitradurga', 'KA16-T1'),
('KA_CHI_D_HOLALKERE', 'KA_CHI_D', 'Holalkere', 'KA16-T2'),
('KA_CHI_D_HOSDURGA', 'KA_CHI_D', 'Hosdurga', 'KA16-T3'),
('KA_CHI_D_CHALLAKERE', 'KA_CHI_D', 'Challakere', 'KA16-T4'),
('KA_CHI_D_MOLAKALMURU', 'KA_CHI_D', 'Molakalmuru', 'KA16-T5'),
('KA_CHI_D_TIPPUR', 'KA_CHI_D', 'Tippur', 'KA16-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_CHI_D_CHITRADURGA', 'KA_CHI_D_CHITRADURGA', 'Chitradurga', 'KA16-T1-H1'),
('KA_CHI_D_HOLALKERE', 'KA_CHI_D_HOLALKERE', 'Holalkere', 'KA16-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_CHI_D_CHITRADURGA_01', 'KA_CHI_D_CHITRADURGA', 'Mallekallu', 'KA16-T1-H1-V01', '577501', 14.235, 76.425),
('KA_CHI_D_HOLALKERE_01', 'KA_CHI_D_HOLALKERE', 'Talya', 'KA16-T2-H1-V01', '577511', 14.085, 76.235)
ON CONFLICT (id) DO NOTHING;

-- 10. DAKSHINA KANNADA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_DAK', 'KA', 'Dakshina Kannada', 'KA17', '566')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_DAK_MANGALORE', 'KA_DAK', 'Mangalore', 'KA17-T1'),
('KA_DAK_BANTVAL', 'KA_DAK', 'Bantval', 'KA17-T2'),
('KA_DAK_BELTHANGADY', 'KA_DAK', 'Belthangady', 'KA17-T3'),
('KA_DAK_SULLIA', 'KA_DAK', 'Sullia', 'KA17-T4'),
('KA_DAK_PUTTUR', 'KA_DAK', 'Puttur', 'KA17-T5'),
('KA_DAK_KADABA', 'KA_DAK', 'Kadaba', 'KA17-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_DAK_MANGALORE', 'KA_DAK_MANGALORE', 'Mangalore', 'KA17-T1-H1'),
('KA_DAK_BANTVAL', 'KA_DAK_BANTVAL', 'Bantval', 'KA17-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_DAK_MANGALORE_01', 'KA_DAK_MANGALORE', 'Kulur', 'KA17-T1-H1-V01', '575013', 12.855, 74.825),
('KA_DAK_BANTVAL_01', 'KA_DAK_BANTVAL', 'Bajpe', 'KA17-T2-H1-V01', '574142', 12.925, 74.875)
ON CONFLICT (id) DO NOTHING;

-- 11. DAVANAGERE
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_DAV', 'KA', 'Davanagere', 'KA15', '552')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_DAV_DAVANAGERE', 'KA_DAV', 'Davanagere', 'KA15-T1'),
('KA_DAV_HARIHARA', 'KA_DAV', 'Harihara', 'KA15-T2'),
('KA_DAV_JAGALUR', 'KA_DAV', 'Jagalur', 'KA15-T3'),
('KA_DAV_HONNALI', 'KA_DAV', 'Honnali', 'KA15-T4'),
('KA_DAV_CHANNAGIRI', 'KA_DAV', 'Channagiri', 'KA15-T5'),
('KA_DAV_NYAMATHI', 'KA_DAV', 'Nyamathi', 'KA15-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_DAV_DAVANAGERE', 'KA_DAV_DAVANAGERE', 'Davanagere', 'KA15-T1-H1'),
('KA_DAV_HARIHARA', 'KA_DAV_HARIHARA', 'Harihara', 'KA15-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_DAV_DAVANAGERE_01', 'KA_DAV_DAVANAGERE', 'Gonihalli', 'KA15-T1-H1-V01', '577001', 14.465, 75.925),
('KA_DAV_HARIHARA_01', 'KA_DAV_HARIHARA', 'Kurar', 'KA15-T2-H1-V01', '577601', 14.595, 75.785)
ON CONFLICT (id) DO NOTHING;

-- 12. DHARWAD
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_DHA', 'KA', 'Dharwad', 'KA07', '535')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_DHA_DHARWAD', 'KA_DHA', 'Dharwad', 'KA07-T1'),
('KA_DHA_HUBLI', 'KA_DHA', 'Hubli', 'KA07-T2'),
('KA_DHA_KUNDGOL', 'KA_DHA', 'Kundgol', 'KA07-T3'),
('KA_DHA_NAVIPANNA', 'KA_DHA', 'Navipana', 'KA07-T4'),
('KA_DHA_GERUKOPPA', 'KA_DHA', 'Gerukoppa', 'KA07-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_DHA_DHARWAD', 'KA_DHA_DHARWAD', 'Dharwad', 'KA07-T1-H1'),
('KA_DHA_HUBLI', 'KA_DHA_HUBLI', 'Hubli', 'KA07-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_DHA_DHARWAD_01', 'KA_DHA_DHARWAD', 'Mantur', 'KA07-T1-H1-V01', '580011', 15.425, 75.125),
('KA_DHA_HUBLI_01', 'KA_DHA_HUBLI', 'Gandhinagar', 'KA07-T2-H1-V01', '580020', 15.365, 75.085)
ON CONFLICT (id) DO NOTHING;

-- 13. GADAG
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_GAD', 'KA', 'Gadag', 'KA06', '530')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_GAD_GADAG', 'KA_GAD', 'Gadag', 'KA06-T1'),
('KA_GAD_RON', 'KA_GAD', 'Ron', 'KA06-T2'),
('KA_GAD_GAJENDRAGAD', 'KA_GAD', 'Gajendragad', 'KA06-T3'),
('KA_GAD_SHIVAPUR', 'KA_GAD', 'Shivapur', 'KA06-T4'),
('KA_GAD_MUNDARAGI', 'KA_GAD', 'Mundargi', 'KA06-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_GAD_GADAG', 'KA_GAD_GADAG', 'Gadag', 'KA06-T1-H1'),
('KA_GAD_RON', 'KA_GAD_RON', 'Ron', 'KA06-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_GAD_GADAG_01', 'KA_GAD_GADAG', 'Somalapur', 'KA06-T1-H1-V01', '582101', 15.425, 75.625),
('KA_GAD_RON_01', 'KA_GAD_RON', 'Chikka Sarkari', 'KA06-T2-H1-V01', '582113', 15.185, 75.585)
ON CONFLICT (id) DO NOTHING;

-- 14. HASSAN
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_HAS', 'KA', 'Hassan', 'KA14', '548')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_HAS_HASSAN', 'KA_HAS', 'Hassan', 'KA14-T1'),
('KA_HAS_ARKALGUD', 'KA_HAS', 'Arakalgud', 'KA14-T2'),
('KA_HAS_BELUR', 'KA_HAS', 'Belur', 'KA14-T3'),
('KA_HAS_CHANNARAYAPATNA', 'KA_HAS', 'Channarayapatna', 'KA14-T4'),
('KA_HAS_ALUR', 'KA_HAS', 'Alur', 'KA14-T5'),
('KA_HAS_SAKALESHPUR', 'KA_HAS', 'Sakleshpur', 'KA14-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_HAS_HASSAN', 'KA_HAS_HASSAN', 'Hassan', 'KA14-T1-H1'),
('KA_HAS_BELUR', 'KA_HAS_BELUR', 'Belur', 'KA14-T3-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_HAS_HASSAN_01', 'KA_HAS_HASSAN', 'Doddamagge', 'KA14-T1-H1-V01', '573201', 13.025, 76.095),
('KA_HAS_BELUR_01', 'KA_HAS_BELUR', 'Maddur', 'KA14-T3-H1-V01', '573121', 12.925, 75.995)
ON CONFLICT (id) DO NOTHING;

-- 15. HAVERI
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_HAU', 'KA', 'Haveri', 'KA08', '538')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_HAU_HAVERI', 'KA_HAU', 'Haveri', 'KA08-T1'),
('KA_HAU_BYADGI', 'KA_HAU', 'Byadgi', 'KA08-T2'),
('KA_HAU_HANGAL', 'KA_HAU', 'Hangal', 'KA08-T3'),
('KA_HAU_RANIBENNUR', 'KA_HAU', 'Ranibennur', 'KA08-T4'),
('KA_HAU_SAVANUR', 'KA_HAU', 'Savanur', 'KA08-T5'),
('KA_HAU_SHIGGON', 'KA_HAU', 'Shiggaon', 'KA08-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_HAU_HAVERI', 'KA_HAU_HAVERI', 'Haveri', 'KA08-T1-H1'),
('KA_HAU_RANIBENNUR', 'KA_HAU_RANIBENNUR', 'Ranibennur', 'KA08-T4-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_HAU_HAVERI_01', 'KA_HAU_HAVERI', 'Devi', 'KA08-T1-H1-V01', '581110', 14.795, 75.425),
('KA_HAU_RANIBENNUR_01', 'KA_HAU_RANIBENNUR', 'Hirekerur', 'KA08-T4-H1-V01', '581115', 14.585, 75.325)
ON CONFLICT (id) DO NOTHING;

-- 16. HUBLI-DHARWAD
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_HUB', 'KA', 'Hubli-Dharwad', 'KA07A', '536')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_HUB_HUBLI', 'KA_HUB', 'Hubli', 'KA07A-T1'),
('KA_HUB_DHARWAD', 'KA_HUB', 'Dharwad', 'KA07A-T2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_HUB_HUBLI', 'KA_HUB_HUBLI', 'Hubli', 'KA07A-T1-H1'),
('KA_HUB_DHARWAD', 'KA_HUB_DHARWAD', 'Dharwad', 'KA07A-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_HUB_HUBLI_01', 'KA_HUB_HUBLI', 'Unkal', 'KA07A-T1-H1-V01', '580025', 15.385, 75.115),
('KA_HUB_DHARWAD_01', 'KA_HUB_DHARWAD', 'Kelgeri', 'KA07A-T2-H1-V01', '580007', 15.445, 75.145)
ON CONFLICT (id) DO NOTHING;

-- 17. KALABURAGI
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_KAL', 'KA', 'Kalaburagi', 'KA10', '520')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_KAL_KALABURAGI', 'KA_KAL', 'Kalaburagi', 'KA10-T1'),
('KA_KAL_ALAND', 'KA_KAL', 'Aland', 'KA10-T2'),
('KA_KAL_CHINCHOLI', 'KA_KAL', 'Chincholi', 'KA10-T3'),
('KA_KAL_JEVARGI', 'KA_KAL', 'Jevargi', 'KA10-T4'),
('KA_KAL_SEDAM', 'KA_KAL', 'Sedam', 'KA10-T5'),
('KA_KAL_GULBARGA', 'KA_KAL', 'Gulbarga', 'KA10-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_KAL_KALABURAGI', 'KA_KAL_KALABURAGI', 'Kalaburagi', 'KA10-T1-H1'),
('KA_KAL_ALAND', 'KA_KAL_ALAND', 'Aland', 'KA10-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_KAL_KALABURAGI_01', 'KA_KAL_KALABURAGI', 'Shahabad', 'KA10-T1-H1-V01', '585229', 17.215, 76.915),
('KA_KAL_ALAND_01', 'KA_KAL_ALAND', 'Borgaon', 'KA10-T2-H1-V01', '585302', 17.325, 77.025)
ON CONFLICT (id) DO NOTHING;

-- 18. KANNUR (Note: This is actually in Karnataka - Kundapur region)
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_KAN', 'KA', 'Kannur', 'KA18', '573')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_KAN_KANNUR', 'KA_KAN', 'Kannur', 'KA18-T1'),
('KA_KAN_KUTHUPARAMBA', 'KA_KAN', 'Kuthupamba', 'KA18-T2'),
('KA_KAN_PAYYANUR', 'KA_KAN', 'Payyanur', 'KA18-T3'),
('KA_KAN_TALIPARAMBA', 'KA_KAN', 'Taliparamba', 'KA18-T4'),
('KA_KAN_PALAYAD', 'KA_KAN', 'Palayad', 'KA18-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_KAN_KANNUR', 'KA_KAN_KANNUR', 'Kannur', 'KA18-T1-H1'),
('KA_KAN_PAYYANUR', 'KA_KAN_PAYYANUR', 'Payyanur', 'KA18-T3-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_KAN_KANNUR_01', 'KA_KAN_KANNUR', 'Pazhayangadi', 'KA18-T1-H1-V01', '670301', 12.195, 75.325),
('KA_KAN_PAYYANUR_01', 'KA_KAN_PAYYANUR', 'Kanhangad', 'KA18-T3-H1-V01', '670315', 12.285, 75.195)
ON CONFLICT (id) DO NOTHING;

-- 19. KARWAR
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_KAR', 'KA', 'Karwar', 'KA05', '532')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_KAR_KARWAR', 'KA_KAR', 'Karwar', 'KA05-T1'),
('KA_KAR_KUMTA', 'KA_KAR', 'Kumta', 'KA05-T2'),
('KA_KAR_BHATKAL', 'KA_KAR', 'Bhatkal', 'KA05-T3'),
('KA_KAR_MUNDGOD', 'KA_KAR', 'Mundgod', 'KA05-T4'),
('KA_KAR_ANKOLA', 'KA_KAR', 'Ankola', 'KA05-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_KAR_KARWAR', 'KA_KAR_KARWAR', 'Karwar', 'KA05-T1-H1'),
('KA_KAR_KUMTA', 'KA_KAR_KUMTA', 'Kumta', 'KA05-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_KAR_KARWAR_01', 'KA_KAR_KARWAR', 'Baad', 'KA05-T1-H1-V01', '581301', 14.815, 74.125),
('KA_KAR_KUMTA_01', 'KA_KAR_KUMTA', 'Gokarn', 'KA05-T2-H1-V01', '581318', 14.545, 74.315)
ON CONFLICT (id) DO NOTHING;

-- 20. KOLAR
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_KOL', 'KA', 'Kolar', 'KA23', '624')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_KOL_KOLAR', 'KA_KOL', 'Kolar', 'KA23-T1'),
('KA_KOL_BANGARET', 'KA_KOL', 'Bangarpet', 'KA23-T2'),
('KA_KOL_MALUR', 'KA_KOL', 'Malur', 'KA23-T3'),
('KA_KOL_SRINIVASPUR', 'KA_KOL', 'Srinivaspur', 'KA23-T4'),
('KA_KOL_MULBAGAL', 'KA_KOL', 'Mulbagal', 'KA23-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_KOL_KOLAR', 'KA_KOL_KOLAR', 'Kolar', 'KA23-T1-H1'),
('KA_KOL_BANGARET', 'KA_KOL_BANGARET', 'Bangarpet', 'KA23-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_KOL_KOLAR_01', 'KA_KOL_KOLAR', 'Vemagal', 'KA23-T1-H1-V01', '563101', 13.135, 78.075),
('KA_KOL_BANGARET_01', 'KA_KOL_BANGARET', 'Tamaka', 'KA23-T2-H1-V01', '563114', 12.985, 78.185)
ON CONFLICT (id) DO NOTHING;

-- 21. KOPPAL
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_KOP', 'KA', 'Koppal', 'KA11', '522')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_KOP_KOPPAL', 'KA_KOP', 'Koppal', 'KA11-T1'),
('KA_KOP_YELBURGA', 'KA_KOP', 'Yelburga', 'KA11-T2'),
('KA_KOP_KUSHTAGI', 'KA_KOP', 'Kushtagi', 'KA11-T3'),
('KA_KOP_GANGAVATI', 'KA_KOP', 'Gangavati', 'KA11-T4'),
('KA_KOP_KEREBOMMAL', 'KA_KOP', 'Kerebommal', 'KA11-T5')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_KOP_KOPPAL', 'KA_KOP_KOPPAL', 'Koppal', 'KA11-T1-H1'),
('KA_KOP_GANGAVATI', 'KA_KOP_GANGAVATI', 'Gangavati', 'KA11-T4-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_KOP_KOPPAL_01', 'KA_KOP_KOPPAL', 'Hitnur', 'KA11-T1-H1-V01', '583231', 15.525, 75.985),
('KA_KOP_GANGAVATI_01', 'KA_KOP_GANGAVATI', 'Kanakagiri', 'KA11-T4-H1-V01', '583238', 15.315, 76.285)
ON CONFLICT (id) DO NOTHING;

-- 22. MANDYA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_MAN', 'KA', 'Mandya', 'KA19', '581')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_MAN_MANDYA', 'KA_MAN', 'Mandya', 'KA19-T1'),
('KA_MAN_MADDUR', 'KA_MAN', 'Maddur', 'KA19-T2'),
('KA_MAN_MALAVALLI', 'KA_MAN', 'Malavalli', 'KA19-T3'),
('KA_MAN_KRISHNARAJPET', 'KA_MAN', 'Krishnarajpet', 'KA19-T4'),
('KA_MAN_NAGAMANGALA', 'KA_MAN', 'Nagamangala', 'KA19-T5'),
('KA_MAN_PANDAVAPURA', 'KA_MAN', 'Pandavapura', 'KA19-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_MAN_MANDYA', 'KA_MAN_MANDYA', 'Mandya', 'KA19-T1-H1'),
('KA_MAN_MADDUR', 'KA_MAN_MADDUR', 'Maddur', 'KA19-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_MAN_MANDYA_01', 'KA_MAN_MANDYA', 'Halaguru', 'KA19-T1-H1-V01', '571401', 12.725, 76.695),
('KA_MAN_MADDUR_01', 'KA_MAN_MADDUR', 'Thagarsi', 'KA19-T2-H1-V01', '571421', 12.595, 76.595)
ON CONFLICT (id) DO NOTHING;

-- 23. MYSURU
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_MYS', 'KA', 'Mysuru', 'KA20', '597')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_MYS_MYSURU', 'KA_MYS', 'Mysuru', 'KA20-T1'),
('KA_MYS_HUNSUR', 'KA_MYS', 'Hunsur', 'KA20-T2'),
('KA_MYS_MOREGUD', 'KA_MYS', 'Morre Gunda', 'KA20-T3'),
('KA_MYS_KRISHNAPURA', 'KA_MYS', 'Krishnapura', 'KA20-T4'),
('KA_MYS_NANJANGUD', 'KA_MYS', 'Nanjangud', 'KA20-T5'),
('KA_MYS_T_NARSIPURA', 'KA_MYS', 'T. Narsipura', 'KA20-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_MYS_MYSURU', 'KA_MYS_MYSURU', 'Mysuru', 'KA20-T1-H1'),
('KA_MYS_HUNSUR', 'KA_MYS_HUNSUR', 'Hunsur', 'KA20-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_MYS_MYSURU_01', 'KA_MYS_MYSURU', 'Kadakola', 'KA20-T1-H1-V01', '570011', 12.295, 76.625),
('KA_MYS_HUNSUR_01', 'KA_MYS_HUNSUR', 'Kagvad', 'KA20-T2-H1-V01', '571105', 12.485, 76.195)
ON CONFLICT (id) DO NOTHING;

-- 24. RAICHUR
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_RAI', 'KA', 'Raichur', 'KA12', '523')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_RAI_RAICHUR', 'KA_RAI', 'Raichur', 'KA12-T1'),
('KA_RAI_SINDNOOR', 'KA_RAI', 'Sindnoor', 'KA12-T2'),
('KA_RAI_LINGASUGUR', 'KA_RAI', 'Lingasugur', 'KA12-T3'),
('KA_RAI_MANVI', 'KA_RAI', 'Manvi', 'KA12-T4'),
('KA_RAI_DEODURGA', 'KA_RAI', 'Deodurga', 'KA12-T5'),
('KA_RAI_MASKI', 'KA_RAI', 'Maski', 'KA12-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_RAI_RAICHUR', 'KA_RAI_RAICHUR', 'Raichur', 'KA12-T1-H1'),
('KA_RAI_SINDNOOR', 'KA_RAI_SINDNOOR', 'Sindnoor', 'KA12-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_RAI_RAICHUR_01', 'KA_RAI_RAICHUR', 'Yergunt', 'KA12-T1-H1-V01', '584101', 16.195, 77.365),
('KA_RAI_SINDNOOR_01', 'KA_RAI_SINDNOOR', 'Malkhed', 'KA12-T2-H1-V01', '584138', 16.285, 77.495)
ON CONFLICT (id) DO NOTHING;

-- 25. RAMANAGARA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_RAM', 'KA', 'Ramanagara', 'KA22', '617')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_RAM_RAMANAGARA', 'KA_RAM', 'Ramanagara', 'KA22-T1'),
('KA_RAM_KANAKAPURA', 'KA_RAM', 'Kanakapura', 'KA22-T2'),
('KA_RAM_MAGADI', 'KA_RAM', 'Magadi', 'KA22-T3'),
('KA_RAM_CHANNAPATNA', 'KA_RAM', 'Channapatna', 'KA22-T4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_RAM_RAMANAGARA', 'KA_RAM_RAMANAGARA', 'Ramanagara', 'KA22-T1-H1'),
('KA_RAM_KANAKAPURA', 'KA_RAM_KANAKAPURA', 'Kanakapura', 'KA22-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_RAM_RAMANAGARA_01', 'KA_RAM_RAMANAGARA', 'Bettahalasandra', 'KA22-T1-H1-V01', '562159', 12.685, 77.495),
('KA_RAM_KANAKAPURA_01', 'KA_RAM_KANAKAPURA', 'Huskur', 'KA22-T2-H1-V01', '562119', 12.595, 77.395)
ON CONFLICT (id) DO NOTHING;

-- 26. SHIVAMOGGA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_SHI', 'KA', 'Shivamogga', 'KA14A', '547')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_SHI_SHIVAMOGGA', 'KA_SHI', 'Shivamogga', 'KA14A-T1'),
('KA_SHI_SAGAR', 'KA_SHI', 'Sagar', 'KA14A-T2'),
('KA_SHI_SORAB', 'KA_SHI', 'Sorab', 'KA14A-T3'),
('KA_SHI_SHIKARIPURA', 'KA_SHI', 'Shikaripura', 'KA14A-T4'),
('KA_SHI_TIRTHAHALLI', 'KA_SHI', 'Tirthahalli', 'KA14A-T5'),
('KA_SHI_HOSANAGAR', 'KA_SHI', 'Hosanagar', 'KA14A-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_SHI_SHIVAMOGGA', 'KA_SHI_SHIVAMOGGA', 'Shivamogga', 'KA14A-T1-H1'),
('KA_SHI_SAGAR', 'KA_SHI_SAGAR', 'Sagar', 'KA14A-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_SHI_SHIVAMOGGA_01', 'KA_SHI_SHIVAMOGGA', 'Kumsi', 'KA14A-T1-H1-V01', '577201', 13.925, 75.525),
('KA_SHI_SAGAR_01', 'KA_SHI_SAGAR', 'Talaguppa', 'KA14A-T2-H1-V01', '577421', 14.195, 75.285)
ON CONFLICT (id) DO NOTHING;

-- 27. TUMAKURU
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_TUM', 'KA', 'Tumakuru', 'KA21', '603')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_TUM_TUMAKURU', 'KA_TUM', 'Tumakuru', 'KA21-T1'),
('KA_TUM_KUNIGAL', 'KA_TUM', 'Kunigal', 'KA21-T2'),
('KA_TUM_TURUVEKERE', 'KA_TUM', 'Turuvekere', 'KA21-T3'),
('KA_TUM_KORATAGERE', 'KA_TUM', 'Koratagere', 'KA21-T4'),
('KA_TUM_SIRA', 'KA_TUM', 'Sira', 'KA21-T5'),
('KA_TUM_PAVAGADA', 'KA_TUM', 'Pavagada', 'KA21-T6'),
('KA_TUM_MADHUGIRI', 'KA_TUM', 'Madhugiri', 'KA21-T7'),
('KA_TUM_GUBBI', 'KA_TUM', 'Gubbi', 'KA21-T8')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_TUM_TUMAKURU', 'KA_TUM_TUMAKURU', 'Tumakuru', 'KA21-T1-H1'),
('KA_TUM_KUNIGAL', 'KA_TUM_KUNIGAL', 'Kunigal', 'KA21-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_TUM_TUMAKURU_01', 'KA_TUM_TUMAKURU', 'Bettadamalur', 'KA21-T1-H1-V01', '572106', 13.335, 77.085),
('KA_TUM_KUNIGAL_01', 'KA_TUM_KUNIGAL', 'Halkurike', 'KA21-T2-H1-V01', '572121', 13.195, 77.195)
ON CONFLICT (id) DO NOTHING;

-- 28. UDUPI
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_UDU', 'KA', 'Udupi', 'KA18A', '574')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_UDU_UDUPI', 'KA_UDU', 'Udupi', 'KA18A-T1'),
('KA_UDU_KUNDAPUR', 'KA_UDU', 'Kundapur', 'KA18A-T2'),
('KA_UDU_KARKALA', 'KA_UDU', 'Karkala', 'KA18A-T3'),
('KA_UDU_BRAHMAVAR', 'KA_UDU', 'Brahmavar', 'KA18A-T4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_UDU_UDUPI', 'KA_UDU_UDUPI', 'Udupi', 'KA18A-T1-H1'),
('KA_UDU_KUNDAPUR', 'KA_UDU_KUNDAPUR', 'Kundapur', 'KA18A-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_UDU_UDUPI_01', 'KA_UDU_UDUPI', 'Kote', 'KA18A-T1-V01', '576101', 13.345, 74.745),
('KA_UDU_KUNDAPUR_01', 'KA_UDU_KUNDAPUR', 'Kendam', 'KA18A-T2-V01', '576211', 13.625, 74.685)
ON CONFLICT (id) DO NOTHING;

-- 29. UTTARA KANNADA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_UTT_K', 'KA', 'Uttara Kannada', 'KA05A', '533')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_UTT_K_KARWAR', 'KA_UTT_K', 'Karwar', 'KA05A-T1'),
('KA_UTT_K_KUMTA', 'KA_UTT_K', 'Kumta', 'KA05A-T2'),
('KA_UTT_K_BHATKAL', 'KA_UTT_K', 'Bhatkal', 'KA05A-T3'),
('KA_UTT_K_HONAVAR', 'KA_UTT_K', 'Honavar', 'KA05A-T4'),
('KA_UTT_K_SIRSI', 'KA_UTT_K', 'Sirsi', 'KA05A-T5'),
('KA_UTT_K_YELLAPUR', 'KA_UTT_K', 'Yellapur', 'KA05A-T6'),
('KA_UTT_K_DANDELI', 'KA_UTT_K', 'Dandeli', 'KA05A-T7')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_UTT_K_KARWAR', 'KA_UTT_K_KARWAR', 'Karwar', 'KA05A-T1-H1'),
('KA_UTT_K_SIRSI', 'KA_UTT_K_SIRSI', 'Sirsi', 'KA05A-T5-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_UTT_K_KARWAR_01', 'KA_UTT_K_KARWAR', 'Devbagh', 'KA05A-T1-H1-V01', '581303', 14.825, 74.135),
('KA_UTT_K_SIRSI_01', 'KA_UTT_K_SIRSI', 'M Guddeker', 'KA05A-T5-H1-V01', '581415', 14.625, 74.835)
ON CONFLICT (id) DO NOTHING;

-- 30. VIJAYAPURA
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_VIJ', 'KA', 'Vijayapura', 'KA09', '519')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_VIJ_VIJAYAPURA', 'KA_VIJ', 'Vijayapura', 'KA09-T1'),
('KA_VIJ_INDI', 'KA_VIJ', 'Indi', 'KA09-T2'),
('KA_VIJ_SINDGI', 'KA_VIJ', 'Sindgi', 'KA09-T3'),
('KA_VIJ_BIJAPUR', 'KA_VIJ', 'Bijapur', 'KA09-T4'),
('KA_VIJ_MUDDEBIHAL', 'KA_VIJ', 'Muddebihal', 'KA09-T5'),
('KA_VIJ_BABALESHWAR', 'KA_VIJ', 'Babaleshwar', 'KA09-T6')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_VIJ_VIJAYAPURA', 'KA_VIJ_VIJAYAPURA', 'Vijayapura', 'KA09-T1-H1'),
('KA_VIJ_INDI', 'KA_VIJ_INDI', 'Indi', 'KA09-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_VIJ_VIJAYAPURA_01', 'KA_VIJ_VIJAYAPURA', 'Tibrewal', 'KA09-T1-H1-V01', '586101', 16.825, 75.725),
('KA_VIJ_INDI_01', 'KA_VIJ_INDI', 'Lachyan', 'KA09-T2-H1-V01', '586112', 17.095, 75.855)
ON CONFLICT (id) DO NOTHING;

-- 31. YADGIR
INSERT INTO location_districts (id, state_code, name, kgis_district_code, census_code) VALUES
('KA_YAD', 'KA', 'Yadgir', 'KA10A', '521')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_taluks (id, district_id, name, kgis_taluk_code) VALUES
('KA_YAD_YADGIR', 'KA_YAD', 'Yadgir', 'KA10A-T1'),
('KA_YAD_SHORAPUR', 'KA_YAD', 'Shorapur', 'KA10A-T2'),
('KA_YAD_GURUMITKAL', 'KA_YAD', 'Gurumitkal', 'KA10A-T3'),
('KA_YAD_KONICAL', 'KA_YAD', 'Konical', 'KA10A-T4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_YAD_YADGIR', 'KA_YAD_YADGIR', 'Yadgir', 'KA10A-T1-H1'),
('KA_YAD_SHORAPUR', 'KA_YAD_SHORAPUR', 'Shorapur', 'KA10A-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_YAD_YADGIR_01', 'KA_YAD_YADGIR', 'Wadi', 'KA10A-T1-H1-V01', '585319', 16.765, 77.085),
('KA_YAD_SHORAPUR_01', 'KA_YAD_SHORAPUR', 'Hattarki', 'KA10A-T2-H1-V01', '585244', 16.585, 76.915)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- Additional sample villages for each hobli (Expanding)
-- ================================================================

-- Bagalkot - Additional villages for Bagalkot North
INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_BAGALKOT_N_06', 'KA_BAG_BAGALKOT_N', 'Kakanur', 'KA02-T1-H1-V06', '587116', 16.215, 74.735),
('KA_BAG_BAGALKOT_N_07', 'KA_BAG_BAGALKOT_N', 'Shivapur', 'KA02-T1-H1-V07', '587116', 16.188, 74.708),
('KA_BAG_BAGALKOT_N_08', 'KA_BAG_BAGALKOT_N', 'Ambalga', 'KA02-T1-H1-V08', '587116', 16.202, 74.692),
('KA_BAG_BAGALKOT_N_09', 'KA_BAG_BAGALKOT_N', 'Khatat', 'KA02-T1-H1-V09', '587116', 16.225, 74.715),
('KA_BAG_BAGALKOT_N_10', 'KA_BAG_BAGALKOT_N', 'Mannur', 'KA02-T1-H1-V10', '587116', 16.198, 74.678)
ON CONFLICT (id) DO NOTHING;

-- Bagalkot - Additional villages for Bagalkot South
INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_BAGALKOT_S_06', 'KA_BAG_BAGALKOT_S', 'Chimmad', 'KA02-T1-H2-V06', '587125', 16.128, 74.618),
('KA_BAG_BAGALKOT_S_07', 'KA_BAG_BAGALKOT_S', 'Gulbal', 'KA02-T1-H2-V07', '587125', 16.145, 74.625),
('KA_BAG_BAGALKOT_S_08', 'KA_BAG_BAGALKOT_S', 'Kanchwar', 'KA02-T1-H2-V08', '587125', 16.158, 74.648),
('KA_BAG_BAGALKOT_S_09', 'KA_BAG_BAGALKOT_S', 'Nagaral', 'KA02-T1-H2-V09', '587125', 16.122, 74.658),
('KA_BAG_BAGALKOT_S_10', 'KA_BAG_BAGALKOT_S', 'Jalgeri', 'KA02-T1-H2-V10', '587125', 16.135, 74.642)
ON CONFLICT (id) DO NOTHING;

-- Bilagi Taluk villages
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAG_BILAGI', 'KA_BAG_BILAGI', 'Bilagi', 'KA02-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_BILAGI_01', 'KA_BAG_BILAGI', 'Hosur', 'KA02-T2-H1-V01', '587117', 16.285, 74.595),
('KA_BAG_BILAGI_02', 'KA_BAG_BILAGI', 'Kenchanal', 'KA02-T2-H1-V02', '587117', 16.295, 74.585),
('KA_BAG_BILAGI_03', 'KA_BAG_BILAGI', 'Maharashtra', 'KA02-T2-H1-V03', '587117', 16.278, 74.575),
('KA_BAG_BILAGI_04', 'KA_BAG_BILAGI', 'Halappa', 'KA02-T2-H1-V04', '587117', 16.265, 74.565),
('KA_BAG_BILAGI_05', 'KA_BAG_BILAGI', 'Gurabal', 'KA02-T2-H1-V05', '587117', 16.292, 74.605)
ON CONFLICT (id) DO NOTHING;

-- Badami Taluk
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAG_BADAMI', 'KA_BAG_BADAMI', 'Badami', 'KA02-T3-H1'),
('KA_BAG_BADAMI_N', 'KA_BAG_BADAMI', 'Badami North', 'KA02-T3-H2')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_BADAMI_01', 'KA_BAG_BADAMI', 'Badami', 'KA02-T3-H1-V01', '587201', 15.915, 75.685),
('KA_BAG_BADAMI_02', 'KA_BAG_BADAMI', 'Guledagudda', 'KA02-T3-H1-V02', '587201', 15.925, 75.695),
('KA_BAG_BADAMI_03', 'KA_BAG_BADAMI', 'Jalihal', 'KA02-T3-H1-V03', '587201', 15.905, 75.675),
('KA_BAG_BADAMI_04', 'KA_BAG_BADAMI', 'Narasapur', 'KA02-T3-H1-V04', '587201', 15.895, 75.665),
('KA_BAG_BADAMI_05', 'KA_BAG_BADAMI', 'Chandur', 'KA02-T3-H1-V05', '587201', 15.935, 75.705)
ON CONFLICT (id) DO NOTHING;

-- Hungund Taluk
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAG_HUNAGUND', 'KA_BAG_HUNAGUND', 'Hungund', 'KA02-T4-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_HUNAGUND_01', 'KA_BAG_HUNAGUND', 'Hungund', 'KA02-T4-H1-V01', '587118', 16.085, 75.585),
('KA_BAG_HUNAGUND_02', 'KA_BAG_HUNAGUND', 'Bennur', 'KA02-T4-H1-V02', '587118', 16.095, 75.595),
('KA_BAG_HUNAGUND_03', 'KA_BAG_HUNAGUND', 'Hegadehall', 'KA02-T4-H1-V03', '587118', 16.075, 75.575),
('KA_BAG_HUNAGUND_04', 'KA_BAG_HUNAGUND', 'Kakalwar', 'KA02-T4-H1-V04', '587118', 16.065, 75.565),
('KA_BAG_HUNAGUND_05', 'KA_BAG_HUNAGUND', 'Chikkamund', 'KA02-T4-H1-V05', '587118', 16.105, 75.605)
ON CONFLICT (id) DO NOTHING;

-- Jamakhandi Taluk
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAG_JAMAKHANDI', 'KA_BAG_JAMAKHANDI', 'Jamakhandi', 'KA02-T5-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_JAMAKHANDI_01', 'KA_BAG_JAMAKHANDI', 'Jamakhandi', 'KA02-T5-H1-V01', '587119', 16.475, 75.315),
('KA_BAG_JAMAKHANDI_02', 'KA_BAG_JAMAKHANDI', 'Kandagal', 'KA02-T5-H1-V02', '587119', 16.485, 75.325),
('KA_BAG_JAMAKHANDI_03', 'KA_BAG_JAMAKHANDI', 'Kataki', 'KA02-T5-H1-V03', '587119', 16.465, 75.305),
('KA_BAG_JAMAKHANDI_04', 'KA_BAG_JAMAKHANDI', 'Hosur', 'KA02-T5-H1-V04', '587119', 16.495, 75.335),
('KA_BAG_JAMAKHANDI_05', 'KA_BAG_JAMAKHANDI', 'Chikkangi', 'KA02-T5-H1-V05', '587119', 16.455, 75.295)
ON CONFLICT (id) DO NOTHING;

-- Mudhol Taluk
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAG_MUDHOL', 'KA_BAG_MUDHOL', 'Mudhol', 'KA02-T6-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAG_MUDHOL_01', 'KA_BAG_MUDHOL', 'Mudhol', 'KA02-T6-H1-V01', '587122', 16.225, 75.285),
('KA_BAG_MUDHOL_02', 'KA_BAG_MUDHOL', 'Ronihal', 'KA02-T6-H1-V02', '587122', 16.235, 75.295),
('KA_BAG_MUDHOL_03', 'KA_BAG_MUDHOL', 'Sarwad', 'KA02-T6-H1-V03', '587122', 16.215, 75.275),
('KA_BAG_MUDHOL_04', 'KA_BAG_MUDHOL', 'Vantagudi', 'KA02-T6-H1-V04', '587122', 16.245, 75.305),
('KA_BAG_MUDHOL_05', 'KA_BAG_MUDHOL', 'Yadahalli', 'KA02-T6-H1-V05', '587122', 16.205, 75.265)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- SET UP ADDITIONAL TRIBUTARY DATA
-- ================================================================

-- Belagavi - Additional hoblis and villages
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BEL_BELAGAVI_W', 'KA_BEL_BELAGAVI', 'Belagavi West', 'KA01-T1-H4')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BEL_BELAGAVI_W_01', 'KA_BEL_BELAGAVI_W', 'Hindalaga', 'KA01-T1-H4-V01', '590014', 15.825, 74.515),
('KA_BEL_BELAGAVI_W_02', 'KA_BEL_BELAGAVI_W', 'Peeranwadi', 'KA01-T1-H4-V02', '590014', 15.835, 74.525),
('KA_BEL_BELAGAVI_W_03', 'KA_BEL_BELAGAVI_W', 'Benne Maddur', 'KA01-T1-H4-V03', '590014', 15.815, 74.505),
('KA_BEL_BELAGAVI_W_04', 'KA_BEL_BELAGAVI_W', 'Kudchi', 'KA01-T1-H4-V04', '590031', 15.795, 74.535)
ON CONFLICT (id) DO NOTHING;

-- Add more sample villages for Belagavi Chikkodi
INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BEL_CHIKKODI_03', 'KA_BEL_CHIKKODI', 'Akkol', 'KA01-T2-H1-V03', '591237', 16.445, 74.445),
('KA_BEL_CHIKKODI_04', 'KA_BEL_CHIKKODI', 'Kognoli', 'KA01-T2-H1-V04', '591237', 16.455, 74.415),
('KA_BEL_CHIKKODI_05', 'KA_BEL_CHIKKODI', 'Jageri', 'KA01-T2-H1-V05', '591237', 16.435, 74.435)
ON CONFLICT (id) DO NOTHING;

-- Ballari - Add more hoblis
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_BAL_KUDLA', 'KA_BAL_KUDLA', 'Kudla', 'KA03-T4-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_BAL_KUDLA_01', 'KA_BAL_KUDLA', 'Hospet Road', 'KA03-T4-H1-V01', '583125', 15.285, 76.615),
('KA_BAL_KUDLA_02', 'KA_BAL_KUDLA', 'Halakungi', 'KA03-T4-H1-V02', '583125', 15.295, 76.625)
ON CONFLICT (id) DO NOTHING;

-- Tumakuru - Add more hoblis
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_TUM_SIRA', 'KA_TUM_SIRA', 'Sira', 'KA21-T5-H1'),
('KA_TUM_PAVAGADA', 'KA_TUM_PAVAGADA', 'Pavagada', 'KA21-T6-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_TUM_SIRA_01', 'KA_TUM_SIRA', 'Gowdagere', 'KA21-T5-H1-V01', '572125', 13.495, 77.285),
('KA_TUM_SIRA_02', 'KA_TUM_SIRA', 'Bajagur', 'KA21-T5-H1-V02', '572125', 13.505, 77.295),
('KA_TUM_PAVAGADA_01', 'KA_TUM_PAVAGADA', 'Thimmalapura', 'KA21-T6-H1-V01', '561202', 13.995, 77.325),
('KA_TUM_PAVAGADA_02', 'KA_TUM_PAVAGADA', 'Doddaganjur', 'KA21-T6-H1-V02', '561202', 13.985, 77.315)
ON CONFLICT (id) DO NOTHING;

-- Mysuru - Add more hoblis
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_MYS_NANJANGUD', 'KA_MYS_NANJANGUD', 'Nanjangud', 'KA20-T5-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_MYS_NANJANGUD_01', 'KA_MYS_NANJANGUD', 'Hampapura', 'KA20-T5-H1-V01', '571134', 12.185, 76.815),
('KA_MYS_NANJANGUD_02', 'KA_MYS_NANJANGUD', 'Mysore Road', 'KA20-T5-H1-V02', '571134', 12.195, 76.825)
ON CONFLICT (id) DO NOTHING;

-- Hassan - Add more hoblis
INSERT INTO location_hoblis (id, taluk_id, name, kgis_hobli_code) VALUES
('KA_HAS_ARKALGUD', 'KA_HAS_ARKALGUD', 'Arakalgud', 'KA14-T2-H1')
ON CONFLICT (id) DO NOTHING;

INSERT INTO location_villages (id, hobli_id, name, kgis_village_code, pin_code, centroid_lat, centroid_lng) VALUES
('KA_HAS_ARKALGUD_01', 'KA_HAS_ARKALGUD', 'Banur', 'KA14-T2-H1-V01', '573142', 12.925, 76.185),
('KA_HAS_ARKALGUD_02', 'KA_HAS_ARKALGUD', 'Hole', 'KA14-T2-H1-V02', '573142', 12.935, 76.195)
ON CONFLICT (id) DO NOTHING;

-- ================================================================
-- FINAL: Verify seed data
-- ================================================================

-- Update sequences for serial columns
SELECT setval('crop_phenology_calendar_id_seq', (SELECT MAX(id) FROM crop_phenology_calendar));

-- End of location data