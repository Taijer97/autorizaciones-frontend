import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AuthorizationForm from '../components/AuthorizationForm';
import DocumentViewer from '../components/DocumentViewer';
import { 
  LogOut, Plus, Search, FileText, AlertCircle, Filter, 
  Shield, ShieldAlert, FileCheck, CheckCircle2, Clock, Calendar, Trash2, Edit, 
  Eye, RefreshCw, X, AlertTriangle, Building2, Bell, Loader2
} from 'lucide-react';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [authorizations, setAuthorizations] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [searchDni, setSearchDni] = useState('');
  const [selectedSede, setSelectedSede] = useState(''); // Stores Sede ID
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tableTab, setTableTab] = useState('all'); // 'all', 'expired', 'expiring'

  const canCreateAuth = user ? (user.role === 'superadmin' || user.can_create) : false;
  const canUpdateAuth = user ? (user.role === 'superadmin' || user.can_update) : false;
  const canDeleteAuth = user ? (user.role === 'superadmin' || user.can_delete) : false;

  const getFilteredTableAuths = () => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    return authorizations.filter(auth => {
      const diffMonths = (auth.termino_descuento_anio - currentYear) * 12 + (auth.termino_descuento_mes - currentMonth);
      if (tableTab === 'expired') {
        return diffMonths < 0;
      }
      if (tableTab === 'expiring') {
        return diffMonths >= 0 && diffMonths <= 1;
      }
      return true; // 'all'
    });
  };

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAuth, setEditingAuth] = useState(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewingAuth, setViewingAuth] = useState(null);

  // Toast notifications state
  const [toasts, setToasts] = useState([]);
  const wsRef = useRef(null);
  const [wsTrigger, setWsTrigger] = useState(0);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [user, authLoading, navigate]);

  // Fetch sedes
  const fetchSedes = async () => {
    if (!user) return;
    try {
      const response = await fetch('/api/sedes/', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setSedes(data);
      }
    } catch (err) {
      console.error('Error al obtener sedes:', err);
    }
  };

  // Fetch authorizations
  const fetchAuthorizations = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      if (searchDni) queryParams.append('dni', searchDni);
      if (selectedSede) queryParams.append('sede_id', selectedSede); // Send sede_id instead of string
      if (selectedStatus) queryParams.append('doc_status', selectedStatus);

      const response = await fetch(`/api/authorizations/?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Error al obtener autorizaciones');
      }
      setAuthorizations(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchAuthorizations();
      fetchSedes();
    }
  }, [user, selectedSede, selectedStatus]); // Fetch on filters change

  // Run search when pressing enter or clicking search button
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAuthorizations();
  };

    // Setup WebSocket connection
  useEffect(() => {
    if (!user) return;

    // Detect websocket url
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/ws`;

    console.log(`Conectando a WebSocket en: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      console.log('Conexión WebSocket establecida.');
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const { type, data } = payload;
        
        // Show notification toast
        let toastTitle = 'Notificación';
        let toastMsg = '';
        let toastType = 'info';

        if (type === 'AUTHORIZATION_CREATED') {
          toastTitle = 'Nueva Autorización Creada';
          toastMsg = `El usuario ${data.by} registró una nueva autorización para el DNI ${data.dni} (${data.sede})`;
          toastType = 'success';
        } else if (type === 'AUTHORIZATION_UPDATED') {
          toastTitle = 'Autorización Actualizada';
          toastMsg = `El usuario ${data.by} actualizó la autorización del DNI ${data.dni} (${data.sede})`;
          toastType = 'warning';
        } else if (type === 'AUTHORIZATION_DELETED') {
          toastTitle = 'Autorización Eliminada';
          toastMsg = `El usuario ${data.by} eliminó la autorización del DNI ${data.dni} (${data.sede})`;
          toastType = 'danger';
        }

        // Add toast
        const id = Date.now();
        setToasts(prev => [...prev, { id, title: toastTitle, message: toastMsg, type: toastType }]);
        setTimeout(() => {
          setToasts(prev => prev.filter(t => t.id !== id));
        }, 6000);

        // Auto-refresh the list
        fetchAuthorizations();
      } catch (err) {
        console.error('Error al procesar mensaje de WebSocket:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('Error en WebSocket:', error);
    };

    socket.onclose = () => {
      console.log('Conexión WebSocket cerrada. Reintentando en 3 segundos...');
      setTimeout(() => {
        setWsTrigger(prev => prev + 1);
      }, 3002);
    };

    return () => {
      socket.close();
    };
  }, [user, wsTrigger]);

  const handleDelete = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar permanentemente este registro y sus archivos escaneados?')) {
      return;
    }

    try {
      const response = await fetch(`/api/authorizations/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al eliminar el registro');
      }
      
      // Toast local notification (WebSocket will also trigger one)
      fetchAuthorizations();
    } catch (err) {
      alert(err.message);
    }
  };

  const openCreateModal = () => {
    setEditingAuth(null);
    setIsFormOpen(true);
  };

  const openEditModal = (auth) => {
    setEditingAuth(auth);
    setIsFormOpen(true);
  };

  const openViewerModal = (auth) => {
    setViewingAuth(auth);
    setIsViewerOpen(true);
  };

  if (authLoading || !user) {
    return (
      <div className="login-container">
        <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  // Calculate statistics
  const totalRecords = authorizations.length;
  let completeRecords = 0;
  let missingPrincipal = 0;
  let missingOthers = 0;
  let expiredCount = 0;
  let expiringCount = 0;

  const currentDateObj = new Date();
  const currentYearVal = currentDateObj.getFullYear();
  const currentMonthVal = currentDateObj.getMonth() + 1;

  authorizations.forEach(auth => {
    const hasP = !!auth.autorizacion_principal;
    const hasD = !!auth.autorizacion_duplicado;
    const hasR = !!auth.autorizacion_respaldo;
    const hasDec = !!auth.declaracion_jurada;
    const hasDni = !!auth.copia_dni;

    // Document completeness check
    if (hasP && hasD && hasR && hasDec && hasDni) {
      completeRecords++;
    } else if (!hasP) {
      missingPrincipal++;
    } else {
      missingOthers++;
    }

    // Expiration date check
    const diffMonths = (auth.termino_descuento_anio - currentYearVal) * 12 + (auth.termino_descuento_mes - currentMonthVal);
    if (diffMonths < 0) {
      expiredCount++;
    } else if (diffMonths <= 1) {
      expiringCount++;
    }
  });

  const getRowClass = (auth) => {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    const diffMonths = (auth.termino_descuento_anio - currentYear) * 12 + (auth.termino_descuento_mes - currentMonth);

    if (diffMonths < 0) return 'tr-danger'; // Expired overrides document checks
    if (diffMonths <= 1) return 'tr-warning'; // Expiring overrides success

    if (!auth.autorizacion_principal) return 'tr-danger';
    if (!auth.autorizacion_duplicado || !auth.autorizacion_respaldo || !auth.declaracion_jurada || !auth.copia_dni) return 'tr-warning';
    return 'tr-success';
  };

  const formatMoney = (val) => parseFloat(val).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const formatMonth = (m) => String(m).padStart(2, '0');

  return (
    <div className="dashboard-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo/logo-cb.png" 
            alt="Logo CB" 
            style={{ maxHeight: '42px', objectFit: 'contain' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className="logo-text" style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>Autorizaciones CB</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', fontWeight: 600, textTransform: 'uppercase' }}>Control por sedes</span>
          </div>
        </div>

        <div className="header-user-actions">
          <div className="user-profile-badge">
            <div className="profile-avatar">
              {user.full_name.charAt(0)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="profile-name">{user.full_name}</span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '3px' }}>
                <Shield size={10} /> {user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Administrador' : 'Operador'}
              </span>
            </div>
          </div>

          {(user.role === 'superadmin' || user.role === 'admin') && (
            <Link to="/admin" className="btn btn-secondary" style={{ marginRight: '8px' }} title="Panel de Administración">
              <ShieldAlert size={16} style={{ color: 'var(--color-danger)' }} />
              <span className="hide-mobile">Panel Admin</span>
            </Link>
          )}

          <button className="btn btn-secondary" onClick={logout} title="Cerrar sesión">
            <LogOut size={16} />
            <span className="hide-mobile">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="dashboard-main">
        
        {/* Statistics Widgets */}
        <section className="stats-grid">
          
          <div className="glass-panel stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-info-bg)', color: 'var(--color-info)' }}>
              <FileText size={24} />
            </div>
            <div>
              <div className="stat-value">{totalRecords}</div>
              <div className="stat-label">Total Autorizaciones</div>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-success-bg)', color: 'var(--color-success)' }}>
              <CheckCircle2 size={24} />
            </div>
            <div>
              <div className="stat-value">{completeRecords}</div>
              <div className="stat-label">Expedientes Completos</div>
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <AlertTriangle size={24} />
            </div>
            <div>
              <div className="stat-value">{missingOthers}</div>
              <div className="stat-label">Incompletos (Secundarios)</div>
            </div>
          </div>

          <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <div className="stat-value">{missingPrincipal}</div>
              <div className="stat-label">Falta Aut. Principal (Crítico)</div>
            </div>
          </div>

        </section>

        {/* Expiration warning cards */}
        <section className="stats-grid-two-columns" style={{ marginTop: '-15px' }}>
          <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--color-danger)' }}>
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)' }}>
              <Clock size={24} />
            </div>
            <div>
              <div className="stat-value">{expiredCount}</div>
              <div className="stat-label" style={{ fontWeight: 'bold' }}>Autorizaciones Vencidas (Revisar inmediatamente)</div>
            </div>
          </div>

          <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--color-warning)' }}>
            <div className="stat-icon-wrapper" style={{ background: 'var(--color-warning-bg)', color: 'var(--color-warning)' }}>
              <Calendar size={24} />
            </div>
            <div>
              <div className="stat-value">{expiringCount}</div>
              <div className="stat-label" style={{ fontWeight: 'bold' }}>Autorizaciones Por Vencer (Próximo mes)</div>
            </div>
          </div>
        </section>

        {/* Search & Filters */}
        <section className="glass-panel filters-panel">
          <form className="search-input-wrapper" onSubmit={handleSearchSubmit}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Buscar por DNI (Presione Enter)..."
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value.replace(/\D/g, ''))}
            />
          </form>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', width: '100%', maxWidth: 'fit-content' }}>
            <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <Building2 size={16} className="text-secondary" style={{ color: 'var(--text-secondary)' }} />
              <select
                className="form-input filter-select"
                value={selectedSede}
                onChange={(e) => setSelectedSede(e.target.value)}
              >
                <option value="">Todas las Sedes</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0, flexDirection: 'row', alignItems: 'center', gap: '8px' }}>
              <Filter size={16} className="text-secondary" style={{ color: 'var(--text-secondary)' }} />
              <select
                className="form-input filter-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">Todos los Estados</option>
                <option value="complete">Expedientes Completos</option>
                <option value="missing_principal">Falta Aut. Principal</option>
                <option value="missing_others">Faltan Secundarios</option>
              </select>
            </div>

            <button className="btn btn-secondary btn-icon" onClick={fetchAuthorizations} title="Actualizar datos">
              <RefreshCw size={16} />
            </button>
          </div>
        </section>

        {/* Data Table */}
        <section className="glass-panel table-panel">
          <div className="table-header-row" style={{ flexWrap: 'wrap', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
              <h2 className="table-title" style={{ margin: 0 }}>Registros de Autorizaciones CB</h2>
              
              {/* Tab Selector for Expiration sub-dashboards */}
              <div className="admin-tabs" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                <button 
                  type="button"
                  className={`tab-btn ${tableTab === 'all' ? 'active' : ''}`}
                  onClick={() => setTableTab('all')}
                  style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                >
                  Todos ({totalRecords})
                </button>
                <button 
                  type="button"
                  className={`tab-btn ${tableTab === 'expired' ? 'active' : ''}`}
                  onClick={() => setTableTab('expired')}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', color: expiredCount > 0 ? 'var(--color-danger)' : undefined }}
                >
                  Vencidos ({expiredCount})
                </button>
                <button 
                  type="button"
                  className={`tab-btn ${tableTab === 'expiring' ? 'active' : ''}`}
                  onClick={() => setTableTab('expiring')}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', color: expiringCount > 0 ? 'var(--color-warning)' : undefined }}
                >
                  Por Vencer ({expiringCount})
                </button>
              </div>
            </div>

            {canCreateAuth && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                <Plus size={16} />
                <span>Agregar Autorización</span>
              </button>
            )}
          </div>

          <div className="table-wrapper">
            {loading ? (
              <div className="no-data-card" style={{ padding: '80px' }}>
                <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Cargando registros...</span>
              </div>
            ) : getFilteredTableAuths().length === 0 ? (
              <div className="no-data-card">
                <FileText size={48} style={{ color: 'var(--text-muted)' }} />
                <h3>No se encontraron registros</h3>
                <p>No hay autorizaciones registradas en la pestaña "{tableTab === 'expired' ? 'Vencidos' : tableTab === 'expiring' ? 'Por Vencer' : 'Todos'}" con los filtros activos.</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Apellidos y Nombres</th>
                    <th>Sede</th>
                    <th>Inicio Dcto.</th>
                    <th>Cuotas</th>
                    <th>Término Dcto.</th>
                    <th>Mensual</th>
                    <th>Monto Total</th>
                    <th>Archivos</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getFilteredTableAuths().map((auth) => {
                    const hasP = !!auth.autorizacion_principal;
                    const hasD = !!auth.autorizacion_duplicado;
                    const hasR = !!auth.autorizacion_respaldo;
                    const hasDec = !!auth.declaracion_jurada;
                    const hasDni = !!auth.copia_dni;
                    
                    return (
                      <tr key={auth.id} className={getRowClass(auth)}>
                        <td style={{ fontWeight: 700 }}>{auth.dni}</td>
                        <td style={{ fontWeight: 500 }}>{auth.apellidos_nombres}</td>
                        <td>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={12} style={{ color: 'var(--text-secondary)' }} />
                            {auth.sede}
                          </span>
                        </td>
                        <td>{formatMonth(auth.inicio_descuento_mes)}/{auth.inicio_descuento_anio}</td>
                        <td>
                          <span className="badge badge-info" style={{ fontWeight: 'normal' }}>
                            {auth.num_cuotas} cuotas
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>
                          <div>{formatMonth(auth.termino_descuento_mes)}/{auth.termino_descuento_anio}</div>
                          {(() => {
                            const currentDate = new Date();
                            const currentYear = currentDate.getFullYear();
                            const currentMonth = currentDate.getMonth() + 1;
                            const diffMonths = (auth.termino_descuento_anio - currentYear) * 12 + (auth.termino_descuento_mes - currentMonth);
                            
                            if (diffMonths < 0) {
                              return <span style={{ fontSize: '0.65rem', color: '#fca5a5', background: 'rgba(239, 68, 68, 0.25)', border: '1px solid rgba(239, 68, 68, 0.4)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>VENCIDA</span>;
                            } else if (diffMonths <= 1) {
                              return <span style={{ fontSize: '0.65rem', color: '#fde047', background: 'rgba(245, 158, 11, 0.25)', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>1 MES A VENCER</span>;
                            }
                            return null;
                          })()}
                        </td>
                        <td>S/. {formatMoney(auth.monto_mensual)}</td>
                        <td style={{ fontWeight: 700, color: 'var(--accent-primary)' }}>S/. {formatMoney(auth.monto_total)}</td>
                        
                        {/* File checkdots group */}
                        <td>
                          <div className="file-dots-group">
                            <span 
                              className="file-dot-item" 
                              style={{ background: hasP ? 'var(--color-success)' : 'var(--color-danger)' }}
                              data-tooltip={hasP ? "1. Principal: OK" : "1. Principal: FALTANTE"}
                            />
                            <span 
                              className="file-dot-item" 
                              style={{ background: hasD ? 'var(--color-success)' : 'var(--color-warning)' }}
                              data-tooltip={hasD ? "2. Duplicado: OK" : "2. Duplicado: FALTANTE"}
                            />
                            <span 
                              className="file-dot-item" 
                              style={{ background: hasR ? 'var(--color-success)' : 'var(--color-warning)' }}
                              data-tooltip={hasR ? "3. Respaldo: OK" : "3. Respaldo: FALTANTE"}
                            />
                            <span 
                              className="file-dot-item" 
                              style={{ background: hasDec ? 'var(--color-success)' : 'var(--color-warning)' }}
                              data-tooltip={hasDec ? "4. Declaración Jurada: OK" : "4. Declaración Jurada: FALTANTE"}
                            />
                            <span 
                              className="file-dot-item" 
                              style={{ background: hasDni ? 'var(--color-success)' : 'var(--color-warning)' }}
                              data-tooltip={hasDni ? "5. Copia DNI: OK" : "5. Copia DNI: FALTANTE"}
                            />
                          </div>
                        </td>

                        {/* Action buttons cell */}
                        <td style={{ paddingRight: '24px' }}>
                          <div className="actions-cell">
                            <button 
                              className="btn btn-secondary btn-icon" 
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => openViewerModal(auth)}
                              title="Consultar Documentos"
                            >
                              <Eye size={14} />
                            </button>

                            <>
                              {canUpdateAuth && (
                                <button 
                                  className="btn btn-secondary btn-icon" 
                                  style={{ width: '32px', height: '32px', borderColor: 'rgba(99,102,241,0.2)' }}
                                  onClick={() => openEditModal(auth)}
                                  title="Editar"
                                >
                                  <Edit size={14} style={{ color: 'var(--accent-primary)' }} />
                                </button>
                              )}
                              {canDeleteAuth && (
                                <button 
                                  className="btn btn-danger btn-icon" 
                                  style={{ width: '32px', height: '32px' }}
                                  onClick={() => handleDelete(auth.id)}
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>

      {/* Floating Action Modals */}
      <AuthorizationForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={fetchAuthorizations}
        authorization={editingAuth}
        token={user.access_token}
      />

      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        authorization={viewingAuth}
      />

      {/* Real-time WebSocket Toasts floating at bottom-right */}
      <div className="toast-container">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            <Bell size={18} style={{ color: t.type === 'success' ? 'var(--color-success)' : t.type === 'warning' ? 'var(--color-warning)' : t.type === 'danger' ? 'var(--color-danger)' : 'var(--accent-primary)', flexShrink: 0 }} />
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              <div className="toast-message">{t.message}</div>
            </div>
            <button className="toast-close" onClick={() => setToasts(prev => prev.filter(item => item.id !== t.id))}>
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;
