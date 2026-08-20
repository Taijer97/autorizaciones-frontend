import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Loader2, Calendar, DollarSign, Camera, Trash2, Image as ImageIcon, CheckCircle2, AlertOctagon, Search } from 'lucide-react';
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
  const [apellidoPn, setApellidoPn] = useState('');
  const [apellidoMn, setApellidoMn] = useState('');
  const [nombres, setNombres] = useState('');
  const [sedeId, setSedeId] = useState('');
  const [sedes, setSedes] = useState([]);
  const [inicioMes, setInicioMes] = useState(1);
  const [inicioAnio, setInicioAnio] = useState(new Date().getFullYear());
  const [numCuotas, setNumCuotas] = useState(12);
  const [montoMensual, setMontoMensual] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [codModular, setCodModular] = useState('');
  const [fechaEmision, setFechaEmision] = useState('');
  const [estado, setEstado] = useState('VIGENTES');
  
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
  const [fileNotification, setFileNotification] = useState({ show: false, message: '', type: 'success' });
  const [previewError, setPreviewError] = useState(false);

  const triggerFileNotification = (message, type = 'success') => {
    setFileNotification({ show: true, message, type });
    // Auto-dismiss after 3.5 seconds
    setTimeout(() => {
      setFileNotification(prev => ({ ...prev, show: false }));
    }, 4500); // 4.5s so users can read longer error messages
  };

  // Validate file types and size (Max 15MB for heavy office scanners)
  const validateFile = (file) => {
    if (!file) return null;
    
    const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'tiff', 'tif'];
    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    const isImage = file.type.startsWith('image/');
    const isPdf = file.type === 'application/pdf' || fileExtension === 'pdf';
    const isAllowedExtension = allowedExtensions.includes(fileExtension);
    
    if (!isPdf && !isImage && !isAllowedExtension) {
      return 'Formato no compatible. Solo se permiten PDF o imágenes (JPG, PNG, WEBP, TIFF).';
    }
    
    const MAX_SIZE = 15 * 1024 * 1024; // 15 Megabytes
    if (file.size > MAX_SIZE) {
      return `El archivo "${file.name}" supera el límite de 15MB. Escanéelo en menor calidad (150-200 DPI).`;
    }
    
    return null;
  };

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
    setPreviewError(false);
    if (authorization) {
      setDni(authorization.dni || '');
      setApellidoPn(authorization.apellido_pn || '');
      setApellidoMn(authorization.apellido_mn || '');
      setNombres(authorization.nombres || '');
      setSedeId(authorization.sede_id || '');
      setInicioMes(authorization.inicio_descuento_mes || 1);
      setInicioAnio(authorization.inicio_descuento_anio || new Date().getFullYear());
      setNumCuotas(authorization.num_cuotas || 12);
      setMontoMensual(authorization.monto_mensual || '');
      setObservaciones(authorization.observaciones || '');
      setCodModular(authorization.cod_modular || '');
      setFechaEmision(authorization.fecha_emision ? authorization.fecha_emision.split('T')[0] : '');
      setEstado(authorization.estado || 'VIGENTES');
      
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
      setApellidoPn('');
      setApellidoMn('');
      setNombres('');
      setSedeId('');
      setInicioMes(new Date().getMonth() + 1);
      setInicioAnio(new Date().getFullYear());
      setNumCuotas(12);
      setMontoMensual('');
      setObservaciones('');
      setCodModular('');
      setFechaEmision(new Date().toISOString().split('T')[0]);
      setEstado('VIGENTES');
      
      setFilePrincipal(null);
      setFileDuplicado(null);
      setFileRespaldo(null);
      setFileDeclaracion(null);
      setFileDni(null);
      setFileEvidencias(null);
      setInitialDni('');
    }
  }, [authorization, isOpen]);

  const fetchReniecData = async (force = false) => {
    if (dni.length === 8 && (force || dni !== initialDni)) {
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
          setApellidoPn(apellido_paterno || '');
          setApellidoMn(apellido_materno || '');
          setNombres(nombres || '');
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

  // Trigger RENIEC query automatically when DNI is 8 digits and has changed
  useEffect(() => {
    fetchReniecData(false);
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
      img.onerror = () => {
        resolve(file); // fallback to original file if decoding fails
      };
      img.src = URL.createObjectURL(file);
    });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!dni || !apellidoPn || !nombres || !sedeId || !inicioMes || !inicioAnio || !numCuotas || !montoMensual) {
      setError('Por favor completa todos los campos del formulario.');
      return;
    }

    setLoading(true);
    setSubmitting(true);

    const formData = new FormData();
    formData.append('dni', dni);
    formData.append('apellido_pn', apellidoPn);
    formData.append('apellido_mn', apellidoMn);
    formData.append('nombres', nombres);
    formData.append('sede_id', parseInt(sedeId));
    formData.append('inicio_descuento_mes', parseInt(inicioMes));
    formData.append('inicio_descuento_anio', parseInt(inicioAnio));
    formData.append('num_cuotas', parseInt(numCuotas));
    formData.append('monto_mensual', parseFloat(montoMensual));
    formData.append('observaciones', observaciones || '');
    formData.append('cod_modular', codModular || '');
    if (fechaEmision) {
      formData.append('fecha_emision', new Date(fechaEmision).toISOString());
    }
    formData.append('estado', estado);

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
      
      triggerFileNotification(`Fotografía guardada correctamente`, 'success');
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
      const errorMsg = validateFile(file);
      if (errorMsg) {
        triggerFileNotification(errorMsg, 'error');
        return;
      }
      const compressed = await compressImage(file);
      if (docType === 'principal') { setFilePrincipal(compressed); setDelPrincipal(false); }
      if (docType === 'duplicado') { setFileDuplicado(compressed); setDelDuplicado(false); }
      if (docType === 'respaldo') { setFileRespaldo(compressed); setDelRespaldo(false); }
      if (docType === 'declaracion') { setFileDeclaracion(compressed); setDelDeclaracion(false); }
      if (docType === 'dni') { setFileDni(compressed); setDelDni(false); }
      if (docType === 'evidencias') { setFileEvidencias(compressed); setDelEvidencias(false); }
      triggerFileNotification(`Archivo "${file.name}" cargado correctamente`, 'success');
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
        className={`file-upload-card-custom ${fileState ? 'has-file' : ''}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDropFile(e, docKey)}
      >
        <span className="form-label" style={{ fontSize: '0.75rem', fontWeight: 600, color: isRequired && !fileState && !hasExistingFile ? 'var(--color-danger)' : 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', margin: 0 }}>
          {label} {isRequired && '*'}
        </span>

        <input
          id={`file-input-${docKey}`}
          type="file"
          style={{ display: 'none' }}
          accept=".pdf,image/*"
          onClick={(e) => e.stopPropagation()}
          onChange={async (e) => {
            const file = e.target.files[0];
            if (file) {
              const errorMsg = validateFile(file);
              if (errorMsg) {
                triggerFileNotification(errorMsg, 'error');
                return;
              }
              const compressed = await compressImage(file);
              setFileState(compressed);
              setDelState(false); // Make sure we override deletion marker if we replace
              triggerFileNotification(`Archivo "${file.name}" cargado correctamente`, 'success');
            }
          }}
        />

        {hasExistingFile && !delState ? (
          <div className="existing-file-box">
            <span className="existing-file-name" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%', color: 'var(--accent-primary)' }} title={getFileName(authorization[docKey === 'principal' ? 'autorizacion_principal' : docKey === 'duplicado' ? 'autorizacion_duplicado' : docKey === 'respaldo' ? 'autorizacion_respaldo' : docKey === 'declaracion' ? 'declaracion_jurada' : docKey === 'dni' ? 'copia_dni' : 'evidencias'])}>
              <FileText size={14} style={{ color: 'var(--accent-primary)' }} /> 
              {docKey === 'declaracion' ? 'Declaracion' : docKey === 'dni' ? 'Copia_DNI' : docKey.charAt(0).toUpperCase() + docKey.slice(1)}.pdf
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                className="btn-mini-delete"
                onClick={() => {
                  setDelState(true);
                  setFileState(null);
                }}
                title="Eliminar archivo"
              >
                Eliminar
              </button>
              <button
                type="button"
                className="btn-mini-replace"
                onClick={() => {
                  const input = document.getElementById(`file-input-${docKey}`);
                  if (input) input.click();
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
              className="dropzone-area-custom"
              onClick={() => document.getElementById(`file-input-${docKey}`).click()}
            >
              <Upload size={16} style={{ color: 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Cargar o arrastrar archivo</span>
            </div>

            {/* Actions: Camera */}
            <div className="camera-only-mobile">
              <button
                type="button"
                className="btn-mini-camera"
                onClick={() => openCameraModal(docKey)}
              >
                <Camera size={12} style={{ color: 'var(--accent-primary)' }} />
                Tomar Foto
              </button>
            </div>

            {/* File state preview / clean */}
            {fileState && (
              <div className="file-preview-box">
                <span className="file-preview-text">
                  <ImageIcon size={12} /> {fileState.name}
                </span>
                <button
                  type="button"
                  className="file-preview-delete"
                  onClick={() => setFileState(null)}
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

  const hasPrincipalFile = isEdit && authorization && !!authorization.autorizacion_principal;

  const renderFormContent = () => (
    <>
      <div className="modal-header">
        <h2 className="modal-title">{isEdit ? 'Editar Autorización' : 'Nueva Autorización'}</h2>
        <button className="modal-close-btn" onClick={onClose} disabled={loading}>
          <X size={20} />
        </button>
      </div>

      {fileNotification.show && (
        <div 
          style={{
            background: fileNotification.type === 'error' ? 'var(--color-danger-bg)' : 'var(--color-success-bg)',
            border: `1px solid ${fileNotification.type === 'error' ? 'var(--color-danger-border)' : 'var(--color-success-border)'}`,
            color: fileNotification.type === 'error' ? 'var(--color-danger)' : 'var(--color-success)',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '16px',
            animation: 'fadeInLoader 0.3s ease-out',
            fontWeight: 500
          }}
        >
          {fileNotification.type === 'error' ? <AlertOctagon size={16} /> : <CheckCircle2 size={16} />}
          <span>{fileNotification.message}</span>
        </div>
      )}

      {error && (
        <div className="login-error" style={{ marginBottom: '20px' }}>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">DNI</label>
              <div style={{ position: 'relative', display: 'flex', gap: '8px' }}>
                <div style={{ position: 'relative', flexGrow: 1 }}>
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
                <button
                  type="button"
                  onClick={() => fetchReniecData(true)}
                  disabled={loading || reniecLoading || dni.length !== 8}
                  className="btn btn-primary"
                  style={{ padding: '0 12px', height: '42px', flexShrink: 0 }}
                  title="Buscar en RENIEC"
                >
                  <Search size={18} />
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Apellido Paterno</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. PEREZ"
                value={apellidoPn}
                onChange={(e) => setApellidoPn(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Apellido Materno</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. GOMEZ"
                value={apellidoMn}
                onChange={(e) => setApellidoMn(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Nombres</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ej. JUAN CARLOS"
                value={nombres}
                onChange={(e) => setNombres(e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Cód. Modular</label>
              <input
                type="text"
                className="form-input"
                placeholder="Ingrese Cód. Modular"
                value={codModular}
                onChange={(e) => setCodModular(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fecha de Emisión</label>
              <input
                type="date"
                className="form-input"
                value={fechaEmision}
                onChange={(e) => setFechaEmision(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estado</label>
              <select
                className="form-input"
                value={estado}
                onChange={(e) => setEstado(e.target.value)}
                disabled={loading}
              >
                <option value="VIGENTES">VIGENTES</option>
                <option value="CANCELADOS">CANCELADOS</option>
                <option value="NO TRABAJAN">NO TRABAJAN</option>
              </select>
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
      </>
  );

  return (
    <div 
      className="modal-overlay"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
    >
      <div className={`modal-content glass-panel ${hasPrincipalFile ? 'modal-content-split' : ''}`}>
        {hasPrincipalFile ? (
          <div className="modal-split-container">
            <div className="modal-split-form">
              {renderFormContent()}
            </div>
            
            <div className="modal-split-preview">
              <div className="preview-header-split">
                <span>Autorización Principal Registrada</span>
              </div>
              <div className="preview-body-split">
                {previewError ? (
                  <div className="preview-placeholder" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                    <AlertOctagon size={40} style={{ color: 'var(--color-danger)' }} />
                    <h4 style={{ color: 'var(--color-danger)', fontSize: '0.9rem', margin: 0 }}>Archivo no disponible (404)</h4>
                    <p style={{ fontSize: '0.75rem', margin: 0, lineHeight: 1.4, maxWidth: '280px' }}>
                      El documento no está accesible en este entorno local o el archivo no existe físicamente en el disco.
                    </p>
                  </div>
                ) : (
                  <>
                    {authorization.autorizacion_principal.toLowerCase().endsWith('.pdf') ? (
                      <iframe 
                        src={`/${authorization.autorizacion_principal}?t=${Date.now()}`} 
                        className="preview-iframe-split"
                        title="Autorización Principal"
                        onError={() => setPreviewError(true)}
                      />
                    ) : (
                      <div className="preview-image-container-split">
                        <img 
                          src={`/${authorization.autorizacion_principal}?t=${Date.now()}`} 
                          className="preview-image-split"
                          alt="Autorización Principal"
                          onError={() => setPreviewError(true)}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          renderFormContent()
        )}
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
              <div style={{ background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: '10px', borderRadius: '6px', color: 'var(--color-danger)', fontSize: '0.8rem' }}>
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
          <div className="saving-loader-card glass-panel" style={{ background: 'var(--bg-secondary)' }}>
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
