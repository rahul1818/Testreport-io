const fs = require('fs');
const os = require('os');
const path = require('path');

function getPackageVersion(packageName) {
  try {
    return require(`${packageName}/package.json`).version;
  } catch (e) {
    return '';
  }
}

function getAppPackageName() {
  try {
    const packagePath = path.join(process.cwd(), 'package.json');
    if (!fs.existsSync(packagePath)) return '';

    const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    return pkg.name || '';
  } catch (e) {
    return '';
  }
}

function uniqueValues(values) {
  return Array.from(new Set(values.map((value) => String(value || '').trim()).filter(Boolean)));
}

function normalizeBrowserLabel(value) {
  const text = String(value || '').trim();

  if (!text) return '';

  const lower = text.toLowerCase();

  if (lower === 'msedge') return 'edge';

  if (['chromium', 'chrome', 'firefox', 'webkit', 'edge'].includes(lower)) {
    return lower;
  }

  const match = text.match(/\b(chromium|chrome|firefox|webkit|edge|msedge)\b/i);

  if (!match) return '';

  const browser = match[1].toLowerCase();

  return browser === 'msedge' ? 'edge' : browser;
}

function browsersFromText(text) {
  const found = [];
  const source = String(text || '');

  const patterns = [
    /Browser\s*\(\s*(chromium|chrome|firefox|webkit|edge|msedge)\s*\)/gi,
    /\busing\s+(chromium|chrome|firefox|webkit|edge|msedge)\b/gi,
    /\bproject[:\s]+(chromium|chrome|firefox|webkit|edge|msedge)\b/gi,
  ];

  patterns.forEach((pattern) => {
    let match = pattern.exec(source);

    while (match) {
      const label = normalizeBrowserLabel(match[1]);

      if (label) found.push(label);

      match = pattern.exec(source);
    }
  });

  return found;
}

function extractBrowserFromTest(test) {
  if (test.browserName) {
    const label = normalizeBrowserLabel(test.browserName);

    if (label) return label;
  }

  if (test.projectName && isBareBrowserLabel(test.projectName)) {
    return normalizeBrowserLabel(test.projectName);
  }

  const fromProjectName = normalizeBrowserLabel(test.projectName);

  if (fromProjectName) return fromProjectName;

  const stdoutText = Array.isArray(test.stdout || test.output)
    ? (test.stdout || test.output).map((item) => String(item || '')).join('')
    : String(test.stdout || test.output || '');
  const stderrText = Array.isArray(test.stderr)
    ? test.stderr.map((item) => String(item || '')).join('')
    : String(test.stderr || '');
  const fromOutput = browsersFromText(stdoutText + stderrText);

  return fromOutput[0] || '';
}

function getActualRunBrowsers(dataOrTests, runStdout, runStderr) {
  const data = Array.isArray(dataOrTests) ? { tests: dataOrTests } : (dataOrTests || {});
  const browsers = [];

  (data.tests || []).forEach((test) => {
    const label = extractBrowserFromTest(test);

    if (label) browsers.push(label);

    const stdoutText = Array.isArray(test.stdout || test.output)
      ? (test.stdout || test.output).map((item) => String(item || '')).join('')
      : String(test.stdout || test.output || '');
    const stderrText = Array.isArray(test.stderr)
      ? test.stderr.map((item) => String(item || '')).join('')
      : String(test.stderr || '');

    browsersFromText(stdoutText + stderrText).forEach((item) => browsers.push(item));
  });

  if (!browsers.length) {
    const runOutput = [
      ...(Array.isArray(runStdout) ? runStdout : data.stdout || []),
      ...(Array.isArray(runStderr) ? runStderr : data.stderr || []),
    ].map((item) => String(item || '')).join('');

    browsersFromText(runOutput).forEach((item) => browsers.push(item));
  }

  if (!browsers.length) {
    String(data.environment?.browser || data.environment?.browserName || '')
      .split(',')
      .map(normalizeBrowserLabel)
      .filter(Boolean)
      .forEach((item) => browsers.push(item));
  }

  if (!browsers.length) {
    (data.projects || [])
      .map(normalizeBrowserLabel)
      .filter(Boolean)
      .forEach((item) => browsers.push(item));
  }

  return uniqueValues(browsers);
}

