"""
Bhuvigyan V7 — Security Penetration Tests (SEC-001 to SEC-020)
"""
import pytest


class TestSqlInjection:
    """SEC-001: SQL injection in text input fields."""

    @pytest.mark.asyncio
    async def test_farmer_login_sql_injection(self, client):
        payload = "'; DROP TABLE farmers; --"
        res = await client.post("/api/v1/farmer/login", json={
            "mobile": payload
        })
        assert res.status_code in [200, 400, 422, 404], f"Server crashed with {res.status_code}"
        assert "DROP" not in res.text


class TestXSS:
    """SEC-002: XSS in claim description."""

    @pytest.mark.asyncio
    async def test_claim_description_xss(self, client, auth_headers):
        res = await client.post("/api/v1/claims", json={
            "policyId": "test-policy",
            "lossType": "DROUGHT",
            "lossDate": "2024-08-15",
            "affectedArea": 2.5,
            "claimAmount": 45000,
            "description": "<script>alert('xss')</script>",
        }, headers=auth_headers)
        assert res.status_code in [201, 400, 422]


class TestIDOR:
    """SEC-004: IDOR via UUID."""

    @pytest.mark.asyncio
    async def test_farmer_cannot_access_other_claim(self, client, auth_headers):
        other_claim_id = "12345678-1234-1234-1234-123456789abc"
        res = await client.get(f"/api/v1/claims/{other_claim_id}", headers=auth_headers)
        assert res.status_code in [403, 404]


class TestRateLimiting:
    """SEC-009, SEC-010: Rate limiting and brute force."""

    @pytest.mark.asyncio
    async def test_repeated_requests_handled(self, client):
        # Send multiple requests to login with invalid mobile
        for _ in range(5):
            res = await client.post("/api/v1/farmer/login", json={"mobile": "9900000099"})
            assert res.status_code in [200, 404, 429, 422]


class TestApiKeyLeakage:
    """SEC-020: No secrets leaked in responses."""

    @pytest.mark.asyncio
    async def test_no_secrets_in_error_response(self, client):
        res = await client.get("/api/v1/nonexistent-endpoint")
        body = res.text.lower()
        assert "secret" not in body
        assert "api_key" not in body
        assert "password" not in body
