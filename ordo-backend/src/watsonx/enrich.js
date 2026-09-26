/**
 * watsonx.ai enrichment layer.
 * Takes raw debt signals and enriches them with AI classification, scoring,
 * roadmap generation, remediation plans, and PR summaries.
 */

import { generate, MODEL_ID } from './client.js';
import { CATEGORY_LABELS } from '../detectors/index.js';
import {
  buildClassifyPrompt,
  buildRoadmapPrompt,
  buildRemediationPrompt,
  buildPRSummaryPrompt,
  buildExplainPrompt,
} from './prompts.js';

/**
 * Safely parse JSON from an LLM response.
 * Handles common LLM quirks: leading/trailing text, markdown code fences.
 */
function safeParseJSON(text) {
  // Strip markdown code fences if present
  const stripped = text.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  // Find first { and last } to extract just the JSON object
  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in response');
  return JSON.parse(stripped.slice(start, end + 1));
}

/**
 * Classify and score a single debt signal using watsonx.ai.
 * Returns the signal enriched with AI fields.
 */
async function enrichSignal(signal) {
  try {
    const prompt = buildClassifyPrompt(signal);
    const raw = await generate(prompt, { decoding_method: 'greedy', max_new_tokens: 256 });
    const parsed = safeParseJSON(raw);

    return {
      ...signal,
      categoryLabel: signal.categoryLabel || CATEGORY_LABELS[signal.category] || signal.category,
      debtType: parsed.debtType || signal.category,
      urgencyScore: parsed.urgencyScore ?? signal.rawScore,
      businessImpactScore: parsed.businessImpactScore ?? Math.max(1, signal.rawScore - 1),
      fixEffortScore: parsed.fixEffortScore ?? 5,
      explanation: parsed.explanation || signal.evidence,
      aiEnriched: true,
      modelId: MODEL_ID,
    };
  } catch (err) {
    console.warn(`[watsonx] Enrichment failed for ${signal.id}:`, err.message);
    // Fallback to heuristic values — never crash the pipeline
    return {
      ...signal,
      categoryLabel: signal.categoryLabel || CATEGORY_LABELS[signal.category] || signal.category,
      debtType: signal.category,
      urgencyScore: signal.rawScore,
      businessImpactScore: Math.max(1, signal.rawScore - 1),
      fixEffortScore: 5,
      explanation: signal.evidence,
      aiEnriched: false,
      modelId: MODEL_ID,
    };
  }
}

/**
 * Enrich all signals concurrently (with concurrency cap to avoid rate limits).
 */
export async function enrichDebtItems(signals, concurrency = 3) {
  const results = [];
  for (let i = 0; i < signals.length; i += concurrency) {
    const batch = signals.slice(i, i + concurrency);
    const enriched = await Promise.all(batch.map(enrichSignal));
    results.push(...enriched);
  }
  // Re-sort by urgencyScore after AI enrichment
  return results.sort((a, b) => b.urgencyScore - a.urgencyScore);
}

/**
 * Generate a prioritized roadmap for a set of enriched debt items.
 */
export async function generateRoadmap(debtItems) {
  try {
    const prompt = buildRoadmapPrompt(debtItems);
    const raw = await generate(prompt, { decoding_method: 'greedy', max_new_tokens: 512 });
    const parsed = safeParseJSON(raw);

    // Resolve phase membership — attach phase number to each item
    const itemPhaseMap = {};
    for (const phase of parsed.phases || []) {
      for (const id of phase.itemIds || []) {
        itemPhaseMap[id] = phase.phase;
      }
    }

    return {
      phases: parsed.phases || [],
      summary: parsed.summary || '',
      itemPhaseMap,
      modelId: MODEL_ID,
    };
  } catch (err) {
    console.warn('[watsonx] Roadmap generation failed:', err.message);
    // Fallback: simple urgency-based split into 3 phases
    const sorted = [...debtItems].sort((a, b) => b.urgencyScore - a.urgencyScore);
    const third = Math.ceil(sorted.length / 3);
    const phases = [
      { phase: 1, title: 'Critical Fixes', rationale: 'Highest urgency and security issues.', itemIds: sorted.slice(0, third).map((d) => d.id) },
      { phase: 2, title: 'Stability Improvements', rationale: 'Medium urgency reliability and coverage gaps.', itemIds: sorted.slice(third, third * 2).map((d) => d.id) },
      { phase: 3, title: 'Code Quality', rationale: 'Lower urgency maintainability improvements.', itemIds: sorted.slice(third * 2).map((d) => d.id) },
    ];
    const itemPhaseMap = {};
    for (const phase of phases) {
      for (const id of phase.itemIds) itemPhaseMap[id] = phase.phase;
    }
    return { phases, summary: 'Roadmap generated using urgency-based fallback.', itemPhaseMap, modelId: MODEL_ID };
  }
}

/**
 * Generate a remediation plan + PR summary for one debt item.
 */
export async function generateRemediation(debtItem, allDebtItems) {
  // Remediation plan
  let remediationPlan;
  try {
    const prompt = buildRemediationPrompt(debtItem);
    const raw = await generate(prompt, { decoding_method: 'sample', max_new_tokens: 1024, temperature: 0.7 });
    remediationPlan = safeParseJSON(raw);
  } catch (err) {
    console.warn('[watsonx] Remediation plan failed:', err.message);
    remediationPlan = {
      summary: `Address ${debtItem.categoryLabel} in ${debtItem.filePath}`,
      steps: [debtItem.evidence],
      codeHints: [],
      estimatedEffort: 'medium',
      testingNotes: 'Verify fix with existing test suite.',
    };
  }

  // PR summary
  let prSummary;
  try {
    const prompt = buildPRSummaryPrompt(debtItem, remediationPlan);
    prSummary = await generate(prompt, { decoding_method: 'sample', max_new_tokens: 768, temperature: 0.7 });
  } catch (err) {
    console.warn('[watsonx] PR summary failed:', err.message);
    prSummary = `fix: address ${debtItem.categoryLabel} in ${debtItem.filePath}\n\n## Summary\n${remediationPlan.summary}\n\n---\n_Generated by Ordo AI Maintenance Engineer | Powered by watsonx.ai (${MODEL_ID})_`;
  }

  return {
    debtItem,
    remediationPlan,
    prSummary,
    modelId: MODEL_ID,
  };
}

/**
 * Generate a plain-language explanation of why an item is ranked where it is.
 */
export async function generateExplanation(debtItem, allDebtItems) {
  try {
    const prompt = buildExplainPrompt(debtItem, allDebtItems);
    const explanation = await generate(prompt, { decoding_method: 'sample', max_new_tokens: 256, temperature: 0.5 });
    return { explanation, modelId: MODEL_ID };
  } catch (err) {
    return { explanation: debtItem.explanation || debtItem.evidence, modelId: MODEL_ID };
  }
}
