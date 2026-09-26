import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Sparkle from './Sparkle.jsx';
import IssueCard from './IssueCard.jsx';
import OverviewPanel from './OverviewPanel.jsx';
import RoadmapPanel from './RoadmapPanel.jsx';
import RemediationPanel from './RemediationPanel.jsx';

export default function Dashboard({ analysis, roadmap, onReset }) {
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | roadmap
  const [remediationOpen, setRemediationOpen] = useState(false);

  const { metadata, summary, debtItems, modelId, aiEnriched } = analysis;

  function handleSelectItem(item) {
    setSelectedItem(item);
    setRemediationOpen(true);
  }

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-header">
        <div className="dash-logo"><img src="/ordo-logo.png" alt="Ordo" width="1077" height="386" /></div>

        <div className="dash-meta">
          <a href={metadata.url} target="_blank" rel="noreferrer">{metadata.fullName}</a>
          {' · '}{metadata.primaryLanguage}
          {aiEnriched ? <span className="dash-tag ai"><Sparkle /> AI-enriched</span> : <span className="dash-tag heur">Heuristic scores</span>}
          <br />
          <span className="dash-model">Powered by <strong>IBM Bob 2.0</strong> · assisted by watsonx.ai · {modelId}</span>
        </div>

        <button className="reset-btn" onClick={onReset}>
          <ArrowLeft size={15} strokeWidth={1.6} /> New analysis
        </button>
      </header>

      <div className="dash-body">
        {/* Left — issue list */}
        <div className="dash-left">
          {/* Stats bar */}
          <div className="summary-bar">
            <div className="stat-box">
              <div className="stat-number total-num">{summary.totalDebtItems}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-box">
              <div className="stat-number high-num">{summary.highUrgency}</div>
              <div className="stat-label">High</div>
            </div>
            <div className="stat-box">
              <div className="stat-number med-num">{summary.mediumUrgency}</div>
              <div className="stat-label">Medium</div>
            </div>
            <div className="stat-box">
              <div className="stat-number low-num">{summary.lowUrgency}</div>
              <div className="stat-label">Low</div>
            </div>
          </div>

          <div className="issue-list-header">Issues · ranked by urgency</div>

          <div className="issue-list">
            {debtItems.map((item, idx) => (
              <IssueCard
                key={item.id}
                item={item}
                index={idx + 1}
                selected={selectedItem?.id === item.id}
                onClick={() => handleSelectItem(item)}
              />
            ))}
          </div>
        </div>

        {/* Right — tabs */}
        <div className="dash-right">
          <div className="tab-bar">
            <button className={`tab-btn${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
            <button className={`tab-btn${activeTab === 'roadmap' ? ' active' : ''}`} onClick={() => setActiveTab('roadmap')}>Roadmap</button>
          </div>

          {activeTab === 'overview' && (
            <OverviewPanel analysis={analysis} onSelectItem={handleSelectItem} />
          )}
          {activeTab === 'roadmap' && roadmap && (
            <RoadmapPanel roadmap={roadmap} onSelectItem={(item) => { handleSelectItem(item); setActiveTab('overview'); }} />
          )}
          {activeTab === 'roadmap' && !roadmap && (
            <p className="muted-note">Roadmap not available.</p>
          )}

          <div className="model-attribution">
            Powered by <strong>IBM Bob 2.0</strong> · assisted by watsonx.ai · Model: <strong>{modelId}</strong>
          </div>
        </div>
      </div>

      {/* Remediation slide-over */}
      {remediationOpen && selectedItem && (
        <RemediationPanel
          item={selectedItem}
          allItems={debtItems}
          onClose={() => setRemediationOpen(false)}
        />
      )}
    </div>
  );
}
