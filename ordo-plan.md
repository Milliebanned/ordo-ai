# Ordo — AI Maintenance Engineer
## IBM Bob 2.0 Hackathon — Product & Architecture Plan

> **Solo developer build. 48-hour constraint.**

---

## Top-Level Overview

**Goal:** Build Ordo, an AI maintenance engineer that helps software teams identify technical debt, prioritize issues, generate remediation plans, and prepare fixes — before problems become expensive.

**Runtime:** IBM Bob (custom mode + custom skill) as the conversational shell. A lightweight Node.js/Python backend performs code analysis and orchestrates watsonx.ai calls. A polished React web UI serves as the demo surface.

**Core Constraint:** 48-hour build. Every decision must optimize for demo impact over completeness.

**Primary Demo Flow:**
1. User points Ordo at a GitHub repo URL
2. Ordo scans the repo and produces a technical debt dashboard
3. Ordo generates a prioritized maintenance roadmap
4. Ordo generates one complete PR-ready remediation summary for the top issue
5. Everything is visible in a clean web UI

---

## Problem Statement

Software teams accumulate technical debt invisibly. By the time it surfaces as outages, slow delivery, or security incidents, the cost to fix it is 3-10x higher than if it had been caught early. Existing tools (SonarQube, linters, CodeClimate) produce noise-heavy reports with no actionable prioritization, no business context, and no generated remediation path. Engineers drown in findings they cannot act on.

**Ordo solves three specific gaps:**
1. **Context-aware prioritization** — ranks debt by actual risk and business impact, not just rule severity
2. **Actionable remediation** — produces specific fix plans and PR summaries, not just flagged lines
3. **Conversational interface** — engineers can ask follow-up questions, drill into issues, and get decisions explained in plain language through Bob

---

## Ideal User Journey (MVP)

```
[Developer] --> Ordo Bob mode: "Analyze github.com/my-org/my-repo"
    |
    v
[Ordo Backend] scans repo via GitHub API
    |
    v
[watsonx.ai] classifies and scores debt items
    |
    v
[Ordo Web UI] shows: Debt Dashboard + Prioritized Issue List + Roadmap
    |
    v
[Developer] clicks an issue --> "Generate remediation plan"
    |
    v
[watsonx.ai] produces fix plan + PR summary
    |
    v
[Developer] copies PR summary directly into GitHub
```

---

## MVP Scope — What MUST Ship in 48 Hours

| Feature | Reason Included |
|---|---|
| Bob custom mode: `ordo` | Entry point, gives conversational UX for free |
| Bob custom skill: `analyze-repo` | Triggers scan from Bob chat |
| Backend: GitHub repo ingestion via API | Fetches file tree + key files without cloning |
| Backend: Debt detection (5 categories) | Focused analysis = reliable demo |
| watsonx.ai: debt classification + scoring | Core AI value, judge focus |
| watsonx.ai: remediation plan generation | "Wow moment" — actionable output |
| watsonx.ai: PR summary generation | Closing the loop, highly visual |
| Web UI: Debt dashboard + roadmap view | Judge-facing polished surface |
| Web UI: Issue drill-down + PR summary panel | Makes the demo story complete |

---

## Postponed Features (Post-Hackathon)

| Feature | Why Postponed |
|---|---|
| Local repo cloning + full AST parsing | Complex setup, GitHub API is sufficient for demo |
| Test plan generation | Valuable but not in critical demo path |
| Auto-PR creation via GitHub API | Auth complexity, risk of errors during live demo |
| CI/CD pipeline integration | Out of scope for 48h |
| Multi-repo portfolio view | Single repo is compelling enough |
| User authentication / team accounts | Not needed for a hackathon demo |
| Historical debt trend tracking | Requires persistent state over time |
| IDE plugin | Separate surface, cuts into build time |

---

## Features That Will Impress IBM Bob Judges

