# BHUVIGYAN V7 — END-TO-END SYSTEM TEST SPECIFICATION
## AI-Powered Crop Insurance Fraud Detection Platform

**Version:** 1.0  
**Date:** 2026-05-10  
**Author:** QA Architecture Team  
**Scope:** Full-stack (Python/FastAPI + PostgreSQL + Redis + Kafka + React/TS)

---

## DOCUMENT CONTROLS

| Field | Value |
|---|---|
| Total Test Cases | 419 |
| P0 (Critical) | 112 |
| P1 (Important) | 118 |
| P2 (Nice-to-have) | 53 |
| Unit Tests | 60 |
| Integration Tests | 76 |
| API Tests | 170 |
| E2E Tests | 16 |
| Performance Tests | 40 |
| Security Tests | 41 |
| ML Tests | 16 |

---

## ABBREVIATIONS

- **JWT** — JSON Web Token
- **TOTP** — Time-based One-Time Password
- **2FA** — Two-Factor Authentication
- **OTP** — One-Time Password
- **NDVI** — Normalized Difference Vegetation Index
- **SAR** — Synthetic Aperture Radar
- **IMD** — India Meteorological Department
- **DLQ** — Dead Letter Queue
- **IDOR** — Insecure Direct Object Reference
- **CSRF** — Cross-Site Request Forgery
- **SSRF** — Server-Side Request Forgery
- **GEE** — Google Earth Engine
- **SHAP** — SHapley Additive exPlanations
- **VAO** — Village Administrative Officer

---

## TEST COVERAGE MATRIX

| Module | Unit | Integration | API | E2E | Perf | Sec | ML | Total |
|---|---|---|---|---|---|---|---|---|
| 1. Authentication | 0 | 0 | 31 | 0 | 0 | 9 | 0 | 40 |
| 2. User/Role Management | 0 | 0 | 11 | 0 | 0 | 2 | 0 | 13 |
| 3. Farmer Profile | 4 | 4 | 8 | 2 | 0 | 2 | 0 | 20 |
| 4. Policy Management | 6 | 4 | 10 | 2 | 0 | 2 | 0 | 24 |
| 5. Claim Management | 8 | 8 | 14 | 4 | 0 | 2 | 0 | 36 |
| 6. Officer Inspection | 6 | 8 | 10 | 2 | 0 | 2 | 0 | 28 |
| 7. Fraud Scoring Engine | 6 | 6 | 8 | 0 | 4 | 0 | 8 | 32 |
| 8. Satellite/Weather | 4 | 6 | 8 | 0 | 4 | 0 | 0 | 22 |
| 9. Review/Decisioning | 4 | 6 | 10 | 2 | 0 | 2 | 0 | 24 |
| 10. Notifications | 4 | 6 | 6 | 2 | 0 | 0 | 0 | 18 |
| 11. State Adapter | 4 | 4 | 8 | 2 | 0 | 0 | 0 | 18 |
| 12. Admin Panel | 4 | 4 | 8 | 2 | 0 | 2 | 0 | 20 |
| 13. ML/Model Ops | 2 | 4 | 4 | 0 | 4 | 0 | 8 | 22 |
| 14. Evidence/Documents | 4 | 4 | 8 | 0 | 2 | 4 | 0 | 22 |
| 15. Rate Limiting | 0 | 2 | 6 | 0 | 6 | 6 | 0 | 20 |
| 16. Kafka Pipeline | 2 | 6 | 4 | 0 | 4 | 0 | 0 | 16 |
| 17. Database Integrity | 8 | 4 | 4 | 0 | 0 | 0 | 0 | 16 |
| 18. Frontend/UI | 0 | 0 | 0 | 26 | 0 | 0 | 0 | 26 |
| 19. Security Tests | 0 | 0 | 0 | 0 | 0 | 10 | 0 | 10 |
| 20. Performance/Load | 0 | 0 | 0 | 0 | 16 | 0 | 0 | 16 |
| 21. E2E Workflows | 0 | 0 | 0 | 6 | 0 | 0 | 0 | 6 |
| 22. Edge Cases | 6 | 6 | 10 | 0 | 0 | 0 | 0 | 22 |
| **TOTAL** | **86** | **94** | **119** | **28** | **42** | **41** | **16** | **419** |

---

## RISK-BASED TEST PRIORITY LIST (CI/CD Execution Order)

### Phase 1: Smoke (Run every commit, < 5 min)
1. AUTH-001 — Farmer registration
2. AUTH-005 — Farmer login sends OTP
3. AUTH-007 — Farmer verify-OTP valid
4. AUTH-028 — JWT payload contains userId + role
5. AUTH-030 — JWT expired → 401
6. CLAIM-001 — Valid drought claim submission
7. CLAIM-003 — Claim with affected_area validation
8. DB-001 — FK constraint on claim.farmer_id
9. PERF-001 — Verify-OTP latency p95 < 300ms
10. KAFKA-001 — claim.submitted event published

### Phase 2: Critical Path (Run every PR, < 15 min)
All P0 test cases from: Auth, Claim Management, Fraud Scoring, Database Integrity, Security

### Phase 3: Full Regression (Nightly, < 60 min)
All P0 + P1 test cases

### Phase 4: Extended (Weekly)
All P2 cases, Performance suite, Security penetration tests

---

## MODULE 1: AUTHENTICATION & SESSION MANAGEMENT

### 1.1 Overview
The Bhuvigyan V7 backend uses a simplified, role-specific authentication model:
- **Farmers**: OTP-only via mobile. No passwords. Register → Login (OTP sent) → Verify OTP → JWT.
- **Admin/Officers**: Password (SHA-256) + TOTP code for admins. Inspector/Officer uses OTP-only via email.
- **CSC Operators**: operatorCode + OTP.
- **Generic Auth**: In-memory fallback at `/api/v1/auth/*`.
- **JWT**: HS256, 24-hour expiry, payload `{ userId, mobile|email, role }`. No `sub`, no `jti`, no refresh-token rotation, no Redis blacklisting, no logout endpoint.

### 1.2 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| AUTH-001 | Farmer registration | API | P0 | POST /farmer/register | 200, farmer created, devOtp returned |
| AUTH-002 | Farmer registration duplicate mobile | API | P0 | Same mobile twice | ON CONFLICT DO NOTHING → still 200 |
| AUTH-003 | Farmer registration missing fullName | API | P0 | Omit fullName | 500 or DB error (backend does not validate) |
| AUTH-004 | Farmer registration missing mobile | API | P0 | Omit mobile | 500 or DB error |
| AUTH-005 | Farmer login sends OTP | API | P0 | POST /farmer/login | 200, devOtp: "123456" |
| AUTH-006 | Farmer login non-existent mobile | API | P0 | Mobile not in DB | 404, "Farmer not found" |
| AUTH-007 | Farmer verify-OTP valid | API | P0 | POST /farmer/verify-otp | 200, accessToken + refreshToken + farmer object |
| AUTH-008 | Farmer verify-OTP wrong code | API | P0 | OTP: "000000" | 400, "Invalid OTP" |
| AUTH-009 | Farmer verify-OTP non-existent mobile | API | P0 | Mobile not in DB | 404, "Farmer not found" |
| AUTH-010 | Admin login valid | API | P0 | POST /admin/login | 200, accessToken + officer object |
| AUTH-011 | Admin login wrong password | API | P0 | Wrong SHA-256 hash | 401, "Invalid credentials" |
| AUTH-012 | Admin login wrong TOTP | API | P0 | totpCode: "999999" | 401, "Invalid TOTP code" |
| AUTH-013 | Admin login empty TOTP allowed | API | P1 | totpCode: "" | 200 (backend allows empty) |
| AUTH-014 | Inspector request OTP | API | P0 | POST /inspector/auth/request-otp | 200, devOtp: "123456" |
| AUTH-015 | Inspector request OTP unknown email | API | P0 | Email not in admin_officers | 404, "Officer not found" |
| AUTH-016 | Inspector login valid | API | P0 | POST /inspector/auth/login | 200, token + inspector object |
| AUTH-017 | Inspector login wrong OTP | API | P0 | OTP: "000000" | 401, "Invalid OTP" |
| AUTH-018 | CSC pre-login valid | API | P0 | POST /csc/auth/pre-login | 200, requiresOtp: true |
| AUTH-019 | CSC pre-login blocked operator | API | P0 | is_blocked=true | 403, "Operator is blocked" |
| AUTH-020 | CSC login valid | API | P0 | POST /csc/auth/login | 200, token + operator object |
| AUTH-021 | CSC login wrong OTP | API | P0 | OTP: "000000" | 401, "Invalid OTP" |
| AUTH-022 | Generic auth send-OTP | API | P1 | POST /auth/send-otp | 200, "OTP sent successfully" |
| AUTH-023 | Generic auth verify-OTP valid | API | P1 | POST /auth/verify-otp | 200, accessToken + user data |
| AUTH-024 | Generic auth verify-OTP wrong | API | P1 | Wrong OTP | 400, "Invalid OTP" |
| AUTH-025 | Generic auth refresh valid | API | P0 | POST /auth/refresh | 200, new accessToken |
| AUTH-026 | Generic auth refresh missing token | API | P0 | Omit refreshToken | 400, "Refresh token required" |
| AUTH-027 | Generic auth refresh tampered | Security | P0 | Alter refresh token | 401, "Invalid refresh token" |
| AUTH-028 | JWT payload contains userId + role | API | P0 | Decode JWT from any login | userId, role, mobile|email present |
| AUTH-029 | JWT access token expiry 24h | API | P0 | Check exp claim | exp ≈ iat + 86400 |
| AUTH-030 | JWT expired → 401 | API | P0 | Send expired JWT to protected route | 401, "Invalid token" |
| AUTH-031 | JWT tampered payload → 401 | Security | P0 | Modify role in JWT payload | 401, signature mismatch |
| AUTH-032 | JWT invalid signature → 401 | Security | P0 | Regenerate signature with wrong secret | 401, "Invalid token" |
| AUTH-033 | JWT none algorithm attack | Security | P0 | alg: "none" | 401 |
| AUTH-034 | No Authorization header → 401 | API | P0 | Omit header on protected route | 401, "Unauthorized" |
| AUTH-035 | Malformed Bearer token → 401 | API | P0 | "Authorization: Basic xyz" | 401, "Invalid token" |
| AUTH-036 | SQL injection in farmer name | Security | P0 | fullName: "'; DROP TABLE farmers; --" | Parameterized query, no crash |
| AUTH-037 | XSS in claim description | Security | P0 | Submit claim with `<script>` | Escaped in DB and response |
| AUTH-038 | Farmer A accesses Farmer B claim → 403 | Security | P0 | IDOR via token | 403 or wrong data not returned |
| AUTH-039 | Admin password stored as SHA-256 | Security | P0 | Check admin_officers.password_hash | SHA-256 hash, not plaintext |
| AUTH-040 | Password not returned in any API response | Security | P0 | All auth endpoints | No password_hash field in any response |

### 1.3 Full Step-by-Step Details (P0 Cases)

#### AUTH-001: Farmer Registration
**Preconditions:** PostgreSQL running, farmers table exists.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/farmer/register`
2. Body:
```json
{
  "fullName": "Rajesh Kumar",
  "mobile": "9876543210"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "farmerId": "uuid-string",
    "devOtp": "123456"
  }
}
```
- DB assertion: `SELECT * FROM farmers WHERE mobile='9876543210'` returns 1 row, `is_demo=true`
- Failure Case: 500, or farmer not created in DB

#### AUTH-005: Farmer Login Sends OTP
**Preconditions:** Farmer with mobile 9876543210 exists in DB.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/farmer/login`
2. Body:
```json
{
  "mobile": "9876543210"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "devOtp": "123456"
  }
}
```
- Failure Case: 404 if farmer not found, or missing devOtp in response

#### AUTH-006: Farmer Login Non-Existent Mobile
**Preconditions:** None.
**Test Steps:**
1. POST `/api/v1/farmer/login` with mobile "9999999999"
**Expected Result:**
- HTTP 404 Not Found
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Farmer not found. Please register first."
  }
}
```
- Failure Case: 200 or 500

#### AUTH-007: Farmer Verify-OTP Valid
**Preconditions:** Farmer with mobile 9876543210 exists.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/farmer/verify-otp`
2. Body:
```json
{
  "mobile": "9876543210",
  "otp": "123456"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "farmer": {
      "id": "farmer-uuid",
      "fullName": "Rajesh Kumar",
      "mobile": "9876543210"
    },
    "udlrn": "UDLRN-xxx"
  }
}
```
- JWT payload decoded contains: `userId`, `mobile`, `role: "FARMER"`, `iat`, `exp`
- Failure Case: Missing tokens, wrong farmer data, or role missing from JWT

