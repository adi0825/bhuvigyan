# Bhuvigyan PMFBY — V6 Resilient National Fraud Intelligence Platform

AI-powered crop insurance fraud detection for India's PMFBY scheme. Full-stack Node.js/TypeScript/React pnpm monorepo. **V6** adds ML snapshot store, state-specific rule packs, Kafka/Cassandra/MinIO fallback patterns, evidence package generation, model registry, and 3 new admin portal pages.

## Architecture

**Monorepo** (pnpm workspaces):
- `artifacts/api-server` — Express 5 + Node.js 24 API, port 8080
- `artifacts/web` — React + Vite frontend, port 5173
- `lib/db/` — Drizzle ORM schema + PostgreSQL client (NOT packages/db)

## Tech Stack

- **Backend**: Node.js 24, Express 5, Drizzle ORM, PostgreSQL, pino logging, JWT HS256 auth
- **Frontend**: React 18, Vite, Wouter v3 (routing), TanStack Query, Recharts, Tailwind + shadcn/ui
- **Database**: PostgreSQL (Replit managed), Drizzle ORM

## Key Conventions

- **Wouter v3**: `<Link className="...">` directly — never nest `<a>` inside `<Link>`
- **Router**: `App.tsx` uses `base={import.meta.env.BASE_URL.replace(/\/$/, "")}` from wouter
- **API base**: `apiFetch(path)` in frontend prepends `/api` automatically — do NOT include `/api` in the path arg
  - System routes: `apiFetch("/system/health")` → hits `/api/system/health`
  - V1 admin routes: `apiFetch("/v1/admin/rules")` → hits `/api/v1/admin/rules`
- **Auth**: SHA-256 with `"bhuvigyan:"` prefix for passwords; JWT HS256 for tokens
- **Token storage**: All portals store access token as `bhuvigyan_token` via `setToken()` — `apiFetch` reads it automatically
- **DEV_MODE**: OTP = `123456`, TOTP = `123456` always accepted in development
- **DB returns numerics as strings** — always wrap with `Number()` before `.toFixed()`
- **fraud_heatmap_daily**: has NO `state_code` column — uses `district_id` + `computed_date`
- **Admin auth route**: `POST /api/v1/admin/login` (NOT `/admin/auth/login`). Returns `accessToken` in `data.accessToken`
- **System routes**: Mounted at `/api/system/*` (not `/api/v1/system/*`)

## Demo Credentials

| Portal | URL | Credentials |
|---|---|---|
| **Farmer** | `/farmer/login` | Mobile: `9900000001` · OTP: `123456` |
| **Admin** | `/admin/login` | `superadmin@bhuvigyan.gov.in` / `Admin@123` / TOTP `123456` |
| **CSC** | `/csc/login` | Code: `CSC-KA-001` · Password: `Csc@123` · OTP: `123456` |
| **Inspector** | `/inspector/login` | `inspector.ka@bhuvigyan.gov.in` · OTP: `123456` |
| **Insurer** | `/insurer/login` | Code: `AGRI_INSURE_KA` · Password: `Insurer@123` |

Demo farmers: `9900000001` – `9900000003`
Demo UDLRNs: `29-0572-A3F8C1-07`, `29-0585-B2E9D4-15`, `27-0004-C1D7E5-23`

## Database Schema

### Pre-V6 tables
| Table | Purpose |
|---|---|
| `farmers` | Farmer profiles (mobile login) |
| `udlrn_master` | Land records with UDLRN, NDVI baseline, payout account |
| `claims` | Insurance claims with fraud scores, pipeline status |
| `csc_operators` | CSC Village Level Entrepreneurs — in `claims.ts` schema |
| `insurer_accounts` | Insurer login accounts — in `admin.ts` schema |
| `admin_officers` | Government officers (SUPER_ADMIN, STATE_OFFICER, DC_OFFICER, FIELD_INSPECTOR) |
| `audit_log` | Immutable pipeline step log (Cassandra fallback) |
| `fraud_heatmap_daily` | Pre-aggregated district fraud data (no `state_code` column) |
| `notifications` | Push/WhatsApp/in-app notifications to farmers |
| `carbon_projects` / `carbon_credits` | Carbon credit projects + VCUs |
| `cce_visits` | Field inspector visit records |
| `claim_appeals` | Farmer appeals on rejected claims |