function textFromChunk(chunk) {
  return Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk || '');
}

function cleanOutputLines(lines) {
  return (lines || []).map(textFromChunk).filter((line) => String(line || '').trim());
}

function isHiddenAttachmentName(name) {
  return String(name || '').trim().toLowerCase() === 'error-context';
}

function attachmentText(attachment, baseDir) {
  if (!attachment) return '';

  if (attachment.body) return textFromChunk(attachment.body);

  const candidates = [
    attachment.path,
    attachment.path ? path.resolve(process.cwd(), attachment.path) : '',
    attachment.path && baseDir ? path.resolve(baseDir, attachment.path) : '',
    attachment.path ? path.resolve(process.cwd(), 'test-results', attachment.path) : '',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      try {
        return fs.readFileSync(candidate, 'utf-8');
      } catch (e) {
        return '';
      }
    }
  }

  return '';
}

function outputFromAttachments(attachments, stream, baseDir) {
  const expectedName = stream === 'stderr' ? 'stderr' : 'stdout';

  return cleanOutputLines(
    (attachments || [])
      .filter((attachment) => String(attachment.name || '').trim().toLowerCase() === expectedName)
      .map((attachment) => attachmentText(attachment, baseDir))
  );
}

function getTestTags(test) {
  const tags = [];

  (test.annotations || []).forEach((annotation) => {
    const value = String(annotation.description || annotation.type || '').trim();

    if (value) tags.push(value.replace(/^@/, ''));
  });

  const title = String(test.title || '');
  const fullTitle = Array.isArray(test.fullTitle) ? test.fullTitle.join(' ') : String(test.fullTitle || '');

  (title.match(/@[\w-]+/g) || []).forEach((tag) => tags.push(tag.slice(1)));
  (fullTitle.match(/@[\w-]+/g) || []).forEach((tag) => tags.push(tag.slice(1)));

  return [...new Set(tags.filter(Boolean))];
}

function blockMatchesTest(block, test) {
  const source = String(block || '').toLowerCase();
  const title = String(test.title || '').trim().toLowerCase();

  if (!source.trim()) return false;

  const tags = getTestTags(test);

  if (tags.some((tag) => source.includes('@' + tag.toLowerCase()) || source.includes(tag.toLowerCase()))) {
    return true;
  }

  const titleParts = title.split(/\s+/).filter((word) => word.length > 4);
  const matchedParts = titleParts.filter((word) => source.includes(word));

  if (titleParts.length && matchedParts.length >= Math.min(3, titleParts.length)) {
    return true;
  }

  if (title.length > 18 && source.includes(title.slice(0, 24))) {
    return true;
  }

  const startMatch = source.match(/starting:\s*(.+)/i);

  if (startMatch) {
    const startText = startMatch[1].trim().toLowerCase();

    if (title.includes(startText) || startText.includes(title)) {
      return true;
    }
  }

  return false;
}

function getAttemptGroupKey(entry) {
  const title = String(entry.title || '').trim().replace(/\s+/g, ' ');

  return [
    entry.projectName || '',
    String(entry.file || '').replace(/\\/g, '/'),
    String(entry.line ?? ''),
    String(entry.column ?? ''),
    title,
  ].join('\0');
}

function isFailedAttemptStatus(status) {
  return status === 'failed' || status === 'timedOut' || status === 'interrupted';
}

function finalizeAttemptRecords(attempts) {
  const sortedAttempts = attempts.slice().sort((a, b) => Number(a.retries || 0) - Number(b.retries || 0));
  const finalAttempt = sortedAttempts[sortedAttempts.length - 1];
  const hadEarlierFailure = sortedAttempts
    .slice(0, -1)
    .some((attempt) => isFailedAttemptStatus(attempt.status));
  const passedAfterRetry = finalAttempt.status === 'passed' && Number(finalAttempt.retries || 0) > 0;
  const failedBeforePass = finalAttempt.status === 'passed' && (hadEarlierFailure || passedAfterRetry);
  const status = failedBeforePass ? 'flaky' : finalAttempt.status;
  const durationMs = sortedAttempts.reduce((sum, attempt) => sum + Number(attempt.durationMs || 0), 0);
  const stdout = cleanOutputLines(sortedAttempts.flatMap((attempt) => attempt.stdout || []));
  const stderr = cleanOutputLines(sortedAttempts.flatMap((attempt) => attempt.stderr || []));
  const attachments = sortedAttempts.flatMap((attempt, index) => {
    return (attempt.attachments || []).map((attachment) => ({
      ...attachment,
      attempt: attempt.retries ?? index,
    }));
  });

  return {
    ...finalAttempt,
    status,
    retries: Math.max(...sortedAttempts.map((attempt) => Number(attempt.retries || 0))),
    durationMs,
    startedAt: sortedAttempts[0].startedAt,
    finishedAt: finalAttempt.finishedAt,
    error: finalAttempt.error || [...sortedAttempts].reverse().find((attempt) => attempt.error)?.error || null,
    stdout,
    stderr,
    attachments,
    attempts: sortedAttempts,
  };
}