#### AUTH-008: Farmer Verify-OTP Wrong Code
**Preconditions:** Same as AUTH-007.
**Test Steps:**
1. POST `/api/v1/farmer/verify-otp` with otp "000000"
**Expected Result:**
- HTTP 400 Bad Request
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Invalid OTP"
  }
}
```
- Failure Case: 200 with tokens (OTP validation not enforced)

#### AUTH-010: Admin Login Valid
**Preconditions:** Admin officer exists in admin_officers with email "superadmin@bhuvigyan.gov.in" and SHA-256 password_hash.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/admin/login`
2. Body:
```json
{
  "email": "superadmin@bhuvigyan.gov.in",
  "password": "admin123",
  "totpCode": "123456"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "officer": {
      "id": "officer-uuid",
      "fullName": "Super Admin",
      "email": "superadmin@bhuvigyan.gov.in",
      "role": "SUPER_ADMIN"
    }
  }
}
```
- JWT payload decoded contains: `userId`, `email`, `role`, `iat`, `exp`
- DB assertion: password_hash in admin_officers is SHA-256 hex string, not plaintext
- Failure Case: 401, missing tokens, or plaintext password in DB

#### AUTH-011: Admin Login Wrong Password
**Preconditions:** Admin officer exists.
**Test Steps:**
1. POST `/api/v1/admin/login` with wrong password
**Expected Result:**
- HTTP 401 Unauthorized
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Invalid credentials"
  }
}
```
- Failure Case: 200 (password check not enforced)

#### AUTH-012: Admin Login Wrong TOTP
**Preconditions:** Admin officer exists with correct password.
**Test Steps:**
1. POST `/api/v1/admin/login` with totpCode "999999"
**Expected Result:**
- HTTP 401 Unauthorized
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Invalid TOTP code"
  }
}
```
- Failure Case: 200 (TOTP validation not enforced)

#### AUTH-014: Inspector Request OTP
**Preconditions:** Officer exists in admin_officers with email "inspector.ka@bhuvigyan.gov.in".
**Test Steps:**
1. POST `http://localhost:5000/api/v1/inspector/auth/request-otp`
2. Body:
```json
{
  "email": "inspector.ka@bhuvigyan.gov.in"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "devOtp": "123456"
  }
}
```
- Failure Case: 404 if officer not found, or missing devOtp

#### AUTH-016: Inspector Login Valid
**Preconditions:** OTP requested for inspector.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/inspector/auth/login`
2. Body:
```json
{
  "email": "inspector.ka@bhuvigyan.gov.in",
  "otp": "123456"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "inspector": {
      "id": "inspector-uuid",
      "fullName": "Inspector Karnataka",
      "email": "inspector.ka@bhuvigyan.gov.in",
      "role": "FIELD_INSPECTOR"
    }
  }
}
```
- Note: Response uses `token` (not `accessToken`) for inspector auth
- Failure Case: 401, missing token, or wrong response shape

#### AUTH-018: CSC Pre-Login Valid
**Preconditions:** CSC operator exists with operatorCode "CSC-KA-001" and is_blocked=false.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/csc/auth/pre-login`
2. Body:
```json
{
  "operatorCode": "CSC-KA-001",
  "password": "any"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "requiresOtp": true
  }
}
```
- Failure Case: 401 or missing requiresOtp field

#### AUTH-019: CSC Pre-Login Blocked Operator
**Preconditions:** CSC operator with is_blocked=true.
**Test Steps:**
1. POST `/api/v1/csc/auth/pre-login` with blocked operatorCode
**Expected Result:**
- HTTP 403 Forbidden
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Operator is blocked"
  }
}
```
- Failure Case: 200 (block check not enforced)

#### AUTH-020: CSC Login Valid
**Preconditions:** CSC operator exists and pre-login passed.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/csc/auth/login`
2. Body:
```json
{
  "operatorCode": "CSC-KA-001",
  "password": "any",
  "otp": "123456"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "token": "eyJ...",
    "operator": {
      "id": "csc-uuid",
      "fullName": "CSC Operator",
      "operatorCode": "CSC-KA-001",
      "isBlocked": false
    }
  }
}
```
- Failure Case: 401, missing token, or wrong response shape

#### AUTH-025: Generic Auth Refresh Valid
**Preconditions:** Valid refresh token from any login flow.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/auth/refresh`
2. Body:
```json
{
  "refreshToken": "eyJ..."
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...new...",
    "refreshToken": "eyJ...same..."
  }
}
```
- Note: Backend returns SAME refreshToken, no rotation
- Failure Case: 401, or missing tokens in response

#### AUTH-028: JWT Payload Contains Correct Claims
**Preconditions:** Valid access token from farmer login.
**Test Steps:**
1. Decode JWT payload (Base64)
2. Verify `userId` matches farmer.id
3. Verify `mobile` matches farmer.mobile
4. Verify `role` = "FARMER"
5. Verify `exp` > current time
6. Verify `iat` < current time
7. Verify algorithm = HS256
8. Verify signature with secret `bhuvigyan-jwt-secret-key-2026-very-long-string-must-be-at-least-64-chars`
**Expected Result:** All checks pass. Payload does NOT contain `sub` or `jti`.
**Failure Case:** Any check fails, or unexpected claims present

#### AUTH-030: JWT Expired → 401
**Preconditions:** Token with past exp.
**Test Steps:**
1. Call any protected route (e.g., GET `/api/v1/farmer/profile`) with expired token
**Expected Result:**
- HTTP 401 Unauthorized
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Invalid token"
  }
}
```
- Failure Case: 200 (expiry not enforced)

#### AUTH-031: JWT Tampered Payload → 401
**Preconditions:** Valid token from farmer login.
**Test Steps:**
1. Decode payload, change role to "SUPER_ADMIN"
2. Re-encode with same header but do NOT change signature
3. Send modified token to protected route
**Expected Result:** 401, signature verification fails
**Failure Case:** 200 (role escalation succeeds)

#### AUTH-034: No Authorization Header → 401
**Preconditions:** None.
**Test Steps:**
1. GET `/api/v1/farmer/profile` without Authorization header
**Expected Result:**
- HTTP 401 Unauthorized
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Unauthorized"
  }
}
```
- Failure Case: 200 (auth not enforced)

#### AUTH-039: Admin Password Stored as SHA-256
**Preconditions:** Admin officer exists in DB.
**Test Steps:**
1. Query DB: `SELECT password_hash FROM admin_officers WHERE email='superadmin@bhuvigyan.gov.in'`
**Expected Result:**
- Value is 64-character hex string (SHA-256), NOT plaintext
- Value is NOT bcrypt (`$2a$...` or `$2b$...`)
- Value is NOT MD5 (32 chars)
- Failure Case: Plaintext or bcrypt found in DB

#### AUTH-040: Password Not Returned in Any API Response
**Preconditions:** All auth endpoints tested.
**Test Steps:**
1. Inspect responses from: /farmer/login, /farmer/verify-otp, /admin/login, /inspector/auth/login, /csc/auth/login, /auth/send-otp, /auth/verify-otp
**Expected Result:** No response body contains `password`, `password_hash`, or `passwordHash` at any nesting level.
**Failure Case:** Password or hash leaked in JSON response
---

## MODULE 2: USER AND ROLE MANAGEMENT

### 2.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| USER-001 | Admin lists officers | API | P0 | GET /admin/officers as admin | 200, officer list |
| USER-002 | Farmer lists officers → 401/403 | API | P0 | GET /admin/officers as farmer | 401 or 403 |
| USER-003 | Admin creates officer | API | P0 | POST /admin/officers | 200, officer created with temp password |
| USER-004 | Admin creates officer duplicate email | API | P0 | Same email twice | DB unique constraint error → 500 |
| USER-005 | Officer password stored as SHA-256 | Security | P0 | Check admin_officers.password_hash | SHA-256 hex, not plaintext |
| USER-006 | Admin lists CSC operators | API | P0 | GET /admin/csc-operators | 200, operator list |
| USER-007 | Admin blocks CSC operator | API | P0 | POST /admin/csc-operators/:id/block | 200, is_blocked=true |
| USER-008 | Admin unblocks CSC operator | API | P0 | POST /admin/csc-operators/:id/unblock | 200, is_blocked=false |
| USER-009 | Blocked CSC operator pre-login → 403 | API | P0 | POST /csc/auth/pre-login | 403, "Operator is blocked" |
| USER-010 | Farmer gets own profile | API | P0 | GET /farmer/profile | 200, {id, fullName, mobile, carbonEligible, carbonEnrolled} |
| USER-011 | Farmer profile requires auth | API | P0 | No Authorization header | 401, "Unauthorized" |
| USER-012 | Farmer profile token from another role rejected | Security | P0 | Use admin token on /farmer/profile | 401 or 404 |
| USER-013 | Farmer updates own profile (stub) | API | P1 | PUT /farmers/:userId | 200, updated farmer |

### 2.2 Full Step-by-Step Details (P0)

#### USER-001: Admin Lists Officers
**Preconditions:** At least one officer in admin_officers table.
**Test Steps:**
1. Login as admin (POST /admin/login)
2. GET `http://localhost:5000/api/v1/admin/officers` with Bearer token
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "officer-uuid",
      "email": "superadmin@bhuvigyan.gov.in",
      "full_name": "Super Admin",
      "role": "SUPER_ADMIN",
      "is_active": true
    }
  ]
}
```
- Failure Case: 401 (no token), 403 (wrong role), or empty list when data exists

#### USER-003: Admin Creates Officer
**Preconditions:** Admin authenticated.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/admin/officers`
2. Body:
```json
{
  "fullName": "New Inspector",
  "email": "new.inspector@bhuvigyan.gov.in",
  "role": "FIELD_INSPECTOR"
}
```
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "id": "new-officer-uuid",
    "tempPassword": "a1b2c3d4"
  }
}
```
- DB assertion: `SELECT password_hash FROM admin_officers WHERE id='{new-officer-uuid}'` → 64-char SHA-256 hex
- Failure Case: 401, or plaintext password stored in DB

#### USER-007: Admin Blocks CSC Operator
**Preconditions:** CSC operator exists with is_blocked=false.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/admin/csc-operators/{operator_id}/block`
2. Body:
```json
{
  "reason": "Fraud suspicion"
}
```
**Expected Result:**
- HTTP 200 OK
- Response: `{ "success": true }`
- DB assertion: `SELECT is_blocked FROM csc_operators WHERE id='{operator_id}'` → `true`
- Failure Case: 401, or DB not updated

#### USER-009: Blocked CSC Operator Pre-Login Rejected
**Preconditions:** CSC operator blocked in previous test.
**Test Steps:**
1. POST `http://localhost:5000/api/v1/csc/auth/pre-login`
2. Body:
```json
{
  "operatorCode": "CSC-KA-001",
  "password": "any"
}
```
**Expected Result:**
- HTTP 403 Forbidden
- Response:
```json
{
  "success": false,
  "error": {
    "message": "Operator is blocked"
  }
}
```
- Failure Case: 200 (block check not enforced on pre-login)

#### USER-010: Farmer Gets Own Profile
**Preconditions:** Farmer logged in with valid JWT.
**Test Steps:**
1. GET `http://localhost:5000/api/v1/farmer/profile` with Bearer token
**Expected Result:**
- HTTP 200 OK
- Response:
```json
{
  "success": true,
  "data": {
    "id": "farmer-uuid",
    "fullName": "Rajesh Kumar",
    "mobile": "9876543210",
    "carbonEligible": true,
    "carbonEnrolled": false
  }
}
```
- Failure Case: 401 (missing token), wrong farmer data, or missing fields

---

## MODULE 3: FARMER PROFILE

