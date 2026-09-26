---
name: generate-fix
description: >-
  Use when the user asks to generate a fix, remediation plan, or PR summary
  for a specific debt issue. Triggers on "generate fix", "fix issue #N",
  "remediate #N", "PR summary for #N", or "how do I fix issue #N".
  Requires a prior analyze-repo call.
---

# Generate Fix

Follow these steps when the user wants a remediation plan and PR summary for a specific issue.

## Step 1 — Extract the Issue Number

Look for an issue number (e.g. "#2", "issue 2", "item 2") in the user's message.
If no number is found, ask: "Which issue number would you like me to generate a fix for?"

## Step 2 — Call the Backend

Use `execute_command`:

```bash
curl -s -X POST http://localhost:3001/remediate \
  -H "Content-Type: application/json" \
  -d '{"debtItemId":"<N>"}' 2>&1
```

Replace `<N>` with the issue number. This may take 10-20 seconds.

## Step 3 — If No Analysis Exists

If the response contains "Run POST /analyze first":
> "Please run an analysis first. Say 'Analyze https://github.com/owner/repo' to get started."

## Step 4 — Format the Remediation Plan

Present:

```
## Fix Plan — Issue #<N>: <categoryLabel> in <filePath>

**Summary:** <summary>

**Steps:**
1. <step 1>
2. <step 2>
...

**Code hints:** <codeHints joined by " · ">
**Estimated effort:** <estimatedEffort>
**Testing:** <testingNotes>
```

## Step 5 — Show the PR Summary

Present the full PR summary in a code block so the user can copy it directly:

~~~
```
<prSummary>
```
~~~

Then say:
> "Copy the PR summary above directly into your GitHub pull request description.
> The footer attributes watsonx.ai as the generation model for compliance."

## Step 6 — Error Handling

If the backend is not running:
> "Start the backend: `cd ordo-backend && npm run dev`"
