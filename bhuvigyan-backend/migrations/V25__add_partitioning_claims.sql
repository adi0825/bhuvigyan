-- V25: Prepare monthly partitioning for claims table (Year 2+ scale)
-- Dependencies: V5
-- Note: This sets up the infrastructure. Actual partitions created by scheduled jobs.

-- Create partition key helper table for claim archival tracking
CREATE TABLE claim_partitions (
    partition_name VARCHAR(50) PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
