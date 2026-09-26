---
name: analyze-repo
description: >-
  Use when the user provides a GitHub repository URL and wants to analyze it
  for technical debt. Triggers when the user says "analyze", "scan",
  "check this repo", or pastes a github.com URL.
---

# Analyze Repository

Follow these steps when a GitHub repository URL is provided.

## Step 1 — Extract the URL

Look for a URL matching `https://github.com/<owner>/<repo>` in the user's message.
If no URL is found, ask: "Please provide the GitHub repository URL you want to analyze."

## Step 2 — Call the Backend

Use `execute_command` to call the Ordo backend analyze endpoint:

```bash
curl -s -X POST http://localhost:3001/analyze \
  -H "Content-Type: application/json" \
  -d '{"repoUrl":"<URL>"}' 2>&1
```

Replace `<URL>` with the extracted GitHub URL. This may take 10-30 seconds.

## Step 3 — If Backend Is Not Running

If the command returns a connection error, tell the user:
> "The Ordo backend is not running. Start it with:
> ```
> cd ordo-backend && npm install && npm run dev
> ```
> Then open http://localhost:5173 for the web UI."

## Step 4 — Format the Response

If the response is valid JSON with a `debtItems` array:

Show a formatted summary:

```
## Ordo Analysis — <fullName>

**<totalDebtItems> debt items found**
- 🔴 High urgency: <highUrgency>
- 🟡 Medium urgency: <mediumUrgency>  
- 🟢 Low urgency: <lowUrgency>

**Top 5 Issues:**
1. [<categoryLabel>] <filePath> — Urgency: <urgencyScore>/10
   <explanation (first 100 chars)>
2. ...

AI-enriched: <yes/no> | Model: <modelId>
```

Then say:
> "Open http://localhost:5173 to see the full dashboard, roadmap, and fix plans.
> Type 'explain issue #1' for AI rationale or 'generate fix for issue #1' for a full remediation plan."

## Step 5 — Roadmap

After showing the analysis, call the roadmap endpoint:

```bash
curl -s -X POST http://localhost:3001/roadmap \
  -H "Content-Type: application/json" \
  -d '{}' 2>&1
```

Show the 3-phase roadmap summary:
- Phase 1: <title> — <rationale>
- Phase 2: <title> — <rationale>
- Phase 3: <title> — <rationale>
