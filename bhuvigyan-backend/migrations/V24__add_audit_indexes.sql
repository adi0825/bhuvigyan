-- V24: Add performance indexes on audit_logs
-- Dependencies: V10

CREATE INDEX idx_audit_action_target ON audit_logs(action, target_type);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address);
