import React, { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { X, Zap, Copy, CheckCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import Sparkle from './Sparkle.jsx';
import { stripEmoji } from '../lib/noEmoji.js';

// Same-origin /api: proxied to the backend by Vite in dev and by Vercel rewrites in production.
const API = import.meta.env.VITE_API_URL || '/api';

export default function RemediationPanel({ item, allItems, onClose }) {
  const [state, setState] = useState('idle'); // idle | loading | done | error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [loadingExplain, setLoadingExplain] = useState(false);

  async function handleGenerate() {
    setState('loading');
    setError(null);
    try {
      const { data } = await axios.post(`${API}/remediate`, { debtItemId: item.id, debtItem: item });
      setResult(stripEmoji(data));
      setState('done');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setState('error');
    }
  }

  async function handleExplain() {
    setLoadingExplain(true);
    try {
      const { data } = await axios.post(`${API}/remediate`, { debtItemId: item.id, debtItem: item, explainOnly: true });
      setExplanation(stripEmoji(data.explanation));
    } catch {
      setExplanation(stripEmoji(item.explanation || item.evidence));
    } finally {
      setLoadingExplain(false);
    }
  }

  function handleCopy() {
    if (result?.prSummary) {
      navigator.clipboard.writeText(result.prSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const rank = allItems.findIndex((d) => d.id === item.id) + 1;

  return (
    <div className="remediation-overlay" onClick={onClose}>
      <div className="remediation-panel" onClick={(e) => e.stopPropagation()}>
        {/* Panel header */}
        <div className="rp-header">
          <div className="rp-title">
            <Zap size={14} color="var(--accent)" />
            Issue #{rank} · {item.categoryLabel}
          </div>
          <button className="rp-close" onClick={onClose}><X size={16} /></button>
        </div>

        {/* Issue summary */}
        <div className="rp-issue-summary">
          <div className="rp-file">{item.filePath}{item.lineRange ? `:${item.lineRange}` : ''}</div>
          <div className="rp-evidence">{item.explanation || item.evidence}</div>
          <div className="rp-scores">
            <span>Urgency <strong style={{ color: item.urgencyScore >= 7 ? 'var(--red)' : item.urgencyScore >= 4 ? 'var(--yellow)' : 'var(--green)' }}>{item.urgencyScore}/10</strong></span>
            <span>Impact <strong>{item.businessImpactScore}/10</strong></span>
            <span>Effort <strong>{item.fixEffortScore}/10</strong></span>
            {item.aiEnriched && <span className="ai-badge"><Sparkle /> AI-scored</span>}
          </div>
        </div>

        {/* Explain why */}
        {!explanation && (
          <button className="rp-explain-btn" onClick={handleExplain} disabled={loadingExplain}>
            {loadingExplain ? 'Bob is working it out…' : <><Sparkle /> Why is this ranked here?</>}
          </button>
        )}
        {explanation && (
          <div className="rp-explanation">
            <div className="rp-section-title">AI Explanation</div>
            <p>{explanation}</p>
          </div>
        )}

        {/* Generate fix button */}
        {state === 'idle' && (
          <button className="rp-generate-btn" onClick={handleGenerate}>
            Generate Fix Plan + PR Summary <ArrowRight size={17} strokeWidth={1.6} />
          </button>
        )}

        {state === 'loading' && (
          <div className="rp-loading">
            <div className="spinner" />
            <span>Bob is writing your fix plan, assisted by watsonx.ai…</span>
          </div>
        )}

        {state === 'error' && (
          <div className="rp-error">
            <AlertTriangle size={14} />
            {error}
            <button className="rp-retry-btn" onClick={handleGenerate}>Retry</button>
          </div>
        )}

        {state === 'done' && result && (
          <div className="rp-result">
            {/* Remediation plan */}
            <div className="rp-section-title">Remediation Plan</div>
            <div className="rp-plan-summary">{result.remediationPlan?.summary}</div>

            <ol className="rp-steps">
              {(result.remediationPlan?.steps || []).map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>

            {(result.remediationPlan?.codeHints || []).length > 0 && (
              <div className="rp-hints">
                <strong>Code hints:</strong> {result.remediationPlan.codeHints.join(' · ')}
              </div>
            )}

            <div className="rp-effort">
              Estimated effort: <strong>{result.remediationPlan?.estimatedEffort}</strong>
              {' · '}Testing: <em>{result.remediationPlan?.testingNotes}</em>
            </div>

            {/* PR Summary */}
            <div className="rp-pr-header">
              <div className="rp-section-title">PR Summary</div>
              <button className="rp-copy-btn" onClick={handleCopy}>
                {copied ? <><CheckCheck size={13} /> Copied!</> : <><Copy size={13} /> Copy PR Summary</>}
              </button>
            </div>

            <div className="rp-pr-body">
              <ReactMarkdown>{result.prSummary || ''}</ReactMarkdown>
            </div>

            <div className="rp-model-attr">
              Generated by <strong>IBM Bob 2.0</strong> · assisted by watsonx.ai · {result.modelId}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
