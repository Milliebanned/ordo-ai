/**
 * File prioritization for debt analysis.
 *
 * From the full repo tree, selects the most debt-relevant files up to a cap.
 * Priority order:
 *   1. Package manifests (always included)
 *   2. Root-level source files
 *   3. Source files by extension (js/ts/py/java/go/rb/php/cs/cpp/c/rs/swift/kt)
 *   4. Test files (to measure coverage ratio)
 *   5. README and docs
 *
 * The cap (default 100) keeps GitHub API calls fast and token usage manageable.
 */

const MANIFEST_PATTERNS = [
  /^package\.json$/,
  /^package-lock\.json$/,
  /^requirements\.txt$/,
  /^Pipfile$/,
  /^pyproject\.toml$/,
  /^go\.mod$/,
  /^go\.sum$/,
  /^Gemfile$/,
  /^pom\.xml$/,
  /^build\.gradle(\.kts)?$/,
  /^Cargo\.toml$/,
  /^composer\.json$/,
  /^\.nvmrc$/,
  /^\.node-version$/,
];

const SOURCE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
  '.py', '.pyw',
  '.java',
  '.go',
  '.rb',
  '.php',
  '.cs',
  '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.rs',
  '.swift',
  '.kt', '.kts',
]);

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

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next',
  'coverage', '__pycache__', '.venv', 'venv', 'vendor',
  '.gradle', 'target', 'bin', 'obj', '.idea', '.vscode',
]);

function getExtension(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

function isInSkippedDir(path) {
  return path.split('/').some((segment) => SKIP_DIRS.has(segment));
}

function isTestFile(path) {
  return TEST_PATTERNS.some((p) => p.test(path));
}

function isManifest(path) {
  const filename = path.split('/').pop();
  return MANIFEST_PATTERNS.some((p) => p.test(filename));
}

function isSourceFile(path) {
  return SOURCE_EXTENSIONS.has(getExtension(path));
}

function isDocsFile(path) {
  const lower = path.toLowerCase();
  return lower.endsWith('.md') || lower.endsWith('.rst') || lower.endsWith('.txt');
}

/**
 * Select up to `cap` files from the tree, prioritized for debt detection.
 * Returns an array of file path strings.
 */
export function prioritizeFiles(tree, cap = 100) {
  // Filter out skipped directories up front
  const eligible = tree.filter((f) => !isInSkippedDir(f.path));

  const manifests = [];
  const rootSource = [];
  const deepSource = [];
  const testFiles = [];
  const docs = [];

  for (const file of eligible) {
    const depth = file.path.split('/').length;
    if (isManifest(file.path)) {
      manifests.push(file.path);
    } else if (isTestFile(file.path) && isSourceFile(file.path)) {
      testFiles.push(file.path);
    } else if (isSourceFile(file.path)) {
      if (depth <= 2) {
        rootSource.push(file.path);
      } else {
        deepSource.push(file.path);
      }
    } else if (isDocsFile(file.path) && depth <= 2) {
      docs.push(file.path);
    }
  }

  // Assemble prioritized list, stopping at cap
  const selected = [];
  const add = (arr, limit) => {
    for (const p of arr) {
      if (selected.length >= limit) break;
      selected.push(p);
    }
  };

  add(manifests, cap);                        // always include all manifests
  add(rootSource, cap);                       // root source files second
  add(testFiles, Math.min(cap, selected.length + 20)); // up to 20 test files
  add(deepSource, cap);                       // deeper source files
  add(docs, cap);                             // docs last, if room

  return selected.slice(0, cap);
}

/**
 * Compute coverage statistics from the selected file list.
 * Returns { sourceCount, testCount, coverageRatio }.
 */
export function computeCoverageStats(paths) {
  const sourceCount = paths.filter((p) => isSourceFile(p) && !isTestFile(p)).length;
  const testCount = paths.filter((p) => isTestFile(p)).length;
  const coverageRatio = sourceCount > 0 ? testCount / sourceCount : 0;
  return { sourceCount, testCount, coverageRatio };
}