### 3.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| FARMER-001 | Authenticated farmer gets own profile | API | P0 | GET /farmer/profile | 200, full profile |
| FARMER-002 | Profile includes all fields | API | P1 | Check response keys | name, aadhar, bank, village, district, state, land_area |
| FARMER-003 | Officer accessing farmer profile → 403 | API | P0 | GET /farmer/profile as officer | 403 |
| FARMER-004 | Unverified mobile farmer → profile accessible | API | P1 | GET with unverified farmer | 200 |
| FARMER-005 | Update village | API | P1 | PUT /farmer/profile {village_id} | 200, updated |
| FARMER-006 | Update bank account + IFSC | API | P1 | PUT {bank_account, ifsc} | 200, both updated |
| FARMER-007 | Invalid IFSC → 400 | API | P0 | ifsc: "INVALID" | 400 |
| FARMER-008 | Aadhar cannot be changed | API | P0 | PUT {aadhar: "999999999999"} | 400, "Aadhar cannot be modified" |
| FARMER-009 | Empty required field → 400 | API | P0 | full_name: "" | 400 |
| FARMER-010 | Upload valid JPG < 10MB | API | P0 | POST /farmer/profile/photo | 200, URL returned |
| FARMER-011 | Upload valid PNG | API | P1 | POST with PNG | 200 |
| FARMER-012 | Upload valid WebP | API | P1 | POST with WebP | 200 |
| FARMER-013 | Upload PDF → 400 | API | P0 | POST with PDF | 400, "Photos only" |
| FARMER-014 | Upload >10MB → 413 | API | P0 | POST with 11MB file | 413 |
| FARMER-015 | Upload .exe → 400 | API | P0 | POST with .exe | 400, "Invalid file type" |
| FARMER-016 | EXIF stripped | API | P1 | Upload with GPS EXIF | GPS data removed |
| FARMER-017 | Photo URL saved | API | P0 | Check DB after upload | farmer.photo_url set |
| FARMER-018 | Unauthenticated upload → 401 | API | P0 | No auth header | 401 |

---

## MODULE 4: POLICY MANAGEMENT

### 4.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| POLICY-001 | Create Kharif rice policy Karnataka | API | P0 | POST /insurer/policies | 201, policy created |
| POLICY-002 | Create Rabi wheat policy Punjab | API | P0 | POST with Punjab data | 201 |
| POLICY-003 | Duplicate policy_number → 409 | API | P0 | Same policy_number | 409 |
| POLICY-004 | start_date after end_date → 400 | API | P0 | start: 2026-12, end: 2026-01 | 400 |
| POLICY-005 | sum_insured = 0 → 400 | API | P0 | sum_insured: 0 | 400 |
| POLICY-006 | Negative premium → 400 | API | P0 | premium_paid: -100 | 400 |
| POLICY-007 | Insured_area > land_area → warning | API | P1 | insured: 5, land: 3 | 400 or warning |
| POLICY-008 | Farmer not exist → 404 | API | P0 | farmer_id: random UUID | 404 |
| POLICY-009 | Insurer creates cross-state policy → validation | API | P1 | Punjab insurer, Karnataka farmer | Validated |
| POLICY-010 | Farmer sees own active policies | API | P0 | GET /farmer/policies | Only own, active |
| POLICY-011 | No policies → empty list | API | P1 | Farmer with 0 policies | [] |
| POLICY-012 | Expired policies shown | API | P1 | Policy with end_date < today | status=expired |
| POLICY-013 | Cancelled policies shown | API | P1 | Policy with status=cancelled | status=cancelled |
| POLICY-014 | Insurer sees their policies | API | P1 | GET as insurer | Only created by them |
| POLICY-015 | Valid policy detail | API | P0 | GET /farmer/policies/:id | 200, full detail |
| POLICY-016 | Farmer accessing others policy → 403 | API | P0 | GET another farmer's policy | 403 |
| POLICY-017 | Non-existent policy → 404 | API | P0 | Random UUID | 404 |

---

## MODULE 5: CLAIM MANAGEMENT

### 5.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| CLAIM-001 | Valid drought claim | API | P0 | POST /farmer/claims | 201, draft created |
| CLAIM-002 | Valid flood claim | API | P0 | POST flood claim | 201 |
| CLAIM-003 | affected_area > insured_area → 400 | API | P0 | area: 5, insured: 3 | 400 |
| CLAIM-004 | loss_date before policy start → 400 | API | P0 | loss: 2025-01, start: 2026-01 | 400 |
| CLAIM-005 | loss_date in future → 400 | API | P0 | loss: 2027-01-01 | 400 |
| CLAIM-006 | No active policy → 400 | API | P0 | Farmer with no active policy | 400 |
| CLAIM-007 | Duplicate claim same event → 409 | API | P0 | Same policy, same loss_date | 409 |
| CLAIM-008 | Invalid loss_type → 422 | API | P0 | loss_type: "EARTHQUAKE" | 422 |
| CLAIM-009 | Description < 20 chars → 400 | API | P0 | description: "Too short" | 400 |
| CLAIM-010 | Claim amount > 2x sum_insured → fraud flag | API | P1 | amount: 200000, insured: 50000 | Created with fraud_flag=true |
| CLAIM-011 | Claim saved as draft | API | P0 | POST claim | status=draft |
| CLAIM-012 | Claim number auto-generated | API | P0 | Check response | Unique claim_number format |
| CLAIM-013 | Kafka claim.created published | Integration | P0 | Submit claim | Kafka topic has event |
| CLAIM-014 | Officer not auto-assigned | API | P1 | Check claim after creation | officer_id = null |
| CLAIM-015 | Farmer edits draft → allowed | API | P0 | PUT draft claim | 200, updated |
| CLAIM-016 | Farmer edits submitted → 403 | API | P0 | PUT submitted claim | 403 |
| CLAIM-017 | Edit another farmer's claim → 403 | API | P0 | PUT other farmer's claim | 403 |
| CLAIM-018 | Update loss_type on draft | API | P1 | PUT {loss_type} | 200 |
| CLAIM-019 | Update description on draft | API | P1 | PUT {description} | 200 |
| CLAIM-020 | Update affected_area on draft | API | P1 | PUT {affected_area} | 200 |
| CLAIM-021 | Change policy_id on draft → 400 | API | P0 | PUT {policy_id} | 400 |
| CLAIM-022 | Update non-existent claim → 404 | API | P0 | PUT random UUID | 404 |
| CLAIM-023 | Delete own draft → 204 | API | P0 | DELETE draft claim | 204 |
| CLAIM-024 | Delete submitted → 403 | API | P0 | DELETE submitted claim | 403 |
| CLAIM-025 | Admin deletes any claim → 204 | API | P0 | DELETE as admin | 204 |
| CLAIM-026 | Delete non-existent → 404 | API | P0 | DELETE random UUID | 404 |
| CLAIM-027 | Farmer sees own claims only | API | P0 | GET /farmer/claims | Only own claims |
| CLAIM-028 | Filter by status | API | P1 | ?status=DRAFT | Matching claims |
| CLAIM-029 | Filter by date range | API | P1 | ?from=2026-01-01&to=2026-12-31 | Matching claims |
| CLAIM-030 | Pagination | API | P1 | ?page=1&limit=10 | 10 items |
| CLAIM-031 | Sort by submitted_at desc | API | P1 | Default sort | Newest first |
| CLAIM-032 | Full claim detail | API | P0 | GET /farmer/claims/:id | 200, claim + policy + fraud_score |
| CLAIM-033 | Farmer cannot see other's claim | API | P0 | GET another farmer's claim | 403 |
| CLAIM-034 | Reviewer can see any claim | API | P0 | GET as reviewer | 200 |
| CLAIM-035 | Insurer can see their policy claims | API | P1 | GET as insurer | Claims under their policies |
| CLAIM-036 | Upload 1 JPG photo | API | P0 | POST /claims/:id/photos | 200 |
| CLAIM-037 | Upload 5 photos → success | API | P0 | 5 uploads | All 200 |
| CLAIM-038 | Upload 6th photo → 400 | API | P0 | 6th upload | 400, "Max 5 photos" |
| CLAIM-039 | Photo > 10MB → 413 | API | P0 | 11MB file | 413 |
| CLAIM-040 | Non-image file → 400 | API | P0 | .txt file | 400 |
| CLAIM-041 | Photos linked in DB | API | P0 | Check claim_photos table | Records exist |
| CLAIM-042 | GPS metadata preserved | API | P1 | Upload GPS-tagged photo | GPS lat/lng stored |
| CLAIM-043 | File hash stored | API | P1 | Check DB | file_hash column set |
| CLAIM-044 | Duplicate hash → warn | API | P1 | Upload same file twice | Warning or rejection |

### 5.2 Full Step-by-Step (P0)

#### CLAIM-001: Valid Drought Claim
**Preconditions:** Farmer has active Kharif rice policy.
**Test Steps:**
1. POST `/api/v1/farmer/claims`
```json
{
  "policy_id": "policy-uuid",
  "loss_type": "DROUGHT",
  "loss_date": "2026-03-15",
  "affected_area": 2.5,
  "claim_amount": 50000,
  "description": "Severe drought observed across entire insured plot. Crop completely dried out with no recovery signs.",
  "gps_latitude": 12.9716,
  "gps_longitude": 77.5946
}
```
**Expected Result:**
- HTTP 201
```json
{
  "success": true,
  "data": {
    "id": "claim-uuid",
    "claim_number": "C-2026-000001",
    "status": "DRAFT",
    "farmer_id": "farmer-uuid",
    "policy_id": "policy-uuid",
    "loss_type": "DROUGHT",
    "loss_date": "2026-03-15",
    "affected_area": 2.5,
    "claim_amount": 50000,
    "description": "Severe drought observed...",
    "fraud_score": null,
    "officer_id": null,
    "created_at": "2026-05-10T10:00:00Z"
  }
}
```
- DB: `SELECT * FROM claims WHERE claim_number='C-2026-000001'` → 1 row, status=DRAFT
- Kafka: `claim.created` event published with claim_id
**Failure Case:** 400/500, wrong status, claim_number missing

#### CLAIM-003: Affected Area > Insured Area
**Preconditions:** Policy with insured_area = 3.0 ha.
**Test Steps:**
1. POST claim with affected_area = 5.0
**Expected Result:** HTTP 400, message: "Affected area cannot exceed insured area (3.0 ha)"
**Failure Case:** 201 created (validation missing)

---

## MODULE 6: OFFICER INSPECTION

### 6.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| INSPECT-001 | Officer sees assigned visits | API | P0 | GET /officer/visits | Only assigned visits |
| INSPECT-002 | Filter by status pending | API | P1 | ?status=PENDING | Pending only |
| INSPECT-003 | Filter by date range | API | P1 | ?from=2026-01-01 | Matching |
| INSPECT-004 | Officer with no visits → empty | API | P1 | New officer | [] |
| INSPECT-005 | Cannot see other officer's visits | API | P0 | GET as different officer | Not in list |
| INSPECT-006 | Start visit → status in_progress | API | P0 | PUT /visits/:id/start | 200, status=IN_PROGRESS |
| INSPECT-007 | GPS captured on start | API | P0 | Start visit | GPS saved in DB |
| INSPECT-008 | Already-started → idempotent | API | P1 | Start again | 200 or 409 |
| INSPECT-009 | Completed visit cannot restart | API | P0 | Start completed visit | 403 |
| INSPECT-010 | Unassigned officer → 403 | API | P0 | Start unassigned visit | 403 |
| INSPECT-011 | Complete with all fields | API | P0 | POST /visits/:id/complete | 200, status=COMPLETED |
| INSPECT-012 | Missing crop_condition → 400 | API | P0 | Omit crop_condition | 400 |
| INSPECT-013 | actual_loss_pct = -1 → 400 | API | P0 | loss_pct: -1 | 400 |
| INSPECT-014 | actual_loss_pct = 101 → 400 | API | P0 | loss_pct: 101 | 400 |
| INSPECT-015 | GPS out of India bounds → warning | API | P1 | lat: 5.0 | Warning in response |
| INSPECT-016 | Weather auto-fetched | API | P1 | Complete without weather_data | Auto-fetched from IMD |
| INSPECT-017 | On complete: claim status → under_review | API | P0 | Check claim after | status=UNDER_REVIEW |
| INSPECT-018 | On complete: fraud scoring triggered | Integration | P0 | Check Kafka | score.requested event |
| INSPECT-019 | Farmer notification sent | Integration | P0 | Check notifications table | Entry exists |
| INSPECT-020 | Kafka inspection.completed | Integration | P0 | Check Kafka | Event published |
| INSPECT-021 | DB: status completed, completed_at set | API | P0 | Check DB | Both set |
| INSPECT-022 | Upload up to 10 photos | API | P0 | 10 uploads | All 200 |
| INSPECT-023 | 11th photo → 400 | API | P0 | 11th upload | 400 |
| INSPECT-024 | GPS extracted per photo | API | P1 | Upload GPS photo | lat/lng stored per photo |
| INSPECT-025 | EXIF timestamp extracted | API | P1 | Upload with EXIF date | taken_at set |
| INSPECT-026 | DC assigns officer to claim | API | P0 | POST /dc/officers/:id/assign | 200, visit created |
| INSPECT-027 | Officer at max visits → warn/block | API | P1 | Officer with 5 open | Warning or 400 |
| INSPECT-028 | Non-officer assigned → 400 | API | P0 | Assign farmer as officer | 400 |
| INSPECT-029 | Non-existent officer → 404 | API | P0 | Random UUID officer | 404 |
| INSPECT-030 | Non-existent claim → 404 | API | P0 | Random UUID claim | 404 |
| INSPECT-031 | Kafka inspection.assigned | Integration | P0 | Check Kafka | Event published |
| INSPECT-032 | Officer notification created | Integration | P0 | Check notifications | Entry for officer |