1. **Deep Bob integration** — Ordo is a first-class Bob mode, not just a chatbot wrapper. It uses Bob's skill system (`analyze-repo` skill), custom mode persona, and MCP tool hooks.
2. **watsonx.ai as the reasoning engine** — explicitly visible in the UI ("Powered by watsonx.ai"), with model name shown on each generated output.
3. **Conversational drill-down** — after seeing the dashboard, the user can ask Bob: *"Why is issue #3 ranked above #1?"* and get an explanation. This shows LLM reasoning, not just output.
4. **PR summary that reads like a human wrote it** — judges will copy it and it will feel production-ready.
5. **Live demo on a real open-source repo** — do not use a toy repo. Use something recognizable (e.g. a well-known Node.js or Python OSS project with known debt).
6. **Roadmap as a visual timeline** — not just a list. Shows strategic thinking baked into the product.

---

## System Architecture

### Components

```
┌─────────────────────────────────────────────────────┐
│                  IBM Bob (Runtime)                  │
│  ┌──────────────────┐   ┌────────────────────────┐  │
│  │  ordo  (mode)    │   │  analyze-repo (skill)  │  │
│  └──────────────────┘   └────────────────────────┘  │
│             │                       │                │
│             └─────────┬─────────────┘                │
│                       │ HTTP                         │
└───────────────────────┼─────────────────────────────┘
                        │
              ┌─────────▼─────────┐
              │   Ordo Backend    │
              │  (Node.js/Python) │
              │                   │
              │  ┌─────────────┐  │
              │  │  /analyze   │  │  <-- Repo ingestion + debt detection
              │  │  /roadmap   │  │  <-- Roadmap assembly
              │  │  /remediate │  │  <-- Fix plan + PR summary
              │  └─────────────┘  │
              │         │         │
              │  ┌──────▼──────┐  │
              │  │ watsonx.ai  │  │  <-- Classification, scoring, generation
              │  └─────────────┘  │
              │         │         │
              │  ┌──────▼──────┐  │
              │  │ GitHub API  │  │  <-- Repo content, file tree
              │  └─────────────┘  │
              └─────────┬─────────┘
                        │ REST/WebSocket
              ┌─────────▼─────────┐
              │   Ordo Web UI     │
              │   (React / Vite)  │
              │                   │
              │  Debt Dashboard   │
              │  Roadmap View     │
              │  Issue Drill-down │
              │  PR Summary Panel │
              └───────────────────┘
```

### Debt Detection Categories (MVP: 5 only)

| # | Category | Detection Method |
|---|---|---|
| 1 | Outdated dependencies | Parse package.json / requirements.txt, check versions |
| 2 | Large / complex functions | File scan: function length, nesting depth heuristics |
| 3 | Missing or thin test coverage | Ratio of test files to source files + test line density |
| 4 | Hardcoded secrets / config | Pattern matching on common secret patterns |
| 5 | Undocumented public APIs | Scan for exported functions lacking docstrings/JSDoc |

### watsonx.ai Usage Points

**Single model for all tasks:** `ibm/granite-3-8b-instruct`

- Available immediately on multitenant IBM hardware — no provisioning or deployment step required
- 128k context window — fits full file content + prompt without chunking
- Code-aware: explicitly designed for coding tasks, function-calling, summarization, and reasoning
- IBM-indemnified — contractual protection, correct for an IBM hackathon submission
- Covered under the free Lite plan

| Step | Prompt Task | max_new_tokens |
|---|---|---|
| Debt classification | Classify snippet into one of 5 debt types, return JSON | 256 |
| Debt scoring | Return urgency/impact/effort scores 1-10 + one-line rationale, JSON | 256 |
| Roadmap prioritization | Sequence N items into 3 phases with rationale | 512 |
| Remediation plan | Step-by-step fix plan with code hints | 1024 |
| PR summary | GitHub-flavored markdown PR body | 768 |

---

## Sub-Tasks

---

### Sub-Task 1 — Project Scaffold & Bob Integration
**Status:** `[x] done`

**Intent:**
Set up the monorepo structure, create the Bob custom mode (`ordo`) and custom skill (`analyze-repo`), and wire the Bob skill to call the backend. This is the skeleton everything else attaches to.

