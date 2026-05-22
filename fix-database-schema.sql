-- Fix database schema to match SQLAlchemy models
-- This script adds missing columns and fixes type mismatches

-- Add missing columns to farmers table
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS mobile VARCHAR(15) UNIQUE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_eligible BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_enrolled BOOLEAN DEFAULT FALSE;
ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_practice VARCHAR(100);
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

-- Create index on mobile
CREATE INDEX IF NOT EXISTS idx_farmers_mobile ON farmers(mobile);

-- Fix claims.farmer_id type mismatch - change from bigint to UUID if needed
-- First check if column exists and is wrong type
-- This is a risky operation - only run if you're sure about data integrity
-- ALTER TABLE claims ALTER COLUMN farmer_id TYPE UUID USING farmer_id::UUID;

-- Add farmer_id column to claims if it doesn't exist (references farmers.id)
ALTER TABLE claims ADD COLUMN IF NOT EXISTS farmer_id UUID REFERENCES farmers(id) ON DELETE CASCADE;

-- Copy data from udlrn to farmer_id if needed
-- UPDATE claims c SET farmer_id = f.id FROM farmers f WHERE c.udlrn = f.udlrn WHERE c.farmer_id IS NULL;