---

## MODULE 7: FRAUD SCORING ENGINE

### 7.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| FRAUD-001 | Score computed after inspection | Integration | P0 | Complete inspection | Score calculated |
| FRAUD-002 | Score on direct submission (if configured) | Integration | P1 | Submit claim | Score calculated |
| FRAUD-003 | Kafka score.requested consumed | Integration | P0 | Publish event | Consumer processes |
| FRAUD-004 | Input assembled from all sources | Integration | P0 | Check scoring input | claim + inspection + satellite + history |
| FRAUD-005 | C++ engine called via subprocess | Integration | P0 | Check subprocess call | JSON in, JSON out |
| FRAUD-006 | Engine response parsed | Integration | P0 | Check DB after | fraud_scores record |
| FRAUD-007 | fraud_scores record created | API | P0 | Check DB | Record exists |
| FRAUD-008 | fraud_explanations record created | API | P0 | Check DB | Record exists |
| FRAUD-009 | Score 25 → auto-approve | Integration | P0 | Mock score=25 | claim.status=APPROVED |
| FRAUD-010 | Score 45 → manual review | Integration | P0 | Mock score=45 | claim.status=UNDER_REVIEW |
| FRAUD-011 | Score 70 → field visit | Integration | P0 | Mock score=70 | claim.status=CCE_VISIT |
| FRAUD-012 | Score 85 → auto-reject | Integration | P0 | Mock score=85 | claim.status=REJECTED |
| FRAUD-013 | Score 0 → valid genuine | ML | P1 | Score=0 | risk_level=LOW |
| FRAUD-014 | Score 100 → valid max fraud | ML | P1 | Score=100 | risk_level=CRITICAL |
| FRAUD-015 | Boundary score=30 → auto-approve | ML | P0 | Score=30 | risk_level=LOW |
| FRAUD-016 | Boundary score=31 → manual review | ML | P0 | Score=31 | risk_level=MEDIUM |
| FRAUD-017 | Boundary score=60 → manual review | ML | P0 | Score=60 | risk_level=MEDIUM |
| FRAUD-018 | Boundary score=61 → field visit | ML | P0 | Score=61 | risk_level=HIGH |
| FRAUD-019 | Boundary score=80 → field visit | ML | P0 | Score=80 | risk_level=HIGH |
| FRAUD-020 | Boundary score=81 → auto-reject | ML | P0 | Score=81 | risk_level=CRITICAL |
| FRAUD-021 | Feature computed correctly | ML | P1 | Check each feature | Matches expected |
| FRAUD-022 | Missing satellite → graceful default | ML | P1 | Omit satellite data | Feature uses default |
| FRAUD-023 | Missing inspection → flagged | ML | P1 | No inspection | missing_inspection flag |
| FRAUD-024 | Historical claims=0 → no penalty | ML | P1 | First-time farmer | historical_score=0 |
| FRAUD-025 | claim_amount/sum_insured > 1.2 → flagged | ML | P1 | Ratio=1.5 | amount_inflation flagged |
| FRAUD-026 | NDVI drop < 0.15 but loss_pct > 50 → flagged | ML | P1 | NDVI drop=0.1, loss=60 | ndvi_mismatch flagged |
| FRAUD-027 | Same GPS 3+ claims in 90 days → flagged | ML | P1 | 3 claims same GPS | geo_cluster flagged |
| FRAUD-028 | Officer vs farmer loss pct diff > 20% → flagged | ML | P1 | Farmer:90, Officer:30 | discrepancy flagged |
| FRAUD-029 | No weather event but flood claimed → flagged | ML | P1 | No rain, flood claim | weather_mismatch flagged |
| FRAUD-030 | C++ valid JSON → valid JSON | Integration | P0 | Send valid input | Valid output |
| FRAUD-031 | C++ malformed JSON → error JSON | Integration | P0 | Send bad JSON | {"error":...} not crash |
| FRAUD-032 | C++ timeout > 5s → Python fallback | Integration | P0 | Simulate slow engine | Fallback scorer used |
| FRAUD-033 | C++ binary not found → fallback | Integration | P0 | Rename binary | Fallback, flagged in result |
| FRAUD-034 | Score outside 0-100 → clamped | Integration | P0 | Engine returns 150 | Score=100, logged |
| FRAUD-035 | C++ via subprocess not HTTP | Security | P0 | Check network | No HTTP call, subprocess only |
| FRAUD-036 | Top 5 factors returned | ML | P0 | Check response | 5 factors with weights |
| FRAUD-037 | Factor weights sum ≈ score | ML | P0 | Sum weights | Within ±5 of total score |
| FRAUD-038 | Human-readable explanation | ML | P0 | Check response | Explanation text present |
| FRAUD-039 | SHAP values included | ML | P1 | Check response | shap_values array |
| FRAUD-040 | Explanation stored in DB | API | P0 | Check fraud_explanations | Record exists |
| FRAUD-041 | Explanation visible to reviewer | E2E | P1 | Reviewer view | Panel shows explanation |
| FRAUD-042 | Explanation visible to insurer | E2E | P1 | Insurer view | Panel shows explanation |
| FRAUD-043 | Explanation NOT visible to farmer | E2E | P0 | Farmer view | No raw score explanation |
| FRAUD-044 | Reviewer override score | API | P0 | PUT override | New score record |
| FRAUD-045 | Override requires justification | API | P0 | PUT without justification | 400 |
| FRAUD-046 | Override logged in audit_logs | API | P0 | Check audit_logs | Entry exists |
| FRAUD-047 | Override creates new record | API | P0 | Check fraud_scores | New record with override_by |
| FRAUD-048 | Original score not deleted | API | P0 | Check DB | Original record still exists |

### 7.2 Full Step-by-Step (P0)

#### FRAUD-009: Score 25 → Auto-Approve
**Preconditions:** Completed inspection with low fraud signals.
**Test Steps:**
1. Complete inspection with minimal risk signals
2. Wait for scoring pipeline (or mock C++ engine to return 25)
3. GET `/api/v1/farmer/claims/{claim_id}`
**Expected Result:**
```json
{
  "status": "APPROVED",
  "fraud_score": 25,
  "risk_level": "LOW",
  "auto_decision": true,
  "decision_reason": "Low fraud risk — auto-approved"
}
```
- DB: `SELECT status FROM claims WHERE id='{claim_id}'` → "APPROVED"
- Kafka: `decision.made` event published
- Notification: farmer notification created with approval message
**Failure Case:** Status remains UNDER_REVIEW, or score not computed

#### FRAUD-015: Boundary Score 30 → Auto-Approve
**Preconditions:** Mock engine configured.
**Test Steps:**
1. Configure C++ engine mock to return score=30
2. Submit inspection
3. Check claim status
**Expected Result:** claim.status = "APPROVED", risk_level = "LOW"
**Failure Case:** Status = UNDER_REVIEW (boundary not inclusive)

---

## MODULE 8: SATELLITE AND WEATHER EVIDENCE

### 8.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| SAT-001 | Valid lat/lng in India → NDVI | API | P0 | GET /satellite/ndvi | Timeseries returned |
| SAT-002 | NDVI drop computed | API | P0 | Before vs after loss | Drop value correct |
| SAT-003 | Response includes all fields | API | P1 | Check response | ndvi_values, mean, min, anomaly |
| SAT-004 | Anomaly when drop > threshold | API | P0 | Simulate large drop | anomaly_detected=true |
| SAT-005 | Cached result within 1 hour | Performance | P0 | Same request twice | Second < 100ms |
| SAT-006 | Cache key format | Integration | P1 | Check Redis | ndvi:lat:lng:start:end |
| SAT-007 | GEE unavailable → mock fallback | Integration | P0 | Block GEE | is_mock=true, data returned |
| SAT-008 | Lat outside India → 400 | API | P0 | lat: 5.0 | 400 |
| SAT-009 | Lng outside India → 400 | API | P0 | lng: 50.0 | 400 |
| SAT-010 | start_date after end_date → 400 | API | P0 | start: 2026-12, end: 2026-01 | 400 |
| SAT-011 | Missing lat/lng → 422 | API | P0 | Omit both | 422 |
| SAT-012 | High cloud cover warning | API | P1 | Simulated cloudy data | cloud_cover_warning=true |
| SAT-013 | SAR data for flood claims | API | P0 | GET /satellite/sar | SAR backscatter |
| SAT-014 | Flood signal detected | API | P0 | Simulated flood | sar_flood_signal=true |
| SAT-015 | No SAR data → null | API | P0 | No data available | null, is_available=false |
| SAT-016 | SAR and NDVI stored in satellite_cache | API | P0 | Check DB | Records in satellite_cache |
| WEATHER-001 | Rainfall for loss_date | API | P0 | GET /weather | Rainfall data returned |
| WEATHER-002 | No rainfall for claimed flood | API | P0 | No rain, flood claim | weather_mismatch=true |
| WEATHER-003 | Data from IMD/OpenWeatherMap | Integration | P1 | Check source | Valid data |
| WEATHER-004 | Cached 24 hours | Performance | P1 | Same request twice | Second fast |
| WEATHER-005 | Returns all weather fields | API | P1 | Check response | temp, rainfall, humidity, wind |
| WEATHER-006 | Extreme event flag | API | P1 | Simulated extreme | weather_event_flag=true |
| WEATHER-007 | API key missing → service unavailable | API | P0 | Remove key | 503, "Service unavailable" |

---

## MODULE 9: REVIEW AND DECISIONING WORKFLOW

