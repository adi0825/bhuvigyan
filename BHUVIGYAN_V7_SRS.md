# BHUVIGYAN V7 — SOFTWARE REQUIREMENTS SPECIFICATION
## AI-Powered Crop Insurance Fraud Detection and Smart Claims Adjudication Platform

**Document ID:** BHV-SRS-7.0 | **Version:** 7.0 | **Date:** 2026-05-10 | **Status:** Final

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Business Context](#2-business-context)
3. [Product Vision and Objectives](#3-product-vision-and-objectives)
4. [Scope](#4-scope)
5. [Users, Personas, and Role Model](#5-users-personas-and-role-model)
6. [Assumptions, Dependencies, and Constraints](#6-assumptions-dependencies-and-constraints)
7. [High-Level System Overview](#7-high-level-system-overview)
8. [Detailed Architecture](#8-detailed-architecture)
9. [Functional Requirements](#9-functional-requirements)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [Role-Permission Matrix](#11-role-permission-matrix)
12. [End-to-End Workflows](#12-end-to-end-workflows)
13. [Business Rules](#13-business-rules)
14. [Fraud Scoring Design](#14-fraud-scoring-design)
15. [ML / AI Specification](#15-ml--ai-specification)
16. [State Adapter Framework](#16-state-adapter-framework)
17. [Data Model and Database Design](#17-data-model-and-database-design)
18. [Flyway Database Migration Plan](#18-flyway-database-migration-plan)
19. [API Specification](#19-api-specification)
20. [Event-Driven and Kafka Design](#20-event-driven-and-kafka-design)
21. [Files, Evidence, and Document Management](#21-files-evidence-and-document-management)
22. [Frontend / UI SRS](#22-frontend--ui-srs)
23. [Security SRS](#23-security-srs)
24. [Observability and Operations](#24-observability-and-operations)
25. [Testing Strategy](#25-testing-strategy)
26. [DevOps, Environments, and Deployment](#26-devops-environments-and-deployment)
27. [Seed Data and Demo Data Spec](#27-seed-data-and-demo-data-spec)
28. [Reporting and Analytics](#28-reporting-and-analytics)
29. [ROI Model and Business Impact](#29-roi-model-and-business-impact)
30. [Roadmap](#30-roadmap)
31. [Risks and Mitigations](#31-risks-and-mitigations)
32. [Glossary and Acronyms](#32-glossary-and-acronyms)
33. [Appendices](#33-appendices)

---

## 1. EXECUTIVE SUMMARY

Bhuvigyan V7 is an enterprise-grade, AI-powered crop insurance fraud detection and smart claims adjudication platform for the Indian agricultural insurance ecosystem. It integrates claim intake, policy validation, geotagged field inspections, satellite-derived vegetation and weather evidence, ML-based fraud scoring, human review workflows, and comprehensive audit reporting.

**Primary Value Proposition:**
- For farmers: faster, fairer claim settlements with transparent tracking.
- For insurers: reduced fraud losses and operational costs.
- For governments: data-driven oversight and disaster response.

**Expected Business Outcomes:**

| Metric | Baseline | V7 Year 1 | V7 Year 3 |
|---|---|---|---|
| Avg claim TAT | 45–90 days | < 14 days | < 7 days |
| Fraud leakage | 15–25% | < 10% | < 6% |
| Reviewer throughput | 15/day | 30/day | 50/day |
| Farmer NPS | ~20 | 40 | 55 |

**Why V7 over V6:** Real-time 47-feature fraud scoring with explainability, State Adapter Framework for per-state rules, satellite NDVI/SAR integration, event-driven Kafka architecture, Model Ops with champion/challenger, disaster mode rapid response, and enhanced auditability.

---

## 2. BUSINESS CONTEXT

**Pain Points:**
- Inflated damage reports, duplicate claims, collusion, paper-based inspections.
- No systematic satellite/weather cross-referencing.
- Inconsistent standards across districts and states.
- State fragmentation with different forms and approval hierarchies.

**Why AI + Geospatial + Workflow:**

| Capability | Traditional | V7 |
|---|---|---|
| Fraud detection | Manual red-flagging | 47-feature ML ensemble |
| Damage verification | Visual estimate only | Satellite NDVI/SAR + officer |
| Weather correlation | Self-reported | IMD objective data |
| Claim triage | FIFO | Risk-based priority |
| Explainability | Subjective notes | Top-5 factor breakdown |

**Stakeholders:** Farmers, insurers, state governments, district committees, field officers, administrators, auditors, data science team, operations team.

---

## 3. PRODUCT VISION AND OBJECTIVES

**Mission:** Make crop insurance claims in India fast, fair, fraud-resistant, and fully auditable through AI-assisted evidence evaluation.

**Measurable Goals:**

| Goal ID | Goal | Target |
|---|---|---|
| G-001 | Auto-approve genuine claims | >= 40% by Year 2 |
| G-002 | Fraud precision @ 80% recall | >= 85% by Year 2 |
| G-003 | Median TAT (auto path) | < 7 days by Year 2 |
| G-004 | Adverse decisions with explanation | 100% |
| G-005 | States onboarded | 6 by Year 1, 15 by Year 3 |
| G-006 | Reviewer override rate | < 15% by Year 2 |
| G-007 | Audit critical findings | Zero |

**Turnaround Targets:**
- Auto-approve (0–30): 30 seconds.
- Manual review (31–60): 3 business days.
- Field visit (61–80): 7 business days.
- Auto-reject (81–100): Same-day decision.

---

## 4. SCOPE

**In-Scope:** Multi-role auth, farmer profile, policy management, claim intake with evidence, duplicate detection, field inspection, satellite NDVI/SAR, weather evidence, 47-feature fraud scoring, risk band routing, reviewer decisioning, appeals, notifications, State Adapter Framework, admin console, audit logging, reporting, evidence PDF generation, model registry, drift monitoring, disaster mode.

**Out-of-Scope (V7.0):** Drone imagery, voice-assisted capture, multilingual NLP chatbot, graph neural networks, reinsurer direct API, blockchain notarization.

**Phases:**
- V7.0 (MVP): Core auth, claims, scoring, 6 state adapters, admin, audit.
- V7.1: SAR flood detection, champion/challenger, drift dashboard, offline sync.
- V7.2: Drone imagery, voice capture, multilingual intake, advanced analytics.

---

## 5. USERS, PERSONAS, AND ROLE MODEL

### Farmer
- **Permissions:** Register, login, create/edit own claims, view own history, appeal rejections.
- **Pages:** Dashboard, Create Claim, Claim History, Claim Detail, Notifications, Profile.
- **Workflow:** Register -> Login -> Create Claim -> Upload Photos -> Submit -> Track -> Appeal.

### Field Officer
- **Permissions:** View assigned visits, start/complete inspections, upload inspection photos.
- **Pages:** Dashboard, Assignments, Inspection Detail, Submit Inspection, Offline Sync.
- **Workflow:** Receive assignment -> Travel -> Capture GPS + Photos -> Assess -> Submit.

### District/State Reviewer (DC)
- **Permissions:** View jurisdiction claims, approve/reject/flag, override scores, assign officers.
- **Pages:** Review Queue, Claim Detail, Fraud Panel, Decision Screen, Appeal Queue.
- **Workflow:** View queue -> Inspect claim + evidence + fraud panel -> Decide -> Confirm.

### Insurer Analyst
- **Permissions:** View portfolio claims, fraud scores, download evidence packets, receive alerts.
- **Pages:** Portfolio Dashboard, Fraud Analytics, Policy List, Claim Monitoring.

### Admin / Super Admin
- **Permissions:** Full user CRUD, system health, config, adapters, models, audit logs.
- **Pages:** User Management, System Health, Config, Adapter Management, Model Management, Audit Explorer.

### Fraud Analyst
- **Permissions:** View flagged claims, cross-claim correlation, investigation notes, recommend action.
- **Pages:** Fraud Alert Queue, Correlation, Network Analysis, Investigation Notes.

### Auditor
- **Permissions:** Read-only audit logs, evidence packets, claim history, model metadata.
- **Pages:** Audit Explorer, Evidence Viewer, Config History, Model Metadata.

### Data Science / Model Ops
- **Permissions:** Model registry, scoring results, feature distributions, drift alerts, shadow scoring.
- **Pages:** Model Registry, Feature Distribution, Drift Dashboard, Scoring Results.

---

## 6. ASSUMPTIONS, DEPENDENCIES, AND CONSTRAINTS

**Connectivity:** Farmers have intermittent 3G/4G. Officers have smartphones with GPS and offline capability for 48h.

**Government Data:** UDLRN linkage for land verification. Crop calendars available. Quality varies by state.

**Satellite/Weather:** GEE for NDVI/SAR (quota limits). IMD for rainfall. OpenWeatherMap fallback. Cloud cover degrades quality.

**Multilingual:** English primary. Hindi/regional Phase 2. i18n keys from Day 1. WCAG 2.1 AA.

**Low-Bandwidth:** Photo compression, resumable uploads, dashboards < 3s on 3G.

**State-Specific:** Each state has different crop lists, area units, scheme rules. Adapter Framework enables < 2-week onboarding.

**Privacy:** Farmer PII encrypted at rest. Aadhar masked in UI (last 4 digits). Data localization in India.

**Model Confidence:** False positive/negative inherent. Score 81–90 requires human confirmation in Year 1. Confidence < 0.7 forces manual review.

**Infrastructure:** K8s 3+ nodes. PostgreSQL 14+ with read replicas. Redis 6+. Kafka 3+. MinIO/S3 object storage.

---

## 7. HIGH-LEVEL SYSTEM OVERVIEW

### Architecture Narrative
Modular, event-driven platform: FastAPI backend, PostgreSQL, Redis, Kafka, React/TS frontend. Optional C++ scoring engine. Docker + K8s deployable.

### Subsystems
- Identity and Access Management
- User and Role Management
- Farmer Registry
- Policy Management
- Claim Intake and Validation
- Evidence Management
- Field Inspection Management
- Geospatial and Satellite Evidence Engine
- Weather Evidence Service
- Fraud Scoring Engine
- Rules Engine
- State Adapter Framework
- Review and Decisioning Workflow
- Notification Service
- Reporting and Analytics
- Audit and Compliance Layer
- Admin Configuration Console
- Integration Layer
- Model Ops Layer

### Key Journeys

**Claim Submission:** Farmer OTP auth -> Select policy -> Fill form -> Upload photos -> Validate -> Save as SUBMITTED -> Kafka `claim.submitted` -> Notification.

**Scoring Journey:** Inspection completed -> Kafka `inspection.completed` -> Feature assembler (47 features) -> ML ensemble -> Score 0–100 -> Risk band -> Status update -> `score.completed`.

**Review Journey:** Medium-risk claim in queue -> Reviewer views evidence + fraud panel -> Approve/Reject/Flag -> `decision.made` -> Farmer notification -> Audit log.

**Audit Journey:** Every mutation -> `audit_logs` (append-only). Kafka events consumed by audit service. 10-year retention.

---

## 8. DETAILED ARCHITECTURE

### Frontend
React 18+, TypeScript 5+, Tailwind CSS 3+, React Query, Zustand, React Router v6, Axios, React Hook Form + Zod, Vite 5+. 5 role-based portals.

### Backend
FastAPI (Python 3.11+), Pydantic v2, SQLAlchemy 2.0 async, Redis async, aiokafka, boto3 (MinIO/S3), Celery + Redis.

### Service Boundaries
- API Gateway (Nginx): TLS, rate limit, routing on port 443.
- FastAPI App: Business logic on port 8000.
- Fraud Scoring Worker: Feature assembly + inference.
- Kafka Consumers: Notification, audit, scoring trigger.
- Celery Workers: PDF generation, batch drift, nightly aggregation.

### Caching Strategy

| Cache Key | TTL | Purpose |
|---|---|---|
| `session:{jti}` | 24h | JWT validation |
| `rate:{ip}:{endpoint}` | 1h/1min | Rate limit |
| `ndvi:{lat}:{lng}:{start}:{end}` | 1h | Satellite cache |
| `weather:{lat}:{lng}:{date}` | 24h | Weather cache |
| `adapter:{state_code}` | 5m | State config |
| `claim:{claim_id}` | 5m | Claim detail |
| `farmer:{farmer_id}` | 10m | Profile |

### Event-Driven (Kafka)
- 3-node KRaft cluster. Replication factor 3.
- `claim.*` topics: 6 partitions (by claim_id hash).
- `score.*` topics: 12 partitions.
- Consumer groups: notification-service, scoring-service, audit-service, dlq-handler.
- Retention: 7 days operational, 30 days audit, 1 year for `audit.event.created`.

### Background Jobs
- `generate_evidence_pdf_task`: 5-min timeout.
- `batch_drift_check`: Daily 2 AM IST.
- `cleanup_expired_sessions`: Hourly.
- `nightly_aggregation`: Daily 3 AM IST.

### Observability
- Prometheus metrics at `/metrics`.
- Structured JSON logs via `structlog` with correlation ID.
- OpenTelemetry tracing.
- Grafana dashboards for latency, errors, Kafka lag, DB pool.

### Scaling
- FastAPI pods scale on CPU > 70%.
- DB read replicas for analytics.
- Redis Cluster for production.
- Object storage inherently scalable.

---

## 9. FUNCTIONAL REQUIREMENTS

### 9.1 Auth and Session

**FR-001:** Farmer registration accepts `fullName` (3–100 chars), `mobile` (10-digit Indian), optional `aadhar` (12 digits). Creates farmer with `is_demo=true`.

**FR-002:** Duplicate mobile uses `ON CONFLICT DO NOTHING`, returns success idempotently.

**FR-003:** Farmer login sends OTP. Verify-OTP returns JWT (`userId`, `mobile`, `role`, `iat`, `exp` 24h).

**FR-004:** Admin login accepts `email`, `password` (SHA-256 verify), `totpCode` (123456 dev).

**FR-005:** Inspector login: email -> OTP request -> OTP verify -> JWT.

**FR-006:** CSC login: `operatorCode` -> pre-login (blocked check) -> OTP -> JWT.

**FR-007:** Generic `/auth/refresh` accepts refreshToken, returns new accessToken.

**FR-008:** TOTP setup generates secret + QR URI + 8 backup codes. Secret encrypted at rest.

**FR-009:** RBAC decorator `@require_role([...])` returns 403 for unauthorized.

**FR-010:** Horizontal access control: Farmer A cannot access Farmer B's claims.

### 9.2 Farmer Profile

**FR-011:** `GET /farmer/profile` returns `{id, fullName, mobile, carbonEligible, carbonEnrolled}`.

**FR-012:** Profile update accepts village, district, bank, IFSC. Aadhar immutable.

**FR-013:** Photo upload: JPG/PNG/WebP < 10MB. EXIF GPS stripped. UUID filename.

### 9.3 Policy Management

**FR-014:** Policy creation requires `policyNumber` (unique), `farmerId`, `crop`, `insuredArea`, `sumInsured`, `premiumPaid`, `startDate`, `endDate`.

**FR-015:** Duplicate policyNumber -> 409. startDate > endDate -> 400. sumInsured <= 0 -> 400.

**FR-016:** insuredArea > farmer land area -> 400 or warning per adapter.

### 9.4 Claim Intake

**FR-017:** Claim creation accepts `policyId`, `lossType` (DROUGHT/FLOOD/HAIL/PEST/FIRE/OTHER), `lossDate`, `affectedArea`, `claimAmount`, `description` (min 20 chars), `gpsLatitude`, `gpsLongitude`.

**FR-018:** affectedArea > insuredArea -> 400. lossDate outside policy period or future -> 400.

**FR-019:** Claim saved as `DRAFT`. claimNumber auto-generated `C-{YYYY}-{SEQUENCE}`.

**FR-020:** Draft editable for `lossType`, `description`, `affectedArea`, `claimAmount`. policyId immutable.

**FR-021:** Submitted claims immutable by farmers.

**FR-022:** Duplicate detection: same policyId + lossDate + lossType within 30 days -> 409.

### 9.5 Evidence Upload

**FR-023:** Max 5 photos per claim. Each < 10MB. JPG/PNG/WebP only.

**FR-024:** System extracts EXIF GPS and timestamp. Computes SHA-256 hash. Duplicate hash warned/rejected.

**FR-025:** Non-image files -> 400.

### 9.6 State Adapter Validation

**FR-026:** Maharashtra: min 3 photos. Karnataka: NDVI threshold 0.2. Telangana: committee approval for claims > 1L. Punjab: Rabi wheat requires SAR. UP: khatauni required. Rajasthan: drought claims need IMD notification number.

### 9.7 Inspection

**FR-027:** DC assigns officer via `/admin/visits/assign`. Creates cce_visits with status `ASSIGNED`.

**FR-028:** Officer starts visit -> status `IN_PROGRESS`, GPS captured.

**FR-029:** Officer completes with `actualLossPct` (0–100), `cropCondition`, `weatherCorrelated`, `gpsLatitude`, `gpsLongitude`, `remarks`.

**FR-030:** actualLossPct outside 0–100 -> 400. Missing cropCondition -> 400.

**FR-031:** GPS outside India bounds (lat < 6 or > 37, lng < 68 or > 97) -> warning.

**FR-032:** Completion triggers `inspection.completed` event.

**FR-033:** Offline mode: queue locally, sync on reconnect, conflict detection.

### 9.8 Satellite and Weather

**FR-034:** `GET /satellite/ndvi` accepts lat, lng, startDate, endDate. Returns timeseries, mean, min, anomalyDetected.

**FR-035:** anomalyDetected when NDVI drop > threshold (default 0.15, KA adapter 0.2).

**FR-036:** Cached 1h. GEE unavailable -> mock fallback with `isMock=true`.

**FR-037:** `GET /satellite/sar` for flood claims. sarFloodSignal if water detected.

**FR-038:** `GET /weather` returns temp, rainfallMm, humidity, windSpeed. No rain on flood date -> weatherMismatch=true.

**FR-039:** Weather cached 24h. API key missing -> 503.

### 9.9 Fraud Scoring

**FR-040:** Feature assembler extracts 47 features from claim, inspection, satellite, weather, history.

**FR-041:** Missing satellite -> graceful default. Missing inspection -> missing_inspection flag.

**FR-042:** Model inference returns score (0–100), confidence (0–1), riskLevel (LOW/MEDIUM/HIGH/CRITICAL).

**FR-043:** Score outside 0–100 clamped and logged.

**FR-044:** Inference timeout > 5s -> Python rule-based fallback.

**FR-045:** C++ engine not found -> fallback with `engineFallback=true`.

**FR-046:** Score and explanation persisted atomically.

### 9.10 Risk Bands

**FR-047:** 0–30: LOW -> AUTO_APPROVED.

**FR-048:** 31–60: MEDIUM -> OFFICER_REVIEW.

**FR-049:** 61–80: HIGH -> CCE_VISIT.

**FR-050:** 81–100: CRITICAL -> AUTO_REJECTED or REJECTED_FRAUD.

**FR-051:** Boundary inclusive: 30=LOW, 31=MEDIUM, 60=MEDIUM, 61=HIGH, 80=HIGH, 81=CRITICAL.

### 9.11 Review and Decision

**FR-052:** Reviewer approves with `approvedAmount <= claimAmountRequested` and notes.

**FR-053:** Reviewer rejects with mandatory `rejectionReason` (min 20 chars).

**FR-054:** Reviewer flags with `flagReason`; routed to fraud analyst.

**FR-055:** Already-approved cannot be rejected; already-rejected cannot be approved.

**FR-056:** Override score requires `overrideScore`, `overrideReason` (min 20 chars), creates new record, preserves original.

**FR-057:** Explanation visible to reviewer and insurer; NOT to farmer.

### 9.12 Appeals

**FR-058:** Farmer appeals within 30 days of rejection. Requires `appealReason` (min 50 chars), optional new evidence.

**FR-059:** Appeal assigned to senior reviewer (different from original). Only one active appeal per claim.

### 9.13 Notifications

**FR-060:** Types: CLAIM_SUBMITTED, INSPECTION_ASSIGNED, INSPECTION_COMPLETED, CLAIM_APPROVED, CLAIM_REJECTED, FRAUD_ALERT, CLAIM_FLAGGED.

**FR-061:** Unread count accurate. Mark single read, mark all read supported.

### 9.14 Admin and Config

**FR-062:** Admin updates `autoApproveBelow` (0–100). Invalid -> 400. Change non-retroactive.

**FR-063:** Admin creates state adapter config. Cached 5m in Redis.

**FR-064:** Admin views model registry, promotes versions. Only one PRODUCTION at a time.

**FR-065:** Health check returns component statuses. Degraded if any component down.

### 9.15 Evidence Packet

**FR-066:** PDF dossier generated on-demand: claim summary, farmer, policy, inspection, photos, NDVI chart, fraud score, explanation.

**FR-067:** PDF stored in object storage. Signed URL 15-min expiry. Farmer cannot download; reviewer/insurer can.

---

## 10. NON-FUNCTIONAL REQUIREMENTS

**NFR-001:** API p95 latency verify-otp < 300ms. Claim creation < 500ms. Fraud score GET < 200ms.

**NFR-002:** System handles 500 concurrent users. 100 simultaneous claims without corruption.

**NFR-003:** DB query < 500ms with 1M claim records.

**NFR-004:** Target uptime 99.9%. Graceful degradation when Kafka or GEE unavailable.

**NFR-005:** Zero unplanned data loss. All mutations idempotent.

**NFR-006:** Code coverage >= 80%. OpenAPI 3.1 docs. Flyway migrations immutable.

**NFR-007:** Audit logs append-only, 10-year retention. Evidence packets 7 years.

**NFR-008:** WCAG 2.1 AA. Touch targets >= 44x44px.

**NFR-009:** TLS 1.3. PII encrypted at rest (AES-256). Aadhar masked in UI.

**NFR-010:** Data localization in India. PII not logged plaintext.

**NFR-011:** Daily PostgreSQL backups, 30-day retention. PITR enabled. RTO < 4h, RPO < 1h.

**NFR-012:** Docker + K8s cloud-agnostic. Correlation ID across all requests.

**NFR-013:** Prometheus metrics. Grafana dashboards. Alert on latency > 1s, error rate > 0.1%, Kafka lag > 1000.

---

## 11. ROLE-PERMISSION MATRIX

| Action | Farmer | Officer | Reviewer | Fraud Analyst | Insurer | Admin | Super Admin |
|---|---|---|---|---|---|---|---|
| Create claim | Y | N | N | N | N | N | N |
| Edit draft claim | Y | N | N | N | N | N | N |
| View own claims | Y | N | N | N | N | N | N |
| Inspect assigned claim | N | Y | N | N | N | N | N |
| Assign inspection | N | N | Y | N | N | Y | Y |
| Approve/reject claim | N | N | Y | N | N | N | Y |
| Override fraud score | N | N | Y | N | N | N | Y |
| Flag for fraud analyst | N | N | Y | Y | N | N | Y |
| View fraud alert queue | N | N | N | Y | N | N | Y |
| View any claim | N | N | Y | Y | Y (own policies) | Y | Y |
| Download evidence PDF | N | N | Y | Y | Y | Y | Y |
| Appeal rejected claim | Y | N | N | N | N | N | N |
| Manage users | N | N | N | N | N | Y | Y |
| View audit logs | N | N | N | N | N | Y | Y |
| Change thresholds | N | N | N | N | N | Y | Y |
| Manage adapters | N | N | N | N | N | Y | Y |
| Manage model versions | N | N | N | N | N | Y | Y |
| Reset 2FA | N | N | N | N | N | Y | Y |
| View system health | N | N | N | N | N | Y | Y |
| Declare disaster mode | N | N | N | N | N | N | Y |

---

## 12. END-TO-END WORKFLOWS

### 12.1 Farmer Claim Submission
1. Farmer registers/verifies OTP -> JWT.
2. Selects active policy.
3. Fills claim form -> client validation.
4. Uploads 3–5 photos -> type/size/EXIF validation.
5. Submits -> business rules -> saved as SUBMITTED.
6. Kafka `claim.submitted` -> farmer notification.
7. Claim appears in DC queue.

### 12.2 Officer Inspection
1. DC assigns officer -> cce_visits ASSIGNED.
2. `inspection.assigned` -> officer notification.
3. Officer travels, captures GPS, photos (max 10).
4. Fills actualLossPct, cropCondition, weatherCorrelated, remarks.
5. Submits -> claim status UNDER_REVIEW/SCORED.
6. `inspection.completed` -> scoring triggered.

### 12.3 Fraud Scoring
1. Scoring consumer receives event.
2. Assembles 47 features.
3. ML ensemble -> score, confidence, topFactors, SHAP.
4. Score normalized, risk band assigned.
5. `fraud_scores` and `fraud_explanations` created.
6. Claim status updated. `score.completed` published.

### 12.4 Reviewer Decisioning
1. Medium-risk claim in queue.
2. Reviewer views claim + evidence + fraud panel.
3. Fraud panel: score gauge, top-5 factors, human-readable text.
4. Reviewer approves (amount <= claim), rejects (reason mandatory), or flags.
5. Decision persisted. `decision.made` published.
6. Farmer notified. Audit logged.

### 12.5 High-Rraud Escalation
1. Score 81+ -> AUTO_REJECTED.
2. `score.flagged` -> fraud analyst + insurer alerted.
3. Analyst reviews cross-claim correlation, evidence.
4. Documents findings. Recommends action.

### 12.6 Appeal
1. Farmer appeals within 30 days with reason + new evidence.
2. Claim status APPEALED. Assigned to senior reviewer.
3. Senior reviewer decides uphold or approve.
4. Audit logged.

### 12.7 Admin Config Update
1. Admin updates threshold (e.g., autoApproveBelow 30->25).
2. Validated 0–100. Stored in system_configs.
3. `config.updated` event. Audit logged.
4. Non-retroactive.

### 12.8 State Adapter Onboarding
1. Admin adds adapter config via /admin/adapters.
2. Schema validated. Stored and cached.
3. Test claims in staging.
4. Marked active. `adapter.updated` event.

### 12.9 Model Deployment
1. DS evaluates offline AUC-ROC >= 0.85.
2. Registers model. Uploads artifact.
3. Shadow scoring for 2 weeks.
4. Divergence analysis. Promote if better.
5. `model.deployed` event.

### 12.10 Audit Investigation
1. Auditor searches audit logs by claim/farmer.
2. Views audit trail: filed, assigned, inspected, scored, decided.
3. Downloads evidence packet via signed URL.
4. Exports compliance report.

---

## 13. BUSINESS RULES

**BR-001:** Claim only for ACTIVE policy. lossDate within policy period.

**BR-002:** Policy startDate before endDate. No overlapping active policies for same farmer+crop+season.

**BR-003:** affectedArea <= insuredArea + tolerance (default 10%). Minimum 0.01 ha.

**BR-004:** Duplicate = same policyId + lossDate + lossType within 30 days.

**BR-005:** Claims filed within 72h of loss (default; adapter may override). Appeals within 30 days of rejection.

**BR-006:** Maharashtra: min 3 photos. Karnataka: NDVI threshold 0.2. Telangana: committee for > 1L. Punjab: SAR for Rabi wheat. UP: khatauni required. Rajasthan: IMD drought number for drought claims.

**BR-007:** Auto-approve: 0–30. Manual review: 31–60. Field visit: 61–80. Auto-reject: 81–100. Inclusive boundaries.

**BR-008:** Manual review SLA: 3 business days. Field visit SLA: 7 business days. Stale claims auto-escalated.

**BR-009:** Officer max open visits: 5 (configurable). Assignment by district.

**BR-010:** Each photo EXIF timestamp within 7 days of lossDate. GPS within 500m of parcel centroid.

**BR-011:** ML timeout or failure -> Python rule-based fallback. Missing all features -> score 50 (manual review).

**BR-012:** Override allowed by REVIEWER or SUPER_ADMIN. Justification >= 20 chars. New record created. Original preserved.

**BR-013:** Score 81–90 override requires senior reviewer. 91–100 requires super admin + fraud analyst.

---

## 14. FRAUD SCORING DESIGN

**Philosophy:** Hybrid risk ranking (rules + ML + external evidence), not binary classification.

**Architecture Layers:**
1. Rule Pre-filter: Block obvious violations.
2. Feature Assembler: 47-feature vector.
3. ML Ensemble: Primary score 0–100 + confidence + SHAP.
4. C++ Accelerator: Optional low-latency path.
5. Python Fallback: Graceful degradation.
6. Risk Router: Route to appropriate queue.

**Score Bands:**

| Band | Score | Risk Level | Action | Authority |
|---|---|---|---|---|
| A | 0–30 | LOW | Auto-approve | System |
| B | 31–60 | MEDIUM | Manual review | District Reviewer |
| C | 61–80 | HIGH | Field visit / deep validation | Senior Officer + Reviewer |
| D | 81–100 | CRITICAL | Auto-reject / fraud investigation | System + Fraud Analyst |

**Confidence:** 0–1. < 0.7 forces manual review regardless of band.

**Explainability:** Every score >= 31 includes top-5 factors (name, weight, direction, description). Weights sum approximately to total score (+-5).

**Override:** Reviewer override creates new record; original preserved. Override rate target < 15%.

**Adverse Decisions:** Auto-reject generates reason from top-3 factors. Manual reject requires >= 20 char reason.

---

## 15. ML / AI SPECIFICATION

### 15.1 Problem Framing
Primary: Regression (score 0–100). Secondary: Binary classification for metrics. Output: score + confidence + top factors.

### 15.2 47 Fraud Features

**A. Policy and Claim (1–8):** claim_amount_ratio, affected_area_ratio, days_after_policy_start, days_before_policy_end, policy_tenure_days, declared_crop_risk, sum_insured_per_hectare, claim_count_this_season.

**B. Farmer History (9–16):** total_claims_ever, approved_claims_ratio, avg_claim_amount, claim_frequency_90d, days_since_last_claim, farmer_tenure_days, prior_fraud_flags, claim_amount_variance.

**C. Geospatial (17–24):** gps_distance_from_parcel, geo_cluster_count_90d, geo_cluster_different_farmers, same_gps_3plus_claims, district_fraud_rate, taluk_claim_density, state_risk_index, distance_to_nearest_water_body.

**D. Satellite (25–32):** ndvi_sowing, ndvi_claim, ndvi_drop, ndvi_anomaly, ndvi_mismatch, sar_flood_signal, ndvi_trend_30d, cloud_cover_pct.

**E. Weather (33–38):** rainfall_loss_date_mm, rainfall_7d_total, weather_mismatch, extreme_weather_event, temp_max_loss_date, humidity_loss_date.

**F. Inspection Discrepancy (39–43):** officer_loss_pct_diff, discrepancy_flag, inspection_gps_distance, inspection_photo_count, inspection_photo_gps_variance.

**G. Temporal/Behavioral (44–46):** claim_filed_hour, weekend_filed, days_between_loss_and_file.

**H. Network/Anomaly (47):** network_anomaly_score (z-score vs peer group).

### 15.3 Training and Operations
- Labels: Confirmed fraud = positive; auto-approved no dispute = negative.
- Imbalance: SMOTE/ADASYN, cost-sensitive learning (FN cost 5x FP).
- Retraining: Monthly if drift, quarterly scheduled.
- Champion/Challenger: Shadow scoring for 2 weeks. Promote if +1% AUC-ROC for 2 weeks.
- Drift: PSI > 0.2 or KS p < 0.01 triggers alert. Daily 2 AM check.
- Feature Store: Redis online (5m TTL), PostgreSQL/Parquet offline.
- Model Registry: `model_registry` table + object storage artifacts.
- Inference Contract: JSON in (47 features), JSON out (score, confidence, risk_level, top_factors, shap_values, missing_features, inference_time_ms, model_version). p95 < 500ms Python, < 200ms C++.
- Fairness: Demographic parity across districts (5% mean diff). Quarterly fairness audit.

---

## 16. STATE ADAPTER FRAMEWORK

**Architecture:** Pluggable JSON configs in `state_adapters` table, cached in Redis (5m TTL). No code changes for new states.

**Interface:** state_code, name, min_photos, ndvi_threshold, area_tolerance_pct, required_fields, scheme_mappings, routing_rules, risk_rules, language, active.

**State Definitions:**

| State | Min Photos | NDVI Threshold | Special Rules |
|---|---|---|---|
| Maharashtra | 3 | 0.35 | revenue_survey_number required; committee for > 2L |
| Karnataka | 1 | 0.20 | rtc_number required |
| Telangana | 1 | 0.30 | committee before insurer for > 1L |
| Punjab | 1 | 0.35 | SAR required for Rabi wheat |
| Uttar Pradesh | 1 | 0.28 | khatauni required |
| Rajasthan | 1 | 0.25 | IMD drought number for drought |

**Fallback:** Unknown/inactive state -> default adapter (min_photos=1, ndvi_threshold=0.15, area_tolerance=10%).

**Onboarding:** Admin creates config -> validate schema -> store and cache -> test in staging -> activate -> `adapter.updated` event.

---

## 17. DATA MODEL AND DATABASE DESIGN

**Principles:** UUID PKs. created_at/updated_at on all mutable tables. JSONB for flexible configs. Append-only audit. Proper indexing.

**Core Tables:**

| Table | Purpose | Key Fields |
|---|---|---|
| users | Auth identities | id, email, mobile, password_hash, role, is_active, totp_enabled |
| roles | Role definitions | id, name, description |
| permissions | Action permissions | id, resource, action |
| role_permissions | Role-permission map | role_id, permission_id |
| user_sessions | Active sessions | id, user_id, jti, token_hash, expires_at, ip_address |
| totp_config | TOTP secrets | id, user_id, secret_encrypted, backup_codes |
| farmers | Farmer registry | id, full_name, mobile, aadhar_hash, bank_account, village_id, district_id, state_code, land_area_ha, carbon_eligible, carbon_enrolled, is_demo |
| farmer_addresses | Address history | id, farmer_id, address_type, address_line, pincode |
| insurers | Insurance companies | id, name, code, contact_email, is_active |
| policies | Insurance policies | id, policy_number, insurer_id, farmer_id, crop, insured_area, sum_insured, premium_paid, start_date, end_date, status |
| claims | Claim records | id, claim_number, udlrn, farmer_id, policy_id, loss_type, loss_date, affected_area, claim_amount_requested, description, gps_latitude, gps_longitude, status, fraud_score, fraud_flags, officer_id, reviewer_id, approved_amount, rejection_reason, review_notes, filed_at, decided_at |
| claim_status_history | Status transitions | id, claim_id, from_status, to_status, actor_id, actor_type, notes, created_at |
| claim_documents | Claim evidence | id, claim_id, file_name, file_hash, storage_url, mime_type, gps_latitude, gps_longitude, exif_timestamp, created_at |
| evidence_items | Generic evidence | id, entity_type, entity_id, evidence_type, file_hash, storage_url, metadata, created_at |
| inspections | Field inspections | id, claim_id, officer_id, visit_number, status, scheduled_date, actual_loss_pct, crop_condition, weather_correlated, gps_latitude, gps_longitude, remarks, started_at, completed_at |
| inspection_photos | Inspection photos | id, inspection_id, file_hash, storage_url, gps_latitude, gps_longitude, exif_timestamp, taken_at |
| geo_locations | Geospatial data | id, entity_type, entity_id, latitude, longitude, accuracy_meters, source |
| fraud_scores | Scoring results | id, claim_id, score, confidence, risk_level, model_version, feature_snapshot_id, computed_at |
| fraud_explanations | Score explanations | id, fraud_score_id, top_factors, shap_values, human_readable_text, created_at |
| fraud_feature_snapshots | Feature vectors | id, claim_id, features_json, computed_at |
| rule_evaluations | Rule triggers | id, claim_id, rule_name, triggered, details, evaluated_at |
| state_adapters | Per-state configs | id, state_code, name, config_json, active, created_at, updated_at |
| notification_templates | Message templates | id, type, title_template, message_template, channels, active |
| notifications | User notifications | id, user_id, type, title, message, channel, is_read, read_at, created_at |
| audit_logs | Immutable audit | id, actor_id, actor_type, action, target_id, target_type, ip_address, user_agent, request_body_hash, details, created_at |
| system_configs | Runtime config | id, key, value, description, updated_by, updated_at |
| model_registry | Model metadata | id, version, algorithm, feature_count, training_date, validation_auc, test_auc, status, storage_path, created_at |
| model_deployments | Deployment history | id, model_id, deployed_at, deployed_by, previous_model_id, notes |
| scoring_requests | Scoring API logs | id, claim_id, model_id, latency_ms, status, fallback_used, created_at |
| scoring_results | Scoring outputs | id, scoring_request_id, score, confidence, risk_level, is_shadow, created_at |
| district_masters | District reference | id, state_code, district_code, name, centroid_lat, centroid_lng |
| crop_masters | Crop reference | id, name, category, growing_season, typical_ndvi_range |
| weather_cache | Cached weather | id, lat, lng, date, temperature, rainfall_mm, humidity, wind_speed, source, cached_at |
| satellite_cache | Cached satellite | id, lat, lng, start_date, end_date, ndvi_values, mean_ndvi, min_ndvi, anomaly_detected, is_mock, cached_at |
| integration_runs | External API calls | id, integration_name, endpoint, status, request_hash, response_hash, latency_ms, created_at |
| cce_visits | Inspection visits | id, visit_number, claim_id, assigned_to, assigned_by, status, scheduled_date, priority, notes_to_officer, created_at |
| disaster_events | Disaster declarations | id, event_name, disaster_type, affected_districts, start_date, end_date, description, declared_by, status, created_at |
| vao_alerts | VAO notifications | id, vao_name, vao_id, district_id, claim_id, alert_type, details, status, resolution_notes, created_at, updated_at |

**Retention:**
- Audit logs: 10 years.
- Evidence packets and claims: 7 years.
- Scoring results and feature snapshots: 2 years.
- Session/cache: 24 hours.
- Old data archived annually to cold storage.

---

## 18. FLYWAY DATABASE MIGRATION PLAN

**Principles:** Immutable versioned migrations. Roll-forward strategy. Schema history table awareness.

| Version | Filename | Purpose | Objects |
|---|---|---|---|
| V1 | V1__init_extensions.sql | Enable pgcrypto, postgis, uuid-ossp | Extensions |
| V2 | V2__create_users_and_roles.sql | Auth foundation | users, roles, permissions, role_permissions |
| V3 | V3__create_farmers_and_profiles.sql | Farmer registry | farmers, farmer_addresses, location tables |
| V4 | V4__create_insurers_and_policies.sql | Policy management | insurers, policies |
| V5 | V5__create_claims.sql | Claim intake | claims, claim_status_history, claim_documents |
| V6 | V6__create_inspections.sql | Field inspections | inspections, inspection_photos, cce_visits |
| V7 | V7__create_fraud_scoring.sql | Fraud engine | fraud_scores, fraud_explanations, fraud_feature_snapshots, rule_evaluations |
| V8 | V8__create_state_adapters.sql | State framework | state_adapters |
| V9 | V9__create_notifications.sql | Notification service | notification_templates, notifications |
| V10 | V10__create_audit_logs.sql | Audit layer | audit_logs |
| V11 | V11__create_system_configs.sql | Admin config | system_configs |
| V12 | V12__create_model_registry.sql | Model ops | model_registry, model_deployments |
| V13 | V13__create_scoring_tables.sql | Scoring logs | scoring_requests, scoring_results |
| V14 | V14__create_geo_tables.sql | Geospatial | geo_locations, district_masters, crop_masters |
| V15 | V15__create_weather_satellite_cache.sql | External cache | weather_cache, satellite_cache |
| V16 | V16__create_evidence_items.sql | Evidence mgmt | evidence_items |
| V17 | V17__create_integration_runs.sql | Integration logging | integration_runs |
| V18 | V18__create_user_sessions.sql | Session mgmt | user_sessions, totp_config |
| V19 | V19__seed_location_masters.sql | Seed data | States, districts, taluks, crops |
| V20 | V20__seed_demo_users.sql | Demo users | Farmers, officers, CSC operators, admin |
| V21 | V21__seed_state_adapters.sql | Adapter configs | 6 state adapter configs |
| V22 | V22__create_disaster_events.sql | Disaster mode | disaster_events |
| V23 | V23__create_vao_alerts.sql | VAO framework | vao_alerts |
| V24 | V24__add_claim_indexes.sql | Performance | Indexes on claims (status, filed_at, farmer_id, policy_id) |
| V25 | V25__add_audit_indexes.sql | Performance | Indexes on audit_logs (actor_id, action, created_at) |
| V26 | V26__add_partitioning_claims.sql | Scale | Monthly partition setup for claims |

---

## 19. API SPECIFICATION

**Versioning:** `/api/v1/...`. Breaking changes bump to `/api/v2/...`.

**Auth:** Bearer JWT in Authorization header.

**Error Format:**
```json
{
  "success": false,
  "error": { "message": "...", "code": "ERROR_CODE", "details": {} }
}
```

**Pagination:**
```json
{
  "success": true,
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "limit": 20,
    "has_next": true,
    "has_prev": false
  }
}
```

**Idempotency:** `Idempotency-Key` header on mutating endpoints. Cached 24h.

**Standard Headers:** `X-Request-ID` (returned in response), `X-Correlation-ID`.

**Rate Limit Headers:** `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `Retry-After`.

### Endpoint Groups

**Auth:**
- `POST /api/v1/auth/send-otp` -> { mobile }
- `POST /api/v1/auth/verify-otp` -> { mobile, otp } -> { accessToken, user }
- `POST /api/v1/auth/refresh` -> { refreshToken } -> { accessToken }
- `POST /api/v1/auth/2fa/setup` -> Auth required -> { secret, qrUri, backupCodes }
- `POST /api/v1/auth/2fa/enable` -> { totpCode }
- `POST /api/v1/auth/2fa/disable` -> { password, totpCode }

**Farmers:**
- `POST /api/v1/farmer/register` -> { fullName, mobile, aadhar? }
- `POST /api/v1/farmer/login` -> { mobile } -> { devOtp }
- `POST /api/v1/farmer/verify-otp` -> { mobile, otp } -> { accessToken, farmer, udlrn }
- `GET /api/v1/farmer/profile` -> Auth -> { id, fullName, mobile, carbonEligible, carbonEnrolled }
- `PUT /api/v1/farmer/profile` -> Auth -> { villageId?, bankAccount?, ifsc? }
- `POST /api/v1/farmer/profile/photo` -> Auth, multipart -> { url }
- `GET /api/v1/farmer/policies` -> Auth -> [ policies ]
- `GET /api/v1/farmer/claims` -> Auth -> [ claims ]
- `POST /api/v1/farmer/claims` -> Auth -> { claim }
- `PUT /api/v1/farmer/claims/{id}` -> Auth -> { claim }
- `DELETE /api/v1/farmer/claims/{id}` -> Auth -> 204
- `POST /api/v1/farmer/claims/{id}/photos` -> Auth, multipart -> { urls }
- `POST /api/v1/farmer/claims/{id}/submit` -> Auth -> { claim }

**Policies:**
- `POST /api/v1/insurer/policies` -> Admin/Insurer -> { policy }
- `GET /api/v1/insurer/policies` -> Auth -> [ policies ]
- `GET /api/v1/farmer/policies/{id}` -> Auth -> { policy }

**Claims:**
- `GET /api/v1/claims` -> Reviewer/Admin -> [ claims ]
- `GET /api/v1/claims/{id}` -> Auth -> { claim }
- `POST /api/v1/claims/{id}/appeal` -> Farmer -> { appeal }

**Inspections:**
- `GET /api/v1/officer/visits` -> Officer -> [ visits ]
- `PUT /api/v1/officer/visits/{id}/start` -> Officer -> { visit }
- `POST /api/v1/officer/visits/{id}/complete` -> Officer -> { visit }
- `POST /api/v1/officer/visits/{id}/photos` -> Officer, multipart -> { urls }
- `POST /api/v1/dc/officers/{officer_id}/assign` -> Reviewer -> { visit }

**Fraud:**
- `GET /api/v1/fraud-scores/{claim_id}` -> Reviewer/Insurer -> { score, explanation }
- `POST /api/v1/fraud-scores/{claim_id}/override` -> Reviewer -> { score }

**Satellite:**
- `GET /api/v1/satellite/ndvi` -> Auth -> { ndvi_values, mean_ndvi, min_ndvi, anomaly_detected }
- `GET /api/v1/satellite/sar` -> Auth -> { sar_flood_signal, is_available }

**Weather:**
- `GET /api/v1/weather` -> Auth -> { temperature, rainfall_mm, humidity, wind_speed }

**Review:**
- `GET /api/v1/dc/claims` -> Reviewer -> [ claims ]
- `GET /api/v1/dc/fraud-alerts` -> Reviewer/Fraud Analyst -> [ alerts ]
- `PUT /api/v1/dc/claims/{id}/approve` -> Reviewer -> { claim }
- `PUT /api/v1/dc/claims/{id}/reject` -> Reviewer -> { claim }
- `PUT /api/v1/dc/claims/{id}/flag` -> Reviewer -> { claim }

**Notifications:**
- `GET /api/v1/notifications` -> Auth -> [ notifications ]
- `PUT /api/v1/notifications/{id}/read` -> Auth -> { notification }
- `PUT /api/v1/notifications/mark-all-read` -> Auth -> { count }

**Admin:**
- `POST /api/v1/admin/login` -> { email, password, totpCode } -> { accessToken, officer }
- `GET /api/v1/admin/dashboard` -> Admin -> { stats }
- `GET /api/v1/admin/review-queue` -> Admin -> { items, total, page, limit }
- `GET /api/v1/admin/stats` -> Admin -> { totalClaims, pendingReview, approved, rejected }
- `GET /api/v1/admin/claims/{id}` -> Admin -> { claim detail }
- `POST /api/v1/admin/claims/{id}/approve` -> Admin -> { claim }
- `POST /api/v1/admin/claims/{id}/reject` -> Admin -> { claim }
- `POST /api/v1/admin/claims/{id}/override` -> Admin -> { claim }
- `GET /api/v1/admin/csc-activity` -> Admin -> [ csc operators ]
- `GET /api/v1/admin/csc-operators` -> Admin -> [ operators ]
- `POST /api/v1/admin/csc-operators/{id}/{action}` -> Admin -> { success }
- `GET /api/v1/admin/officers` -> Admin -> [ officers ]
- `POST /api/v1/admin/officers` -> Admin -> { id, tempPassword }
- `GET /api/v1/admin/rules` -> Admin -> [ rules ]
- `PATCH /api/v1/admin/rules/{id}` -> Admin -> { success }
- `GET /api/v1/admin/udlrn/{udlrn}` -> Admin -> { land record }
- `POST /api/v1/admin/udlrn/{udlrn}/freeze` -> Admin -> { success }
- `GET /api/v1/admin/heatmap` -> Admin -> { heatmap data }
- `GET /api/v1/admin/analytics` -> Admin -> { trends }
- `GET /api/v1/admin/model-registry` -> Admin -> [ models ]
- `POST /api/v1/admin/model-registry/{id}/promote` -> Admin -> { success }
- `GET /api/v1/admin/audit-log` -> Admin -> [ audit entries ]
- `GET /api/v1/admin/audit` -> Admin -> [ audit entries ]
- `POST /api/v1/admin/visits/assign` -> Admin -> { visitNumber }
- `GET /api/v1/admin/visits` -> Admin -> [ visits ]
- `POST /api/v1/admin/disaster-mode` -> Admin -> { disasterId, autoApproved, flaggedOutliers }
- `GET /api/v1/admin/disaster-mode` -> Admin -> { disaster }
- `PUT /api/v1/admin/disaster-mode/{id}/deactivate` -> Admin -> { status }
- `GET /api/v1/admin/vao-alerts` -> Admin -> [ alerts ]
- `POST /api/v1/admin/vao-alerts` -> Admin -> { alertId }
- `PUT /api/v1/admin/vao-alerts/{id}` -> Admin -> { success }
- `GET /api/v1/admin/system/health` -> Admin -> { status, services }

**Inspector:**
- `POST /api/v1/inspector/auth/request-otp` -> { email } -> { devOtp }
- `POST /api/v1/inspector/auth/login` -> { email, otp } -> { token, inspector }
- `GET /api/v1/inspector/assignments` -> Inspector -> [ assignments ]
- `GET /api/v1/inspector/visit/{id}` -> Inspector -> { visit detail }

**CSC:**
- `POST /api/v1/csc/auth/pre-login` -> { operatorCode, password } -> { requiresOtp }
- `POST /api/v1/csc/auth/login` -> { operatorCode, password, otp } -> { token, operator }
- `GET /api/v1/csc/dashboard` -> CSC -> { stats }

**Health:**
- `GET /health` -> Public -> { status, timestamp }

---

## 20. EVENT-DRIVEN AND KAFKA DESIGN

**Brokers:** 3-node KRaft. Replication factor 3.

**Topics:**

| Topic | Producer | Consumer | Partitions | Retention |
|---|---|---|---|---|
| claim.created | Claims API | Audit, Notification | 6 | 7d |
| claim.submitted | Claims API | Scoring trigger, Audit | 6 | 7d |
| claim.validated | Validation service | Audit | 6 | 7d |
| inspection.assigned | Admin API | Notification, Audit | 6 | 7d |
| inspection.completed | Officer API | Scoring service, Audit | 12 | 7d |
| evidence.uploaded | Evidence API | Audit | 6 | 7d |
| score.requested | Scoring consumer | Scoring worker | 12 | 7d |
| score.completed | Scoring worker | Decision router, Audit | 12 | 7d |
| score.flagged | Scoring worker | Notification, Fraud analyst | 6 | 7d |
| decision.made | Review API | Notification, Audit | 6 | 7d |
| notification.dispatch.requested | Notification consumer | SMS/Email/Push gateways | 6 | 7d |
| audit.event.created | All services | Audit persistence | 6 | 365d |
| model.deployed | Admin API | Model ops, Audit | 3 | 30d |
| adapter.updated | Admin API | Cache invalidation, Audit | 3 | 30d |
| config.updated | Admin API | Config reload, Audit | 3 | 30d |

**Retry:** 3 retries with exponential backoff (1s, 2s, 4s). Dead letter queue after exhaustion.

**Idempotency:** Every message has `idempotency_key`. Consumers check `processed_events` table.

**Ordering:** Per-claim ordering guaranteed by `claim_id` hash partitioning.

---

## 21. FILES, EVIDENCE, AND DOCUMENT MANAGEMENT

**File Types:** JPG, PNG, WebP for photos. PDF for documents. No EXE, ZIP, or executables.

**Upload Rules:** Max 10MB per file. Max 5 photos per claim. Max 10 per inspection. Resumable multipart upload.

**Virus Scan:** Optional ClamAV integration. Infected files rejected with 400.

**Metadata Extraction:** EXIF GPS, timestamp, camera model. GPS preserved for evidence correlation. Stripped from farmer profile photos for privacy.

**OCR:** Phase 2 (Tesseract for document text extraction).

**Signed URLs:** 15-minute expiry. HMAC-SHA256 signature. Tampered or expired URLs return 403.

**Retention:** Evidence files 7 years. Deduplication via SHA-256 hash.

**PDF Dossier:** Generated on-demand. Max 30s. Timeout returns 202 with async job ID.

---

## 22. FRONTEND / UI SRS

**Stack:** React 18+, TypeScript 5+, Tailwind CSS 3+, React Query, Zustand, React Router v6, Vite 5+.

**Design Principles:** Mobile-first. Touch targets >= 44px. WCAG 2.1 AA. Skeleton loaders. Empty states. Error boundaries.

**State Management:** React Query for server state. Zustand for auth and UI state.

**Route Guards:** Protected routes check JWT expiry and role. Expired tokens trigger redirect to login with toast.

### Page Requirements

**Farmer Portal:**
- Dashboard: Stat cards (claim count, pending, approved, rejected), recent claims table, notification bell with unread count.
- Create Claim: Multi-step form (Step 1: policy selector, Step 2: loss details + photo upload with previews, Step 3: review + submit).
- Claim History: Filterable table with status badges, pagination.
- Claim Detail: Status timeline, evidence photos, decision details.
- Notifications: Unread badge, mark read, mark all read.
- Profile: View/edit fields, photo upload.

**Officer Portal:**
- Dashboard: Assigned visits count, completed count, pending count.
- Assignments: Filterable list by status (pending, in_progress, completed).
- Inspection Detail: Claim summary, farmer info, GPS capture button, photo upload (max 10), loss percentage slider, crop condition radio group, remarks textarea.
- Offline Sync Queue: List of pending syncs, retry button, conflict indicators.

**Reviewer Portal:**
- Dashboard: Queue stats, TAT metrics, productivity chart.
- Claim Queue: Filterable by status, fraud score range, district, date. Priority column.
- Claim Detail: Tabs for Summary, Evidence, Satellite, Weather, Fraud Panel, Audit Trail.
- Fraud Panel: Color-coded gauge, top-5 factors with bar weights, human-readable summary.
- Decision Screen: Approve (amount input), Reject (reason textarea), Flag (reason textarea). Confirmation modal.

**Insurer Portal:**
- Portfolio Dashboard: Total exposure, claim count by status, fraud trend line.
- Fraud Analytics: Score distribution, district heatmap, crop-wise patterns.
- Claim Monitoring: Filterable list with fraud score column.

**Admin Portal:**
- User Management: Search, filter by role, edit modal, unlock button, reset 2FA button, delete with confirmation.
- Config Management: Threshold sliders, save with audit trail.
- Adapter Management: JSON editor for adapter config, validate button, activate toggle.
- Model Management: Registry table, promote button, shadow toggle.
- Audit Explorer: Filter by user, action, date. Pagination.
- System Health: Component status cards (postgres, redis, kafka, engine), degradation alerts.

---

## 23. SECURITY SRS

**Authentication:**
- JWT access tokens: HS256, 24h expiry, secret >= 64 chars.
- Refresh tokens: Same secret, rotation recommended (same token returned currently; rotate in future).
- Bearer token in Authorization header.

**RBAC:**
- Roles: FARMER, FIELD_INSPECTOR, REVIEWER, SUPER_ADMIN, FRAUD_ANALYST, INSURER_ANALYST, CSC_OPERATOR.
- `@require_role` decorator on endpoints.
- Horizontal access control: Farmer A cannot access Farmer B data.

**2FA/TOTP:**
- TOTP for privileged users (admin, super admin).
- Setup generates secret + QR + 8 backup codes.
- Secret encrypted at rest (AES-256).

**Password Policy:**
- Admin passwords: SHA-256 with migration path to bcrypt.
- Minimum 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character.
- No password in any API response.

**Brute-Force Protection:**
- Rate limiting: 60 req/min per IP general, 5 req/min auth endpoints.
- Account lockout after 5 failed login attempts (30-minute lock).

**Session Management:**
- JWT expiry enforced server-side.
- No server-side logout; tokens expire naturally.

**Encryption:**
- TLS 1.3 in transit.
- AES-256 at rest for PII (Aadhar, bank details).
- Aadhar masked in UI (last 4 digits only).

**PII Handling:**
- Data localization in India.
- PII not logged in plain text.
- Right to export and deletion within regulatory limits.

**Secrets Management:**
- Environment variables or vault (HashiCorp Vault / AWS Secrets Manager).
- No secrets in code or Git.

**Audit Logging:**
- Every mutation logged: actor, action, target, IP, user_agent, timestamp.
- Append-only. No delete endpoint.

**Secure File Access:**
- Signed URLs with 15-minute expiry.
- Direct bucket access denied.

**API Abuse Protection:**
- Rate limiting per IP and per user.
- CORS whitelist.
- Input validation and sanitization.

**OWASP Mitigations:**
- SQL injection: Parameterized queries (SQLAlchemy).
- XSS: Output escaping, CSP headers.
- CSRF: State-changing endpoints require valid JWT (no CSRF token needed for API-only).
- Insecure deserialization: Pydantic strict validation.
- Security misconfiguration: Security headers (HSTS, X-Content-Type-Options, X-Frame-Options).

---

## 24. OBSERVABILITY AND OPERATIONS

**Logs:**
- Structured JSON via `structlog`.
- Correlation ID propagated across all services.
- Log levels: DEBUG, INFO, WARN, ERROR.
- Retention: 30 days hot, 1 year cold.

**Metrics (Prometheus):**
- `api_request_duration_seconds` (histogram)
- `api_request_total` (counter, labeled by status, endpoint)
- `scoring_latency_ms` (histogram)
- `kafka_consumer_lag` (gauge)
- `db_connection_pool_usage` (gauge)
- `cache_hit_ratio` (gauge)

**Traces:**
- OpenTelemetry for FastAPI, SQLAlchemy, Kafka, Redis.
- Sampling: 10% in production, 100% in staging.

**Alerting:**
- p95 latency > 1s for 5 minutes -> PagerDuty.
- Error rate > 0.1% for 5 minutes -> Slack #alerts.
- Kafka lag > 1000 messages -> PagerDuty.
- DB pool usage > 80% -> Slack warning.
- Scoring latency p95 > 2000ms -> Slack #ml-alerts.

**Health Checks:**
- `GET /health`: Liveness probe (always 200 if process running).
- `GET /ready`: Readiness probe (DB, Redis, Kafka connectivity).
- Kubernetes: Liveness every 10s, readiness every 5s.

**Dashboards:**
- API Performance: Latency, error rate, throughput by endpoint.
- System Health: DB, Redis, Kafka, engine status.
- Scoring Pipeline: Latency, fallback rate, score distribution.
- Reviewer Queue: Depth, TAT, SLA breaches.
- Farmer Experience: Submission rate, upload success, login success.

---

## 25. TESTING STRATEGY

**Unit Testing:**
- Target: >= 80% coverage for business logic.
- Tools: pytest, pytest-asyncio.
- Scope: Service layer, validators, feature computation, score normalization.

**Integration Testing:**
- Scope: DB migrations, Kafka publish/consume, Redis caching, external API mocks.
- Tools: pytest with TestContainers (PostgreSQL, Redis, Kafka).

**Contract Testing:**
- OpenAPI spec validated against implementation.
- Consumer-driven contract tests for external integrations.

**API Testing:**
- All endpoints tested: happy path, validation errors, auth failures, rate limiting.
- Tools: pytest with httpx.

**Migration Testing:**
- Flyway migrations run on fresh DB -> no errors.
- Checksum validation on altered files -> rejected.

**Performance Testing:**
- Tools: k6.
- Scenarios: Smoke (1 VU), Ramp (0->500 over 5m), Sustained (500 for 30m), Spike (1000 instant).
- Targets: p95 login < 300ms, p95 claims < 500ms, error rate < 0.1%.

**Security Testing:**
- SQL injection, XSS, JWT tampering, IDOR, file upload attacks.
- Tools: OWASP ZAP, nuclei, custom penetration tests.

**UAT:**
- Staged rollout to 1 district per state.
- Farmer, officer, reviewer acceptance sign-off.

**ML Testing:**
- Offline evaluation: AUC-ROC, precision, recall, fairness metrics.
- Shadow deployment: Challenger vs champion on live traffic.
- Drift simulation: Inject drifted data, verify alert triggers.

**Adapter Testing:**
- Unit: Config schema validation per state.
- Integration: End-to-end claim flow per state.

**Frontend Testing:**
- Component tests: React Testing Library.
- E2E tests: Playwright. Coverage for all portals and critical workflows.

**Sample Test Scenarios:**
- Duplicate claim with same policy + lossDate + lossType.
- Wrong state adapter (e.g., Maharashtra claim with 2 photos).
- Evidence missing (0 photos).
- Low-confidence model output (< 0.7) -> manual review.
- Reviewer override with justification.
- Token expiry during claim creation -> redirect to login.
- Offline inspection sync conflict.

---

## 26. DEVOPS, ENVIRONMENTS, AND DEPLOYMENT

**Environments:**
- Local: Docker Compose (PostgreSQL, Redis, Kafka, MinIO).
- Dev: K8s namespace, auto-deploy from feature branches.
- Test: K8s namespace, integration test suite.
- Staging: K8s namespace, perf tests, UAT.
- Prod: K8s cluster, blue/green deployment.

**Containerization:**
- FastAPI app: Python 3.11 slim image.
- Frontend: Nginx serving static build.
- Workers: Celery worker image.
- All images scanned with Trivy before deployment.

**CI/CD Pipeline:**
1. Lint (ruff, eslint) -> 2. Unit tests -> 3. Build images -> 4. Integration tests -> 5. Security scan -> 6. Deploy to dev -> 7. Deploy to test -> 8. Deploy to staging -> 9. Manual gate -> 10. Deploy to prod (blue/green).

**Migration Execution:**
- Flyway migrations run as K8s Job before app deployment.
- Roll-forward only. No rollback of DB changes.
- Migration failures block deployment.

**Rollback Strategy:**
- Application: Blue/green switch.
- Database: Forward-only migrations; broken changes fixed by new migration.
- Kafka: Consumer version coexists during deployment.

**Config Management:**
- Non-sensitive: ConfigMap.
- Sensitive: Sealed Secrets or Vault.

**Release Strategy:**
- Blue/green for API and frontend.
- Canary for model deployments (5% -> 25% -> 100%).

**Backup/Restore:**
- PostgreSQL: Daily automated backups, PITR enabled, 30-day retention.
- Object storage: Cross-region replication.
- RTO < 4h, RPO < 1h.

---

## 27. SEED DATA AND DEMO DATA SPEC

**Users:**
- 50 farmers across 6 states (MH, KA, TG, PB, UP, RJ). Mobiles: 9900000001–9900000050.
- 10 field officers (2 per state). Emails: inspector.{state}@bhuvigyan.gov.in.
- 5 district reviewers. Emails: reviewer.{district}@bhuvigyan.gov.in.
- 2 super admins. Emails: superadmin@bhuvigyan.gov.in, admin@bhuvigyan.gov.in.
- 5 CSC operators. Codes: CSC-{state}-001 to CSC-{state}-005.

**Policies:**
- 100 active policies. Crops: Rice, Wheat, Cotton, Sugarcane, Maize.
- Sum insured: 50,000–500,000. Insured area: 1–10 hectares.

**Claims:**
- 200 sample claims distributed across fraud bands:
  - LOW (0–30): 80 claims
  - MEDIUM (31–60): 60 claims
  - HIGH (61–80): 40 claims
  - CRITICAL (81–100): 20 claims
- Statuses: DRAFT, SUBMITTED, ASSIGNED, IN_PROGRESS, COMPLETED, UNDER_REVIEW, APPROVED, REJECTED, AUTO_APPROVED, AUTO_REJECTED.

**Inspections:**
- 150 inspections linked to claims.
- GPS coordinates within 500m of claim GPS.
- Photo counts: 3–10 per inspection.

**Notifications:**
- 500 sample notifications across all types and users.

**Audit Events:**
- 1000 sample audit entries covering all major actions.

**State Adapter Configs:**
- 6 state configs with distinct rules (see Section 16).

**Model Metadata:**
- 2 model versions: v6.0-ensemble (PRODUCTION), v6.1-ensemble-beta (STAGING).

**Weather/Satellite Cache:**
- Pre-populated cache for 50 locations.

---

## 28. REPORTING AND ANALYTICS

**Reports:**
- Fraud Trend: Daily avg score, claim count, score distribution.
- District Heatmap: Claims and avg fraud score per district.
- Crop-Wise Loss Pattern: Claims by crop, loss type, approval rate.
- Reviewer Productivity: Decisions per day, avg time per claim, SLA adherence.
- Officer Productivity: Visits per day, GPS capture rate, completion rate.
- Claim TAT: Time from submission to decision by band and state.
- False Positive/Negative Tracking: Override reasons, appeal outcomes.
- Amount Saved: Estimated fraud prevention value.
- Insurer Exposure: Portfolio risk summary.
- State Rollout: Onboarding status, claim volume, fraud rate per state.

**Export Formats:** CSV, Excel, PDF.

---

## 29. ROI MODEL AND BUSINESS IMPACT

**Assumptions:**
- Annual claims processed: 1,000,000.
- Average claim amount: 75,000.
- Baseline fraud leakage: 20%.
- V7 fraud leakage: 10% (Year 1), 6% (Year 3).

**Savings Calculation:**
- Year 1 fraud prevention: 1,000,000 claims * 75,000 * (20% - 10%) = 750 crores saved.
- Year 3 fraud prevention: 1,000,000 * 75,000 * (20% - 6%) = 1,050 crores saved.

**Operational Savings:**
- Officer cost reduction: 2,000/claim -> 1,500/claim = 500/claim saved.
- Reviewer throughput doubling = 50% staffing cost reduction for same volume.

**ROI:**
- Year 1: Break-even (platform cost ~50 crores vs savings ~100 crores including ops).
- Year 2: 2:1 ROI.
- Year 3: 4:1 ROI.

---

## 30. ROADMAP

**MVP (V7.0):** Core auth, claims, scoring, 6 state adapters, admin, audit, disaster mode.

**V7.1 (3 months):** SAR flood detection, champion/challenger, drift dashboard, offline sync, enhanced PDF dossier.

**V7.2 (6 months):** Drone imagery, voice-assisted capture, multilingual intake (Hindi, Kannada, Marathi), advanced analytics.

**Year 2:** Graph fraud detection, reinsurer API, national fraud exchange, climate risk overlays.

**Year 3:** Autonomous claim triage, predictive fraud networks, full national coverage.

---

## 31. RISKS AND MITIGATIONS

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Poor data quality (UDLRN, land records) | High | High | Graceful defaults, manual override, state adapter flexibility |
| Missing satellite coverage (cloud, GEE quota) | Medium | Medium | Fallback mock data, weather correlation, manual inspection |
| State resistance to standardization | Medium | High | Configurable adapters, incremental onboarding, state co-design |
| Reviewer distrust of AI | Medium | High | Explainable outputs, override capability, training, feedback loops |
| False positives harming genuine farmers | Medium | High | Human review for medium band, appeal process, confidence threshold |
| Integration instability (GEE, IMD) | Medium | Medium | Caching, fallback providers, circuit breakers |
| Model drift | Medium | High | Daily drift monitoring, quarterly retraining, fallback rules |
| Poor field connectivity | High | Medium | Offline sync, compressed uploads, SMS fallback for notifications |
| Legal/privacy risks (Aadhar, PII) | Medium | High | Encryption, masking, data localization, compliance audits |
| Misuse by internal actors | Low | High | RBAC, audit logs, anomaly detection on admin actions |

---

## 32. GLOSSARY AND ACRONYMS

| Term | Definition |
|---|---|
| NDVI | Normalized Difference Vegetation Index. Measures vegetation health from satellite imagery. |
| SAR | Synthetic Aperture Radar. Detects water/flood signals regardless of cloud cover. |
| TOTP | Time-based One-Time Password. 2FA method using time-synchronized codes. |
| RBAC | Role-Based Access Control. Permissions assigned by role. |
| UDLRN | Unique Digital Land Record Number. Government land identification code. |
| FNOL | First Notice of Loss. Initial claim report. |
| TAT | Turnaround Time. Time from submission to decision. |
| SHAP | SHapley Additive exPlanations. Model explanation technique. |
| Adapter | State-specific rule configuration in the State Adapter Framework. |
| Evidence Dossier | Compiled PDF of claim evidence, inspection, satellite, weather, and fraud analysis. |
| Fraud Band | Risk category derived from fraud score (LOW/MEDIUM/HIGH/CRITICAL). |
| Reviewer Override | Human reviewer manually changing an AI-derived fraud score or decision. |
| CCE | Crop Cutting Experiment. Field verification method for yield estimation. |
| GEE | Google Earth Engine. Cloud platform for planetary-scale geospatial analysis. |
| IMD | India Meteorological Department. National weather service. |
| PITR | Point-in-Time Recovery. Database restore capability. |
| PSI | Population Stability Index. Metric for distribution drift. |
| DLQ | Dead Letter Queue. Holds failed Kafka messages for inspection. |

---

## 33. APPENDICES

### A. Sample Claim Creation Payload
```json
{
  "policy_id": "550e8400-e29b-41d4-a716-446655440000",
  "loss_type": "DROUGHT",
  "loss_date": "2026-03-15",
  "affected_area": 2.5,
  "claim_amount": 50000,
  "description": "Severe drought observed across entire insured plot. Crop completely dried.",
  "gps_latitude": 12.9716,
  "gps_longitude": 77.5946
}
```

### B. Sample Fraud Score Response
```json
{
  "score": 67,
  "confidence": 0.82,
  "risk_level": "HIGH",
  "top_factors": [
    { "name": "claim_amount_ratio", "weight": 18.5, "direction": "+", "description": "Claim is 2.3x typical for this crop" },
    { "name": "geo_cluster_different_farmers", "weight": 14.2, "direction": "+", "description": "3 other farmers filed from same GPS in 90 days" },
    { "name": "weather_mismatch", "weight": 12.0, "direction": "+", "description": "No rainfall on claimed flood date" },
    { "name": "ndvi_mismatch", "weight": 9.5, "direction": "+", "description": "NDVI drop minimal but claimed loss 70%" },
    { "name": "officer_loss_pct_diff", "weight": 8.3, "direction": "+", "description": "Officer: 25% loss vs farmer claimed 65%" }
  ],
  "shap_values": { "claim_amount_ratio": 18.5, "geo_cluster_different_farmers": 14.2, "weather_mismatch": 12.0, "ndvi_mismatch": 9.5, "officer_loss_pct_diff": 8.3 },
  "missing_features": ["sar_flood_signal"],
  "inference_time_ms": 320,
  "model_version": "v6.0-ensemble"
}
```

### C. Sample Kafka Event
```json
{
  "event_type": "score.completed",
  "idempotency_key": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "timestamp": "2026-05-10T10:30:00Z",
  "payload": {
    "claim_id": "550e8400-e29b-41d4-a716-446655440000",
    "score": 67,
    "risk_level": "HIGH",
    "model_version": "v6.0-ensemble"
  }
}
```

### D. Sample Evidence Metadata
```json
{
  "evidence_id": "660e8400-e29b-41d4-a716-446655440001",
  "claim_id": "550e8400-e29b-41d4-a716-446655440000",
  "file_hash": "sha256:a1b2...",
  "storage_url": "s3://bhuvigyan-evidence/550e8400/photo1.jpg",
  "mime_type": "image/jpeg",
  "gps_latitude": 12.9716,
  "gps_longitude": 77.5946,
  "exif_timestamp": "2026-03-15T09:00:00Z",
  "uploaded_at": "2026-05-10T10:00:00Z"
}
```

### E. Sample Audit Log Record
```json
{
  "id": "770e8400-e29b-41d4-a716-446655440002",
  "actor_id": "880e8400-e29b-41d4-a716-446655440003",
  "actor_type": "REVIEWER",
  "action": "CLAIM_APPROVED",
  "target_id": "550e8400-e29b-41d4-a716-446655440000",
  "target_type": "CLAIM",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0...",
  "details": { "approved_amount": 45000, "review_notes": "Partial approval based on evidence" },
  "created_at": "2026-05-10T11:00:00Z"
}
```

### F. Sample State Adapter Config
```json
{
  "state_code": "MH",
  "name": "Maharashtra Default",
  "min_photos": 3,
  "ndvi_threshold": 0.35,
  "area_tolerance_pct": 12,
  "required_fields": ["revenue_survey_number", "village_code"],
  "scheme_mappings": { "PMFBY": "PMFBY", "Maha_farm_waiver": "STATE_WAIVER" },
  "routing_rules": { "auto_approve": { "max_amount": 50000 }, "committee_approval": { "min_amount": 200000 } },
  "risk_rules": { "geo_cluster_radius_m": 150, "weather_mismatch_weight": 1.2 },
  "language": "mr",
  "active": true
}
```

### G. Sample OpenAPI Schema Snippet
```yaml
ClaimCreateRequest:
  type: object
  required: [policy_id, loss_type, loss_date, affected_area, claim_amount, description]
  properties:
    policy_id: { type: string, format: uuid }
    loss_type: { type: string, enum: [DROUGHT, FLOOD, HAIL, PEST, FIRE, OTHER] }
    loss_date: { type: string, format: date }
    affected_area: { type: number, minimum: 0.01 }
    claim_amount: { type: number, minimum: 1 }
    description: { type: string, minLength: 20, maxLength: 10000 }
    gps_latitude: { type: number, minimum: 6, maximum: 37 }
    gps_longitude: { type: number, minimum: 68, maximum: 97 }
```

### H. Flyway Migration Naming Convention
`V{version}__{description}.sql`  
Example: `V15__create_weather_satellite_cache.sql`

### I. Requirement Traceability Matrix

| Business Goal | Module | FRs | NFRs |
|---|---|---|---|
| G-001 Auto-approve genuine | Fraud Scoring | FR-047 | NFR-001 |
| G-002 Detect fraud | Fraud Scoring, ML | FR-040–046 | NFR-007 |
| G-003 Fast TAT | Notifications, Review | FR-060 | NFR-001 |
| G-004 Explainability | Fraud Explanations | FR-057 | NFR-007 |
| G-005 State rollout | State Adapter | FR-063 | NFR-012 |
| G-006 Reviewer trust | Override, Explanation | FR-056 | NFR-007 |
| G-007 Audit compliance | Audit Logs | FR-065 | NFR-007 |

---

**END OF SOFTWARE REQUIREMENTS SPECIFICATION**