**Expected Outcomes:**
- A `/ordo-backend`, `/ordo-ui`, and Bob config directory exist
- Bob loads the `ordo` mode and `analyze-repo` skill without errors
- The skill makes a POST to `http://localhost:3001/analyze` with a repo URL and returns a stub response
- The mode persona is active and responds correctly in Bob chat

**Todo List:**
1. Create monorepo directory structure: `ordo-backend/`, `ordo-ui/`, `bob-config/`
2. Create Bob custom mode file `custom_modes.yaml` with `ordo` persona definition
3. Create Bob skill file `analyze-repo.md` (SKILL.md format) with trigger phrases and HTTP action pointing to backend
4. Scaffold `ordo-backend` as a Node.js Express app (or Python FastAPI) with stub routes: `POST /analyze`, `POST /roadmap`, `POST /remediate`
5. Test Bob mode loads and skill triggers the stub endpoint
6. Add `.env.example` with `WATSONX_API_KEY`, `GITHUB_TOKEN`, `WATSONX_PROJECT_ID` placeholders

**Relevant Context:**
- Bob custom mode: use `create-mode` skill instructions
- Bob custom skill: use `create-skill` skill instructions
- Bob MCP/HTTP hooks: use `configure-hooks` skill instructions for the HTTP call from skill to backend

---

### Sub-Task 2 — GitHub Repo Ingestion
**Status:** `[x] done`

**Intent:**
Build the repo ingestion layer in the backend. Given a GitHub URL, fetch the file tree and retrieve the content of files most relevant to debt detection. This must be fast and reliable — no git cloning.

**Expected Outcomes:**
- `POST /analyze` accepts `{ repoUrl: "https://github.com/org/repo" }` 
- Backend uses GitHub REST API to fetch: repo metadata, file tree (recursive), and raw content of target files
- Target files selected by extension and path heuristics (source files, package manifests, test directories)
- Raw file content and metadata returned in a structured internal object
- Works without authentication for public repos; uses `GITHUB_TOKEN` for rate limits

**Todo List:**
1. Parse GitHub URL into `owner/repo` format
2. Use GitHub API `/repos/{owner}/{repo}/git/trees/{branch}?recursive=1` to get full file tree
3. Filter tree: keep source files (`.js`, `.ts`, `.py`, `.java`, `.go`), manifests (`package.json`, `requirements.txt`, `go.mod`), test files, README
4. Cap total files fetched at 100 (prioritize manifests + source root + test dirs) to stay within API rate limits and demo speed
5. Fetch raw content for each file via GitHub raw content API
6. Return structured `RepoSnapshot` object: `{ repo, branch, files: [{ path, content, type }], metadata }`

**Relevant Context:**
- GitHub REST API: `https://api.github.com`
- Rate limit: 60 req/hr unauthenticated, 5000/hr with token — use token

---

### Sub-Task 3 — Debt Detection Engine
**Status:** `[x] done`

**Intent:**
Build the rule-based pre-analysis layer that extracts raw debt signals from the `RepoSnapshot` before passing them to watsonx.ai. This reduces LLM token usage and makes findings more grounded.

**Expected Outcomes:**
- Five detectors run against the `RepoSnapshot` and produce a list of raw `DebtSignal` objects
- Each signal contains: `{ id, category, filePath, lineRange, snippet, rawScore, evidence }`
- Detectors are modular (one function per category) for easy extension
- Output is a `DebtSignalSet` ready to be sent to watsonx.ai for enrichment

**Todo List:**
1. Implement `detectOutdatedDependencies(files)` — parse manifests, flag packages with no recent update marker or known vulnerability patterns
2. Implement `detectComplexFunctions(files)` — scan source files for functions exceeding ~50 lines or nesting depth > 4
3. Implement `detectThinTestCoverage(files)` — compute ratio of test files to source files; flag source files with no corresponding test file
4. Implement `detectHardcodedSecrets(files)` — regex scan for patterns: API keys, passwords, tokens, private key headers
5. Implement `detectUndocumentedAPIs(files)` — find exported/public functions/classes lacking a preceding doc comment
6. Aggregate all signals into a `DebtSignalSet`, deduplicate, and sort by raw signal strength
7. Add a cap: send the top 20 signals to watsonx.ai (keeps token cost and latency manageable for demo)

