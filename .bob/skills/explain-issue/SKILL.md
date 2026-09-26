---
name: explain-issue
description: >-
  Use when the user asks to explain a specific debt issue by number or ID,
  asks "why is this ranked here", "what does issue #N mean", or
  "tell me more about issue #N". Requires a prior analyze-repo call.
---

# Explain Issue

Follow these steps when the user wants an explanation for a specific debt issue.

## Step 1 — Extract the Issue Number

Look for an issue number (e.g. "#3", "issue 3", "item 3", "number 3") in the user's message.
If no number is found, ask: "Which issue number would you like me to explain?"

## Step 2 — Call the Backend

Use `execute_command`:

```bash
curl -s -X POST http://localhost:3001/remediate \
  -H "Content-Type: application/json" \
  -d '{"debtItemId":"<N>","explainOnly":true}' 2>&1
```

Replace `<N>` with the issue number (e.g. "1", "2", "3").

## Step 3 — If No Analysis Exists

If the response contains "Run POST /analyze first", tell the user:
> "Please run an analysis first. Say 'Analyze https://github.com/owner/repo' to get started."

## Step 4 — Format the Explanation

Show:
```
## Issue #<N> Explained

**<categoryLabel>** in `<filePath>`

**AI Rationale:**
<explanation>

**Scores:**
- Urgency: <urgencyScore>/10
- Business Impact: <businessImpactScore>/10  
- Fix Effort: <fixEffortScore>/10

Powered by watsonx.ai · <modelId>
```

Then offer: "Type 'generate fix for issue #<N>' to get a full remediation plan and PR summary."

## Step 5 — Error Handling

If the backend is not running:
> "Start the backend: `cd ordo-backend && npm run dev`"
