# Ordo Backend — API Contract

Base URL: `http://localhost:3001`

---

## GET /health

**Response**
```json
{ "status": "ok", "service": "ordo-backend", "version": "1.0.0", "modelId": "ibm/granite-3-8b-instruct" }
```

---

## POST /analyze

Ingest a GitHub repository, detect technical debt, enrich with watsonx.ai.

**Request**
```json
{ "repoUrl": "https://github.com/owner/repo" }
```

**Response — AnalysisResult**
```json
{
  "repoUrl": "https://github.com/expressjs/express",
  "metadata": {
    "owner": "expressjs", "repo": "express", "fullName": "expressjs/express",
    "description": "Fast, unopinionated, minimalist web framework",
    "defaultBranch": "master", "primaryLanguage": "JavaScript",
    "stars": 64000, "openIssues": 170, "url": "https://github.com/expressjs/express"
  },
  "stats": {
    "totalTreeFiles": 214, "selectedFiles": 74,
    "sourceCount": 50, "testCount": 20, "coverageRatio": 0.40
  },
  "summary": { "totalDebtItems": 16, "highUrgency": 7, "mediumUrgency": 3, "lowUrgency": 6 },
  "debtItems": [ /* see DebtItem shape below */ ],
  "modelId": "ibm/granite-3-8b-instruct",
  "aiEnriched": true,
  "analysedAt": "2024-01-01T00:00:00.000Z"
}
```

**DebtItem shape**
```json
{
  "id": "signal-001",
  "category": "hardcoded-secrets",
  "categoryLabel": "Hardcoded Secrets",
  "filePath": "examples/auth/index.js",
  "lineRange": "50",
  "snippet": "password: 'foobar'",
  "evidence": "Possible hardcoded Password assignment found at line 50",
  "rawScore": 9,
  "debtType": "security",
  "urgencyScore": 9,
  "businessImpactScore": 8,
  "fixEffortScore": 2,
  "explanation": "Hardcoded credentials expose the app to credential theft.",
  "aiEnriched": true,
  "modelId": "ibm/granite-3-8b-instruct",
  "phase": 1
}
```

---

## POST /roadmap

Generate a 3-phase maintenance roadmap. Uses cached analysis from last `/analyze` call.

**Request** *(body is optional if /analyze was called first)*
```json
{ "analysisResult": { /* optional — uses cached if omitted */ } }
```

**Response — Roadmap**
```json
{
  "phases": [
    {
      "phase": 1,
      "title": "Critical Security Fixes",
      "rationale": "Address high-urgency security and reliability issues immediately.",
      "itemIds": ["signal-001", "signal-002"]
    },
    { "phase": 2, "title": "Stability Improvements", "rationale": "...", "itemIds": [...] },
    { "phase": 3, "title": "Code Quality", "rationale": "...", "itemIds": [...] }
  ],
  "summary": "The repository has 16 debt items...",
  "debtItems": [ /* debt items with phase field attached */ ],
  "modelId": "ibm/granite-3-8b-instruct",
  "generatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

## POST /remediate

Generate a remediation plan and PR summary for a specific debt item.

**Request**
```json
{
  "debtItemId": "1",        // ordinal (1-based) OR "signal-001" ID
  "explainOnly": false      // true = return explanation only, no fix plan
}
```

**Response — RemediationResult**
```json
{
  "debtItem": { /* DebtItem */ },
  "remediationPlan": {
    "summary": "Remove hardcoded password and load from environment variable.",
    "steps": [
      "Replace hardcoded value with process.env.SESSION_SECRET",
      "Add SESSION_SECRET to .env.example with a placeholder value",
      "Rotate the exposed credential immediately"
    ],
    "codeHints": ["process.env", "dotenv", "crypto.randomBytes(32).toString('hex')"],
    "estimatedEffort": "low",
    "testingNotes": "Verify app starts correctly with env var set. Check session functionality."
  },
  "prSummary": "security: remove hardcoded session secret\n\n## Summary\n...",
  "modelId": "ibm/granite-3-8b-instruct"
}
```

**Response — ExplainOnly**
```json
{
  "explanation": "This item is ranked #1 because hardcoded credentials...",
  "modelId": "ibm/granite-3-8b-instruct",
  "debtItem": { /* DebtItem */ }
}
```