**Relevant Context:**
- These are heuristics only — accuracy is sufficient for a demo, not production
- Hardcoded secret detection: keep patterns conservative (avoid false positives in the demo)

---

### Sub-Task 4 — watsonx.ai Integration Layer
**Status:** `[x] done`

**Intent:**
Build the watsonx.ai client and the three prompt chains: debt scoring/classification, remediation plan generation, and PR summary generation. This is the core AI engine and the primary value demonstration for IBM judges.

**Expected Outcomes:**
- A reusable `watsonxClient` wrapper handles authentication and API calls to watsonx.ai inference endpoint
- `classifyAndScoreDebt(signalSet)` enriches each signal with: `debtType`, `urgencyScore (1-10)`, `businessImpactScore (1-10)`, `fixEffortScore (1-10)`, `explanation`
- `generateRemediationPlan(debtItem)` produces a structured fix plan: `{ summary, steps[], codeHints[], estimatedEffort }`
- `generatePRSummary(remediationPlan)` produces a conventional PR description: title, body, checklist
- All calls log the model name used (visible in UI for judge validation)

**Todo List:**
1. Install `@ibm-cloud/watsonx-ai` Node.js SDK (`npm install @ibm-cloud/watsonx-ai`)
2. Set up `watsonxClient` using `WATSONX_API_KEY`, `WATSONX_PROJECT_ID`, and `WATSONX_REGION` from `.env`
3. Implement `watsonxClient.generate(prompt, params)` wrapper — hardcode model to `ibm/granite-3-8b-instruct`, add error handling and one retry
4. Write the debt classification prompt template — structured JSON output, include explicit schema in prompt for reliable parsing
5. Write the debt scoring prompt — produces three numeric scores (urgency, impact, effort 1-10) + one-sentence rationale, JSON output
6. Write the remediation plan prompt — include file path, snippet, and debt type as context; max_new_tokens: 1024
7. Write the PR summary prompt — takes remediation plan, outputs GitHub-flavored markdown PR body; max_new_tokens: 768
8. Write the roadmap prioritization prompt — ranks N items into Phase 1/2/3 with rationale; max_new_tokens: 512
9. Implement JSON response parsing and validation for classification and scoring outputs; plain text passthrough for plan and PR summary
10. Add `modelId: "ibm/granite-3-8b-instruct"` to every response object for UI attribution display

**Relevant Context:**
- Model: `ibm/granite-3-8b-instruct` — multitenant, available immediately, no provisioning needed
- watsonx.ai REST endpoint: `https://{region}.ml.cloud.ibm.com/ml/v1/text/generation?version=2023-05-02`
- Node.js SDK docs: https://ibm.github.io/watsonx-ai-node-sdk/
- Use `decoding_method: "greedy"` for classification/scoring (deterministic), `temperature: 0.7` for plan/PR generation
- JSON output prompting: include the exact JSON schema in the prompt with a filled example

---

### Sub-Task 5 — Roadmap Assembly & API Contract
**Status:** `[x] done`

**Intent:**
Wire the full analysis pipeline together into the three backend API endpoints and define the stable JSON contract the UI will consume. Also build the `POST /roadmap` endpoint that takes scored items and returns a sequenced roadmap.

**Expected Outcomes:**
- `POST /analyze` returns a full `AnalysisResult`: scored debt items, repo metadata, summary stats
- `POST /roadmap` takes an `AnalysisResult` and returns a `Roadmap`: ordered phases, items per phase, rationale
- `POST /remediate` takes a single `debtItemId` and returns `RemediationResult`: plan + PR summary
- All endpoints respond within 30 seconds for a demo repo of ~100 files (critical for live demo)
- API contract documented in a simple `API.md` file

