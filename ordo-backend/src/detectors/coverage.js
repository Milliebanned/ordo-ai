/**
 * Detector 3: Thin test coverage
 *
 * Identifies source files that have no corresponding test file.
 * Also flags repos where the overall test-to-source ratio is critically low.
 */

const TEST_PATTERNS = [
  /(^|[/\\])tests?[/\\]/i,
  /(^|[/\\])__tests__[/\\]/i,
  /(^|[/\\])spec[/\\]/i,
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /_test\.py$/,
  /test_.*\.py$/,
  /_spec\.rb$/,
  /_test\.go$/,
];

const SOURCE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.py', '.go', '.rb', '.java']);

function getExt(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

function isTestFile(path) {
  return TEST_PATTERNS.some((p) => p.test(path));
}

function isSourceFile(path) {
  return SOURCE_EXTS.has(getExt(path)) && !isTestFile(path);
}

/**
 * Derive a base name for matching source → test file.
 * e.g. "lib/utils.js" → "utils"
 */
function baseName(path) {
  const file = path.split('/').pop();
  return file.replace(/\.[^.]+$/, '').toLowerCase();
}

export function detectThinTestCoverage(files) {
  const signals = [];
  const allPaths = files.map((f) => f.path);

  const sourceFiles = allPaths.filter(isSourceFile);
  const testFiles = allPaths.filter(isTestFile);
  const testBaseNames = new Set(testFiles.map(baseName));

  // Per-file: source files with no corresponding test file
  const untestedFiles = sourceFiles.filter((p) => {
    const base = baseName(p);
    return !testBaseNames.has(base) && !testBaseNames.has(`test_${base}`) && !testBaseNames.has(`${base}_test`);
  });

  // Only signal if more than 30% of source files are untested — avoids noise on small repos
  const untestedRatio = sourceFiles.length > 0 ? untestedFiles.length / sourceFiles.length : 0;

  if (untestedRatio > 0.3 && untestedFiles.length >= 3) {
    // Pick the most "important" untested files (root-level or shortest paths first)
    const topUntested = untestedFiles
      .sort((a, b) => a.split('/').length - b.split('/').length)
      .slice(0, 5);

    signals.push({
      category: 'thin-test-coverage',
      filePath: topUntested[0],
      snippet: topUntested.join(', '),
      evidence: `${untestedFiles.length} of ${sourceFiles.length} source files (${Math.round(untestedRatio * 100)}%) have no corresponding test file. Highest-risk untested: ${topUntested.slice(0, 3).join(', ')}`,
      rawScore: Math.min(10, Math.round(untestedRatio * 10) + 2),
    });
  }

  // Overall ratio critically low
  const ratio = sourceFiles.length > 0 ? testFiles.length / sourceFiles.length : 0;
  if (ratio < 0.2 && sourceFiles.length >= 5) {
    signals.push({
      category: 'thin-test-coverage',
      filePath: 'repo-level',
      snippet: `${testFiles.length} test files / ${sourceFiles.length} source files`,
      evidence: `Overall test coverage ratio is critically low: ${testFiles.length} test files for ${sourceFiles.length} source files (${Math.round(ratio * 100)}%). Industry minimum is ~1:1.`,
      rawScore: 8,
    });
  }

  return signals;
}
