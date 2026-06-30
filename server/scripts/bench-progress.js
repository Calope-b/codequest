// server/scripts/bench-progress.js
// Measures the feedback latency that NFR-P2 governs: the round-trip from
// the client issuing "record this attempt" to the API confirming it is
// stored. This is the latency the student experiences as feedback, and it
// is independent of the in-game animation, which is intentionally
// O(actions x ~200 ms) and is NOT what NFR-P2 measures (see runner.js and
// the report's performance section).
//
// What it exercises, end to end over loopback HTTP, is the full request
// path the browser hits on every Run:
//   express.json() body parse -> verifyToken (JWT verify) -> requireRole
//   -> controller validation -> Attempt.create (INSERT) -> 201 JSON.
//
// It runs against the test database, reusing the same .env.test guard as
// the Jest suite so it can never touch dev data. Start Postgres first:
//   docker compose up -d         (or a local cluster on codequest_test)
// then:
//   node scripts/bench-progress.js [iterations]
//
// Output is a small table of percentiles for POST (attempt recording) and
// GET (the progress summary the dashboard loads), plus the cold first
// request reported separately since it includes connection setup.

const path = require('path');
const fs = require('fs');

// Load .env.test before anything requires the db pool, exactly like the
// Jest setup does, and refuse to run against any other database.
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.test') });
if (process.env.DB_NAME !== 'codequest_test') {
  throw new Error(
    `Benchmark must run against codequest_test, got "${process.env.DB_NAME}". ` +
    `Check .env.test is being loaded.`
  );
}
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/index');
const db = require('../src/config/db');

const ITERATIONS = parseInt(process.argv[2], 10) || 300;
const WARMUP = 20;
const BUDGET_MS = 2000; // NFR-P2 ceiling

// Percentiles from a list of millisecond samples.
function stats(samples) {
  const sorted = [...samples].sort((a, b) => a - b);
  const at = (p) => sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
  const sum = sorted.reduce((a, b) => a + b, 0);
  return {
    n: sorted.length,
    min: sorted[0],
    median: at(50),
    mean: sum / sorted.length,
    p95: at(95),
    p99: at(99),
    max: sorted[sorted.length - 1],
  };
}

function fmt(ms) {
  return `${ms.toFixed(2)} ms`;
}

function printRow(label, s) {
  console.log(
    `${label.padEnd(22)} n=${String(s.n).padStart(4)}  ` +
    `min=${fmt(s.min).padStart(9)}  median=${fmt(s.median).padStart(9)}  ` +
    `mean=${fmt(s.mean).padStart(9)}  p95=${fmt(s.p95).padStart(9)}  ` +
    `p99=${fmt(s.p99).padStart(9)}  max=${fmt(s.max).padStart(9)}`
  );
}