### V6 tables (`lib/db/src/schema/v6.ts`)
| Table | Purpose |
|---|---|
| `event_outbox` | Kafka fallback — transactional outbox for claim events |
| `claim_feature_snapshots` | 47-feature ML snapshot per claim (explainability store) |
| `rule_profiles` | State+season-specific fraud threshold config (configurable per state) |
| `csc_activity_daily` | Daily CSC operator activity stats for bulk-fraud detection |
| `state_adapter_cache` | Redis fallback — land record adapter cache |
| `parcel_mutations` | Land mutation event log (suspicious timing detection) |
| `evidence_files` | MinIO fallback — evidence package JSON storage |
| `model_registry` | ML model versions, metrics, production flag |

## API Routes

```
# Auth
POST /api/v1/admin/login                    — Admin (email + password + totp)
POST /api/v1/farmer/login                   — Send OTP to farmer mobile
POST /api/v1/farmer/verify-otp             — Verify OTP, return JWT
POST /api/v1/csc/auth/pre-login            — CSC operator pre-login
POST /api/v1/csc/auth/login               — CSC operator OTP login
POST /api/v1/inspector/auth/request-otp   — Inspector OTP request
POST /api/v1/inspector/auth/login         — Inspector OTP login
POST /api/v1/insurer/auth/login           — Insurer password login

# Admin V1
GET  /api/v1/admin/dashboard
GET  /api/v1/admin/review-queue
GET  /api/v1/admin/claims/:id
POST /api/v1/admin/claims/:id/approve|reject|schedule-cce|fir-alert
GET  /api/v1/admin/heatmap
GET  /api/v1/admin/udlrn/:udlrn
POST /api/v1/admin/udlrn/:udlrn/freeze
GET  /api/v1/admin/audit-log
GET  /api/v1/admin/officers
POST /api/v1/admin/officers
GET  /api/v1/admin/analytics?days=N
GET  /api/v1/admin/carbon
GET  /api/v1/admin/csc-operators
POST /api/v1/admin/csc-operators/:id/block|unblock

# Admin V6
GET    /api/v1/admin/rules               — List all rule profiles
GET    /api/v1/admin/rules/:id           — Single rule profile
PATCH  /api/v1/admin/rules/:id           — Update thresholds (auto_approve, officer_review, cce_visit, auto_reject, etc.)
POST   /api/v1/admin/rules               — Create new rule profile
GET    /api/v1/admin/model-registry      — List all models
POST   /api/v1/admin/model-registry/:id/promote — Promote to production
GET    /api/v1/admin/model-registry/drift — Drift detection (current vs previous week score distribution)
GET    /api/v1/admin/csc-activity        — Daily CSC activity stats (populated automatically on CSC-filed claims)
GET    /api/v1/admin/outbox-status       — Event outbox pending/processed/failed counts
GET    /api/v1/admin/crop-phenology      — Crop phenology calendar (filterable by cropType, seasonType, stateCode)
GET    /api/v1/admin/satellite-jobs      — Satellite job oversight (status breakdown, avg processing time)

# Satellite (Agri-backend integration)
POST   /api/v1/satellite/analyze         — Queue async satellite analysis; returns jobId for polling
POST   /api/v1/satellite/analyze/sync    — Synchronous satellite analysis; returns full result inline; also patches claim if claimId given
GET    /api/v1/satellite/result/:jobId   — Poll satellite job status and result

# Carbon (Agri-backend integration)
POST   /api/v1/carbon/estimate           — Estimate carbon credits for a UDLRN + practice; returns sequestration, payouts, eligibility
GET    /api/v1/carbon/practices          — List supported sustainable farming practices + per-ha sequestration rates

# System (no /v1 prefix)
GET  /api/system/health                  — Liveness probe (status, version, mode)
GET  /api/system/readiness               — Readiness probe (db check)
GET  /api/system/dependencies            — All dependency statuses + state adapters + AI pipeline
GET  /api/system/mode                    — Current mode (NORMAL / DEGRADED) + fallback flags
POST /api/system/fallback/enable         — Enable degraded mode
POST /api/system/fallback/disable        — Disable degraded mode
GET  /api/system/replay/:traceId         — Audit event replay for a claim/trace

# Evidence
GET  /api/v1/evidence/:claimId           — Get or generate evidence package (47 fields, SHA-256 hash)
POST /api/v1/evidence/:claimId/regenerate — Force regenerate + re-store
GET  /api/v1/evidence/:claimId/hash      — Integrity hash only

# Farmer
GET  /api/v1/farmer/land
GET  /api/v1/farmer/carbon
POST /api/v1/farmer/carbon/enrol
GET  /api/v1/farmer/udlrn-pdf
GET  /api/v1/farmer/notifications
GET  /api/v1/farmer/notifications/unread-count
POST /api/v1/farmer/notifications/mark-read/:id
POST /api/v1/farmer/notifications/mark-all-read

# Claims
GET  /api/v1/claims/my-claims
POST /api/v1/claims/file                 — V6 pipeline: outbox → 47-feature snapshot → state rule pack → verdict
GET  /api/v1/claims/status/:id
POST /api/v1/claims/appeal/:id

# CSC
GET  /api/v1/csc/dashboard
GET  /api/v1/csc/farmer-lookup?q=...
GET  /api/v1/csc/my-claims

# Inspector
GET  /api/v1/inspector/assignments
GET  /api/v1/inspector/assignments/:id
POST /api/v1/inspector/assignments/:id/submit

# Insurer
GET  /api/v1/insurer/dashboard
```

