import asyncio
import sys

# Fix encoding for Windows console
if sys.platform == "win32":
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

from sqlalchemy import create_engine, text

# Database connection
DB_USER = "bhuvigyan"
DB_PASSWORD = "bhuvigyan123"
DB_HOST = "localhost"
DB_PORT = "5432"
DB_NAME = "bhuvigyan"

DATABASE_URL_SYNC = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

def apply_schema_fixes():
    """Apply schema fixes to match SQLAlchemy models"""
    engine = create_engine(DATABASE_URL_SYNC)
    
    with engine.connect() as conn:
        # Add test farmers if table is empty or has NULL mobiles
        print("\nChecking and adding test farmers...")
        result = conn.execute(text("SELECT COUNT(*) FROM farmers WHERE mobile IS NOT NULL"))
        count = result.scalar()
        
        if count == 0:
            print("No valid farmers found. Adding test farmers...")
            conn.execute(text("TRUNCATE TABLE farmers CASCADE"))
            
            conn.execute(text("""
                INSERT INTO farmers (mobile, full_name, state_code, district, is_verified, carbon_eligible, bank_name, bank_ifsc, bank_account)
                VALUES ('9900000001', 'Rajesh Kumar', 'KA', 'Bengaluru Rural', true, true, 'SBI', 'SBIN0001234', '12345678901')
            """))
            conn.execute(text("""
                INSERT INTO farmers (mobile, full_name, state_code, district, is_verified, carbon_eligible, bank_name, bank_ifsc, bank_account)
                VALUES ('9900000002', 'Suresh Patil', 'KA', 'Bagalkot', true, true, 'SBI', 'SBIN0001234', '12345678902')
            """))
            conn.execute(text("""
                INSERT INTO farmers (mobile, full_name, state_code, district, is_verified, carbon_eligible, bank_name, bank_ifsc, bank_account)
                VALUES ('9900000003', 'Mohan Reddy', 'KA', 'Belagavi', true, true, 'SBI', 'SBIN0001234', '12345678903')
            """))
            print("Test farmers added successfully")
        else:
            print(f"Found {count} valid farmers in database")
        
        conn.commit()
        
        # Check current farmers table structure
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'farmers' 
            ORDER BY ordinal_position
        """))
        columns = result.fetchall()
        print(f"Current columns in farmers table: {[c[0] for c in columns]}")
        
        # Add missing columns to farmers table
        print("\nAdding missing columns to farmers table...")
        fixes = [
            ("mobile", "VARCHAR(15) UNIQUE"),
            ("carbon_eligible", "BOOLEAN DEFAULT FALSE"),
            ("carbon_enrolled", "BOOLEAN DEFAULT FALSE"),
            ("carbon_practice", "VARCHAR(100)"),
            ("full_name", "VARCHAR(255)"),
            ("aadhaar", "VARCHAR(12)"),
            ("father_name", "VARCHAR(255)"),
            ("gender", "VARCHAR(10)"),
            ("dob", "DATE"),
            ("address", "VARCHAR(500)"),
            ("village", "VARCHAR(100)"),
            ("taluk", "VARCHAR(100)"),
            ("district", "VARCHAR(100)"),
            ("state_code", "VARCHAR(10)"),
            ("pincode", "VARCHAR(10)"),
            ("bank_name", "VARCHAR(100)"),
            ("bank_ifsc", "VARCHAR(20)"),
            ("bank_account", "VARCHAR(20)"),
            ("land_area", "NUMERIC(10,2)"),
            ("land_unit", "VARCHAR(20)"),
            ("crop_name", "VARCHAR(100)"),
            ("latitude", "NUMERIC(10,8)"),
            ("longitude", "NUMERIC(11,8)"),
            ("landData", "JSONB"),
            ("satellite_verified", "BOOLEAN DEFAULT FALSE"),
            ("is_verified", "BOOLEAN DEFAULT FALSE"),
            ("is_demo", "BOOLEAN DEFAULT FALSE"),
            ("is_blacklisted", "BOOLEAN DEFAULT FALSE"),
        ]
        
        for col_name, col_def in fixes:
            try:
                conn.execute(text(f"ALTER TABLE farmers ADD COLUMN IF NOT EXISTS {col_name} {col_def}"))
                print(f"  [OK] Added/verified column: {col_name}")
            except Exception as e:
                print(f"  [ERROR] Adding {col_name}: {e}")
        
        # Create index on mobile
        try:
            conn.execute(text("CREATE INDEX IF NOT EXISTS idx_farmers_mobile ON farmers(mobile)"))
            print("  [OK] Created index on mobile")
        except Exception as e:
            print(f"  [ERROR] Creating index: {e}")
        
        # Check if claims.farmer_id exists and is correct type
        print("\nChecking claims.farmer_id column...")
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'claims' AND column_name = 'farmer_id'
        """))
        farmer_id_col = result.fetchone()
        
        if farmer_id_col:
            print(f"  farmer_id exists with type: {farmer_id_col[1]}")
            if farmer_id_col[1] != 'uuid':
                print(f"  [WARNING] farmer_id is {farmer_id_col[1]}, should be UUID")
        else:
            print("  Adding farmer_id column to claims table...")
            try:
                conn.execute(text("""
                    ALTER TABLE claims 
                    ADD COLUMN IF NOT EXISTS farmer_id UUID 
                    REFERENCES farmers(id) ON DELETE CASCADE
                """))
                print("  [OK] Added farmer_id column to claims")
            except Exception as e:
                print(f"  [ERROR] Adding farmer_id: {e}")
        
        # Check users table for login issues
        print("\nChecking users table structure...")
        result = conn.execute(text("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users' 
            ORDER BY ordinal_position
        """))
        user_columns = result.fetchall()
        print(f"Columns in users table: {[c[0] for c in user_columns]}")
        
        # Check for admin_users table
        print("\nChecking admin_users table...")
        result = conn.execute(text("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'admin_users'
            )
        """))
        admin_users_exists = result.fetchone()[0]
        print(f"admin_users table exists: {admin_users_exists}")
        
        conn.commit()
        print("\n[OK] Schema fixes applied successfully!")

if __name__ == "__main__":
    try:
        apply_schema_fixes()
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
