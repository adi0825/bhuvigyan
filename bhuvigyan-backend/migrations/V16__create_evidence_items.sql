-- V16: Create evidence_items and claim_documents
-- Dependencies: V5

CREATE TABLE evidence_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    evidence_type VARCHAR(50) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    storage_url VARCHAR(500) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE claim_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_hash VARCHAR(255) NOT NULL,
    storage_url VARCHAR(500) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    gps_latitude VARCHAR(20),
    gps_longitude VARCHAR(20),
    exif_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_evidence_items_entity ON evidence_items(entity_type, entity_id);
CREATE INDEX idx_claim_documents_claim ON claim_documents(claim_id);
