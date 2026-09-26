import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { ingestRepo } from './github/ingest.js';
import { runDetectors, CATEGORY_LABELS } from './detectors/index.js';
import { enrichDebtItems, generateRoadmap, generateRemediation, generateExplanation } from './watsonx/enrich.js';
import { MODEL_ID } from './watsonx/client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// In-memory store for the current analysis result (single-user demo)
let currentAnalysis = null;

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ordo-backend', version: '1.0.0', modelId: MODEL_ID });
});

// ── POST /analyze ─────────────────────────────────────────────────────────────
// Full pipeline: ingest → detect → enrich with watsonx.ai → return AnalysisResult
app.post('/analyze', async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) {
    return res.status(400).json({ error: 'repoUrl is required' });
  }

  try {
    // 1. Ingest repo
    console.log(`[analyze] Ingesting ${repoUrl}...`);
    const snapshot = await ingestRepo(repoUrl);
    console.log(`[analyze] Ingested ${snapshot.stats.selectedFiles} files from ${snapshot.metadata.fullName}`);

    // 2. Run rule-based detectors
    const signals = runDetectors(snapshot);
    console.log(`[analyze] Detected ${signals.length} debt signals`);

    // 3. Enrich with watsonx.ai (graceful fallback if no credentials yet)
    let debtItems;
    const watsonxConfigured =
      process.env.WATSONX_API_KEY && process.env.WATSONX_API_KEY !== 'your-iam-api-key-here' &&
      process.env.WATSONX_PROJECT_ID && process.env.WATSONX_PROJECT_ID !== 'your-project-uuid-here';

    if (watsonxConfigured) {
      console.log('[analyze] Enriching with watsonx.ai...');
      debtItems = await enrichDebtItems(signals);
      console.log('[analyze] Enrichment complete');
    } else {
      console.log('[analyze] watsonx.ai not configured — using heuristic scores');
      debtItems = signals.map((s) => ({
        ...s,
        categoryLabel: CATEGORY_LABELS[s.category] || s.category,
        urgencyScore: s.rawScore,
        businessImpactScore: Math.max(1, s.rawScore - 1),
        fixEffortScore: 5,
        explanation: s.evidence,
        aiEnriched: false,
        modelId: MODEL_ID,
      }));
    }

    const highUrgency = debtItems.filter((d) => d.urgencyScore >= 7).length;
    const mediumUrgency = debtItems.filter((d) => d.urgencyScore >= 4 && d.urgencyScore < 7).length;
    const lowUrgency = debtItems.filter((d) => d.urgencyScore < 4).length;

    const analysisResult = {
      repoUrl,
      metadata: snapshot.metadata,
      stats: snapshot.stats,
      debtItems,
      summary: { totalDebtItems: debtItems.length, highUrgency, mediumUrgency, lowUrgency },
      modelId: MODEL_ID,
      aiEnriched: watsonxConfigured,
      analysedAt: new Date().toISOString(),
    };

    // Cache for roadmap + remediate endpoints
    currentAnalysis = { snapshot, analysisResult };

    res.json(analysisResult);
  } catch (err) {
    console.error('[analyze] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /roadmap ─────────────────────────────────────────────────────────────
// Takes analysisResult (or uses cached), returns phased roadmap
app.post('/roadmap', async (req, res) => {
  const analysisResult = req.body.analysisResult || currentAnalysis?.analysisResult;
  if (!analysisResult) {
    return res.status(400).json({ error: 'No analysis result available. Run POST /analyze first.' });
  }

  try {
    console.log('[roadmap] Generating roadmap...');
    const roadmap = await generateRoadmap(analysisResult.debtItems);

    // Attach phase number to each debt item
    const itemsWithPhase = analysisResult.debtItems.map((item) => ({
      ...item,
      phase: roadmap.itemPhaseMap[item.id] || 3,
    }));

    res.json({
      phases: roadmap.phases,
      summary: roadmap.summary,
      debtItems: itemsWithPhase,
      modelId: roadmap.modelId,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[roadmap] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST /remediate ───────────────────────────────────────────────────────────
// Generate remediation plan + PR summary for a specific debt item
// Supports streaming via SSE when ?stream=true
app.post('/remediate', async (req, res) => {
  const { debtItemId, debtItem: bodyItem, explainOnly } = req.body;
  const analysisResult = currentAnalysis?.analysisResult;

  // Resolve the debt item
  let debtItem = bodyItem;
  if (!debtItem && debtItemId && analysisResult) {
    // Support both "signal-001" IDs and ordinal numbers like "1", "2"
    if (/^\d+$/.test(String(debtItemId))) {
      const idx = parseInt(debtItemId, 10) - 1;
      debtItem = analysisResult.debtItems[idx] || null;
    } else {
      debtItem = analysisResult.debtItems.find((d) => d.id === debtItemId) || null;
    }
  }

  if (!debtItem) {
    return res.status(404).json({
      error: `Debt item "${debtItemId}" not found. Run POST /analyze first.`,
    });
  }

  const allDebtItems = analysisResult?.debtItems || [debtItem];

  try {
    if (explainOnly) {
      console.log(`[remediate] Explaining ${debtItem.id}...`);
      const result = await generateExplanation(debtItem, allDebtItems);
      return res.json({ ...result, debtItem });
    }

    console.log(`[remediate] Generating fix plan for ${debtItem.id}...`);
    const result = await generateRemediation(debtItem, allDebtItems);
    res.json(result);
  } catch (err) {
    console.error('[remediate] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Ordo backend running on http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
  console.log(`Model: ${MODEL_ID}`);
});
