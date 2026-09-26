/**
 * Detector 4: Hardcoded secrets and credentials
 *
 * Scans source files for patterns that look like embedded secrets.
 * Conservative patterns only — minimizes false positives for demo quality.
 *
 * Skips test files and example/fixture files.
 */

// Patterns: [label, regex]
// Each regex must have one capture group for the matched value (truncated in output).
const SECRET_PATTERNS = [
  ['API key assignment', /(?:api[_-]?key|apikey)\s*[:=]\s*["']([A-Za-z0-9_\-]{16,})/i],
  ['Password assignment', /(?:password|passwd|pwd)\s*[:=]\s*["']([^"']{6,})/i],
  ['Secret assignment', /(?:secret|client_secret|app_secret)\s*[:=]\s*["']([A-Za-z0-9_\-]{8,})/i],
  ['Token assignment', /(?:token|auth_token|access_token|bearer)\s*[:=]\s*["']([A-Za-z0-9_\-./+]{16,})/i],
  ['Private key header', /(-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/],
  ['AWS access key', /(AKIA[0-9A-Z]{16})/],
  ['Generic long hex secret', /(?:key|secret|credential)\s*[:=]\s*["']([0-9a-fA-F]{32,})/i],
];

// Paths that are OK to have secret-looking strings
const SKIP_PATTERNS = [
  /\.test\.[jt]sx?$/,
  /\.spec\.[jt]sx?$/,
  /[/\\]tests?[/\\]/i,
  /[/\\]__tests__[/\\]/i,
  /[/\\]fixtures?[/\\]/i,
  /[/\\]mocks?[/\\]/i,
  /\.example$/,
  /\.sample$/,
  /\.env\.example$/,
  /readme/i,
];

// Values that are obviously placeholders — skip them
const PLACEHOLDER_PATTERNS = [
  /^(your|my|example|dummy|fake|test|sample|placeholder|xxx+|replace|changeme|todo|insert|<.*>|ENV\[|process\.env|os\.environ)/i,
  /^[*]+$/,
  /^\$\{/,
];

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some((p) => p.test(value.trim()));
}

export function detectHardcodedSecrets(files) {
  const signals = [];

  for (const file of files) {
    if (SKIP_PATTERNS.some((p) => p.test(file.path))) continue;

    const lines = file.content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comments
      if (/^\s*(\/\/|#|\/\*|\*)/.test(line)) continue;

      for (const [label, pattern] of SECRET_PATTERNS) {
        const match = line.match(pattern);
        if (match) {
          const value = match[1] || '';
          if (isPlaceholder(value)) continue;

          const truncated = value.length > 8 ? `${value.slice(0, 4)}...` : value;
          signals.push({
            category: 'hardcoded-secrets',
            filePath: file.path,
            lineRange: `${i + 1}`,
            snippet: line.trim().slice(0, 80),
            evidence: `Possible hardcoded ${label} found at line ${i + 1}: value starts with "${truncated}"`,
            rawScore: 9, // Always high — security risk
          });
          break; // One signal per line
        }
      }
    }
  }

  // Deduplicate: keep only first occurrence per file
  const seen = new Set();
  return signals.filter((s) => {
    const key = `${s.filePath}:${s.category}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