### 9.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| DECISION-001 | Approve with amount ≤ claim | API | P0 | PUT /dc/claims/:id/approve | 200, status=APPROVED |
| DECISION-002 | Approve without notes → default required | API | P0 | Omit notes | 400, "Notes required" |
| DECISION-003 | approved_amount > claim → 400 | API | P0 | amount > claim_amount | 400 |
| DECISION-004 | Already approved → 409 | API | P0 | Approve again | 409 |
| DECISION-005 | Already rejected → 403 | API | P0 | Approve rejected claim | 403 |
| DECISION-006 | Farmer tries to approve → 403 | API | P0 | POST as farmer | 403 |
| DECISION-007 | Kafka decision.made published | Integration | P0 | Approve claim | Event in Kafka |
| DECISION-008 | Farmer notification: approved | Integration | P0 | Check notifications | Approval notification |
| DECISION-009 | DB: status approved, reviewed_at set | API | P0 | Check DB | Both correct |
| DECISION-010 | Reject with reason | API | P0 | PUT /reject with reason | 200, status=REJECTED |
| DECISION-011 | Empty rejection reason → 400 | API | P0 | Omit reason | 400 |
| DECISION-012 | Already approved → 403 | API | P0 | Reject approved | 403 |
| DECISION-013 | Kafka decision.made on reject | Integration | P0 | Check Kafka | Event published |
| DECISION-014 | Farmer notification: rejected | Integration | P0 | Check notifications | Rejection with reason |
| DECISION-015 | DB: status rejected | API | P0 | Check DB | status=REJECTED |
| DECISION-016 | Flag for investigation | API | P0 | PUT /flag | 200, flagged |
| DECISION-017 | Flag creates audit entry | API | P0 | Check audit_logs | Entry exists |
| DECISION-018 | Flagged → fraud_analyst queue | Integration | P0 | Check queue | Claim in queue |
| DECISION-019 | Notify insurer on flag | Integration | P0 | Check notifications | Insurer notified |
| DECISION-020 | Notify admin on flag | Integration | P0 | Check notifications | Admin notified |
| DECISION-021 | Reviewer sees jurisdiction only | API | P0 | GET /dc/claims | Only their district |
| DECISION-022 | Filter by status under_review | API | P1 | ?status=UNDER_REVIEW | Matching |
| DECISION-023 | Filter by fraud_flag | API | P1 | ?fraud_flag=true | Matching |
| DECISION-024 | Filter by district | API | P1 | ?district=Bengaluru+Rural | Matching |
| DECISION-025 | Filter by fraud score range | API | P1 | ?min_score=60&max_score=100 | Matching |
| DECISION-026 | Filter by date range | API | P1 | ?from=2026-01-01 | Matching |
| DECISION-027 | Pagination | API | P1 | ?page=1&limit=20 | Paginated |
| DECISION-028 | Fraud alerts > 70 | API | P0 | GET /dc/fraud-alerts | Score > 70 only |
| DECISION-029 | Sorted by score desc | API | P0 | Default sort | Highest first |
| DECISION-030 | Includes farmer name + amount + factor | API | P0 | Check response | All fields present |
| DECISION-031 | Appeal rejected claim | API | P0 | POST /claims/:id/appeal | 201, appeal created |
| DECISION-032 | Appeal creates history entry | API | P0 | Check claim_status_history | Entry exists |
| DECISION-033 | Appeal reason mandatory | API | P0 | Omit reason | 400 |
| DECISION-034 | Appeal assigned to senior reviewer | API | P0 | Check appeal | senior_reviewer_id set |
| DECISION-035 | Appeal decision: uphold or approve | API | P0 | Senior decides | Claim updated |
| DECISION-036 | One active appeal per claim | API | P0 | Second appeal | 409, "Active appeal exists" |

---

## MODULE 10: NOTIFICATIONS

### 10.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| NOTIFY-001 | Claim submitted → farmer notification | Integration | P0 | Submit claim | Notification created |
| NOTIFY-002 | Inspection assigned → officer | Integration | P0 | Assign officer | Officer notified |
| NOTIFY-003 | Inspection completed → farmer | Integration | P0 | Complete inspection | Farmer notified |
| NOTIFY-004 | Claim approved → farmer | Integration | P0 | Approve claim | Approval notification with amount |
| NOTIFY-005 | Claim rejected → farmer | Integration | P0 | Reject claim | Rejection with reason |
| NOTIFY-006 | Fraud score > 70 → admin + insurer | Integration | P0 | Score=75 | Both notified |
| NOTIFY-007 | Claim flagged → fraud analyst + insurer | Integration | P0 | Flag claim | Both notified |
| NOTIFY-008 | Kafka consumer processes event | Integration | P0 | Publish event | Notification created |
| NOTIFY-009 | Notification stored in DB | API | P0 | Check notifications table | Record exists |
| NOTIFY-010 | Notification has all fields | API | P1 | Check record | user_id, type, title, message, is_read=false |
| NOTIFY-011 | GET own notifications | API | P0 | GET /notifications | Only own |
| NOTIFY-012 | Unread count accurate | API | P0 | Count unread | Correct count |
| NOTIFY-013 | Filter by is_read=false | API | P1 | ?is_read=false | Only unread |
| NOTIFY-014 | Pagination default 20 | API | P1 | No limit param | 20 items |
| NOTIFY-015 | Sorted by created_at desc | API | P1 | Default | Newest first |
| NOTIFY-016 | Another user's notifications → 403 | API | P0 | Specify other user_id | 403 |
| NOTIFY-017 | Mark single as read | API | P0 | PUT /notifications/:id/read | is_read=true |
| NOTIFY-018 | Another user's notification → 403 | API | P0 | Mark other's as read | 403 |
| NOTIFY-019 | Already read → idempotent | API | P1 | Mark again | 200, no error |
| NOTIFY-020 | Mark all as read | API | P0 | PUT /notifications/mark-all-read | All unread → read |
| NOTIFY-021 | Unread count becomes 0 | API | P0 | GET /notifications/unread-count | 0 |
| NOTIFY-022 | Other user's notifications unaffected | API | P0 | Check other user's count | Unchanged |

---

## MODULE 11: STATE ADAPTER FRAMEWORK

### 11.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| ADAPTER-001 | Maharashtra adapter loaded | Integration | P0 | Claim in Maharashtra | Maharashtra rules applied |
| ADAPTER-002 | Karnataka adapter loaded | Integration | P0 | Claim in Karnataka | Karnataka rules applied |
| ADAPTER-003 | Unknown state → default | Integration | P0 | Unknown state | Default adapter |
| ADAPTER-004 | Config from DB not hardcoded | Integration | P0 | Change config | New config used |
| ADAPTER-005 | Config cached in Redis | Performance | P0 | Two requests | Second uses cache |
| ADAPTER-006 | Cache TTL 5 min | Performance | P1 | Wait 5 min + 1 sec | DB re-queried |
| ADAPTER-007 | Maharashtra: 3+ photos required | Integration | P0 | Upload 2 photos | Validation error |
| ADAPTER-008 | Karnataka: NDVI threshold 0.2 | Integration | P0 | NDVI drop=0.18 | Reflected in score |
| ADAPTER-009 | Telangana: committee approval required | Integration | P0 | Telangana claim | Committee step enforced |
| ADAPTER-010 | Punjab: Rabi wheat needs SAR | Integration | P0 | Punjab wheat claim | SAR required |
| ADAPTER-011 | UP: khatauni required | Integration | P0 | UP claim without khatauni | Validation error |
| ADAPTER-012 | Rajasthan: IMD drought number | Integration | P0 | Rajasthan drought claim | IMD number required |
| ADAPTER-013 | Admin creates adapter config | API | P0 | POST /admin/adapters | 201, config created |
| ADAPTER-014 | Admin updates threshold | API | P0 | PUT /admin/adapters/:id | 200, updated |
| ADAPTER-015 | Update non-retroactive | API | P0 | Update config | Old claims unchanged |
| ADAPTER-016 | Kafka adapter.updated | Integration | P0 | Update config | Event published |
| ADAPTER-017 | Invalid state code → 400 | API | P0 | state_code: "XX" | 400 |
| ADAPTER-018 | Config stored in state_adapters | API | P0 | Check DB | Record exists |
| ADAPTER-019 | Audit log on change | API | P0 | Check audit_logs | Entry exists |
| ADAPTER-020 | Adapter-specific validation enforced | E2E | P0 | Submit Maharashtra claim with 2 photos | Blocked at UI + API |

---

## MODULE 12: ADMIN PANEL

### 12.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| ADMIN-001 | System health all up | API | P0 | GET /admin/system/health | All components ok |
| ADMIN-002 | PostgreSQL down → degraded | Integration | P0 | Stop PostgreSQL | db_status=down, overall=degraded |
| ADMIN-003 | Redis down → degraded | Integration | P0 | Stop Redis | redis_status=down |
| ADMIN-004 | Engine binary missing → degraded | Integration | P0 | Remove binary | engine_status=down |
| ADMIN-005 | Kafka down → degraded | Integration | P0 | Stop Kafka | kafka_status=down |
| ADMIN-006 | Unauthenticated → 401 | API | P0 | No auth | 401 |
| ADMIN-007 | Non-admin → 403 | API | P0 | Farmer access | 403 |
| ADMIN-008 | System stats returned | API | P0 | GET /admin/system/stats | total_users, active_claims, etc. |
| ADMIN-009 | Stats near-realtime | Performance | P1 | Check timestamp | Cached < 60s |
| ADMIN-010 | Update fraud threshold | API | P0 | PUT /admin/config | 200, new threshold |
| ADMIN-011 | Change from 30 to 25 | API | P0 | Update to 25 | New claims use 25 |
| ADMIN-012 | Old claims not rescored | API | P0 | Check old claim | Score unchanged |
| ADMIN-013 | Non-admin update → 403 | API | P0 | Farmer tries | 403 |
| ADMIN-014 | Invalid threshold >100 → 400 | API | P0 | threshold: 101 | 400 |
| ADMIN-015 | Negative threshold → 400 | API | P0 | threshold: -1 | 400 |
| ADMIN-016 | Kafka config.updated | Integration | P0 | Update config | Event published |
| ADMIN-017 | Audit log on config change | API | P0 | Check audit_logs | Entry exists |
| ADMIN-018 | Get all audit logs | API | P0 | GET /audit | All logs returned |
| ADMIN-019 | Filter by user_id | API | P1 | ?user_id=xxx | Matching logs |
| ADMIN-020 | Filter by action | API | P1 | ?action=CLAIM_APPROVED | Matching |
| ADMIN-021 | Filter by resource_type | API | P1 | ?resource=claim | Matching |
| ADMIN-022 | Filter by date range | API | P1 | ?from=2026-01-01 | Matching |
| ADMIN-023 | Pagination | API | P1 | ?page=1&limit=50 | Paginated |
| ADMIN-024 | Non-admin cannot access audit → 403 | API | P0 | Farmer access | 403 |
| ADMIN-025 | Audit log append-only | Security | P0 | Try DELETE /audit/:id | 405 or 403 |
| ADMIN-026 | Logs include all fields | API | P1 | Check response | user_id, action, resource, IP, user_agent, created_at |

---

## MODULE 13: ML / MODEL OPS

### 13.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| ML-001 | Register new model version | API | P0 | POST /ml/models | 201, model registered |
| ML-002 | Model metadata stored | API | P0 | Check DB | version, algorithm, feature_count, training_date |
| ML-003 | Model file uploaded to storage | Integration | P0 | Check storage | File exists |
| ML-004 | Active model selectable | API | P0 | PUT /ml/models/:id/activate | is_active=true |
| ML-005 | Only one active at a time | API | P0 | Activate second model | First model is_active=false |
| ML-006 | Kafka model.deployed | Integration | P0 | Activate model | Event published |
| ML-007 | 47 features → score 0-100 | ML | P0 | Inference with all features | Score in [0,100] |
| ML-008 | One missing feature → flag | ML | P0 | Omit one feature | missing_features flag, still scored |
| ML-009 | All features missing → fallback | ML | P0 | No features | Fallback rule scorer |
| ML-010 | Inference p95 < 500ms | Performance | P0 | Run 1000 inferences | p95 < 500ms |
| ML-011 | Scoring latency logged | API | P0 | Check scoring_requests table | Latency_ms recorded |
| ML-012 | Score stored in scoring_results | API | P0 | Check DB | Record exists |
| ML-013 | Challenger shadow run | Integration | P0 | Enable challenger | Challenger score logged |
| ML-014 | Challenger score doesn't affect decision | Integration | P0 | Check claim | Decision from champion only |
| ML-015 | Divergence logged | Integration | P0 | Different scores | Recorded for analysis |
| ML-016 | Score distribution shift alert | Integration | P0 | Simulate shift | Alert raised |
| ML-017 | Feature distribution shift alert | Integration | P0 | Simulate shift | Alert raised |
| ML-018 | Drift check daily | Integration | P1 | Check schedule | Batch job runs daily |
| ML-019 | Drift alert to DS team | Integration | P0 | Simulate drift | Notification to DS channel |
| ML-020 | SHAP values returned | ML | P0 | Check inference response | shap_values array |
| ML-021 | Top 5 factors ranked | ML | P0 | Check response | 5 factors sorted by |shap| |
| ML-022 | Human-readable text per factor | ML | P0 | Check response | Explanation text |
| ML-023 | Explanation stored | API | P0 | Check fraud_explanations | Record exists |
| ML-024 | Explanation retrievable | API | P0 | GET /explanations/:id | 200, full explanation |

---

## MODULE 14: EVIDENCE AND DOCUMENT MANAGEMENT

