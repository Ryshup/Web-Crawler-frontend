import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useLiveJobs from '@hooks/useLiveJobs';

interface ActivityLogEntry {
  time: string;
  level: string;
  levelColor: string;
  message: string;
}

interface CrawlJob {
  jobId: string;
  url: string;
  status: string;
  createdAt: Date;
  completedAt?: Date;
  pagesDiscovered: number;
  pagesCrawled: number;
}

const generateActivityLog = (job: CrawlJob): ActivityLogEntry[] => {
  const entries: ActivityLogEntry[] = [];

  const createdAt = new Date(job.createdAt);
  const now = new Date();

  // IMPORTANT: For completed/failed jobs, calculate elapsed time ONCE and freeze it
  // Use completedAt if available, otherwise use createdAt + pagesDiscovered as proxy
  let elapsedMs: number;

  if (job.status === 'completed' || job.status === 'failed') {
    // For completed/failed: use stored completedAt or estimate from data
    if (job.completedAt) {
      const completedAt = new Date(job.completedAt);
      elapsedMs = completedAt.getTime() - createdAt.getTime();
    } else {
      // Fallback: estimate based on pages (rough estimate: 2 seconds per page)
      elapsedMs = Math.max(5000, job.pagesCrawled * 2000);
    }
  } else {
    // For running/pending: use current time (will update every second)
    elapsedMs = now.getTime() - createdAt.getTime();
  }

  const formatTime = (date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    const secs = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${mins}:${secs}`;
  };

  // Event 1: Job queued at creation time
  entries.push({
    time: formatTime(createdAt),
    level: 'INFO',
    levelColor: 'var(--accent)',
    message: `Crawl queued for ${job.url}`,
  });

  if (job.status === 'pending') {
    // Still pending - show initializing
    const initTime = new Date(createdAt.getTime() + 2000);
    entries.push({
      time: formatTime(initTime),
      level: 'INFO',
      levelColor: 'var(--accent)',
      message: 'Initializing crawler and discovering pages...',
    });
  } else {
    // Running, completed, or failed - show discovery
    const discoveredTime = new Date(createdAt.getTime() + 2000);
    entries.push({
      time: formatTime(discoveredTime),
      level: 'INFO',
      levelColor: 'var(--accent)',
      message: `Discovered ${Math.max(1, job.pagesDiscovered)} pages to crawl`,
    });

    if (job.pagesCrawled > 0) {
      // Show progress
      const progressTime = new Date(createdAt.getTime() + 5000);
      const progress = Math.min(
        99,
        Math.floor((job.pagesCrawled / Math.max(job.pagesDiscovered, 1)) * 100),
      );
      entries.push({
        time: formatTime(progressTime),
        level: 'STEP',
        levelColor: 'var(--accent2)',
        message: `Crawling in progress... ${progress}% (${job.pagesCrawled}/${job.pagesDiscovered} pages)`,
      });
    }

    if (job.status === 'running') {
      // Still running - show current elapsed time (will update)
      const currentTime = new Date(createdAt.getTime() + 8000);
      entries.push({
        time: formatTime(currentTime),
        level: 'INFO',
        levelColor: 'var(--accent)',
        message: `⏳ Crawl running · ${Math.floor((now.getTime() - createdAt.getTime()) / 1000)}s elapsed`,
      });
    } else if (job.status === 'completed') {
      // Completed - use FROZEN elapsed time
      const completeTime = new Date(createdAt.getTime() + Math.min(elapsedMs, 10000));
      entries.push({
        time: formatTime(completeTime),
        level: 'STEP',
        levelColor: 'var(--accent2)',
        message: `✓ Crawl completed successfully`,
      });

      const summaryTime = new Date(completeTime.getTime() + 1000);
      entries.push({
        time: formatTime(summaryTime),
        level: 'INFO',
        levelColor: 'var(--accent)',
        message: `Total pages crawled: ${job.pagesCrawled} · ${Math.floor(elapsedMs / 1000)}s total time`,
      });
    } else if (job.status === 'failed') {
      // Failed - use FROZEN elapsed time
      const failTime = new Date(createdAt.getTime() + Math.min(elapsedMs, 8000));
      entries.push({
        time: formatTime(failTime),
        level: 'ERROR',
        levelColor: 'var(--error)',
        message: `✗ Crawl failed · Crawled ${job.pagesCrawled} pages before failure`,
      });
    } else if (job.status === 'paused') {
      const pauseTime = new Date(createdAt.getTime() + Math.min(elapsedMs, 7000));
      entries.push({
        time: formatTime(pauseTime),
        level: 'WARN',
        levelColor: 'var(--accent2)',
        message: `⏸ Crawl paused · ${job.pagesCrawled}/${job.pagesDiscovered} pages crawled`,
      });
    }
  }

  return entries.slice(0, 6); // Return max 6 entries
};

const LiveJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const { jobs, rawJobs, selectedFilter, handleFilterChange, loading } = useLiveJobs();
  const [activityLogRefresh, setActivityLogRefresh] = useState(0);

  // Refresh activity log every second for live updates
  useEffect(() => {
    const interval = setInterval(() => {
      setActivityLogRefresh(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);
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
            Live Jobs
            <span
              style={{
                marginLeft: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: 'var(--text-muted)',
              }}
            >
              <span className="live-dot" /> Polling every 3s
            </span>
          </span>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="btn btn-ghost" onClick={() => navigate('/')}>
              ← Dashboard
            </button>
            <button className="btn btn-primary" onClick={() => navigate('/new-crawl')}>
              ＋ Crawl
            </button>
          </div>
        </div>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span style={{ color: 'var(--accent)' }}>⚡</span>
            <span className="card-title">All Crawl Jobs</span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <select
                style={{ fontSize: 12, padding: '6px 28px 6px 10px' }}
                value={selectedFilter}
                onChange={e => handleFilterChange(e.target.value)}
              >
                <option>All status</option>
                <option>Running</option>
                <option>Completed</option>
                <option>Failed</option>
                <option>Paused</option>
              </select>
            </div>
          </div>
          <div className="card-body no-pad">
            {loading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Loading jobs...
              </div>
            ) : jobs.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                No jobs found. Start a crawl to see it here.
              </div>
            ) : (
              jobs.map(job => (
                <div key={job.jobId} className="crawl-job">
                  <div className={`job-icon ${job.status}`}>{job.icon}</div>
                  <div className="job-info">
                    <div className="job-name">{job.jobName}</div>
                    <div className="job-url">{job.jobUrl}</div>
                  </div>
                  <div className="job-progress">
                    <div className="progress-bar">
                      <div
                        className={`progress-fill ${job.status}`}
                        style={{ width: `${job.progress}%` }}
                      ></div>
                    </div>
                    <div className="progress-label">{job.details}</div>
                  </div>
                  <div className={`status-chip ${job.status}`}>
                    {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                  </div>
                  <button
                    className="btn btn-ghost"
                    style={{ fontSize: 12, padding: '5px 10px', marginLeft: 4 }}
                  >
                    {job.action}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Status log */}
        <div className="card">
          <div className="card-header">
            <span style={{ color: 'var(--accent2)' }}>📜</span>
            <span className="card-title">
              Activity Log —{' '}
              {rawJobs && rawJobs.length > 0
                ? `Crawl - ${new URL(rawJobs[0].url).hostname}`
                : 'No jobs'}
            </span>
          </div>
          <div
            className="card-body"
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 12,
              lineHeight: 1.8,
              color: 'var(--text-dim)',
            }}
          >
            {rawJobs && rawJobs.length > 0 ? (
              generateActivityLog(rawJobs[0]).map((entry, idx) => (
                <div key={`${activityLogRefresh}-${idx}`}>
                  <span style={{ color: 'var(--text-muted)' }}>[{entry.time}]</span>{' '}
                  <span style={{ color: entry.levelColor }}>{entry.level}</span> {entry.message}
                </div>
              ))
            ) : (
              <div style={{ color: 'var(--text-muted)' }}>No activity yet</div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default LiveJobsPage;
