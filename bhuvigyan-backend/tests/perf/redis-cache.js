// tests/perf/redis-cache.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<50'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const res1 = http.get(`${BASE_URL}/api/v1/satellite/ndvi?lat=20.6880&lng=77.7210&start=2024-06-01&end=2024-10-31`);
  check(res1, { 'ndvi status 200': (r) => r.status === 200 });

  const start = Date.now();
  const res2 = http.get(`${BASE_URL}/api/v1/satellite/ndvi?lat=20.6880&lng=77.7210&start=2024-06-01&end=2024-10-31`);
  const duration = Date.now() - start;

  check(res2, {
    'cache hit status 200': (r) => r.status === 200,
    'cache hit fast': () => duration < 100,
  });
  sleep(0.5);
}