### 14.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| EVID-001 | JPG upload → stored | API | P0 | POST /evidence/upload | 200, URL returned |
| EVID-002 | PNG upload → stored | API | P1 | POST PNG | 200 |
| EVID-003 | WebP upload → stored | API | P1 | POST WebP | 200 |
| EVID-004 | PDF upload → stored | API | P1 | POST PDF | 200 |
| EVID-005 | EXE upload → 400 | Security | P0 | POST .exe | 400, "Invalid file type" |
| EVID-006 | ZIP upload → 400 | Security | P0 | POST .zip | 400 |
| EVID-007 | 0 bytes → 400 | API | P0 | Empty file | 400 |
| EVID-008 | Exactly 10MB → 200 | API | P1 | 10.0MB file | 200 |
| EVID-009 | 10.1MB → 413 | API | P0 | 10.1MB file | 413 |
| EVID-010 | Duplicate hash → deduplicate | API | P1 | Same file twice | Warning or reuse URL |
| EVID-011 | GPS EXIF extracted | API | P0 | Upload GPS photo | lat/lng stored |
| EVID-012 | EXIF timestamp extracted | API | P1 | Upload with EXIF date | taken_at stored |
| EVID-013 | Virus scan → clean | Security | P1 | Clean file | 200 |
| EVID-014 | Virus scan → infected | Security | P0 | EICAR test file | 400, "Infected file detected" |
| EVID-015 | Generate evidence PDF dossier | API | P0 | POST /evidence/generate | PDF URL returned |
| EVID-016 | PDF includes all sections | API | P0 | Download PDF | Claim, farmer, policy, inspection, photos, NDVI, fraud |
| EVID-017 | PDF on-demand generation | API | P0 | Generate twice | Generated each time |
| EVID-018 | PDF access restricted | Security | P0 | Farmer tries to download | 403 |
| EVID-019 | Reviewer can download | API | P0 | Download as reviewer | 200, PDF returned |
| EVID-020 | Insurer can download | API | P0 | Download as insurer | 200 |
| EVID-021 | PDF stored in object storage | Integration | P0 | Check storage | File exists |
| EVID-022 | Signed URL 15 min expiry | API | P0 | GET signed URL | 200 |
| EVID-023 | Expired signed URL → 403 | Security | P0 | Wait 16 min, access | 403 |
| EVID-024 | Tampered signed URL → 403 | Security | P0 | Alter signature | 403 |
| EVID-025 | Correct signed URL → download | API | P0 | Access valid URL | File downloaded |
| EVID-026 | Unauthenticated signed URL → 401 | Security | P0 | No auth | 401 |

---

## MODULE 15: RATE LIMITING AND ABUSE PROTECTION

### 15.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| RATE-001 | 61st request/min → 429 | Performance | P0 | 61 requests in 60s | 429, Retry-After header |
| RATE-002 | Retry-After header present | API | P0 | After rate limit | Header with seconds |
| RATE-003 | After 1 min, requests succeed | API | P0 | Wait 60s, request | 200 |
| RATE-004 | 6th login/min → 429 | API | P0 | 6 login attempts | 429 |
| RATE-005 | 4th registration/hour → 429 | API | P0 | 4 registrations | 429 |
| RATE-006 | X-Forwarded-For spoofing → real IP | Security | P0 | Spoof XFF header | Rate limit uses real IP |
| RATE-007 | CORS localhost:5173 → allowed | Security | P0 | Origin: localhost:5173 | 200, Access-Control headers |
| RATE-008 | CORS localhost:3000 → blocked | Security | P0 | Origin: localhost:3000 | 403 or CORS error |
| RATE-009 | CORS external origin → blocked | Security | P0 | Origin: https://evil.com | 403 or CORS error |
| RATE-010 | X-Content-Type-Options: nosniff | Security | P0 | Check response headers | Header present |
| RATE-011 | X-Frame-Options: DENY | Security | P0 | Check headers | Header present |
| RATE-012 | Content-Security-Policy present | Security | P0 | Check headers | CSP header present |

---

## MODULE 16: KAFKA EVENT PIPELINE

### 16.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| KAFKA-001 | claim.submitted event published | Integration | P0 | Submit claim | Event in topic |
| KAFKA-002 | Event includes all fields | Integration | P0 | Check event | claim_id, farmer_id, timestamp, idempotency_key |
| KAFKA-003 | inspection.completed published | Integration | P0 | Complete inspection | Event in topic |
| KAFKA-004 | score.completed published | Integration | P0 | Score computed | Event in topic |
| KAFKA-005 | decision.made published | Integration | P0 | Approve claim | Event in topic |
| KAFKA-006 | Notification service consumes decision.made | Integration | P0 | Approve claim | Notification created |
| KAFKA-007 | Scoring service consumes score.requested | Integration | P0 | Publish event | Scoring triggered |
| KAFKA-008 | Audit service consumes all events | Integration | P0 | Any event | Audit_logs updated |
| KAFKA-009 | Consumer offsets committed | Integration | P1 | Check Kafka | Offset advanced |
| KAFKA-010 | Failed processing retried 3x | Integration | P0 | Simulate failure | 3 retries, then DLQ |
| KAFKA-011 | 3 retries → DLQ | Integration | P0 | Persistent failure | Message in DLQ |
| KAFKA-012 | DLQ alerts operations | Integration | P0 | Check alerts | Ops team notified |
| KAFKA-013 | Duplicate idempotency_key → ignored | Integration | P0 | Same event twice | Second ignored |
| KAFKA-014 | Kafka unavailable → graceful degradation | Integration | P0 | Stop Kafka | API accepts, events queued locally |
| KAFKA-015 | Reconnect → queued events flushed | Integration | P0 | Restart Kafka | Events flushed |

---

## MODULE 17: DATABASE INTEGRITY

### 17.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| DB-001 | FK claim.farmer_id → farmers.id | Integration | P0 | Insert claim with bad farmer_id | DB error caught, 404 |
| DB-002 | FK claim.policy_id → policies.id | Integration | P0 | Insert claim with bad policy_id | DB error caught |
| DB-003 | UNIQUE users.mobile | Integration | P0 | Duplicate mobile | 409 at service layer |
| DB-004 | UNIQUE policies.policy_number | Integration | P0 | Duplicate policy_number | 409 |
| DB-005 | UNIQUE fraud_scores.claim_id (versioned) | Integration | P0 | New score for same claim | New version created |
| DB-006 | DELETE user with active claims | Integration | P0 | Soft delete | Claims remain, user deactivated |
| DB-007 | NULL in NOT NULL → caught | Integration | P0 | Insert NULL in required field | DB error, 400 at service |
| DB-008 | Flyway V1→V26 fresh DB | Integration | P0 | Run migrations | No errors |
| DB-009 | Flyway re-run → checksum match | Integration | P0 | Run again | Skipped, no error |
| DB-010 | Flyway altered file → checksum mismatch | Integration | P0 | Modify migration | Rejected, error |
| DB-011 | Flyway missing file → gap detected | Integration | P0 | Remove V15 | Error, gap detected |
| DB-012 | Flyway out-of-order → handled | Integration | P0 | Add V27 before running | Handled per config |
| DB-013 | Claim + evidence atomic | Integration | P0 | Submit claim + evidence | Both succeed or both rollback |
| DB-014 | Score + explanation atomic | Integration | P0 | Compute score | Both saved or none |
| DB-015 | Decision + notification atomic | Integration | P0 | Approve + notify | Decision succeeds even if notify fails |

---

## MODULE 18: FRONTEND / UI TESTS

### 18.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| UI-001 | Valid login → redirect to dashboard | E2E | P0 | Enter valid creds, submit | Redirects to /farmer/dashboard |
| UI-002 | Wrong credentials → inline error | E2E | P0 | Enter wrong password | Error shown inline, no redirect |
| UI-003 | 2FA required → /login/2fa | E2E | P0 | Login with 2FA user | Redirects to /login/2fa |
| UI-004 | Forgot password link works | E2E | P1 | Click forgot password | Navigates to /forgot-password |
| UI-005 | Show/hide password toggle | E2E | P1 | Click eye icon | Password visible/hidden |
| UI-006 | Empty submission blocked | E2E | P0 | Submit empty form | Validation error, no API call |
| UI-007 | Form submits on Enter | E2E | P1 | Press Enter in password field | Form submits |
| UI-008 | Loading spinner during API call | E2E | P1 | Submit login | Spinner visible, button disabled |
| UI-009 | Stat cards show correct values | E2E | P0 | Dashboard loads | Stats match API response |
| UI-010 | Recent claims table shows last 5 | E2E | P0 | Dashboard loads | 5 claims displayed |
| UI-011 | Notification bell shows unread count | E2E | P0 | Have unread notifications | Badge shows correct count |
| UI-012 | Empty state when no claims | E2E | P1 | New farmer dashboard | "No claims yet" message |
| UI-013 | Skeleton loaders before data | E2E | P1 | Throttle network to slow 3G | Skeleton visible before data |
| UI-014 | Error state on API failure | E2E | P1 | Block API call | Error message shown |
| UI-015 | Policy selector loads active policies | E2E | P0 | Step 1 of claim form | Only active policies in dropdown |
| UI-016 | Selecting policy auto-fills crop | E2E | P0 | Select policy | Crop and area auto-filled |
| UI-017 | Loss date cannot be future | E2E | P0 | Select future date | Validation error |
| UI-018 | Affected area ≤ insured area | E2E | P0 | Enter area > insured | Validation error |
| UI-019 | Description validates 20+ chars | E2E | P0 | Enter "Too short" | Validation error |
| UI-020 | Photo upload previews | E2E | P1 | Upload photo | Thumbnail visible |
| UI-021 | Remove photo works | E2E | P1 | Click remove | Photo removed from list |
| UI-022 | Review step shows all data | E2E | P0 | Proceed to step 3 | All entered data visible |
| UI-023 | Submit sends POST request | E2E | P0 | Click submit | API called, loading state |
| UI-024 | Success redirects to claim detail | E2E | P0 | Successful submit | Redirects to /farmer/claims/:id |
| UI-025 | Error shows inline | E2E | P0 | API returns 400 | Error message inline, not just toast |
| UI-026 | GPS capture triggers geolocation | E2E | P0 | Click "Get GPS" | Browser geolocation prompt |
| UI-027 | GPS coordinates displayed | E2E | P0 | Allow geolocation | Coordinates shown |
| UI-028 | Loss percentage slider 0-100 | E2E | P0 | Drag slider | Value updates 0-100 |
| UI-029 | Crop condition radio works | E2E | P0 | Select option | Selected state correct |
| UI-030 | Photo upload limit 10 | E2E | P0 | Try 11th upload | Error: max 10 photos |
| UI-031 | Submit inspection calls API | E2E | P0 | Complete form, submit | PUT /officer/visits/:id/complete |
| UI-032 | Fraud gauge shows after submit | E2E | P0 | After inspection | Gauge component renders |
| UI-033 | Fraud gauge renders correctly | E2E | P0 | View review page | Gauge shows correct score color |
| UI-034 | Top 5 factors shown with weights | E2E | P0 | Reviewer view | 5 factors visible |
| UI-035 | Approve/reject/flag buttons role-gated | E2E | P0 | Login as reviewer | Buttons visible |
| UI-036 | Approve amount input required | E2E | P0 | Click approve | Amount input appears, required |
| UI-037 | Reject reason required | E2E | P0 | Click reject | Textarea appears, required |
| UI-038 | Flag sends to queue | E2E | P0 | Click flag | Confirmation modal, then queued |
| UI-039 | Confirmation modal before decision | E2E | P0 | Click approve | "Are you sure?" modal |
| UI-040 | Search by name in admin users | E2E | P1 | Type "Rajesh" in search | Filtered results |
| UI-041 | Filter by role | E2E | P1 | Select "FARMER" from dropdown | Filtered results |
| UI-042 | Edit user modal pre-filled | E2E | P1 | Click edit on user | Modal opens with user data |
| UI-043 | Unlock button for locked accounts | E2E | P1 | View locked user | Unlock button visible |
| UI-044 | Reset 2FA for enabled users | E2E | P1 | View TOTP-enabled user | Reset button visible |
| UI-045 | Delete confirmation modal | E2E | P1 | Click delete | "Confirm delete?" modal |
| UI-046 | Deleted user removed from list | E2E | P1 | Confirm delete | User no longer in table |
| UI-047 | /farmer/dashboard blocked for officer | E2E | P0 | Officer navigates to /farmer/dashboard | Redirect to /officer/dashboard |
| UI-048 | /admin/users blocked for farmer | E2E | P0 | Farmer navigates to /admin/users | Redirect to /farmer/dashboard |
| UI-049 | /login redirects if authenticated | E2E | P0 | Logged-in user visits /login | Redirect to role dashboard |
| UI-050 | Session expired → /login | E2E | P0 | Token expires while on page | Redirect to /login with toast |
| UI-051 | Unauthenticated → /login | E2E | P0 | Clear token, visit /farmer/dashboard | Redirect to /login |
| UI-052 | Sidebar hamburger on mobile | E2E | P1 | Resize to 375px | Hamburger menu visible |
| UI-053 | Tables convert to cards on mobile | E2E | P1 | Resize to 375px | Table becomes card list |
| UI-054 | Stat cards stack vertically on mobile | E2E | P1 | Resize to 375px | Cards in single column |
| UI-055 | Touch targets min 44x44px | E2E | P1 | Inspect buttons | min-width/height >= 44px |
| UI-056 | No horizontal overflow on 375px | E2E | P1 | Scroll check | No horizontal scrollbar |

