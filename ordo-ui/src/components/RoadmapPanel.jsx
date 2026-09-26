import React from 'react';

const PHASE_LABELS = { 1: 'Critical Fixes', 2: 'Stability Improvements', 3: 'Code Quality' };

export default function RoadmapPanel({ roadmap, onSelectItem }) {
  const { phases, summary, debtItems } = roadmap;

  // Group items by phase
  const byPhase = { 1: [], 2: [], 3: [] };
  for (const item of (debtItems || [])) {
    const p = item.phase || 3;
    if (!byPhase[p]) byPhase[p] = [];
    byPhase[p].push(item);
  }

  return (
    <div>
      {summary && (
        <div className="roadmap-summary">
          <strong>AI Assessment</strong>{summary}
        </div>
      )}

      {phases.map((phase) => (
        <div key={phase.phase} className="roadmap-phase">
          <div className="phase-header">
            <div className={`phase-number phase-${phase.phase}`}>{phase.phase}</div>
            <div>
              <div className="phase-title">{phase.title || PHASE_LABELS[phase.phase]}</div>
            </div>
          </div>
          <div className="phase-rationale">{phase.rationale}</div>
          <div className="phase-items">
            {(byPhase[phase.phase] || []).map((item) => (
              <div key={item.id} className="phase-item" onClick={() => onSelectItem(item)}>
                <div className={`phase-number phase-${phase.phase}`} style={{ fontSize: 10.5, width: 26, height: 26 }}>
                  {item.urgencyScore}
                </div>
                <div className="phase-item-body">
                  <div className="phase-item-cat">{item.categoryLabel}</div>
                  <div className="phase-item-file">{item.filePath}</div>
                  <div className="phase-item-evidence">{item.explanation || item.evidence}</div>
                </div>
              </div>
            ))}
            {(byPhase[phase.phase] || []).length === 0 && (
              <div className="phase-empty">No items in this phase.</div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
