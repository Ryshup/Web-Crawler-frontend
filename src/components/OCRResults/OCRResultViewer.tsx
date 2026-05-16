import React, { useState } from 'react';
import { DocumentResultData, SegmentData } from '@app-types/index';
import './OCRResultViewer.css';

interface OCRResultViewerProps {
  result: DocumentResultData;
  fileName: string;
}

type ViewMode = 'summary' | 'pages' | 'hierarchy' | 'logs';

const OCRResultViewer: React.FC<OCRResultViewerProps> = ({ result, fileName }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  const [selectedPage, setSelectedPage] = useState(0);

  const renderSummary = () => (
    <div className="ocr-summary">
      <div className="summary-grid">
        <div className="summary-card">
          <div className="summary-label">Document ID</div>
          <div className="summary-value">{result.document_id}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">File Type</div>
          <div className="summary-value">{result.file_type.toUpperCase()}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Pages</div>
          <div className="summary-value">{result.document_processing_summary.total_pages}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Total Segments</div>
          <div className="summary-value">{result.document_processing_summary.total_segments}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Extraction Method</div>
          <div className="summary-value">{result.extraction_method}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Processing Time</div>
          <div className="summary-value">{result.processing_log.processing_time_ms}ms</div>
        </div>
      </div>

      <div className="summary-sections">
        <div className="summary-section">
          <h4>Content Summary</h4>
          <ul className="summary-list">
            <li>
              Paragraphs: <strong>{result.document_processing_summary.paragraphs.processed}</strong>
            </li>
            <li>
              Headings: <strong>{result.document_processing_summary.headings.processed}</strong>
            </li>
            <li>
              Tables: <strong>{result.document_processing_summary.tables.processed}</strong>
            </li>
            <li>
              Images: <strong>{result.document_processing_summary.images.processed}</strong>
            </li>
            <li>
              Key-Value Blocks:{' '}
              <strong>{result.document_processing_summary.key_value_blocks.processed}</strong>
            </li>
          </ul>
        </div>

        <div className="summary-section">
          <h4>Document Metadata</h4>
          <ul className="summary-list">
            <li>
              Filename: <strong>{result.metadata.filename}</strong>
            </li>
            {result.metadata.author && (
              <li>
                Author: <strong>{result.metadata.author}</strong>
              </li>
            )}
            {result.metadata.language && (
              <li>
                Language: <strong>{result.metadata.language}</strong>
              </li>
            )}
            {result.metadata.created_at && (
              <li>
                Created: <strong>{new Date(result.metadata.created_at).toLocaleString()}</strong>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  const renderSegment = (segment: SegmentData, index: number) => (
    <div key={index} className="segment" data-type={segment.type}>
      <div className="segment-header">
        <span className="segment-type">{segment.type}</span>
        {segment.confidence && (
          <span className="segment-confidence">
            Confidence: {(segment.confidence * 100).toFixed(1)}%
          </span>
        )}
      </div>

      {segment.type === 'image' && segment.base64_data ? (
        <div className="segment-image">
          <img
            src={`data:${segment.mime_type || 'image/png'};base64,${segment.base64_data}`}
            alt="Extracted image"
            style={{ maxWidth: '100%', maxHeight: '300px' }}
          />
          {segment.description && <p className="segment-description">{segment.description}</p>}
        </div>
      ) : segment.type === 'table' && segment.rows ? (
        <div className="segment-table">
          <table>
            <thead>
              <tr>
                {segment.columns?.map((col, i) => (
                  <th key={i}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {segment.rows.map((row, rowIdx) => (
                <tr key={rowIdx}>
                  {Object.values(row).map((cell, cellIdx) => (
                    <td key={cellIdx}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="segment-text">{segment.text}</div>
      )}

      {segment.bbox && (
        <div className="segment-meta">
          Position: ({segment.bbox.x0.toFixed(1)}, {segment.bbox.y0.toFixed(1)})
        </div>
      )}
    </div>
  );

  const renderPages = () => (
    <div className="ocr-pages">
      {!result.pages || result.pages.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>No pages found</p>
      ) : (
        <>
          <div className="page-selector">
            {result.pages.map((page, idx) => (
              <button
                key={idx}
                className={`page-button ${selectedPage === idx ? 'active' : ''}`}
                onClick={() => setSelectedPage(idx)}
              >
                Page {page.page_number}
              </button>
            ))}
          </div>

          {result.pages[selectedPage] && (
            <div className="page-content">
              <h3>Page {result.pages[selectedPage].page_number}</h3>
              <div className="page-stats">
                <span>Segments: {result.pages[selectedPage].page_summary.total_segments}</span>
                {result.pages[selectedPage].has_images && <span>📷 Has Images</span>}
                {result.pages[selectedPage].has_tables && <span>📊 Has Tables</span>}
                {result.pages[selectedPage].is_scanned && <span>📄 Scanned</span>}
              </div>

              <div className="segments-list">
                {result.pages[selectedPage].segments?.map((segment, idx) =>
                  renderSegment(segment, idx),
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  const renderHierarchy = () => (
    <div className="ocr-hierarchy">
      {!result.hierarchy || result.hierarchy.length === 0 ? (
        <p style={{ color: 'var(--text-dim)' }}>No document hierarchy found</p>
      ) : (
        <ul className="hierarchy-list">
          {result.hierarchy.map((node, idx) => (
            <li key={idx}>
              <div className="hierarchy-node" style={{ marginLeft: `${(node.level - 1) * 20}px` }}>
                <span className="hierarchy-heading">
                  {'#'.repeat(node.level)} {node.heading}
                </span>
                {node.content && node.content.length > 0 && (
                  <p className="hierarchy-content">{node.content.join(' ')}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const renderLogs = () => (
    <div className="ocr-logs">
      <div className="logs-section">
        <h4>Processing Information</h4>
        <p>
          Pipeline Version: <strong>{result.processing_log.pipeline_version}</strong>
        </p>
        <p>
          Processing Time: <strong>{result.processing_log.processing_time_ms}ms</strong>
        </p>
      </div>

      {result.processing_log.errors.length > 0 && (
        <div className="logs-section errors">
          <h4>Errors ({result.processing_log.errors.length})</h4>
          <ul>
            {result.processing_log.errors.map((error, idx) => (
              <li key={idx}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {result.processing_log.warnings.length > 0 && (
        <div className="logs-section warnings">
          <h4>Warnings ({result.processing_log.warnings.length})</h4>
          <ul>
            {result.processing_log.warnings.map((warning, idx) => (
              <li key={idx}>
                <strong>[{warning.warning_type}]</strong> {warning.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="ocr-result-viewer">
      <div className="ocr-header">
        <div>
          <h2>📄 {fileName}</h2>
          <p className="ocr-metadata">
            Document ID: <code>{result.document_id}</code>
          </p>
        </div>
      </div>

      <div className="ocr-tabs">
        <button
          className={`tab-button ${viewMode === 'summary' ? 'active' : ''}`}
          onClick={() => setViewMode('summary')}
        >
          Summary
        </button>
        <button
          className={`tab-button ${viewMode === 'pages' ? 'active' : ''}`}
          onClick={() => setViewMode('pages')}
        >
          Pages ({result.pages?.length || 0})
        </button>
        <button
          className={`tab-button ${viewMode === 'hierarchy' ? 'active' : ''}`}
          onClick={() => setViewMode('hierarchy')}
        >
          Hierarchy
        </button>
        <button
          className={`tab-button ${viewMode === 'logs' ? 'active' : ''}`}
          onClick={() => setViewMode('logs')}
        >
          Logs
        </button>
      </div>

      <div className="ocr-content">
        {viewMode === 'summary' && renderSummary()}
        {viewMode === 'pages' && renderPages()}
        {viewMode === 'hierarchy' && renderHierarchy()}
        {viewMode === 'logs' && renderLogs()}
      </div>
    </div>
  );
};

export default OCRResultViewer;
