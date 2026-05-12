// tests/perf/scoring-burst.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    scoring_burst: {
      executor: 'per-vu-iterations',
      vus: 100,
      iterations: 1,
      maxDuration: '15s',
    },
  },
  thresholds: {
    http_req_duration: ['max<10000', 'p(95)<2000'],
    http_req_failed: ['rate==0'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

const FEATURE_VECTOR = {
  claim_amount: 45000,
  sum_insured: 50000,
  loss_percentage: 60.0,
  officer_loss_pct: 58.0,
  ndvi_before: 0.62,
  ndvi_after: 0.28,
  historical_claims: 1,
  geo_cluster_claims: 1,
  weather_correlated: true,
  photo_count: 4,
  gps_verified: true,
  crop_season_match: true,
};

export default function () {
  const res = http.post(
    `${BASE_URL}/api/v1/scoring/compute`,
    JSON.stringify(FEATURE_VECTOR),
    { headers: { 'Content-Type': 'application/json' } }
  );
  check(res, {
    'status is 200': (r) => r.status === 200,
    'score present': (r) => r.json('data.score') !== undefined,
    'risk_level present': (r) => r.json('data.risk_level') !== undefined,
  });
}
