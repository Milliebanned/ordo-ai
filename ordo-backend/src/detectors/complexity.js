/**
 * Detector 2: Large / complex functions
 *
 * Scans source files for functions that are too long or too deeply nested.
 * Heuristics:
 *   - Function body > 50 lines → long function
 *   - Nesting depth > 4 (via counting braces/indentation) → complex function
 *
 * Supports JS/TS and Python (indentation-based).
 */

const LONG_FUNCTION_THRESHOLD = 50;
const DEEP_NESTING_THRESHOLD = 4;

const SOURCE_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const PYTHON_EXTS = new Set(['.py', '.pyw']);

function getExt(path) {
  const dot = path.lastIndexOf('.');
  return dot >= 0 ? path.slice(dot).toLowerCase() : '';
}

/**
 * Find function declarations in JS/TS files.
 * Returns array of { name, startLine, endLine, maxDepth }.
 */
function extractJsFunctions(content) {
  const lines = content.split('\n');
  const functions = [];
  let depth = 0;
  let funcStart = null;
  let funcName = null;
  let maxDepth = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect function declaration / expression / arrow
    const fnMatch = line.match(
      /(?:function\s+(\w+)|(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?(?:function|\([^)]*\)\s*=>|\w+\s*=>))/
    );

    const opens = (line.match(/{/g) || []).length;
    const closes = (line.match(/}/g) || []).length;

    if (fnMatch && funcStart === null) {
      funcStart = i;
      funcName = fnMatch[1] || fnMatch[2] || '<anonymous>';
      maxDepth = depth;
    }

    depth += opens - closes;
    if (depth > maxDepth && funcStart !== null) maxDepth = depth;

    if (funcStart !== null && depth === 0 && closes > 0) {
      functions.push({ name: funcName, startLine: funcStart + 1, endLine: i + 1, maxDepth });
      funcStart = null;
      funcName = null;
      maxDepth = 0;
    }
  }

  return functions;
}

/**
 * Find function/method definitions in Python.
 * Returns array of { name, startLine, endLine, maxDepth }.
 */
function extractPythonFunctions(content) {
  const lines = content.split('\n');
  const functions = [];
  const stack = []; // { name, startLine, indent }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(\s*)def\s+(\w+)\s*\(/);
    if (match) {
      const indent = match[1].length;
      // Close any functions at same or deeper indent
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        const fn = stack.pop();
        functions.push({ name: fn.name, startLine: fn.startLine, endLine: i, maxDepth: fn.maxDepth });
      }
      stack.push({ name: match[2], startLine: i + 1, indent, maxDepth: indent / 4 });
    }
    if (stack.length > 0) {
      const currentIndent = (line.match(/^(\s*)/) || ['', ''])[1].length;
      const top = stack[stack.length - 1];
      if (currentIndent / 4 > top.maxDepth) top.maxDepth = currentIndent / 4;
    }
  }
  // Close remaining open functions
  for (const fn of stack) {
    functions.push({ name: fn.name, startLine: fn.startLine, endLine: lines.length, maxDepth: fn.maxDepth });
  }
  return functions;
}

export function detectComplexFunctions(files) {
  const signals = [];

  for (const file of files) {
    const ext = getExt(file.path);
    let functions = [];

    if (SOURCE_EXTS.has(ext)) {
      functions = extractJsFunctions(file.content);
    } else if (PYTHON_EXTS.has(ext)) {
      functions = extractPythonFunctions(file.content);
    } else {
      continue;
    }

    for (const fn of functions) {
      const length = fn.endLine - fn.startLine;
      const isLong = length > LONG_FUNCTION_THRESHOLD;
      const isDeep = fn.maxDepth > DEEP_NESTING_THRESHOLD;

      if (isLong || isDeep) {
        const reasons = [];
        if (isLong) reasons.push(`${length} lines (threshold: ${LONG_FUNCTION_THRESHOLD})`);
        if (isDeep) reasons.push(`nesting depth ${fn.maxDepth} (threshold: ${DEEP_NESTING_THRESHOLD})`);

        signals.push({
          category: 'complex-functions',
          filePath: file.path,
          lineRange: `${fn.startLine}-${fn.endLine}`,
          snippet: `function ${fn.name}`,
          evidence: `Function "${fn.name}" is overly complex: ${reasons.join(', ')}`,
          rawScore: Math.min(10, Math.floor(length / 20) + (isDeep ? 3 : 0)),
        });
      }
    }
  }

  return signals;
}
