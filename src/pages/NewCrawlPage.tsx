import React, { useState, useRef, useEffect } from 'react';
import { crawlerService } from '@services/crawlerService';
import { CrawlStartRequest, CrawlResultsResponse, CrawlStatusResponse } from '@app-types/index';
import './CrawlerPage.css';

// Status Popup Modal Component
interface StatusPopupProps {
  isOpen: boolean;
  jobStatus: CrawlStatusResponse | null;
  onClose: () => void;
  onPause: () => void;
  onResume: () => void;
  isLoading: boolean;
  statusColorMap: Record<string, string>;
}

const StatusPopup: React.FC<StatusPopupProps> = ({
  isOpen,
  jobStatus,
  onClose,
  onPause,
  onResume,
  isLoading,
  statusColorMap,
}) => {
  if (!isOpen || !jobStatus) return null;

  const canPause = jobStatus.status === 'running';
  const canResume = jobStatus.status === 'paused';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#111827',
          borderRadius: 12,
          padding: 32,
          maxWidth: 480,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          position: 'relative',
          border: '1px solid #1F2937',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            background: 'none',
            border: 'none',
            fontSize: 20,
            cursor: 'pointer',
            color: '#9ca3af',
            padding: 0,
            width: 24,
            height: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#6b7280')}
          onMouseLeave={e => (e.currentTarget.style.color = '#9ca3af')}
        >
          ✕
        </button>

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 24, color: '#E5E7EB' }}>
          Job Status
        </div>

        {/* Status Badge & Job ID */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              padding: '6px 12px',
              backgroundColor: statusColorMap[jobStatus.status] || '#6b7280',
              color: 'white',
              borderRadius: 6,
              textTransform: 'capitalize',
              letterSpacing: '0.5px',
            }}
          >
            {jobStatus.status}
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF' }}>
            ID:{' '}
            <code style={{ fontSize: 11, fontFamily: 'monospace', color: '#9CA3AF' }}>
              {jobStatus.job_id.substring(0, 12)}...
            </code>
          </div>
        </div>

        {/* Status Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          <div
            style={{
              padding: 16,
              backgroundColor: '#0B1220',
              borderRadius: 6,
              border: '1px solid #1F2937',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginBottom: 8 }}>
              URLs DISCOVERED
            </div>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#E5E7EB', lineHeight: 1 }}>
              {jobStatus.unique_urls_discovered || 0}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              backgroundColor: '#0B1220',
              borderRadius: 6,
              border: '1px solid #1F2937',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 500, color: '#9CA3AF', marginBottom: 8 }}>
              STATUS
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#E5E7EB' }}>
              {jobStatus.status === 'running' && '🔄 Running'}
              {jobStatus.status === 'pending' && '⏳ Pending'}
              {jobStatus.status === 'paused' && '⏸️ Paused'}
              {jobStatus.status === 'completed' && '✅ Completed'}
              {jobStatus.status === 'failed' && '❌ Failed'}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          {canPause && (
            <button
              onClick={onPause}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#f3f4f6',
                color: 'black',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = '#e5e7eb')}
              onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = '#f3f4f6')}
            >
              ⏸ Pause
            </button>
          )}
          {canResume && (
            <button
              onClick={onResume}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '12px 16px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: 13,
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => !isLoading && (e.currentTarget.style.backgroundColor = '#2563eb')}
              onMouseLeave={e => !isLoading && (e.currentTarget.style.backgroundColor = '#3b82f6')}
            >
              ▶ Resume
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '12px 16px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
              e.currentTarget.style.borderColor = '#d1d5db';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.borderColor = '#e5e7eb';
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// History Edit Modal Component
interface HistoryEditModalProps {
  isOpen: boolean;
  job: CrawlJob | null;
  onClose: () => void;
  onPause: (jobId: string) => void;
  onResume: (jobId: string) => void;
  isLoading: boolean;
  statusColorMap: Record<string, string>;
}

const HistoryEditModal: React.FC<HistoryEditModalProps> = ({
  isOpen,
  job,
  onClose,
  onPause,
  onResume,
  isLoading,
  statusColorMap,
}) => {
  if (!isOpen || !job) return null;

  const canPause = job.status === 'running';
  const canResume = job.status === 'paused';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#111827',
          borderRadius: 12,
          padding: 28,
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          maxHeight: '80vh',
          overflowY: 'auto',
          position: 'relative',
          border: '1px solid #1F2937',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#6b7280',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          ✕
        </button>

        {/* Title */}
        <div style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 6, color: '#E5E7EB' }}>
          Edit Job
        </div>
        <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20 }}>{job.url}</div>

        {/* Job Info */}
        <div
          style={{
            padding: 14,
            backgroundColor: '#0B1220',
            borderRadius: 8,
            marginBottom: 20,
            border: '1px solid #1F2937',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>Status:</span>
            <div
              style={{
                fontSize: 11,
                fontWeight: 'bold',
                padding: '4px 8px',
                backgroundColor: statusColorMap[job.status],
                color: 'white',
                borderRadius: 3,
                textTransform: 'capitalize',
              }}
            >
              {job.status}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>Created:</span>
            <span style={{ fontSize: 12, color: '#E5E7EB' }}>{job.createdAt.toLocaleString()}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#9CA3AF', fontSize: 12 }}>Pages Crawled:</span>
            <span style={{ fontSize: 12, color: '#E5E7EB' }}>{job.pagesCrawled}</span>
          </div>
        </div>

        {/* Control Section */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 12, color: '#E5E7EB' }}>
            Job Controls
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {canPause && (
              <button
                onClick={() => {
                  onPause(job.jobId);
                  onClose();
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: '#f97316',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                ⏸ Pause
              </button>
            )}
            {canResume && (
              <button
                onClick={() => {
                  onResume(job.jobId);
                  onClose();
                }}
                disabled={isLoading}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 'bold',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                ▶ Resume
              </button>
            )}
          </div>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#1F2937',
            color: '#E5E7EB',
            border: '1px solid #1F2937',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 'bold',
            cursor: 'pointer',
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

// Clear History Modal Component
interface ClearHistoryModalProps {
  isOpen: boolean;
  mode: 'all' | 'single';
  jobToDelete?: CrawlJob | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const ClearHistoryModal: React.FC<ClearHistoryModalProps> = ({
  isOpen,
  mode,
  jobToDelete,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isSingleDelete = mode === 'single' && jobToDelete;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 998,
      }}
      onClick={onCancel}
    >
      <div
        style={{
          backgroundColor: '#111827',
          borderRadius: 12,
          padding: 28,
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          border: '1px solid #1F2937',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Warning Icon */}
        <div
          style={{
            fontSize: 40,
            marginBottom: 16,
            textAlign: 'center',
          }}
        >
          ⚠️
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 8,
            textAlign: 'center',
            color: '#E5E7EB',
          }}
        >
          {isSingleDelete ? 'Delete Job?' : 'Clear History?'}
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: 13,
            color: '#9CA3AF',
            marginBottom: 20,
            textAlign: 'center',
            lineHeight: 1.6,
          }}
        >
          {isSingleDelete ? (
            <>
              Are you sure you want to delete the job for <strong>{jobToDelete.url}</strong>?
              <br />
              This action cannot be undone.
            </>
          ) : (
            <>
              Are you sure you want to clear all crawl history?
              <br />
              This action cannot be undone.
            </>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#1F2937',
              color: '#E5E7EB',
              border: '1px solid #1F2937',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 16px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            {isSingleDelete ? 'Delete' : 'Clear All'}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CrawlJob {
  jobId: string;
  url: string;
  status: string;
  createdAt: Date;
  pagesDiscovered: number;
  pagesCrawled: number;
}

const tips = [
  '🔗 Provide a specific page URL for targeted test generation',
  '� Attach Swagger/OpenAPI docs for API test cases',
  '⚡ Shallow: Fastest, covers only top-level pages, lowest token usage.',
  '⚡ Standard: Balanced speed and coverage, recommended for most cases.',
  '⚡ Deep: Thorough, covers all nested flows, highest token usage.',
];

const CrawlPage: React.FC = () => {
  const [section, setSection] = useState<'new' | 'history'>('new');

  // Form state
  const [url, setUrl] = useState('');
  const [maxDepth, setMaxDepth] = useState(2);
  const [excludedUrls, setExcludedUrls] = useState('');
  const [externalUrls, setExternalUrls] = useState<string[]>(['']);
  const [externalUrlErrors, setExternalUrlErrors] = useState<Record<number, string>>({});

  // API state
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Job state
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<CrawlStatusResponse | null>(null);
  const [_crawlResults, _setCrawlResults] = useState<CrawlResultsResponse | null>(null);
  const [crawlHistory, setCrawlHistory] = useState<CrawlJob[]>([]);

  // Modal state
  const [showStatusPopup, setShowStatusPopup] = useState(false);
  const [selectedHistoryJob, setSelectedHistoryJob] = useState<CrawlJob | null>(null);
  const [showHistoryEditModal, setShowHistoryEditModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [clearHistoryMode, setClearHistoryMode] = useState<'all' | 'single'>('all');
  const [jobToDelete, setJobToDelete] = useState<CrawlJob | null>(null);

  // Polling
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load history from localStorage and restore current job on component mount
  useEffect(() => {
    try {
      // Load history
      const savedHistory = localStorage.getItem('crawlHistory');
      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory) as CrawlJob[];
        setCrawlHistory(parsedHistory);
      }

      // Restore current job if it was running
      const savedJobId = sessionStorage.getItem('currentJobId');
      const savedJobStatus = sessionStorage.getItem('jobStatus');

      if (savedJobId && savedJobStatus) {
        try {
          const parsedStatus = JSON.parse(savedJobStatus) as CrawlStatusResponse;
          setCurrentJobId(savedJobId);
          setJobStatus(parsedStatus);

          // Auto-open status popup if job is still running
          if (
            parsedStatus.status === 'running' ||
            parsedStatus.status === 'pending' ||
            parsedStatus.status === 'paused'
          ) {
            setShowStatusPopup(true);
          }
        } catch (parseErr) {
          console.error('Failed to parse saved job status:', parseErr);
        }
      }
    } catch (err) {
      console.error('Failed to load crawl history from localStorage:', err);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('crawlHistory', JSON.stringify(crawlHistory));
    } catch (err) {
      console.error('Failed to save crawl history to localStorage:', err);
    }
  }, [crawlHistory]);

  // Persist current job state to sessionStorage
  useEffect(() => {
    if (currentJobId && jobStatus) {
      try {
        sessionStorage.setItem('currentJobId', currentJobId);
        sessionStorage.setItem('jobStatus', JSON.stringify(jobStatus));
      } catch (err) {
        console.error('Failed to save job state to sessionStorage:', err);
      }
    } else {
      // Clear if job is no longer active
      sessionStorage.removeItem('currentJobId');
      sessionStorage.removeItem('jobStatus');
    }
  }, [currentJobId, jobStatus]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Poll for status updates when job is running
  useEffect(() => {
    if (
      !currentJobId ||
      !jobStatus ||
      jobStatus.status === 'completed' ||
      jobStatus.status === 'failed'
    ) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    const pollStatus = async () => {
      try {
        const status = await crawlerService.getCrawlStatus(currentJobId);
        setJobStatus(status);

        // Update history entry with new status
        setCrawlHistory(prev =>
          prev.map(job =>
            job.jobId === currentJobId
              ? {
                  ...job,
                  status: status.status,
                  pagesDiscovered: status.unique_urls_discovered || 0,
                }
              : job,
          ),
        );

        // If completed, fetch results
        if (status.status === 'completed') {
          const results = await crawlerService.getCrawlResults(currentJobId);
          _setCrawlResults(results);
          setSuccessMessage(`✓ Crawl completed! Found ${results.pages.length} pages.`);

          // Update history with final page count
          setCrawlHistory(prev =>
            prev.map(job =>
              job.jobId === currentJobId
                ? {
                    ...job,
                    status: 'completed',
                    pagesCrawled: results.pages.length,
                  }
                : job,
            ),
          );
        }
      } catch (err) {
        // Silent fail on poll, don't interrupt user experience
        console.error('Error polling status:', err);
      }
    };

    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(pollStatus, 2000);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [currentJobId, jobStatus]);

  const validateUrl = (urlString: string): boolean => {
    try {
      new URL(urlString);
      return true;
    } catch {
      return false;
    }
  };

  const handleExternalUrlChange = (index: number, value: string) => {
    const updated = [...externalUrls];
    updated[index] = value;
    setExternalUrls(updated);

    // Validate URL if not empty
    const errors = { ...externalUrlErrors };
    if (value.trim() && !validateUrl(value)) {
      errors[index] = 'Invalid URL format';
    } else {
      delete errors[index];
    }
    setExternalUrlErrors(errors);
  };

  const handleAddExternalUrl = () => {
    if (externalUrls.length < 10) {
      setExternalUrls([...externalUrls, '']);
    }
  };

  const handleRemoveExternalUrl = (index: number) => {
    const updated = externalUrls.filter((_, i) => i !== index);
    setExternalUrls(updated);

    // Clean up errors for removed index
    const errors = { ...externalUrlErrors };
    delete errors[index];
    setExternalUrlErrors(errors);
  };

  const getValidExternalUrls = (): string[] => {
    return externalUrls.filter(url => url.trim() && validateUrl(url));
  };

  const handleStartCrawl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    if (!validateUrl(url)) {
      setError('Invalid URL format. Use https://example.com');
      return;
    }

    if (maxDepth < 1 || maxDepth > 10) {
      setError('Crawl depth must be between 1 and 10');
      return;
    }

    setIsLoading(true);

    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      const request: CrawlStartRequest = {
        base_url: url,
        max_depth: maxDepth,
        excluded_urls: excludedUrls.trim() || undefined,
        external_urls: getValidExternalUrls().length > 0 ? getValidExternalUrls() : undefined,
      };

      const response = await crawlerService.startCrawl(request, {
        signal: abortControllerRef.current.signal,
      });

      setCurrentJobId(response.job_id);
      setJobStatus({
        job_id: response.job_id,
        status: 'pending',
        unique_urls_discovered: 0,
      });

      // Add to history
      setCrawlHistory(prev => [
        {
          jobId: response.job_id,
          url: url,
          status: 'pending',
          createdAt: new Date(),
          pagesDiscovered: 0,
          pagesCrawled: 0,
        },
        ...prev,
      ]);

      setSuccessMessage(`✓ Crawl job started!`);
      setError(null);

      // Automatically open status popup
      setShowStatusPopup(true);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to start crawl';
      setError(errorMsg);
      setCurrentJobId(null);
      setJobStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseCrawl = async () => {
    if (!currentJobId) return;

    setIsLoading(true);
    try {
      await crawlerService.pauseCrawl(currentJobId);
      setJobStatus(prev => (prev ? { ...prev, status: 'paused' } : null));
      setSuccessMessage('✓ Crawl paused');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to pause crawl';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeCrawl = async () => {
    if (!currentJobId) return;

    setIsLoading(true);
    try {
      await crawlerService.resumeCrawl(currentJobId);
      setJobStatus(prev => (prev ? { ...prev, status: 'running' } : null));
      setSuccessMessage('✓ Crawl resumed');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resume crawl';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCrawl = async (jobId?: string) => {
    const idToExport = jobId || currentJobId;
    if (!idToExport) return;

    try {
      const blob = await crawlerService.exportCrawl(idToExport);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `crawl-${idToExport}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setSuccessMessage('✓ Export completed');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to export crawl';
      setError(errorMsg);
    }
  };

  const handleClearHistory = () => {
    setShowClearHistoryModal(true);
    setClearHistoryMode('all');
  };

  const handleDeleteJob = (job: CrawlJob) => {
    setShowClearHistoryModal(true);
    setClearHistoryMode('single');
    setJobToDelete(job);
  };

  const confirmDeleteJob = () => {
    if (clearHistoryMode === 'single' && jobToDelete) {
      setCrawlHistory(prev => prev.filter(job => job.jobId !== jobToDelete.jobId));
      setSuccessMessage('✓ Job deleted');
    } else if (clearHistoryMode === 'all') {
      setCrawlHistory([]);
      setSuccessMessage('✓ Crawl history cleared');
    }
    setShowClearHistoryModal(false);
    setJobToDelete(null);
  };

  const handleOpenStatusPopup = () => {
    setShowStatusPopup(true);
  };

  const handleCloseStatusPopup = () => {
    setShowStatusPopup(false);
  };

  const handleOpenHistoryEditModal = (job: CrawlJob) => {
    setSelectedHistoryJob(job);
    setShowHistoryEditModal(true);
  };

  const handleCloseHistoryEditModal = () => {
    setShowHistoryEditModal(false);
    setSelectedHistoryJob(null);
  };

  const handlePauseJobFromHistory = async (jobId: string) => {
    setIsLoading(true);
    try {
      await crawlerService.pauseCrawl(jobId);
      setCrawlHistory(prev =>
        prev.map(job => (job.jobId === jobId ? { ...job, status: 'paused' } : job)),
      );
      setSuccessMessage('✓ Crawl paused');
      handleCloseHistoryEditModal();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to pause crawl';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResumeJobFromHistory = async (jobId: string) => {
    setIsLoading(true);
    try {
      await crawlerService.resumeCrawl(jobId);
      setCrawlHistory(prev =>
        prev.map(job => (job.jobId === jobId ? { ...job, status: 'running' } : job)),
      );
      setSuccessMessage('✓ Crawl resumed');
      handleCloseHistoryEditModal();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to resume crawl';
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const statusColorMap: Record<string, string> = {
    pending: '#f59e0b',
    running: '#3b82f6',
    completed: '#10b981',
    stopped: '#ef4444',
    failed: '#ef4444',
    paused: '#f97316',
    revoked: '#ef4444',
  };

  return (
    <div style={{ padding: 32 }}>
      {/* Page Heading */}
      <div className="section-header" style={{ marginBottom: 32 }}>
        <div className="section-title">Crawl</div>
        <div className="section-line" />
      </div>

      {/* Two-column layout */}
      <div
        className="crawl-page-2col"
        style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}
      >
        {/* Main Section */}
        <div style={{ flex: 2, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <button
              className={`btn${section === 'new' ? ' btn-primary' : ''}`}
              onClick={() => setSection('new')}
            >
              New Crawl
            </button>
            <button
              className={`btn${section === 'history' ? ' btn-primary' : ''}`}
              onClick={() => setSection('history')}
            >
              History ({crawlHistory.length})
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div
              style={{
                padding: 16,
                marginBottom: 16,
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: 6,
                color: '#b91c1c',
                fontSize: 14,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div
              style={{
                padding: 16,
                marginBottom: 16,
                backgroundColor: '#dcfce7',
                border: '1px solid #bbf7d0',
                borderRadius: 6,
                color: '#15803d',
                fontSize: 14,
              }}
            >
              {successMessage}
            </div>
          )}

          {section === 'new' && (
            <div className="card" style={{ padding: 32, marginBottom: 32 }}>
              <form onSubmit={handleStartCrawl}>
                {/* URL Input */}
                <>
                  <div className="input-group" style={{ marginBottom: 18 }}>
                    <div className="input-label">Target URL</div>
                    <input
                      className="input-field"
                      type="url"
                      placeholder="https://yourapp.com/feature"
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      disabled={
                        isLoading ||
                        jobStatus?.status === 'running' ||
                        jobStatus?.status === 'pending'
                      }
                      autoComplete="off"
                    />
                  </div>

                  {/* External / Third-Party Hosted URLs */}
                  <div className="input-group" style={{ marginBottom: 18 }}>
                    <div className="input-label">External / Third-Party Hosted URLs</div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 12 }}>
                      Add external URLs used by this website (e.g. Amazon Pay, hosted checkout
                      pages, third-party flows).
                    </div>

                    {/* External URLs List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {externalUrls.map((externalUrl, index) => (
                        <div
                          key={index}
                          style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}
                        >
                          <div style={{ flex: 1 }}>
                            <input
                              className="input-field"
                              type="url"
                              placeholder="https://external-service.com"
                              value={externalUrl}
                              onChange={e => handleExternalUrlChange(index, e.target.value)}
                              disabled={
                                isLoading ||
                                jobStatus?.status === 'running' ||
                                jobStatus?.status === 'pending'
                              }
                              autoComplete="off"
                              style={{ marginBottom: externalUrlErrors[index] ? 4 : 0 }}
                            />
                            {externalUrlErrors[index] && (
                              <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>
                                ⚠️ {externalUrlErrors[index]}
                              </div>
                            )}
                          </div>
                          {externalUrls.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveExternalUrl(index)}
                              disabled={
                                isLoading ||
                                jobStatus?.status === 'running' ||
                                jobStatus?.status === 'pending'
                              }
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: isLoading ? 'not-allowed' : 'pointer',
                                fontSize: 18,
                                padding: '8px 4px',
                                marginTop: 2,
                                opacity: isLoading ? 0.6 : 1,
                              }}
                              title="Remove URL"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Add More Button */}
                    {externalUrls.length < 10 && (
                      <button
                        type="button"
                        onClick={handleAddExternalUrl}
                        disabled={
                          isLoading ||
                          jobStatus?.status === 'running' ||
                          jobStatus?.status === 'pending'
                        }
                        style={{
                          marginTop: 10,
                          padding: '8px 12px',
                          backgroundColor: 'transparent',
                          color: '#3b82f6',
                          border: '1px dashed #3b82f6',
                          borderRadius: 4,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: isLoading ? 'not-allowed' : 'pointer',
                          opacity: isLoading ? 0.6 : 1,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => {
                          if (!isLoading) {
                            e.currentTarget.style.backgroundColor = '#dbeafe';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isLoading) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        + Add More
                      </button>
                    )}

                    {externalUrls.length >= 10 && (
                      <div
                        style={{
                          marginTop: 10,
                          fontSize: 11,
                          color: '#f59e0b',
                          padding: '8px 12px',
                          backgroundColor: '#fef3c7',
                          borderRadius: 4,
                        }}
                      >
                        ℹ️ Maximum 10 external URLs reached
                      </div>
                    )}
                  </div>

                  {/* Crawl Depth and Mode */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 10,
                      marginBottom: 18,
                    }}
                  >
                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <div className="input-label">Crawl Depth</div>
                      <select
                        className="input-field"
                        value={maxDepth}
                        onChange={e => setMaxDepth(parseInt(e.target.value))}
                        disabled={
                          isLoading ||
                          jobStatus?.status === 'running' ||
                          jobStatus?.status === 'pending'
                        }
                      >
                        <option value={1}>1 — Shallow</option>
                        <option value={2}>2 — Standard</option>
                        <option value={3}>3 — Deep</option>
                      </select>
                    </div>

                    <div className="input-group" style={{ marginBottom: 0 }}>
                      <div className="input-label">Mode</div>
                      <select
                        className="input-field"
                        disabled={
                          isLoading ||
                          jobStatus?.status === 'running' ||
                          jobStatus?.status === 'pending'
                        }
                      >
                        <option value="Page Level">Page Level</option>
                        <option value="E2E (end to end)">E2E (end to end)</option>
                        <option value="Functional">Functional</option>
                      </select>
                    </div>
                  </div>
                </>

                {/* Excluded URLs */}
                <div className="input-group" style={{ marginBottom: 18 }}>
                  <div className="input-label">Excluded URLs (optional)</div>
                  <textarea
                    className="input-field"
                    placeholder="/logout, /admin/*, /api/v*, /search?*"
                    value={excludedUrls}
                    onChange={e => setExcludedUrls(e.target.value)}
                    disabled={
                      isLoading ||
                      jobStatus?.status === 'running' ||
                      jobStatus?.status === 'pending'
                    }
                    style={{ minHeight: 60, fontFamily: 'monospace', fontSize: 12 }}
                  />
                </div>

                {/* Button Group */}
                <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      isLoading ||
                      jobStatus?.status === 'running' ||
                      jobStatus?.status === 'pending'
                    }
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '14px',
                      fontWeight: 500,
                      minHeight: '40px',

                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',

                      textAlign: 'center',

                      opacity:
                        isLoading ||
                        jobStatus?.status === 'running' ||
                        jobStatus?.status === 'pending'
                          ? 0.6
                          : 1,

                      cursor: isLoading ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoading ? 'Starting...' : 'Start Crawl'}
                  </button>

                  {jobStatus &&
                    (jobStatus.status === 'running' ||
                      jobStatus.status === 'pending' ||
                      jobStatus.status === 'paused') && (
                      <button
                        type="button"
                        className="btn"
                        onClick={handleOpenStatusPopup}
                        disabled={isLoading}
                        style={{
                          width: '100%',
                          minHeight: '54px',

                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',

                          padding: 0,
                          margin: 0,

                          fontSize: '14px',
                          fontWeight: 500,
                          lineHeight: 1,

                          textAlign: 'center',

                          opacity: isLoading ? 0.6 : 1,

                          cursor: isLoading ? 'not-allowed' : 'pointer',
                        }}
                      >
                        📊 View Status
                      </button>
                    )}
                </div>
              </form>
            </div>
          )}

          {section === 'history' && (
            <div className="card" style={{ padding: 32 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 24,
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>Crawl History</div>
                {crawlHistory.length > 0 && (
                  <button
                    onClick={handleClearHistory}
                    style={{
                      padding: '8px 12px',
                      fontSize: 12,
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Clear History
                  </button>
                )}
              </div>
              {crawlHistory.length === 0 ? (
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-dim)',
                    textAlign: 'center',
                    padding: 32,
                  }}
                >
                  No crawl history yet. Start a crawl to see it appear here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {crawlHistory.map(job => (
                    <div
                      key={job.jobId}
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 6,
                        borderLeft: `3px solid ${statusColorMap[job.status]}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: 0,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 'bold' }}>{job.url}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 4 }}>
                            {job.createdAt.toLocaleString()}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-dim)', marginTop: 2 }}>
                            Pages: {job.pagesCrawled} | URLs Found: {job.pagesDiscovered}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                            alignItems: 'center',
                            marginLeft: 12,
                          }}
                        >
                          {/* Edit Button - Show if status is running or paused */}
                          {(job.status === 'running' || job.status === 'paused') && (
                            <button
                              onClick={() => handleOpenHistoryEditModal(job)}
                              title="Edit job"
                              style={{
                                fontSize: 16,
                                backgroundColor: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                borderRadius: 3,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 60,
                                padding: '4px 8px',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e =>
                                (e.currentTarget.style.backgroundColor = '#2563eb')
                              }
                              onMouseLeave={e =>
                                (e.currentTarget.style.backgroundColor = '#3b82f6')
                              }
                            >
                              ✎
                            </button>
                          )}

                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeleteJob(job)}
                            title="Delete job"
                            style={{
                              fontSize: 16,
                              backgroundColor: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: 3,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: 60,
                              padding: '4px 8px',
                              transition: 'all 0.2s',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#dc2626')}
                            onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#ef4444')}
                          >
                            🗑
                          </button>
                          {/* Export Button - Only show if status is completed */}
                          {job.status === 'completed' && (
                            <button
                              onClick={() => handleExportCrawl(job.jobId)}
                              title="Export results"
                              style={{
                                fontSize: 16,
                                backgroundColor: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: 3,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minWidth: 60,
                                padding: '4px 8px',
                                transition: 'all 0.2s',
                              }}
                              onMouseEnter={e =>
                                (e.currentTarget.style.backgroundColor = '#059669')
                              }
                              onMouseLeave={e =>
                                (e.currentTarget.style.backgroundColor = '#10b981')
                              }
                            >
                              📥
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Tips & Advanced */}
        <div style={{ flex: 1, minWidth: 320 }}>
          <div className="card" style={{ marginBottom: 24, padding: 24 }}>
            <div className="card-title" style={{ marginBottom: 12 }}>
              Tips
            </div>
            <ul
              style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7, paddingLeft: 18 }}
            >
              {tips
                .filter(tip => !tip.toLowerCase().includes('token usage'))
                .map((tip, i) => (
                  <li key={i} style={{ marginBottom: 8 }}>
                    {tip}
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Status Popup Modal */}
      <StatusPopup
        isOpen={showStatusPopup}
        jobStatus={jobStatus}
        onClose={handleCloseStatusPopup}
        onPause={handlePauseCrawl}
        onResume={handleResumeCrawl}
        isLoading={isLoading}
        statusColorMap={statusColorMap}
      />

      {/* History Edit Modal */}
      <HistoryEditModal
        isOpen={showHistoryEditModal}
        job={selectedHistoryJob}
        onClose={handleCloseHistoryEditModal}
        onPause={handlePauseJobFromHistory}
        onResume={handleResumeJobFromHistory}
        isLoading={isLoading}
        statusColorMap={statusColorMap}
      />

      {/* Clear History Modal */}
      <ClearHistoryModal
        isOpen={showClearHistoryModal}
        mode={clearHistoryMode}
        jobToDelete={jobToDelete}
        onConfirm={confirmDeleteJob}
        onCancel={() => {
          setShowClearHistoryModal(false);
          setJobToDelete(null);
        }}
      />
    </div>
  );
};

export default CrawlPage;
