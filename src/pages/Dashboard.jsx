import React, { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import AuthorizationForm from '../components/AuthorizationForm';
import DocumentViewer from '../components/DocumentViewer';
import { 
  LogOut, Plus, Search, FileText, AlertCircle, Filter, 
  Shield, ShieldAlert, FileCheck, CheckCircle2, Clock, Calendar, Trash2, Edit, 
  Eye, RefreshCw, X, AlertTriangle, Building2, Bell, Loader2, Sun, Moon
} from 'lucide-react';
import useTheme from '../hooks/useTheme';
import './Dashboard.css';


const Dashboard = () => {
  const { user, logout, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useTheme();

  const [authorizations, setAuthorizations] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [searchDni, setSearchDni] = useState('');
  const [selectedSede, setSelectedSede] = useState(''); // Stores Sede ID
  const [selectedStatus, setSelectedStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tableTab, setTableTab] = useState('all'); // 'all', 'expired', 'expiring'
  const [observationAlerts, setObservationAlerts] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);

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

  // --- Cache helpers (stale-while-revalidate) ---
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const getCacheKey = (base, params = {}) => {
    const sorted = Object.entries(params).filter(([, v]) => v).sort().map(([k, v]) => `${k}=${v}`).join('&');
    return `cache_${base}${sorted ? '_' + sorted : ''}`;
  };

  const getCache = (key) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts > CACHE_TTL) {
        sessionStorage.removeItem(key);
        return null;
      }
      return data;
    } catch { return null; }
  };

  const setCache = (key, data) => {
    try {
      sessionStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
    } catch { /* quota exceeded, ignore */ }
  };

  const invalidateCache = (prefix) => {
    try {
      const keys = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach(k => sessionStorage.removeItem(k));
    } catch {}
  };

  // Fetch sedes (with cache)
  const fetchSedes = async () => {
    if (!user) return;
    const cacheKey = getCacheKey('sedes');
    const cached = getCache(cacheKey);
    if (cached) setSedes(cached);

    try {
      const response = await fetch('/api/sedes/', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (!response.ok) throw new Error('Error al obtener sedes');
      const data = await response.json();
      setSedes(data);
      setCache(cacheKey, data);
    } catch (err) {
      console.error('Error al obtener sedes:', err);
    }
  };

  // Helper to sort authorizations alphabetically by Apellidos y Nombres
  const sortData = (list) => {
    if (!list) return [];
    return [...list].sort((a, b) => {
      const nameA = (`${a.apellido_pn || ''} ${a.apellido_mn || ''} ${a.nombres || ''}`).trim().toUpperCase();
      const nameB = (`${b.apellido_pn || ''} ${b.apellido_mn || ''} ${b.nombres || ''}`).trim().toUpperCase();
      return nameA.localeCompare(nameB, 'es', { sensitivity: 'base' });
    });
  };

  // Fetch authorizations (with cache)
  const fetchAuthorizations = async (skipCache = false) => {
    if (!user) return;

    const params = { dni: searchDni, sede_id: selectedSede, doc_status: selectedStatus };
    const cacheKey = getCacheKey('auths', params);

    // Show cached data instantly (no loading spinner)
    const cached = !skipCache ? getCache(cacheKey) : null;
    if (cached) {
      const sortedCached = sortData(cached);
      setAuthorizations(sortedCached);
      if (searchDni) {
        const obs = sortedCached.filter(auth => auth.observaciones && auth.observaciones.trim() !== '');
        setObservationAlerts(obs.length > 0 ? obs : []);
      } else {
        setObservationAlerts([]);
      }
    }

    // Only show spinner if no cached data available
    if (!cached) setLoading(true);
    setError('');

    try {
      const queryParams = new URLSearchParams();
      if (searchDni) queryParams.append('dni', searchDni);
      if (selectedSede) queryParams.append('sede_id', selectedSede);
      if (selectedStatus) queryParams.append('doc_status', selectedStatus);

      const response = await fetch(`/api/authorizations/?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${user.access_token}`
        }
      });
      if (!response.ok) {
        let errMsg = 'Error al obtener autorizaciones';
        try {
          const errData = await response.json();
          errMsg = errData.detail || errMsg;
        } catch (_) {}
        throw new Error(errMsg);
      }
      const data = await response.json();
      const sortedData = sortData(data);
      setAuthorizations(sortedData);
      setCache(cacheKey, sortedData);
      if (searchDni) {
        const obs = sortedData.filter(auth => auth.observaciones && auth.observaciones.trim() !== '');
        setObservationAlerts(obs.length > 0 ? obs : []);
      } else {
        setObservationAlerts([]);
      }
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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSede, selectedStatus, searchDni, tableTab]);

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
    const wsUrl = `${wsProtocol}//${window.location.host}/ws-api`;

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

        // Auto-refresh the list (invalidate cache first)
        invalidateCache('cache_auths');
        fetchAuthorizations(true);
      } catch (err) {
        console.error('Error al procesar mensaje de WebSocket:', err);
      }
    };

    socket.onerror = (error) => {
      console.error('Error en WebSocket:', error);
    };

    socket.onclose = (event) => {
      console.log('Conexión WebSocket cerrada. Reintentando en 3 segundos...');
      setTimeout(() => {
        setWsTrigger(prev => prev + 1);
      }, 3002);
    };

    return () => {
      socket.onclose = null;
      socket.close();
    };
  }, [user?.access_token, wsTrigger]);

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
      invalidateCache('cache_auths');
      fetchAuthorizations(true);
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

  const filteredAuths = getFilteredTableAuths();
  const totalPages = Math.ceil(filteredAuths.length / 25);
  const startIndex = (currentPage - 1) * 25;
  const paginatedAuths = filteredAuths.slice(startIndex, startIndex + 25);

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
                <Shield size={10} /> {user.role === 'superadmin' ? 'Superadmin' : user.role === 'admin' ? 'Administrador' : 'Trabajador'}
              </span>
            </div>
          </div>

          {(user.role === 'superadmin' || user.role === 'admin') && (
            <Link to="/admin" className="btn btn-secondary" style={{ marginRight: '8px' }} title="Panel de Administración">
              <ShieldAlert size={16} style={{ color: 'var(--color-danger)' }} />
              <span className="hide-mobile">Panel Admin</span>
            </Link>
          )}

          {/* Theme Toggle Button */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={toggleTheme}
            title={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            style={{ marginRight: '8px', position: 'relative', overflow: 'hidden' }}
          >
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.4s ease, opacity 0.3s ease',
              transform: isLight ? 'rotate(0deg) scale(1)' : 'rotate(-30deg) scale(0.8)',
              opacity: isLight ? 1 : 0,
              position: isLight ? 'relative' : 'absolute'
            }}>
              <Sun size={16} style={{ color: '#f59e0b' }} />
            </span>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'transform 0.4s ease, opacity 0.3s ease',
              transform: isLight ? 'rotate(30deg) scale(0.8)' : 'rotate(0deg) scale(1)',
              opacity: isLight ? 0 : 1,
              position: isLight ? 'absolute' : 'relative'
            }}>
              <Moon size={16} style={{ color: '#a78bfa' }} />
            </span>
          </button>

          <button className="btn btn-secondary" onClick={logout} title="Cerrar sesión">
            <LogOut size={16} />
            <span className="hide-mobile">Salir</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="dashboard-main">
        
        {/* Statistics — barra horizontal compacta */}
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center',
          background: 'var(--bg-glass)', border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-sm)', padding: '8px 16px',
          backdropFilter: 'var(--glass-blur)', WebkitBackdropFilter: 'var(--glass-blur)'
        }}>
          {[
            { icon: <FileText size={12} />,     value: totalRecords,      label: 'Total',           color: 'var(--color-info)' },
            { icon: <CheckCircle2 size={12} />, value: completeRecords,   label: 'Completos',       color: 'var(--color-success)' },
            { icon: <AlertTriangle size={12} />,value: missingOthers,     label: 'Incompletos',     color: 'var(--color-warning)' },
            { icon: <AlertCircle size={12} />,  value: missingPrincipal,  label: 'Sin Principal',   color: 'var(--color-danger)' },
            { icon: <Clock size={12} />,        value: expiredCount,      label: 'Vencidas',        color: 'var(--color-danger)' },
            { icon: <Calendar size={12} />,     value: expiringCount,     label: 'Por Vencer',      color: 'var(--color-warning)' },
          ].map((stat, i) => (
            <React.Fragment key={stat.label}>
              {i > 0 && <span style={{ color: 'var(--border-color)', fontSize: '1rem', userSelect: 'none', margin: '0 2px' }}>|</span>}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '2px 6px' }}>
                <span style={{ color: stat.color, display: 'flex', alignItems: 'center' }}>{stat.icon}</span>
                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text-primary)' }}>{stat.value}</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{stat.label}</span>
              </div>
            </React.Fragment>
          ))}
        </div>

        {/* Search & Filters */}
        <section className="glass-panel filters-panel">
          <form className="search-input-wrapper" onSubmit={handleSearchSubmit}>
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="form-input search-input"
              placeholder="Buscar por DNI, Apellidos o Nombres..."
              value={searchDni}
              onChange={(e) => setSearchDni(e.target.value)}
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
          <div className="table-header-row" style={{ flexWrap: 'wrap', gap: '10px' }}>
            {/* Izquierda: título + tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap', flex: 1, minWidth: 0 }}>
              <h2 className="table-title" style={{ margin: 0, whiteSpace: 'nowrap' }}>Autorizaciones CB</h2>
              
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

            {/* Derecha: paginación compacta + botón Agregar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
              {/* Paginación inline */}
              {totalPages > 1 && (() => {
                const getPageRange = () => {
                  const delta = 1;
                  const range = [];
                  const rangeWithDots = [];
                  let l;
                  for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
                      range.push(i);
                    }
                  }
                  for (let i of range) {
                    if (l) {
                      if (i - l === 2) rangeWithDots.push(l + 1);
                      else if (i - l > 2) rangeWithDots.push('...');
                    }
                    rangeWithDots.push(i);
                    l = i;
                  }
                  return rangeWithDots;
                };

                const btnBase = {
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  minWidth: '30px', height: '30px', padding: '0 7px',
                  borderRadius: '6px', fontSize: '0.78rem', fontWeight: 600,
                  cursor: 'pointer', transition: 'all 0.15s ease', border: 'none',
                  userSelect: 'none',
                };
                const btnActive   = { ...btnBase, background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))', color: '#fff', boxShadow: '0 2px 8px var(--accent-glow)' };
                const btnNormal   = { ...btnBase, background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' };
                const btnNav      = { ...btnNormal, padding: '0 10px' };
                const btnDisabled = { ...btnNav, opacity: 0.3, cursor: 'not-allowed' };

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    {/* Info compacta */}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginRight: '4px', whiteSpace: 'nowrap' }}>
                      {startIndex + 1}–{Math.min(startIndex + 25, filteredAuths.length)} / <b style={{ color: 'var(--accent-primary)' }}>{filteredAuths.length}</b>
                    </span>

                    <button type="button" style={currentPage === 1 ? btnDisabled : btnNav} onClick={() => setCurrentPage(1)} disabled={currentPage === 1} title="Primera">«</button>
                    <button type="button" style={currentPage === 1 ? btnDisabled : btnNav} onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} title="Anterior">‹</button>

                    {getPageRange().map((page, idx) =>
                      page === '...'
                        ? <span key={`d-${idx}`} style={{ ...btnBase, background: 'transparent', color: 'var(--text-muted)', cursor: 'default', border: 'none', minWidth: '20px' }}>·</span>
                        : <button key={page} type="button" style={currentPage === page ? btnActive : btnNormal} onClick={() => setCurrentPage(page)}>{page}</button>
                    )}

                    <button type="button" style={currentPage === totalPages ? btnDisabled : btnNav} onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} title="Siguiente">›</button>
                    <button type="button" style={currentPage === totalPages ? btnDisabled : btnNav} onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} title="Última">»</button>
                  </div>
                );
              })()}

              {canCreateAuth && (
                <button className="btn btn-primary" onClick={openCreateModal}>
                  <Plus size={16} />
                  <span>Agregar Autorización</span>
                </button>
              )}
            </div>
          </div>

          <div className="table-wrapper">
            {filteredAuths.length === 0 && !loading ? (
              <div className="no-data-card">
                <FileText size={48} style={{ color: 'var(--text-muted)' }} />
                <h3>No se encontraron registros</h3>
                <p>No hay autorizaciones registradas en la pestaña "{tableTab === 'expired' ? 'Vencidos' : tableTab === 'expiring' ? 'Por Vencer' : 'Todos'}" con los filtros activos.</p>
              </div>
            ) : (
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>DNI / Cód. Mod.</th>
                    <th>Apellidos y Nombres</th>
                    <th>Sede</th>
                    <th>F. Emisión</th>
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
                  {loading ? (
                    Array.from({ length: 5 }).map((_, idx) => (
                      <tr key={idx}>
                        <td>
                          <div className="skeleton-element" style={{ width: '80px', height: '16px', marginBottom: '6px' }}></div>
                          <div className="skeleton-element" style={{ width: '60px', height: '12px' }}></div>
                        </td>
                        <td>
                          <div className="skeleton-element" style={{ width: '180px', height: '16px', marginBottom: '6px' }}></div>
                          <div className="skeleton-element" style={{ width: '120px', height: '12px' }}></div>
                        </td>
                        <td><div className="skeleton-element" style={{ width: '90px', height: '16px' }}></div></td>
                        <td><div className="skeleton-element" style={{ width: '80px', height: '16px' }}></div></td>
                        <td><div className="skeleton-element" style={{ width: '60px', height: '16px' }}></div></td>
                        <td><div className="skeleton-element" style={{ width: '70px', height: '16px' }}></div></td>
                        <td><div className="skeleton-element" style={{ width: '70px', height: '16px' }}></div></td>
                        <td><div className="skeleton-element" style={{ width: '80px', height: '16px' }}></div></td>
                        <td><div className="skeleton-element" style={{ width: '95px', height: '16px' }}></div></td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {Array.from({ length: 6 }).map((_, sIdx) => (
                              <div key={sIdx} className="skeleton-element" style={{ width: '8px', height: '8px', borderRadius: '50%' }}></div>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                            <div className="skeleton-element" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                            <div className="skeleton-element" style={{ width: '32px', height: '32px', borderRadius: '50%' }}></div>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    paginatedAuths.map((auth) => {
                      const hasP = !!auth.autorizacion_principal;
                      const hasD = !!auth.autorizacion_duplicado;
                      const hasR = !!auth.autorizacion_respaldo;
                      const hasDec = !!auth.declaracion_jurada;
                      const hasDni = !!auth.copia_dni;
                      const hasEvidencias = !!auth.evidencias;
                      
                      return (
                        <tr key={auth.id} className={getRowClass(auth)}>
                          <td style={{ fontWeight: 700 }}>
                            <div>{auth.dni}</div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)', marginTop: '2px' }}>
                              CM: {auth.cod_modular || '-'}
                            </div>
                          </td>
                          <td style={{ fontWeight: 500 }}>
                            <div>{`${auth.apellido_pn} ${auth.apellido_mn} ${auth.nombres}`}</div>
                            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span className={`badge ${auth.estado === 'CANCELADOS' ? 'badge-danger' : auth.estado === 'NO TRABAJAN' ? 'badge-warning' : 'badge-success'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                {auth.estado || 'VIGENTES'}
                              </span>
                              {auth.observaciones && (
                                <div style={{ fontSize: '0.75rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: 600 }}>
                                  <AlertTriangle size={12} />
                                  <span>Obs: {auth.observaciones}</span>
                                </div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Building2 size={12} style={{ color: 'var(--text-secondary)' }} />
                              {auth.sede}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.85rem' }}>{auth.fecha_emision ? new Date(auth.fecha_emision).toLocaleDateString('es-PE') : '-'}</td>
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
                                return <span style={{ fontSize: '0.65rem', color: 'var(--color-danger)', background: 'var(--color-danger-bg)', border: '1px solid var(--color-danger-border)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>VENCIDA</span>;
                              } else if (diffMonths <= 1) {
                                return <span style={{ fontSize: '0.65rem', color: 'var(--color-warning)', background: 'var(--color-warning-bg)', border: '1px solid var(--color-warning-border)', padding: '2px 6px', borderRadius: '4px', display: 'inline-block', marginTop: '4px', fontWeight: 'bold' }}>1 MES A VENCER</span>;
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
                              <span 
                                className="file-dot-item" 
                                style={{ background: hasEvidencias ? 'var(--color-success)' : 'var(--color-warning)' }}
                                data-tooltip={hasEvidencias ? "6. Evidencias: OK" : "6. Evidencias: FALTANTE"}
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
                    })
                  )}
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
        onSave={() => { invalidateCache('cache_auths'); fetchAuthorizations(true); }}
        authorization={editingAuth}
        token={user.access_token}
      />

      <DocumentViewer
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        authorization={viewingAuth}
        token={user.access_token}
      />

      {observationAlerts.length > 0 && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content glass-panel" style={{ maxWidth: '500px', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid rgba(245, 158, 11, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24' }}>
                <AlertTriangle size={24} />
                <h2 className="modal-title" style={{ fontSize: '1.25rem', color: '#fbbf24', margin: 0 }}>Alerta de Observación</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setObservationAlerts([])}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Se encontraron observaciones pendientes para el DNI consultado:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                {observationAlerts.map(auth => (
                  <div key={auth.id} className="glass-panel" style={{ padding: '14px', background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)', borderRadius: '8px', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                        Sede: {auth.sede} | {`${auth.apellido_pn} ${auth.apellido_mn} ${auth.nombres}`}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#fef08a', padding: '8px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', borderLeft: '3px solid #fbbf24', fontStyle: 'italic', marginBottom: '12px' }}>
                      "{auth.observaciones}"
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ background: 'var(--color-success)', borderColor: 'var(--color-success)', color: '#fff', fontSize: '0.8rem', padding: '6px 12px', gap: '4px' }}
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/authorizations/${auth.id}/clear-observation`, {
                              method: 'POST',
                              headers: { 'Authorization': `Bearer ${user.access_token}` }
                            });
                            if (!res.ok) {
                              const errData = await res.json();
                              throw new Error(errData.detail || 'Error al completar la observación');
                            }
                            // Remove from local list
                            setObservationAlerts(prev => prev.filter(item => item.id !== auth.id));
                            // Refresh list
                            invalidateCache('cache_auths');
                            fetchAuthorizations(true);
                          } catch (err) {
                            alert(err.message);
                          }
                        }}
                      >
                        <CheckCircle2 size={14} />
                        Observación Completada
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="form-actions" style={{ marginTop: 0, paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
              <button className="btn btn-secondary" onClick={() => setObservationAlerts([])}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Skeleton and custom styles */}
      <style>{`
        @keyframes skeleton-shimmer {
          0% {
            background-color: rgba(255, 255, 255, 0.03);
          }
          50% {
            background-color: rgba(255, 255, 255, 0.09);
          }
          100% {
            background-color: rgba(255, 255, 255, 0.03);
          }
        }
        .skeleton-element {
          animation: skeleton-shimmer 1.5s infinite ease-in-out;
          background-color: rgba(255, 255, 255, 0.03);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
};

export default Dashboard;
