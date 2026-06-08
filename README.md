# Playwright Viewer

Beautiful, lightweight dashboard for viewing Playwright test reports with advanced analytics.

## Installation

```bash
npm install --save-dev playwright-viewer
```

## Quick Start

### 1. Add Reporter to Playwright Config (ESM)

In `playwright.config.js`:

```javascript
import { defineConfig, devices } from '@playwright/test';
import CustomReporter from 'playwright-viewer/reporter';

export default defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['playwright-viewer/reporter', { outputDir: 'custom-report', fileName: 'results.json' }]
  ],
  // ... rest of config
});
```

### 1b. Add Reporter to Playwright Config (CommonJS)

```javascript
const { defineConfig } = require('@playwright/test');
const CustomReporter from 'playwright-viewer/reporter';

module.exports = defineConfig({
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['playwright-viewer/reporter', { outputDir: 'custom-report', fileName: 'results.json' }]
  ],
  // ... rest of config
});
```

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
