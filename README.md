# ![](assets/1.svg) Playwright Viewer

Beautiful, lightweight dashboard for viewing Playwright test reports with advanced analytics.

## Installation

```bash
npm install --save-dev testreport.io-io
```

## Quick Start

### 1. Add Reporter to Playwright Config (ESM)

In `playwright.config.js`:

```javascript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['testreport.io-io/reporter', { outputDir: 'custom-report', fileName: 'results.json' }]
  ],
  // ... rest of config
});
```

### 1b. Add Reporter to Playwright Config (CommonJS)

```javascript
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['testreport.io-io/reporter', { outputDir: 'custom-report', fileName: 'results.json' }]
  ],
  // ... rest of config
});
```

> **Note:** `testreport.io-io/reporter` and `testreport.io-io/lib/reporter.js` both work. Use the same `outputDir` when serving reports.

### 2. Run Your Tests

```bash
npx playwright test
```

This generates reports in `custom-report/<runId>/results.json`.

### 3. View Reports

```bash
npx playwright-viewer serve
```

Starts the dashboard at `http://localhost:4173` by default and serves data from the `custom-report` folder in your current project (or your custom `--report-dir`).

## CLI Options

```bash
# Use custom port
npx playwright-viewer serve --port 4300

# Use custom report directory
npx playwright-viewer serve --report-dir ./my-reports
```

## Features

- 📊 Real-time test analytics
- 🎨 Beautiful, modern UI
- 📸 Screenshot and video viewing
- 🔍 Detailed test step analysis
- 📈 Pass/fail trends
- 🚀 Zero dependencies

## License

MIT