---

## MODULE 19: SECURITY TESTS

### 19.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| SEC-001 | SQL injection all string inputs | Security | P0 | Test all endpoints with payloads | Parameterized queries, no execution |
| SEC-002 | NoSQL injection in JSON body | Security | P0 | {"$gt": ""} in body | Sanitized, no MongoDB injection |
| SEC-003 | XSS in claim description | Security | P0 | Submit claim with `<script>` | Escaped in DB and response |
| SEC-004 | XSS in farmer name | Security | P0 | Register with `<script>` | Escaped everywhere |
| SEC-005 | SSRF via satellite URL param | Security | P0 | ?url=file:///etc/passwd | Validated against allowlist |
| SEC-006 | Path traversal in filename | Security | P0 | Upload "../../../etc/passwd.jpg" | Sanitized to UUID |
| SEC-007 | JWT algorithm confusion none | Security | P0 | alg: "none" | 401 |
| SEC-008 | JWT RS256 to HS256 confusion | Security | P0 | Use RSA pubkey as HMAC secret | 401 |
| SEC-009 | JWT future nbf | Security | P0 | nbf = now + 3600 | 401 |
| SEC-010 | CSRF without token | Security | P0 | State-changing POST from external origin | Rejected |
| SEC-011 | Clickjacking X-Frame-Options | Security | P0 | Check headers | X-Frame-Options: DENY |
| SEC-012 | Farmer A accesses Farmer B claim | Security | P0 | IDOR attempt | 403 |
| SEC-013 | Officer A accesses Officer B inspection | Security | P0 | IDOR attempt | 403 |
| SEC-014 | Farmer accesses /admin endpoint | Security | P0 | Vertical escalation attempt | 403 |
| SEC-015 | Reviewer deletes farmer | Security | P0 | Privilege escalation attempt | 403 |
| SEC-016 | Malicious file .jpg executable | Security | P0 | Upload .jpg with MZ header | Detected, 400 |
| SEC-017 | Direct file URL without auth | Security | P0 | Access /uploads/file.jpg directly | 401 or 403 |
| SEC-018 | Admin password stored as SHA-256 | Security | P0 | Check admin_officers.password_hash | SHA-256 hex (64 chars), not plaintext |
| SEC-019 | Farmer auth has no password | Security | P0 | Check farmers table columns | No password column exists |
| SEC-020 | Password not in any API response | Security | P0 | All endpoints | No password field in any response |

---

## MODULE 20: PERFORMANCE AND LOAD TESTS

### 20.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| PERF-001 | POST /farmer/verify-otp p95 < 300ms | Performance | P0 | 1000 verify-OTP requests | p95 < 300ms |
| PERF-002 | POST /claims p95 < 500ms | Performance | P0 | 1000 claim submissions | p95 < 500ms |
| PERF-003 | GET /farmer/claims p95 < 300ms | Performance | P0 | 1000 GET requests | p95 < 300ms |
| PERF-004 | GET /fraud-scores/:id p95 < 200ms | Performance | P0 | 1000 GET requests | p95 < 200ms |
| PERF-005 | Fraud scoring E2E p95 < 2000ms | Performance | P0 | 500 scoring flows | p95 < 2000ms |
| PERF-006 | NDVI cached p95 < 100ms | Performance | P0 | 1000 cached requests | p95 < 100ms |
| PERF-007 | NDVI uncached GEE p95 < 8000ms | Performance | P1 | 100 uncached requests | p95 < 8000ms |
| PERF-008 | 500 concurrent users | Performance | P0 | k6 ramp to 500 | Error rate < 0.1% |
| PERF-009 | 100 simultaneous claim submissions | Performance | P0 | 100 parallel POSTs | No data corruption, all succeed |
| PERF-010 | 50 simultaneous fraud scores | Performance | P0 | 50 parallel scores | No race conditions |
| PERF-011 | Ramp 0→500 users over 5 min | Performance | P0 | k6 ramp | Error rate < 0.1% |
| PERF-012 | Sustained 500 users 30 min | Performance | P0 | k6 steady state | No memory leak, stable latency |
| PERF-013 | Spike 1000 instant users | Performance | P0 | k6 spike | Graceful degradation, rate limiting |
| PERF-014 | 1M claim records query < 500ms | Performance | P0 | Query with indexes | < 500ms |
| PERF-015 | 100 concurrent 10MB uploads | Performance | P1 | Parallel uploads | Server stable |
| PERF-016 | Kafka 10K events/min | Performance | P1 | Publish 10K/min | Consumers keep up |
| PERF-017 | C++ engine 1000/min p95 < 200ms | Performance | P0 | 1000 engine calls | p95 < 200ms per call |
| PERF-018 | Python fallback 1000/min p95 < 1000ms | Performance | P1 | 1000 fallback calls | p95 < 1000ms |

---

## MODULE 21: END-TO-END WORKFLOW TESTS

### 21.1 Workflow 1: Genuine Low-Risk Claim (Auto-Approve)

**TC-ID:** E2E-001 | **Type:** E2E | **Priority:** P0

**Preconditions:**
- Fresh farmer account: mobile 9900000001, verified, active
- Active Kharif rice policy: sum_insured=100000, insured_area=3.0 ha
- No prior claims for this farmer
- C++ engine mock configured to return score=22

**Test Steps:**
1. Farmer requests OTP (POST /farmer/login) → then verifies OTP (POST /farmer/verify-otp) → receives tokens
2. GET /farmer/policies → confirms active policy
3. POST /farmer/claims:
```json
{
  "policy_id": "policy-uuid",
  "loss_type": "DROUGHT",
  "loss_date": "2026-03-15",
  "affected_area": 2.5,
  "claim_amount": 50000,
  "description": "Severe drought observed across entire plot. Crop dried out completely.",
  "gps_latitude": 12.9716,
  "gps_longitude": 77.5946
}
```
4. Upload 3 photos (POST /farmer/claims/{id}/photos) → all 200
5. PUT /farmer/claims/{id}/submit → status changes to SUBMITTED
6. DC assigns officer (POST /dc/officers/{officer_id}/assign) → visit created
7. Officer logs in, GET /officer/visits → visit visible
8. Officer starts visit (PUT /visits/{visit_id}/start) with GPS → status=IN_PROGRESS
9. Officer completes inspection:
```json
{
  "actual_loss_pct": 45,
  "crop_condition": "SEVERE_DAMAGE",
  "weather_correlated": true,
  "gps_latitude": 12.9717,
  "gps_longitude": 77.5947,
  "remarks": "Confirmed severe drought damage across 2.5 hectares"
}
```
10. Satellite NDVI queried → drop of 0.35 confirmed
11. Fraud scoring triggered (Kafka event) → score=22 returned
12. System auto-approves claim

**Expected Results:**
- Step 3: claim.status = "DRAFT", claim_number generated
- Step 5: claim.status = "SUBMITTED"
- Step 6: visit.status = "ASSIGNED", officer_id set
- Step 8: visit.status = "IN_PROGRESS", GPS saved
- Step 9: visit.status = "COMPLETED", claim.status = "UNDER_REVIEW"
- Step 11: fraud_scores record created with score=22, risk_level="LOW"
- Step 12: claim.status = "APPROVED", approved_amount = claim_amount
- DB: `SELECT status FROM claims WHERE id='{claim_id}'` → "APPROVED"
- Kafka: `decision.made` event with claim_id, decision="APPROVED"
- Notifications: farmer notification "Claim approved ₹50,000"
- Audit log: `action='AUTO_APPROVAL', claim_id='{claim_id}'`

**Failure Case:** Any step fails, claim status wrong, no notification, no audit log

---

### 21.2 Workflow 2: High-Fraud Claim (Auto-Reject)

**TC-ID:** E2E-002 | **Type:** E2E | **Priority:** P0

**Preconditions:**
- Farmer with 3 prior claims (1 approved, 2 rejected)
- Active policy: sum_insured=50000
- C++ engine configured to return score=87
- IMD data: no rainfall on claimed loss_date
- NDVI shows no significant drop

**Test Steps:**
1. Farmer submits flood claim with amount=125000 (2.5x insured)
2. Claim includes GPS same as 2 other claims from different farmers
3. Officer inspection: actual_loss_pct=20, farmer claimed 90%
4. IMD check: no rainfall on loss_date
5. NDVI: no drop (crop healthy)
6. Fraud scoring → score=87

**Expected Results:**
- claim.status = "REJECTED"
- fraud_scores.score = 87, risk_level = "CRITICAL"
- fraud_flag = true
- Notifications: fraud analyst + insurer alerted
- Audit log: action="AUTO_REJECT", score=87
- Kafka: `decision.made` with decision="REJECTED"

**Failure Case:** Claim approved despite score=87, or no alerts sent

---

### 21.3 Workflow 3: Medium-Risk Claim (Manual Review)

**TC-ID:** E2E-003 | **Type:** E2E | **Priority:** P0

**Preconditions:**
- Farmer with 1 prior approved claim
- Hail damage claim
- NDVI shows moderate drop (ambiguous)
- C++ engine configured to return score=48

**Test Steps:**
1. Farmer submits hail claim
2. NDVI queried → moderate drop of 0.20
3. Fraud scoring → score=48
4. Claim routed to DC reviewer queue
5. Reviewer views claim + fraud explanation panel
6. Reviewer approves with reduced amount

**Expected Results:**
- claim.status = "UNDER_REVIEW" (after scoring)
- fraud_scores.score = 48, risk_level = "MEDIUM"
- Reviewer sees top 5 fraud factors
- After approval: claim.status = "APPROVED", reviewer_id set
- review_notes saved
- Notification sent to farmer

---

### 21.4 Workflow 4: Appeal After Rejection

**TC-ID:** E2E-004 | **Type:** E2E | **Priority:** P0

**Preconditions:**
- Rejected claim (score=35, medium)

**Test Steps:**
1. Farmer submits appeal with additional evidence
2. Appeal assigned to senior reviewer
3. Senior reviewer reviews + additional evidence
4. Senior reviewer overrides → approves

**Expected Results:**
- claim.status = "APPROVED"
- appeal_status = "APPROVED"
- override_by = senior_reviewer_id
- Audit log: action="APPEAL_APPROVED"

---

### 21.5 Workflow 5: State Adapter (Maharashtra)

**TC-ID:** E2E-005 | **Type:** E2E | **Priority:** P0

**Preconditions:**
- Farmer from Maharashtra
- Maharashtra adapter configured: min_photos=3

**Test Steps:**
1. Farmer submits claim with 2 photos
2. System validates Maharashtra rules

**Expected Results:**
- Step 1: 400, "Minimum 3 photos required for Maharashtra claims"
- Step 2 (after 3rd photo): Claim proceeds normally

---

### 21.6 Workflow 6: Offline Inspection Sync

**TC-ID:** E2E-006 | **Type:** E2E | **Priority:** P1

**Preconditions:**
- Officer assigned to low-connectivity area
- Offline mode conceptual test

**Test Steps:**
1. Officer starts inspection offline
2. Data stored locally
3. Officer regains connectivity
4. Sync to server

