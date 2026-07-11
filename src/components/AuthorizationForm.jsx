import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Loader2, Calendar, DollarSign, Camera, Trash2, Image } from 'lucide-react';
import './AuthorizationForm.css';

const MESES = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

// Meses constant remains here

const AuthorizationForm = ({ isOpen, onClose, onSave, authorization, token }) => {
  const isEdit = !!authorization;
  
  const [dni, setDni] = useState('');
  const [apellidosNombres, setApellidosNombres] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [sedes, setSedes] = useState([]);
  const [inicioMes, setInicioMes] = useState(1);
  const [inicioAnio, setInicioAnio] = useState(new Date().getFullYear());
  const [numCuotas, setNumCuotas] = useState(12);
  const [montoMensual, setMontoMensual] = useState('');
  const [observaciones, setObservaciones] = useState('');
  
  // File attachments
  const [filePrincipal, setFilePrincipal] = useState(null);
  const [fileDuplicado, setFileDuplicado] = useState(null);
  const [fileRespaldo, setFileRespaldo] = useState(null);
  const [fileDeclaracion, setFileDeclaracion] = useState(null);
  const [fileDni, setFileDni] = useState(null);
  const [fileEvidencias, setFileEvidencias] = useState(null);

  // Deletion marks for editing
  const [delPrincipal, setDelPrincipal] = useState(false);
  const [delDuplicado, setDelDuplicado] = useState(false);
  const [delRespaldo, setDelRespaldo] = useState(false);
  const [delDeclaracion, setDelDeclaracion] = useState(false);
  const [delDni, setDelDni] = useState(false);
  const [delEvidencias, setDelEvidencias] = useState(false);

  // Camera Capture States
  const [cameraActive, setCameraActive] = useState(false);
  const [activeDocForCamera, setActiveDocForCamera] = useState(null); // 'principal', 'duplicado', etc.
  const [videoDevices, setVideoDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [capturedPhotoUrl, setCapturedPhotoUrl] = useState('');
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [cameraError, setCameraError] = useState('');

  const videoRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const canvasRef = React.useRef(null);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [reniecLoading, setReniecLoading] = useState(false);
  const [initialDni, setInitialDni] = useState('');
  const [loadingMessage, setLoadingMessage] = useState('Guardando cambios...');

  // Dynamically change loading message during saving
  useEffect(() => {
    let interval;
    if (submitting || loading) {
      const messages = [
        'Procesando datos del formulario...',
        'Comprimiendo y preparando imágenes...',
        'Subiendo archivos escaneados...',
        'Validando firmas y evidencias...',
        'Guardando en la base de datos...',
        'Sincronizando información...'
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 1600);
    }
    return () => clearInterval(interval);
  }, [submitting, loading]);

  // Populate data when editing
  useEffect(() => {
    if (authorization) {
      setDni(authorization.dni || '');
      setApellidosNombres(authorization.apellidos_nombres || '');
      setSedeId(authorization.sede_id || '');
      setInicioMes(authorization.inicio_descuento_mes || 1);
      setInicioAnio(authorization.inicio_descuento_anio || new Date().getFullYear());
      setNumCuotas(authorization.num_cuotas || 12);
      setMontoMensual(authorization.monto_mensual || '');
      setObservaciones(authorization.observaciones || '');
      
      // Reset files
      setFilePrincipal(null);
      setFileDuplicado(null);
      setFileRespaldo(null);
      setFileDeclaracion(null);
      setFileDni(null);
      setFileEvidencias(null);
      
      setDelPrincipal(false);
      setDelDuplicado(false);
      setDelRespaldo(false);
      setDelDeclaracion(false);
      setDelDni(false);
      setDelEvidencias(false);
      setInitialDni(authorization.dni || '');
    } else {
      // Clear data for new auth
      setDni('');
      setApellidosNombres('');
      setSedeId('');
      setInicioMes(new Date().getMonth() + 1);
      setInicioAnio(new Date().getFullYear());
      setNumCuotas(12);
      setMontoMensual('');
      setObservaciones('');
      
      setFilePrincipal(null);
      setFileDuplicado(null);
      setFileRespaldo(null);
      setFileDeclaracion(null);
      setFileDni(null);
      setFileEvidencias(null);
      setInitialDni('');
    }
  }, [authorization, isOpen]);

  // Trigger RENIEC query automatically when DNI is 8 digits and has changed
  useEffect(() => {
    const fetchReniecData = async () => {
      if (dni.length === 8 && dni !== initialDni) {
        setReniecLoading(true);
        setError('');
        try {
          const response = await fetch(`/api/authorizations/reniec/${dni}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!response.ok) {
            throw new Error('No se pudo consultar el DNI en RENIEC.');
          }
          const data = await response.json();
          if (data && data.datos) {
            const { nombres, apellido_paterno, apellido_materno } = data.datos;
            const full_name = `${apellido_paterno} ${apellido_materno} ${nombres}`.trim().toUpperCase();
            setApellidosNombres(full_name);
          } else {
            setError('No se encontraron datos para el DNI ingresado.');
          }
        } catch (err) {
          console.error('Error al consultar RENIEC:', err);
          setError('Error al consultar DNI en RENIEC. Ingrese el nombre manualmente.');
        } finally {
          setReniecLoading(false);
        }
      }
    };

    fetchReniecData();
  }, [dni, initialDni, token]);

  // Fetch sedes list
  useEffect(() => {
    const fetchSedesList = async () => {
      if (!token) return;
      try {
        const response = await fetch('/api/sedes/', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
          throw new Error('Error al obtener sedes');
        }
        const data = await response.json();
        setSedes(data);
      } catch (err) {
        console.error('Error al obtener sedes en formulario:', err);
      }
    };
    if (isOpen) {
      fetchSedesList();
    }
  }, [isOpen, token]);

  if (!isOpen) return null;

  // Calculation parameters
  const cuotasInt = parseInt(numCuotas) || 0;
  const mesInt = parseInt(inicioMes) || 1;
  const anioInt = parseInt(inicioAnio) || 2026;
  const montoFloat = parseFloat(montoMensual) || 0;

  let terminoMesStr = '-';
  let terminoAnioStr = '-';
  let montoTotalCalculado = 'S/. 0.00';

  if (cuotasInt > 0 && mesInt >= 1 && mesInt <= 12) {
    const totalMonthsIndex = (mesInt - 1) + cuotasInt - 1;
    const calcMonth = (totalMonthsIndex % 12) + 1;
    const calcYear = anioInt + Math.floor(totalMonthsIndex / 12);
    
    terminoMesStr = MESES.find(m => m.value === calcMonth)?.label || calcMonth;
    terminoAnioStr = calcYear;
    montoTotalCalculado = `S/. ${(montoFloat * cuotasInt).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function compressImage(file, maxWidth = 1920, quality = 0.7) {
    if (!file.type.startsWith('image/')) return file;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!dni || !apellidosNombres || !sedeId || !inicioMes || !inicioAnio || !numCuotas || !montoMensual) {
      setError('Por favor completa todos los campos del formulario.');
      return;
    }

    setLoading(true);
    setSubmitting(true);

    const formData = new FormData();
    formData.append('dni', dni);
    formData.append('apellidos_nombres', apellidosNombres);
    formData.append('sede_id', parseInt(sedeId));
    formData.append('inicio_descuento_mes', parseInt(inicioMes));
    formData.append('inicio_descuento_anio', parseInt(inicioAnio));
    formData.append('num_cuotas', parseInt(numCuotas));
    formData.append('monto_mensual', parseFloat(montoMensual));
    formData.append('observaciones', observaciones || '');

    // Files
    if (filePrincipal) formData.append('file_principal', filePrincipal);
    if (fileDuplicado) formData.append('file_duplicado', fileDuplicado);
    if (fileRespaldo) formData.append('file_respaldo', fileRespaldo);
    if (fileDeclaracion) formData.append('file_declaracion', fileDeclaracion);
    if (fileDni) formData.append('file_dni', fileDni);
    if (fileEvidencias) formData.append('file_evidencias', fileEvidencias);
 
    if (isEdit) {
      formData.append('delete_principal', delPrincipal);
      formData.append('delete_duplicado', delDuplicado);
      formData.append('delete_respaldo', delRespaldo);
      formData.append('delete_declaracion', delDeclaracion);
      formData.append('delete_dni', delDni);
      formData.append('delete_evidencias', delEvidencias);
    }

    try {
      const url = isEdit ? `/api/authorizations/${authorization.id}` : '/api/authorizations/';
      const method = isEdit ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        let errMsg = 'Ocurrió un error al guardar los datos.';
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setSubmitting(false);
    }
  };

  // Camera Control Functions
  const startCamera = async (deviceId) => {
    setCameraError('');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const constraints = {
        video: deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error al iniciar la cámara:', err);
      setCameraError('No se pudo acceder a la cámara. Por favor verifica los permisos o selecciona otro dispositivo.');
    }
  };

  const openCameraModal = async (docType) => {
    setActiveDocForCamera(docType);
    setCameraActive(true);
    setCapturedPhotoUrl('');
    setCapturedBlob(null);
    setCameraError('');

    try {
      // Prompt camera permissions first
      const initStream = await navigator.mediaDevices.getUserMedia({ video: true });
      initStream.getTracks().forEach(track => track.stop()); // close temp stream

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoIns = devices.filter(d => d.kind === 'videoinput');
      setVideoDevices(videoIns);
      const defaultId = videoIns.length > 0 ? videoIns[0].deviceId : '';
      setSelectedDevice(defaultId);
      await startCamera(defaultId);
    } catch (err) {
      console.error('Error al enumerar dispositivos:', err);
      setCameraError('Permiso de cámara denegado o no hay cámaras disponibles.');
    }
  };

  const changeDevice = async (deviceId) => {
    setSelectedDevice(deviceId);
    await startCamera(deviceId);
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setCapturedPhotoUrl('');
    setCapturedBlob(null);
    setActiveDocForCamera(null);
    setCameraError('');
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      const ctx = canvas.getContext('2d');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg');
      setCapturedPhotoUrl(dataUrl);
      canvas.toBlob(blob => {
        setCapturedBlob(blob);
      }, 'image/jpeg', 0.95);
    }
  };

  const saveCapturedPhoto = () => {
    if (capturedBlob && activeDocForCamera) {
      const friendlyNames = {
        principal: 'autorizacion_principal.jpg',
        duplicado: 'autorizacion_duplicado.jpg',
        respaldo: 'autorizacion_respaldo.jpg',
        declaracion: 'declaracion_jurada.jpg',
        dni: 'copia_dni.jpg',
        evidencias: 'evidencia_firma.jpg'
      };
      const filename = friendlyNames[activeDocForCamera] || 'captura.jpg';
      const file = new File([capturedBlob], filename, { type: 'image/jpeg' });
      
      if (activeDocForCamera === 'principal') { setFilePrincipal(file); setDelPrincipal(false); }
      if (activeDocForCamera === 'duplicado') { setFileDuplicado(file); setDelDuplicado(false); }
      if (activeDocForCamera === 'respaldo') { setFileRespaldo(file); setDelRespaldo(false); }
      if (activeDocForCamera === 'declaracion') { setFileDeclaracion(file); setDelDeclaracion(false); }
      if (activeDocForCamera === 'dni') { setFileDni(file); setDelDni(false); }
      if (activeDocForCamera === 'evidencias') { setFileEvidencias(file); setDelEvidencias(false); }
      
      stopCamera();
    }
  };

  // Drag and Drop helpers
  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropFile = async (e, docType) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const compressed = await compressImage(file);
      if (docType === 'principal') { setFilePrincipal(compressed); setDelPrincipal(false); }
      if (docType === 'duplicado') { setFileDuplicado(compressed); setDelDuplicado(false); }
      if (docType === 'respaldo') { setFileRespaldo(compressed); setDelRespaldo(false); }
      if (docType === 'declaracion') { setFileDeclaracion(compressed); setDelDeclaracion(false); }
      if (docType === 'dni') { setFileDni(compressed); setDelDni(false); }
      if (docType === 'evidencias') { setFileEvidencias(compressed); setDelEvidencias(false); }
    }
  };

  const getFileName = (path) => {
    if (!path) return '';
    return path.split('/').pop();
  };

  const renderFileCard = (label, fileState, setFileState, delState, setDelState, docKey, isRequired = false) => {
    const hasExistingFile = isEdit && authorization && authorization[docKey === 'principal' ? 'autorizacion_principal' : docKey === 'duplicado' ? 'autorizacion_duplicado' : docKey === 'respaldo' ? 'autorizacion_respaldo' : docKey === 'declaracion' ? 'declaracion_jurada' : docKey === 'dni' ? 'copia_dni' : 'evidencias'];
    
    return (
      <div 
        className="file-upload-card"
        onDragOver={handleDragOver}
        onDrop={(e) => handleDropFile(e, docKey)}
        style={{
          border: fileState ? '1px dashed var(--accent-primary)' : '1px dashed rgba(255,255,255,0.15)',
          padding: '12px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.02)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          transition: 'all 0.2s ease',
          position: 'relative'
        }}
      >
        <span className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: isRequired && !fileState && !hasExistingFile ? '#f87171' : 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', margin: 0 }}>
          {label} {isRequired && '*'}
        </span>

        {hasExistingFile && !delState ? (
          <div className="existing-file-info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '6px 8px', borderRadius: '4px', marginTop: '4px' }}>
            <span className="existing-file-name" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }} title={getFileName(authorization[docKey === 'principal' ? 'autorizacion_principal' : docKey === 'duplicado' ? 'autorizacion_duplicado' : docKey === 'respaldo' ? 'autorizacion_respaldo' : docKey === 'declaracion' ? 'declaracion_jurada' : docKey === 'dni' ? 'copia_dni' : 'evidencias'])}>
              <FileText size={14} style={{ color: 'var(--accent-primary)' }} /> 
              {docKey === 'declaracion' ? 'Declaracion' : docKey === 'dni' ? 'Copia_DNI' : docKey.charAt(0).toUpperCase() + docKey.slice(1)}.pdf
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setDelState(true);
                  setFileState(null);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  color: '#fca5a5',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title="Eliminar archivo"
              >
                Eliminar
              </button>
              <button
                type="button"
                onClick={() => {
                  const input = document.getElementById(`file-input-${docKey}`);
                  if (input) input.click();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.15)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.7rem',
                  color: '#a5b4fc',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
                title="Reemplazar archivo"
              >
                Reemplazar
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '4px' }}>
            {/* Drop / Drag Zone */}
            <div 
              className="dropzone-area"
              style={{
                border: '1px dashed rgba(255,255,255,0.08)',
                borderRadius: '6px',
                padding: '10px 8px',
                textAlign: 'center',
                background: 'rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
              onClick={() => document.getElementById(`file-input-${docKey}`).click()}
            >
              <Upload size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cargar o arrastrar archivo</span>
              <input
                id={`file-input-${docKey}`}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={async (e) => {
                  if (e.target.files[0]) {
                    const compressed = await compressImage(e.target.files[0]);
                    setFileState(compressed);
                    setDelState(false);
                  }
                }}
              />
            </div>

            {/* Actions: Camera */}
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => openCameraModal(docKey)}
                style={{
                  flexGrow: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '4px',
                  padding: '6px',
                  fontSize: '0.7rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              >
                <Camera size={12} style={{ color: 'var(--accent-primary)' }} />
                Tomar Foto
              </button>
            </div>

            {/* File state preview / clean */}
            {fileState && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 6px', borderRadius: '4px' }}>
                <span style={{ fontSize: '0.68rem', color: '#34d399', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Image size={12} /> {fileState.name}
                </span>
                <button
                  type="button"
                  onClick={() => setFileState(null)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#f87171',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-panel">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Editar Autorización' : 'Nueva Autorización'}</h2>
          <button className="modal-close-btn" onClick={onClose} disabled={loading}>
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="login-error" style={{ marginBottom: '20px' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">DNI</label>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  className="form-input"
                  maxLength={8}
                  pattern="\d{8}"
                  placeholder="Ingrese 8 dígitos"
                  value={dni}
                  onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
                  disabled={loading || reniecLoading}
                  style={{ width: '100%', paddingRight: reniecLoading ? '36px' : '12px' }}
                />
                {reniecLoading && (
                  <Loader2 
                    size={16} 
                    className="animate-spin" 
                    style={{ 
                      position: 'absolute', 
                      right: '12px', 
                      top: '50%', 
                      transform: 'translateY(-50%)',
                      color: 'var(--accent-primary)',
                      animation: 'spin 1s linear infinite'
                    }} 
                  />
                )}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Apellidos y Nombres</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. Perez Gomez Juan"
                value={apellidosNombres}
                onChange={(e) => setApellidosNombres(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Sede</label>
              <select
                className="form-input"
                value={sedeId}
                onChange={(e) => setSedeId(e.target.value)}
                disabled={loading}
              >
                <option value="">-- Seleccionar Sede --</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Monto Mensual (S/.)</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="form-input"
                placeholder="Ej. 150.00"
                value={montoMensual}
                onChange={(e) => setMontoMensual(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mes de Inicio del Descuento</label>
              <select
                className="form-input"
                value={inicioMes}
                onChange={(e) => setInicioMes(e.target.value)}
                disabled={loading}
              >
                {MESES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Año de Inicio del Descuento</label>
              <input
                type="number"
                min="2020"
                max="2100"
                className="form-input"
                value={inicioAnio}
                onChange={(e) => setInicioAnio(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Número de Cuotas</label>
              <input
                type="number"
                min="1"
                className="form-input"
                placeholder="Ej. 12"
                value={numCuotas}
                onChange={(e) => setNumCuotas(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Observaciones</label>
              <textarea
                className="form-input"
                rows="2"
                placeholder="Ej. cliente falta adjuntar Copia de DNI"
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
                disabled={loading}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />
            </div>

            <div className="form-grid calculated-fields full-width" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '4px' }}>
              <div className="calculated-field-card">
                <span className="calculated-label">
                  <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Término de Descuento
                </span>
                <span className="calculated-value">{terminoMesStr} - {terminoAnioStr}</span>
              </div>
              
              <div className="calculated-field-card">
                <span className="calculated-label">
                  <DollarSign size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                  Monto Total Calculado
                </span>
                <span className="calculated-value">{montoTotalCalculado}</span>
              </div>
            </div>
          </div>

          <div className="files-upload-section">
            <h3 className="form-label" style={{ marginBottom: '4px' }}>Escaneo y Carga de Documentos</h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Formatos aceptados: PDF, JPG, PNG (Máx 10MB)</span>
            
            <div className="files-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginTop: '12px' }}>
              {renderFileCard('1. Autorización Principal', filePrincipal, setFilePrincipal, delPrincipal, setDelPrincipal, 'principal', true)}
              {renderFileCard('2. Autorización Duplicado', fileDuplicado, setFileDuplicado, delDuplicado, setDelDuplicado, 'duplicado', false)}
              {renderFileCard('3. Autorización Respaldo', fileRespaldo, setFileRespaldo, delRespaldo, setDelRespaldo, 'respaldo', false)}
              {renderFileCard('4. Declaración Jurada', fileDeclaracion, setFileDeclaracion, delDeclaracion, setDelDeclaracion, 'declaracion', false)}
              {renderFileCard('5. Copia DNI', fileDni, setFileDni, delDni, setDelDni, 'dni', false)}
              {renderFileCard('6. Evidencias (Foto Firma)', fileEvidencias, setFileEvidencias, delEvidencias, setDelEvidencias, 'evidencias', false)}
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Subiendo archivos...</span>
                </>
              ) : loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar Cambios</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Camera Capture Modal Overlay */}
      {cameraActive && (
        <div className="camera-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="camera-modal-content glass-panel" style={{
            background: '#111827',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            padding: '20px',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <Camera size={20} style={{ color: 'var(--accent-primary)' }} />
                Capturar Fotografía
              </h3>
              <button 
                type="button" 
                onClick={stopCamera}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px', borderRadius: '6px', color: '#fca5a5', fontSize: '0.8rem' }}>
                {cameraError}
              </div>
            )}

            {/* Video Device Selector */}
            {videoDevices.length > 1 && !capturedPhotoUrl && (
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: '4px' }}>Seleccionar Cámara</label>
                <select
                  className="form-input"
                  value={selectedDevice}
                  onChange={(e) => changeDevice(e.target.value)}
                  style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                >
                  {videoDevices.map((device, idx) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Cámara ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Video / Image Display Area */}
            <div className="camera-viewfinder-wrapper" style={{
              background: '#000',
              borderRadius: '8px',
              overflow: 'hidden',
              position: 'relative',
              aspectRatio: '4/3',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              {!capturedPhotoUrl ? (
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
              ) : (
                <img 
                  src={capturedPhotoUrl}
                  alt="Captured review"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>

            {/* Hidden canvas for taking snapshot */}
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            {/* Camera Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              {!capturedPhotoUrl ? (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={stopCamera}
                    style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={capturePhoto}
                    disabled={!!cameraError}
                    style={{ fontSize: '0.8rem', padding: '8px 20px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Camera size={14} />
                    Capturar Foto
                  </button>
                </>
              ) : (
                <>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => { setCapturedPhotoUrl(''); setCapturedBlob(null); }}
                    style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                  >
                    Volver a tomar
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={saveCapturedPhoto}
                    style={{ fontSize: '0.8rem', padding: '8px 20px', background: 'var(--accent-primary)', borderColor: 'var(--accent-primary)' }}
                  >
                    Guardar Foto
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Saving Loader Overlay */}
      {(submitting || loading) && (
        <div className="saving-loader-overlay">
          <div className="saving-loader-card glass-panel" style={{ background: '#111827' }}>
            <div className="saving-spinner-ring">
              <div className="saving-spinner-glow"></div>
            </div>
            <h3 className="saving-loader-title">Guardando Autorización</h3>
            <p className="saving-loader-text">{loadingMessage}</p>
          </div>
        </div>
      )}
      
      {/* Fallback styling constants */}
      <style>{`
        :root {
          --text-muted: #6b7280;
        }
      `}</style>
    </div>
  );
};

export default AuthorizationForm;
