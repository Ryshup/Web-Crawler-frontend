import React, { useState, useRef, useEffect } from 'react';
import FileUpload from '@components/FileUpload/FileUpload';
import OCRResultViewer from '@components/OCRResults/OCRResultViewer';
import { ocrService } from '@services/ocrService';
import { DocumentResultData } from '@app-types/index';
import './CrawlerPage.css';

interface UploadedDocument {
  id: string;
  workflowId: string;
  documentId?: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  result?: DocumentResultData;
  _lastError?: string;
  _pollAttempts?: number;
}

const DocumentUploadPage: React.FC = () => {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [section, setSection] = useState<'upload' | 'history' | 'view'>('upload');
  const [viewingDocument, setViewingDocument] = useState<UploadedDocument | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load uploaded documents from localStorage on mount
  useEffect(() => {
    try {
      const savedDocuments = localStorage.getItem('uploadedDocuments');
      if (savedDocuments) {
        const parsed = JSON.parse(savedDocuments) as UploadedDocument[];
        // Convert date strings back to Date objects
        const documents = parsed.map(doc => ({
          ...doc,
          uploadedAt: new Date(doc.uploadedAt),
        }));
        setUploadedDocuments(documents);
      }
    } catch (err) {
      console.error('Failed to load uploaded documents from localStorage:', err);
    }
  }, []);

  // Save uploaded documents to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem('uploadedDocuments', JSON.stringify(uploadedDocuments));
    } catch (err) {
      console.error('Failed to save uploaded documents to localStorage:', err);
    }
  }, [uploadedDocuments]);

  // Poll for document processing status
  useEffect(() => {
    const processingDocs = uploadedDocuments.filter(
      doc => doc.status === 'pending' || doc.status === 'processing',
    );

    if (processingDocs.length === 0) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    pollIntervalRef.current = setInterval(async () => {
      for (const doc of uploadedDocuments) {
        if (doc.status === 'processing' && doc.workflowId) {
          const pollAttempts = (doc._pollAttempts || 0) + 1;
          const MAX_POLL_ATTEMPTS = 150; // ~5 minutes with 2-second intervals

          // Auto-timeout after max attempts
          if (pollAttempts > MAX_POLL_ATTEMPTS) {
            setUploadedDocuments(prev =>
              prev.map(d => {
                if (d.id === doc.id) {
                  return {
                    ...d,
                    status: 'failed',
                    progress: 0,
                    error:
                      'Processing timeout - backend did not complete within 5 minutes. Check OCR service.',
                  };
                }
                return d;
              }),
            );
            continue;
          }

          try {
            const status = await ocrService.getProcessingStatus(doc.workflowId);

            setUploadedDocuments(prev =>
              prev.map(d => {
                if (d.id === doc.id) {
                  if (status.status === 'completed' && status.result) {
                    return {
                      ...d,
                      status: 'completed',
                      progress: 100,
                      documentId: status.result.document_id,
                      result: status.result,
                    };
                  } else if (status.status === 'failed') {
                    return {
                      ...d,
                      status: 'failed',
                      progress: 0,
                      error: status.error || 'Processing failed',
                    };
                  } else {
                    // Still processing, increment progress
                    const newProgress = Math.min(d.progress + Math.random() * 20, 90);
                    return { ...d, progress: newProgress, _pollAttempts: pollAttempts };
                  }
                }
                return d;
              }),
            );
          } catch (error) {
            // Log the error for debugging
            console.error(`[DocumentUpload] Failed to get status for ${doc.id}:`, error);

            // Mark as failed if error persists
            setUploadedDocuments(prev =>
              prev.map(d => {
                if (d.id === doc.id) {
                  const newProgress = Math.min(d.progress + 5, 85);
                  return {
                    ...d,
                    progress: newProgress,
                    _pollAttempts: pollAttempts,
                    // Store error message for debugging
                    _lastError: error instanceof Error ? error.message : String(error),
                  };
                }
                return d;
              }),
            );
          }
        }
      }
    }, 2000); // Poll every 2 seconds

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [uploadedDocuments]);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!documentFile) {
      setError('Please select a document to upload');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create a new document entry
      const newDoc: UploadedDocument = {
        id: `doc_${Date.now()}`,
        workflowId: '',
        fileName: documentFile.name,
        fileSize: documentFile.size,
        uploadedAt: new Date(),
        status: 'pending',
        progress: 10,
      };

      // Add to uploaded documents
      setUploadedDocuments(prev => [newDoc, ...prev]);

      // Parse document with OCR backend
      const parseResponse = await ocrService.parseDocument(documentFile, 'tesseract', false, true);

      // Update document with workflow ID
      const docWithWorkflow: UploadedDocument = {
        ...newDoc,
        workflowId: parseResponse.workflowId,
        status: 'processing',
        progress: 30,
      };

      setUploadedDocuments(prev => prev.map(doc => (doc.id === newDoc.id ? docWithWorkflow : doc)));

      setSuccessMessage(`✓ Document "${documentFile.name}" uploaded and processing started`);
      setDocumentFile(null);
      setSection('history');

      // Reset form
      const form = e.target as HTMLFormElement;
      form.reset();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to upload document';
      setError(errorMsg);

      // Mark as failed
      setUploadedDocuments(prev =>
        prev.map(doc =>
          doc.status === 'pending'
            ? { ...doc, status: 'failed', progress: 0, error: errorMsg }
            : doc,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveDocument = (docId: string) => {
    setUploadedDocuments(prev => prev.filter(doc => doc.id !== docId));
    setSuccessMessage('✓ Document removed');
  };

  const handleClearHistory = () => {
    setUploadedDocuments([]);
    setSuccessMessage('✓ Upload history cleared');
  };

  const handleViewDocument = (doc: UploadedDocument) => {
    setViewingDocument(doc);
    setSection('view');
  };

  const handleBackToHistory = () => {
    setViewingDocument(null);
    setSection('history');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string): string => {
    const statusColors: Record<string, string> = {
      pending: '#f59e0b',
      processing: '#3b82f6',
      completed: '#10b981',
      failed: '#ef4444',
    };
    return statusColors[status] || '#9ca3af';
  };

  const getStatusIcon = (status: string): string => {
    const icons: Record<string, string> = {
      pending: '⏳',
      processing: '⚙️',
      completed: '✓',
      failed: '✕',
    };
    return icons[status] || '•';
  };

  return (
    <div style={{ padding: 32 }}>
      {/* Page Heading */}
      <div className="section-header" style={{ marginBottom: 32 }}>
        <div className="section-title">Document Upload</div>
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
              className={`btn${section === 'upload' ? ' btn-primary' : ''}`}
              onClick={() => setSection('upload')}
            >
              New Upload
            </button>
            <button
              className={`btn${section === 'history' ? ' btn-primary' : ''}`}
              onClick={() => setSection('history')}
            >
              History ({uploadedDocuments.length})
            </button>
            {section === 'view' && (
              <button className="btn" onClick={handleBackToHistory} style={{ marginLeft: 'auto' }}>
                ← Back to History
              </button>
            )}
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

          {section === 'upload' && (
            <div className="card" style={{ padding: 32, marginBottom: 32 }}>
              <form onSubmit={handleUploadDocument}>
                <div className="input-group" style={{ marginBottom: 18 }}>
                  <div className="input-label">Upload Document</div>
                  <p
                    style={{
                      fontSize: 13,
                      color: 'var(--text-dim)',
                      marginBottom: 12,
                    }}
                  >
                    Supported formats: PDF, DOCX, XLSX, PNG, JPG, JPEG, TIFF, BMP (Max size: 50MB)
                  </p>
                  <FileUpload
                    label="Select Document"
                    accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.tiff,.tif,.bmp"
                    onFileSelect={setDocumentFile}
                    selectedFile={documentFile}
                    disabled={isLoading}
                    maxSizeMB={50}
                  />
                </div>

                {/* Button Group */}
                <div style={{ display: 'flex', gap: 10, flexDirection: 'column' }}>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={isLoading || !documentFile}
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

                      opacity: isLoading || !documentFile ? 0.6 : 1,

                      cursor: isLoading || !documentFile ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {isLoading ? 'Uploading...' : 'Upload Document'}
                  </button>
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
                <div style={{ fontSize: 16, fontWeight: 'bold' }}>Upload History</div>
                {uploadedDocuments.length > 0 && (
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

              {uploadedDocuments.length === 0 ? (
                <div
                  style={{
                    fontSize: 14,
                    color: 'var(--text-dim)',
                    textAlign: 'center',
                    padding: 32,
                  }}
                >
                  No documents uploaded yet. Upload a document to see it here.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {uploadedDocuments.map(doc => (
                    <div
                      key={doc.id}
                      style={{
                        padding: 16,
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 6,
                        borderLeft: `3px solid ${getStatusColor(doc.status)}`,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: 12,
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 'bold',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <span style={{ fontSize: 16 }}>📄</span>
                            {doc.fileName}
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: 'var(--text-dim)',
                              marginTop: 4,
                            }}
                          >
                            {formatFileSize(doc.fileSize)} • {doc.uploadedAt.toLocaleString()}
                          </div>
                        </div>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              padding: '4px 8px',
                              backgroundColor: getStatusColor(doc.status),
                              color: 'white',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 'bold',
                              textTransform: 'capitalize',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {getStatusIcon(doc.status)} {doc.status}
                          </span>

                          {doc.status !== 'completed' && doc.status !== 'failed' && (
                            <button
                              onClick={() => handleRemoveDocument(doc.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#ef4444',
                                cursor: 'pointer',
                                fontSize: 16,
                                padding: 0,
                              }}
                              title="Remove"
                            >
                              ✕
                            </button>
                          )}

                          {doc.status === 'completed' && doc.result && (
                            <button
                              onClick={() => handleViewDocument(doc)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#10b981',
                                cursor: 'pointer',
                                fontSize: 14,
                                padding: '0 8px',
                                textDecoration: 'underline',
                              }}
                              title="View OCR Results"
                            >
                              View Results →
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {(doc.status === 'pending' || doc.status === 'processing') && (
                        <div
                          style={{
                            height: 4,
                            backgroundColor: 'var(--bg-tertiary)',
                            borderRadius: 2,
                            overflow: 'hidden',
                            marginBottom: 8,
                          }}
                        >
                          <div
                            style={{
                              height: '100%',
                              backgroundColor: getStatusColor(doc.status),
                              width: `${doc.progress}%`,
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      )}

                      {/* Progress Text */}
                      {(doc.status === 'pending' || doc.status === 'processing') && (
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--text-dim)',
                            textAlign: 'right',
                          }}
                        >
                          {doc.progress}%
                        </div>
                      )}

                      {/* OCR Results Quick View */}
                      {doc.status === 'completed' && doc.result && (
                        <div
                          style={{
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: '1px solid var(--bg-tertiary)',
                            fontSize: 12,
                            color: 'var(--text-dim)',
                          }}
                        >
                          <div
                            style={{
                              marginBottom: 8,
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                            }}
                          >
                            📊 OCR Results Summary
                          </div>
                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(3, 1fr)',
                              gap: 12,
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                padding: 8,
                                borderRadius: 4,
                              }}
                            >
                              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Pages</div>
                              <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                                {doc.result.document_processing_summary.total_pages}
                              </div>
                            </div>
                            <div
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                padding: 8,
                                borderRadius: 4,
                              }}
                            >
                              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Segments</div>
                              <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                                {doc.result.document_processing_summary.total_segments}
                              </div>
                            </div>
                            <div
                              style={{
                                backgroundColor: 'var(--bg-tertiary)',
                                padding: 8,
                                borderRadius: 4,
                              }}
                            >
                              <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>Time</div>
                              <div style={{ fontSize: 14, fontWeight: 'bold' }}>
                                {(doc.result.processing_log.processing_time_ms / 1000).toFixed(1)}s
                              </div>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, 1fr)',
                              gap: 8,
                            }}
                          >
                            <div style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>📝 Paragraphs:</span>{' '}
                              <strong>
                                {doc.result.document_processing_summary.paragraphs.processed}
                              </strong>
                            </div>
                            <div style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>📊 Tables:</span>{' '}
                              <strong>
                                {doc.result.document_processing_summary.tables.processed}
                              </strong>
                            </div>
                            <div style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>🖼️ Images:</span>{' '}
                              <strong>
                                {doc.result.document_processing_summary.images.processed}
                              </strong>
                            </div>
                            <div style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>📋 Headings:</span>{' '}
                              <strong>
                                {doc.result.document_processing_summary.headings.processed}
                              </strong>
                            </div>
                            <div style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>🔑 Key-Value:</span>{' '}
                              <strong>
                                {doc.result.document_processing_summary.key_value_blocks.processed}
                              </strong>
                            </div>
                            <div style={{ fontSize: 11 }}>
                              <span style={{ color: 'var(--text-dim)' }}>📄 File Type:</span>{' '}
                              <strong>{doc.result.file_type.toUpperCase()}</strong>
                            </div>
                          </div>

                          {doc.result.metadata && (
                            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-dim)' }}>
                              {doc.result.metadata.author && (
                                <div>
                                  👤 Author: <strong>{doc.result.metadata.author}</strong>
                                </div>
                              )}
                              {doc.result.metadata.language && (
                                <div>
                                  🌐 Language:{' '}
                                  <strong>{doc.result.metadata.language.toUpperCase()}</strong>
                                </div>
                              )}
                              {doc.result.metadata.created_at && (
                                <div>
                                  🕐 Created:{' '}
                                  <strong>
                                    {new Date(doc.result.metadata.created_at).toLocaleDateString()}
                                  </strong>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {section === 'view' && viewingDocument && viewingDocument.result && (
            <OCRResultViewer result={viewingDocument.result} fileName={viewingDocument.fileName} />
          )}
        </div>

        {/* Sidebar Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 16 }}>
              📋 About Document Upload
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>
              <p style={{ marginBottom: 12 }}>
                Upload documents for OCR processing and text extraction. The system will analyze
                your documents and extract structured data including text, tables, images, and
                metadata.
              </p>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Supported Formats:
                </div>
                <ul style={{ paddingLeft: 16, margin: 0 }}>
                  <li>PDF</li>
                  <li>Word (.docx)</li>
                  <li>Excel (.xlsx)</li>
                  <li>Images (.png, .jpg, .jpeg, .tiff, .bmp)</li>
                </ul>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  File Size Limit:
                </div>
                <p style={{ margin: 0 }}>Maximum 50MB per file</p>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>
                  Processing Status:
                </div>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12 }}>
                  <li>
                    <span style={{ color: getStatusColor('pending') }}>●</span> Pending
                  </li>
                  <li>
                    <span style={{ color: getStatusColor('processing') }}>●</span> Processing
                  </li>
                  <li>
                    <span style={{ color: getStatusColor('completed') }}>●</span> Completed
                  </li>
                  <li>
                    <span style={{ color: getStatusColor('failed') }}>●</span> Failed
                  </li>
                </ul>
              </div>

              <div
                style={{
                  padding: 12,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 6,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                >
                  ✨ What Gets Extracted:
                </div>
                <ul style={{ paddingLeft: 16, margin: 0, fontSize: 11, color: 'var(--text-dim)' }}>
                  <li>📝 All text content with confidence scores</li>
                  <li>📊 Tables with rows, columns & cell data</li>
                  <li>🖼️ Embedded images (base64 encoded)</li>
                  <li>📋 Document headings and hierarchy</li>
                  <li>📄 Metadata (author, date, language)</li>
                  <li>🔑 Key-value pairs (forms)</li>
                  <li>📈 Processing statistics & logs</li>
                </ul>
              </div>

              <div
                style={{
                  padding: 12,
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 6,
                  marginTop: 12,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    marginBottom: 8,
                    color: 'var(--text-primary)',
                    fontSize: 12,
                  }}
                >
                  👀 View Results:
                </div>
                <p style={{ margin: 0, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.4 }}>
                  Click <strong>"View Results →"</strong> on completed documents to see the full OCR
                  analysis with 4 tabs: Summary, Pages, Hierarchy, and Logs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadPage;
