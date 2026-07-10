import React, { useState, useEffect, useRef } from 'react';
import { 
  X, FileText, CheckCircle, AlertTriangle, AlertOctagon, 
  Download, ExternalLink, Printer, Eye, Loader2 
} from 'lucide-react';
import './DocumentViewer.css';

const DocumentViewer = ({ isOpen, onClose, authorization }) => {
  const [selectedFile, setSelectedFile] = useState('');
  const [selectedTitle, setSelectedTitle] = useState('');
  const [imageZoom, setImageZoom] = useState(1);

  // Reset zoom when selected file changes
  useEffect(() => {
    setImageZoom(1);
  }, [selectedFile]);

  const containerRef = useRef(null);

  // Ctrl + Mouse Wheel listener for zooming images
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e) => {
      if (e.ctrlKey) {
        e.preventDefault(); // Prevent browser-level page zoom
        const delta = e.deltaY;
        setImageZoom(prev => {
          if (delta < 0) {
            // Scroll Up -> Zoom In by 5%
            return Math.min(prev + 0.05, 3.0);
          } else {
            // Scroll Down -> Zoom Out by 5%
            return Math.max(prev - 0.05, 0.5);
          }
        });
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [selectedFile]);

  // Reset or select default file on authorization change
  useEffect(() => {
    if (authorization && isOpen) {
      if (authorization.autorizacion_principal) {
        setSelectedFile(authorization.autorizacion_principal);
        setSelectedTitle("Autorización Principal");
      } else if (authorization.autorizacion_duplicado) {
        setSelectedFile(authorization.autorizacion_duplicado);
        setSelectedTitle("Autorización Duplicado");
      } else if (authorization.autorizacion_respaldo) {
        setSelectedFile(authorization.autorizacion_respaldo);
        setSelectedTitle("Autorización Respaldo");
      } else if (authorization.declaracion_jurada) {
        setSelectedFile(authorization.declaracion_jurada);
        setSelectedTitle("Declaración Jurada");
      } else if (authorization.copia_dni) {
        setSelectedFile(authorization.copia_dni);
        setSelectedTitle("Copia DNI");
      } else if (authorization.evidencias) {
        setSelectedFile(authorization.evidencias);
        setSelectedTitle("Evidencias (Foto Firma)");
      } else {
        setSelectedFile('');
        setSelectedTitle('');
      }
    } else {
      setSelectedFile('');
      setSelectedTitle('');
    }
  }, [authorization, isOpen]);

  if (!isOpen || !authorization) return null;

  const {
    dni,
    apellidos_nombres,
    sede,
    inicio_descuento_mes,
    inicio_descuento_anio,
    termino_descuento_mes,
    termino_descuento_anio,
    num_cuotas,
    monto_mensual,
    monto_total,
    autorizacion_principal,
    autorizacion_duplicado,
    autorizacion_respaldo,
    declaracion_jurada,
    copia_dni,
    evidencias,
  } = authorization;

  // Check file presence
  const hasPrincipal = !!autorizacion_principal;
  const hasDuplicado = !!autorizacion_duplicado;
  const hasRespaldo = !!autorizacion_respaldo;
  const hasDeclaracion = !!declaracion_jurada;
  const hasDni = !!copia_dni;
  const hasEvidencias = !!evidencias;

  // Check missing documents
  const missingList = [];
  if (!hasPrincipal) missingList.push("Autorización Principal");
  if (!hasDuplicado) missingList.push("Autorización Duplicado");
  if (!hasRespaldo) missingList.push("Autorización Respaldo");
  if (!hasDeclaracion) missingList.push("Declaración Jurada");
  if (!hasDni) missingList.push("Copia DNI");
  if (!hasEvidencias) missingList.push("Evidencias");

  const isComplete = missingList.length === 0;

  // Determine severity and message
  let severity = 'success'; // success, warning, danger
  let alertTitle = 'Documentación Completa';
  let alertDesc = 'Todos los documentos obligatorios y secundarios se encuentran cargados en el servidor.';

  if (!hasPrincipal) {
    severity = 'danger';
    alertTitle = 'ALERTA CRÍTICA: FALTA AUTORIZACIÓN PRINCIPAL';
    alertDesc = 'La Autorización Principal es obligatoria para validar este registro. Por favor, escanee y suba este archivo de inmediato.';
  } else if (missingList.length > 0) {
    severity = 'warning';
    alertTitle = 'ADVERTENCIA: DOCUMENTACIÓN INCOMPLETA';
    alertDesc = `Faltan documentos secundarios (${missingList.join(', ')}). Es importante completarlos para tener el expediente completo.`;
  }

  const formatMonth = (m) => String(m).padStart(2, '0');
  const formatMoney = (val) => parseFloat(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Print selected file
  const handlePrint = () => {
    if (!selectedFile) return;
    const fileUrl = `/${selectedFile}?t=${Date.now()}`;
    const isPdf = fileUrl.toLowerCase().endsWith('.pdf');
    
    if (isPdf) {
      const w = window.open(fileUrl, '_blank');
      if (w) {
        w.focus();
        w.print();
      }
    } else {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Imprimir - ${selectedTitle}</title>
              <style>
                body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; background: white; }
                img { max-width: 100%; max-height: 100%; object-fit: contain; }
                @media print {
                  body { background: white; }
                  img { max-width: 100%; max-height: 100%; }
                }
              </style>
            </head>
            <body>
              <img src="${fileUrl}" onload="window.print(); window.close();" />
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  };

  const isPdfFile = (file) => file && file.toLowerCase().endsWith('.pdf');

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel" style={{ maxWidth: '1000px', width: '95%' }}>
        <div className="modal-header">
          <h2 className="modal-title">Detalles de Autorización - DNI {dni}</h2>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Visual Alert Box */}
        <div className={`alert-box alert-box-${severity}`} style={{ marginTop: '10px' }}>
          {severity === 'danger' && <AlertOctagon size={24} style={{ flexShrink: 0 }} />}
          {severity === 'warning' && <AlertTriangle size={24} style={{ flexShrink: 0 }} />}
          {severity === 'success' && <CheckCircle size={24} style={{ flexShrink: 0 }} />}
          <div>
            <h4 className="alert-title">{alertTitle}</h4>
            <p className="alert-desc">{alertDesc}</p>
          </div>
        </div>

        {authorization.observaciones && (
          <div className="alert-box alert-box-warning" style={{ marginTop: '10px', background: 'rgba(245, 158, 11, 0.1)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
            <AlertTriangle size={24} style={{ flexShrink: 0, color: '#fbbf24' }} />
            <div style={{ flexGrow: 1 }}>
              <h4 className="alert-title" style={{ color: '#fbbf24', margin: 0 }}>OBSERVACIÓN REGISTRADA</h4>
              <p className="alert-desc" style={{ color: '#fef08a', fontStyle: 'italic', fontWeight: 'bold', margin: '4px 0 0 0' }}>"{authorization.observaciones}"</p>
            </div>
          </div>
        )}

        <div className="viewer-grid">
          {/* LEFT COLUMN: Metadata & Files list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Metadata details */}
            <div className="viewer-details-card">
              <h3 className="form-label" style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Datos Generales</h3>
              <div className="viewer-details-list">
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Apellidos y Nombres:</span>
                  <span className="viewer-detail-value">{apellidos_nombres}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">DNI:</span>
                  <span className="viewer-detail-value">{dni}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Sede:</span>
                  <span className="viewer-detail-value">{sede}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Monto Mensual:</span>
                  <span className="viewer-detail-value">S/. {formatMoney(monto_mensual)}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Nro. de Cuotas:</span>
                  <span className="viewer-detail-value">{num_cuotas}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Monto Total:</span>
                  <span className="viewer-detail-value" style={{ color: 'var(--accent-primary)', fontSize: '1.05rem' }}>S/. {formatMoney(monto_total)}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Inicio Descuento:</span>
                  <span className="viewer-detail-value">{formatMonth(inicio_descuento_mes)}/{inicio_descuento_anio}</span>
                </div>
                <div className="viewer-detail-item">
                  <span className="viewer-detail-label">Término Descuento:</span>
                  <span className="viewer-detail-value">{formatMonth(termino_descuento_mes)}/{termino_descuento_anio}</span>
                </div>
                
                {authorization.observaciones && (
                  <div className="viewer-detail-item" style={{ gridColumn: 'span 2', marginTop: '6px', background: 'rgba(245, 158, 11, 0.05)', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #fbbf24', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <span className="viewer-detail-label" style={{ color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 'bold' }}>
                      <AlertTriangle size={12} /> Observación:
                    </span>
                    <span className="viewer-detail-value" style={{ color: '#fef08a', fontStyle: 'italic', whiteSpace: 'normal', wordBreak: 'break-word' }}>{authorization.observaciones}</span>
                  </div>
                )}
                
                {/* Historial de Auditoría */}
                <div style={{ marginTop: '16px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Registrado por:</span><br/>
                    👤 {authorization.creator_name || 'Sistema'}<br/>
                    📅 {new Date(authorization.fecha_registro).toLocaleString('es-PE')}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Última modificación:</span><br/>
                    👤 {authorization.updater_name || authorization.creator_name || 'Sistema'}<br/>
                    📅 {new Date(authorization.fecha_actualizacion).toLocaleString('es-PE')}
                  </div>
                </div>
              </div>
            </div>

            {/* Document list selector */}
            <div className="viewer-documents-card">
              <h3 className="form-label" style={{ marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>Expediente Digital</h3>
              
              {/* 1. Principal */}
              <button
                type="button"
                className={`document-item-select ${!hasPrincipal ? 'missing' : ''} ${selectedFile === autorizacion_principal && hasPrincipal ? 'active' : ''}`}
                onClick={() => hasPrincipal && setSelectedFile(autorizacion_principal) && setSelectedTitle("Autorización Principal")}
                disabled={!hasPrincipal}
              >
                <div className="document-info-left">
                  <FileText size={16} style={{ color: hasPrincipal ? 'var(--color-success)' : 'var(--color-danger)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>1. Autorización Principal</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Obligatorio y principal</div>
                  </div>
                </div>
                <div className="document-status-right">
                  {hasPrincipal ? (
                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Disponible</span>
                  ) : (
                    <span className="badge badge-danger" style={{ fontSize: '0.6rem' }}>Faltante</span>
                  )}
                </div>
              </button>

              {/* 2. Duplicado */}
              <button
                type="button"
                className={`document-item-select ${!hasDuplicado ? 'missing' : ''} ${selectedFile === autorizacion_duplicado && hasDuplicado ? 'active' : ''}`}
                onClick={() => hasDuplicado && setSelectedFile(autorizacion_duplicado) && setSelectedTitle("Autorización Duplicado")}
                disabled={!hasDuplicado}
              >
                <div className="document-info-left">
                  <FileText size={16} style={{ color: hasDuplicado ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>2. Autorización Duplicado</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Copia de seguridad</div>
                  </div>
                </div>
                <div className="document-status-right">
                  {hasDuplicado ? (
                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Disponible</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Faltante</span>
                  )}
                </div>
              </button>

              {/* 3. Respaldo */}
              <button
                type="button"
                className={`document-item-select ${!hasRespaldo ? 'missing' : ''} ${selectedFile === autorizacion_respaldo && hasRespaldo ? 'active' : ''}`}
                onClick={() => hasRespaldo && setSelectedFile(autorizacion_respaldo) && setSelectedTitle("Autorización Respaldo")}
                disabled={!hasRespaldo}
              >
                <div className="document-info-left">
                  <FileText size={16} style={{ color: hasRespaldo ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>3. Autorización Respaldo</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Respaldo de la sede</div>
                  </div>
                </div>
                <div className="document-status-right">
                  {hasRespaldo ? (
                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Disponible</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Faltante</span>
                  )}
                </div>
              </button>

              {/* 4. Declaracion */}
              <button
                type="button"
                className={`document-item-select ${!hasDeclaracion ? 'missing' : ''} ${selectedFile === declaracion_jurada && hasDeclaracion ? 'active' : ''}`}
                onClick={() => hasDeclaracion && setSelectedFile(declaracion_jurada) && setSelectedTitle("Declaración Jurada")}
                disabled={!hasDeclaracion}
              >
                <div className="document-info-left">
                  <FileText size={16} style={{ color: hasDeclaracion ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>4. Declaración Jurada</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Declaración de honor</div>
                  </div>
                </div>
                <div className="document-status-right">
                  {hasDeclaracion ? (
                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Disponible</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Faltante</span>
                  )}
                </div>
              </button>

              {/* 5. Copia DNI */}
              <button
                type="button"
                className={`document-item-select ${!hasDni ? 'missing' : ''} ${selectedFile === copia_dni && hasDni ? 'active' : ''}`}
                onClick={() => hasDni && setSelectedFile(copia_dni) && setSelectedTitle("Copia DNI")}
                disabled={!hasDni}
              >
                <div className="document-info-left">
                  <FileText size={16} style={{ color: hasDni ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>5. Copia DNI</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Identidad del firmante</div>
                  </div>
                </div>
                <div className="document-status-right">
                  {hasDni ? (
                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Disponible</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Faltante</span>
                  )}
                </div>
              </button>

              {/* 6. Evidencias */}
              <button
                type="button"
                className={`document-item-select ${!hasEvidencias ? 'missing' : ''} ${selectedFile === evidencias && hasEvidencias ? 'active' : ''}`}
                onClick={() => hasEvidencias && setSelectedFile(evidencias) && setSelectedTitle("Evidencias (Foto Firma)")}
                disabled={!hasEvidencias}
              >
                <div className="document-info-left">
                  <FileText size={16} style={{ color: hasEvidencias ? 'var(--color-success)' : 'var(--text-muted)' }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600 }}>6. Evidencias (Foto Firma)</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>Foto del cliente firmando</div>
                  </div>
                </div>
                <div className="document-status-right">
                  {hasEvidencias ? (
                    <span className="badge badge-success" style={{ fontSize: '0.6rem' }}>Disponible</span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.6rem' }}>Faltante</span>
                  )}
                </div>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Document Previewer */}
          <div className="viewer-preview-card">
            {selectedFile ? (
              <>
                <div className="viewer-preview-header">
                  <span className="preview-title">{selectedTitle}</span>
                  <div className="preview-actions">
                    {!isPdfFile(selectedFile) && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '10px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setImageZoom(prev => Math.max(prev - 0.1, 0.5))}
                          title="Alejar (Zoom Out)"
                        >
                          -
                        </button>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, minWidth: '38px', textAlign: 'center' }}>
                          {Math.round(imageZoom * 100)}%
                        </span>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', height: '24px', minWidth: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          onClick={() => setImageZoom(prev => Math.min(prev + 0.1, 3.0))}
                          title="Acercar (Zoom In)"
                        >
                          +
                        </button>
                        <button 
                          type="button"
                          className="btn btn-secondary" 
                          style={{ padding: '4px 8px', fontSize: '0.75rem', height: '24px', marginLeft: '4px' }}
                          onClick={() => setImageZoom(1.0)}
                          title="Restaurar escala"
                        >
                          Reset
                        </button>
                      </div>
                    )}
                    <button 
                      className="btn btn-secondary" 
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                      onClick={handlePrint}
                      title="Imprimir Documento"
                    >
                      <Printer size={14} />
                      <span>Imprimir</span>
                    </button>
                    <a 
                      href={`/${selectedFile}?t=${Date.now()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                      title="Descargar archivo"
                    >
                      <Download size={14} />
                      <span>Descargar</span>
                    </a>
                  </div>
                </div>
                
                <div ref={containerRef} className="viewer-preview-body" style={{ overflow: 'auto', display: 'block', padding: '16px' }}>
                  {isPdfFile(selectedFile) ? (
                    <iframe 
                      src={`/${selectedFile}?t=${Date.now()}`} 
                      className="preview-iframe"
                      title={selectedTitle}
                    />
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      minHeight: '100%',
                      padding: '20px',
                      boxSizing: 'border-box'
                    }}>
                      <img 
                        src={`/${selectedFile}?t=${Date.now()}`} 
                        className="preview-image"
                        alt={selectedTitle}
                        style={{ 
                          maxHeight: `${756 * imageZoom}px`,
                          maxWidth: `${180 * imageZoom}%`,
                          width: 'auto',
                          height: 'auto',
                          transition: 'max-width 0.15s ease-out, max-height 0.15s ease-out',
                          display: 'block'
                        }}
                      />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="viewer-preview-body" style={{ height: '100%' }}>
                <div className="preview-placeholder">
                  <FileText size={48} />
                  <h4 className="preview-placeholder-title">Sin documentos cargados</h4>
                  <p style={{ fontSize: '0.85rem' }}>Esta autorización aún no tiene archivos PDF o imágenes escaneadas en el servidor.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '14px' }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cerrar Detalles
          </button>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
