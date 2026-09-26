/**
 * Debt detection orchestrator.
 * Runs all 5 detectors against a RepoSnapshot and returns a DebtSignalSet.
 *
 * Each DebtSignal:
 * {
 *   id: string (generated),
 *   category: 'outdated-dependencies' | 'complex-functions' | 'thin-test-coverage' | 'hardcoded-secrets' | 'undocumented-apis',
 *   filePath: string,
 *   lineRange: string | undefined,
 *   snippet: string,
 *   evidence: string,
 *   rawScore: number (1–10),
 * }
 */

import { detectOutdatedDependencies } from './dependencies.js';
import { detectComplexFunctions } from './complexity.js';
import { detectThinTestCoverage } from './coverage.js';
import { detectHardcodedSecrets } from './secrets.js';
import { detectUndocumentedAPIs } from './documentation.js';

let signalCounter = 0;
function nextId() {
  return `signal-${String(++signalCounter).padStart(3, '0')}`;
}

export function runDetectors(snapshot) {
  const { files } = snapshot;
  signalCounter = 0;

  const raw = [
    ...detectHardcodedSecrets(files),       // highest priority first
    ...detectOutdatedDependencies(files),
    ...detectComplexFunctions(files),
    ...detectThinTestCoverage(files),
    ...detectUndocumentedAPIs(files),
  ];

  // Assign IDs and sort by rawScore descending
  const signals = raw
    .map((s) => ({ id: nextId(), ...s }))
    .sort((a, b) => b.rawScore - a.rawScore);

  // Cap at 20 — keeps watsonx.ai token cost manageable
  return signals.slice(0, 20);
}

export const CATEGORY_LABELS = {
  'outdated-dependencies': 'Outdated Dependencies',
  'complex-functions': 'Complex Functions',
  'thin-test-coverage': 'Thin Test Coverage',
  'hardcoded-secrets': 'Hardcoded Secrets',
  'undocumented-apis': 'Undocumented APIs',
};