## Frontend Pages

**Farmer Portal** (`/farmer/*`):
- `/farmer/login` — Mobile OTP login
- `/farmer/dashboard` — Claims list + land info + notifications
- `/farmer/file-claim` — Multi-step claim filing
- `/farmer/claims/:id` — Claim status + pipeline progress + inline appeal
- `/farmer/claims/:id/appeal` — Dedicated appeal page
- `/farmer/notifications` — Full notifications with mark-read
- `/farmer/land` — Land record + NDVI + crop history
- `/farmer/carbon` — Carbon credits + enrolment
- `/farmer/udlrn` — UDLRN card + PDF download

**Admin Portal** (`/admin/*`):
- `/admin/login` — Email + password + TOTP
- `/admin` — KPI dashboard
- `/admin/review-queue` — Filterable claims table
- `/admin/claims/:id` — Full detail + action modals
- `/admin/heatmap` — Fraud hotspot map
- `/admin/udlrn-search` — UDLRN lookup + freeze
- `/admin/audit-log` — Immutable pipeline log
- `/admin/officers` — Officer management
- `/admin/analytics` — BI dashboard (6 charts, time filter)
- `/admin/carbon` — Carbon intelligence
- `/admin/csc-operators` — CSC management + block/unblock
- `/admin/csc-activity` — **V6** Daily CSC operator activity log with bulk-pattern detection
- `/admin/rules` — **V6** State/season rule pack threshold tuning
- `/admin/system-health` — **V6** Live dependency status + degraded mode toggle
- `/admin/model-registry` — **V6** Model cards + promotion to production + drift monitoring

**CSC Portal** (`/csc/*`):
- `/csc/login` — Operator code + password + OTP
- `/csc/dashboard` — Today quota + recent claims
- `/csc/farmer-lookup` — UDLRN/mobile search
- `/csc/my-claims` — Claims filed by this operator

