const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REPORT_DIR = path.join('perf-report');
const BASELINE_FILE = path.join(REPORT_DIR, 'bundle-baseline.json');
const DIST_DIR = path.join('dist', 'assets');
const BUNDLE_BUDGETS = { totalJSGzipped: 450 * 1024, maxChunkSize: 200 * 1024, chunkGrowthThreshold: 0.10 };

function ensureDirectoryExists(p) { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); }
function getGzippedSize(filePath) { const buf = fs.readFileSync(filePath); return zlib.gzipSync(buf).length; }

function analyzeBundleSize() {
  if (!fs.existsSync(DIST_DIR)) { console.error('dist/assets not found'); process.exit(1); }
  const files = fs.readdirSync(DIST_DIR).filter((f) => f.endsWith('.js'));
  const currentSizes = {};
  let totalJSSize = 0;
  let totalJSGzipped = 0;

  files.forEach((f) => {
    const filePath = path.join(DIST_DIR, f);
    const stats = fs.statSync(filePath);
    const gz = getGzippedSize(filePath);
    currentSizes[f] = { raw: stats.size, gzipped: gz };
    totalJSSize += stats.size;
    totalJSGzipped += gz;
  });

  const currentReport = { timestamp: new Date().toISOString(), totalJSSize, totalJSGzipped, files: currentSizes };
  ensureDirectoryExists(REPORT_DIR);

  let baseline = null;
  if (fs.existsSync(BASELINE_FILE)) {
    try { baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8')); } catch {}
  }

  const budgetViolations = [];
  const regressions = [];

  if (totalJSGzipped > BUNDLE_BUDGETS.totalJSGzipped) {
    budgetViolations.push({ type: 'total-size', current: totalJSGzipped, budget: BUNDLE_BUDGETS.totalJSGzipped, overage: totalJSGzipped - BUNDLE_BUDGETS.totalJSGzipped });
  }

  Object.entries(currentSizes).forEach(([file, sizes]) => {
    if (sizes.gzipped > BUNDLE_BUDGETS.maxChunkSize) {
      budgetViolations.push({ type: 'chunk-size', file, current: sizes.gzipped, budget: BUNDLE_BUDGETS.maxChunkSize, overage: sizes.gzipped - BUNDLE_BUDGETS.maxChunkSize });
    }
    if (baseline && baseline.files && baseline.files[file]) {
      const base = baseline.files[file].gzipped;
      if (base > 0) {
        const growth = (sizes.gzipped - base) / base;
        if (growth > BUNDLE_BUDGETS.chunkGrowthThreshold) {
          regressions.push({ file, baseline: base, current: sizes.gzipped, growth, growthBytes: sizes.gzipped - base });
        }
      }
    }
  });

  fs.writeFileSync(path.join(REPORT_DIR, 'bundle-report.json'), JSON.stringify(currentReport, null, 2));

  const shouldApprove = process.argv.includes('--approve-budgets');
  if (shouldApprove) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(currentReport, null, 2));
    console.log('baseline-updated');
    process.exit(0);
  }

  let fail = false;
  if (budgetViolations.length) fail = true;
  if (regressions.length) fail = true;

  console.log(JSON.stringify({ totalJSGzipped, budgetViolations, regressions, baselineExists: !!baseline }, null, 2));
  if (fail) process.exit(1);
}

if (require.main === module) analyzeBundleSize();
module.exports = { analyzeBundleSize };