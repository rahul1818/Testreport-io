/**
 * Main entry point for testreport.io-io package
 *
 * Usage in playwright.config.js:
 *   import CustomReporter from 'testreport.io-io/reporter';
 *
 * Or:
 *   const { createServer } = require('testreport.io-io');
 */

// Export the reporter (ES module)
export { default as CustomReporter } from './lib/reporter.js';

// Export the viewer (CommonJS for compatibility)
const { createServer } = require('./lib/viewer.js');
module.exports.createServer = createServer;