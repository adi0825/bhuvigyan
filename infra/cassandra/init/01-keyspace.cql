-- ================================================================
-- Bhuvigyan — Cassandra Audit Keyspace
-- Append-only, immutable, court-admissible audit trail.
-- ================================================================

CREATE KEYSPACE IF NOT EXISTS bhuvigyan_audit
    WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}
    AND durable_writes = true;

USE bhuvigyan_audit;

-- Audit events, partitioned by claim for fast per-claim history reads
CREATE TABLE IF NOT EXISTS audit_events (
    claim_id           uuid,
    event_time         timestamp,
    event_id           timeuuid,
    udlrn              text,
    step_name          text,
    actor_id           text,
    actor_role         text,
    input_snapshot     text,       -- JSON
    output_snapshot    text,       -- JSON
    model_version      text,
    satellite_urls     list<text>,
    decision_reason    text,
    sha256_signature   text,       -- signature of (claim_id|event_time|step|snapshots)
    PRIMARY KEY ((claim_id), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time ASC, event_id ASC)
  AND comment = 'Immutable pipeline audit trail. No UPDATE, no DELETE.'
  AND default_time_to_live = 0;

-- Secondary lookup: events by UDLRN (denormalized)
CREATE TABLE IF NOT EXISTS audit_events_by_udlrn (
    udlrn              text,
    event_time         timestamp,
    event_id           timeuuid,
    claim_id           uuid,
    step_name          text,
    actor_id           text,
    decision_reason    text,
    sha256_signature   text,
    PRIMARY KEY ((udlrn), event_time, event_id)
) WITH CLUSTERING ORDER BY (event_time DESC, event_id DESC);

-- Officer action log (separate append-only table)
CREATE TABLE IF NOT EXISTS officer_actions (
    officer_id     text,
    action_time    timestamp,
    action_id      timeuuid,
    claim_id       uuid,
    action_type    text,           -- APPROVE / REJECT / SCHEDULE_CCE / FIR_ALERT / FREEZE_UDLRN
    reason         text,
    ip_address     text,
    PRIMARY KEY ((officer_id), action_time, action_id)
) WITH CLUSTERING ORDER BY (action_time DESC, action_id DESC);
