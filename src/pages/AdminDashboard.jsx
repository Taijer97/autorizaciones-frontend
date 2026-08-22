import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { DownloadContext } from '../context/DownloadContext';
import { 
  Building2, Users, ArrowLeft, Plus, Trash2, Edit2, 
  ShieldAlert, ShieldCheck, Key, FileText, CheckCircle2, 
  AlertTriangle, Loader2, X, RefreshCw, Download, Sun, Moon,
  GitCompareArrows, Search, AlertCircle, ChevronDown, ChevronRight, Ban
} from 'lucide-react';
import useTheme from '../hooks/useTheme';
import './AdminDashboard.css';


const AdminDashboard = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const { addDownload, downloads } = useContext(DownloadContext);
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useTheme();

  const isDownloadingZip = downloads.some(d => d.type === 'zip' && d.status === 'downloading');
  const isDownloadingExcel = downloads.some(d => d.type === 'excel' && d.status === 'downloading');

  const [activeTab, setActiveTab] = useState('users'); // 'users', 'sedes', 'export'
  const [sedes, setSedes] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Export states
  const [exportDocType, setExportDocType] = useState('all'); 
  const [exportStatusFilter, setExportStatusFilter] = useState('all'); 
  const [exportStateFilter, setExportStateFilter] = useState('VIGENTES');
  const [exportSedeId, setExportSedeId] = useState(''); 
  const [exportLoading, setExportLoading] = useState(false);

  // Excel specific export states
  const [excelSedeId, setExcelSedeId] = useState('');
  const [excelStateFilter, setExcelStateFilter] = useState('VIGENTES');
  
  // Reconciliation states
  const [reconSedeId, setReconSedeId] = useState('');
  const [reconJobId, setReconJobId] = useState(null);
  const [reconStatus, setReconStatus] = useState(null); // null, 'starting', 'processing', 'done', 'error'
  const [reconProgress, setReconProgress] = useState({ total: 0, progreso: 0 });
  const [reconResults, setReconResults] = useState(null);
  const [reconError, setReconError] = useState('');
  const [reconExpandedSection, setReconExpandedSection] = useState('cancelados');
  const [reconCancelling, setReconCancelling] = useState(new Set());
  const [reconImporting, setReconImporting] = useState(new Set());
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sede form state
  const [newSedeName, setNewSedeName] = useState('');
  const [newSedeTag, setNewSedeTag] = useState('');

  // User form state
  const [editingUserId, setEditingUserId] = useState(null);
  const [username, setUsername] = useState(''); // Stores DNI
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('+51 ');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [password, setPassword] = useState(''); // Stores PIN
  const [mustChangePin, setMustChangePin] = useState(false);
  const [role, setRole] = useState('user');
  const [canCreate, setCanCreate] = useState(false);
  const [canRead, setCanRead] = useState(true);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [selectedSedeIds, setSelectedSedeIds] = useState([]);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        navigate('/login');
      } else if (user.must_change_pin) {
        navigate('/change-pin');
      } else if (user.role !== 'superadmin' && user.role !== 'admin') {
        // Standard users cannot access admin panel
        navigate('/dashboard');
      }
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        setActiveTab('export');
      }
    }
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      // Fetch sedes
      const sedesRes = await fetch('/api/sedes/', {
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      const sedesData = await sedesRes.json();
      if (!sedesRes.ok) throw new Error(sedesData.detail || 'Error al cargar sedes');
      setSedes(sedesData);

      // Fetch users (only for superadmin)
      if (user.role === 'superadmin') {
        const usersRes = await fetch('/api/admin/users/', {
          headers: { 'Authorization': `Bearer ${user.access_token}` }
        });
        const usersData = await usersRes.json();
        if (!usersRes.ok) throw new Error(usersData.detail || 'Error al cargar usuarios');
        setUsers(usersData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && (user.role === 'superadmin' || user.role === 'admin')) {
      fetchData();
    }
  }, [user]);

  // Flash messages helper
  const showSuccessMessage = (msg) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(''), 4000);
  };

  const [editingSedeId, setEditingSedeId] = useState(null);

  const handleEditSedeClick = (sede) => {
    setEditingSedeId(sede.id);
    setNewSedeName(sede.name);
    setNewSedeTag(sede.tag || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelSedeEdit = () => {
    setEditingSedeId(null);
    setNewSedeName('');
    setNewSedeTag('');
    setError('');
  };

  // --- Sede Handlers ---
  const handleSaveSede = async (e) => {
    e.preventDefault();
    if (!newSedeName.trim()) return;

    setError('');
    setLoading(true);
    try {
      const url = editingSedeId ? `/api/sedes/${editingSedeId}` : '/api/sedes/';
      const method = editingSedeId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ name: newSedeName.trim(), tag: newSedeTag.trim() || null })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar la sede');

      showSuccessMessage(editingSedeId ? `Sede "${data.name}" actualizada con éxito.` : `Sede "${data.name}" creada con éxito.`);
      handleCancelSedeEdit();
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSede = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar la sede "${name}"? Se bloquearán los registros asociados.`)) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/sedes/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Error al eliminar la sede');
      }

      showSuccessMessage(`Sede eliminada con éxito.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- User Handlers ---
  const handleSedeCheckboxChange = (sedeId) => {
    if (selectedSedeIds.includes(sedeId)) {
      setSelectedSedeIds(prev => prev.filter(id => id !== sedeId));
    } else {
      setSelectedSedeIds(prev => [...prev, sedeId]);
    }
  };

  const clearUserForm = () => {
    setEditingUserId(null);
    setUsername('');
    setContactNumber('+51 ');
    setIsAuthorized(true);
    setFullName('');
    setPassword('');
    setRole('user');
    setCanCreate(false);
    setCanRead(true);
    setCanUpdate(false);
    setCanDelete(false);
    setSelectedSedeIds([]);
    setMustChangePin(false);
  };

  const handleEditUserClick = (targetUser) => {
    setEditingUserId(targetUser.id);
    setUsername(targetUser.dni || targetUser.username || '');
    setContactNumber(targetUser.contact_number || '+51 ');
    setIsAuthorized(targetUser.is_authorized);
    setFullName(targetUser.full_name);
    setPassword(''); // Leave blank unless changing PIN
    setMustChangePin(targetUser.must_change_pin || false);
    setRole(targetUser.role);
    setCanCreate(targetUser.can_create);
    setCanRead(targetUser.can_read);
    setCanUpdate(targetUser.can_update);
    setCanDelete(targetUser.can_delete);
    setSelectedSedeIds(targetUser.sedes.map(s => s.id));
  };

  const handleUserFormSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !fullName.trim()) {
      setError('Por favor complete el DNI y nombre completo.');
      return;
    }
    if (username.trim().length !== 8) {
      setError('El DNI debe tener exactamente 8 dígitos.');
      return;
    }
    if (!editingUserId && !password) {
      setError('El PIN es obligatorio para nuevos usuarios.');
      return;
    }
    const isEasyPin = (p) => {
      if (new Set(p).size === 1) return true;
      const ascending = "01234567890123456";
      if (ascending.includes(p)) return true;
      const descending = "98765432109876543210";
      if (descending.includes(p)) return true;
      if (p[0] === p[2] && p[2] === p[4] && p[1] === p[3] && p[3] === p[5]) return true;
      if (p.slice(0, 3) === p.slice(3)) return true;
      return false;
    };

    if (password && password.length !== 6) {
      setError('El PIN debe tener exactamente 6 dígitos.');
      return;
    }

    // Allow easy PINs ONLY if we are forcing the user to change it anyway
    if (password && isEasyPin(password) && !mustChangePin) {
      setError('Por seguridad, no se permiten PINs fáciles, secuenciales o repetitivos (ej. 123456, 111111, 121212).');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const url = editingUserId ? `/api/admin/users/${editingUserId}` : '/api/admin/users/';
      const method = editingUserId ? 'PUT' : 'POST';

      const payload = {
        dni: username.trim(),
        full_name: fullName.trim().toUpperCase(),
        contact_number: contactNumber.trim(),
        is_authorized: isAuthorized,
        role: role,
        can_create: role === 'admin' ? true : canCreate,
        can_read: role === 'admin' ? true : canRead,
        can_update: role === 'admin' ? true : canUpdate,
        can_delete: role === 'admin' ? true : canDelete,
        must_change_pin: mustChangePin,
        sede_ids: selectedSedeIds
      };

      if (password) {
        payload.pin = password;
      }

      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al guardar usuario');

      showSuccessMessage(editingUserId ? 'Usuario actualizado con éxito.' : 'Usuario registrado con éxito.');
      clearUserForm();
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (!window.confirm(`¿Seguro que deseas eliminar permanentemente al usuario "${name}"?`)) {
      return;
    }

    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.access_token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Error al eliminar usuario');
      }

      showSuccessMessage(`Usuario eliminado con éxito.`);
      fetchData();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="login-container">
        <Loader2 size={32} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-logo" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/logo/logo-cb.png" 
            alt="Logo CB" 
            style={{ maxHeight: '42px', objectFit: 'contain' }} 
          />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <h1 className="logo-text" style={{ fontSize: '1.2rem', lineHeight: '1.2' }}>Panel de Administración</h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--color-danger)', fontWeight: 600, textTransform: 'uppercase' }}>Control de sedes y permisos</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Theme Toggle Button */}
          <button
            className="btn btn-secondary btn-icon"
            onClick={toggleTheme}
            title={isLight ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            style={{ position: 'relative', overflow: 'hidden' }}
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

          <Link to="/dashboard" className="btn btn-secondary">
            <ArrowLeft size={16} />
            <span>Volver al Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="admin-main">
        {/* Alerts */}
        {error && (
          <div className="login-error" style={{ marginBottom: '0' }}>
            <AlertTriangle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="alert-box alert-box-success" style={{ marginTop: '0', display: 'flex', alignItems: 'center' }}>
            <CheckCircle2 size={18} />
            <span style={{ fontWeight: 600 }}>{success}</span>
          </div>
        )}

        {/* Tab switcher */}
        <div className="admin-nav-bar">
          <div className="admin-tabs">
            {user && user.role === 'superadmin' && (
              <>
                <button 
                  className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('users'); setError(''); setSuccess(''); }}
                >
                  <Users size={16} />
                  <span>Trabajadores / Usuarios</span>
                </button>
                <button 
                  className={`tab-btn ${activeTab === 'sedes' ? 'active' : ''}`}
                  onClick={() => { setActiveTab('sedes'); setError(''); setSuccess(''); }}
                >
                  <Building2 size={16} />
                  <span>Sedes del Sistema</span>
                </button>
              </>
            )}
            <button 
              className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => { setActiveTab('export'); setError(''); setSuccess(''); }}
            >
              <Download size={16} />
              <span>Exportación Masiva</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'reconciliation' ? 'active' : ''}`}
              onClick={() => { setActiveTab('reconciliation'); setError(''); setSuccess(''); }}
            >
              <GitCompareArrows size={16} />
              <span>Conciliación</span>
            </button>
          </div>

          <button className="btn btn-secondary btn-icon" onClick={fetchData} title="Refrescar catálogo">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Dynamic Panels */}
        {activeTab === 'sedes' && user && user.role === 'superadmin' && (
          /* SEDES MANAGEMENT TAB */
          <div className="admin-content-grid">
            {/* Create/Edit Sede Card */}
            <div className="glass-panel admin-card">
              <h2 className="admin-card-title">
                {editingSedeId ? <><Edit2 size={18} /> Editar Sede</> : <><Building2 size={18} /> Nueva Sede</>}
              </h2>
              <form onSubmit={handleSaveSede}>
                <div className="form-group">
                  <label className="form-label">Nombre de Sede</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. Sede Pucallpa"
                    value={newSedeName}
                    onChange={(e) => setNewSedeName(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                    disabled={loading}
                  />
                </div>
                <div className="form-group" style={{ marginTop: '10px' }}>
                  <label className="form-label">TAG / Siglas de la Sede</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. UGELAT"
                    value={newSedeTag}
                    onChange={(e) => setNewSedeTag(e.target.value.toUpperCase().replace(/\s/g, ''))}
                    style={{ textTransform: 'uppercase' }}
                    disabled={loading}
                    maxLength={15}
                  />
                </div>
                
                {editingSedeId ? (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                      <CheckCircle2 size={16} /> Guardar
                    </button>
                    <button type="button" className="btn btn-secondary" style={{ flex: 1 }} disabled={loading} onClick={handleCancelSedeEdit}>
                      <X size={16} /> Cancelar
                    </button>
                  </div>
                ) : (
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }} disabled={loading}>
                    <Plus size={16} />
                    <span>Crear Sede</span>
                  </button>
                )}
              </form>
            </div>

            {/* Sedes List Card */}
            <div className="glass-panel admin-card">
              <h2 className="admin-card-title">Sedes Registradas ({sedes.length})</h2>
              {sedes.length === 0 ? (
                <div className="no-data-card" style={{ padding: '40px' }}>
                  <Building2 size={36} style={{ color: 'var(--text-muted)' }} />
                  <p>No hay sedes registradas en el sistema.</p>
                </div>
              ) : (
                <div className="sedes-list">
                  {sedes.map((s) => (
                    <div key={s.id} className="sede-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span className="sede-name" style={{ fontWeight: '600' }}>{s.name}</span>
                        {s.tag && (
                          <span style={{ fontSize: '0.75rem', background: 'var(--accent-primary-20)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px', alignSelf: 'flex-start', marginTop: '4px', fontWeight: 'bold' }}>
                            TAG: {s.tag}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                          className="btn btn-secondary btn-icon" 
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => handleEditSedeClick(s)}
                          title="Editar Sede"
                          disabled={loading}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          className="btn btn-danger btn-icon" 
                          style={{ width: '32px', height: '32px' }}
                          onClick={() => handleDeleteSede(s.id, s.name)}
                          title="Eliminar Sede"
                          disabled={loading}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && user && user.role === 'superadmin' && (
          /* USERS MANAGEMENT TAB */
          <div className="admin-content-grid">
            {/* User Form Card */}
            <div className="glass-panel admin-card">
              <h2 className="admin-card-title">
                <Key size={18} /> {editingUserId ? 'Editar Trabajador' : 'Nuevo Trabajador'}
              </h2>
              <form onSubmit={handleUserFormSubmit}>
                <div className="form-group">
                  <label className="form-label">DNI (Log In)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. 72468153"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\D/g, '').slice(0, 8))}
                    disabled={loading || !!editingUserId}
                    maxLength={8}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Apellidos y Nombres completos</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="APELLIDOS Y NOMBRES"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }}
                    disabled={loading}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Número de Contacto</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Ej. +51 987654321"
                    value={contactNumber}
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val.startsWith('+51')) {
                        if (val.length < 4) {
                          val = '+51 ';
                        } else {
                          val = '+51 ' + val.replace(/[^\d+ -]/g, '');
                        }
                      }
                      setContactNumber(val.slice(0, 15));
                    }}
                    disabled={loading}
                    maxLength={15}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">PIN de Acceso (6 dígitos) {editingUserId && '(Dejar en blanco para no cambiar)'}</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={loading}
                    maxLength={6}
                  />
                  {password && (
                    <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input 
                        type="checkbox" 
                        id="mustChangePin" 
                        checked={mustChangePin} 
                        onChange={(e) => setMustChangePin(e.target.checked)} 
                        disabled={loading}
                      />
                      <label htmlFor="mustChangePin" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        Forzar al usuario a cambiar este PIN en su próximo inicio de sesión
                      </label>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Rol del Usuario</label>
                  <select 
                    className="form-input"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                  >
                    <option value="user">Trabajador (Permisos personalizados)</option>
                    <option value="admin">Administrador (Solo Exportación Masiva)</option>
                    <option value="superadmin">Superadministrador (Acceso total)</option>
                  </select>
                </div>

                <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '8px', marginTop: '10px', marginBottom: '15px' }}>
                  <input 
                    type="checkbox"
                    id="isAuthorized"
                    className="checkbox-input"
                    checked={isAuthorized}
                    onChange={(e) => setIsAuthorized(e.target.checked)}
                    disabled={loading}
                    style={{ width: '18px', height: '18px', cursor: 'pointer', margin: 0 }}
                  />
                  <label htmlFor="isAuthorized" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', margin: 0 }}>
                    Usuario Autorizado (Dar de alta)
                  </label>
                </div>

                {role === 'user' && (
                  <>
                    {/* CRUD permission switches */}
                    <div className="form-group">
                      <label className="form-label">Permisos de Escritura (CRUD)</label>
                      <div className="perms-switches-grid">
                        <div className="perm-switch-card">
                          <span className="perm-switch-label">Crear</span>
                          <input 
                            type="checkbox"
                            className="checkbox-input"
                            checked={canCreate}
                            onChange={(e) => setCanCreate(e.target.checked)}
                            disabled={loading}
                          />
                        </div>
                        <div className="perm-switch-card">
                          <span className="perm-switch-label">Leer</span>
                          <input 
                            type="checkbox"
                            className="checkbox-input"
                            checked={canRead}
                            onChange={(e) => setCanRead(e.target.checked)}
                            disabled={true} // Read is always True by default
                          />
                        </div>
                        <div className="perm-switch-card">
                          <span className="perm-switch-label">Editar</span>
                          <input 
                            type="checkbox"
                            className="checkbox-input"
                            checked={canUpdate}
                            onChange={(e) => setCanUpdate(e.target.checked)}
                            disabled={loading}
                          />
                        </div>
                        <div className="perm-switch-card">
                          <span className="perm-switch-label">Eliminar</span>
                          <input 
                            type="checkbox"
                            className="checkbox-input"
                            checked={canDelete}
                            onChange={(e) => setCanDelete(e.target.checked)}
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Sede assignments list */}
                    <div className="form-group">
                      <label className="form-label">Asignación de Sedes Autorizadas</label>
                      {sedes.length === 0 ? (
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)' }}>
                          Debe crear sedes antes en la pestaña "Sedes del Sistema".
                        </div>
                      ) : (
                        <div className="sedes-checkbox-grid">
                          {sedes.map((s) => (
                            <label key={s.id} className="checkbox-label">
                              <input
                                type="checkbox"
                                className="checkbox-input"
                                checked={selectedSedeIds.includes(s.id)}
                                onChange={() => handleSedeCheckboxChange(s.id)}
                                disabled={loading}
                              />
                              <span>{s.name}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  {editingUserId && (
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }} 
                      onClick={clearUserForm}
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  )}
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ flex: 2 }} 
                    disabled={loading}
                  >
                    <span>{editingUserId ? 'Actualizar' : 'Registrar'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Users List Card */}
            <div className="glass-panel admin-card" style={{ padding: 0 }}>
              <div className="table-header-row">
                <h2 className="table-title">Usuarios Registrados ({users.length})</h2>
              </div>
              <div className="table-wrapper">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>DNI</th>
                      <th>Nombre Completo</th>
                      <th>Contacto</th>
                      <th>Rol</th>
                      <th>Estado</th>
                      <th>Permisos CRUD</th>
                      <th>Sedes Asignadas</th>
                      <th style={{ textAlign: 'right' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={!u.is_authorized ? { background: 'rgba(245, 158, 11, 0.05)' } : {}}>
                        <td style={{ fontWeight: 700 }}>{u.dni || u.username}</td>
                        <td style={{ fontWeight: 500 }}>{u.full_name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{u.contact_number || '-'}</td>
                        <td>
                          <span className={`user-badge-role badge-role-${u.role}`}>
                            {u.role}
                          </span>
                        </td>
                        <td>
                          {u.is_authorized ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Autorizado</span>
                          ) : (
                            <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Pendiente</span>
                          )}
                        </td>
                        <td>
                          {u.role === 'superadmin' || u.role === 'admin' ? (
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 'bold' }}>Acceso Total</span>
                          ) : (
                            <div className="perms-inline-list">
                              <span 
                                className={`perm-inline-badge ${u.can_create ? 'perm-active' : 'perm-inactive'}`}
                                title={u.can_create ? "Crear: Habilitado" : "Crear: Deshabilitado"}
                              >
                                C
                              </span>
                              <span 
                                className={`perm-inline-badge ${u.can_read ? 'perm-active' : 'perm-inactive'}`}
                                title="Leer: Habilitado"
                              >
                                R
                              </span>
                              <span 
                                className={`perm-inline-badge ${u.can_update ? 'perm-active' : 'perm-inactive'}`}
                                title={u.can_update ? "Editar: Habilitado" : "Editar: Deshabilitado"}
                              >
                                U
                              </span>
                              <span 
                                className={`perm-inline-badge ${u.can_delete ? 'perm-active' : 'perm-inactive'}`}
                                title={u.can_delete ? "Eliminar: Habilitado" : "Eliminar: Deshabilitado"}
                              >
                                D
                              </span>
                            </div>
                          )}
                        </td>
                        <td>
                          {u.role === 'superadmin' || u.role === 'admin' ? (
                            <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Todas las Sedes</span>
                          ) : u.sedes.length === 0 ? (
                            <span className="badge badge-danger" style={{ fontSize: '0.65rem' }}>Ninguna</span>
                          ) : (
                            <div className="user-sedes-badges">
                              {u.sedes.map((s) => (
                                <span key={s.id} className="user-sede-badge-item">
                                  {s.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="actions-cell">
                            <button 
                              className="btn btn-secondary btn-icon"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => handleEditUserClick(u)}
                              title="Editar Usuario"
                              disabled={loading}
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              className="btn btn-danger btn-icon"
                              style={{ width: '32px', height: '32px' }}
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Eliminar Usuario"
                              disabled={loading || u.id === user.id} // Don't let admin delete self
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* BOX 1: ZIP EXPORT */}
            <div className="glass-panel admin-card" style={{ padding: '24px' }}>
              <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <Download size={20} style={{ color: 'var(--accent-primary)' }} /> 
                <span>Archivos y Expedientes (ZIP)</span>
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                Descarga masiva de los documentos escaneados. Organizados en carpetas por Sede y Trabajador.
              </p>

              <form onSubmit={async (e) => {
                e.preventDefault();
                setError('');
                setSuccess('');
                setExportLoading(true);
                try {
                  const params = new URLSearchParams();
                  if (exportDocType) params.append('doc_type', exportDocType);
                  if (exportStatusFilter) params.append('status_filter', exportStatusFilter);
                  if (exportStateFilter) params.append('state_filter', exportStateFilter);
                  if (exportSedeId) params.append('sede_id', exportSedeId);

                  addDownload({
                    url: `/api/authorizations/admin/export/zip?${params.toString()}`,
                    filename: `Export_CB_${new Date().toISOString().slice(0,10)}.zip`,
                    token: user.access_token,
                    type: 'zip'
                  });
                  
                  setSuccess('Descarga ZIP iniciada. Puedes ver el progreso en la esquina inferior derecha.');
                } catch (err) {
                  setError(err.message);
                } finally {
                  setExportLoading(false);
                }
              }} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div className="form-group">
                  <label className="form-label">Filtrar por Sede</label>
                  <select 
                    className="form-input"
                    value={exportSedeId}
                    onChange={(e) => setExportSedeId(e.target.value)}
                    disabled={exportLoading}
                  >
                    <option value="">Todas las Sedes</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Tipo de Documento a Extraer</label>
                  <select 
                    className="form-input"
                    value={exportDocType}
                    onChange={(e) => setExportDocType(e.target.value)}
                    disabled={exportLoading}
                  >
                    <option value="all">Todos los Documentos (Expediente completo)</option>
                    <option value="principal">1. Autorización Principal</option>
                    <option value="duplicado">2. Autorización Duplicado</option>
                    <option value="respaldo">3. Autorización Respaldo</option>
                    <option value="declaracion">4. Declaración Jurada</option>
                    <option value="copia_dni">5. Copia DNI</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado de Vigencia</label>
                  <select 
                    className="form-input"
                    value={exportStatusFilter}
                    onChange={(e) => setExportStatusFilter(e.target.value)}
                    disabled={exportLoading}
                  >
                    <option value="all">Todos los Registros</option>
                    <option value="ok">Documentos OK (No por vencer, ni vencidos)</option>
                    <option value="expired">Solo Contratos VENCIDOS</option>
                    <option value="expiring">Solo Contratos POR VENCER (1 mes)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado del Trabajador</label>
                  <select 
                    className="form-input"
                    value={exportStateFilter}
                    onChange={(e) => setExportStateFilter(e.target.value)}
                    disabled={exportLoading}
                  >
                    <option value="all">Todos</option>
                    <option value="VIGENTES">VIGENTES</option>
                    <option value="CANCELADOS">CANCELADOS</option>
                    <option value="NO TRABAJAN">NO TRABAJAN</option>
                  </select>
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', padding: '12px', marginTop: '4px', fontSize: '0.98rem', fontWeight: 600 }}
                  disabled={exportLoading || isDownloadingZip}
                >
                  {isDownloadingZip ? (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Descargando ZIP...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Descargar ZIP</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* BOX 2: EXCEL EXPORT */}
            <div className="glass-panel admin-card" style={{ padding: '24px' }}>
              <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', color: 'var(--color-success)' }}>
                <FileText size={20} /> 
                <span>Reporte de Datos (EXCEL)</span>
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: '1.5' }}>
                Descarga una hoja de cálculo con los datos de las autorizaciones. <br/>
                <span style={{ color: 'var(--color-info)' }}>* Por defecto exporta Todos los Registros sin filtrar por vigencia.</span>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Filtrar por Sede</label>
                  <select 
                    className="form-input"
                    value={excelSedeId}
                    onChange={(e) => setExcelSedeId(e.target.value)}
                    disabled={exportLoading}
                  >
                    <option value="">Todas las Sedes</option>
                    {sedes.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Estado del Trabajador</label>
                  <select 
                    className="form-input"
                    value={excelStateFilter}
                    onChange={(e) => setExcelStateFilter(e.target.value)}
                    disabled={exportLoading}
                  >
                    <option value="all">Todos</option>
                    <option value="VIGENTES">VIGENTES</option>
                    <option value="CANCELADOS">CANCELADOS</option>
                    <option value="NO TRABAJAN">NO TRABAJAN</option>
                  </select>
                </div>

                {/* Empty spacer to align buttons if needed, or just margin */}
                <div style={{ flexGrow: 1 }}></div>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ width: '100%', padding: '12px', marginTop: '4px', fontSize: '0.98rem', fontWeight: 600, background: 'var(--color-success-bg)', color: 'var(--color-success)', borderColor: 'var(--color-success-border)' }}
                  disabled={exportLoading || isDownloadingExcel}
                  onClick={async () => {
                    setError('');
                    setSuccess('');
                    setExportLoading(true);
                    try {
                      const params = new URLSearchParams();
                      
                      // Regla interna: Todos los registros por defecto
                      params.append('status_filter', 'all');
                      
                      if (excelStateFilter) params.append('state_filter', excelStateFilter);
                      if (excelSedeId) params.append('sede_id', excelSedeId);
                      
                      addDownload({
                        url: `/api/authorizations/admin/export/excel?${params.toString()}`,
                        filename: `reporte_masivo_${new Date().getTime()}.csv`,
                        token: user.access_token,
                        type: 'excel'
                      });
                      
                      setSuccess('Exportación a Excel iniciada. Puedes ver el progreso en la esquina.');
                    } catch (err) {
                      setError(err.message);
                    } finally {
                      setExportLoading(false);
                    }
                  }}
                >
                  {isDownloadingExcel ? (
                    <>
                      <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Exportando...</span>
                    </>
                  ) : (
                    <>
                      <Download size={16} />
                      <span>Descargar EXCEL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        )}

        {/* RECONCILIATION TAB */}
        {activeTab === 'reconciliation' && (
          <div className="glass-panel admin-card" style={{ maxWidth: '100%' }}>
            <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <GitCompareArrows size={20} style={{ color: 'var(--accent-primary)' }} />
              <span>Conciliación: API Externa vs Base de Datos Local</span>
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Compara los créditos activos registrados en el sistema externo (GNSIS) contra las autorizaciones almacenadas localmente. 
              Detecta automáticamente cancelaciones, datos que difieren y registros faltantes.
            </p>

            {/* Start Form */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '24px' }}>
              <div className="form-group" style={{ marginBottom: 0, flex: 1, minWidth: '200px' }}>
                <label className="form-label">Seleccionar Sede a Conciliar</label>
                <select
                  className="form-input"
                  value={reconSedeId}
                  onChange={(e) => setReconSedeId(e.target.value)}
                  disabled={reconStatus === 'starting' || reconStatus === 'processing'}
                >
                  <option value="">-- Selecciona una Sede --</option>
                  {sedes.filter(s => s.tag).map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (TAG: {s.tag})</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                style={{ padding: '10px 24px', fontWeight: 600, height: 'fit-content' }}
                disabled={!reconSedeId || reconStatus === 'starting' || reconStatus === 'processing'}
                onClick={async () => {
                  setReconError('');
                  setReconResults(null);
                  setReconStatus('starting');
                  try {
                    const res = await fetch(`/api/reconciliation/start?sede_id=${reconSedeId}`, {
                      method: 'POST',
                      headers: { 'Authorization': `Bearer ${user.access_token}` }
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.detail || 'Error al iniciar conciliación');
                    
                    setReconJobId(data.job_id);
                    setReconStatus('processing');
                    
                    // Start polling
                    const pollInterval = setInterval(async () => {
                      try {
                        const statusRes = await fetch(`/api/reconciliation/status/${data.job_id}`, {
                          headers: { 'Authorization': `Bearer ${user.access_token}` }
                        });
                        const statusData = await statusRes.json();
                        if (!statusRes.ok) throw new Error(statusData.detail || 'Error polling');
                        
                        setReconProgress({ total: statusData.total, progreso: statusData.progreso });
                        
                        if (statusData.status === 'done') {
                          clearInterval(pollInterval);
                          // Fetch results
                          const resultsRes = await fetch(`/api/reconciliation/results/${data.job_id}?sede_id=${reconSedeId}`, {
                            headers: { 'Authorization': `Bearer ${user.access_token}` }
                          });
                          const resultsData = await resultsRes.json();
                          if (!resultsRes.ok) throw new Error(resultsData.detail || 'Error obteniendo resultados');
                          
                          setReconResults(resultsData);
                          setReconStatus('done');
                        } else if (statusData.status === 'error' || statusData.error) {
                          clearInterval(pollInterval);
                          setReconError(statusData.error || 'Error en el proceso externo');
                          setReconStatus('error');
                        }
                      } catch (err) {
                        clearInterval(pollInterval);
                        setReconError(err.message);
                        setReconStatus('error');
                      }
                    }, 3000);
                  } catch (err) {
                    setReconError(err.message);
                    setReconStatus('error');
                  }
                }}
              >
                {reconStatus === 'starting' || reconStatus === 'processing' ? (
                  <><Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> Procesando...</>
                ) : (
                  <><Search size={16} /> Iniciar Conciliación</>
                )}
              </button>
            </div>

            {sedes.filter(s => !s.tag).length > 0 && (
              <div style={{ fontSize: '0.8rem', color: 'var(--color-warning)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <AlertTriangle size={14} />
                <span>Las sedes sin TAG no aparecen en la lista. Configura el TAG en "Sedes del Sistema" para habilitarlas.</span>
              </div>
            )}

            {/* Progress Bar */}
            {reconStatus === 'processing' && (
              <div style={{ marginBottom: '24px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  <span>Consultando API externa...</span>
                  <span style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                    {reconProgress.progreso}/{reconProgress.total || '?'}
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    width: reconProgress.total > 0 ? `${Math.round((reconProgress.progreso / reconProgress.total) * 100)}%` : '30%',
                    height: '100%',
                    background: 'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                    transition: 'width 0.3s ease-out',
                    animation: reconProgress.total === 0 ? 'pulse 1.5s ease-in-out infinite' : undefined
                  }} />
                </div>
              </div>
            )}

            {/* Error */}
            {reconError && (
              <div className="alert-box alert-box-danger" style={{ marginBottom: '16px' }}>
                <AlertTriangle size={16} /> {reconError}
              </div>
            )}

            {/* Results */}
            {reconResults && reconStatus === 'done' && (
              <div>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#22c55e' }}>{reconResults.summary.coinciden}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>✅ Coinciden</div>
                  </div>
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f59e0b' }}>{reconResults.summary.datos_difieren}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>⚠️ Difieren</div>
                  </div>
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444' }}>{reconResults.summary.cancelados}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>🔴 Cancelados</div>
                  </div>
                  <div style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#3b82f6' }}>{reconResults.summary.falta_ingresar}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>🆕 Faltantes</div>
                  </div>
                </div>

                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  {reconResults.sede} ({reconResults.convenio}) — API: {reconResults.summary.total_api} créditos | Local: {reconResults.summary.total_local} autorizaciones vigentes
                </div>

                {/* Collapsible Sections */}
                {/* CANCELADOS */}
                {reconResults.summary.cancelados > 0 && (
                  <div style={{ marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setReconExpandedSection(reconExpandedSection === 'cancelados' ? '' : 'cancelados')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(239, 68, 68, 0.08)', border: 'none', color: '#ef4444', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {reconExpandedSection === 'cancelados' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      🔴 Posibles Cancelados ({reconResults.summary.cancelados}) — En DB local pero NO en API
                    </button>
                    {reconExpandedSection === 'cancelados' && (
                      <div style={{ padding: '12px', overflowX: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                          <thead>
                            <tr>
                              <th>DNI</th>
                              <th>Nombre (Local)</th>
                              <th>Monto</th>
                              <th>Cuotas</th>
                              <th>Mensual</th>
                              <th style={{ textAlign: 'right' }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reconResults.details.cancelados.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>{item.dni}</td>
                                <td>{item.nombre_db}</td>
                                <td>S/ {parseFloat(item.monto_db).toFixed(2)}</td>
                                <td>{item.cuotas_db}</td>
                                <td>S/ {parseFloat(item.cuota_mensual_db).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    className="btn btn-danger"
                                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    disabled={reconCancelling.has(item.auth_id)}
                                    onClick={async () => {
                                      if (!window.confirm(`¿Marcar como CANCELADO a ${item.nombre_db} (${item.dni})?`)) return;
                                      setReconCancelling(prev => new Set([...prev, item.auth_id]));
                                      try {
                                        const res = await fetch('/api/reconciliation/bulk-cancel', {
                                          method: 'PUT',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${user.access_token}`
                                          },
                                          body: JSON.stringify({ auth_ids: [item.auth_id] })
                                        });
                                        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
                                        // Remove from list
                                        setReconResults(prev => ({
                                          ...prev,
                                          summary: { ...prev.summary, cancelados: prev.summary.cancelados - 1 },
                                          details: {
                                            ...prev.details,
                                            cancelados: prev.details.cancelados.filter(c => c.auth_id !== item.auth_id)
                                          }
                                        }));
                                        showSuccessMessage(`${item.nombre_db} marcado como CANCELADO.`);
                                      } catch (err) {
                                        setReconError(err.message);
                                      } finally {
                                        setReconCancelling(prev => { const n = new Set(prev); n.delete(item.auth_id); return n; });
                                      }
                                    }}
                                  >
                                    {reconCancelling.has(item.auth_id) ? <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Ban size={12} />}
                                    {' '}Cancelar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {reconResults.details.cancelados.length > 1 && (
                          <div style={{ marginTop: '12px', textAlign: 'right' }}>
                            <button
                              className="btn btn-danger"
                              style={{ fontSize: '0.8rem' }}
                              onClick={async () => {
                                const ids = reconResults.details.cancelados.map(c => c.auth_id);
                                if (!window.confirm(`¿Marcar ${ids.length} autorización(es) como CANCELADOS?`)) return;
                                setReconCancelling(new Set(ids));
                                try {
                                  const res = await fetch('/api/reconciliation/bulk-cancel', {
                                    method: 'PUT',
                                    headers: {
                                      'Content-Type': 'application/json',
                                      'Authorization': `Bearer ${user.access_token}`
                                    },
                                    body: JSON.stringify({ auth_ids: ids })
                                  });
                                  if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
                                  setReconResults(prev => ({
                                    ...prev,
                                    summary: { ...prev.summary, cancelados: 0 },
                                    details: { ...prev.details, cancelados: [] }
                                  }));
                                  showSuccessMessage(`${ids.length} autorización(es) marcada(s) como CANCELADOS.`);
                                } catch (err) {
                                  setReconError(err.message);
                                } finally {
                                  setReconCancelling(new Set());
                                }
                              }}
                            >
                              <Ban size={14} /> Cancelar Todos ({reconResults.details.cancelados.length})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* DATOS DIFIEREN */}
                {reconResults.summary.datos_difieren > 0 && (
                  <div style={{ marginBottom: '16px', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setReconExpandedSection(reconExpandedSection === 'difieren' ? '' : 'difieren')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(245, 158, 11, 0.08)', border: 'none', color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {reconExpandedSection === 'difieren' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      ⚠️ Datos que Difieren ({reconResults.summary.datos_difieren}) — Existen en ambos pero no coinciden
                    </button>
                    {reconExpandedSection === 'difieren' && (
                      <div style={{ padding: '12px', overflowX: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                          <thead>
                            <tr>
                              <th>DNI</th>
                              <th>Nombre</th>
                              <th>Cód. Mod (API/Local)</th>
                              <th>F. Emisión (API/Local)</th>
                              <th>Cuotas (API/Local)</th>
                              <th>Mensual (API/Local)</th>
                              <th>Diferencias</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reconResults.details.datos_difieren.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>{item.dni}</td>
                                <td>{item.nombre_api}</td>
                                <td style={{ color: item.diferencias?.includes('codigo_modular') ? '#f59e0b' : undefined, fontWeight: item.diferencias?.includes('codigo_modular') ? 700 : undefined }}>
                                  {item.cod_mod_api || '-'} / {item.cod_mod_db || '-'}
                                </td>
                                <td style={{ color: item.diferencias?.includes('fecha_emision') ? '#f59e0b' : undefined, fontWeight: item.diferencias?.includes('fecha_emision') ? 700 : undefined }}>
                                  {item.fecha_api || '-'} / {item.fecha_db || '-'}
                                </td>
                                <td style={{ color: item.diferencias?.includes('numero_cuotas') ? '#f59e0b' : undefined, fontWeight: item.diferencias?.includes('numero_cuotas') ? 700 : undefined }}>
                                  {item.cuotas_api} / {item.cuotas_db}
                                </td>
                                <td style={{ color: item.diferencias?.includes('cuota_mensual') ? '#f59e0b' : undefined, fontWeight: item.diferencias?.includes('cuota_mensual') ? 700 : undefined }}>
                                  S/ {parseFloat(item.cuota_mensual_api).toFixed(2)} / S/ {parseFloat(item.cuota_mensual_db).toFixed(2)}
                                </td>
                                <td>
                                  {(item.diferencias || []).map(d => (
                                    <span key={d} style={{ display: 'inline-block', fontSize: '0.7rem', background: 'rgba(245,158,11,0.2)', color: '#f59e0b', padding: '1px 6px', borderRadius: '4px', marginRight: '4px', fontWeight: 600 }}>{d}</span>
                                  ))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* FALTA INGRESAR */}
                {reconResults.summary.falta_ingresar > 0 && (
                  <div style={{ marginBottom: '16px', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setReconExpandedSection(reconExpandedSection === 'faltantes' ? '' : 'faltantes')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(59, 130, 246, 0.08)', border: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {reconExpandedSection === 'faltantes' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      🆕 Faltan Ingresar ({reconResults.summary.falta_ingresar}) — En API pero NO en DB local
                    </button>
                    {reconExpandedSection === 'faltantes' && (
                      <div style={{ padding: '12px', overflowX: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                          <thead>
                            <tr>
                              <th>DNI</th>
                              <th>Nombre (API)</th>
                              <th>Cód. Modular</th>
                              <th>F. Emisión</th>
                              <th>Monto Total</th>
                              <th>Cuotas</th>
                              <th>Cuota Mensual</th>
                              <th>Deuda</th>
                              <th style={{ textAlign: 'right' }}>Acción</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reconResults.details.falta_ingresar.map((item, idx) => (
                              <tr key={idx}>
                                <td style={{ fontWeight: 700 }}>{item.dni}</td>
                                <td>{item.nombre_api}</td>
                                <td>{item.codigo_modular_api || '-'}</td>
                                <td>{item.fecha_emision_api || '-'}</td>
                                <td>S/ {parseFloat(item.monto_api).toFixed(2)}</td>
                                <td>{item.cuotas_api}</td>
                                <td>S/ {parseFloat(item.cuota_mensual_api).toFixed(2)}</td>
                                <td style={{ fontWeight: 600, color: '#ef4444' }}>S/ {parseFloat(item.deuda_total).toFixed(2)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  <button
                                    className="btn btn-primary"
                                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                                    disabled={reconImporting.has(item.id_credito)}
                                    onClick={async () => {
                                      if (!window.confirm(`¿Agregar crédito de ${item.nombre_api} (${item.dni}) a la base de datos local?`)) return;
                                      setReconImporting(prev => new Set([...prev, item.id_credito]));
                                      try {
                                        const res = await fetch('/api/reconciliation/import-missing', {
                                          method: 'POST',
                                          headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${user.access_token}`
                                          },
                                          body: JSON.stringify({
                                            sede_id: reconSedeId,
                                            dni: item.dni,
                                            cliente: item.nombre_api,
                                            codigo_modular: item.codigo_modular_api,
                                            fecha_emision: item.fecha_emision_api,
                                            cuota_mensual: item.cuota_mensual_api,
                                            numero_cuotas: item.cuotas_api
                                          })
                                        });
                                        if (!res.ok) { const d = await res.json(); throw new Error(d.detail || 'Error'); }
                                        
                                        // Remove from faltantes list
                                        setReconResults(prev => ({
                                          ...prev,
                                          summary: { ...prev.summary, falta_ingresar: prev.summary.falta_ingresar - 1 },
                                          details: {
                                            ...prev.details,
                                            falta_ingresar: prev.details.falta_ingresar.filter(f => f.id_credito !== item.id_credito)
                                          }
                                        }));
                                        showSuccessMessage(`${item.nombre_api} importado con éxito.`);
                                      } catch (err) {
                                        setReconError(err.message);
                                      } finally {
                                        setReconImporting(prev => { const n = new Set(prev); n.delete(item.id_credito); return n; });
                                      }
                                    }}
                                  >
                                    {reconImporting.has(item.id_credito) ? <Loader2 size={12} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={12} />}
                                    {' '}Agregar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {reconResults.details.falta_ingresar.length > 1 && (
                          <div style={{ marginTop: '12px', textAlign: 'right' }}>
                            <button
                              className="btn btn-primary"
                              style={{ fontSize: '0.8rem' }}
                              onClick={async () => {
                                if (!window.confirm(`¿Agregar ${reconResults.details.falta_ingresar.length} créditos a la base de datos local?`)) return;
                                
                                const allIds = reconResults.details.falta_ingresar.map(f => f.id_credito);
                                setReconImporting(new Set(allIds));
                                
                                let imported = 0;
                                let errors = 0;
                                
                                for (const item of reconResults.details.falta_ingresar) {
                                  try {
                                    const res = await fetch('/api/reconciliation/import-missing', {
                                      method: 'POST',
                                      headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${user.access_token}`
                                      },
                                      body: JSON.stringify({
                                        sede_id: reconSedeId,
                                        dni: item.dni,
                                        cliente: item.nombre_api,
                                        codigo_modular: item.codigo_modular_api,
                                        fecha_emision: item.fecha_emision_api,
                                        cuota_mensual: item.cuota_mensual_api,
                                        numero_cuotas: item.cuotas_api
                                      })
                                    });
                                    if (res.ok) imported++;
                                    else errors++;
                                  } catch (e) {
                                    errors++;
                                  }
                                }
                                
                                setReconResults(prev => ({
                                  ...prev,
                                  summary: { ...prev.summary, falta_ingresar: errors > 0 ? errors : 0 },
                                  details: { 
                                    ...prev.details, 
                                    falta_ingresar: errors > 0 ? prev.details.falta_ingresar : [] 
                                  }
                                }));
                                
                                setReconImporting(new Set());
                                
                                if (errors === 0) {
                                  showSuccessMessage(`${imported} créditos importados con éxito.`);
                                } else {
                                  setReconError(`Se importaron ${imported} créditos, pero fallaron ${errors}. Reintente la conciliación.`);
                                }
                              }}
                            >
                              <Plus size={14} /> Agregar Todos ({reconResults.details.falta_ingresar.length})
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* COINCIDEN */}
                {reconResults.summary.coinciden > 0 && (
                  <div style={{ marginBottom: '16px', border: '1px solid rgba(34, 197, 94, 0.3)', borderRadius: '10px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      onClick={() => setReconExpandedSection(reconExpandedSection === 'coinciden' ? '' : 'coinciden')}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'rgba(34, 197, 94, 0.08)', border: 'none', color: '#22c55e', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left' }}
                    >
                      {reconExpandedSection === 'coinciden' ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      ✅ Coinciden ({reconResults.summary.coinciden}) — Todo correcto
                    </button>
                    {reconExpandedSection === 'coinciden' && (
                      <div style={{ padding: '12px', overflowX: 'auto' }}>
                        <table className="custom-table" style={{ fontSize: '0.82rem' }}>
                          <thead>
                            <tr>
                              <th>DNI</th>
                              <th>Nombre</th>
                              <th>Cód. Modular</th>
                              <th>F. Emisión</th>
                              <th>Cuotas</th>
                              <th>Mensual</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reconResults.details.coinciden.map((item, idx) => (
                              <tr key={idx} className="tr-success">
                                <td style={{ fontWeight: 700 }}>{item.dni}</td>
                                <td>{item.nombre_api}</td>
                                <td>{item.cod_mod_api || '-'}</td>
                                <td>{item.fecha_api || '-'}</td>
                                <td>{item.cuotas_api}</td>
                                <td>S/ {parseFloat(item.cuota_mensual_api).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
