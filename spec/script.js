import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics';

export const requests = new Counter('http_reqs');

export const options = {
  vus: 100,
  duration: '15s',
};

const randomNumber = (max, min) => (
  Math.floor(Math.random() * (max - 1 + min) + min)
);

let count = randomNumber(100000, 1);
const url = `http://localhost:3000/api/reviews?product_id=${count}`;

export default function () {
  const res = http.get(url);
  sleep(1);
  check(res, {
    'status was 200': (r) => r.status === 200,
    'transaction time < 200ms': (r) => r.timings.duration < 200,
    'transaction time < 500ms': (r) => r.timings.duration < 500,
    'transaction time < 1000ms': (r) => r.timings.duration < 1000,
    'transaction time < 2000ms': (r) => r.timings.duration < 2000,
  });
  count = randomNumber(100000, 1);
}