**Todo List:**
1. Wire `POST /analyze`: ingestion → detection → watsonx classification/scoring → return `AnalysisResult`
2. Wire `POST /roadmap`: take scored items → watsonx roadmap prompt → return `Roadmap`
3. Wire `POST /remediate`: take debt item → watsonx remediation + PR summary prompts → return `RemediationResult`
4. Add streaming response support on `/remediate` (SSE or chunked) so the UI shows generation in real-time
5. Write `API.md` with request/response shapes for all three endpoints
6. Add basic request validation and structured error responses
7. Performance check: run against a real GitHub repo, ensure end-to-end `POST /analyze` completes in < 30s

**Relevant Context:**
- Streaming on `/remediate` is a demo-quality feature — watching text generate impresses judges
- Do not add auth middleware; it wastes time and is not needed for a hackathon demo

---

### Sub-Task 6 — Web UI: Debt Dashboard & Roadmap
**Status:** `[x] done`

**Intent:**
Build the primary judge-facing surface: a React web app that shows the debt dashboard, prioritized issue list, and visual roadmap. Polish matters here — this is what judges will screenshot.

**Expected Outcomes:**
- Vite + React app scaffolded and running on `localhost:5173`
- Repo URL input field with "Analyze" button triggers `POST /analyze`
- Loading state with progress indicator shown during analysis
- Debt dashboard shows: total debt score, debt by category (bar or donut chart), top 10 issues as cards
- Each issue card shows: category icon, file path, urgency/impact/effort scores as badges, one-line explanation
- Roadmap view shows issues grouped into Phase 1 / Phase 2 / Phase 3 with rationale
- "Powered by watsonx.ai — Model: {modelId}" attribution visible on the dashboard

**Todo List:**
1. Scaffold React + Vite app in `ordo-ui/`
2. Install: `axios` (API calls), `recharts` or `chart.js` (charts), a UI component library (shadcn/ui or Tailwind + headlessui)
3. Build `RepoInput` component — URL field + analyze button + validation
4. Build `DebtDashboard` component — summary stats + category chart
5. Build `IssueCard` component — shows debt item with score badges and category icon
6. Build `RoadmapView` component — phase-grouped list with rationale text
7. Wire all components to backend API calls with loading + error states
8. Apply visual polish: consistent color system, dark or light theme, Ordo logo/branding

**Relevant Context:**
- shadcn/ui + Tailwind CSS is the fastest path to a polished look with minimal custom CSS
- Category icons: use lucide-react (already included with shadcn)
- Do not build authentication, routing beyond a single page, or settings screens

---

### Sub-Task 7 — Web UI: Issue Drill-Down & PR Summary Panel
**Status:** `[x] done`

**Intent:**
Build the "wow moment" panel — clicking an issue generates a live remediation plan and PR summary, displayed in a slide-out panel with streaming text and a copy button. This is the feature that closes the demo story.

**Expected Outcomes:**
- Clicking any issue card opens a slide-out `RemediationPanel`
- Panel shows a "Generate Fix Plan" button; pressing it calls `POST /remediate` with the issue ID
- Remediation steps stream into the panel in real time (SSE or progressive fetch)
- Below the plan, the PR summary renders as formatted markdown with a one-click "Copy to clipboard" button
- Model attribution shown: "Generated by watsonx.ai — {modelId}"
- Panel can be closed and re-opened without re-triggering analysis

**Todo List:**
1. Build `RemediationPanel` component as a slide-over/drawer
2. Wire "Generate Fix Plan" button to `POST /remediate` with streaming response handling
3. Implement streaming text rendering (append chunks as they arrive via SSE or `ReadableStream`)
4. Render PR summary section with `react-markdown` for GitHub-flavored markdown
5. Add "Copy PR Summary" button with clipboard API + visual confirmation toast
6. Add model attribution footer to the panel
7. Ensure panel state persists if the user switches between issues without re-fetching

---

### Sub-Task 8 — Bob Mode & Skill Polish
**Status:** `[x] done`

**Intent:**
Finalize the Bob integration so Ordo works as a first-class conversational experience. The Bob interface should be a fully usable alternative to the web UI — judges will test this directly.

