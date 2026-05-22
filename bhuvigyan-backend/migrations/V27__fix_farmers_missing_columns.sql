-- V27: Fix missing columns in farmers table to match SQLAlchemy model
-- This migration adds columns that exist in the model but not in the database
-- The database was likely created from older schema (02-schema.sql.bak) which is missing these columns

-- Add mobile column if it doesn't exist (exists in V3 but missing in actual DB)
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS mobile VARCHAR(15) UNIQUE;

-- Add carbon-related columns (from V4 but missing in actual DB)
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_enrolled BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_practice VARCHAR(100);

-- Add other missing columns from the SQLAlchemy Farmer model
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS aadhaar VARCHAR(12);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS father_name VARCHAR(255);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS gender VARCHAR(10);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS dob DATE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS address VARCHAR(500);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS village VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS taluk VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS district VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS state_code VARCHAR(10);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS pincode VARCHAR(10);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_ifsc VARCHAR(20);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_account VARCHAR(20);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS land_area NUMERIC(10,2);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS land_unit VARCHAR(20);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS crop_name VARCHAR(100);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8);
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "landData" JSONB;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS satellite_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE;

-- Create index on mobile for performance
CREATE INDEX IF NOT EXISTS idx_farmers_mobile ON farmers(mobile);
