-- V26: Add performance indexes on fraud scoring tables
-- Dependencies: V7, V13

CREATE INDEX idx_fraud_scores_risk ON fraud_scores(risk_level);
CREATE INDEX idx_fraud_scores_model ON fraud_scores(model_version);
CREATE INDEX idx_scoring_results_shadow ON scoring_results(is_shadow);
CREATE INDEX idx_model_deployments_model ON model_deployments(model_id);
