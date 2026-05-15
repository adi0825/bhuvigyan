import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from app.config import settings
from sqlalchemy import text

async def fix_column():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    
    async with engine.connect() as conn:
        # Check if landData column exists
        result = await conn.execute(text("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='farmers' AND column_name='landData'
        """))
        rows = result.fetchall()
        if rows:
            print("landData column already exists!")
        else:
            print("landData column missing. Adding it now...")
            await conn.execute(text('ALTER TABLE farmers ADD COLUMN "landData" JSONB'))
            await conn.commit()
            print("landData column added successfully!")
        
        # Also check for other missing columns
        for col, dtype in [
            ('aadhaar', 'VARCHAR(12)'),
            ('father_name', 'VARCHAR(255)'),
            ('gender', 'VARCHAR(10)'),
            ('dob', 'DATE'),
            ('address', 'VARCHAR(500)'),
            ('village', 'VARCHAR(100)'),
            ('taluk', 'VARCHAR(100)'),
            ('district', 'VARCHAR(100)'),
            ('pincode', 'VARCHAR(10)'),
            ('bank_name', 'VARCHAR(100)'),
            ('land_unit', 'VARCHAR(20)'),
            ('crop_name', 'VARCHAR(100)'),
            ('latitude', 'NUMERIC(10,8)'),
            ('longitude', 'NUMERIC(11,8)'),
            ('satellite_verified', 'BOOLEAN DEFAULT FALSE'),
            ('is_verified', 'BOOLEAN DEFAULT FALSE'),
            ('is_blacklisted', 'BOOLEAN DEFAULT FALSE'),
            ('carbon_practice', 'VARCHAR(100)'),
            ('updated_at', 'TIMESTAMPTZ DEFAULT NOW()'),
        ]:
            result = await conn.execute(text(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name='farmers' AND column_name='{col}'
            """))
            if not result.fetchall():
                try:
                    await conn.execute(text(f'ALTER TABLE farmers ADD COLUMN "{col}" {dtype}'))
                    await conn.commit()
                    print(f"Added missing column: {col}")
                except Exception as e:
                    print(f"Error adding {col}: {e}")
            else:
                print(f"Column exists: {col}")
    
    await engine.dispose()

if __name__ == "__main__":
    asyncio.run(fix_column())