**Expected Outcomes:**
- Bob `ordo` mode has a clear persona: proactive, technical, concise
- `analyze-repo` skill: user says "Analyze [URL]" → Bob calls backend → Bob returns a formatted summary in chat with a link to the web UI dashboard
- A second skill `explain-issue` allows the user to ask "Explain issue #3" and get the LLM rationale in chat
- A third skill `generate-fix` allows "Generate fix for issue #3" → streams remediation plan into Bob chat
- Mode roleDefinition includes Ordo's purpose, capabilities, and example prompts

**Todo List:**
1. Finalize `custom_modes.yaml`: ordo mode roleDefinition, allowed tools, persona
2. Finalize `analyze-repo.md` skill: trigger phrases, HTTP action, response formatting
3. Build `explain-issue.md` skill: accepts issue ID, calls `/remediate?explain=true`, formats rationale
4. Build `generate-fix.md` skill: accepts issue ID, calls `POST /remediate`, streams plan into chat
5. Test all three skills end-to-end in Bob chat
6. Add example prompts to the mode definition for judge discoverability

---

### Sub-Task 9 — Demo Preparation & README
**Status:** `[x] done`

**Intent:**
Prepare the submission artifact: a real end-to-end demo against a known OSS repo, a compelling README, and a demo script. A hackathon project that cannot be quickly understood and run by judges scores lower regardless of quality.

**Expected Outcomes:**
- `README.md` explains: what Ordo is, how to run it, 3-step demo script, architecture diagram
- `.env.example` is complete and accurate
- Demo target repo identified and tested (suggest: `expressjs/express` or `pallets/flask`)
- Demo script written: exact steps, what to say at each point, which "wow moment" to highlight
- All three components (Bob config, backend, UI) start with a single `npm run dev` or documented 3-command sequence

**Todo List:**
1. Choose and test the demo target repo — run full analysis, verify output quality
2. Write `README.md`: overview, architecture diagram (Mermaid), prerequisites, setup steps, demo walkthrough
3. Write `DEMO_SCRIPT.md`: step-by-step talking points for a 5-minute judge demo
4. Add `npm run dev` scripts or a `start.sh` to launch all three components
5. Final end-to-end smoke test: fresh environment, follow README, confirm everything works
6. Screenshot the UI at its best state for README header image

---

## Architecture Decision Log

| Decision | Choice | Rationale |
|---|---|---|
| Backend runtime | Node.js (Express) | Fastest to scaffold, strong GitHub API ecosystem, team familiarity assumed |
| Frontend framework | React + Vite + shadcn/ui | Fastest path to polished UI without design work |
| Repo ingestion | GitHub REST API (no clone) | No git dependency, works in any environment, fast |
| LLM provider | IBM watsonx.ai | Hackathon requirement, Granite models available |
| LLM model | ibm/granite-3-8b-instruct | Multitenant, no provisioning, 128k context, code-aware, IBM-indemnified, Lite plan covers it |
| LLM output format | Structured JSON prompting | Reliable parsing without a parser library |
| Bob integration | Custom mode + custom skills | First-class Bob integration, judges expect deep platform use |
| Auth | None | Not required for demo, saves 2-4 hours |
| Database | None (in-memory) | No state persistence needed for 48h demo |
| Deployment | Local / localhost | Demo is live, no cloud deployment risk |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| watsonx.ai API rate limits during live demo | Medium | High | Pre-cache analysis results for the demo repo before presenting |
| LLM output not parseable as JSON | Medium | Medium | Add fallback: if JSON parse fails, return raw text with graceful UI handling |
| GitHub API rate limit hit | Low | High | Use `GITHUB_TOKEN`, cache `RepoSnapshot` in memory |
| Analysis takes > 30s for demo repo | Medium | High | Cap file fetch at 100, pre-warm with the demo repo before judges arrive |
| Bob skill HTTP call fails | Low | Medium | Add a fallback response in the skill that directs user to web UI |
| UI looks unpolished under time pressure | High | High | Use shadcn/ui defaults — do not attempt custom design |
