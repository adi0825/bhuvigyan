import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from sqlalchemy import text

async def apply_migration():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    statements = [
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS aadhaar VARCHAR(12)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS father_name VARCHAR(255)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS gender VARCHAR(10)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS dob DATE',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS address VARCHAR(500)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS village VARCHAR(100)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS taluk VARCHAR(100)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS district VARCHAR(100)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS pincode VARCHAR(10)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS bank_name VARCHAR(100)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS land_unit VARCHAR(20)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS crop_name VARCHAR(100)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,8)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS longitude NUMERIC(11,8)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS "landData" JSONB',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS satellite_verified BOOLEAN DEFAULT FALSE',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN DEFAULT FALSE',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS carbon_practice VARCHAR(100)',
        'ALTER TABLE farmers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()',
    ]
    
    async with engine.begin() as conn:
        for stmt in statements:
            try:
                await conn.execute(text(stmt))
                print(f"OK: {stmt[:60]}...")
            except Exception as e:
                print(f"ERR: {stmt[:60]}... -> {e}")
        
        # Try rename only if old column exists
        try:
            await conn.execute(text("ALTER TABLE farmers RENAME COLUMN land_area_ha TO land_area"))
            print("OK: Renamed land_area_ha to land_area")
        except Exception as e:
            print(f"SKIP: Rename land_area_ha -> {e}")
        
        # Drop old columns
        for col in ['aadhar_hash', 'village_id', 'district_id', 'is_active']:
            try:
                await conn.execute(text(f"ALTER TABLE farmers DROP COLUMN IF EXISTS {col}"))
                print(f"OK: Dropped {col}")
            except Exception as e:
                print(f"ERR: Drop {col} -> {e}")
    
    print("Migration complete!")
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(apply_migration())
