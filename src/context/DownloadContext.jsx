import React, { createContext, useState, useCallback } from 'react';
import { Loader2, Download, X, CheckCircle, AlertOctagon } from 'lucide-react';

export const DownloadContext = createContext();

export const DownloadProvider = ({ children }) => {
  const [downloads, setDownloads] = useState([]);

  const addDownload = useCallback(async (downloadTask) => {
    const id = Date.now().toString();
    const { url, filename, token, type = 'zip' } = downloadTask;
    
    setDownloads(prev => [...prev, {
      id,
      filename,
      progress: 0,
      status: 'downloading',
      error: null,
      type
    }]);

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.detail || 'Error al generar la descarga.');
      }

      const contentLength = response.headers.get('Content-Length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      const reader = response.body.getReader();
      let loadedBytes = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        chunks.push(value);
        loadedBytes += value.length;

        if (totalBytes > 0) {
          const percent = Math.round((loadedBytes / totalBytes) * 100);
          setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: percent } : d));
        } else {
          const simPercent = Math.min(99, Math.round(loadedBytes / (1024 * 1024 * 2)));
          setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: simPercent } : d));
        }
      }

      const contentType = response.headers.get('Content-Type') || (type === 'zip' ? 'application/x-zip-compressed' : 'text/csv');
      const blob = new Blob(chunks, { type: contentType });
      const downloadUrl = window.URL.createObjectURL(blob);
      
      let finalFilename = filename;
      const contentDisposition = response.headers.get('Content-Disposition');
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch && filenameMatch[1]) {
          finalFilename = filenameMatch[1];
        }
      }

      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = finalFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 1000);

      setDownloads(prev => prev.map(d => d.id === id ? { ...d, progress: 100, status: 'completed' } : d));

      setTimeout(() => {
        dismissDownload(id);
      }, 4000);

    } catch (error) {
      setDownloads(prev => prev.map(d => d.id === id ? { ...d, status: 'error', error: error.message } : d));
    }
  }, []);

  const dismissDownload = useCallback((id) => {
    setDownloads(prev => prev.filter(d => d.id !== id));
  }, []);

  return (
    <DownloadContext.Provider value={{ addDownload, downloads, dismissDownload }}>
      {children}
      {downloads.length > 0 && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {downloads.map(d => (
            <div key={d.id} style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '16px',
              width: '320px',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
              position: 'relative'
            }}>
              <button 
                onClick={() => dismissDownload(d.id)}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px'
                }}
              >
                <X size={16} />
              </button>
              
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{ 
                  background: d.status === 'error' ? 'var(--color-danger-bg)' : d.status === 'completed' ? 'var(--color-success-bg)' : 'rgba(59, 130, 246, 0.15)',
                  color: d.status === 'error' ? 'var(--color-danger)' : d.status === 'completed' ? 'var(--color-success)' : '#3b82f6',
                  padding: '10px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {d.status === 'downloading' ? <Loader2 size={24} className="animate-spin" /> : 
                   d.status === 'completed' ? <CheckCircle size={24} /> : 
                   <AlertOctagon size={24} />}
                </div>
                
                <div style={{ flex: 1, paddingTop: '2px', paddingRight: '16px' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {d.status === 'completed' ? 'Descarga Completa' : d.status === 'error' ? 'Fallo en Descarga' : 'Preparando Archivo...'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    {d.status === 'error' ? d.error : 'Exportación masiva a ' + d.type.toUpperCase()}
                  </p>
                  
                  {d.status !== 'error' && (
                    <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: d.progress + '%', 
                        background: d.status === 'completed' ? 'var(--color-success)' : '#3b82f6',
                        transition: 'width 0.3s ease-out'
                      }} />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DownloadContext.Provider>
  );
};