function extractOutputForTest(runOutput, test) {
  const source = String(runOutput || '');
  if (!source.trim()) return '';

  const blocks = source.split(/(?=\[AUDIT\][^\n]*TEST_START)/i).filter((block) => block.trim());

  if (blocks.length > 1) {
    for (const block of blocks) {
      if (blockMatchesTest(block, test)) {
        return block.trim();
      }
    }
  }

  const file = String(test.file || '').replace(/\\/g, '/');
  const fileName = file.split('/').pop() || '';
  const title = String(test.title || '').trim();
  const relativeFile = file.includes('tests/') ? file.slice(file.indexOf('tests/')) : fileName;
  const lines = source.split('\n');

  function auditFileMatches(line) {
    if (!/TEST_START|TEST_END/i.test(line)) return false;

    const auditFile = String(line.split('|').pop() || '').trim().replace(/\\/g, '/');
    if (!auditFile) return false;

    return file === auditFile ||
      file.endsWith('/' + auditFile) ||
      file.endsWith(auditFile) ||
      fileName === auditFile.split('/').pop() ||
      relativeFile === auditFile ||
      relativeFile.endsWith(auditFile);
  }

  function startingLineMatchesTest(line) {
    if (!/Starting:/i.test(line)) return true;

    const startText = String(line).replace(/^.*Starting:\s*/i, '').trim().toLowerCase();
    const testTitle = title.toLowerCase();

    if (!startText || !testTitle) return true;

    if (testTitle.includes(startText) || startText.includes(testTitle)) return true;

    const startWords = startText.split(/\s+/).filter((word) => word.length > 3);
    const matchedWords = startWords.filter((word) => testTitle.includes(word));

    return startWords.length > 0 && matchedWords.length >= Math.min(2, startWords.length);
  }

  let capturing = false;
  let captured = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];

    if (/TEST_START/i.test(line) && auditFileMatches(line)) {
      capturing = false;
      captured = [line];
      continue;
    }

    if (captured.length && !capturing) {
      captured.push(line);

      if (/Starting:/i.test(line)) {
        if (startingLineMatchesTest(line) || blockMatchesTest(captured.join('\n'), test)) {
          capturing = true;
        } else {
          captured = [];
        }
      } else if (!title || captured.length <= 2) {
        capturing = true;
      }

      continue;
    }

    if (capturing) {
      captured.push(line);

      if (/TEST_END/i.test(line) && auditFileMatches(line)) {
        const block = captured.join('\n').trim();

        if (blockMatchesTest(block, test)) {
          return block;
        }

        capturing = false;
        captured = [];
        continue;
      }

      if (/TEST_START/i.test(line) && auditFileMatches(line)) {
        const block = captured.join('\n').trim();
        captured = [line];
        capturing = false;

        if (block && blockMatchesTest(block, test)) return block;
      }
    }
  }

  if (capturing && captured.length) {
    const block = captured.join('\n').trim();

    if (blockMatchesTest(block, test)) {
      return block;
    }
  }

  const matchers = [title, fileName, relativeFile, file, ...getTestTags(test)].filter(Boolean);
  const matchedLines = lines.filter((line) => {
    return matchers.some((marker) => marker && line.toLowerCase().includes(String(marker).toLowerCase()));
  });

  return matchedLines.length ? matchedLines.join('\n').trim() : '';
}

function isBareBrowserLabel(value) {
  const text = String(value || '').trim().toLowerCase();

  return ['chromium', 'chrome', 'firefox', 'webkit', 'edge', 'msedge'].includes(text);
}

