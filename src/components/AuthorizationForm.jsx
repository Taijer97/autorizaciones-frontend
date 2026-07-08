import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, Loader2, Calendar, DollarSign } from 'lucide-react';
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
  
  // File attachments
  const [filePrincipal, setFilePrincipal] = useState(null);
  const [fileDuplicado, setFileDuplicado] = useState(null);
  const [fileRespaldo, setFileRespaldo] = useState(null);
  const [fileDeclaracion, setFileDeclaracion] = useState(null);
  const [fileDni, setFileDni] = useState(null);

  // Deletion marks for editing
  const [delPrincipal, setDelPrincipal] = useState(false);
  const [delDuplicado, setDelDuplicado] = useState(false);
  const [delRespaldo, setDelRespaldo] = useState(false);
  const [delDeclaracion, setDelDeclaracion] = useState(false);
  const [delDni, setDelDni] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [reniecLoading, setReniecLoading] = useState(false);
  const [initialDni, setInitialDni] = useState('');

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
      
      // Reset files
      setFilePrincipal(null);
      setFileDuplicado(null);
      setFileRespaldo(null);
      setFileDeclaracion(null);
      setFileDni(null);
      
      setDelPrincipal(false);
      setDelDuplicado(false);
      setDelRespaldo(false);
      setDelDeclaracion(false);
      setDelDni(false);
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
      
      setFilePrincipal(null);
      setFileDuplicado(null);
      setFileRespaldo(null);
      setFileDeclaracion(null);
      setFileDni(null);
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
        const data = await response.json();
        if (response.ok) {
          setSedes(data);
        }
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!dni || !apellidosNombres || !sedeId || !inicioMes || !inicioAnio || !numCuotas || !montoMensual) {
      setError('Por favor completa todos los campos del formulario.');
      return;
    }

    setLoading(true);

    const formData = new FormData();
    formData.append('dni', dni);
    formData.append('apellidos_nombres', apellidosNombres);
    formData.append('sede_id', parseInt(sedeId));
    formData.append('inicio_descuento_mes', parseInt(inicioMes));
    formData.append('inicio_descuento_anio', parseInt(inicioAnio));
    formData.append('num_cuotas', parseInt(numCuotas));
    formData.append('monto_mensual', parseFloat(montoMensual));

    // Files
    if (filePrincipal) formData.append('file_principal', filePrincipal);
    if (fileDuplicado) formData.append('file_duplicado', fileDuplicado);
    if (fileRespaldo) formData.append('file_respaldo', fileRespaldo);
    if (fileDeclaracion) formData.append('file_declaracion', fileDeclaracion);
    if (fileDni) formData.append('file_dni', fileDni);
 
    if (isEdit) {
      formData.append('delete_principal', delPrincipal);
      formData.append('delete_duplicado', delDuplicado);
      formData.append('delete_respaldo', delRespaldo);
      formData.append('delete_declaracion', delDeclaracion);
      formData.append('delete_dni', delDni);
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Ocurrió un error al guardar los datos.');
      }

      onSave();
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getFileName = (path) => {
    if (!path) return '';
    return path.split('/').pop();
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
            
            <div className="files-grid">
              
              {/* FILE 1: Principal */}
              <div className="file-upload-card">
                <span className="form-label" style={{ color: '#f87171', fontSize: '0.75rem' }}>1. Autorización Principal *</span>
                {isEdit && authorization.autorizacion_principal && !delPrincipal ? (
                  <div className="existing-file-info">
                    <span className="existing-file-name" title={getFileName(authorization.autorizacion_principal)}>
                      <FileText size={16} /> Principal.pdf
                    </span>
                    <label className="delete-file-checkbox">
                      <input
                        type="checkbox"
                        checked={delPrincipal}
                        onChange={(e) => setDelPrincipal(e.target.checked)}
                      />
                      Eliminar
                    </label>
                  </div>
                ) : (
                  <div className="file-input-wrapper">
                    <button type="button" className="file-input-custom">
                      <Upload size={14} /> Subir archivo
                    </button>
                    <input
                      type="file"
                      className="file-input-hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFilePrincipal(e.target.files[0])}
                    />
                    <span className="file-status-label">
                      {filePrincipal ? filePrincipal.name : 'No seleccionado'}
                    </span>
                  </div>
                )}
              </div>

              {/* FILE 2: Duplicado */}
              <div className="file-upload-card">
                <span className="form-label" style={{ fontSize: '0.75rem' }}>2. Autorización Duplicado</span>
                {isEdit && authorization.autorizacion_duplicado && !delDuplicado ? (
                  <div className="existing-file-info">
                    <span className="existing-file-name" title={getFileName(authorization.autorizacion_duplicado)}>
                      <FileText size={16} /> Duplicado.pdf
                    </span>
                    <label className="delete-file-checkbox">
                      <input
                        type="checkbox"
                        checked={delDuplicado}
                        onChange={(e) => setDelDuplicado(e.target.checked)}
                      />
                      Eliminar
                    </label>
                  </div>
                ) : (
                  <div className="file-input-wrapper">
                    <button type="button" className="file-input-custom">
                      <Upload size={14} /> Subir archivo
                    </button>
                    <input
                      type="file"
                      className="file-input-hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFileDuplicado(e.target.files[0])}
                    />
                    <span className="file-status-label">
                      {fileDuplicado ? fileDuplicado.name : 'No seleccionado'}
                    </span>
                  </div>
                )}
              </div>

              {/* FILE 3: Respaldo */}
              <div className="file-upload-card">
                <span className="form-label" style={{ fontSize: '0.75rem' }}>3. Autorización Respaldo</span>
                {isEdit && authorization.autorizacion_respaldo && !delRespaldo ? (
                  <div className="existing-file-info">
                    <span className="existing-file-name" title={getFileName(authorization.autorizacion_respaldo)}>
                      <FileText size={16} /> Respaldo.pdf
                    </span>
                    <label className="delete-file-checkbox">
                      <input
                        type="checkbox"
                        checked={delRespaldo}
                        onChange={(e) => setDelRespaldo(e.target.checked)}
                      />
                      Eliminar
                    </label>
                  </div>
                ) : (
                  <div className="file-input-wrapper">
                    <button type="button" className="file-input-custom">
                      <Upload size={14} /> Subir archivo
                    </button>
                    <input
                      type="file"
                      className="file-input-hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFileRespaldo(e.target.files[0])}
                    />
                    <span className="file-status-label">
                      {fileRespaldo ? fileRespaldo.name : 'No seleccionado'}
                    </span>
                  </div>
                )}
              </div>

              {/* FILE 4: Declaracion Jurada */}
              <div className="file-upload-card">
                <span className="form-label" style={{ fontSize: '0.75rem' }}>4. Declaración Jurada</span>
                {isEdit && authorization.declaracion_jurada && !delDeclaracion ? (
                  <div className="existing-file-info">
                    <span className="existing-file-name" title={getFileName(authorization.declaracion_jurada)}>
                      <FileText size={16} /> Declaracion.pdf
                    </span>
                    <label className="delete-file-checkbox">
                      <input
                        type="checkbox"
                        checked={delDeclaracion}
                        onChange={(e) => setDelDeclaracion(e.target.checked)}
                      />
                      Eliminar
                    </label>
                  </div>
                ) : (
                  <div className="file-input-wrapper">
                    <button type="button" className="file-input-custom">
                      <Upload size={14} /> Subir archivo
                    </button>
                    <input
                      type="file"
                      className="file-input-hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFileDeclaracion(e.target.files[0])}
                    />
                    <span className="file-status-label">
                      {fileDeclaracion ? fileDeclaracion.name : 'No seleccionado'}
                    </span>
                  </div>
                )}
              </div>

              {/* FILE 5: Copia DNI */}
              <div className="file-upload-card">
                <span className="form-label" style={{ fontSize: '0.75rem' }}>5. Copia DNI</span>
                {isEdit && authorization.copia_dni && !delDni ? (
                  <div className="existing-file-info">
                    <span className="existing-file-name" title={getFileName(authorization.copia_dni)}>
                      <FileText size={16} /> Copia_DNI.pdf
                    </span>
                    <label className="delete-file-checkbox">
                      <input
                        type="checkbox"
                        checked={delDni}
                        onChange={(e) => setDelDni(e.target.checked)}
                      />
                      Eliminar
                    </label>
                  </div>
                ) : (
                  <div className="file-input-wrapper">
                    <button type="button" className="file-input-custom">
                      <Upload size={14} /> Subir archivo
                    </button>
                    <input
                      type="file"
                      className="file-input-hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => setFileDni(e.target.files[0])}
                    />
                    <span className="file-status-label">
                      {fileDni ? fileDni.name : 'No seleccionado'}
                    </span>
                  </div>
                )}
              </div>

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
              disabled={loading}
            >
              {loading ? (
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