**Inspector Portal** (`/inspector/*`):
- `/inspector/login` — Email + OTP
- `/inspector/assignments` — Pending visits with priority
- `/inspector/visit/:id` — GPS check-in + crop condition form

**Insurer Portal** (`/insurer/*`):
- `/insurer/login` — Insurer code + password
- `/insurer/dashboard` — Claims overview + weekly trend + fraud score + "View Evidence" quick link per claim
- `/insurer/evidence/:claimId` — **V6** Full evidence package viewer (satellite, fraud flags, audit chain, SHA-256)

**Global Component**:
- `DegradedBanner` — Polls `/api/system/mode` every 30s, shows orange banner when system is degraded

## V6 Fraud Pipeline (47 features, state rule packs)

`POST /api/v1/claims/file` triggers the V6 pipeline in `claim-pipeline.ts`:

1. **Outbox write** — Inserts `CLAIM_PIPELINE_STARTED` event into `event_outbox` (Kafka fallback)
2. **Land verification** — UDLRN exists, not frozen, farmer owns it; emits `claim.land.verified`
3. **47-feature engineering** — NDVI (5), area (4), mutation (3), bank (3), CSC (3), weather (2), satellite (4), cross-district (2), network (3), seasonal (4), pipeline (8), explainability (6)
4. **State rule pack** — Loads `rule_profiles` from DB for the claim's state (MH/KA/TG/PB/UP/RJ). Falls back to built-in defaults in `state-rules.ts`
5. **Fraud scoring** — 12 flag checks; state-specific hard rules applied; emits `claim.scored`
6. **Snapshot storage** — Saves all 47 features to `claim_feature_snapshots`
7. **Verdict**:
   - Score ≤ rule.autoApproveThreshold → `AUTO_APPROVED` + emits `claim.approved`
   - Score ≤ rule.officerReviewThreshold → `OFFICER_REVIEW` + emits `claim.review.queued`
   - Score ≤ rule.cceVisitThreshold → `CCE_VISIT` + emits `claim.cce.assigned`
   - Score > rule.autoRejectThreshold → `AUTO_REJECTED` + freeze UDLRN + DC alert + emits `claim.auto.rejected`
8. **CSC activity tracking** — If filed by CSC operator, upserts daily stats into `csc_activity_daily` (bulk flag, risk tier)
9. **Outbox mark processed** — Updates `event_outbox` to `PROCESSED`

## Outbox Scheduler (FR-12.3)

Background job started at server boot (`outbox-scheduler.ts`):
- Polls `event_outbox` for PENDING events every **30 seconds**
- Replays stalled `CLAIM_PIPELINE_STARTED` events (e.g., after server crash mid-processing)
- Marks all other Section 12.2 event types as PROCESSED automatically
- Exponential backoff: 1/2/5/10/30 minute retry intervals
- Events that exceed `max_attempts` are marked FAILED

## Model Drift Detection (FR-43)

`GET /api/v1/admin/model-registry/drift` compares current 7-day window vs previous 7-day window:
- Average fraud score delta
- % of high-risk (>60) claims change
- Alert threshold: avgDelta > 10 or highRiskPctDelta > 15
- Auto-updates `model_registry.drift_alert` and `drift_metrics` on production model when drift detected

## State Rule Packs

State code mapping: `"29"=KA`, `"27"=MH`, `"36"=TG`, `"03"=PB`, `"09"=UP`, `"08"=RJ`

Each state has configurable thresholds in `rule_profiles`:
- `autoApproveThreshold`, `officerReviewThreshold`, `cceVisitThreshold`, `autoRejectThreshold`
- `mutationDaysAlert`, `cscDailyBulkLimit`, `bankNameMatchMinScore`
- `areaDeltaMaxPct`, `overInsuranceMaxRatio`, `minBaselineNdvi`

## V6 Evidence Package