function getPlaywrightProjectName(test) {
  const project =
    test.parent?.project?.() ||
    test.project?.() ||
    null;

  const titleParts = (test.titlePath?.() || []).filter(Boolean);

  return (
    project?.name ||
    test._projectName ||
    titleParts.find((part) => part && !/\.spec\.(js|ts|mjs|tsx|jsx)$/i.test(part) && !isBareBrowserLabel(part)) ||
    titleParts[0] ||
    ''
  );
}

function getTestBrowserName(test) {
  const project =
    test.parent?.project?.() ||
    test.project?.() ||
    null;
  const use = project?.use || {};

  if (use.channel) {
    const channel = normalizeBrowserLabel(use.channel);

    if (channel) return channel;
  }

  if (use.browserName) {
    return normalizeBrowserLabel(use.browserName);
  }

  const projectName = project?.name || '';

  if (isBareBrowserLabel(projectName)) {
    return normalizeBrowserLabel(projectName);
  }

  return normalizeBrowserLabel(projectName) || 'chromium';
}

/**
 * Lightweight Playwright reporter that emits a single JSON file per run
 * under custom-report/<runId>/results.json. The JSON captures run metadata,
 * test outcomes, timing, errors, retries, attachments, stdout/stderr and
 * basic analytics (pass/fail counts, duration totals).
 *
 * Intended as a backend feed for a custom UI/analytics layer.
 */
class CustomReporter {
  constructor(options = {}) {
    this.options = {
      // Keep this relative; resolve against process.cwd() when writing.
      outputDir: options.outputDir || 'custom-report',
      fileName: options.fileName || 'results.json',
    };
    this.run = {
      runId: `${Date.now()}`,
      startedAt: null,
      finishedAt: null,
      projectName: getAppPackageName(),
      projects: [],
      environment: {
        os: `${os.type()} ${os.release()}`,
        browser: '',
        playwright: getPackageVersion('@playwright/test') || getPackageVersion('playwright'),
        node: process.versions.node,
      },
      totals: {
        tests: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        timedOut: 0,
        flaky: 0,
        durationMs: 0,
      },
      tests: [],
      stdout: [],
      stderr: [],
    };
    this.testOutput = new Map();
    this.testResults = new Map();
    this.activeTest = null;
  }

  onBegin(config, suite) {
    this.run.startedAt = new Date().toISOString();
    this.run.projects = [];
    this.run.testDir = config.testDir;
    this.run.totalTestFiles = suite.allTests().length;
    this._ensureOutputDir();
  }

  onTestBegin(test) {
    this.activeTest = test;
  }

  onStdOut(chunk, test) {
    const text = textFromChunk(chunk);
    if (!text) return;

    this.run.stdout.push(text);
    this._appendTestOutput(test, 'stdout', text);
  }

  onStdErr(chunk, test) {
    const text = textFromChunk(chunk);
    if (!text) return;

    this.run.stderr.push(text);
    this._appendTestOutput(test, 'stderr', text);
  }

  onTestEnd(test, result) {
    const status = result.status;
    const project =
      test.parent?.project?.() ||
      test.project?.() ||
      null;
    const projectName = getPlaywrightProjectName(test);
    const browserName = getTestBrowserName(test);
    const bufferedOutput = this.testOutput.get(test.id) || { stdout: [], stderr: [] };
    const resultStdout = cleanOutputLines(result.stdout || []);
    const resultStderr = cleanOutputLines(result.stderr || []);
    const attachmentStdout = outputFromAttachments(result.attachments || [], 'stdout', this.baseDir);
    const attachmentStderr = outputFromAttachments(result.attachments || [], 'stderr', this.baseDir);
    const entry = {
      id: test.id,
      title: test.title,
      fullTitle: test.titlePath(),
      projectName,
      browserName,
      file: test.location?.file,
      line: test.location?.line,
      column: test.location?.column,
      annotations: test.annotations || [],
      retries: result.retry,
      status,
      expectedStatus: test.expectedStatus,
      durationMs: result.duration,
      startedAt: result.startTime?.toISOString?.() || null,
      finishedAt: result.startTime
        ? new Date(result.startTime.getTime() + result.duration).toISOString()
        : null,
      error: result.error || null,
      stdout: cleanOutputLines([
        ...bufferedOutput.stdout,
        ...resultStdout,
        ...attachmentStdout,
      ]),
      stderr: cleanOutputLines([
        ...bufferedOutput.stderr,
        ...resultStderr,
        ...attachmentStderr,
      ]),
      attachments: (result.attachments || [])
        .filter((a) => !isHiddenAttachmentName(a.name))
        .map((a) => {
        const name = String(a.name || '').trim().toLowerCase();
        const text = (name === 'stdout' || name === 'stderr') ? attachmentText(a, this.baseDir) : '';

        return {
          name: a.name,
          contentType: a.contentType,
          path: a.path || null,
          text: text || undefined,
          body: a.body ? a.body.toString('base64') : undefined,
        };
      }),
      steps: (result.steps || []).map((step) => ({
        title: step.title,
        category: step.category,
        startTime: step.startTime?.toISOString?.() || null,
        durationMs: step.duration,
        error: step.error || null,
      })),
    };

    this._recordTestAttempt(entry);
    this.testOutput.delete(test.id);

    if (this.activeTest?.id === test.id) {
      this.activeTest = null;
    }
  }