**Expected Results:**
- All inspection data matches local capture
- GPS preserved
- No data loss

---

## MODULE 22: EDGE CASES AND BOUNDARY TESTS

### 22.1 Test Case Table

| TC-ID | Title | Type | Priority | Steps Summary | Expected Result |
|---|---|---|---|---|---|
| EDGE-001 | affected_area = exactly insured_area | API | P0 | area=3.0, insured=3.0 | Allowed, 201 |
| EDGE-002 | affected_area = 0.0 → 400 | API | P0 | area=0.0 | 400 |
| EDGE-003 | loss_percentage = 0.0 | API | P1 | loss_pct=0 | Valid |
| EDGE-004 | loss_percentage = 100.0 | API | P1 | loss_pct=100 | Valid |
| EDGE-005 | loss_percentage = 100.01 → 400 | API | P0 | loss_pct=100.01 | 400 |
| EDGE-006 | claim_amount = 0.0 → 400 | API | P0 | amount=0 | 400 |
| EDGE-007 | sum_insured = 0.0 → 400 | API | P0 | insured=0 | 400 |
| EDGE-008 | Farmer name empty string → 400 | API | P0 | name="" | 400 |
| EDGE-009 | Farmer name = null → 400 | API | P0 | name=null | 400 |
| EDGE-010 | NDVI = 0.0 | API | P1 | NDVI=0 | Valid |
| EDGE-011 | NDVI = 1.0 | API | P1 | NDVI=1 | Valid |
| EDGE-012 | NDVI = 1.01 → clamped | API | P1 | NDVI=1.01 | Clamped to 1.0 |
| EDGE-013 | Score = exactly 30 → auto-approve | ML | P0 | Score=30 | APPROVED |
| EDGE-014 | Score = exactly 31 → manual review | ML | P0 | Score=31 | UNDER_REVIEW |
| EDGE-015 | Score = exactly 60 → manual review | ML | P0 | Score=60 | UNDER_REVIEW |
| EDGE-016 | Score = exactly 61 → field visit | ML | P0 | Score=61 | CCE_VISIT |
| EDGE-017 | Score = exactly 80 → field visit | ML | P0 | Score=80 | CCE_VISIT |
| EDGE-018 | Score = exactly 81 → auto-reject | ML | P0 | Score=81 | REJECTED |
| EDGE-019 | User with 0 claims → no penalty | ML | P1 | First-time farmer | historical_score=0 |
| EDGE-020 | Photo with no GPS → stored | API | P1 | Upload no-GPS photo | gps_available=false |
| EDGE-021 | Kafka missing field → DLQ | Integration | P0 | Event with missing field | DLQ, no crash |
| EDGE-022 | Redis down → scoring works | Integration | P0 | Stop Redis | Scoring computes fresh |
| EDGE-023 | PG pool exhausted → 503 | Integration | P0 | Max out connections | 503, Retry-After |
| EDGE-024 | Unicode filename → UUID | API | P1 | Upload 日本語.jpg | Stored as UUID |
| EDGE-025 | 10000 char description → stored | API | P1 | 10000 chars | Stored successfully |
| EDGE-026 | Leap year date Feb 29 | API | P1 | loss_date: 2024-02-29 | Handled correctly |
| EDGE-027 | Timestamps in UTC, display IST | E2E | P1 | Create claim at 10:00 UTC | DB: 10:00 UTC, UI: 15:30 IST |

---

## APPENDIX A: PYTEST FILE STRUCTURE (Backend)

```
tests/
├── conftest.py                    # Shared fixtures, DB setup, auth helpers
├── __init__.py
├── unit/
│   ├── test_auth_service.py       # Password hashing, JWT generation, OTP logic
│   ├── test_fraud_engine.py       # Feature computation, score calculation
│   ├── test_scoring_pipeline.py   # Input assembly, output parsing
│   └── test_utils.py              # Helpers, validators, formatters
├── integration/
│   ├── test_auth_flow.py          # Registration → OTP → Login → 2FA
│   ├── test_claim_lifecycle.py    # Submit → inspect → score → decide
│   ├── test_kafka_pipeline.py     # Event publish → consume → DLQ
│   ├── test_state_adapter.py      # Adapter loading, caching, rule enforcement
│   └── test_fraud_scoring_e2e.py  # Full scoring with C++ engine
├── api/
│   ├── test_auth_endpoints.py     # All AUTH module test cases
│   ├── test_user_endpoints.py     # All USER module test cases
│   ├── test_farmer_endpoints.py   # FARMER, POLICY modules
│   ├── test_claim_endpoints.py    # CLAIM module
│   ├── test_officer_endpoints.py  # INSPECTION module
│   ├── test_fraud_endpoints.py    # FRAUD module
│   ├── test_satellite_endpoints.py # SAT, WEATHER modules
│   ├── test_review_endpoints.py   # DECISION module
│   ├── test_notification_endpoints.py # NOTIFY module
│   ├── test_admin_endpoints.py    # ADMIN module
│   └── test_evidence_endpoints.py # EVID module
├── e2e/
│   ├── test_workflow_auto_approve.py
│   ├── test_workflow_auto_reject.py
│   ├── test_workflow_manual_review.py
│   ├── test_workflow_appeal.py
│   ├── test_workflow_state_adapter.py
│   └── test_workflow_offline_sync.py
├── security/
│   ├── test_sql_injection.py
│   ├── test_xss_prevention.py
│   ├── test_jwt_security.py
│   ├── test_csrf_protection.py
│   ├── test_file_upload_security.py
│   └── test_idor_prevention.py
├── performance/
│   ├── test_latency.py            # p95 checks
│   └── test_throughput.py         # Concurrent load
└── fixtures/
    ├── users.json
    ├── policies.json
    ├── claims.json
    └── inspections.json
```

---

## APPENDIX B: PLAYWRIGHT/CYPRESS FILE STRUCTURE (Frontend E2E)

```
e2e/
├── playwright.config.ts           # Config: baseURL, workers, retries, projects
├── cypress.config.ts              # Alternative Cypress config
├── support/
│   ├── commands.ts                # Custom commands: loginAs(role), createClaim()
│   ├── e2e.ts                     # Global setup, beforeEach auth state
│   └── selectors.ts               # Centralized CSS selectors
├── fixtures/
│   ├── users.json                 # Test user credentials
│   ├── claims.json                # Sample claim data
│   └── photos/                    # Test image files
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   ├── register.spec.ts
│   │   ├── 2fa.spec.ts
│   │   └── logout.spec.ts
│   ├── farmer/
│   │   ├── dashboard.spec.ts
│   │   ├── profile.spec.ts
│   │   ├── submit-claim.spec.ts
│   │   └── claim-detail.spec.ts
│   ├── officer/
│   │   ├── dashboard.spec.ts
│   │   ├── inspection.spec.ts
│   │   └── visit-detail.spec.ts
│   ├── reviewer/
│   │   ├── queue.spec.ts
│   │   ├── fraud-panel.spec.ts
│   │   └── decision.spec.ts
│   ├── admin/
│   │   ├── users.spec.ts
│   │   ├── system-health.spec.ts
│   │   └── audit-logs.spec.ts
│   ├── insurer/
│   │   ├── policies.spec.ts
│   │   └── claims.spec.ts
│   ├── workflows/
│   │   ├── auto-approve.spec.ts
│   │   ├── auto-reject.spec.ts
│   │   └── manual-review.spec.ts
│   ├── security/
│   │   ├── xss-prevention.spec.ts
│   │   └── access-control.spec.ts
│   └── responsive/
│       ├── mobile-navigation.spec.ts
│       └── tablet-layout.spec.ts
└── utils/
    ├── api-helpers.ts             # Direct API calls for setup
    ├── auth-helper.ts           # JWT manipulation, token storage
    └── test-data.ts             # Factories for generating test data
```

---

## APPENDIX C: K6 PERFORMANCE TEST SCRIPT OUTLINE

```javascript
// tests/performance/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const loginLatency = new Trend('login_latency');
const claimLatency = new Trend('claim_latency');

export const options = {
  scenarios: {
    // Phase 1: Smoke
    smoke: {
      executor: 'shared-iterations',
      vus: 1,
      iterations: 10,
      maxDuration: '1m',
    },
    // Phase 2: Ramp
    ramp: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '5m', target: 500 },   // Ramp up
        { duration: '30m', target: 500 },  // Sustained
        { duration: '5m', target: 0 },     // Ramp down
      ],
      gracefulRampDown: '30s',
    },
    // Phase 3: Spike
    spike: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '10s', target: 1000 },
        { duration: '1m', target: 1000 },
        { duration: '10s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'],      // 95% under 500ms
    http_req_failed: ['rate<0.001'],       // Error rate < 0.1%
    errors: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

export function setup() {
  // Create test users, policies, claims via API
  const farmer = createTestFarmer();
  const policy = createTestPolicy(farmer.id);
  return { farmer, policy, token: farmer.token };
}

export default function (data) {
  // Test 1: Farmer OTP Login Flow
  const loginStart = Date.now();
  // Step 1: Request OTP
  http.post(`${BASE_URL}/api/v1/farmer/login`, JSON.stringify({
    mobile: data.farmer.mobile,
  }), { headers: { 'Content-Type': 'application/json' } });
  // Step 2: Verify OTP
  const loginRes = http.post(`${BASE_URL}/api/v1/farmer/verify-otp`, JSON.stringify({
    mobile: data.farmer.mobile,
    otp: '123456',
  }), { headers: { 'Content-Type': 'application/json' } });
  loginLatency.add(Date.now() - loginStart);
  check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns token': (r) => r.json('data.access_token') !== undefined,
  }) || errorRate.add(1);

  // Test 2: Submit Claim
  const claimStart = Date.now();
  const claimRes = http.post(`${BASE_URL}/api/v1/farmer/claims`, JSON.stringify({
    policy_id: data.policy.id,
    loss_type: 'DROUGHT',
    loss_date: '2026-03-15',
    affected_area: 2.5,
    claim_amount: 50000,
    description: 'Severe drought damage across insured plot',
  }), { headers: { 'Authorization': `Bearer ${data.token}`, 'Content-Type': 'application/json' } });
  claimLatency.add(Date.now() - claimStart);
  check(claimRes, {
    'claim status is 201': (r) => r.status === 201,
    'claim has id': (r) => r.json('data.id') !== undefined,
  }) || errorRate.add(1);

  // Test 3: Get Claims
  const getRes = http.get(`${BASE_URL}/api/v1/farmer/claims?page=1&limit=20`, {
    headers: { 'Authorization': `Bearer ${data.token}` },
  });
  check(getRes, {
    'get claims is 200': (r) => r.status === 200,
    'get claims has items': (r) => Array.isArray(r.json('data.items')),
  }) || errorRate.add(1);

  sleep(Math.random() * 3 + 1); // 1-4s think time
}

export function teardown(data) {
  // Cleanup: delete test users, claims, policies
  cleanupTestData(data);
}
```

---

## APPENDIX D: TEST EXECUTION MATRIX

| Phase | When | Tests | Duration | Target |
|---|---|---|---|---|
| Pre-commit | Every commit | Smoke (10 tests) | < 2 min | 100% pass |
| PR Gate | Every PR | All P0 + critical P1 (150 tests) | < 15 min | 100% pass |
| Nightly | Daily 2 AM | All P0 + P1 + P2 (342 tests) | < 60 min | 100% pass |
| Weekly | Sunday | All + Performance + Security | < 4 hours | 100% pass |
| Release | Before deploy | Full regression + E2E workflows | < 6 hours | 100% pass |

---

## APPENDIX E: ENVIRONMENT SETUP FOR TESTING

```bash
# Run migrations
psql -U bhuvigyan -d bhuvigyan -f migrations/001_init.sql
psql -U bhuvigyan -d bhuvigyan -f migrations/002_seed.sql
psql -U bhuvigyan -d bhuvigyan -f migrations/003_fraud.sql

# Start services
docker-compose up -d postgres redis kafka zookeeper

# Run backend tests
pytest tests/ -v --cov=src --cov-report=html

# Run frontend E2E
npx playwright test

# Run performance tests
k6 run tests/performance/load-test.js

# Run security scans
nuclei -u http://localhost:5000 -t security-templates/
```

---

**END OF TEST SPECIFICATION**
