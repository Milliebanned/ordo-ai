/**
 * Detector 1: Outdated / unpinned dependencies
 *
 * Parses package.json and requirements.txt.
 * Flags:
 *   - packages with wildcard versions (*, latest, ^major, ~major)
 *   - very old locked versions (heuristic: major version 0.x)
 *   - missing lockfile companion (package.json without package-lock.json)
 */

export function detectOutdatedDependencies(files) {
  const signals = [];
  const paths = files.map((f) => f.path);

  // ── package.json ────────────────────────────────────────────────────────────
  const pkgFile = files.find((f) => f.path === 'package.json');
  if (pkgFile) {
    let pkg;
    try { pkg = JSON.parse(pkgFile.content); } catch { /* skip malformed */ }

    if (pkg) {
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies,
      };
      const wildcardDeps = [];
      const zeroDeps = [];

      for (const [name, version] of Object.entries(allDeps)) {
        const v = String(version).trim();
        if (v === '*' || v === 'latest' || v === 'x') {
          wildcardDeps.push(`${name}@${v}`);
        } else if (/^\^0\./.test(v) || /^~0\./.test(v) || /^0\./.test(v)) {
          zeroDeps.push(`${name}@${v}`);
        }
      }

      if (wildcardDeps.length > 0) {
        signals.push({
          category: 'outdated-dependencies',
          filePath: 'package.json',
          snippet: wildcardDeps.slice(0, 5).join(', '),
          evidence: `${wildcardDeps.length} dependency/dependencies use wildcard versions (*, latest): ${wildcardDeps.slice(0, 3).join(', ')}`,
          rawScore: Math.min(10, wildcardDeps.length * 2),
        });
      }

      if (zeroDeps.length > 0) {
        signals.push({
          category: 'outdated-dependencies',
          filePath: 'package.json',
          snippet: zeroDeps.slice(0, 5).join(', '),
          evidence: `${zeroDeps.length} dependencies pinned to 0.x versions (pre-stable): ${zeroDeps.slice(0, 3).join(', ')}`,
          rawScore: Math.min(8, zeroDeps.length),
        });
      }

      const hasLockfile = paths.includes('package-lock.json') || paths.includes('yarn.lock') || paths.includes('pnpm-lock.yaml');
      if (!hasLockfile) {
        signals.push({
          category: 'outdated-dependencies',
          filePath: 'package.json',
          snippet: 'No lockfile found',
          evidence: 'package.json present but no lockfile (package-lock.json / yarn.lock / pnpm-lock.yaml). Dependency versions are non-deterministic.',
          rawScore: 7,
        });
      }
    }
  }

  // ── requirements.txt ────────────────────────────────────────────────────────
  const reqFile = files.find((f) => f.path === 'requirements.txt');
  if (reqFile) {
    const unpinned = [];
    for (const line of reqFile.content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      // Unpinned: has no == operator
      if (!/==/.test(trimmed)) {
        unpinned.push(trimmed.split(/[><=!]/)[0].trim());
      }
    }
    if (unpinned.length > 0) {
      signals.push({
        category: 'outdated-dependencies',
        filePath: 'requirements.txt',
        snippet: unpinned.slice(0, 5).join(', '),
        evidence: `${unpinned.length} Python dependencies are not pinned to exact versions (missing ==): ${unpinned.slice(0, 3).join(', ')}`,
        rawScore: Math.min(9, unpinned.length + 2),
      });
    }
  }

  return signals;
}
