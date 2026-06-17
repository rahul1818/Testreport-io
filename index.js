/**
 * Main entry point for playwright-viewer package
 * 
 * Usage in playwright.config.js:
 *   import CustomReporter from 'playwright-viewer/reporter';
 * 
 * Or:
 *   const { createServer } = require('playwright-viewer');
 */

// Export the reporter (ES module)
export { default as CustomReporter } from './lib/reporter.js';

// Export the viewer (CommonJS for compatibility)
const { createServer } = require('./lib/viewer.js');
module.exports.createServer = createServer;