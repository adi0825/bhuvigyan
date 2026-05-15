-- V4: Add missing columns to farmers table to match SQLAlchemy model
-- Fixes: column farmers.landData does not exist

ALTER TABLE farmers
    ADD COLUMN IF NOT EXISTS aadhaar VARCHAR(12),
    ADD COLUMN IF NOT EXISTS father_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS gender VARCHAR(10),
    ADD COLUMN IF NOT EXISTS dob DATE,
    ADD COLUMN IF NOT EXISTS address VARCHAR(500),
    ADD COLUMN IF NOT EXISTS village VARCHAR(100),
    ADD COLUMN IF NOT EXISTS taluk VARCHAR(100),
    ADD COLUMN IF NOT EXISTS district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS pincode VARCHAR(10),
    ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS land_unit VARCHAR(20),
    ADD COLUMN IF NOT EXISTS crop_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8),
    ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8),
    ADD COLUMN IF NOT EXISTS "landData" JSONB,
    ADD COLUMN IF NOT EXISTS satellite_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS carbon_practice VARCHAR(100),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename old column if exists to match model
ALTER TABLE farmers RENAME COLUMN land_area_ha TO land_area;

-- Drop columns that don't exist in model
ALTER TABLE farmers DROP COLUMN IF EXISTS aadhar_hash;
ALTER TABLE farmers DROP COLUMN IF EXISTS village_id;
ALTER TABLE farmers DROP COLUMN IF EXISTS district_id;
ALTER TABLE farmers DROP COLUMN IF EXISTS is_active;