  async onEnd() {
    this.run.finishedAt = new Date().toISOString();
    this._finalizeTests();
    const actualBrowsers = getActualRunBrowsers(this.run.tests, this.run.stdout, this.run.stderr);
    const projectNames = uniqueValues(
      (this.run.tests || [])
        .map((test) => test.projectName)
        .filter(Boolean)
    );

    if (projectNames.length) {
      this.run.projects = projectNames;
    }

    if (actualBrowsers.length) {
      this.run.environment.browser = actualBrowsers.join(', ');
    }

    this._writeRun();
  }

  _ensureOutputDir() {
    this.baseDir = path.resolve(process.cwd(), this.options.outputDir, this.run.runId);
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  _appendTestOutput(test, stream, text) {
    if (!text) return;

    const targetTest = test || this.activeTest;
    if (!targetTest?.id) return;

    const output = this.testOutput.get(targetTest.id) || { stdout: [], stderr: [] };
    output[stream].push(text);
    this.testOutput.set(targetTest.id, output);
  }

  _recordTestAttempt(entry) {
    const key = getAttemptGroupKey(entry);
    const existing = this.testResults.get(key) || [];

    existing.push(entry);
    this.testResults.set(key, existing);
  }

  _assignRunOutputToTests() {
    const runStdout = cleanOutputLines(this.run.stdout || []);
    const runStderr = cleanOutputLines(this.run.stderr || []);

    if (!runStdout.length && !runStderr.length) return;

    const stdoutText = runStdout.join('\n');
    const stderrText = runStderr.join('\n');

    (this.run.tests || []).forEach((test) => {
      if (!(test.stdout || []).length && stdoutText) {
        const extracted = extractOutputForTest(stdoutText, test);

        if (extracted) {
          test.stdout = cleanOutputLines([extracted]);
        }
      }

      if (!(test.stderr || []).length && stderrText) {
        const extracted = extractOutputForTest(stderrText, test);

        if (extracted) {
          test.stderr = cleanOutputLines([extracted]);
        }
      }
    });
  }

  _finalizeTests() {
    const tests = [];
    const totals = {
      tests: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      flaky: 0,
      durationMs: 0,
    };

    for (const attempts of this.testResults.values()) {
      const entry = finalizeAttemptRecords(attempts);
      const status = entry.status;
      const durationMs = entry.durationMs;

      tests.push(entry);
      totals.tests += 1;
      totals.durationMs += durationMs;

      if (status === 'flaky') totals.flaky += 1;
      else if (status === 'passed') totals.passed += 1;
      else if (status === 'failed' || status === 'timedOut') totals.failed += 1;
      else if (status === 'skipped') totals.skipped += 1;
      else totals.failed += 1;
    }

    this.run.tests = tests;
    this.run.totals = totals;
    this._assignRunOutputToTests();
  }

  _writeRun() {
    const filePath = path.join(this.baseDir, this.options.fileName);
    fs.writeFileSync(filePath, JSON.stringify(this.run, null, 2), 'utf-8');
    console.log(`Custom report written to ${filePath}`);
  }
}

module.exports = CustomReporter;
