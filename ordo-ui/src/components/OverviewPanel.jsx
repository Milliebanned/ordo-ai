import React from 'react';
import BobPeek from './BobPeek.jsx';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const CATEGORY_COLORS = {
  'hardcoded-secrets':     '#ff7a8a',
  'complex-functions':     '#ffa36b',
  'thin-test-coverage':    '#ffc46b',
  'outdated-dependencies': '#5b9bff',
  'undocumented-apis':     '#8db8ff',
};

export default function OverviewPanel({ analysis, onSelectItem }) {
  const { debtItems, stats, metadata } = analysis;

  // Category breakdown for chart
  const categoryCount = {};
  for (const item of debtItems) {
    const label = item.categoryLabel || item.category;
    categoryCount[label] = (categoryCount[label] || 0) + 1;
  }
  const chartData = Object.entries(categoryCount).map(([name, count]) => ({ name, count }));

  return (
    <div>
      <div className="overview-grid">
        {/* Bob peeks over the top edge of the right-most card */}
        <BobPeek />

        {/* Category chart */}
        <div className="card">
          <div className="card-title">Debt by Category</div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={140} axisLine={false} tickLine={false} tick={{ fontSize: 11.5, fill: '#b9b6c2', fontFamily: 'Inter, system-ui, sans-serif' }} />
              <Tooltip
                contentStyle={{ background: '#0d0b13', border: '1px solid rgba(255,255,255,0.14)', borderRadius: 12, fontSize: 12, fontFamily: 'JetBrains Mono, ui-monospace, monospace' }}
                labelStyle={{ color: '#f4f3f7' }}
                itemStyle={{ color: '#b9b6c2' }}
                cursor={{ fill: 'rgba(91,155,255,0.06)' }}
              />
              <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                {chartData.map((entry) => {
                  const cat = Object.entries(categoryCount).find(([l]) => l === entry.name);
                  const catKey = Object.entries(CATEGORY_COLORS).find(([k]) => entry.name.toLowerCase().includes(k.split('-')[0]));
                  return <Cell key={entry.name} fill={catKey ? catKey[1] : '#4f7ef8'} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Repo stats */}
        <div className="card">
          <div className="card-title">Repository Stats</div>
          <div className="stat-rows">
            {[
              ['Source files', stats.sourceCount],
              ['Test files', stats.testCount],
              ['Coverage ratio', `${Math.round((stats.coverageRatio || 0) * 100)}%`],
              ['Files analyzed', stats.selectedFiles],
              ['Language', metadata.primaryLanguage],
              ['Stars', metadata.stars?.toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="stat-row">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top issues */}
      <div className="section-head">
        <h2>Top issues</h2>
        <span className="card-title" style={{ marginBottom: 0 }}>Ranked by urgency</span>
      </div>
      <div className="top-issues">
        {debtItems.slice(0, 5).map((item, idx) => (
          <div key={item.id} className="top-issue" onClick={() => onSelectItem(item)}>
            <span className="top-issue-rank">{String(idx + 1).padStart(2, '0')}</span>
            <div className="top-issue-min">
              <div className="top-issue-cat" style={{ color: CATEGORY_COLORS[item.category] || 'var(--text)' }}>
                {item.categoryLabel}
              </div>
              <div className="top-issue-file">{item.filePath}</div>
              <div className="top-issue-text">{item.explanation || item.evidence}</div>
            </div>
            <span className={item.urgencyScore >= 7 ? 'score-badge score-high' : item.urgencyScore >= 4 ? 'score-badge score-med' : 'score-badge score-low'}>{item.urgencyScore}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
