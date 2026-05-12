-- V10: Create audit_logs (append-only, no update/delete)
-- Dependencies: V2

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id UUID,
    actor_type VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    target_id UUID,
    target_type VARCHAR(50),
    ip_address INET,
    user_agent TEXT,
    request_body_hash VARCHAR(255),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_target ON audit_logs(target_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