// Builds a self-contained SVG figure from the current run: a log-scale
// comparison of the measured round-trips against the two-second budget,
// and a histogram of the POST sample distribution. No dependencies, so it
// is reproducible anywhere the benchmark runs, and it always reflects the
// run that produced it rather than any hard-coded number.
function buildSvg({ post, get, postSamples, budgetMs, iterations, node, db }) {
  const W = 940;
  const H = 660;
  const C = {
    text: '#1f2937', sub: '#6b7280', grid: '#e8eaed',
    post: '#2f6f9f', get: '#9aa6b2', budget: '#c0392b', bar: '#3b82c4',
  };
  const F = `font-family="Segoe UI, Helvetica, Arial, sans-serif"`;
  const out = [];
  const r2 = (x) => Math.round(x * 100) / 100;

  out.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" font-size="13" fill="${C.text}">`);
  out.push(`<rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff"/>`);

  // ---------- Panel 1: log-scale latency vs budget ----------
  out.push(`<text x="40" y="34" ${F} font-size="17" font-weight="600">Feedback round-trip latency against the NFR-P2 budget</text>`);
  out.push(`<text x="40" y="54" ${F} font-size="12" fill="${C.sub}">Log scale. Each marker is a measured percentile of the API round-trip; the animated in-game replay is excluded by design.</text>`);

  const x0 = 170, x1 = 900, plotW = x1 - x0;
  const logMax = Math.log10(3000);
  const lx = (v) => x0 + (Math.log10(Math.max(1, Math.min(3000, v))) / logMax) * plotW;

  // vertical gridlines + tick labels
  for (const t of [1, 10, 100, 1000]) {
    const x = lx(t);
    out.push(`<line x1="${r2(x)}" y1="78" x2="${r2(x)}" y2="250" stroke="${C.grid}" stroke-width="1"/>`);
    out.push(`<text x="${r2(x)}" y="268" ${F} font-size="11" fill="${C.sub}" text-anchor="middle">${t} ms</text>`);
  }

  // budget line
  const bx = lx(budgetMs);
  out.push(`<line x1="${r2(bx)}" y1="74" x2="${r2(bx)}" y2="252" stroke="${C.budget}" stroke-width="2" stroke-dasharray="6 4"/>`);
  out.push(`<text x="${r2(bx - 10)}" y="90" ${F} font-size="12" font-weight="600" fill="${C.budget}" text-anchor="end">NFR-P2 budget = ${budgetMs} ms</text>`);

  // lollipop rows
  const rows = [
    { label: 'POST /progress  median', v: post.median, c: C.post },
    { label: 'POST /progress  p95', v: post.p95, c: C.post },
    { label: 'POST /progress  max', v: post.max, c: C.post },
    { label: 'GET /progress  median', v: get.median, c: C.get },
  ];
  let ry = 110;
  for (const row of rows) {
    const x = lx(row.v);
    out.push(`<text x="${x0 - 14}" y="${ry + 4}" ${F} font-size="12" text-anchor="end">${row.label}</text>`);
    out.push(`<line x1="${x0}" y1="${ry}" x2="${r2(x)}" y2="${ry}" stroke="${row.c}" stroke-width="3"/>`);
    out.push(`<circle cx="${r2(x)}" cy="${ry}" r="5" fill="${row.c}"/>`);
    out.push(`<text x="${r2(x + 11)}" y="${ry + 4}" ${F} font-size="12" font-weight="600" fill="${row.c}">${fmt(row.v)}</text>`);
    ry += 36;
  }

  // ---------- Panel 2: POST distribution histogram ----------
  out.push(`<text x="40" y="330" ${F} font-size="17" font-weight="600">Distribution of POST /progress latency (n = ${iterations})</text>`);

  const hx0 = 90, hx1 = 900, hplotW = hx1 - hx0;
  const hy0 = 360, hy1 = 600, hplotH = hy1 - hy0;
  const maxX = Math.max(10, Math.ceil(post.max / 5) * 5);
  const nbins = 30, binW = maxX / nbins;
  const counts = new Array(nbins).fill(0);
  for (const v of postSamples) counts[Math.min(nbins - 1, Math.floor(v / binW))]++;
  const maxCount = Math.max(1, ...counts);
  const px = (v) => hx0 + (v / maxX) * hplotW;

  // y gridlines + count labels
  for (let i = 0; i <= 4; i++) {
    const c = Math.round((maxCount * i) / 4);
    const y = hy1 - (i / 4) * hplotH;
    out.push(`<line x1="${hx0}" y1="${r2(y)}" x2="${hx1}" y2="${r2(y)}" stroke="${C.grid}" stroke-width="1"/>`);
    out.push(`<text x="${hx0 - 10}" y="${r2(y + 4)}" ${F} font-size="11" fill="${C.sub}" text-anchor="end">${c}</text>`);
  }

  // bars
  const barW = hplotW / nbins;
  for (let i = 0; i < nbins; i++) {
    if (!counts[i]) continue;
    const h = (counts[i] / maxCount) * hplotH;
    out.push(`<rect x="${r2(hx0 + i * barW)}" y="${r2(hy1 - h)}" width="${r2(barW - 1.5)}" height="${r2(h)}" fill="${C.bar}" opacity="0.85"/>`);
  }

  // x ticks
  for (let i = 0; i <= 6; i++) {
    const v = (maxX * i) / 6;
    out.push(`<text x="${r2(px(v))}" y="${hy1 + 18}" ${F} font-size="11" fill="${C.sub}" text-anchor="middle">${r2(v)}</text>`);
  }
  out.push(`<text x="${r2((hx0 + hx1) / 2)}" y="${hy1 + 38}" ${F} font-size="12" fill="${C.sub}" text-anchor="middle">latency (ms)</text>`);

  // median + p95 markers, anchored on opposite sides so close values don't collide
  const markers = [
    { v: post.median, t: 'median', anchor: 'end', dx: -5 },
    { v: post.p95, t: 'p95', anchor: 'start', dx: 5 },
  ];
  for (const m of markers) {
    const x = px(Math.min(maxX, m.v));
    out.push(`<line x1="${r2(x)}" y1="${hy0 - 6}" x2="${r2(x)}" y2="${hy1}" stroke="${C.budget}" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    out.push(`<text x="${r2(x + m.dx)}" y="${hy0 - 10}" ${F} font-size="11" font-weight="600" fill="${C.budget}" text-anchor="${m.anchor}">${m.t} ${fmt(m.v)}</text>`);
  }

  // provenance footer
  out.push(`<text x="40" y="${H - 14}" ${F} font-size="11" fill="${C.sub}">Node ${node} · ${iterations} sequential requests · loopback HTTP · ${db}</text>`);

  out.push(`</svg>`);
  return out.join('\n');
}


async function main() {
  // Fresh student. We register over the API so the token is minted exactly
  // as in production (no shortcut), then reuse it for every timed call.
  await db.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ email: 'bench-student@test.com', password: 'password123', role: 'student' });
  const token = reg.body.token;
  if (!token) throw new Error('Could not obtain a student token');

  // Cold first request: includes first-connection and JIT warm-up, so we
  // report it on its own rather than letting it skew the steady-state.
  const cold0 = process.hrtime.bigint();
  await request(app)
    .post('/api/students/progress')
    .set('Authorization', `Bearer ${token}`)
    .send({ questId: 'quest_001', completed: false });
  const coldMs = Number(process.hrtime.bigint() - cold0) / 1e6;

  // Warm up before timing the steady state.
  for (let i = 0; i < WARMUP; i++) {
    await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ questId: 'quest_001', completed: false });
  }

  // Timed POST loop: record an attempt, the call the dashboard makes on
  // every Run. Sequential, because the client fires them one per run.
  const postSamples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = process.hrtime.bigint();
    const res = await request(app)
      .post('/api/students/progress')
      .set('Authorization', `Bearer ${token}`)
      .send({ questId: 'quest_001', completed: i % 2 === 0 });
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (res.status !== 201) throw new Error(`POST returned ${res.status}`);
    postSamples.push(ms);
  }

  // Timed GET loop: the progress summary the dashboard loads to mark which
  // quests are done. Same auth path, an aggregate read instead of a write.
  const getSamples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = process.hrtime.bigint();
    const res = await request(app)
      .get('/api/students/progress')
      .set('Authorization', `Bearer ${token}`);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (res.status !== 200) throw new Error(`GET returned ${res.status}`);
    getSamples.push(ms);
  }

  const postS = stats(postSamples);
  const getS = stats(getSamples);

  console.log('');
  console.log(`NFR-P2 feedback-latency benchmark  (Node ${process.version}, loopback HTTP)`);
  console.log(`Database: ${process.env.DB_NAME}  |  iterations: ${ITERATIONS}  |  warmup: ${WARMUP}`);
  console.log('-'.repeat(118));
  printRow('POST /progress (write)', postS);
  printRow('GET  /progress (read)', getS);
  console.log('-'.repeat(118));
  console.log(`Cold first POST (incl. connection setup): ${fmt(coldMs)}`);
  console.log(`NFR-P2 target: < ${BUDGET_MS} ms. Animated in-game replay is excluded by design (O(actions x ~200 ms)).`);

  // Write the raw results and a self-contained SVG figure next to the
  // server package, so the chart always reflects the run that produced it.
  const outDir = path.resolve(__dirname, '..');
  const jsonPath = path.join(outDir, 'bench-results.json');
  const svgPath = path.join(outDir, 'bench-progress.svg');
  fs.writeFileSync(jsonPath, JSON.stringify({
    node: process.version,
    database: process.env.DB_NAME,
    iterations: ITERATIONS,
    warmup: WARMUP,
    budgetMs: BUDGET_MS,
    coldFirstPostMs: coldMs,
    post: postS,
    get: getS,
    postSamples,
    getSamples,
  }, null, 2));
  fs.writeFileSync(svgPath, buildSvg({
    post: postS,
    get: getS,
    postSamples,
    budgetMs: BUDGET_MS,
    iterations: ITERATIONS,
    node: process.version,
    db: process.env.DB_NAME,
  }));
  console.log(`\nWrote ${path.relative(process.cwd(), jsonPath)} and ${path.relative(process.cwd(), svgPath)}`);
  console.log('');

  await db.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});