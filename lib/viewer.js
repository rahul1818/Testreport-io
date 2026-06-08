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

function createServer(options = {}) {
  const reportRoot = options.reportDir || path.join(process.cwd(), 'custom-report');
  const port = options.port || parseInt(process.env.PORT || '4173', 10);
  const packageRoot = path.resolve(__dirname, '..');

  const viewerHtml = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>testreport</title>
  <style>
    :root {
      --card-bg:#fff;
      --border:#d7e4f6;
      --text:#243b53;
      --muted:#7b8794;
      --blue:#4c6fff;
      --soft:#edf2ff;
      --card-accent:#ffc107;
      --card-accent-shadow:rgba(255,193,7,.22);
      --shadow:0 18px 40px rgba(15,23,42,.12);
    }

    body.dark {
      --card-bg:#1e293b;
      --border:#334155;
      --text:#e5e7eb;
      --muted:#94a3b8;
      --soft:#1e293b;
      --card-accent:#fbbf24;
      --card-accent-shadow:rgba(251,191,36,.18);
    }

    * { box-sizing:border-box; }

    body {
      margin:0;
      font-family:system-ui,-apple-system,Segoe UI,sans-serif;
      color:var(--text);
      background:linear-gradient(135deg,#e6f3ff,#fff);
    }

    body.dark {
      background:#0f172a;
    }

    header {
      display:flex;
      justify-content:space-between;
      align-items:center;
      padding:16px 24px;
      border-bottom:1px solid var(--border);
      background:rgba(255,255,255,.95);
      position:sticky;
      top:0;
      z-index:10;
    }

    body.dark header {
      background:#0f172a;
    }

    .brand {
      display:flex;
      align-items:center;
      gap:12px;
    }

    .brand-logo-full {
      width:230px;
      height:58px;
      object-fit:contain;
    }

    .brand-fallback {
      display:none;
      font-weight:800;
      font-size:24px;
    }

    .controls {
      display:flex;
      gap:12px;
      align-items:center;
    }

    select, button, input {
      font:inherit;
    }

    select, button {
      background:var(--soft);
      color:var(--text);
      border:1px solid #c3d4ff;
      border-radius:999px;
      padding:8px 14px;
      cursor:pointer;
    }

    main {
      max-width:1400px;
      margin:16px auto 0;
      padding:24px;
      background:linear-gradient(135deg,#e1f0ff,#fff);
      border-radius:24px 24px 0 0;
      box-shadow:var(--shadow);
    }

    body.dark main {
      background:#111827;
    }

    .card,.allure-summary,.trend-card,.failure-card,.slowest-card,.export-card,.timeline-card,.comparison-card {
      background:var(--card-bg);
      border:1px solid var(--card-accent);
      border-radius:18px;
      box-shadow:0 10px 24px var(--card-accent-shadow);
      padding:16px 18px;
    }

    .card:hover,.allure-summary:hover,.trend-card:hover,.failure-card:hover,.slowest-card:hover,.export-card:hover,.timeline-card:hover,.comparison-card:hover {
      box-shadow:0 14px 30px var(--card-accent-shadow);
    }

    .allure-summary {
      border-radius:8px;
      margin-bottom:16px;
      display:flex;
      justify-content:space-between;
      align-items:center;
    }

    .allure-title {
      font-size:18px;
      font-weight:700;
    }

    .allure-time,.muted {
      color:var(--muted);
      font-size:13px;
    }

    .allure-count {
      font-size:42px;
      font-weight:700;
      text-align:center;
    }

    .allure-count span {
      display:block;
      font-size:13px;
      color:var(--muted);
      font-weight:400;
    }

    .allure-chart {
      width:112px;
      height:112px;
      border-radius:50%;
      display:grid;
      place-items:center;
      background:conic-gradient(
        #8bc34a 0deg,
        #8bc34a var(--passedDeg),
        #ff5252 var(--passedDeg),
        #ff5252 var(--failedDeg),
        #ffc84d var(--failedDeg),
        #ffc84d var(--skippedDeg),
        #8b5cf6 var(--skippedDeg),
        #8b5cf6 var(--flakyDeg),
        #bdbdbd var(--flakyDeg),
        #bdbdbd 360deg
      );
    }

    .allure-chart-inner {
      width:72px;
      height:72px;
      border-radius:50%;
      background:var(--card-bg);
      display:grid;
      place-items:center;
      font-weight:800;
    }

    .dashboard-grid {
      display:grid;
      grid-template-columns:1fr 1fr;
      gap:16px;
      margin-bottom:16px;
    }

    .trend-title {
      font-weight:800;
      margin-bottom:4px;
    }

    .trend-subtitle {
      color:var(--muted);
      font-size:13px;
      margin-bottom:14px;
    }

    .trend-chart {
      height:180px;
      display:flex;
      align-items:flex-end;
      justify-content:space-around;
      gap:12px;
      padding:20px 12px 0;
      border-bottom:1px solid var(--border);
    }

    .trend-item {
      height:140px;
      flex:1;
      display:flex;
      flex-direction:column;
      justify-content:flex-end;
      align-items:center;
    }

    .trend-bar {
      width:32px;
      min-height:10px;
      border-radius:8px 8px 0 0;
      background:linear-gradient(180deg,#8bc34a,#4c6fff);
    }

    .trend-value {
      font-size:12px;
      font-weight:800;
      margin-bottom:6px;
    }

    .trend-label {
      font-size:11px;
      color:var(--muted);
      margin-top:6px;
    }

    .failure-list {
      display:grid;
      gap:10px;
      margin-top:12px;
    }

    .failure-item {
      display:grid;
      grid-template-columns:32px 1fr auto;
      gap:10px;
      align-items:center;
      border:1px solid var(--border);
      border-radius:12px;
      padding:10px;
    }

    .failure-rank {
      width:26px;
      height:26px;
      border-radius:50%;
      display:grid;
      place-items:center;
      background:#ffeff0;
      color:#c81e1e;
      font-weight:800;
    }

    .failure-name {
      font-weight:700;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
    }

    .failure-count {
      background:#ffeff0;
      color:#c81e1e;
      border:1px solid #fcc2c3;
      border-radius:999px;
      padding:4px 10px;
      font-size:12px;
      font-weight:800;
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

    .legend-passed { background:#8bc34a; }
    .legend-failed { background:#ff5252; }
    .legend-skipped { background:#ffc84d; }
    .legend-flaky { background:#8b5cf6; }

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
      font-weight:700;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
    }

    .slowest-duration {
      font-weight:800;
      color:#ad6200;
    }

    .slowest-bar-track {
      grid-column:1 / -1;
      height:8px;
      border-radius:999px;
      background:#fff7e8;
      overflow:hidden;
    }

    .slowest-bar {
      height:100%;
      width:var(--durationPct);
      border-radius:999px;
      background:linear-gradient(90deg,#ffc107,#4c6fff);
    }

    .export-card {
      display:flex;
      flex-direction:column;
      justify-content:center;
      min-height:220px;
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
      border-radius:10px;
      padding:10px;
      background:#f8fbff;
    }

    body.dark .export-option {
      background:#172033;
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
      border-radius:8px;
      background:#2563eb;
      color:#fff;
      border-color:#2563eb;
      font-weight:800;
      padding:7px 12px;
    }

    .export-option button:hover {
      background:#1d4ed8;
      border-color:#1d4ed8;
    }

    .print-failures {
      display:none;
    }

    .print-report {
      display:none;
    }

    .timeline-card {
      margin-bottom:16px;
    }

    .timeline-list {
      display:grid;
      gap:0;
      margin-top:14px;
    }

    .timeline-item {
      display:grid;
      grid-template-columns:82px 18px 1fr auto;
      gap:10px;
      align-items:start;
      position:relative;
      padding:0 0 14px;
    }

    .timeline-item:not(:last-child)::after {
      content:"";
      position:absolute;
      left:90px;
      top:18px;
      bottom:0;
      width:2px;
      background:#ffe2a8;
    }

    .timeline-time {
      color:var(--muted);
      font-size:12px;
      font-weight:800;
      padding-top:1px;
      white-space:nowrap;
    }

    .timeline-dot {
      width:14px;
      height:14px;
      border-radius:50%;
      background:#ff5252;
      border:3px solid #ffe2a8;
      z-index:1;
    }

    .timeline-title {
      font-weight:800;
      overflow:hidden;
      white-space:nowrap;
      text-overflow:ellipsis;
    }

    .timeline-meta {
      color:var(--muted);
      font-size:12px;
      margin-top:2px;
    }

    .timeline-status {
      color:#c81e1e;
      background:#ffeff0;
      border:1px solid #fcc2c3;
      border-radius:999px;
      padding:3px 8px;
      font-size:11px;
      font-weight:800;
      text-transform:uppercase;
    }

    .comparison-card {
      margin-bottom:16px;
    }

    .comparison-controls {
      display:grid;
      grid-template-columns:1fr auto 1fr;
      gap:10px;
      align-items:end;
      margin-top:14px;
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
    }

    .comparison-vs {
      color:var(--muted);
      font-weight:900;
      padding-bottom:9px;
    }

    .comparison-results {
      display:grid;
      grid-template-columns:repeat(3,1fr);
      gap:10px;
      margin-top:14px;
    }

    .comparison-stat {
      border:1px solid var(--border);
      border-radius:12px;
      padding:12px;
      background:#f8fbff;
    }

    body.dark .comparison-stat {
      background:#172033;
    }

    .comparison-count {
      font-size:28px;
      font-weight:900;
    }

    .comparison-list {
      margin:8px 0 0;
      padding-left:18px;
      color:var(--muted);
      font-size:12px;
    }

    .comparison-list li {
      margin-bottom:3px;
    }

    .grid {
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
      gap:16px;
      margin-bottom:16px;
    }

    .metric {
      font-size:32px;
      font-weight:800;
    }

    .progress {
      height:10px;
      background:#edf2ff;
      border-radius:999px;
      overflow:hidden;
      margin-top:6px;
    }

    .progress-bar {
      height:100%;
      width:var(--pct);
      background:linear-gradient(90deg,#4c6fff,#6ee7b7);
    }

    .env-list {
      display:grid;
      gap:8px;
    }

    .env-row {
      display:flex;
      justify-content:space-between;
      gap:12px;
      border-bottom:1px solid var(--border);
      padding-bottom:6px;
    }

    .env-row:last-child {
      border-bottom:0;
      padding-bottom:0;
    }

    .env-value {
      font-weight:700;
      text-align:right;
    }

    .badge {
      display:inline-flex;
      padding:4px 9px;
      border-radius:999px;
      font-size:12px;
      font-weight:700;
      margin:3px;
    }

    .pass { background:#e3f9e5;color:#037971; }
    .fail { background:#ffeff0;color:#c81e1e; }
    .skip { background:#fff7e8;color:#ad6200; }
    .warn { background:#fff4e6;color:#b44d12; }

    .test-details-grid {
      display:grid;
      grid-template-columns:1fr 1.15fr;
      gap:16px;
      align-items:start;
      margin-top:16px;
    }

    .details-card {
      max-height:75vh;
      overflow-y:auto;
    }

    .search-input {
      padding:8px 12px;
      border:1px solid var(--border);
      border-radius:8px;
      background:var(--card-bg);
      color:var(--text);
      width:100%;
      min-width:0;
    }

    .search-panel {
      margin-bottom:12px;
      max-width:420px;
    }

    .filter-bar {
      display:flex;
      gap:8px;
      flex-wrap:wrap;
      margin-bottom:12px;
    }

    .filter-btn {
      padding:6px 12px;
      font-size:12px;
    }

    .filter-btn.active {
      background:#4c6fff;
      color:#fff;
    }

    .scroll {
      overflow-y:auto;
      max-height:60vh;
      min-height:150px;
    }

    table {
      width:100%;
      border-collapse:collapse;
      table-layout:fixed;
    }

    th,td {
      padding:12px 8px;
      border-bottom:1px solid #e2e8f0;
      text-align:left;
      overflow:hidden;
    }

    th {
      color:#4c6fff;
      font-size:13px;
    }

    tr:hover {
      background:#f5f7ff;
      cursor:pointer;
    }

    body.dark tr:hover {
      background:#273449;
    }

    .cell-content {
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .status-pill {
      padding:4px 10px;
      border-radius:999px;
      font-size:11px;
      font-weight:800;
      text-transform:uppercase;
    }

    .status-passed { background:#e3f9e5;color:#037971; }
    .status-failed { background:#ffeff0;color:#c81e1e; }
    .status-skipped { background:#fff7e8;color:#ad6200; }
    .status-timedOut { background:#fff4e6;color:#b44d12; }
    .status-flaky { background:#edf2ff;color:#364fc7; }

    .attachments {
      display:flex;
      gap:6px;
      align-items:center;
      flex-wrap:nowrap;
      overflow:hidden;
    }

    .attachment-btn {
      width:32px;
      height:30px;
      display:inline-flex;
      align-items:center;
      justify-content:center;
      border:1px solid #dbe2f0;
      border-radius:8px;
      background:#f8fafc;
      color:#334155;
      cursor:pointer;
      font-size:14px;
    }

    .attachment-btn:hover {
      background:#3366ff;
      color:#fff;
      border-color:#3366ff;
    }

    .attachments a {
      color:#3366ff;
      font-size:12px;
      white-space:nowrap;
      overflow:hidden;
      text-overflow:ellipsis;
    }

    .pill {
      background:#edf2ff;
      border:1px solid #c3d4ff;
      padding:4px 8px;
      border-radius:999px;
      font-size:12px;
      color:#364fc7;
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
      border:1px solid var(--border);
      border-radius:12px;
      background:#f8fbff;
    }

    body.dark .detail-section {
      background:#172033;
    }

    .detail-section h4 {
      margin:0 0 10px;
      color:var(--text);
    }

    .detail-browser-banner {
      display:flex;
      justify-content:space-between;
      gap:12px;
      align-items:center;
      margin:12px 0;
      padding:12px;
      border:1px solid var(--card-accent);
      border-radius:12px;
      background:#fffdf2;
    }

    body.dark .detail-browser-banner {
      background:#2b2413;
    }

    .detail-browser-name {
      font-size:20px;
      font-weight:900;
      color:#0f2f57;
    }

    body.dark .detail-browser-name {
      color:#f8fafc;
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
      font-weight:700;
    }

    .step-list {
      margin:0;
      padding-left:18px;
    }

    .failure-summary {
      margin-top:12px;
    }

    .failure-summary h4 {
      color:#dc2626;
      margin-bottom:10px;
    }

    .failure-box {
      padding:12px;
      border-radius:10px;
      background:#fff5f5;
      border:1px solid #fcc2c3;
      color:#7f1d1d;
      font-size:13px;
      line-height:1.6;
    }

    .failure-explanation {
      margin-top:12px;
      padding:12px;
      border-radius:10px;
      background:#fffdf2;
      border:1px solid var(--card-accent);
      color:var(--text);
      font-size:13px;
      line-height:1.6;
    }

    .failure-explanation-title {
      color:#ad6200;
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

    body.dark .failure-explanation {
      background:#2b2413;
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

    @media(max-width:900px) {
      .dashboard-grid,
      .test-details-grid {
        grid-template-columns:1fr;
      }

      .details-card {
        max-height:none;
      }
    }

    @media(max-width:560px) {
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
        background:#fffdf2;
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
      <img id="brandLogo" class="brand-logo-full" src="/assets/1.svg" alt="testreport" />
      <div id="brandFallback" class="brand-fallback">testreport</div>
    </div>

    <div class="controls">
      <label class="muted">Run:</label>
      <select id="runSelect"></select>
      <button id="refresh">Refresh</button>
      <button id="themeToggle">🌙 Dark</button>
    </div>
  </header>

  <main>
    <div class="allure-summary" id="allureSummary"></div>

    <div class="dashboard-grid">
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

      <div class="slowest-card">
        <div class="trend-title">Slowest Tests</div>
        <div class="trend-subtitle">Performance-heavy tests in this run</div>
        <div id="slowestTests"></div>
      </div>

      <div class="export-card">
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
    </div>

    <div class="timeline-card">
      <div class="trend-title">Failure Timeline</div>
      <div class="trend-subtitle">Run progression for failed tests</div>
      <div id="failureTimeline"></div>
    </div>

    <div class="comparison-card">
      <div class="trend-title">Run Comparison</div>
      <div class="trend-subtitle">Compare failures between two runs</div>
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

    <div class="grid" id="summaryGrid"></div>

    <div class="print-report" id="printReport"></div>
    <div class="print-failures" id="printFailures"></div>

    <div class="test-details-grid">
      <div class="card tests-card">
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
                <th>Duration</th>
                <th>File</th>
                <th>Attachments</th>
              </tr>
            </thead>
            <tbody id="testsBody"></tbody>
          </table>
        </div>
      </div>

      <div class="card details-card">
        <h3>Details</h3>
        <div id="detailsContent" class="muted">
          Click a test row to see detailed steps, errors and analytics.
        </div>
      </div>
    </div>
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
    const themeToggle = document.getElementById('themeToggle');
    const brandLogo = document.getElementById('brandLogo');
    const brandFallback = document.getElementById('brandFallback');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const previewModal = document.getElementById('previewModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalBody = document.getElementById('modalBody');
    const modalClose = document.getElementById('modalClose');

    let currentData = null;
    let availableRuns = [];
    let searchText = '';
    let selectedStatus = 'all';

    brandLogo.addEventListener('error', function () {
      brandLogo.style.display = 'none';
      brandFallback.style.display = 'flex';
    });

    function applyTheme(theme) {
      const isDark = theme === 'dark';
      document.body.classList.toggle('dark', isDark);
      themeToggle.textContent = isDark ? '☀️ Light' : '🌙 Dark';
      brandLogo.src = '/assets/1.svg';
      localStorage.setItem('testreport-theme', isDark ? 'dark' : 'light');
    }

    applyTheme(localStorage.getItem('testreport-theme') || 'light');

    themeToggle.addEventListener('click', function () {
      applyTheme(document.body.classList.contains('dark') ? 'light' : 'dark');
    });

    refreshBtn.addEventListener('click', function () {
      loadRuns({ preferNewest: true, showRefreshing: true });
    });
    exportPdf.addEventListener('click', exportCurrentPdf);
    exportExcel.addEventListener('click', exportCurrentExcel);
    exportJson.addEventListener('click', exportCurrentJson);
    exportDashboard.addEventListener('click', exportCurrentDashboard);

    runSelect.addEventListener('change', function () {
      loadRun(runSelect.value);
    });

    baseRunSelect.addEventListener('change', compareSelectedRuns);
    compareRunSelect.addEventListener('change', compareSelectedRuns);

    testSearch.addEventListener('input', function (e) {
      searchText = e.target.value.toLowerCase().trim();
      if (currentData) renderTests(currentData);
    });

    filterButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        selectedStatus = btn.getAttribute('data-status');

        filterButtons.forEach(function (b) {
          b.classList.remove('active');
        });

        btn.classList.add('active');

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

      return {
        newFailures: Array.from(compareFailures).filter(function (title) {
          return !baseFailures.has(title);
        }),
        fixedTests: Array.from(baseFailures).filter(function (title) {
          return !compareFailures.has(title);
        }),
        sameFailures: Array.from(compareFailures).filter(function (title) {
          return baseFailures.has(title);
        })
      };
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
        '<div class="comparison-results">' +
          comparisonStat('New Failures', result.newFailures, 'fail') +
          comparisonStat('Fixed Tests', result.fixedTests, 'pass') +
          comparisonStat('Same Failures', result.sameFailures, 'warn') +
        '</div>';
    }

    function comparisonStat(label, items, cls) {
      return '<div class="comparison-stat">' +
        '<div class="muted">' + escapeHtml(label) + '</div>' +
        '<div class="comparison-count ' + cls + '">' + items.length + '</div>' +
        '<ul class="comparison-list">' +
          (items.length ? items.slice(0, 5).map(function (title) {
            return '<li>' + escapeHtml(title) + '</li>';
          }).join('') : '<li>None</li>') +
        '</ul>' +
      '</div>';
    }

    async function loadRun(runId) {
      if (!runId) return;

      const data = await fetch('/api/run/' + runId).then(function (r) {
        return r.json();
      });

      currentData = data;

      renderAllureSummary(data);
      renderSummary(data);
      renderSlowestTests(data);
      renderFailureTimeline(data);
      renderPrintReport(data);
      renderPrintFailures(data);
      renderTests(data);
    }

    function renderTrend(runs) {
      const lastRuns = (runs || []).slice(0, 10).reverse();

      if (!lastRuns.length) {
        trendChart.innerHTML = '<div class="muted">No run history found</div>';
        return;
      }

      trendChart.innerHTML = lastRuns.map(function (run) {
        const total = Number(run.tests || 0);
        const passed = Number(run.passed || 0);
        const percentage = total ? Math.round((passed / total) * 100) : 0;
        const height = Math.max(Math.round((percentage / 100) * 120), 10);
        const label = run.runId ? String(run.runId).slice(-4) : '';

        return '<div class="trend-item" title="Run ' + escapeHtml(run.runId) + '">' +
          '<div class="trend-value">' + percentage + '%</div>' +
          '<div class="trend-bar" style="height:' + height + 'px"></div>' +
          '<div class="trend-label">' + escapeHtml(label) + '</div>' +
        '</div>';
      }).join('');
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
          return '<div class="failure-item" title="' + escapeHtml(item.title) + '">' +
            '<div class="failure-rank">' + (index + 1) + '</div>' +
            '<div class="failure-name">' + escapeHtml(item.title) + '</div>' +
            '<div class="failure-count">' + item.count + ' failures</div>' +
          '</div>';
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
      const titleDate = data.startedAt ? new Date(data.startedAt).toLocaleDateString() : '';

      allureSummary.innerHTML =
        '<div>' +
          '<div class="allure-title">TESTREPORT ' + titleDate + '</div>' +
          '<div class="allure-time">' + fmt(data.startedAt) + ' - ' + fmt(data.finishedAt) + '</div>' +
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

      summaryGrid.innerHTML = '';

      const cards = [
        {
          title: 'Overall',
          body:
            '<div class="metric">' + (t.passed || 0) + '/' + (t.tests || 0) + ' passed</div>' +
            '<div class="progress" style="--pct:' + pct(t.passed || 0, t.tests || 0) + '%"><div class="progress-bar"></div></div>' +
            '<div class="muted">duration ' + durationMin + ' min</div>'
        },
        {
          title: 'Statuses',
          body:
            '<span class="badge pass">Passed ' + (t.passed || 0) + '</span>' +
            '<span class="badge fail">Failed ' + (t.failed || 0) + '</span>' +
            '<span class="badge warn">Timed Out ' + (t.timedOut || 0) + '</span>' +
            '<span class="badge skip">Skipped ' + (t.skipped || 0) + '</span>' +
            '<span class="badge">Flaky ' + (t.flaky || 0) + '</span>'
        },
        {
          title: 'Run info',
          body:
            '<div class="muted">Run ID: <span class="mono">' + escapeHtml(data.runId || '') + '</span></div>' +
            '<div class="muted">Started: ' + fmt(data.startedAt) + '</div>' +
            '<div class="muted">Finished: ' + fmt(data.finishedAt) + '</div>' +
            '<div class="muted">Projects: ' + escapeHtml((data.projects || []).join(', ')) + '</div>'
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
        card.className = 'card';
        card.innerHTML = '<h3>' + c.title + '</h3>' + c.body;
        summaryGrid.appendChild(card);
      });
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

        const attachments = (test.attachments || []).map(function (a) {
          return renderAttachmentButton(a);
        }).join('');

        tr.innerHTML =
          '<td><div class="cell-content" title="' + escapeHtml(test.title || '') + '">' + escapeHtml(test.title || '') + '</div></td>' +
          '<td><span class="status-pill status-' + escapeHtml(test.status || '') + '">' + escapeHtml(test.status || '') + '</span></td>' +
          '<td class="mono"><div class="cell-content">' + ms(test.durationMs) + '</div></td>' +
          '<td class="muted"><div class="cell-content" title="' + escapeHtml(test.file || '') + '">' + escapeHtml(test.file || '') + '</div></td>' +
          '<td><div class="attachments">' + attachments + '</div></td>';

        tr.addEventListener('click', function () {
          renderDetails(test);
        });

        testsBody.appendChild(tr);
      });
    }

    function renderAttachmentButton(a) {
      const name = a.name || 'attachment';

      if (!a.path) {
        return '<span class="muted" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>';
      }

      const href = '/attachment?p=' + encodeURIComponent(a.path);
      const type = getAttachmentType(a);

      if (type === 'image') {
        return '<button class="attachment-btn" title="View Screenshot" data-src="' + escapeAttr(href) + '" data-title="' + escapeAttr(name) + '" data-type="image">&#128247;</button>';
      }

      if (type === 'video') {
        return '<button class="attachment-btn" title="View Video" data-src="' + escapeAttr(href) + '" data-title="' + escapeAttr(name) + '" data-type="video">&#127909;</button>';
      }

      return '<a href="' + href + '" target="_blank" title="' + escapeHtml(name) + '" onclick="event.stopPropagation()">' + escapeHtml(name) + '</a>';
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

      el.innerHTML =
        '<div class="flex" style="margin-bottom:8px;">' +
          '<span class="status-pill status-' + escapeHtml(test.status || '') + '">' + escapeHtml(test.status || '') + '</span>' +
          '<span class="pill mono">' + durationLabel(test.durationMs || 0) + '</span>' +
          '<span class="pill">' + escapeHtml(projectName) + '</span>' +
        '</div>' +

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
            detailField('Retry', test.retries != null ? test.retries : '0') +
            detailField('Expected Status', test.expectedStatus || 'Not captured') +
            detailField('Actual Status', test.status || 'Not captured') +
            detailField('Started', fmt(test.startedAt)) +
            detailField('Finished', fmt(test.finishedAt)) +
          '</div>' +
        '</div>' +

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

      renderPrintReport(currentData);
      renderPrintFailures(currentData);
      window.print();
    }

    function exportCurrentJson() {
      if (!currentData) return;

      downloadFile(
        getExportName('json'),
        JSON.stringify(currentData, null, 2),
        'application/json'
      );
    }

    function exportCurrentDashboard() {
      if (!currentData) return;

      downloadFile(
        getExportName('html'),
        buildDashboardReport(currentData),
        'text/html'
      );
    }

    function exportCurrentExcel() {
      if (!currentData) return;

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
          '*{box-sizing:border-box;}body{margin:0;background:#eef6ff;color:#10233f;font-family:Arial,sans-serif;font-size:14px;}' +
          '.page{max-width:1180px;margin:0 auto;padding:24px;}' +
          '.top{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px;}' +
          '.brand{display:flex;gap:12px;align-items:center;}.mark{width:48px;height:48px;border-radius:50%;background:#ffc107;display:flex;flex-direction:column;justify-content:center;gap:4px;padding:11px 9px 11px 17px;}.mark span{display:block;width:20px;height:4px;border-radius:999px;background:#9a6a00;position:relative;}.mark span:before{content:"";position:absolute;left:-8px;top:-1px;width:5px;height:8px;border-right:2px solid #9a6a00;border-bottom:2px solid #9a6a00;transform:rotate(45deg);}.brand h1{margin:0;font-size:34px;color:#20232d;}' +
          '.muted{color:#64748b;}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:16px;}.two{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px;}' +
          '.card{background:#fff;border:1px solid #f4bf36;border-radius:10px;padding:16px;box-shadow:0 8px 20px rgba(15,23,42,.08);}h2{margin:0 0 12px;color:#0f2f57;font-size:20px;}h3{margin:0 0 8px;font-size:16px;}' +
          '.metric{font-size:30px;font-weight:900;margin-top:5px;}.pass{color:#037971;}.fail{color:#c81e1e;}.warn{color:#ad6200;}.purple{color:#7c3aed;}' +
          '.status-bars{display:grid;gap:10px;}.bar-row{display:grid;grid-template-columns:85px 1fr 52px;gap:8px;align-items:center;}.track{height:14px;background:#edf2ff;border-radius:999px;overflow:hidden;}.bar{height:100%;border-radius:999px;}.green{background:#8bc34a;}.red{background:#ff5252;}.yellow{background:#ffc84d;}.violet{background:#8b5cf6;}' +
          '.slow-row,.issue-row{display:grid;grid-template-columns:28px 1fr auto;gap:10px;align-items:center;border-bottom:1px solid #e2e8f0;padding:8px 0;}.rank{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;background:#fff4d0;color:#ad6200;font-weight:900;}' +
          '.failure{border-left:5px solid #ff5252;background:#fffafa;border-radius:8px;padding:12px;margin-bottom:10px;}.failure-title{font-weight:900;margin-bottom:8px;}.cols{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}' +
          'table{width:100%;border-collapse:collapse;background:#fff;}th,td{border-bottom:1px solid #e2e8f0;text-align:left;padding:9px;vertical-align:top;}th{background:#eff6ff;color:#0f2f57;}tr:nth-child(even) td{background:#fafcff;}' +
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
              return '<div class="failure"><div class="failure-title">' + escapeHtml(test.title || 'Untitled test') + ' <span class="fail">(' + escapeHtml(test.status || '') + ')</span></div><div class="cols"><div><h3>Problem</h3>' + escapeHtml(summary.problem) + '</div><div><h3>Why Failed</h3>' + escapeHtml(shortCsvText(summary.causes[0] || '-')) + '</div><div><h3>What To Do</h3>' + escapeHtml(shortCsvText(summary.fixes[0] || '-')) + '</div></div></div>';
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

    function dashboardTestTable(tests) {
      return '<table><tr><th>Priority</th><th>Test</th><th>Status</th><th>Duration</th><th>Issue</th><th>Recommended Action</th><th>File</th></tr>' +
        tests.map(function (test) {
          const isFailed = test.error || test.status === 'failed' || test.status === 'timedOut';
          const summary = isFailed ? getFailureExportSummary(test) : { causes: [getStatusIssue(test)], fixes: [getStatusAction(test)] };
          const statusClass = test.status === 'passed' ? 'pass' : (isFailed ? 'fail' : 'warn');

          return '<tr><td>' + escapeHtml(getExportPriority(test)) + '</td><td>' + escapeHtml(test.title || 'Untitled test') + '</td><td class="' + statusClass + '"><strong>' + escapeHtml(test.status || '') + '</strong></td><td>' + durationLabel(test.durationMs || 0) + '</td><td>' + escapeHtml(shortCsvText(summary.causes[0] || '-')) + '</td><td>' + escapeHtml(shortCsvText(summary.fixes[0] || '-')) + '</td><td>' + escapeHtml(shortFile(test.file || '')) + '</td></tr>';
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
        ['Test', 'Status', 'Duration', 'Problem', 'Why Failed', 'What To Do']
      ];

      if (failedTests.length) {
        failedTests.forEach(function (test) {
          const summary = getFailureExportSummary(test);

          rows.push([
            test.title || 'Untitled test',
            test.status || '',
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
        ['Test', 'Status', 'Duration', 'File']
      );

      if (passedTests.length) {
        passedTests.forEach(function (test) {
          rows.push([
            test.title || 'Untitled test',
            test.status || '',
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
        ['Test', 'Status', 'Duration', 'File']
      );

      (data.tests || []).forEach(function (test) {
        rows.push([
          test.title || 'Untitled test',
          test.status || '',
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
        ['Priority', 'Test', 'Status', 'Duration', 'Issue', 'Recommended Action', 'File', 'Started', 'Finished', 'Location']
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
            '<Style ss:ID="Pass"><Font ss:Bold="1" ss:Color="#037971"/></Style>' +
            '<Style ss:ID="Fail"><Font ss:Bold="1" ss:Color="#C81E1E"/></Style>' +
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
          '.pass{color:#037971;font-weight:700;}' +
          '.fail{color:#c81e1e;font-weight:700;}' +
          '.warn{color:#ad6200;font-weight:700;}' +
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
          '.pass{color:#037971;}.fail{color:#c81e1e;}.warn{color:#ad6200;}' +
          '.issue-list{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;}' +
          '.issue{border:1px solid #f4bf36;border-radius:8px;padding:8px;background:#fffdf2;}' +
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
              '<div><strong>Problem</strong><br>' + escapeHtml(summary.problem) + '<br><span class="muted">' + durationLabel(test.durationMs || 0) + '</span></div>' +
              '<div><strong>Why Failed</strong><br>' + escapeHtml(shortCsvText(summary.causes[0] || 'Failure needs review')) + '</div>' +
              '<div><strong>What To Do</strong><br>' + escapeHtml(shortCsvText(summary.fixes[0] || 'Open screenshot and check failing step')) + '</div>' +
            '</div>' +
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
          '<div class="print-summary-box"><div class="print-label">Failed</div><div class="print-value" style="color:#c81e1e;">' + failedCount + '</div></div>' +
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
          '<th>Duration</th>' +
          (includeFile ? '<th>File</th>' : '') +
        '</tr>' +
        tests.map(function (test) {
          const statusClass = test.status === 'passed' ? 'pass' : (test.status === 'failed' || test.status === 'timedOut' ? 'fail' : 'warn');

          return '<tr>' +
            '<td>' + escapeHtml(test.title || 'Untitled test') + '</td>' +
            '<td class="status ' + statusClass + '">' + escapeHtml(test.status || '') + '</td>' +
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
