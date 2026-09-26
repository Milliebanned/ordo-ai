/**
 * Prompt templates for all watsonx.ai calls in Ordo.
 *
 * Design rules:
 *  - Always include the JSON schema inline with a filled example → reliable parsing
 *  - Keep prompts under ~1500 tokens input to leave room for code snippets
 *  - Use "greedy" decoding for JSON outputs, "sample" for prose outputs
 */

// ── 1. Debt Classification + Scoring ─────────────────────────────────────────

/**
 * Build a prompt to classify and score a single debt signal.
 * Returns a JSON object with debtType, urgencyScore, businessImpactScore,
 * fixEffortScore, and explanation.
 */
export function buildClassifyPrompt(signal) {
  return `You are a senior software engineer analyzing technical debt. Given the debt signal below, respond ONLY with a valid JSON object matching the schema exactly. Do not add any text before or after the JSON.

## Debt Signal
Category: ${signal.category}
File: ${signal.filePath}${signal.lineRange ? ` (line ${signal.lineRange})` : ''}
Evidence: ${signal.evidence}
Code snippet: ${signal.snippet?.slice(0, 200) || 'N/A'}

## Required JSON Schema
{
  "debtType": "<one of: security | reliability | maintainability | performance | test-coverage>",
  "urgencyScore": <integer 1-10, where 10 = fix immediately>,
  "businessImpactScore": <integer 1-10, where 10 = critical business risk>,
  "fixEffortScore": <integer 1-10, where 10 = very high effort to fix>,
  "explanation": "<one sentence explaining the business risk in plain English>"
}

## Example Response
{"debtType":"security","urgencyScore":9,"businessImpactScore":9,"fixEffortScore":2,"explanation":"Hardcoded credentials in source code expose the application to credential theft if the repository is ever made public or accessed by an unauthorized party."}

Respond with JSON only:`;
}

// ── 2. Roadmap Prioritization ─────────────────────────────────────────────────

/**
 * Build a prompt to sequence scored debt items into a 3-phase roadmap.
 */
export function buildRoadmapPrompt(debtItems) {
  const itemList = debtItems
    .slice(0, 20)
    .map(
      (item, i) =>
        `${i + 1}. [${item.id}] ${item.categoryLabel} in ${item.filePath} — urgency:${item.urgencyScore} impact:${item.businessImpactScore} effort:${item.fixEffortScore}`
    )
    .join('\n');

  return `You are a senior engineering manager creating a technical debt roadmap. Given the scored debt items below, group them into exactly 3 phases based on urgency, impact, and effort. Respond ONLY with a valid JSON object.

## Scored Debt Items
${itemList}

## Required JSON Schema
{
  "phases": [
    {
      "phase": 1,
      "title": "<short phase title>",
      "rationale": "<one sentence explaining why these items are phase 1>",
      "itemIds": ["<id>", ...]
    },
    {
      "phase": 2,
      "title": "<short phase title>",
      "rationale": "<one sentence>",
      "itemIds": ["<id>", ...]
    },
    {
      "phase": 3,
      "title": "<short phase title>",
      "rationale": "<one sentence>",
      "itemIds": ["<id>", ...]
    }
  ],
  "summary": "<two sentences summarizing the overall debt picture and recommended approach>"
}

Rules:
- Every item ID must appear in exactly one phase
- Phase 1 = highest urgency + impact, lower effort items first
- Phase 3 = lower urgency or high effort items
- Respond with JSON only:`;
}

// ── 3. Remediation Plan ───────────────────────────────────────────────────────

/**
 * Build a prompt to generate a step-by-step remediation plan for one debt item.
 */
export function buildRemediationPrompt(debtItem) {
  return `You are a senior software engineer writing a remediation plan for a technical debt item. Be specific and actionable. Respond ONLY with a valid JSON object.

## Debt Item
ID: ${debtItem.id}
Category: ${debtItem.categoryLabel}
File: ${debtItem.filePath}${debtItem.lineRange ? ` (line ${debtItem.lineRange})` : ''}
Evidence: ${debtItem.evidence}
Debt type: ${debtItem.debtType || debtItem.category}
Urgency: ${debtItem.urgencyScore}/10
Business impact: ${debtItem.businessImpactScore}/10

## Required JSON Schema
{
  "summary": "<one sentence describing the fix>",
  "steps": ["<step 1>", "<step 2>", ...],
  "codeHints": ["<specific API, pattern, or tool to use>", ...],
  "estimatedEffort": "<low | medium | high>",
  "testingNotes": "<what to test after the fix>"
}

Respond with JSON only:`;
}

// ── 4. PR Summary ─────────────────────────────────────────────────────────────

/**
 * Build a prompt to generate a GitHub PR description from a remediation plan.
 */
export function buildPRSummaryPrompt(debtItem, remediationPlan) {
  const steps = Array.isArray(remediationPlan.steps)
    ? remediationPlan.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')
    : '';

  return `You are a senior engineer writing a GitHub pull request description. Write a professional, clear PR summary for the fix described below. Use GitHub-flavored markdown. Be concise and factual.

## Fix Being Submitted
File: ${debtItem.filePath}
Issue: ${debtItem.evidence}
Summary: ${remediationPlan.summary}

Steps taken:
${steps}

Testing: ${remediationPlan.testingNotes || 'See testing notes in steps'}

## Instructions
Write a complete PR description with:
1. A one-line title (starting with a conventional commit prefix: fix:, refactor:, chore:, or security:)
2. A ## Summary section (2-3 sentences)
3. A ## Changes section with a markdown checklist
4. A ## Testing section
5. End with exactly this footer on its own line: "---\n_Generated by Ordo AI Maintenance Engineer | Powered by watsonx.ai (ibm/granite-3-8b-instruct)_"

Write the PR description now:`;
}

// ── 5. Explain Issue ──────────────────────────────────────────────────────────

/**
 * Build a prompt to explain WHY a debt item is ranked where it is.
 */
export function buildExplainPrompt(debtItem, allItems) {
  const rank = allItems.findIndex((d) => d.id === debtItem.id) + 1;
  return `You are a senior engineering manager explaining a technical debt prioritization decision.

## Debt Item #${rank} of ${allItems.length}
ID: ${debtItem.id}
Category: ${debtItem.categoryLabel}
File: ${debtItem.filePath}
Evidence: ${debtItem.evidence}
Urgency: ${debtItem.urgencyScore}/10
Business Impact: ${debtItem.businessImpactScore}/10
Fix Effort: ${debtItem.fixEffortScore}/10

Explain in 3-4 sentences why this item is ranked #${rank}. Cover: what the risk is, what could go wrong if left unfixed, and why the priority level is appropriate. Be direct and specific. No bullet points — write in plain prose.`;
}
