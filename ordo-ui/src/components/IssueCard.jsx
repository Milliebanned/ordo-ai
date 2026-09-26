import React from 'react';
import { Shield, Layers, TestTube, Package, FileText } from 'lucide-react';
import Sparkle from './Sparkle.jsx';

const CATEGORY_ICONS = {
  'hardcoded-secrets':    <Shield size={12} color="var(--red)" />,
  'complex-functions':    <Layers size={12} color="var(--orange)" />,
  'thin-test-coverage':   <TestTube size={12} color="var(--yellow)" />,
  'outdated-dependencies':<Package size={12} color="var(--accent)" />,
  'undocumented-apis':    <FileText size={12} color="var(--purple)" />,
};

const CATEGORY_COLORS = {
  'hardcoded-secrets':     'var(--red)',
  'complex-functions':     'var(--orange)',
  'thin-test-coverage':    'var(--yellow)',
  'outdated-dependencies': 'var(--accent)',
  'undocumented-apis':     'var(--purple)',
};

function scoreBadgeClass(score) {
  if (score >= 7) return 'score-badge score-high';
  if (score >= 4) return 'score-badge score-med';
  return 'score-badge score-low';
}

export default function IssueCard({ item, index, selected, onClick }) {
  const color = CATEGORY_COLORS[item.category] || 'var(--muted)';
  const icon = CATEGORY_ICONS[item.category] || null;

  return (
    <div className={`issue-card${selected ? ' selected' : ''}`} onClick={onClick}>
      <div className="issue-card-top">
        <div className="issue-category" style={{ color }}>
          {icon}
          <span>#{index} · {item.categoryLabel || item.category}</span>
        </div>
        <span className={scoreBadgeClass(item.urgencyScore)}>{item.urgencyScore}</span>
      </div>

      <div className="issue-file">{item.filePath}{item.lineRange ? `:${item.lineRange}` : ''}</div>

      <div className="issue-evidence">{item.explanation || item.evidence}</div>

      <div className="issue-scores">
        <span className="score-pill">Urgency <strong>{item.urgencyScore}/10</strong></span>
        <span className="score-pill">Impact <strong>{item.businessImpactScore}/10</strong></span>
        <span className="score-pill">Effort <strong>{item.fixEffortScore}/10</strong></span>
        {item.aiEnriched && <span className="ai-badge"><Sparkle /> AI</span>}
      </div>
    </div>
  );
}
