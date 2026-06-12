// lib/viewer.js

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const url = require('url');

function getPackageVersion(packageName) {
  try {
    return require(`${packageName}/package.json`).version;
  } catch (e) {
    return '';
  }
}

function getRuntimeEnvironment(projects = []) {
  return {
    os: `${os.type()} ${os.release()}`,
    browser: projects.join(', '),
    playwright: getPackageVersion('@playwright/test') || getPackageVersion('playwright'),
    node: process.versions.node,
  };
}

function getProjectPackageName(reportRoot) {
  try {
    const packagePath = path.join(path.resolve(reportRoot, '..'), 'package.json');
    if (!fs.existsSync(packagePath)) return '';

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return pkg.name || '';
  } catch (e) {
    return '';
  }
}

function createServer(options = {}) {
  const reportRoot = options.reportDir || path.join(process.cwd(), 'custom-report');
  const port = options.port || parseInt(process.env.PORT || '4173', 10);
  const packageRoot = path.resolve(__dirname, '..');
  const appPackageName = getProjectPackageName(reportRoot);

  const viewerHtml = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>testreport</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
      --font-sans:'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

      /* Brand */
      --color-amber:#F59E0B;
      --color-amber-light:#FEF3C7;
      --color-amber-dark:#D97706;

      /* Semantic */
      --color-success:#22C55E;
      --color-success-bg:#F0FDF4;
      --color-danger:#EF4444;
      --color-danger-bg:#FEF2F2;
      --color-warning:#F59E0B;
      --color-warning-bg:#FFF7ED;
      --color-info:#2563EB;
      --color-info-bg:#EFF6FF;
      --color-purple:#8B5CF6;
      --color-purple-bg:#F5F3FF;

      /* Neutrals */
      --color-bg-page:#F5F7FB;
      --color-bg-card:#FFFFFF;
      --color-bg-secondary:#F8FAFC;
      --color-border:#E5E7EB;
      --color-border-strong:#CBD5E1;
      --color-text-primary:#111827;
      --color-text-secondary:#475569;
      --color-text-muted:#94A3B8;

      /* Shadows */
      --shadow-sm:0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
      --shadow-md:0 10px 30px rgba(15,23,42,0.08);

      /* Radius */
      --radius-sm:6px;
      --radius-md:8px;
      --radius-lg:12px;
      --radius-xl:16px;

      --card-bg:var(--color-bg-card);
      --border:var(--color-border);
      --text:var(--color-text-primary);
      --muted:var(--color-text-secondary);
      --blue:var(--color-info);
      --soft:var(--color-info-bg);
      --card-accent:var(--color-amber);
      --card-accent-shadow:rgba(15,23,42,.08);
      --shadow:var(--shadow-md);
    }

    * { box-sizing:border-box; }

    html {
      overflow-x:hidden;
    }

    body {
      margin:0;
      font-family:var(--font-sans);
      background:var(--color-bg-page);
      color:var(--color-text-primary);
      font-size:14px;
      line-height:1.6;
      overflow-x:hidden;
    }

    header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      height:64px;
      padding:0 24px;
      border-bottom:1px solid var(--color-border);
      background:#FFFFFF;
      box-shadow:0 1px 8px rgba(15,23,42,.06);
      position:sticky;
      top:0;
      z-index:1000;
    }

    .brand {
      display:flex;
      align-items:center;
      gap:10px;
    }

    .brand-logo-wrapper {
      width:180px;
      height:48px;
      display:flex;
      align-items:center;
      justify-content:flex-start;
      overflow:visible;
      padding-left:0;
    }

    .brand-logo-wrapper img {
      height:48px;
      width:auto;
      display:block;
    }

    .top,
    .allure-title,
    .top .brand,
    .top h1,
    .brand h1 {
      display:none !important;
    }

    .mark {
      width:34px;
      height:34px;
      border-radius:10px;
      background:#ffc107;
      display:flex;
      flex-direction:column;
      justify-content:center;
      gap:3px;
      padding:9px 8px 9px 14px;
    }

    .mark span {
      display:block;
      width:16px;
      height:3px;
      border-radius:999px;
      background:#9a6a00;
      position:relative;
    }

    .mark span::before {
      content:"";
      position:absolute;
      left:-7px;
      top:-1px;
      width:4px;
      height:7px;
      border-right:2px solid #9a6a00;
      border-bottom:2px solid #9a6a00;
      transform:rotate(45deg);
    }

    .brand-logo-full {
      width:34px;
      height:34px;
      border-radius:10px;
      background:#F59E0B;
      display:flex;
      align-items:center;
      justify-content:center;
      object-fit:cover;
      object-position:left center;
    }

    .brand-fallback {
      display:flex;
      font-weight:700;
      font-size:18px;
      color:var(--color-text-primary);
    }

    /* Hide duplicate small title that appears in the report 'top' area */
    .top .brand h1 {
      display: none;
    }

    /* Do not show fallback text when we have our custom header */
    .brand-fallback {
      display: none !important;
    }

    /* removed .brand-title - logo-only header requested */

    .controls {
      display:flex;
      gap:8px;
      align-items:center;
    }

    select, button, input {
      font:inherit;
    }

    select, button {
      background:var(--soft);
      color:var(--text);
      border:1px solid var(--color-border);
      border-radius:999px;
      padding:8px 14px;
      cursor:pointer;
    }

    header .controls > label {
      font-size:13px;
      color:var(--color-text-secondary);
    }

    header .controls select {
      height:36px;
      border:1px solid var(--color-border);
      border-radius:var(--radius-md);
      padding:6px 32px 6px 12px;
      font-size:13px;
      background:var(--color-bg-secondary);
      color:var(--color-text-primary);
    }

    header .controls button {
      height:36px;
      border:1px solid var(--color-border);
      background:#FFFFFF;
      border-radius:var(--radius-md);
      padding:6px 14px;
      font-size:13px;
      font-weight:500;
      color:var(--color-text-primary);
      cursor:pointer;
    }

    main {
      display:grid;
      gap:18px;
      width:100%;
      max-width:1680px;
      margin:0 auto;
      padding:24px;
      background:transparent;
      border-radius:0;
      box-shadow:none;
    }

    .card,.allure-summary,.trend-card,.failure-card,.slowest-card,.export-card,.timeline-card,.comparison-card {
      min-width:0;
      background:var(--card-bg);
      border:1px solid var(--color-border);
      border-radius:14px;
      box-shadow:0 12px 28px rgba(15,23,42,.06);
      padding:20px;
    }

    .card:hover,.allure-summary:hover,.trend-card:hover,.failure-card:hover,.slowest-card:hover,.export-card:hover,.timeline-card:hover,.comparison-card:hover {
      border-color:var(--color-border-strong);
      box-shadow:0 16px 34px rgba(15,23,42,.08);
    }

    .allure-summary {
      min-height:170px;
      margin-bottom:16px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    .allure-title {
      font-size:20px;
      font-weight:700;
      letter-spacing:0;
    }

    .muted {
      color:var(--muted);
      font-size:13px;
    }

    .allure-count {
      font-size:44px;
      font-weight:700;
      text-align:center;
      line-height:1.1;
    }

    .allure-count span {
      display:block;
      font-size:13px;
      color:var(--muted);
      font-weight:400;
    }

    .allure-chart {
      width:132px;
      height:132px;
      border-radius:50%;
      display:grid;
      place-items:center;
      background:conic-gradient(
        var(--color-success) 0deg,
        var(--color-success) var(--passedDeg),
        var(--color-danger) var(--passedDeg),
        var(--color-danger) var(--failedDeg),
        var(--color-amber) var(--failedDeg),
        var(--color-amber) var(--skippedDeg),
        var(--color-purple) var(--skippedDeg),
        var(--color-purple) var(--flakyDeg),
        var(--color-border) var(--flakyDeg),
        var(--color-border) 360deg
      );
      position:relative;
      border:1px solid rgba(15,23,42,.06);
      box-shadow:0 18px 34px rgba(15,23,42,.12);
    }

    .allure-chart-inner {
      position:absolute;
      left:50%;
      top:50%;
      width:auto;
      height:auto;
      min-width:58px;
      padding:5px 9px;
      border-radius:999px;
      background:rgba(255,255,255,.92);
      display:grid;
      place-items:center;
      font-weight:800;
      box-shadow:0 8px 18px rgba(15,23,42,.14);
      transform:translate(-50%,-50%);
    }

    .dashboard-grid {
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      gap:18px;
    }

    .report-overview-grid {
      grid-template-columns:repeat(3,minmax(0,1fr));
      align-items:stretch;
    }

    .overview-card {
      min-height:300px;
      display:flex;
      flex-direction:column;
      justify-content:flex-start;
      gap:12px;
    }

    .overview-card h3 {
      margin:0;
      color:var(--color-text-primary);
      font-size:16px;
    }

    .overview-main {
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(220px,240px);
      gap:22px;
      align-items:center;
      flex:1;
      min-height:0;
    }

    .overview-metric-panel {
      min-width:0;
      display:grid;
      align-content:center;
      gap:8px;
      padding:8px 0;
    }

    .overview-chart {
      width:124px;
      height:132px;
    }

    .classic-pie-card {
      width:100%;
      max-width:260px;
      min-width:0;
      display:grid;
      justify-items:center;
      align-content:center;
      justify-self:center;
      align-self:center;
      padding-left:18px;
      border-left:1px solid var(--color-border);
      background:transparent;
      box-shadow:none;
    }

    .classic-pie-title {
      margin:0 0 2px;
      color:var(--color-text-primary);
      font-size:13px;
      font-weight:800;
      line-height:1.2;
      text-align:center;
    }

    .classic-pie-subtitle {
      margin:0 0 6px;
      color:var(--color-text-secondary);
      font-size:11px;
      text-align:center;
    }

    .classic-pie-layout {
      display:grid;
      gap:4px;
      justify-items:center;
      width:100%;
    }

    .classic-pie-svg {
      width:210px;
      height:166px;
      overflow:hidden;
    }

    .classic-pie-slice {
      stroke:#FFFFFF;
      stroke-width:2;
      filter:url(#pieDropShadow);
    }

    .classic-pie-label {
      fill:#111827;
      font-size:11px;
      font-weight:800;
      text-anchor:middle;
    }

    .classic-pie-legend {
      display:flex;
      justify-content:center;
      flex-wrap:wrap;
      gap:5px 8px;
      width:100%;
      padding-top:2px;
      overflow:hidden;
    }

    .classic-pie-row {
      display:inline-flex;
      gap:5px;
      align-items:center;
      color:var(--color-text-primary);
      font-size:10px;
      font-weight:400;
    }

    .classic-pie-dot {
      width:9px;
      height:9px;
      border-radius:2px;
      background:var(--sliceColor);
    }

    .classic-pie-count {
      color:var(--color-text-primary);
      font-weight:600;
    }

    .status-grid {
      display:grid;
      gap:9px;
    }

    .status-row {
      --statusColor:var(--color-info);
      --statusTint:var(--color-info-bg);
      display:grid;
      grid-template-columns:12px minmax(0,1fr) 72px;
      gap:10px;
      align-items:center;
      border:1px solid var(--color-border);
      border-radius:10px;
      padding:9px 10px;
      background:linear-gradient(90deg,var(--statusTint),#FFFFFF 72%);
    }

    .status-dot {
      width:10px;
      height:10px;
      border-radius:50%;
      background:var(--statusColor);
      box-shadow:0 0 0 4px color-mix(in srgb, var(--statusColor) 14%, transparent);
    }

    .status-row-main {
      min-width:0;
    }

    .status-row-head {
      display:flex;
      align-items:center;
      justify-content:flex-start;
      gap:10px;
      margin-bottom:6px;
    }

    .status-name {
      color:var(--color-text-primary);
      font-weight:700;
    }

    .status-count {
      color:var(--statusColor);
      font-size:18px;
      font-weight:700;
      line-height:1;
      text-align:right;
      font-variant-numeric:tabular-nums;
    }

    .status-track {
      height:8px;
      border-radius:999px;
      background:#EEF2F7;
      overflow:hidden;
    }

    .status-fill {
      height:100%;
      width:var(--statusPct);
      border-radius:999px;
      background:var(--statusColor);
    }

    .status-percent {
      color:var(--color-text-secondary);
      font-size:12px;
      font-weight:600;
      white-space:nowrap;
      text-align:right;
      font-variant-numeric:tabular-nums;
    }

    .status-metrics {
      display:grid;
      grid-template-columns:30px 36px;
      gap:6px;
      align-items:center;
      justify-content:end;
    }

    .run-meta-line {
      display:flex;
      align-items:center;
      flex-wrap:wrap;
      gap:6px;
      margin-top:10px;
      color:var(--color-text-secondary);
      font-size:12px;
      font-weight:500;
    }

    .run-meta-line strong {
      color:var(--color-text-primary);
      font-weight:700;
    }

    .project-chip {
      display:inline-flex;
      align-items:center;
      justify-self:start;
      max-width:100%;
      margin-bottom:6px;
      padding:6px 10px;
      border:1px solid #BFDBFE;
      border-radius:999px;
      background:var(--color-info-bg);
      color:var(--color-info);
      font-size:12px;
      font-weight:800;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .run-meta-dot {
      color:var(--color-text-muted);
    }

    .run-meta-stack {
      display:grid;
      grid-template-columns:auto minmax(0,1fr);
      align-items:start;
      column-gap:8px;
      row-gap:2px;
      line-height:1.45;
    }

    .run-meta-stack strong {
      grid-row:1 / span 2;
      padding-top:1px;
    }

    .run-meta-date,
    .run-meta-time {
      min-width:0;
      white-space:normal;
    }

    .report-main-grid {
      grid-template-columns:minmax(0,1.6fr) minmax(320px,.8fr);
      align-items:stretch;
    }

    .report-wide-card {
      margin-bottom:0;
    }

    .report-workspace-grid {
      display:grid;
      grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      gap:18px;
      align-items:stretch;
    }

    .report-side-stack {
      display:grid;
      grid-template-columns:1fr;
      gap:18px;
      min-width:0;
      margin-top:0;
    }

    .legacy-layout-hidden {
      display:none;
    }

    .trend-title {
      color:var(--color-text-primary);
      font-size:16px;
      font-weight:700;
      margin-bottom:4px;
    }

    .trend-subtitle {
      color:var(--muted);
      font-size:13px;
      margin-bottom:14px;
    }

    .trend-card,
    .failure-card {
      min-height:250px;
    }

    .trend-card {
      display:flex;
      flex-direction:column;
    }

    .trend-chart {
      flex:1;
      min-height:230px;
      position:relative;
      display:block;
      padding:14px 16px;
      border:1px solid var(--color-border);
      border-radius:14px;
      background:#FFFFFF;
      min-width:0;
      overflow:hidden;
    }

    .trend-axis {
      display:flex;
      flex-direction:column;
      justify-content:space-between;
      padding:34px 0 30px;
      color:var(--color-text-muted);
      font-size:11px;
      font-weight:700;
      text-align:right;
    }

    .trend-plot {
      position:relative;
      min-width:0;
      height:238px;
      margin:0;
      background:#FFFFFF;
    }

    .trend-svg {
      position:relative;
      inset:auto;
      width:100%;
      height:238px;
      overflow:visible;
      pointer-events:auto;
    }

    .trend-item {
      position:absolute;
      left:var(--x);
      bottom:30px;
      width:54px;
      height:calc(100% - 30px);
      transform:translateX(-50%);
      color:inherit;
      text-decoration:none;
      cursor:pointer;
    }

    .trend-point {
      position:absolute;
      left:50%;
      bottom:var(--y);
      width:13px;
      height:13px;
      border-radius:50%;
      transform:translate(-50%,50%);
      background:#FFFFFF;
      border:4px solid var(--color-info);
      box-shadow:0 8px 18px rgba(37,99,235,.24);
    }

    .trend-point::after {
      content:"";
      position:absolute;
      inset:-10px;
      border-radius:50%;
    }

    .trend-item:hover .trend-point,
    .trend-item:focus-visible .trend-point {
      border-color:var(--color-success);
      transform:translate(-50%,50%) scale(1.12);
    }

    .trend-item:focus-visible {
      outline:2px solid var(--color-info);
      outline-offset:4px;
      border-radius:var(--radius-sm);
    }

    .trend-value {
      position:absolute;
      left:50%;
      bottom:calc(var(--y) + 16px);
      transform:translateX(-50%);
      font-size:12px;
      font-weight:700;
      color:var(--color-text-primary);
      white-space:nowrap;
    }

    .trend-label {
      position:absolute;
      left:50%;
      bottom:-26px;
      transform:translateX(-50%);
      font-size:11px;
      color:var(--muted);
      white-space:nowrap;
    }

    .failure-list {
      display:grid;
      gap:8px;
      margin-top:14px;
    }

    .failure-item {
      display:grid;
      grid-template-columns:32px minmax(0,1fr) auto;
      gap:10px;
      align-items:center;
      border:1px solid var(--color-border);
      border-radius:12px;
      padding:10px 12px;
      width:100%;
      background:#FFFFFF;
      color:var(--color-text-primary);
      text-align:left;
      cursor:pointer;
    }

    .failure-item:hover,
    .failure-item:focus-visible {
      border-color:#FCA5A5;
      background:var(--color-danger-bg);
      box-shadow:none;
    }

    .failure-item:focus-visible {
      outline:none;
    }

    .failure-rank {
      width:26px;
      height:26px;
      border-radius:50%;
      display:grid;
      place-items:center;
      background:var(--color-danger-bg);
      color:var(--color-danger);
      font-weight:800;
    }

    .failure-name {
      font-weight:400;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
    }

    .failure-count {
      background:var(--color-danger-bg);
      color:var(--color-danger);
      border:1px solid #FCA5A5;
      border-radius:999px;
      padding:4px 10px;
      font-size:12px;
      font-weight:700;
    }

    .test-row-focus {
      outline:2px solid var(--color-danger);
      outline-offset:-2px;
      background:var(--color-danger-bg) !important;
    }

    .allure-chart-wrap {
      display:grid;
      gap:10px;
      justify-items:center;
    }

    .allure-legend {
      display:grid;
      grid-template-columns:repeat(2,max-content);
      gap:5px 12px;
      font-size:12px;
      color:var(--muted);
    }

    .legend-item {
      display:inline-flex;
      align-items:center;
      gap:5px;
      white-space:nowrap;
    }

    .legend-dot {
      width:9px;
      height:9px;
      border-radius:50%;
      display:inline-block;
    }

    .legend-passed { background:var(--color-success); }
    .legend-failed { background:var(--color-danger); }
    .legend-skipped { background:var(--color-amber); }
    .legend-flaky { background:var(--color-purple); }

    .slowest-list {
      display:grid;
      gap:12px;
      margin-top:14px;
    }

    .slowest-item {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto;
      gap:10px;
      align-items:center;
    }

    .slowest-name {
      font-weight:400;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
    }

    .slowest-duration {
      font-weight:700;
      color:var(--color-info);
    }

    .slowest-bar-track {
      grid-column:1 / -1;
      height:8px;
      border-radius:999px;
      background:#EEF2F7;
      overflow:hidden;
    }

    .slowest-bar {
      height:100%;
      width:var(--durationPct);
      border-radius:999px;
      background:linear-gradient(90deg,var(--color-info),var(--color-success));
    }

    .export-card {
      display:flex;
      flex-direction:column;
      justify-content:flex-start;
      min-height:0;
    }

    .export-actions {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
      margin-top:16px;
    }

    .export-option {
      display:grid;
      grid-template-columns:1fr auto;
      gap:10px;
      align-items:center;
      border:1px solid var(--border);
      border-radius:var(--radius-md);
      padding:12px;
      background:var(--color-bg-secondary);
    }

    .export-option-title {
      font-weight:800;
    }

    .export-option-desc {
      color:var(--muted);
      font-size:12px;
      margin-top:2px;
    }

    .export-option button {
      border-radius:var(--radius-md);
      background:var(--color-text-primary);
      color:#fff;
      border-color:var(--color-text-primary);
      font-weight:700;
      padding:7px 12px;
    }

    .export-option button:hover {
      background:#334155;
      border-color:#334155;
    }

    .print-failures {
      display:none;
    }

    .print-report {
      display:none;
    }

    .timeline-list {
      display:grid;
      gap:0;
      margin-top:12px;
    }

    .timeline-item {
      display:grid;
      grid-template-columns:76px 18px minmax(0,1fr) auto;
      gap:10px;
      align-items:start;
      position:relative;
      padding:0 0 10px;
      min-width:0;
    }

    .timeline-item:not(:last-child)::after {
      content:"";
      position:absolute;
      left:90px;
      top:18px;
      bottom:0;
      width:2px;
      background:#E2E8F0;
    }

    .timeline-time {
      color:var(--muted);
      font-size:12px;
      font-weight:600;
      padding-top:1px;
      white-space:nowrap;
    }

    .timeline-dot {
      width:14px;
      height:14px;
      border-radius:50%;
      background:var(--color-danger);
      border:3px solid var(--color-danger-bg);
      z-index:1;
    }

    .timeline-title {
      font-weight:400;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
      min-width:0;
      max-width:100%;
    }

    .timeline-meta {
      color:var(--muted);
      font-size:12px;
      margin-top:2px;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .timeline-status {
      color:var(--color-danger);
      background:var(--color-danger-bg);
      border:1px solid #FCA5A5;
      border-radius:999px;
      padding:3px 8px;
      font-size:11px;
      font-weight:700;
      text-transform:uppercase;
      white-space:nowrap;
    }

    .comparison-card .trend-subtitle {
      max-width:720px;
    }

    .comparison-controls {
      display:grid;
      grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);
      gap:12px;
      align-items:end;
      margin-top:14px;
      padding:10px;
      border:1px solid var(--color-border);
      border-radius:12px;
      background:var(--color-bg-secondary);
    }

    .comparison-field label {
      display:block;
      color:var(--muted);
      font-size:12px;
      font-weight:800;
      margin-bottom:5px;
      text-transform:uppercase;
    }

    .comparison-field select {
      width:100%;
      border-radius:10px;
      background:var(--color-bg-secondary);
    }

    .comparison-vs {
      color:var(--color-info);
      font-weight:700;
      padding-bottom:9px;
      text-transform:uppercase;
    }

    .comparison-section {
      margin-top:12px;
    }

    .comparison-section-title {
      display:flex;
      align-items:center;
      justify-content:space-between;
      gap:10px;
      margin-bottom:8px;
      color:var(--color-text-primary);
      font-size:13px;
      font-weight:800;
      text-transform:uppercase;
    }

    .comparison-section-title span {
      color:var(--color-text-secondary);
      font-size:12px;
      font-weight:600;
      text-transform:none;
    }

    .comparison-results,
    .comparison-inventory {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(170px,1fr));
      gap:10px;
    }

    .comparison-stat {
      border:1px solid var(--color-border);
      border-radius:12px;
      padding:10px;
      background:#FFFFFF;
      min-height:112px;
      display:flex;
      flex-direction:column;
    }

    .comparison-stat.is-fail {
      background:var(--color-danger-bg);
      border-color:#FCA5A5;
    }

    .comparison-stat.is-pass {
      background:var(--color-success-bg);
      border-color:#BBF7D0;
    }

    .comparison-stat.is-warn {
      background:var(--color-warning-bg);
      border-color:#FDE68A;
    }

    .comparison-stat.is-info {
      background:var(--color-info-bg);
      border-color:#BFDBFE;
    }

    .comparison-label {
      color:var(--color-text-primary);
      font-weight:700;
    }

    .comparison-note {
      margin-top:2px;
      color:var(--color-text-secondary);
      font-size:12px;
      line-height:1.35;
    }

    .comparison-count {
      font-size:28px;
      font-weight:700;
      line-height:1;
      margin-top:8px;
    }

    .comparison-list {
      margin:8px 0 0;
      padding-left:18px;
      color:var(--color-text-secondary);
      font-size:12px;
      font-weight:400;
      overflow-wrap:anywhere;
      max-height:42px;
      overflow:hidden;
    }

    .comparison-list li {
      margin-bottom:3px;
    }

    .comparison-more {
      margin-top:auto;
      color:var(--color-text-secondary);
      font-size:12px;
      font-weight:600;
    }

    .grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
      gap:18px;
    }

    .metric {
      font-size:32px;
      font-weight:800;
      line-height:1.05;
    }

    .progress {
      height:10px;
      background:var(--color-info-bg);
      border-radius:999px;
      overflow:hidden;
      margin-top:2px;
    }

    .progress-bar {
      height:100%;
      width:var(--pct);
      background:linear-gradient(90deg,var(--color-info),var(--color-success));
    }

    .env-list {
      display:grid;
      gap:8px;
    }

    .env-row {
      display:flex;
      justify-content:space-between;
      gap:12px;
      border-bottom:1px solid var(--color-border);
      padding-bottom:6px;
      min-width:0;
    }

    .env-row:last-child {
      border-bottom:0;
      padding-bottom:0;
    }

    .env-value {
      font-weight:400;
      text-align:right;
      min-width:0;
      overflow-wrap:anywhere;
    }

    .badge {
      display:inline-flex;
      padding:4px 9px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      margin:3px;
    }

    .pass { background:var(--color-success-bg);color:var(--color-success); }
    .fail { background:var(--color-danger-bg);color:var(--color-danger); }
    .skip { background:var(--color-warning-bg);color:var(--color-amber-dark); }
    .warn { background:var(--color-warning-bg);color:var(--color-warning); }
    .flaky { background:var(--color-purple-bg);color:var(--color-purple); }

    .test-details-grid {
      display:grid;
      grid-template-columns:minmax(0,1.35fr) minmax(300px,.65fr);
      gap:18px;
      align-items:start;
      margin-top:18px;
      min-width:0;
    }

    .tests-card,
    .details-card {
      height:clamp(500px,62vh,640px);
      display:flex;
      flex-direction:column;
    }

    .tests-card > div:first-child,
    .details-card > h3 {
      border-bottom:1px solid var(--color-border);
      padding-bottom:10px;
    }

    .details-card {
      overflow-y:hidden;
      overflow-x:hidden;
      position:sticky;
      top:76px;
    }

    #detailsContent {
      flex:1;
      min-height:0;
      overflow-y:auto;
      overflow-x:hidden;
      padding-right:4px;
    }

    .details-empty {
      height:100%;
      display:grid;
      place-items:center;
      text-align:center;
      color:var(--color-text-secondary);
      padding:24px;
    }

    .details-empty strong {
      display:block;
      color:var(--color-text-primary);
      font-size:16px;
      margin-bottom:6px;
    }

    .search-input {
      padding:10px 12px;
      border:1px solid var(--color-border);
      border-radius:10px;
      background:var(--color-bg-secondary);
      color:var(--text);
      width:100%;
      min-width:0;
    }

    .search-panel {
      margin-bottom:12px;
      max-width:none;
    }

    .filter-bar {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:14px;
    }

    .filter-btn {
      padding:7px 12px;
      font-size:12px;
      border-radius:var(--radius-md);
    }

    .filter-btn.active {
      background:var(--color-info);
      border-color:var(--color-info);
      color:#fff;
    }

    .scroll {
      overflow-y:auto;
      overflow-x:hidden;
      flex:1;
      min-height:0;
      border:1px solid var(--color-border);
      border-radius:12px;
    }

    table {
      width:100%;
      border-collapse:separate;
      border-spacing:0;
      table-layout:fixed;
    }

    th:nth-child(1), td:nth-child(1) { width:38%; }
    th:nth-child(2), td:nth-child(2) { width:15%; }
    th:nth-child(3), td:nth-child(3) { width:18%; }
    th:nth-child(4), td:nth-child(4) { width:14%; }
    th:nth-child(5), td:nth-child(5) { width:15%; }
    th:nth-child(5), td:nth-child(5) {
      text-align:center;
      padding-left:8px;
      padding-right:20px;
    }

    th,td {
      padding:13px 12px;
      border-bottom:1px solid var(--color-border);
      text-align:left;
      overflow:hidden;
      font-weight:400;
    }

    th {
      color:#334155;
      background:#F1F5F9;
      font-size:12px;
      font-weight:700;
      text-transform:uppercase;
      position:sticky;
      top:0;
      z-index:1;
    }

    tr:hover {
      background:#F8FAFC;
      cursor:pointer;
    }

    .cell-content {
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
      min-width:0;
      font-weight:400;
    }

    .status-pill {
      padding:4px 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:800;
      text-transform:uppercase;
    }

    .status-passed { background:var(--color-success-bg);color:var(--color-success); }
    .status-failed { background:var(--color-danger-bg);color:var(--color-danger); }
    .status-skipped { background:var(--color-warning-bg);color:var(--color-amber-dark); }
    .status-timedOut { background:var(--color-warning-bg);color:var(--color-warning); }
    .status-flaky { background:var(--color-purple-bg);color:var(--color-purple); }

    .defect-tag {
      display:inline-flex;
      align-items:center;
      justify-content:center;
      max-width:100%;
      min-height:24px;
      padding:4px 9px;
      border:1px solid transparent;
      border-radius:999px;
      font-size:11px;
      font-weight:800;
      line-height:1.2;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .defect-product-bug { background:#FEF2F2;color:#DC2626;border-color:#FECACA; }
    .defect-automation-bug { background:#EFF6FF;color:#2563EB;border-color:#BFDBFE; }
    .defect-no-defect { background:#F0FDF4;color:#16A34A;border-color:#BBF7D0; }
    .defect-to-investigate { background:#FFFBEB;color:#D97706;border-color:#FDE68A; }
    .defect-environment-issue { background:#F5F3FF;color:#7C3AED;border-color:#DDD6FE; }

    .attachments {
      display:flex;
      gap:6px;
      align-items:center;
      flex-wrap:nowrap;
      overflow:hidden;
      justify-content:flex-start;
    }

    td:nth-child(5) .attachments {
      justify-content:center;
    }

    .attachment-btn {
      width:32px;
      height:30px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border:1px solid var(--color-border);
      border-radius:8px;
      background:#FFFFFF;
      color:var(--color-info);
      cursor:pointer;
      font-size:14px;
    }

    .attachment-btn:hover {
      background:var(--color-info);
      color:#FFFFFF;
      border-color:var(--color-info);
    }

    .attachment-link {
      text-decoration:none;
      flex:0 0 32px;
    }

    .attachment-muted {
      color:var(--color-text-muted);
      font-size:12px;
    }

    .attachments a {
      color:var(--color-info);
      font-size:12px;
      max-width:72px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .pill {
      background:var(--color-info-bg);
      border:1px solid #BFDBFE;
      padding:4px 8px;
      border-radius:999px;
      font-size:12px;
      color:var(--color-info);
    }

    .flex {
      display:flex;
      gap:12px;
      align-items:center;
      flex-wrap:wrap;
    }

    .mono {
      font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
    }

    .detail-section {
      margin-top:14px;
      padding:12px;
      border:1px solid var(--color-border);
      border-radius:12px;
      background:#FFFFFF;
    }

    .detail-section h4 {
      margin:0 0 10px;
      color:var(--text);
    }

    .detail-test-summary {
      margin:10px 0 12px;
      padding:12px;
      border:1px solid var(--color-border);
      border-left:4px solid var(--color-danger);
      border-radius:12px;
      background:#FFFFFF;
    }

    .detail-test-summary.is-passed {
      border-left-color:var(--color-success);
    }

    .detail-test-summary.is-timedOut,
    .detail-test-summary.is-skipped {
      border-left-color:var(--color-warning);
    }

    .detail-test-summary.is-flaky {
      border-left-color:var(--color-flaky);
    }

    .detail-test-summary-label {
      display:block;
      color:var(--muted);
      font-size:11px;
      font-weight:800;
      margin-bottom:4px;
      text-transform:uppercase;
    }

    .detail-test-summary-title {
      color:var(--color-text-primary);
      font-size:15px;
      font-weight:600;
      line-height:1.35;
      overflow-wrap:anywhere;
    }

    .detail-test-summary-meta {
      color:var(--color-text-secondary);
      font-size:12px;
      margin-top:5px;
      overflow-wrap:anywhere;
    }

    .detail-browser-banner {
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:center;
      margin:12px 0;
      padding:12px;
      border:1px solid #BFDBFE;
      border-radius:12px;
      background:var(--color-info-bg);
    }

    .detail-browser-name {
      font-size:20px;
      font-weight:600;
      color:var(--color-text-primary);
    }

    .detail-grid {
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:10px;
    }

    .detail-field {
      min-width:0;
    }

    .detail-label {
      display:block;
      color:var(--muted);
      font-size:11px;
      font-weight:800;
      margin-bottom:3px;
      text-transform:uppercase;
    }

    .detail-value {
      overflow-wrap:anywhere;
      font-size:13px;
      font-weight:400;
    }

    .history-table {
      display:grid;
      gap:8px;
    }

    .history-row {
      display:grid;
      grid-template-columns:minmax(118px,1fr) 88px 64px minmax(108px,1.1fr);
      gap:10px;
      align-items:center;
      padding:10px;
      border:1px solid var(--color-border);
      border-radius:10px;
      background:#F8FAFC;
    }

    .history-row-main {
      display:grid;
      grid-template-columns:minmax(118px,1fr) 88px 64px minmax(108px,1.1fr);
      gap:10px;
      align-items:center;
      grid-column:1 / -1;
    }

    .history-row.is-current {
      background:var(--color-info-bg);
      border-color:#BFDBFE;
    }

    .history-run {
      min-width:0;
      overflow:hidden;
      text-overflow:ellipsis;
      white-space:nowrap;
    }

    .history-date {
      color:var(--color-text-secondary);
      font-size:12px;
      line-height:1.3;
    }

    .history-empty {
      margin-top:8px;
      color:var(--color-text-secondary);
      font-size:13px;
    }

    .history-reason {
      grid-column:1 / -1;
      color:var(--color-text-secondary);
      font-size:12px;
      line-height:1.4;
      padding-top:8px;
      border-top:1px solid var(--color-border);
      overflow-wrap:anywhere;
    }

    .defect-selector {
      margin:12px 0;
      padding:12px;
      border:1px solid var(--color-border);
      border-radius:12px;
      background:#FFFFFF;
    }

    .defect-options {
      display:grid;
      grid-template-columns:repeat(5,minmax(0,1fr));
      gap:8px;
      margin-top:10px;
    }

    .defect-option {
      min-height:38px;
      border:1px solid var(--color-border);
      border-radius:8px;
      background:#F8FAFC;
      color:var(--color-text-primary);
      cursor:pointer;
      font-size:12px;
      font-weight:600;
    }

    .defect-option.is-active {
      background:var(--color-info);
      border-color:var(--color-info);
      color:#FFFFFF;
    }

    .defect-option.defect-product-bug.is-active { background:#DC2626;border-color:#DC2626; }
    .defect-option.defect-automation-bug.is-active { background:#2563EB;border-color:#2563EB; }
    .defect-option.defect-no-defect.is-active { background:#16A34A;border-color:#16A34A; }
    .defect-option.defect-to-investigate.is-active { background:#D97706;border-color:#D97706; }
    .defect-option.defect-environment-issue.is-active { background:#7C3AED;border-color:#7C3AED; }

    @media(max-width:900px) {
      .defect-options {
        grid-template-columns:repeat(2,minmax(0,1fr));
      }
    }

    .step-list {
      margin:0;
      padding-left:18px;
    }

    .failure-summary {
      margin-top:12px;
    }

    .failure-summary h4 {
      color:var(--color-danger);
      margin-bottom:10px;
    }

    .failure-box {
      padding:12px;
      border-radius:10px;
      background:var(--color-danger-bg);
      border:1px solid #FCA5A5;
      color:var(--color-text-primary);
      font-size:13px;
      line-height:1.6;
    }

    .failure-explanation {
      margin-top:12px;
      padding:12px;
      border-radius:10px;
      background:#FFFBEB;
      border:1px solid #FDE68A;
      color:var(--text);
      font-size:13px;
      line-height:1.6;
    }

    .failure-explanation-title {
      color:var(--color-danger);
      font-weight:800;
      margin-bottom:8px;
    }

    .failure-explanation-label {
      display:block;
      color:var(--muted);
      font-size:12px;
      font-weight:800;
      margin-top:8px;
      text-transform:uppercase;
    }

    .failure-causes {
      margin:4px 0 0;
      padding-left:18px;
    }

    .modal-backdrop {
      position:fixed;
      inset:0;
      background:rgba(15,23,42,.75);
      display:none;
      align-items:center;
      justify-content:center;
      z-index:999;
      padding:24px;
    }

    .modal-backdrop.open {
      display:flex;
    }

    .modal-card {
      width:min(1000px,96vw);
      max-height:92vh;
      background:var(--card-bg);
      border:1px solid var(--border);
      border-radius:18px;
      overflow:hidden;
      box-shadow:0 24px 80px rgba(0,0,0,.35);
    }

    .modal-header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:14px 18px;
      border-bottom:1px solid var(--border);
    }

    .modal-body {
      padding:18px;
      max-height:calc(92vh - 58px);
      overflow:auto;
      display:grid;
      place-items:center;
    }

    .modal-body img {
      max-width:100%;
      max-height:76vh;
      border-radius:12px;
      border:1px solid var(--border);
    }

    .modal-body video {
      width:100%;
      max-height:76vh;
      border-radius:12px;
      background:#000;
    }

    @media(max-width:1400px) {
      .report-workspace-grid {
        grid-template-columns:minmax(0,1fr) minmax(0,1fr);
      }

      .details-card {
        position:static;
      }

      .report-side-stack {
        grid-column:1 / -1;
      }
    }

    @media(max-width:1200px) {
      .report-main-grid,
      .report-workspace-grid,
      .dashboard-grid {
        grid-template-columns:1fr;
      }
    }

    @media(max-width:900px) {
      main {
        padding:18px;
      }

      .report-overview-grid,
      .test-details-grid {
        grid-template-columns:1fr;
      }

      .tests-card,
      .details-card {
        height:auto;
        min-height:auto;
        max-height:none;
      }

      .details-card {
        position:static;
      }

      #detailsContent {
        overflow:visible;
      }
    }

    @media(max-width:560px) {
      .overview-main {
        grid-template-columns:1fr;
        gap:18px;
      }

      .classic-pie-card {
        width:100%;
        max-width:260px;
        padding-left:0;
        border-left:0;
      }

      .export-actions {
        grid-template-columns:1fr;
      }

      .comparison-controls,
      .comparison-results {
        grid-template-columns:1fr;
      }

      .comparison-vs {
        padding-bottom:0;
      }
    }

    @media print {
      @page {
        margin:14mm;
      }

      header,
      .controls,
      .export-card,
      .filter-bar,
      .search-grid,
      .search-panel,
      .modal-backdrop {
        display:none !important;
      }

      .allure-summary,
      .dashboard-grid,
      .grid,
      .test-details-grid {
        display:none !important;
      }

      .print-report,
      .print-failures {
        display:block;
        margin-top:0;
      }

      .print-report h1,
      .print-report h2,
      .print-failures h2 {
        color:#0f2f57;
      }

      .print-brand {
        display:flex;
        justify-content:space-between;
        gap:16px;
        align-items:center;
        border-bottom:3px solid #ffc107;
        padding-bottom:10px;
        margin-bottom:12px;
      }

      .print-brand-main {
        display:flex;
        gap:10px;
        align-items:center;
      }

      .print-logo {
        width:38px;
        height:38px;
        border-radius:50%;
        display:flex;
        flex-direction:column;
        justify-content:center;
        gap:3px;
        background:#ffc107;
        padding:9px 8px 9px 14px;
      }

      .print-logo span {
        display:block;
        width:16px;
        height:3px;
        border-radius:999px;
        background:#9a6a00;
        position:relative;
      }

      .print-logo span::before {
        content:"";
        position:absolute;
        left:-7px;
        top:-1px;
        width:4px;
        height:7px;
        border-right:2px solid #9a6a00;
        border-bottom:2px solid #9a6a00;
        transform:rotate(45deg);
      }

      .print-brand h1 {
        margin:0;
        color:#20232d;
        font-size:26px;
      }

      .print-summary-grid {
        display:grid;
        grid-template-columns:repeat(4,1fr);
        gap:8px;
      }

      .print-summary-box {
        border:1px solid #d7e4f6;
        border-radius:8px;
        padding:9px;
        break-inside:avoid;
      }

      .print-label {
        color:#64748b;
        font-size:10px;
        font-weight:800;
        text-transform:uppercase;
      }

      .print-value {
        font-size:17px;
        font-weight:900;
        margin-top:3px;
      }

      .print-issue-grid {
        display:grid;
        grid-template-columns:repeat(3,1fr);
        gap:8px;
      }

      .print-issue {
        border:1px solid #f4bf36;
        border-radius:8px;
        padding:8px;
        background:#FFFFFF;
      }

      .print-failure-item {
        border:1px solid #f4bf36;
        border-left:5px solid #f4bf36;
        border-radius:8px;
        margin-bottom:8px;
        padding:9px;
        break-inside:avoid;
      }

      .print-failure-cols {
        display:grid;
        grid-template-columns:1fr 1fr 1fr;
        gap:10px;
      }

      .print-cause-list,
      .print-fix-list {
        margin:6px 0 0;
        padding-left:18px;
      }

      body,
      main {
        background:#fff !important;
        box-shadow:none !important;
      }

      main {
        margin:0;
        max-width:none;
        padding:0;
        border-radius:0;
      }

      table {
        font-size:11px;
        page-break-inside:auto;
      }

      th,td {
        padding:6px;
      }
    }
  </style>
</head>

<body>
  <header>
    <div class="brand">
      <div class="brand-logo-wrapper">
        <img src="/assets/1.svg" alt="testreport logo" style="height:48px;width:auto;display:block;">
      </div>
    </div>

    <div class="controls">
      <label class="muted">Run:</label>
      <select id="runSelect"></select>
      <button id="refresh">Refresh</button>
    </div>
  </header>

  <main>
    <div class="grid report-overview-grid" id="summaryGrid"></div>

    <div class="dashboard-grid report-main-grid">
      <div class="trend-card">
        <div class="trend-title">Execution Trend</div>
        <div class="trend-subtitle">Last 10 test runs pass percentage</div>
        <div class="trend-chart" id="trendChart"></div>
      </div>

      <div class="failure-card">
        <div class="trend-title">Top Failed Tests</div>
        <div class="trend-subtitle">Most frequently failed tests across all runs</div>
        <div id="failureAnalytics"></div>
      </div>

    </div>

    <div class="export-card report-wide-card">
      <div class="trend-title">Export Report</div>
      <div class="trend-subtitle">Download this run for sharing</div>
      <div class="export-actions">
        <div class="export-option">
          <div>
            <div class="export-option-title">PDF</div>
            <div class="export-option-desc">Printable manager summary</div>
          </div>
          <button id="exportPdf" type="button">Export</button>
        </div>

        <div class="export-option">
          <div>
            <div class="export-option-title">Excel</div>
            <div class="export-option-desc">CSV data for analysis</div>
          </div>
          <button id="exportExcel" type="button">Export</button>
        </div>

        <div class="export-option">
          <div>
            <div class="export-option-title">JSON</div>
            <div class="export-option-desc">Raw report data</div>
          </div>
          <button id="exportJson" type="button">Export</button>
        </div>

        <div class="export-option">
          <div>
            <div class="export-option-title">Dashboard</div>
            <div class="export-option-desc">Visual HTML report</div>
          </div>
          <button id="exportDashboard" type="button">Export</button>
        </div>
      </div>
    </div>

    <div class="slowest-card report-wide-card">
      <div class="trend-title">Slowest Tests</div>
      <div class="trend-subtitle">Performance-heavy tests in this run</div>
      <div id="slowestTests"></div>
    </div>

    <div class="report-workspace-grid">
      <div class="card tests-card" id="testsSection">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:12px;">
          <h3 style="margin:0;">Tests</h3>
        </div>

        <div class="search-panel">
          <input id="testSearch" class="search-input" type="text" placeholder="Search tests..." />
        </div>

        <div class="filter-bar">
          <button class="filter-btn active" data-status="all">All</button>
          <button class="filter-btn" data-status="passed">Passed</button>
          <button class="filter-btn" data-status="failed">Failed</button>
          <button class="filter-btn" data-status="skipped">Skipped</button>
          <button class="filter-btn" data-status="flaky">Flaky</button>
        </div>

        <div class="scroll">
          <table>
            <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Defect Type</th>
              <th>Duration</th>
              <th>Attachments</th>
            </tr>
            </thead>
            <tbody id="testsBody"></tbody>
          </table>
        </div>
      </div>

      <div class="card details-card">
        <h3>Details</h3>
        <div id="detailsContent">
          <div class="details-empty">
            <div>
              <strong>Select a test</strong>
              <span>View steps, attachments, timing and failure details here.</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="report-side-stack">
      <div class="comparison-card">
        <div class="trend-title">Run Comparison</div>
        <div class="trend-subtitle">See what became worse, what was fixed, and which tests were added or removed between two runs.</div>
        <div class="comparison-controls">
          <div class="comparison-field">
            <label for="baseRunSelect">Base Run</label>
            <select id="baseRunSelect"></select>
          </div>
          <div class="comparison-vs">vs</div>
          <div class="comparison-field">
            <label for="compareRunSelect">Compare With</label>
            <select id="compareRunSelect"></select>
          </div>
        </div>
        <div id="comparisonResults"></div>
      </div>

      <div class="timeline-card">
        <div class="trend-title">Failure Timeline</div>
        <div class="trend-subtitle">Run progression for failed tests</div>
        <div id="failureTimeline"></div>
      </div>
    </div>

    <div class="legacy-layout-hidden">
      <div class="allure-summary" id="allureSummary"></div>

      <div class="slowest-card">
        <div class="trend-title">Slowest Tests</div>
        <div class="trend-subtitle">Performance-heavy tests in this run</div>
        <div id="slowestTestsLegacy"></div>
      </div>

      <div class="comparison-card">
        <div class="trend-title">Run Comparison</div>
        <div class="trend-subtitle">Compare failures between two runs</div>
      </div>

      <div class="timeline-card">
      <div class="trend-title">Failure Timeline</div>
      <div class="trend-subtitle">Run progression for failed tests</div>
      </div>
    </div>

    <div class="print-report" id="printReport"></div>
    <div class="print-failures" id="printFailures"></div>
  </main>

  <div class="modal-backdrop" id="previewModal">
    <div class="modal-card">
      <div class="modal-header">
        <strong id="modalTitle">Preview</strong>
        <button id="modalClose">Close</button>
      </div>
      <div class="modal-body" id="modalBody"></div>
    </div>
  </div>

  <script>
    const runSelect = document.getElementById('runSelect');
    const refreshBtn = document.getElementById('refresh');
    const summaryGrid = document.getElementById('summaryGrid');
    const allureSummary = document.getElementById('allureSummary');
    const trendChart = document.getElementById('trendChart');
    const failureAnalytics = document.getElementById('failureAnalytics');
    const slowestTests = document.getElementById('slowestTests');
    const failureTimeline = document.getElementById('failureTimeline');
    const baseRunSelect = document.getElementById('baseRunSelect');
    const compareRunSelect = document.getElementById('compareRunSelect');
    const comparisonResults = document.getElementById('comparisonResults');
    const exportPdf = document.getElementById('exportPdf');
    const exportExcel = document.getElementById('exportExcel');
    const exportJson = document.getElementById('exportJson');
    const exportDashboard = document.getElementById('exportDashboard');
    const printReport = document.getElementById('printReport');
    const printFailures = document.getElementById('printFailures');
    const testsBody = document.getElementById('testsBody');
    const testSearch = document.getElementById('testSearch');
    const brandLogo = document.getElementById('brandLogo');
    const brandFallback = document.getElementById('brandFallback');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const previewModal = document.getElementById('previewModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    let currentData = null;
    let availableRuns = [];
    let runDataCache = {};
    let searchText = '';
    let selectedStatus = 'all';
    const defectTypes = [
      'Product Bug',
      'Automation Bug',
      'No Defect',
      'To Investigate',
      'Environment Issue'
    ];

    if (brandLogo) {
      brandLogo.addEventListener('error', function () {
        brandLogo.style.display = 'none';
        if (brandFallback) {
          brandFallback.style.display = 'flex';
        }
      });
    }

    refreshBtn.addEventListener('click', function () {
      loadRuns({ preferNewest: true, showRefreshing: true });
    });
    exportPdf.addEventListener('click', exportCurrentPdf);
    exportExcel.addEventListener('click', exportCurrentExcel);
    exportJson.addEventListener('click', exportCurrentJson);
    exportDashboard.addEventListener('click', exportCurrentDashboard);

    runSelect.addEventListener('change', function () {
      navigateToRunTests(runSelect.value);
    });

    trendChart.addEventListener('click', function (e) {
      const link = e.target.closest('.trend-item');
      if (!link) return;

      e.preventDefault();

      const runId = link.getAttribute('data-run-id');
      if (!runId) return;

      navigateToRunTests(runId);
    });

    failureAnalytics.addEventListener('click', function (e) {
      const item = e.target.closest('.failure-item');
      if (!item) return;

      navigateToFailedTest(item.getAttribute('data-test-title'));
    });

    baseRunSelect.addEventListener('change', compareSelectedRuns);
    compareRunSelect.addEventListener('change', compareSelectedRuns);

    testSearch.addEventListener('input', function (e) {
      searchText = e.target.value.toLowerCase().trim();
      if (currentData) renderTests(currentData);
    });

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStatusFilter(btn.getAttribute('data-status'));

        if (currentData) renderTests(currentData);
      });
    });

    modalClose.addEventListener('click', closePreviewModal);

    previewModal.addEventListener('click', function (e) {
      if (e.target === previewModal) closePreviewModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closePreviewModal();
    });

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.defect-option[data-defect]');
      if (!btn) return;

      setDefectType(Number(btn.getAttribute('data-index')), btn.getAttribute('data-defect'));
    });

    async function loadRuns(options = {}) {
      const previousRunId = runSelect.value;

      if (options.showRefreshing) {
        refreshBtn.disabled = true;
        refreshBtn.textContent = 'Refreshing...';
      }

      try {
        const res = await fetch('/api/runs').then(function (r) {
          return r.json();
        });

        runSelect.innerHTML = '';
        availableRuns = res || [];
        const newestRunId = res[0] && res[0].runId;
        const previousStillExists = res.some(function (run) {
          return run.runId === previousRunId;
        });
        const selectedRunId = options.preferNewest
          ? newestRunId
          : (previousStillExists ? previousRunId : newestRunId);

        res.forEach(function (run, idx) {
          const opt = document.createElement('option');
          opt.value = run.runId;
          opt.textContent = run.runId + ' (tests: ' + run.tests + ', fail: ' + run.failed + ')';

          if (run.runId === selectedRunId) opt.selected = true;

          runSelect.appendChild(opt);
        });

        renderTrend(res);
        renderFailureAnalytics(res);
        renderComparisonOptions(res);

        if (res.length) {
          await loadRun(selectedRunId);
        } else {
          allureSummary.innerHTML = '<div class="muted">No runs found</div>';
        }
      } finally {
        if (options.showRefreshing) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = 'Refresh';
        }
      }
    }

    function renderComparisonOptions(runs) {
      baseRunSelect.innerHTML = '';
      compareRunSelect.innerHTML = '';

      (runs || []).forEach(function (run, idx) {
        const baseOpt = document.createElement('option');
        const compareOpt = document.createElement('option');
        const label = run.runId + ' (fail: ' + run.failed + ')';

        baseOpt.value = run.runId;
        baseOpt.textContent = label;
        compareOpt.value = run.runId;
        compareOpt.textContent = label;

        if (idx === 1) baseOpt.selected = true;
        if (idx === 0) compareOpt.selected = true;

        baseRunSelect.appendChild(baseOpt);
        compareRunSelect.appendChild(compareOpt);
      });

      if ((runs || []).length < 2) {
        comparisonResults.innerHTML = '<div class="muted" style="margin-top:12px;">Need at least two runs to compare.</div>';
        return;
      }

      compareSelectedRuns();
    }

    async function compareSelectedRuns() {
      const baseRunId = baseRunSelect.value;
      const compareRunId = compareRunSelect.value;

      if (!baseRunId || !compareRunId) return;

      if (baseRunId === compareRunId) {
        comparisonResults.innerHTML = '<div class="muted" style="margin-top:12px;">Choose two different runs to compare.</div>';
        return;
      }

      comparisonResults.innerHTML = '<div class="muted" style="margin-top:12px;">Comparing runs...</div>';

      const baseData = await fetch('/api/run/' + baseRunId).then(function (r) {
        return r.json();
      });
      const compareData = await fetch('/api/run/' + compareRunId).then(function (r) {
        return r.json();
      });

      renderComparisonResults(compareRunsByFailure(baseData, compareData));
    }

    function compareRunsByFailure(baseData, compareData) {
      const baseFailures = getFailedTitleSet(baseData);
      const compareFailures = getFailedTitleSet(compareData);
      const baseTests = getTitleSet(baseData);
      const compareTests = getTitleSet(compareData);

      return {
        newFailures: Array.from(compareFailures).filter(function (title) {
          return !baseFailures.has(title);
        }),
        fixedTests: Array.from(baseFailures).filter(function (title) {
          return !compareFailures.has(title);
        }),
        sameFailures: Array.from(compareFailures).filter(function (title) {
          return baseFailures.has(title);
        }),
        newTests: Array.from(compareTests).filter(function (title) {
          return !baseTests.has(title);
        }),
        removedTests: Array.from(baseTests).filter(function (title) {
          return !compareTests.has(title);
        })
      };
    }

    function getTitleSet(data) {
      return new Set((data.tests || []).map(function (test) {
        return test.title || 'Untitled test';
      }));
    }

    function getFailedTitleSet(data) {
      return new Set((data.tests || [])
        .filter(function (test) {
          return test.status === 'failed' || test.status === 'timedOut' || test.error;
        })
        .map(function (test) {
          return test.title || 'Untitled test';
        }));
    }

    function renderComparisonResults(result) {
      comparisonResults.innerHTML =
        '<div class="comparison-section">' +
          '<div class="comparison-section-title">Failure Changes <span>status movement</span></div>' +
          '<div class="comparison-results">' +
            comparisonStat('New Failures', 'Failed only in compare run', result.newFailures, 'fail') +
            comparisonStat('Fixed Tests', 'Failed in base, passing now', result.fixedTests, 'pass') +
            comparisonStat('Still Failing', 'Failed in both runs', result.sameFailures, 'warn') +
          '</div>' +
        '</div>' +
        '<div class="comparison-section">' +
          '<div class="comparison-section-title">Test Inventory <span>script/title changes</span></div>' +
          '<div class="comparison-inventory">' +
            comparisonStat('New Tests', 'Present only in compare run', result.newTests, 'info') +
            comparisonStat('Removed Tests', 'Present only in base run', result.removedTests, 'fail') +
          '</div>' +
        '</div>';
    }

    function comparisonStat(label, note, items, cls) {
      const visibleItems = items.slice(0, 4);
      const hiddenCount = Math.max(items.length - visibleItems.length, 0);

      return '<div class="comparison-stat is-' + cls + '">' +
        '<div class="comparison-label">' + escapeHtml(label) + '</div>' +
        '<div class="comparison-note">' + escapeHtml(note) + '</div>' +
        '<div class="comparison-count ' + cls + '">' + items.length + '</div>' +
        '<ul class="comparison-list">' +
          (visibleItems.length ? visibleItems.map(function (title) {
            return '<li>' + escapeHtml(title) + '</li>';
          }).join('') : '<li>None</li>') +
        '</ul>' +
        (hiddenCount ? '<div class="comparison-more">+' + hiddenCount + ' more</div>' : '') +
      '</div>';
    }

    async function loadRun(runId) {
      if (!runId) return;

      const data = await fetch('/api/run/' + runId).then(function (r) {
        return r.json();
      });

      ensureDefectTypes(data);
      currentData = data;

      renderAllureSummary(data);
      renderSummary(data);
      renderSlowestTests(data);
      renderFailureTimeline(data);
      renderPrintReport(data);
      renderPrintFailures(data);
      renderTests(data);
    }

    async function navigateToRunTests(runId) {
      if (!runId) return;

      runSelect.value = runId;
      await loadRun(runId);

      setStatusFilter('all');
      searchText = '';
      testSearch.value = '';
      if (currentData) renderTests(currentData);

      window.location.hash = 'run=' + encodeURIComponent(runId);
      scrollToTests();
    }

    function scrollToTests() {
      const testsSection = document.getElementById('testsSection');
      if (!testsSection) return;

      testsSection.scrollIntoView({ behavior:'smooth', block:'start' });
    }

    function setStatusFilter(status) {
      selectedStatus = status || 'all';

      filterButtons.forEach(function (btn) {
        btn.classList.toggle('active', btn.getAttribute('data-status') === selectedStatus);
      });
    }

    async function navigateToFailedTest(title) {
      if (!title) return;

      const targetRun = (availableRuns || []).find(function (run) {
        return (run.failedTests || []).includes(title);
      });

      if (targetRun && targetRun.runId && (!currentData || currentData.runId !== targetRun.runId)) {
        runSelect.value = targetRun.runId;
        await loadRun(targetRun.runId);
      }

      setStatusFilter('failed');
      searchText = String(title).toLowerCase().trim();
      testSearch.value = title;

      if (currentData) renderTests(currentData);

      requestAnimationFrame(function () {
        scrollToTests();
        focusTestRow(title);
      });
    }

    function focusTestRow(title) {
      const rows = Array.from(testsBody.querySelectorAll('tr[data-test-title]'));
      const row = rows.find(function (item) {
        return item.getAttribute('data-test-title') === title;
      });

      if (!row || !currentData) return;

      const index = Number(row.getAttribute('data-test-index'));
      const test = currentData.tests && currentData.tests[index];

      if (test) renderDetails(test);

      row.scrollIntoView({ behavior:'smooth', block:'center' });
      row.classList.add('test-row-focus');

      window.setTimeout(function () {
        row.classList.remove('test-row-focus');
      }, 1800);
    }

    function renderTrend(runs) {
      const lastRuns = (runs || []).slice(0, 10).reverse();

      if (!lastRuns.length) {
        trendChart.innerHTML = '<div class="muted">No run history found</div>';
        return;
      }

      function yForPct(value) {
        return 170 - (Math.max(0, Math.min(100, value)) * 1.35);
      }

      function getRunDate(run) {
        const raw = run.startedAt || run.finishedAt;
        const date = raw ? new Date(raw) : null;

        return date && !isNaN(date.getTime()) ? date : null;
      }

      function formatTrendDate(run) {
        const date = getRunDate(run);

        if (!date) {
          return run.runId ? String(run.runId).slice(-4) : '';
        }

        return date.toLocaleDateString([], { month: 'numeric', day: 'numeric' });
      }

      function formatTrendTime(run) {
        const date = getRunDate(run);

        if (!date) {
          return '';
        }

        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }

      const chartPoints = lastRuns.map(function (run, index) {
        const total = Number(run.tests || 0);
        const passed = Number(run.passed || 0);
        const percentage = total ? Math.round((passed / total) * 100) : 0;
        const x = lastRuns.length === 1 ? 515 : 90 + (index * (850 / (lastRuns.length - 1)));
        const y = yForPct(percentage);

        return {
          run: run,
          percentage: percentage,
          x: x,
          y: y
        };
      });

      const linePoints = chartPoints.map(function (point) {
        return point.x.toFixed(1) + ',' + point.y.toFixed(1);
      }).join(' ');

      const areaPoints = '90,170 ' + linePoints + ' 940,170';
      const grid = [100, 75, 50, 25, 0].map(function (value) {
        const y = yForPct(value);
        return '<line x1="70" x2="960" y1="' + y.toFixed(1) + '" y2="' + y.toFixed(1) + '" stroke="#E5E7EB" stroke-width="1"></line>' +
          '<text x="34" y="' + (y + 4).toFixed(1) + '" fill="#94A3B8" font-size="12" font-weight="700">' + value + '%</text>';
      }).join('');

      const pointMarkup = chartPoints.map(function (point) {
        const run = point.run;
        const dateLabel = formatTrendDate(run);
        const timeLabel = formatTrendTime(run);
        const titleLabel = [
          run.runId ? 'Run ' + run.runId : 'Run',
          getRunDate(run) ? getRunDate(run).toLocaleString() : ''
        ].filter(Boolean).join(' - ');
        const valueY = Math.max(18, point.y - 16);

        return '<a class="trend-svg-link" href="#run=' + encodeURIComponent(run.runId || '') + '" data-run-id="' + escapeAttr(run.runId || '') + '" onclick="event.preventDefault(); event.stopPropagation(); navigateToRunTests(this.getAttribute(\\'data-run-id\\'));">' +
          '<title>' + escapeHtml(titleLabel) + '</title>' +
          '<rect x="' + (point.x - 28).toFixed(1) + '" y="22" width="56" height="178" fill="transparent"></rect>' +
          '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="6" fill="#FFFFFF" stroke="#2563EB" stroke-width="4"></circle>' +
          '<text x="' + point.x.toFixed(1) + '" y="' + valueY.toFixed(1) + '" text-anchor="middle" fill="#0F172A" font-size="13" font-weight="800">' + point.percentage + '%</text>' +
          '<text x="' + point.x.toFixed(1) + '" y="202" text-anchor="middle" fill="#475569" font-size="12" font-weight="700">' + escapeHtml(dateLabel) + '</text>' +
          '<text x="' + point.x.toFixed(1) + '" y="218" text-anchor="middle" fill="#94A3B8" font-size="10" font-weight="700">' + escapeHtml(timeLabel) + '</text>' +
        '</a>';
      }).join('');

      trendChart.innerHTML =
        '<div class="trend-plot">' +
        '<svg class="trend-svg" viewBox="0 0 1000 238" preserveAspectRatio="none" role="img" aria-label="Execution trend pass percentage by run date">' +
          '<defs>' +
            '<linearGradient id="trendAreaGradient" x1="0" y1="0" x2="0" y2="1">' +
              '<stop offset="0%" stop-color="#2563EB" stop-opacity="0.24"/>' +
              '<stop offset="64%" stop-color="#22C55E" stop-opacity="0.10"/>' +
              '<stop offset="100%" stop-color="#22C55E" stop-opacity="0"/>' +
            '</linearGradient>' +
            '<linearGradient id="trendLineGradient" x1="0" y1="0" x2="1" y2="0">' +
              '<stop offset="0%" stop-color="#2563EB"/>' +
              '<stop offset="100%" stop-color="#22C55E"/>' +
            '</linearGradient>' +
          '</defs>' +
          grid +
          '<polygon points="' + areaPoints + '" fill="url(#trendAreaGradient)"></polygon>' +
          '<polyline points="' + linePoints + '" fill="none" stroke="url(#trendLineGradient)" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
          pointMarkup +
        '</svg>' +
        '</div>';
    }

    function renderFailureAnalytics(runs) {
      const failureMap = {};

      (runs || []).forEach(function (run) {
        (run.failedTests || []).forEach(function (title) {
          failureMap[title] = (failureMap[title] || 0) + 1;
        });
      });

      const topFailures = Object.keys(failureMap)
        .map(function (title) {
          return { title: title, count: failureMap[title] };
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, 5);

      if (!topFailures.length) {
        failureAnalytics.innerHTML = '<div class="failure-empty">No failed tests found across runs.</div>';
        return;
      }

      failureAnalytics.innerHTML =
        '<div class="failure-list">' +
        topFailures.map(function (item, index) {
          return '<button type="button" class="failure-item" data-test-title="' + escapeAttr(item.title) + '" title="' + escapeAttr(item.title) + '" onclick="event.stopPropagation(); navigateToFailedTest(this.getAttribute(\\'data-test-title\\'));">' +
            '<div class="failure-rank">' + (index + 1) + '</div>' +
            '<div class="failure-name">' + escapeHtml(item.title) + '</div>' +
            '<div class="failure-count">' + item.count + ' failures</div>' +
          '</button>';
        }).join('') +
        '</div>';
    }

    function renderSlowestTests(data) {
      const tests = (data.tests || [])
        .filter(function (test) {
          return Number(test.durationMs || 0) > 0;
        })
        .sort(function (a, b) {
          return Number(b.durationMs || 0) - Number(a.durationMs || 0);
        })
        .slice(0, 5);

      if (!tests.length) {
        slowestTests.innerHTML = '<div class="muted">No duration data found.</div>';
        return;
      }

      const maxDuration = Number(tests[0].durationMs || 1);

      slowestTests.innerHTML =
        '<div class="slowest-list">' +
        tests.map(function (test) {
          const duration = Number(test.durationMs || 0);
          const width = Math.max(Math.round((duration / maxDuration) * 100), 4);

          return '<div class="slowest-item" title="' + escapeHtml(test.title || '') + '">' +
            '<div class="slowest-name">' + escapeHtml(test.title || 'Untitled test') + '</div>' +
            '<div class="slowest-duration">' + durationLabel(duration) + '</div>' +
            '<div class="slowest-bar-track">' +
              '<div class="slowest-bar" style="--durationPct:' + width + '%"></div>' +
            '</div>' +
          '</div>';
        }).join('') +
        '</div>';
    }

    function renderFailureTimeline(data) {
      const failures = (data.tests || [])
        .filter(function (test) {
          return test.status === 'failed' || test.status === 'timedOut' || test.error;
        })
        .sort(function (a, b) {
          return new Date(a.startedAt || 0) - new Date(b.startedAt || 0);
        })
        .slice(0, 8);

      if (!failures.length) {
        failureTimeline.innerHTML = '<div class="muted">No failed tests in this run.</div>';
        return;
      }

      failureTimeline.innerHTML =
        '<div class="timeline-list">' +
        failures.map(function (test) {
          const time = test.startedAt
            ? new Date(test.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '--:--';

          return '<div class="timeline-item" title="' + escapeHtml(test.title || '') + '">' +
            '<div class="timeline-time">' + escapeHtml(time) + '</div>' +
            '<div class="timeline-dot"></div>' +
            '<div>' +
              '<div class="timeline-title">' + escapeHtml(test.title || 'Untitled test') + '</div>' +
              '<div class="timeline-meta">' + escapeHtml(shortFile(test.file || '')) + ' - ' + durationLabel(test.durationMs || 0) + '</div>' +
            '</div>' +
            '<div class="timeline-status">' + escapeHtml(test.status || 'failed') + '</div>' +
          '</div>';
        }).join('') +
        '</div>';
    }

    function renderAllureSummary(data) {
      const t = data.totals || {};
      const total = t.tests || 0;
      const passed = t.passed || 0;
      const failed = t.failed || 0;
      const skipped = t.skipped || 0;
      const timedOut = t.timedOut || 0;
      const flaky = t.flaky || 0;
      const pctVal = total ? ((passed / total) * 100).toFixed(2) : '0.00';

      const passedDeg = total ? (passed / total) * 360 : 0;
      const failedDeg = total ? passedDeg + ((failed + timedOut) / total) * 360 : passedDeg;
      const skippedDeg = total ? failedDeg + (skipped / total) * 360 : failedDeg;
      const flakyDeg = total ? skippedDeg + (flaky / total) * 360 : skippedDeg;
      allureSummary.innerHTML =
        '<div>' +
          '<div class="allure-title">TESTREPORT</div>' +
        '</div>' +
        '<div class="allure-count">' + total + '<span>test cases</span></div>' +
        '<div class="allure-chart-wrap">' +
          '<div class="allure-chart" style="--passedDeg:' + passedDeg + 'deg;--failedDeg:' + failedDeg + 'deg;--skippedDeg:' + skippedDeg + 'deg;--flakyDeg:' + flakyDeg + 'deg;">' +
            '<div class="allure-chart-inner">' + pctVal + '%</div>' +
          '</div>' +
          '<div class="allure-legend">' +
            '<span class="legend-item"><span class="legend-dot legend-passed"></span>Passed ' + passed + '</span>' +
            '<span class="legend-item"><span class="legend-dot legend-failed"></span>Failed ' + (failed + timedOut) + '</span>' +
            '<span class="legend-item"><span class="legend-dot legend-skipped"></span>Skipped ' + skipped + '</span>' +
            '<span class="legend-item"><span class="legend-dot legend-flaky"></span>Flaky ' + flaky + '</span>' +
          '</div>' +
        '</div>';
    }

    function renderSummary(data) {
      const t = data.totals || {};
      const env = getEnvironmentInfo(data);
      const durationMin = ((t.durationMs || 0) / 60000).toFixed(2);
      const total = t.tests || 0;
      const passed = t.passed || 0;
      const failed = (t.failed || 0) + (t.timedOut || 0);
      const skipped = t.skipped || 0;
      const flaky = t.flaky || 0;
      const pctVal = total ? ((passed / total) * 100).toFixed(2) : '0.00';
      const runStart = data.startedAt ? new Date(data.startedAt) : null;
      const runEnd = data.finishedAt ? new Date(data.finishedAt) : null;
      const runDate = runStart ? runStart.toLocaleDateString() : '--';
      const startTime = runStart ? runStart.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      const endTime = runEnd ? runEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--';
      const projectLabel = getRunProjectLabel(data, env);

      summaryGrid.innerHTML = '';

      const cards = [
        {
          title: 'Overall',
          body:
            '<div class="overview-main">' +
              '<div class="overview-metric-panel">' +
                '<div class="project-chip" title="' + escapeAttr(projectLabel) + '">Project Name: ' + escapeHtml(projectLabel) + '</div>' +
                '<div class="metric">' + passed + '/' + total + ' Passed</div>' +
                '<div class="progress" style="--pct:' + pct(passed, total) + '%"><div class="progress-bar"></div></div>' +
                '<div class="muted">duration ' + durationMin + ' min</div>' +
                '<div class="run-meta-line run-meta-stack"><strong>Run</strong><span class="run-meta-date">' + escapeHtml(runDate) + '</span><span class="run-meta-time">' + escapeHtml(startTime + ' - ' + endTime) + '</span></div>' +
              '</div>' +
              buildClassicPieChart(passed, failed, skipped, flaky, total, pctVal) +
            '</div>'
        },
        {
          title: 'Statuses',
          body:
            '<div class="status-grid">' +
              statusTile('Passed', passed, total, 'var(--color-success)', 'var(--color-success-bg)') +
              statusTile('Failed', t.failed || 0, total, 'var(--color-danger)', 'var(--color-danger-bg)') +
              statusTile('Timed Out', t.timedOut || 0, total, 'var(--color-warning)', 'var(--color-warning-bg)') +
              statusTile('Skipped', skipped, total, 'var(--color-amber)', 'var(--color-amber-light)') +
              statusTile('Flaky', flaky, total, 'var(--color-purple)', 'var(--color-purple-bg)') +
            '</div>'
        },
        {
          title: 'Environment Information',
          body:
            '<div class="env-list">' +
              '<div class="env-row"><span class="muted">OS</span><span class="env-value">' + escapeHtml(env.os) + '</span></div>' +
              '<div class="env-row"><span class="muted">Browser</span><span class="env-value">' + escapeHtml(env.browser) + '</span></div>' +
              '<div class="env-row"><span class="muted">Playwright</span><span class="env-value">' + escapeHtml(env.playwright) + '</span></div>' +
              '<div class="env-row"><span class="muted">Node</span><span class="env-value">' + escapeHtml(env.node) + '</span></div>' +
            '</div>'
        }
      ];

      cards.forEach(function (c) {
        const card = document.createElement('div');
        card.className = 'card overview-card';
        card.innerHTML = '<h3>' + c.title + '</h3>' + c.body;
        summaryGrid.appendChild(card);
      });
    }

    function buildClassicPieChart(passed, failed, skipped, flaky, total, pctVal) {
      const slices = [
        { label: 'Passed', value: passed, color: '#22C55E' },
        { label: 'Failed', value: failed, color: '#EF4444' },
        { label: 'Skipped', value: skipped, color: '#F59E0B' },
        { label: 'Flaky', value: flaky, color: '#8B5CF6' }
      ];
      const visibleSlices = slices.filter(function (slice) {
        return slice.value > 0;
      });
      const subtitle = visibleSlices.length <= 2 && skipped === 0 && flaky === 0
        ? 'Passed vs failed tests'
        : 'Only statuses present in this run';
      const cx = 112;
      const cy = 82;
      const radius = 58;
      let startAngle = -90;

      function polar(angle, distance) {
        const radians = angle * Math.PI / 180;
        return {
          x: cx + distance * Math.cos(radians),
          y: cy + distance * Math.sin(radians)
        };
      }

      function slicePath(start, end) {
        const startPoint = polar(start, radius);
        const endPoint = polar(end, radius);
        const largeArc = end - start > 180 ? 1 : 0;
        return [
          'M', cx, cy,
          'L', startPoint.x.toFixed(2), startPoint.y.toFixed(2),
          'A', radius, radius, 0, largeArc, 1, endPoint.x.toFixed(2), endPoint.y.toFixed(2),
          'Z'
        ].join(' ');
      }

      const sliceMarkup = total ? slices.map(function (slice) {
        if (!slice.value) return '';
        const angle = (slice.value / total) * 360;
        const endAngle = startAngle + angle;
        const percent = Math.round((slice.value / total) * 100);
        const midAngle = startAngle + angle / 2;
        const labelPoint = polar(midAngle, radius * .58);
        const insideLabel = percent >= 12
          ? '<text class="classic-pie-label" x="' + labelPoint.x.toFixed(1) + '" y="' + labelPoint.y.toFixed(1) + '" dy="4">' + percent + '%</text>'
          : '';
        const markup = '<path class="classic-pie-slice" d="' + slicePath(startAngle, endAngle) + '" fill="' + slice.color + '"></path>' + insideLabel;
        startAngle = endAngle;
        return markup;
      }).join('') : '<circle cx="112" cy="82" r="58" fill="#E5E7EB"></circle>';

      const legendMarkup = visibleSlices.map(function (slice) {
        return '<div class="classic-pie-row" style="--sliceColor:' + slice.color + '">' +
          '<span class="classic-pie-dot"></span>' +
          '<span>' + slice.label + '</span>' +
          '<span class="classic-pie-count">' + slice.value + '</span>' +
        '</div>';
      }).join('') || '<div class="classic-pie-row">No result data</div>';

      return '<div class="classic-pie-card" role="img" aria-label="' + escapeAttr('Pie chart: ' + pctVal + '% passed') + '">' +
        '<h4 class="classic-pie-title">Result Distribution</h4>' +
        '<div class="classic-pie-subtitle">' + escapeHtml(subtitle) + '</div>' +
        '<div class="classic-pie-layout">' +
          '<svg class="classic-pie-svg" viewBox="0 0 224 176" aria-hidden="true">' +
            '<defs><filter id="pieDropShadow" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="7" stdDeviation="5" flood-color="#0F172A" flood-opacity=".18"/></filter></defs>' +
            '<ellipse cx="112" cy="146" rx="56" ry="10" fill="#CBD5E1" opacity=".32"></ellipse>' +
            sliceMarkup +
          '</svg>' +
          '<div class="classic-pie-legend">' + legendMarkup + '</div>' +
        '</div>' +
      '</div>';
    }

    function statusTile(label, count, total, color, tint) {
      return '<div class="status-row" style="--statusColor:' + color + ';--statusTint:' + tint + ';--statusPct:' + pct(count, total) + '%">' +
        '<span class="status-dot"></span>' +
        '<div class="status-row-main">' +
          '<div class="status-row-head">' +
            '<span class="status-name">' + escapeHtml(label) + '</span>' +
          '</div>' +
          '<div class="status-track"><div class="status-fill"></div></div>' +
        '</div>' +
        '<div class="status-metrics"><span class="status-count">' + count + '</span><span class="status-percent">' + pct(count, total) + '%</span></div>' +
      '</div>';
    }

    function getEnvironmentInfo(data) {
      const env = data.environment || data.env || data.metadata || {};

      return {
        os: env.os || env.OS || env.platform || 'Not captured',
        browser: env.browser || env.browserName || (data.projects || []).join(', ') || 'Not captured',
        playwright: env.playwright || env.playwrightVersion || 'Not captured',
        node: env.node || env.nodeVersion || 'Not captured'
      };
    }

    function getRunProjectLabel(data, env) {
      return data.projectName || data.appName || data.packageName || 'Not captured';
    }

    function renderTests(data) {
      testsBody.innerHTML = '';

      const filteredTests = (data.tests || []).filter(function (test) {
        const stepText = (test.steps || []).map(function (step) {
          return [
            step.title,
            step.category,
            step.error && step.error.message
          ].filter(Boolean).join(' ');
        }).join(' ');

        const searchableText = [
          test.title,
          Array.isArray(test.fullTitle) ? test.fullTitle.join(' ') : test.fullTitle,
          test.file,
          test.status,
          getTestProjectName(test),
          test.error && test.error.message,
          test.error && test.error.stack,
          stepText
        ].filter(Boolean).join(' ').toLowerCase();

        const statusMatch = selectedStatus === 'all' ||
          test.status === selectedStatus ||
          (selectedStatus === 'failed' && test.status === 'timedOut');
        const searchMatch = !searchText || searchableText.includes(searchText);

        return statusMatch && searchMatch;
      });

      if (!filteredTests.length) {
        testsBody.innerHTML = '<tr><td colspan="5" class="muted" style="text-align:center;padding:24px;">No tests found</td></tr>';
        return;
      }

      filteredTests.forEach(function (test) {
        const tr = document.createElement('tr');
        const testIndex = (data.tests || []).indexOf(test);

        tr.className = 'test-row';
        tr.setAttribute('data-test-title', test.title || '');
        tr.setAttribute('data-test-index', testIndex);

        const attachments = (test.attachments || []).map(function (a) {
          return renderAttachmentButton(a, true);
        }).join('');

        tr.innerHTML =
          '<td><div class="cell-content" title="' + escapeHtml(test.title || '') + '">' + escapeHtml(test.title || '') + '</div></td>' +
          '<td><span class="status-pill status-' + escapeHtml(test.status || '') + '">' + escapeHtml(test.status || '') + '</span></td>' +
          '<td>' + renderDefectTag(getDefectType(test)) + '</td>' +
          '<td class="mono"><div class="cell-content">' + durationLabel(test.durationMs) + '</div></td>' +
          '<td><div class="attachments">' + attachments + '</div></td>';

        tr.addEventListener('click', function () {
          renderDetails(test);
        });

        testsBody.appendChild(tr);
      });
    }

    function getDefectType(test) {
      return test.defectType || test.defectCategory || '';
    }

    function getDefectClass(type) {
      return 'defect-' + String(type || 'No Defect').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    }

    function renderDefectTag(type) {
      const label = type || '';
      if (!label) return '';

      return '<span class="defect-tag ' + escapeAttr(getDefectClass(label)) + '" title="' + escapeAttr(label) + '">' + escapeHtml(label) + '</span>';
    }

    function ensureDefectTypes(data) {
      (data.tests || []).forEach(function (test) {
        const defectType = getDefectType(test);
        if (defectType) test.defectType = defectType;
      });
      return data;
    }

    function setDefectType(index, defectType) {
      if (!currentData || !currentData.tests || !currentData.tests[index]) return;
      if (!defectTypes.includes(defectType)) return;

      const test = currentData.tests[index];
      test.defectType = defectType;
      renderTests(currentData);
      renderDetails(test);
    }

    function renderDefectSelector(test) {
      const testIndex = currentData && currentData.tests ? currentData.tests.indexOf(test) : -1;
      const selected = getDefectType(test);

      return '<div class="defect-selector">' +
        '<span class="detail-label">Defect Type</span>' +
        '<div class="defect-options">' +
          defectTypes.map(function (type) {
            const active = type === selected ? ' is-active' : '';
            return '<button type="button" class="defect-option ' + escapeAttr(getDefectClass(type)) + active + '" data-index="' + testIndex + '" data-defect="' + escapeAttr(type) + '">' + escapeHtml(type) + '</button>';
          }).join('') +
        '</div>' +
      '</div>';
    }

    function renderAttachmentButton(a, compact) {
      const name = a.name || 'attachment';

      if (!a.path) {
        return compact
          ? '<span class="attachment-muted" title="' + escapeAttr(name) + '">--</span>'
          : '<span class="muted" title="' + escapeAttr(name) + '">' + escapeHtml(name) + '</span>';
      }

      const href = '/attachment?p=' + encodeURIComponent(a.path);
      const type = getAttachmentType(a);

      if (type === 'image') {
        return '<button class="attachment-btn" title="View Screenshot" data-src="' + escapeAttr(href) + '" data-title="' + escapeAttr(name) + '" data-type="image">&#128247;</button>';
      }

      if (type === 'video') {
        return '<button class="attachment-btn" title="View Video" data-src="' + escapeAttr(href) + '" data-title="' + escapeAttr(name) + '" data-type="video">&#127909;</button>';
      }

      if (compact) {
        return '';
      }

      return '<a href="' + href + '" target="_blank" title="' + escapeAttr(name) + '" onclick="event.stopPropagation()">' + escapeHtml(name) + '</a>';
    }

    document.addEventListener('click', function (e) {
      const btn = e.target.closest('.attachment-btn');

      if (!btn) return;

      e.stopPropagation();

      openPreviewModal(
        btn.getAttribute('data-src'),
        btn.getAttribute('data-title'),
        btn.getAttribute('data-type')
      );
    });

    function getAttachmentType(a) {
      const name = String(a.name || '').toLowerCase();
      const contentType = String(a.contentType || '').toLowerCase();
      const filePath = String(a.path || '').toLowerCase();

      if (
        contentType.startsWith('image/') ||
        name.includes('screenshot') ||
        filePath.endsWith('.png') ||
        filePath.endsWith('.jpg') ||
        filePath.endsWith('.jpeg') ||
        filePath.endsWith('.webp')
      ) {
        return 'image';
      }

      if (
        contentType.startsWith('video/') ||
        name.includes('video') ||
        filePath.endsWith('.webm') ||
        filePath.endsWith('.mp4')
      ) {
        return 'video';
      }

      return 'file';
    }

    function openPreviewModal(src, title, type) {
      modalTitle.textContent = title || 'Preview';

      if (type === 'image') {
        modalBody.innerHTML = '<img src="' + escapeAttr(src) + '" alt="' + escapeAttr(title || 'screenshot') + '" />';
      } else if (type === 'video') {
        modalBody.innerHTML = '<video controls autoplay src="' + escapeAttr(src) + '"></video>';
      } else {
        modalBody.innerHTML = '<a href="' + escapeAttr(src) + '" target="_blank">Open attachment</a>';
      }

      previewModal.classList.add('open');
    }

    function closePreviewModal() {
      previewModal.classList.remove('open');
      modalBody.innerHTML = '';
    }

    function cleanErrorText(text) {
      const esc = String.fromCharCode(27);

      return String(text || '')
        .replace(new RegExp(esc + '\\\\[[0-9;]*m', 'g'), '')
        .replace(/\\\\u001b\\\\[[0-9;]*m/g, '')
        .trim();
    }

    function getSimpleError(errorText) {
      const clean = cleanErrorText(errorText);
      const expected = clean.match(/Expected pattern:\\s*(.*)/);
      const received = clean.match(/Received string:\\s*(.*)/);
      const timeout = clean.match(/Timeout:\\s*(.*)/);

      return {
        message: clean.split('\\n')[0] || 'Test failed',
        expected: expected ? expected[1].trim() : '',
        received: received ? received[1].trim() : '',
        timeout: timeout ? timeout[1].trim() : '',
        full: clean
      };
    }

    function explainFailure(test, simpleError) {
      const text = [
        simpleError.full,
        simpleError.message,
        test.title,
        test.file,
        (test.steps || []).map(function (step) {
          return [step.category, step.title, step.error && step.error.message].filter(Boolean).join(' ');
        }).join(' ')
      ].filter(Boolean).join('\\n');

      const lower = text.toLowerCase();
      const actionMatch = text.match(/((?:locator|getBy\\w+|page)\\([^\\n]*?\\)\\.(?:click|fill|check|uncheck|selectOption|press|hover|dblclick|tap|type)\\([^\\n]*?\\))/);
      const action = actionMatch
        ? actionMatch[1]
        : ((test.steps || []).slice().reverse().find(function (step) {
            return /click|fill|check|select|press|hover|tap|type/i.test(step.title || '');
          }) || {}).title || simpleError.message || 'Test action failed';

      const causes = [];

      function addCause(condition, label) {
        if (condition && !causes.includes(label)) causes.push(label);
      }

      addCause(/not visible|hidden|display:none|visibility|outside.*viewport|element is not visible/.test(lower), 'Element not visible');
      addCause(/timeout|timed out|exceeded/.test(lower), 'Timeout exceeded');
      addCause(/selector|locator|strict mode|resolved to|no element|not found|waiting for/.test(lower), 'Wrong selector or locator matched no element');
      addCause(/detached|closed|stale|not attached/.test(lower), 'Element changed or detached before the action');
      addCause(/disabled|not enabled|editable|readonly|read only/.test(lower), 'Element is disabled or not ready for input');
      addCause(/navigation|load state|networkidle|url|page closed/.test(lower), 'Page navigation or loading did not finish');
      addCause(/expected|received|tohave|assert|expect\\(/.test(lower), 'Expected value did not match actual result');

      if (!causes.length) {
        causes.push('Element not visible');
        causes.push('Timeout exceeded');
        causes.push('Wrong selector');
      }

      return {
        action: action,
        causes: causes.slice(0, 4)
      };
    }

    function renderDetails(test) {
      const el = document.getElementById('detailsContent');

      const simpleError = getSimpleError(test.error && (test.error.stack || test.error.message));
      const failureExplanation = explainFailure(test, simpleError);
      const fullTitle = Array.isArray(test.fullTitle) ? test.fullTitle.join(' > ') : (test.fullTitle || test.title || '');
      const projectName = getTestProjectName(test);
      const normalizedStatus = test.status || 'unknown';
      const summaryLabel = normalizedStatus === 'failed' || normalizedStatus === 'timedOut'
        ? 'Failed Test Case'
        : 'Selected Test Case';

      const steps = (test.steps || []).map(function (step) {
        const stepError = step.error
          ? '<div class="muted">Error: ' + escapeHtml(cleanErrorText(step.error.message || '')) + '</div>'
          : '';

        return '<li>' +
          '<span class="mono">' + escapeHtml(step.category || '') + '</span> – ' +
          escapeHtml(step.title || '') +
          '<span class="muted"> (' + ms(step.durationMs) + ')</span>' +
          stepError +
        '</li>';
      }).join('');

      const attachments = (test.attachments || []).map(function (a) {
        return renderAttachmentButton(a);
      }).join('');

      const errorBlock = test.error
        ? '<div class="failure-summary">' +
            '<h4>Failure Summary</h4>' +
            '<div class="failure-box">' +
              '<div><strong>Reason:</strong> ' + escapeHtml(simpleError.message) + '</div>' +
              (simpleError.expected ? '<div><strong>Expected:</strong> ' + escapeHtml(simpleError.expected) + '</div>' : '') +
              (simpleError.received ? '<div><strong>Received:</strong> ' + escapeHtml(simpleError.received) + '</div>' : '') +
              (simpleError.timeout ? '<div><strong>Timeout:</strong> ' + escapeHtml(simpleError.timeout) + '</div>' : '') +
            '</div>' +
            '<div class="failure-explanation">' +
              '<div class="failure-explanation-title">Failure Explanation</div>' +
              '<span class="failure-explanation-label">Error</span>' +
              '<div class="mono">' + escapeHtml(failureExplanation.action) + '</div>' +
              '<span class="failure-explanation-label">Possible Cause</span>' +
              '<ul class="failure-causes">' +
                failureExplanation.causes.map(function (cause) {
                  return '<li>' + escapeHtml(cause) + '</li>';
                }).join('') +
              '</ul>' +
            '</div>' +
            '<details style="margin-top:12px;">' +
              '<summary>Show full technical error</summary>' +
              '<pre class="muted" style="white-space:pre-wrap;margin-top:10px;font-size:12px;">' +
                escapeHtml(simpleError.full) +
              '</pre>' +
            '</details>' +
          '</div>'
        : '';

      const attemptLabel = test.retries != null ? String(test.retries + 1) : '1';

      el.innerHTML =
        '<div class="flex" style="margin-bottom:8px;">' +
          '<span class="status-pill status-' + escapeHtml(test.status || '') + '">' + escapeHtml(test.status || '') + '</span>' +
          '<span class="pill mono">' + durationLabel(test.durationMs || 0) + '</span>' +
          '<span class="pill">' + escapeHtml(projectName) + '</span>' +
        '</div>' +

        '<div class="detail-test-summary is-' + escapeAttr(normalizedStatus) + '">' +
          '<span class="detail-test-summary-label">' + escapeHtml(summaryLabel) + '</span>' +
          '<div class="detail-test-summary-title">' + escapeHtml(test.title || 'Untitled test') + '</div>' +
          '<div class="detail-test-summary-meta">' + escapeHtml(fullTitle || test.file || 'Not captured') + '</div>' +
        '</div>' +

        renderDefectSelector(test) +

        '<div class="detail-browser-banner">' +
          '<div>' +
            '<span class="detail-label">Browser / Project</span>' +
            '<div class="detail-browser-name">' + escapeHtml(projectName) + '</div>' +
          '</div>' +
          '<div class="muted">This test execution context</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<h4>Run Context</h4>' +
          '<div class="detail-grid">' +
            detailField('Browser / Project', projectName) +
            detailField('Report Run', currentData?.runId || 'Not captured') +
            detailField('Attempt', attemptLabel) +
            detailField('Expected Status', test.expectedStatus || 'Not captured') +
            detailField('Actual Status', test.status || 'Not captured') +
            detailField('Started', fmt(test.startedAt)) +
            detailField('Finished', fmt(test.finishedAt)) +
          '</div>' +
        '</div>' +

        '<div id="detailsTestHistory"></div>' +

        '<div class="detail-section">' +
          '<h4>Test Info</h4>' +
          '<div class="detail-grid">' +
            detailField('Title', test.title || 'Untitled test') +
            detailField('Suite / Full Title', fullTitle || 'Not captured') +
            detailField('File', test.file || 'Not captured', true) +
            detailField('Location', 'line ' + (test.line || '?') + ' col ' + (test.column || '?')) +
          '</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<h4>Attachments</h4>' +
          '<div class="attachments">' + (attachments || '<span class="muted">None</span>') + '</div>' +
        '</div>' +

        '<div class="detail-section">' +
          '<h4>Steps</h4>' +
          '<ul class="step-list">' + (steps || '<li class="muted">No step data</li>') + '</ul>' +
        '</div>' +

        errorBlock;

      renderTestHistory(test);
    }

    function getTestFullTitleText(test) {
      return String(Array.isArray(test.fullTitle)
        ? test.fullTitle.join(' > ')
        : (test.fullTitle || test.title || ''));
    }

    function getTestIdentityParts(test) {
      return {
        fullTitle: getTestFullTitleText(test).trim(),
        title: String(test.title || '').trim(),
        file: String(test.file || '').trim(),
        project: String(test.projectName || test.project || test.browserName || '').trim()
      };
    }

    function sameText(a, b) {
      return String(a || '').trim() === String(b || '').trim();
    }

    function findTestInRun(runData, selectedTest) {
      if (!runData || !Array.isArray(runData.tests)) return null;

      const target = getTestIdentityParts(selectedTest);

      return runData.tests.find(function (item) {
        const candidate = getTestIdentityParts(item);
        return sameText(candidate.fullTitle, target.fullTitle) &&
          sameText(candidate.file, target.file) &&
          (!target.project || !candidate.project || sameText(candidate.project, target.project));
      }) || runData.tests.find(function (item) {
        const candidate = getTestIdentityParts(item);
        return sameText(candidate.title, target.title) &&
          sameText(candidate.file, target.file) &&
          (!target.project || !candidate.project || sameText(candidate.project, target.project));
      }) || runData.tests.find(function (item) {
        const candidate = getTestIdentityParts(item);
        return sameText(candidate.fullTitle, target.fullTitle);
      }) || runData.tests.find(function (item) {
        const candidate = getTestIdentityParts(item);
        return sameText(candidate.title, target.title);
      }) || null;
    }

    function renderHistoryRow(entry) {
      const when = entry.test.startedAt || entry.test.finishedAt || entry.runMeta.startedAt || entry.runMeta.finishedAt;
      const status = entry.test.status || 'unknown';
      const currentClass = entry.isCurrent ? ' is-current' : '';
      const currentLabel = entry.isCurrent ? ' (current)' : '';
      const showReason = status === 'failed' || status === 'timedOut';
      const reason = showReason
        ? getSimpleError(entry.test.error && (entry.test.error.stack || entry.test.error.message)).message
        : '';

      return '<div class="history-row' + currentClass + '">' +
        '<div class="history-row-main">' +
          '<div class="history-run mono" title="' + escapeAttr(entry.runMeta.runId || '') + '">' +
            escapeHtml(entry.runMeta.runId || 'unknown') + currentLabel +
          '</div>' +
          '<span class="status-pill status-' + escapeAttr(status) + '">' + escapeHtml(status) + '</span>' +
          '<div class="mono">' + escapeHtml(durationLabel(entry.test.durationMs || 0)) + '</div>' +
          '<div class="history-date">' + escapeHtml(when ? fmt(when) : 'Unknown date') + '</div>' +
        '</div>' +
        (reason ? '<div class="history-reason"><strong>Why failed:</strong> ' + escapeHtml(reason) + '</div>' : '') +
      '</div>';
    }

    function renderTestHistory(test) {
      const container = document.getElementById('detailsTestHistory');
      if (!container) return;

      const runs = (availableRuns || []).slice(0, 10);
      const currentEntry = {
        runMeta: {
          runId: currentData?.runId || 'current run',
          startedAt: currentData?.startedAt,
          finishedAt: currentData?.finishedAt
        },
        test: test,
        isCurrent: true
      };

      container.innerHTML = '<div class="detail-section">' +
        '<h4>Previous Run History</h4>' +
        '<div class="muted" style="margin-bottom:10px;">Status for this same test case across recent runs.</div>' +
        '<div class="history-table">' +
          renderHistoryRow(currentEntry) +
        '</div>' +
        '<div class="history-empty" id="detailsTestHistoryLoading">Loading previous run history...</div>' +
      '</div>';

      if (!runs.length) {
        const loadingEl = document.getElementById('detailsTestHistoryLoading');
        if (loadingEl) loadingEl.textContent = 'No other recent runs available.';
        return;
      }

      Promise.all(runs.map(function (runMeta) {
        if (runMeta.runId === currentData?.runId && currentData) {
          return Promise.resolve({ runMeta: runMeta, data: currentData });
        }

        if (runDataCache[runMeta.runId]) {
          return Promise.resolve({ runMeta: runMeta, data: runDataCache[runMeta.runId] });
        }

        return fetch('/api/run/' + encodeURIComponent(runMeta.runId))
          .then(function (response) {
            return response.ok ? response.json() : null;
          })
          .then(function (data) {
            if (data) {
              runDataCache[runMeta.runId] = data;
              return { runMeta: runMeta, data: data };
            }
            return null;
          })
          .catch(function () {
            return null;
          });
      })).then(function (entries) {
        const history = entries
          .filter(Boolean)
          .map(function (entry) {
            const found = findTestInRun(entry.data, test);
            if (!found) return null;
            return {
              runMeta: entry.runMeta,
              test: found,
              isCurrent: entry.runMeta.runId === currentData?.runId
            };
          })
          .filter(Boolean);

        if (!history.length) {
          const loadingEl = document.getElementById('detailsTestHistoryLoading');
          if (loadingEl) loadingEl.textContent = 'No previous history found for this test case.';
          return;
        }

        history.sort(function (a, b) {
          return String(b.runMeta.startedAt || b.runMeta.finishedAt || '').localeCompare(String(a.runMeta.startedAt || a.runMeta.finishedAt || ''));
        });

        container.innerHTML = '<div class="detail-section">' +
          '<h4>Previous Run History</h4>' +
          '<div class="muted" style="margin-bottom:10px;">Status for this same test case across recent runs.</div>' +
          '<div class="history-table">' +
            history.map(renderHistoryRow).join('') +
          '</div>' +
        '</div>';
      }).catch(function () {
        container.innerHTML = '<div class="muted">Unable to load run history.</div>';
      });
    }

    function detailField(label, value, monoValue) {
      return '<div class="detail-field">' +
        '<span class="detail-label">' + escapeHtml(label) + '</span>' +
        '<div class="detail-value ' + (monoValue ? 'mono' : '') + '">' + escapeHtml(value || 'Not captured') + '</div>' +
      '</div>';
    }

    function getTestProjectName(test) {
      if (test.projectName) return test.projectName;
      if (test.project) return test.project;
      if (test.browserName) return test.browserName;

      const fullTitle = Array.isArray(test.fullTitle) ? test.fullTitle : [];
      const first = fullTitle[0];

      if (first && (currentData?.projects || []).includes(first)) return first;

      const inferred = inferProjectFromTestOrder(test);

      if (inferred) return inferred;

      return (currentData?.projects || []).length === 1
        ? currentData.projects[0]
        : 'Not captured';
    }

    function inferProjectFromTestOrder(test) {
      const projects = currentData?.projects || [];

      if (projects.length < 2 || !Array.isArray(currentData?.tests)) return '';

      const key = getTestIdentity(test);
      const matchingTests = currentData.tests.filter(function (item) {
        return getTestIdentity(item) === key;
      });
      const index = matchingTests.indexOf(test);

      if (index < 0) return '';

      return projects[index % projects.length] || '';
    }

    function getTestIdentity(test) {
      return [
        test.title || '',
        test.file || '',
        test.line || '',
        test.column || ''
      ].join('|');
    }

    function exportCurrentPdf() {
      if (!currentData) return;

      ensureDefectTypes(currentData);
      renderPrintReport(currentData);
      renderPrintFailures(currentData);
      window.print();
    }

    function exportCurrentJson() {
      if (!currentData) return;

      ensureDefectTypes(currentData);
      downloadFile(
        getExportName('json'),
        JSON.stringify(currentData, null, 2),
        'application/json'
      );
    }

    function exportCurrentDashboard() {
      if (!currentData) return;

      ensureDefectTypes(currentData);
      downloadFile(
        getExportName('html'),
        buildDashboardReport(currentData),
        'text/html'
      );
    }

    function exportCurrentExcel() {
      if (!currentData) return;

      ensureDefectTypes(currentData);
      downloadFile(
        getCsvExportName(),
        buildSimpleExcelCsv(currentData),
        'text/csv;charset=utf-8'
      );
    }

    function getExportName(ext) {
      return 'testreport-' + (currentData.runId || 'run') + '.' + ext;
    }

    function getCsvExportName() {
      return 'testreport-' + String(currentData.runId || 'run').replace(/[^a-zA-Z0-9_-]/g, '') + '.csv';
    }

    function downloadFile(fileName, content, type) {
      const blob = new Blob([content], { type: type });
      const href = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.href = href;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(href);
    }

    function csvCell(value) {
      return '"' + String(value || '').replace(/"/g, '""') + '"';
    }

    function buildDashboardReport(data) {
      const t = data.totals || {};
      const failedTests = getFailedTests(data);
      const slowestTests = getSlowestTestsForExport(data.tests || []);
      const issueSummary = getIssueSummary(failedTests);
      const env = getEnvironmentInfo(data);
      const total = t.tests || 0;
      const failedCount = (t.failed || 0) + (t.timedOut || 0);
      const passedPct = pct(t.passed || 0, total);
      const failedPct = pct(failedCount, total);
      const skippedPct = pct(t.skipped || 0, total);
      const flakyPct = pct(t.flaky || 0, total);

      return '<!doctype html><html><head><meta charset="UTF-8" />' +
        '<title>testreport dashboard</title>' +
        '<style>' +
          '*{box-sizing:border-box;}body{margin:0;background:#f4f8fd;color:#10233f;font-family:Arial,sans-serif;font-size:14px;line-height:1.35;}' +
          '.page{max-width:1280px;margin:0 auto;padding:24px;}' +
          '.top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px;}' +
          '.brand{display:flex;gap:12px;align-items:center;}.mark{width:48px;height:48px;border-radius:50%;background:#ffc107;display:flex;flex-direction:column;justify-content:center;gap:4px;padding:11px 9px 11px 17px;}.mark span{display:block;width:20px;height:4px;border-radius:999px;background:#9a6a00;position:relative;}.mark span:before{content:"";position:absolute;left:-8px;top:-1px;width:5px;height:8px;border-right:2px solid #9a6a00;border-bottom:2px solid #9a6a00;transform:rotate(45deg);}.brand h1{margin:0;font-size:34px;color:#20232d;}' +
          '.muted{color:#64748b;}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px;}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}' +
          '.card{background:#fff;border:1px solid #dbe6f3;border-radius:12px;padding:18px;box-shadow:0 10px 28px rgba(15,23,42,.08);}h2{margin:0 0 14px;color:#0f2f57;font-size:20px;}h3{margin:0 0 8px;font-size:16px;}' +
          '.metric{font-size:30px;font-weight:900;margin-top:5px;}.pass{color:#0f2f57;}.fail{color:#d97706;}.warn{color:#d97706;}.purple{color:#0f2f57;}' +
          '.status-bars{display:grid;gap:10px;}.bar-row{display:grid;grid-template-columns:85px 1fr 52px;gap:8px;align-items:center;}.track{height:14px;background:#eff6ff;border-radius:999px;overflow:hidden;}.bar{height:100%;border-radius:999px;}.green{background:#0f2f57;}.red{background:#f59e0b;}.yellow{background:#f59e0b;}.violet{background:#eff6ff;}' +
          '.slow-row,.issue-row{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid #f59e0b;padding:8px 0;}.rank{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#fef3c7;color:#d97706;font-weight:900;}' +
          '.failure{border-left:5px solid #f59e0b;background:#fff;border-radius:8px;padding:12px;margin-bottom:10px;}.failure-title{font-weight:900;margin-bottom:8px;}.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}' +
          'table{width:100%;border-collapse:separate;border-spacing:0;background:#fff;table-layout:fixed;}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:12px 10px;vertical-align:top;}th{background:#eef5ff;color:#0f2f57;font-size:12px;text-transform:uppercase;letter-spacing:.02em;}tr:nth-child(even) td{background:#fafcff;}tr:hover td{background:#f8fbff;}.col-priority{width:74px;}.col-test{width:36%;}.col-status{width:112px;}.col-defect{width:132px;}.col-duration{width:86px;}.col-issue{width:130px;}.col-action{width:160px;}.col-file{width:160px;}.badge{display:inline-flex;align-items:center;justify-content:center;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800;line-height:1.1;white-space:nowrap;border:1px solid transparent;}.badge-pass{background:#ecfdf5;color:#059669;border-color:#a7f3d0;}.badge-fail{background:#fef2f2;color:#dc2626;border-color:#fecaca;}.badge-warn{background:#fffbeb;color:#d97706;border-color:#fde68a;}.defect-badge{display:inline-flex;max-width:118px;align-items:center;justify-content:center;border-radius:999px;padding:5px 10px;font-size:12px;font-weight:800;line-height:1.15;white-space:normal;text-align:center;border:1px solid #e2e8f0;color:#64748b;background:#f8fafc;}.defect-product-bug{background:#fef2f2;color:#dc2626;border-color:#fecaca;}.defect-automation-bug{background:#eff6ff;color:#2563eb;border-color:#bfdbfe;}.defect-no-defect{background:#f0fdf4;color:#16a34a;border-color:#bbf7d0;}.defect-to-investigate{background:#fffbeb;color:#d97706;border-color:#fde68a;}.defect-environment-issue{background:#f5f3ff;color:#7c3aed;border-color:#ddd6fe;}' +
          '@media(max-width:800px){.grid,.two,.cols{grid-template-columns:1fr;}.top{align-items:flex-start;flex-direction:column;}}' +
        '</style></head><body><div class="page">' +
          '<div class="top"><div class="brand"><div class="mark"><span></span><span></span><span></span></div><div><h1>testreport</h1><div class="muted">Run ID: ' + escapeHtml(data.runId || '') + '</div></div></div><div class="muted">Generated: ' + escapeHtml(new Date().toLocaleString()) + '</div></div>' +
          '<div class="grid">' +
            dashboardMetric('Total tests', total, '') +
            dashboardMetric('Passed', t.passed || 0, 'pass') +
            dashboardMetric('Failed', failedCount, 'fail') +
            dashboardMetric('Pass rate', passedPct + '%', 'pass') +
          '</div>' +
          '<div class="two">' +
            '<div class="card"><h2>Status Chart Data</h2><div class="status-bars">' +
              dashboardBar('Passed', passedPct, 'green') +
              dashboardBar('Failed', failedPct, 'red') +
              dashboardBar('Skipped', skippedPct, 'yellow') +
              dashboardBar('Flaky', flakyPct, 'violet') +
            '</div></div>' +
            '<div class="card"><h2>Slowest Tests</h2>' +
              (slowestTests.length ? slowestTests.map(function (test, index) {
                return '<div class="slow-row"><div class="rank">' + (index + 1) + '</div><div><strong>' + escapeHtml(test.title || 'Untitled test') + '</strong><div class="muted">' + escapeHtml(shortFile(test.file || '')) + '</div></div><strong>' + durationLabel(test.durationMs || 0) + '</strong></div>';
              }).join('') : '<div class="muted">No duration data found.</div>') +
            '</div>' +
          '</div>' +
          '<div class="two">' +
            '<div class="card"><h2>Main Issue Summary</h2>' +
              (issueSummary.length ? issueSummary.map(function (item, index) {
                return '<div class="issue-row"><div class="rank">' + (index + 1) + '</div><div><strong>' + escapeHtml(shortCsvText(item.cause)) + '</strong><div class="muted">' + escapeHtml(shortCsvText(getSuggestedFixes([item.cause])[0] || 'Review failure details')) + '</div></div><strong>' + item.count + '</strong></div>';
              }).join('') : '<div class="muted">No main issues found.</div>') +
            '</div>' +
            '<div class="card"><h2>Environment</h2><table><tr><th>OS</th><td>' + escapeHtml(env.os) + '</td></tr><tr><th>Browser</th><td>' + escapeHtml(env.browser) + '</td></tr><tr><th>Playwright</th><td>' + escapeHtml(env.playwright) + '</td></tr><tr><th>Node</th><td>' + escapeHtml(env.node) + '</td></tr></table></div>' +
          '</div>' +
          '<div class="card"><h2>Failed Tests</h2>' +
            (failedTests.length ? failedTests.map(function (test) {
              const summary = getFailureExportSummary(test);
              return '<div class="failure"><div class="failure-title">' + escapeHtml(test.title || 'Untitled test') + ' <span class="fail">(' + escapeHtml(test.status || '') + ')</span></div><div class="cols"><div><h3>Defect Type</h3>' + renderExportDefectBadge(getDefectType(test)) + '</div><div><h3>Why Failed</h3>' + escapeHtml(shortCsvText(summary.causes[0] || '-')) + '</div><div><h3>What To Do</h3>' + escapeHtml(shortCsvText(summary.fixes[0] || '-')) + '</div></div><div style="margin-top:10px;"><strong>Problem:</strong> ' + escapeHtml(summary.problem) + '</div></div>';
            }).join('') : '<div class="muted">No failed tests found.</div>') +
          '</div>' +
          '<div class="card" style="margin-top:16px;"><h2>All Test Run Details</h2>' + dashboardTestTable(getSortedTestsForExport(data.tests || [])) + '</div>' +
        '</div></body></html>';
    }

    function dashboardMetric(label, value, cls) {
      return '<div class="card"><div class="muted">' + escapeHtml(label) + '</div><div class="metric ' + cls + '">' + escapeHtml(value) + '</div></div>';
    }

    function dashboardBar(label, value, cls) {
      return '<div class="bar-row"><strong>' + escapeHtml(label) + '</strong><div class="track"><div class="bar ' + cls + '" style="width:' + value + '%"></div></div><strong>' + value + '%</strong></div>';
    }

    function renderExportStatusBadge(status, statusClass) {
      return '<span class="badge badge-' + escapeAttr(statusClass || 'warn') + '">' + escapeHtml(status || 'unknown') + '</span>';
    }

    function renderExportDefectBadge(type) {
      if (!type) return '<span class="muted">Not selected</span>';

      return '<span class="defect-badge ' + escapeAttr(getDefectClass(type)) + '">' + escapeHtml(type) + '</span>';
    }

    function dashboardTestTable(tests) {
      return '<table><tr><th class="col-priority">Priority</th><th class="col-test">Test</th><th class="col-status">Status</th><th class="col-defect">Defect Type</th><th class="col-duration">Duration</th><th class="col-issue">Issue</th><th class="col-action">Recommended Action</th><th class="col-file">File</th></tr>' +
        tests.map(function (test) {
          const isFailed = test.error || test.status === 'failed' || test.status === 'timedOut';
          const summary = isFailed ? getFailureExportSummary(test) : { causes: [getStatusIssue(test)], fixes: [getStatusAction(test)] };
          const statusClass = test.status === 'passed' ? 'pass' : (isFailed ? 'fail' : 'warn');

          return '<tr><td>' + escapeHtml(getExportPriority(test)) + '</td><td>' + escapeHtml(test.title || 'Untitled test') + '</td><td>' + renderExportStatusBadge(test.status || '', statusClass) + '</td><td>' + renderExportDefectBadge(getDefectType(test)) + '</td><td>' + durationLabel(test.durationMs || 0) + '</td><td>' + escapeHtml(shortCsvText(summary.causes[0] || '-')) + '</td><td>' + escapeHtml(shortCsvText(summary.fixes[0] || '-')) + '</td><td>' + escapeHtml(shortFile(test.file || '')) + '</td></tr>';
        }).join('') +
      '</table>';
    }

    function buildCleanCsvReport(data) {
      const t = data.totals || {};
      const failedTests = getFailedTests(data);
      const passedTests = getPassedTests(data);
      const rows = [
        ['TESTREPORT SUMMARY'],
        ['Run ID', data.runId || ''],
        ['Result', (t.passed || 0) + '/' + (t.tests || 0) + ' passed'],
        ['Failed', (t.failed || 0) + (t.timedOut || 0)],
        ['Skipped', t.skipped || 0],
        ['Flaky', t.flaky || 0],
        ['Duration', durationLabel(t.durationMs || 0)],
        [],
        ['FAILED TESTS'],
        ['Test', 'Status', 'Defect Type', 'Duration', 'Problem', 'Why Failed', 'What To Do']
      ];

      if (failedTests.length) {
        failedTests.forEach(function (test) {
          const summary = getFailureExportSummary(test);

          rows.push([
            test.title || 'Untitled test',
            test.status || '',
            getDefectType(test),
            durationLabel(test.durationMs || 0),
            shortCsvText(summary.problem),
            shortCsvText(summary.causes[0] || '-'),
            shortCsvText(summary.fixes[0] || '-')
          ]);
        });
      } else {
        rows.push(['No failed tests']);
      }

      rows.push(
        [],
        ['PASSED TESTS'],
        ['Test', 'Status', 'Defect Type', 'Duration', 'File']
      );

      if (passedTests.length) {
        passedTests.forEach(function (test) {
          rows.push([
            test.title || 'Untitled test',
            test.status || '',
            getDefectType(test),
            durationLabel(test.durationMs || 0),
            shortFile(test.file || '')
          ]);
        });
      } else {
        rows.push(['No passed tests']);
      }

      rows.push(
        [],
        ['ALL TEST DETAILS'],
        ['Test', 'Status', 'Defect Type', 'Duration', 'File']
      );

      (data.tests || []).forEach(function (test) {
        rows.push([
          test.title || 'Untitled test',
          test.status || '',
          getDefectType(test),
          durationLabel(test.durationMs || 0),
          shortFile(test.file || '')
        ]);
      });

      return '\\ufeff' + rows.map(function (row) {
        return row.map(csvCell).join(',');
      }).join('\\n');
    }

    function shortCsvText(text) {
      return String(text || '')
        .replace('Increase wait time or check why the page is slow.', 'Check wait/page speed')
        .replace('Verify selector and make it unique.', 'Check selector')
        .replace('Check expected value against actual application result.', 'Check expected result')
        .replace('Wrong selector or locator matched no element', 'Wrong selector')
        .replace('Expected value did not match actual result', 'Expected result mismatch');
    }

    function buildSimpleExcelCsv(data) {
      const t = data.totals || {};
      const failedTests = getFailedTests(data);
      const issueSummary = getIssueSummary(failedTests);
      const sortedTests = getSortedTestsForExport(data.tests || []);
      const rows = [
        ['sep=,'],
        ['testreport - Run Summary'],
        ['Run ID', 'Started', 'Finished', 'Result', 'Total', 'Passed', 'Failed', 'Skipped', 'Flaky', 'Duration', 'Pass %', 'Projects'],
        [
          csvTextValue(data.runId || ''),
          fmt(data.startedAt),
          fmt(data.finishedAt),
          (t.passed || 0) + '/' + (t.tests || 0) + ' passed',
          t.tests || 0,
          t.passed || 0,
          (t.failed || 0) + (t.timedOut || 0),
          t.skipped || 0,
          t.flaky || 0,
          durationLabel(t.durationMs || 0),
          pct(t.passed || 0, t.tests || 0) + '%',
          (data.projects || []).join(' / ')
        ],
        [],
        ['Test Results'],
        ['Priority', 'Test', 'Status', 'Defect Type', 'Duration', 'Issue', 'Recommended Action', 'File', 'Started', 'Finished', 'Location']
      ];

      sortedTests.forEach(function (test) {
        const isFailed = test.error || test.status === 'failed' || test.status === 'timedOut';
        const summary = isFailed
          ? getFailureExportSummary(test)
          : {
              causes: [getStatusIssue(test)],
              fixes: [getStatusAction(test)]
            };

        rows.push([
          getExportPriority(test),
          test.title || 'Untitled test',
          test.status || '',
          getDefectType(test),
          durationLabel(test.durationMs || 0),
          shortCsvText(summary.causes[0] || '-'),
          shortCsvText(summary.fixes[0] || '-'),
          shortFile(test.file || ''),
          fmt(test.startedAt),
          fmt(test.finishedAt),
          getTestLocation(test)
        ]);
      });

      rows.push(
        [],
        ['Quick Insights'],
        ['Insight', 'Value', 'Details']
      );

      const slowestTests = getSlowestTestsForExport(data.tests || []);

      if (slowestTests.length) {
        const slowest = slowestTests[0];

        rows.push(['Slowest Test', slowest.title || 'Untitled test', durationLabel(slowest.durationMs || 0)]);
      }

      if (issueSummary.length) {
        rows.push(['Main Issue', shortCsvText(issueSummary[0].cause), issueSummary[0].count + ' affected']);
      } else {
        rows.push(['Main Issue', 'No main issues found', '']);
      }

      rows.push(
        ['Pie Chart', 'Passed ' + pct(t.passed || 0, t.tests || 0) + '%', 'Green'],
        ['Pie Chart', 'Failed ' + pct((t.failed || 0) + (t.timedOut || 0), t.tests || 0) + '%', 'Red'],
        ['Pie Chart', 'Skipped ' + pct(t.skipped || 0, t.tests || 0) + '%', 'Yellow'],
        ['Pie Chart', 'Flaky ' + pct(t.flaky || 0, t.tests || 0) + '%', 'Purple']
      );

      return '\\ufeff' + rows.map(csvRow).join('\\n');
    }

    function csvTextValue(value) {
      return '="' + String(value || '').replace(/"/g, '""') + '"';
    }

    function csvRow(row) {
      if (row.length === 1 && row[0] === 'sep=,') return 'sep=,';

      return row.map(csvCell).join(',');
    }

    function getSlowestTestsForExport(tests) {
      return (tests || [])
        .filter(function (test) {
          return Number(test.durationMs || 0) > 0;
        })
        .sort(function (a, b) {
          return Number(b.durationMs || 0) - Number(a.durationMs || 0);
        })
        .slice(0, 5);
    }

    function getSortedTestsForExport(tests) {
      const weight = {
        failed: 1,
        timedOut: 1,
        flaky: 2,
        skipped: 3,
        passed: 4
      };

      return (tests || []).slice().sort(function (a, b) {
        const aWeight = weight[a.status] || 5;
        const bWeight = weight[b.status] || 5;

        if (aWeight !== bWeight) return aWeight - bWeight;

        return Number(b.durationMs || 0) - Number(a.durationMs || 0);
      });
    }

    function getExportPriority(test) {
      if (test.status === 'failed' || test.status === 'timedOut' || test.error) return 'High';
      if (test.status === 'flaky') return 'Medium';
      if (test.status === 'skipped') return 'Review';

      return 'OK';
    }

    function getPassedCategory(test) {
      if (test.status === 'passed') return 'Passed';
      if (test.status === 'skipped') return 'Skipped';
      if (test.status === 'flaky') return 'Flaky';

      return 'Review';
    }

    function getStatusIssue(test) {
      if (test.status === 'passed') return 'Test passed';
      if (test.status === 'skipped') return 'Test skipped';
      if (test.status === 'flaky') return 'Intermittent result';

      return 'Needs review';
    }

    function getStatusAction(test) {
      if (test.status === 'passed') return 'No action needed';
      if (test.status === 'skipped') return 'Check why test was skipped';
      if (test.status === 'flaky') return 'Review retries and stabilize test';

      return 'Review test details';
    }

    function getTestLocation(test) {
      return 'line ' + (test.line || '?') + ', col ' + (test.column || '?');
    }

    function buildExcelXmlReport(data) {
      const t = data.totals || {};
      const env = getEnvironmentInfo(data);
      const failedTests = getFailedTests(data);
      const passedTests = getPassedTests(data);
      const failedCount = (t.failed || 0) + (t.timedOut || 0);

      return '<?xml version="1.0"?>' +
        '<?mso-application progid="Excel.Sheet"?>' +
        '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">' +
          '<Styles>' +
            '<Style ss:ID="Title"><Font ss:Bold="1" ss:Size="22" ss:Color="#0F2F57"/></Style>' +
            '<Style ss:ID="Section"><Font ss:Bold="1" ss:Size="14" ss:Color="#0F2F57"/><Interior ss:Color="#FFF7D6" ss:Pattern="Solid"/></Style>' +
            '<Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#0F2F57" ss:Pattern="Solid"/></Style>' +
            '<Style ss:ID="Label"><Font ss:Bold="1"/><Interior ss:Color="#EFF6FF" ss:Pattern="Solid"/></Style>' +
            '<Style ss:ID="Pass"><Font ss:Bold="1" ss:Color="#0F2F57"/></Style>' +
            '<Style ss:ID="Fail"><Font ss:Bold="1" ss:Color="#D97706"/></Style>' +
            '<Style ss:ID="Text"><NumberFormat ss:Format="@"/></Style>' +
            '<Style ss:ID="Wrap"><Alignment ss:Vertical="Top" ss:WrapText="1"/></Style>' +
          '</Styles>' +
          '<Worksheet ss:Name="testreport">' +
            '<Table>' +
              '<Column ss:Width="170"/><Column ss:Width="120"/><Column ss:Width="90"/><Column ss:Width="170"/><Column ss:Width="180"/><Column ss:Width="190"/><Column ss:Width="160"/>' +
              '<Row><Cell ss:StyleID="Title" ss:MergeAcross="3"><Data ss:Type="String">testreport</Data></Cell><Cell ss:StyleID="Label"><Data ss:Type="String">Generated</Data></Cell><Cell ss:MergeAcross="1"><Data ss:Type="String">' + xmlEscape(new Date().toLocaleString()) + '</Data></Cell></Row>' +
              '<Row/>' +
              '<Row><Cell ss:StyleID="Section" ss:MergeAcross="6"><Data ss:Type="String">Summary</Data></Cell></Row>' +
              '<Row><Cell ss:StyleID="Label"><Data ss:Type="String">Run ID</Data></Cell><Cell ss:StyleID="Text" ss:MergeAcross="2"><Data ss:Type="String">' + xmlEscape(data.runId || '') + '</Data></Cell><Cell ss:StyleID="Label"><Data ss:Type="String">Duration</Data></Cell><Cell ss:MergeAcross="1"><Data ss:Type="String">' + xmlEscape(durationLabel(t.durationMs || 0)) + '</Data></Cell></Row>' +
              '<Row><Cell ss:StyleID="Label"><Data ss:Type="String">Total</Data></Cell><Cell><Data ss:Type="Number">' + (t.tests || 0) + '</Data></Cell><Cell ss:StyleID="Label"><Data ss:Type="String">Passed</Data></Cell><Cell ss:StyleID="Pass"><Data ss:Type="Number">' + (t.passed || 0) + '</Data></Cell><Cell ss:StyleID="Label"><Data ss:Type="String">Failed</Data></Cell><Cell ss:StyleID="Fail"><Data ss:Type="Number">' + failedCount + '</Data></Cell></Row>' +
              '<Row><Cell ss:StyleID="Label"><Data ss:Type="String">Skipped</Data></Cell><Cell><Data ss:Type="Number">' + (t.skipped || 0) + '</Data></Cell><Cell ss:StyleID="Label"><Data ss:Type="String">Flaky</Data></Cell><Cell><Data ss:Type="Number">' + (t.flaky || 0) + '</Data></Cell><Cell ss:StyleID="Label"><Data ss:Type="String">Result</Data></Cell><Cell><Data ss:Type="String">' + (t.passed || 0) + '/' + (t.tests || 0) + ' passed</Data></Cell></Row>' +
              '<Row/>' +
              '<Row><Cell ss:StyleID="Section" ss:MergeAcross="6"><Data ss:Type="String">Failed Tests</Data></Cell></Row>' +
              excelHeaderRow(['Test', 'Status', 'Duration', 'Problem', 'Why Failed', 'What To Do', 'File']) +
              (failedTests.length ? failedTests.map(function (test) {
                const summary = getFailureExportSummary(test);

                return excelRow([
                  test.title || 'Untitled test',
                  test.status || '',
                  durationLabel(test.durationMs || 0),
                  summary.problem,
                  shortCsvText(summary.causes[0] || '-'),
                  shortCsvText(summary.fixes[0] || '-'),
                  shortFile(test.file || '')
                ], test.status === 'passed' ? 'Pass' : 'Fail');
              }).join('') : excelRow(['No failed tests', '', '', '', '', '', ''])) +
              '<Row/>' +
              '<Row><Cell ss:StyleID="Section" ss:MergeAcross="6"><Data ss:Type="String">Passed Tests</Data></Cell></Row>' +
              excelHeaderRow(['Test', 'Status', 'Duration', 'File']) +
              (passedTests.length ? passedTests.map(function (test) {
                return excelRow([
                  test.title || 'Untitled test',
                  test.status || '',
                  durationLabel(test.durationMs || 0),
                  shortFile(test.file || '')
                ], 'Pass');
              }).join('') : excelRow(['No passed tests', '', '', ''])) +
              '<Row/>' +
              '<Row><Cell ss:StyleID="Section" ss:MergeAcross="6"><Data ss:Type="String">All Test Details</Data></Cell></Row>' +
              excelHeaderRow(['Test', 'Status', 'Duration', 'File']) +
              (data.tests || []).map(function (test) {
                return excelRow([
                  test.title || 'Untitled test',
                  test.status || '',
                  durationLabel(test.durationMs || 0),
                  shortFile(test.file || '')
                ], test.status === 'passed' ? 'Pass' : (test.status === 'failed' || test.status === 'timedOut' ? 'Fail' : ''));
              }).join('') +
              '<Row/>' +
              '<Row><Cell ss:StyleID="Section" ss:MergeAcross="6"><Data ss:Type="String">Environment</Data></Cell></Row>' +
              excelHeaderRow(['OS', 'Browser', 'Playwright', 'Node']) +
              excelRow([env.os, env.browser, env.playwright, env.node]) +
            '</Table>' +
          '</Worksheet>' +
        '</Workbook>';
    }

    function excelHeaderRow(values) {
      return '<Row>' + values.map(function (value) {
        return '<Cell ss:StyleID="Header"><Data ss:Type="String">' + xmlEscape(value) + '</Data></Cell>';
      }).join('') + '</Row>';
    }

    function excelRow(values, statusStyle) {
      return '<Row>' + values.map(function (value, index) {
        const style = index === 1 && statusStyle ? statusStyle : 'Wrap';

        return '<Cell ss:StyleID="' + style + '"><Data ss:Type="String">' + xmlEscape(value) + '</Data></Cell>';
      }).join('') + '</Row>';
    }

    function buildExcelReport(data) {
      const t = data.totals || {};
      const env = getEnvironmentInfo(data);
      const failedTests = getFailedTests(data);

      return '<html><head><meta charset="UTF-8" />' +
        '<style>' +
          'body{font-family:Arial,sans-serif;color:#1f2937;font-size:12pt;}' +
          'h1{color:#0f2f57;font-size:22pt;margin-bottom:8px;}' +
          'h2{color:#0f2f57;font-size:15pt;margin:18px 0 8px;}' +
          'table{border-collapse:collapse;width:900px;margin-bottom:14px;}' +
          'th{background:#0f2f57;color:#fff;font-weight:700;}' +
          'th,td{border:1px solid #cbd5e1;padding:8px 10px;vertical-align:top;}' +
          '.label{background:#eff6ff;font-weight:700;width:180px;}' +
          '.text{mso-number-format:"\\@";}' +
          '.pass{color:#0f2f57;font-weight:700;}' +
          '.fail{color:#d97706;font-weight:700;}' +
          '.warn{color:#d97706;font-weight:700;}' +
        '</style></head><body>' +
        '<h1>Test Report</h1>' +
        '<table>' +
          '<tr><td class="label">Run ID</td><td class="text">' + escapeHtml(data.runId || '') + '</td></tr>' +
          '<tr><td class="label">Result</td><td><span class="pass">' + (t.passed || 0) + '</span> / ' + (t.tests || 0) + ' passed</td></tr>' +
          '<tr><td class="label">Failed</td><td class="fail">' + ((t.failed || 0) + (t.timedOut || 0)) + '</td></tr>' +
          '<tr><td class="label">Skipped</td><td>' + (t.skipped || 0) + '</td></tr>' +
          '<tr><td class="label">Flaky</td><td>' + (t.flaky || 0) + '</td></tr>' +
          '<tr><td class="label">Duration</td><td>' + durationLabel(t.durationMs || 0) + '</td></tr>' +
        '</table>' +
        '<h2>Failed Tests</h2>' +
        buildSimpleFailureTable(failedTests) +
        '<h2>All Tests</h2>' +
        '<table>' +
          '<tr><th>Test</th><th>Status</th><th>Duration</th></tr>' +
          (data.tests || []).map(function (test) {
            return '<tr>' +
              '<td>' + escapeHtml(test.title || 'Untitled test') + '</td>' +
              '<td>' + escapeHtml(test.status || '') + '</td>' +
              '<td>' + durationLabel(test.durationMs || 0) + '</td>' +
            '</tr>';
          }).join('') +
        '</table>' +
        '<h2>Environment</h2>' +
        '<table>' +
          '<tr><td class="label">OS</td><td>' + escapeHtml(env.os) + '</td></tr>' +
          '<tr><td class="label">Browser</td><td>' + escapeHtml(env.browser) + '</td></tr>' +
          '<tr><td class="label">Playwright</td><td class="text">' + escapeHtml(env.playwright) + '</td></tr>' +
          '<tr><td class="label">Node</td><td class="text">' + escapeHtml(env.node) + '</td></tr>' +
        '</table>' +
      '</body></html>';
    }

    function buildSimpleFailureTable(failedTests) {
      if (!failedTests.length) {
        return '<p>No failed tests found.</p>';
      }

      return '<table>' +
        '<tr><th>Test</th><th>Problem</th><th>Why Failed</th><th>What To Do</th></tr>' +
        failedTests.map(function (test) {
          const summary = getFailureExportSummary(test);

          return '<tr>' +
            '<td>' + escapeHtml(test.title || 'Untitled test') + '</td>' +
            '<td class="fail">' + escapeHtml(summary.problem) + '<br><span class="warn">' + durationLabel(test.durationMs || 0) + '</span></td>' +
            '<td>' + htmlLines(summary.causes) + '</td>' +
            '<td>' + htmlLines(summary.fixes) + '</td>' +
          '</tr>';
        }).join('') +
      '</table>';
    }

    function htmlLines(items) {
      return (items || []).map(function (item) {
        return escapeHtml(item);
      }).join('<br>');
    }

    function buildPdfReport(data) {
      const t = data.totals || {};
      const env = getEnvironmentInfo(data);
      const failedTests = getFailedTests(data);
      const passedTests = getPassedTests(data);
      const failedCount = (t.failed || 0) + (t.timedOut || 0);
      const issueSummary = getIssueSummary(failedTests);

      return '<!doctype html><html><head><meta charset="UTF-8" />' +
        '<title>testreport</title>' +
        '<style>' +
          '@page{margin:16mm;}' +
          '*{box-sizing:border-box;}' +
          'body{font-family:Arial,sans-serif;color:#10233f;margin:0;background:#f6fbff;font-size:11px;line-height:1.35;}' +
          '.page{max-width:760px;margin:0 auto;background:#fff;padding:18px 20px;border:1px solid #d7e4f6;}' +
          'h1{font-size:25px;margin:0;color:#101828;}' +
          'h2{font-size:16px;margin:16px 0 8px;color:#0f2f57;}' +
          '.top{display:flex;justify-content:space-between;gap:16px;border-bottom:3px solid #ffc107;padding-bottom:10px;margin-bottom:12px;}' +
          '.brand{display:flex;align-items:center;gap:10px;}' +
          '.mark{width:38px;height:38px;border-radius:50%;background:#ffc107;display:flex;flex-direction:column;justify-content:center;gap:3px;padding:9px 8px 9px 14px;}.mark span{display:block;width:16px;height:3px;border-radius:999px;background:#9a6a00;position:relative;}.mark span:before{content:"";position:absolute;left:-7px;top:-1px;width:4px;height:7px;border-right:2px solid #9a6a00;border-bottom:2px solid #9a6a00;transform:rotate(45deg);}' +
          '.muted{color:#64748b;}' +
          '.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;}' +
          '.box{border:1px solid #d7e4f6;border-radius:8px;padding:9px;background:#fff;break-inside:avoid;}' +
          '.label{font-size:10px;text-transform:uppercase;color:#64748b;font-weight:700;}' +
          '.value{font-size:17px;font-weight:800;margin-top:2px;}' +
          '.pass{color:#0f2f57;}.fail{color:#d97706;}.warn{color:#d97706;}' +
          '.issue-list{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}' +
          '.issue{border:1px solid #f4bf36;border-radius:8px;padding:8px;background:#fff;}' +
          '.failure{border:1px solid #f4bf36;border-left:5px solid #f4bf36;border-radius:8px;padding:9px;margin-bottom:7px;break-inside:avoid;}' +
          '.failure h3{font-size:13px;margin:0 0 6px;color:#10233f;}' +
          '.cols{display:grid;grid-template-columns:1fr 1fr 1.2fr;gap:8px;}' +
          'ul{margin:4px 0 0;padding-left:15px;}' +
          'table{border-collapse:collapse;width:100%;}' +
          'th,td{border:1px solid #d7e4f6;padding:5px 6px;text-align:left;vertical-align:top;}' +
          'th{background:#eff6ff;color:#0f2f57;}' +
          '.section-break{break-before:page;}' +
          '.status{font-weight:800;text-transform:capitalize;}' +
          '@media(max-width:700px){.summary,.cols,.issue-list{grid-template-columns:1fr;}}' +
        '</style></head><body><div class="page">' +
        '<div class="top">' +
          '<div class="brand"><div class="mark"><span></span><span></span><span></span></div><div><h1>testreport</h1><div class="muted">Run ID: ' + escapeHtml(data.runId || '') + '</div></div></div>' +
          '<div class="muted">Generated: ' + escapeHtml(new Date().toLocaleString()) + '</div>' +
        '</div>' +
        '<div class="summary">' +
          '<div class="box"><div class="label">Result</div><div class="value">' + (t.passed || 0) + '/' + (t.tests || 0) + ' passed</div></div>' +
          '<div class="box"><div class="label">Failed</div><div class="value fail">' + failedCount + '</div></div>' +
          '<div class="box"><div class="label">Skipped / Flaky</div><div class="value warn">' + (t.skipped || 0) + ' / ' + (t.flaky || 0) + '</div></div>' +
          '<div class="box"><div class="label">Duration</div><div class="value">' + durationLabel(t.durationMs || 0) + '</div></div>' +
        '</div>' +
        '<h2>Main Issue Summary</h2>' +
        (issueSummary.length ? '<div class="issue-list">' + issueSummary.map(function (item) {
          return '<div class="issue"><strong>' + escapeHtml(item.cause) + '</strong><br><span class="muted">' + item.count + ' failed test' + (item.count === 1 ? '' : 's') + '</span></div>';
        }).join('') + '</div>' : '<p class="muted">No main issues found.</p>') +
        '<h2>Failed Tests</h2>' +
        (failedTests.length ? failedTests.map(function (test) {
          const summary = getFailureExportSummary(test);

          return '<div class="failure">' +
            '<h3>' + escapeHtml(test.title || 'Untitled test') + ' <span class="fail">(' + escapeHtml(test.status || 'failed') + ')</span></h3>' +
            '<div class="cols">' +
              '<div><strong>Problem</strong><br>' + escapeHtml(summary.problem) + '<br><span class="muted">' + durationLabel(test.durationMs || 0) + '</span></div>' +
              '<div><strong>Why Failed</strong><br>' + escapeHtml(summary.causes[0] || 'Failure needs review') + '</div>' +
              '<div><strong>What To Do</strong><br>' + escapeHtml(summary.fixes[0] || 'Open screenshot and check failing step.') + '</div>' +
            '</div>' +
          '</div>';
        }).join('') : '<p class="muted">No failed tests found.</p>') +
        '<h2>Passed Tests</h2>' +
        (passedTests.length ? buildPdfTestTable(passedTests.slice(0, 20), false) : '<p class="muted">No passed tests found.</p>') +
        '<h2 class="section-break">All Test Run Details</h2>' +
        buildPdfTestTable(data.tests || [], true) +
        '<h2>Environment</h2>' +
        '<table>' +
          '<tr><th>OS</th><th>Browser</th><th>Playwright</th><th>Node</th></tr>' +
          '<tr><td>' + escapeHtml(env.os) + '</td><td>' + escapeHtml(env.browser) + '</td><td>' + escapeHtml(env.playwright) + '</td><td>' + escapeHtml(env.node) + '</td></tr>' +
        '</table>' +
      '</div></body></html>';
    }

    function renderPrintFailures(data) {
      const failedTests = getFailedTests(data);
      const passedTests = getPassedTests(data);
      const env = getEnvironmentInfo(data);

      printFailures.innerHTML =
        '<h2>Failure Details</h2>' +
        (failedTests.length ? failedTests.map(function (test) {
          const summary = getFailureExportSummary(test);

          return '<div class="print-failure-item">' +
            '<h3>' + escapeHtml(test.title || 'Untitled test') + '</h3>' +
            '<div class="print-failure-cols">' +
              '<div><strong>Defect Type</strong><br>' + escapeHtml(getDefectType(test)) + '<br><span class="muted">' + durationLabel(test.durationMs || 0) + '</span></div>' +
              '<div><strong>Why Failed</strong><br>' + escapeHtml(shortCsvText(summary.causes[0] || 'Failure needs review')) + '</div>' +
              '<div><strong>What To Do</strong><br>' + escapeHtml(shortCsvText(summary.fixes[0] || 'Open screenshot and check failing step')) + '</div>' +
            '</div>' +
            '<p><strong>Problem:</strong> ' + escapeHtml(summary.problem) + '</p>' +
          '</div>';
        }).join('') : '<p class="muted">No failed tests found.</p>') +
        '<h2>Passed Tests</h2>' +
        buildPdfTestTable(passedTests.slice(0, 20), false) +
        '<h2>All Test Run Details</h2>' +
        buildPdfTestTable(getSortedTestsForExport(data.tests || []), true) +
        '<h2>Environment</h2>' +
        '<table>' +
          '<tr><th>OS</th><th>Browser</th><th>Playwright</th><th>Node</th></tr>' +
          '<tr><td>' + escapeHtml(env.os) + '</td><td>' + escapeHtml(env.browser) + '</td><td>' + escapeHtml(env.playwright) + '</td><td>' + escapeHtml(env.node) + '</td></tr>' +
        '</table>';
    }

    function renderPrintReport(data) {
      const t = data.totals || {};
      const failedCount = (t.failed || 0) + (t.timedOut || 0);
      const failedTests = getFailedTests(data);
      const issueSummary = getIssueSummary(failedTests);

      printReport.innerHTML =
        '<div class="print-brand">' +
          '<div class="print-brand-main">' +
            '<div class="print-logo"><span></span><span></span><span></span></div>' +
            '<div><h1>testreport</h1><div class="muted">Run ID: ' + escapeHtml(data.runId || '') + '</div></div>' +
          '</div>' +
          '<div class="muted">Generated: ' + escapeHtml(new Date().toLocaleString()) + '</div>' +
        '</div>' +
        '<div class="print-summary-grid">' +
          '<div class="print-summary-box"><div class="print-label">Result</div><div class="print-value">' + (t.passed || 0) + '/' + (t.tests || 0) + ' passed</div></div>' +
          '<div class="print-summary-box"><div class="print-label">Failed</div><div class="print-value" style="color:#d97706;">' + failedCount + '</div></div>' +
          '<div class="print-summary-box"><div class="print-label">Skipped / Flaky</div><div class="print-value">' + (t.skipped || 0) + ' / ' + (t.flaky || 0) + '</div></div>' +
          '<div class="print-summary-box"><div class="print-label">Duration</div><div class="print-value">' + durationLabel(t.durationMs || 0) + '</div></div>' +
        '</div>' +
        '<h2>Main Issue Summary</h2>' +
        (issueSummary.length ? '<div class="print-issue-grid">' + issueSummary.map(function (item) {
          return '<div class="print-issue"><strong>' + escapeHtml(shortCsvText(item.cause)) + '</strong><br><span class="muted">' + item.count + ' failed test' + (item.count === 1 ? '' : 's') + '</span></div>';
        }).join('') + '</div>' : '<p class="muted">No main issues found.</p>');
    }

    function getFailedTests(data) {
      return (data.tests || []).filter(function (test) {
        return test.error || test.status === 'failed' || test.status === 'timedOut';
      });
    }

    function getPassedTests(data) {
      return (data.tests || []).filter(function (test) {
        return test.status === 'passed';
      });
    }

    function getIssueSummary(failedTests) {
      const counts = {};

      failedTests.forEach(function (test) {
        getFailureExportSummary(test).causes.forEach(function (cause) {
          counts[cause] = (counts[cause] || 0) + 1;
        });
      });

      return Object.keys(counts)
        .map(function (cause) {
          return { cause: cause, count: counts[cause] };
        })
        .sort(function (a, b) {
          return b.count - a.count;
        })
        .slice(0, 3);
    }

    function buildPdfTestTable(tests, includeFile) {
      if (!tests.length) {
        return '<p class="muted">No tests found.</p>';
      }

      return '<table>' +
        '<tr>' +
          '<th>Test</th>' +
          '<th>Status</th>' +
          '<th>Defect Type</th>' +
          '<th>Duration</th>' +
          (includeFile ? '<th>File</th>' : '') +
        '</tr>' +
        tests.map(function (test) {
          const statusClass = test.status === 'passed' ? 'pass' : (test.status === 'failed' || test.status === 'timedOut' ? 'fail' : 'warn');

          return '<tr>' +
            '<td>' + escapeHtml(test.title || 'Untitled test') + '</td>' +
            '<td class="status ' + statusClass + '">' + escapeHtml(test.status || '') + '</td>' +
            '<td>' + escapeHtml(getDefectType(test)) + '</td>' +
            '<td>' + durationLabel(test.durationMs || 0) + '</td>' +
            (includeFile ? '<td>' + escapeHtml(shortFile(test.file || '')) + '</td>' : '') +
          '</tr>';
        }).join('') +
      '</table>';
    }

    function getFailureExportSummary(test) {
      const exportError = getExportError(test);
      const simpleError = getSimpleError(exportError);
      const failureExplanation = explainFailure(test, simpleError);

      return {
        problem: getSimpleProblem(failureExplanation.action, exportError),
        error: simplifyExportError(failureExplanation.action, exportError),
        causes: failureExplanation.causes,
        fixes: getSuggestedFixes(failureExplanation.causes)
      };
    }

    function getSimpleProblem(action, exportError) {
      const text = String(action || exportError || '').toLowerCase();

      if (/click|locator|button|link|getbyrole/.test(text)) return 'Click action failed';
      if (/fill|type|input|editable/.test(text)) return 'Input action failed';
      if (/expect|tohave|assert|expected|received/.test(text)) return 'Expected result did not match';
      if (/navigation|load|url/.test(text)) return 'Page did not load as expected';
      if (/timeout|timed out/.test(text)) return 'Test timed out';

      return 'Test action failed';
    }

    function simplifyExportError(action, exportError) {
      const cleaned = cleanErrorText(action || exportError || '');

      if (!cleaned || cleaned === 'Error:') {
        return 'Test action failed';
      }

      if (cleaned.indexOf('Error:') === 0 && cleaned.trim().length <= 8) {
        return 'Test action failed';
      }

      return cleaned.replace(/\\s+/g, ' ').slice(0, 140);
    }

    function getSuggestedFixes(causes) {
      const fixes = [];

      function addFix(condition, text) {
        if (condition && !fixes.includes(text)) fixes.push(text);
      }

      causes.forEach(function (cause) {
        const lower = cause.toLowerCase();

        addFix(lower.includes('visible'), 'Wait for the element to be visible before action.');
        addFix(lower.includes('timeout'), 'Increase wait time or check why the page is slow.');
        addFix(lower.includes('selector') || lower.includes('locator'), 'Verify selector and make it unique.');
        addFix(lower.includes('detached'), 'Re-locate the element after page update.');
        addFix(lower.includes('disabled'), 'Wait until the element is enabled.');
        addFix(lower.includes('navigation') || lower.includes('loading'), 'Wait for navigation or page load to finish.');
        addFix(lower.includes('expected'), 'Check expected value against actual application result.');
      });

      if (!fixes.length) {
        fixes.push('Open the failure screenshot and check the failing step.');
      }

      return fixes.slice(0, 3);
    }

    function getExportError(test) {
      const rawError = test && test.error;

      if (!rawError) return '';
      if (typeof rawError === 'string') return cleanErrorText(rawError);

      const candidates = [
        rawError.stack,
        rawError.message,
        rawError.value,
        rawError.snippet,
        stringifyError(rawError)
      ].filter(Boolean);

      const useful = candidates.find(function (candidate) {
        const clean = cleanErrorText(candidate);

        return clean && clean !== 'Error:' && clean.length > 8;
      });

      return cleanErrorText(useful || candidates[0] || '');
    }

    function stringifyError(error) {
      try {
        return JSON.stringify(error);
      } catch (e) {
        return String(error || '');
      }
    }

    function pct(part, total) {
      return total ? Math.round((part / total) * 100) : 0;
    }

    function ms(n) {
      return n != null ? n + ' ms' : '';
    }

    function durationLabel(n) {
      const value = Number(n || 0);

      if (value >= 60000) return (value / 60000).toFixed(1) + 'm';
      if (value >= 1000) return Math.round(value / 1000) + 's';

      return value + 'ms';
    }

    function shortFile(filePath) {
      const parts = String(filePath || '').split(/[\\\\/]/);

      return parts.slice(-2).join('/');
    }

    function fmt(d) {
      return d ? new Date(d).toLocaleString() : '';
    }

    function escapeHtml(s) {
      return String(s || '').replace(/[&<>"']/g, function (c) {
        return {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        }[c];
      });
    }

    function escapeAttr(s) {
      return escapeHtml(s);
    }

    function xmlEscape(s) {
      return escapeHtml(s);
    }

    loadRuns();
  </script>
</body>
</html>`;

  const sendJson = (res, status, data) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  };

  const listRuns = () => {
    if (!fs.existsSync(reportRoot)) return [];

    return fs
      .readdirSync(reportRoot, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort((a, b) => (a > b ? -1 : 1));
  };

  const loadRun = (runId) => {
    const file = path.join(reportRoot, runId, 'results.json');

    if (!fs.existsSync(file)) return null;

    const data = JSON.parse(fs.readFileSync(file, 'utf-8'));

    if (!data.environment) {
      data.environment = getRuntimeEnvironment(data.projects || []);
    }

    if (!data.projectName && appPackageName) {
      data.projectName = appPackageName;
    }

    return data;
  };

  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url, true);

    if (parsed.pathname === '/api/runs') {
      const runs = listRuns().map((id) => {
        const data = loadRun(id);

        return {
          runId: id,
          tests: data?.totals?.tests || 0,
          passed: data?.totals?.passed || 0,
          failed: data?.totals?.failed || 0,
          skipped: data?.totals?.skipped || 0,
          timedOut: data?.totals?.timedOut || 0,
          flaky: data?.totals?.flaky || 0,
          startedAt: data?.startedAt,
          finishedAt: data?.finishedAt,
          failedTests: (data?.tests || [])
            .filter(function (test) {
              return test.status === 'failed' || test.status === 'timedOut';
            })
            .map(function (test) {
              return test.title || 'Untitled test';
            }),
        };
      });

      return sendJson(res, 200, runs);
    }

    if (parsed.pathname && parsed.pathname.startsWith('/api/run/')) {
      const runId = parsed.pathname.split('/').pop();
      const data = loadRun(runId);

      if (!data) {
        return sendJson(res, 404, { error: 'Run not found' });
      }

      return sendJson(res, 200, data);
    }

    if (parsed.pathname === '/attachment') {
      const filePath = parsed.query && parsed.query.p;

      if (!filePath) {
        return sendJson(res, 400, { error: 'Missing path' });
      }

      const resolved = filePath;

      if (!fs.existsSync(resolved)) {
        return sendJson(res, 404, { error: 'Attachment not found' });
      }

      const ext = path.extname(resolved).toLowerCase();
      const contentType =
        ext === '.png' ? 'image/png' :
          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
            ext === '.webp' ? 'image/webp' :
              ext === '.webm' ? 'video/webm' :
                ext === '.mp4' ? 'video/mp4' :
                  'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      return fs.createReadStream(resolved).pipe(res);
    }

    if (parsed.pathname && parsed.pathname.startsWith('/assets/')) {
      const assetPath = path.join(packageRoot, parsed.pathname);

      if (!assetPath.startsWith(path.join(packageRoot, 'assets'))) {
        return sendJson(res, 403, { error: 'Forbidden' });
      }

      if (!fs.existsSync(assetPath)) {
        return sendJson(res, 404, { error: 'Asset not found' });
      }

      const ext = path.extname(assetPath).toLowerCase();
      const contentType =
        ext === '.png' ? 'image/png' :
          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
            ext === '.svg' ? 'image/svg+xml' :
              'application/octet-stream';

      res.writeHead(200, { 'Content-Type': contentType });
      return fs.createReadStream(assetPath).pipe(res);
    }

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(viewerHtml);
  });

  server._port = port;
  return server;
}

module.exports = { createServer };
