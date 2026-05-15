import React, { useState } from 'react';

const pipelines = [
  {
    id: 'RUN-097',
    name: 'login-regression-v2 · Playwright/TS',
    time: 'Apr 25 · 14:20',
    pass: 89,
    fail: 0,
    status: 'Passed',
  },
  {
    id: 'RUN-096',
    name: 'dashboard-smoke · Playwright/TS',
    time: 'Apr 25 · 12:45',
    pass: 21,
    fail: 3,
    status: 'Failed',
  },
  {
    id: 'RUN-095',
    name: 'checkout-e2e · Selenium/Java',
    time: 'Apr 24 · 18:00',
    pass: 56,
    fail: 2,
    status: 'Failed',
  },
  {
    id: 'RUN-094',
    name: 'api-smoke · Postman/Newman',
    time: 'Apr 24 · 14:00',
    pass: 34,
    fail: 0,
    status: 'Passed',
  },
];

const CICDPage: React.FC = () => {
  const [pipelineFilter, setPipelineFilter] = useState('All pipelines');
  const [dateFilter, setDateFilter] = useState('Last 7 days');

  return (
    <>
      <div className="content">
        {/* Header inside content */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            padding: '20px 0',
          }}
        >
          <span className="page-title">
            CI/CD Executions <span className="sub">Story 8</span>
          </span>
          <button className="btn btn-primary">▶ Trigger Run</button>
        </div>
        <div className="three-col">
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">91</div>
            <div className="stat-label">Passed Runs</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">❌</div>
            <div className="stat-value">5</div>
            <div className="stat-label">Failed Runs</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon">⏱</div>
            <div className="stat-value">4m 22s</div>
            <div className="stat-label">Avg Duration</div>
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <span style={{ color: 'var(--accent)' }}>🚀</span>
            <span className="card-title">Execution History</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <select
                style={{ fontSize: 12, padding: '6px 28px 6px 10px' }}
                value={pipelineFilter}
                onChange={e => setPipelineFilter(e.target.value)}
              >
                <option>All pipelines</option>
              </select>
              <select
                style={{ fontSize: 12, padding: '6px 28px 6px 10px' }}
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
              >
                <option>Last 7 days</option>
              </select>
            </div>
          </div>
          <div className="card-body no-pad">
            {pipelines.map(row => (
              <div className="exec-row" key={row.id}>
                <div className="exec-id">#{row.id}</div>
                <div className="exec-name">{row.name}</div>
                <div className="exec-time">{row.time}</div>
                <div className="exec-result">
                  <span className="pass-count">✓ {row.pass} pass</span>{' '}
                  <span className="fail-count">✗ {row.fail} fail</span>
                </div>
                <div className={`status-chip ${row.status === 'Passed' ? 'done' : 'failed'}`}>
                  {row.status}
                </div>
                <button
                  className="btn btn-ghost"
                  style={{ fontSize: 12, padding: '5px 10px', marginLeft: 4 }}
                >
                  Logs
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default CICDPage;