`GET /api/v1/evidence/:claimId` generates a tamper-evident JSON package containing:
- Claim summary (status, fraud score, model version, verdict band)
- UDLRN + land record details (owner, survey, area, payout bank, account masked)
- Satellite analysis (NDVI timeline, IMD weather confirmation, cloud cover)
- Fraud flag breakdown (each flag: weight, evidence field, description)
- AI explainability reasons
- Mutation history with suspicious timing flags
- CSC operator flags (daily submission count, bulk flag)
- Full audit chain (all pipeline steps with actor + timestamp)
- Decision summary (verdict, next step, approved amount or rejection reason, FIR alert)
- SHA-256 integrity hash

Package is cached in `evidence_files` table; use `POST /regenerate` to force refresh.

## Seeded Demo Data

- 7 demo farmers (9900000001–9900000007), UDLRNs for each
- 11 demo claims with varied fraud scores and statuses
- 9 admin officers (superadmin, inspector.ka, inspector.mh, dc.tumkur, state.officer.ka, + 4 more)
- 5 CSC operators (CSC-KA-001, CSC-KA-002, CSC-MH-001 + 2 legacy)
- 8 insurers (AIC, TATA AIG, Bajaj Allianz, HDFC ERGO, Oriental, New India, Reliance + AGRI_INSURE_KA)
- 1 carbon project + 1 carbon credit for demo farmer 9900000001
- Fraud heatmap entries across Karnataka districts
- **V6**: 6 rule profiles (one per state), 4 model registry entries (BhuviEnsemble-V6 is production)
- **Auto-seeded at startup** (if tables empty): 16 crop-phenology entries (14 crops × season), 4 V6 ML model registry entries, 6 PMFBY insurer accounts (NICL, AIC, HDFC_ERGO, RELIANCE_GI, BAJAJ_ALLIANZ, SBI_GI)

## Agri-backend Integration (Adi0825/Agri-backend)

Analysis of Java Spring Boot + Python FastAPI ML service complete. Integration status:

| Agri-backend Component | Status | Notes |
|---|---|---|
| PostgreSQL schema V1–V6 | ✅ Fully ported | All tables in Drizzle schema |
| 47-feature RF+IF+XGB ensemble | ✅ Ported | `claim-pipeline.ts` simulateSatelliteAnalysis |
| Satellite GEE mock mode | ✅ Ported | Deterministic NDVI via UDLRN hash |
| Farmer notifications API | ✅ Already existed | `farmer.ts` |
| Carbon enrolment API | ✅ Already existed | `farmer.ts` |
| Model registry | ✅ Already existed | `admin.ts` + `v6.ts` schema |
| Satellite analyze routes | ✅ **Added** | `routes/satellite.ts` |
| Carbon estimate ML endpoint | ✅ **Added** | `routes/carbon.ts` |
| Crop phenology calendar API | ✅ **Added** | `admin.ts` |
| Satellite jobs admin view | ✅ **Added** | `admin.ts` |
| Reference data seeding | ✅ **Added** | `lib/seed.ts` (auto-runs at startup) |
| Java Spring Boot microservices | ❌ Not runnable | Replaced by Node.js equivalents |
| Python FastAPI ML service | ❌ Not runnable | Logic ported deterministically |
| Docker Compose / Kafka / Redis | ❌ Not needed | PostgreSQL fallback patterns active |

## GitHub Mirror Sync

Every merge to main automatically pushes to `https://github.com/Adi0825/AGRI.git` via the post-merge hook.

- **Mechanism**: `.replit` `[postMerge]` section runs `scripts/post-merge.sh` after every merge (timeout: 20s)
- **Required secret**: `GITHUB_TOKEN` must be set in Replit Secrets (currently configured)
- **Script**: `scripts/post-merge.sh` — adds/updates `github` remote and force-pushes `HEAD:main`
- **No manual step needed**: sync is fully automatic on every merge

## CSS Theme

File: `artifacts/web/src/index.css`
- `--primary`: `#16a34a` (green-600)
- `--secondary`: `#d97706` (amber-600)
- `--sidebar`: `#1a3a2a` (dark green)
- `--destructive`: `#dc2626` (red-600)
