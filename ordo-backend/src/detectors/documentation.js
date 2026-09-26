/**
 * Detector 5: Undocumented public APIs
 *
 * Finds exported functions and classes that lack a preceding JSDoc / docstring comment.
 * Supports JS/TS (JSDoc) and Python (docstrings).
 */

const JS_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const PY_EXTS = new Set(['.py', '.pyw']);

function getExt(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

/**
 * Find exported JS/TS functions and classes without a preceding /** ... * / block.
 */
function findUndocumentedJs(content, filePath) {
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match: export function, export async function, export class, export const fn = () =>
    const isExport = /^\s*export\s+(async\s+)?(function|class)\s+(\w+)/.test(line)
      || /^\s*export\s+(?:const|let)\s+(\w+)\s*=\s*(?:async\s*)?(?:\([^)]*\)\s*=>|function)/.test(line);

    if (!isExport) continue;

    // Check if the preceding non-blank line ends a JSDoc block
    let prevLine = i - 1;
    while (prevLine >= 0 && lines[prevLine].trim() === '') prevLine--;

    const hasDocs = prevLine >= 0 && /\*\/\s*$/.test(lines[prevLine]);

    if (!hasDocs) {
      const nameMatch = line.match(/export\s+(?:async\s+)?(?:function|class)\s+(\w+)/)
        || line.match(/export\s+(?:const|let)\s+(\w+)/);
      const name = nameMatch ? nameMatch[1] : '<unknown>';
      results.push({ name, line: i + 1 });
    }
  }
  return results;
}

/**
 * Find Python functions/classes without a following docstring.
 */
function findUndocumentedPython(content, filePath) {
  const lines = content.split('\n');
  const results = [];

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(\s*)(?:def|class)\s+([A-Za-z_]\w*)\s*[:(]/);
    if (!match) continue;

    // Skip private/dunder
    const name = match[2];
    if (name.startsWith('_')) continue;

    // Check next non-empty line for docstring
    let nextLine = i + 1;
    while (nextLine < lines.length && lines[nextLine].trim() === '') nextLine++;

    const hasDocstring = nextLine < lines.length
      && /^\s*("""|\'\'\')/.test(lines[nextLine]);

    if (!hasDocstring) {
      results.push({ name, line: i + 1 });
    }
  }
  return results;
}

export function detectUndocumentedAPIs(files) {
  const signals = [];

  for (const file of files) {
    const ext = getExt(file.path);
    let undocumented = [];

    if (JS_EXTS.has(ext)) {
      undocumented = findUndocumentedJs(file.content, file.path);
    } else if (PY_EXTS.has(ext)) {
      undocumented = findUndocumentedPython(file.content, file.path);
    } else {
      continue;
    }

    if (undocumented.length > 0) {
      const names = undocumented.map((u) => u.name).slice(0, 5);
      signals.push({
        category: 'undocumented-apis',
        filePath: file.path,
        lineRange: `${undocumented[0].line}`,
        snippet: names.join(', '),
        evidence: `${undocumented.length} exported function(s)/class(es) lack documentation: ${names.join(', ')}`,
        rawScore: Math.min(6, undocumented.length + 1),
      });
    }
  }

  // Cap: return top 10 by rawScore to avoid overwhelming the LLM
  return signals.sort((a, b) => b.rawScore - a.rawScore).slice(0, 10);
}
