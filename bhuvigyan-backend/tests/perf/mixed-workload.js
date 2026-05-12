// tests/perf/mixed-workload.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '20m', target: 500 },
    { duration: '2m', target: 100 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.001'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

function login() {
  const res = http.post(`${BASE_URL}/api/v1/farmer/login`, JSON.stringify({ mobile: '9900000001' }), { headers: { 'Content-Type': 'application/json' } });
  check(res, { 'login status 200': (r) => r.status === 200 });
}

function submitClaim(token) {
  const payload = {
    policyId: 'policy-1',
    lossType: 'DROUGHT',
    lossDate: '2024-08-15',
    affectedArea: 2.5,
    claimAmount: 45000,
    description: 'Drought damage observed across insured plot. Crop completely dried.',
  };
  const res = http.post(`${BASE_URL}/api/v1/farmer/claims`, JSON.stringify(payload), { headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
  check(res, { 'claim submit 201': (r) => r.status === 201 });
}

function getClaims(token) {
  const res = http.get(`${BASE_URL}/api/v1/farmer/claims`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(res, { 'get claims 200': (r) => r.status === 200 });
}

function getNdvi() {
  const res = http.get(`${BASE_URL}/api/v1/satellite/ndvi?lat=20.6880&lng=77.7210&start=2024-06-01&end=2024-10-31`);
  check(res, { 'ndvi 200': (r) => r.status === 200 });
}

function getScore() {
  const res = http.get(`${BASE_URL}/api/v1/scoring/health`);
  check(res, { 'scoring health 200': (r) => r.status === 200 });
}

function adminAction(token) {
  const res = http.get(`${BASE_URL}/api/v1/admin/dashboard`, { headers: { 'Authorization': `Bearer ${token}` } });
  check(res, { 'admin 200': (r) => r.status === 200 });
}

export default function () {
  const rand = Math.random();
  if (rand < 0.30) login();
  else if (rand < 0.50) submitClaim('test-token');
  else if (rand < 0.70) getClaims('test-token');
  else if (rand < 0.85) getNdvi();
  else if (rand < 0.95) getScore();
  else adminAction('test-token');
  sleep(1);
}
