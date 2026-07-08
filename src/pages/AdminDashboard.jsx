import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { 
  Building2, Users, ArrowLeft, Plus, Trash2, Edit2, 
  ShieldAlert, ShieldCheck, Key, FileText, CheckCircle2, 
  AlertTriangle, Loader2, X, RefreshCw, Download
} from 'lucide-react';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const { user, loading: authLoading } = useContext(AuthContext);
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('users'); // 'users', 'sedes', 'export'
  const [sedes, setSedes] = useState([]);
  const [users, setUsers] = useState([]);
  
  // Export states
  const [exportDocType, setExportDocType] = useState('all'); 
  const [exportStatusFilter, setExportStatusFilter] = useState('all'); 
  const [exportSedeId, setExportSedeId] = useState(''); 
  const [exportLoading, setExportLoading] = useState(false);
  
  // Loading & error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Sede form state
  const [newSedeName, setNewSedeName] = useState('');

  // User form state
  const [editingUserId, setEditingUserId] = useState(null);
  const [username, setUsername] = useState(''); // Stores DNI
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('+51 ');
  const [isAuthorized, setIsAuthorized] = useState(true);
  const [password, setPassword] = useState(''); // Stores PIN
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

  // --- Sede Handlers ---
  const handleCreateSede = async (e) => {
    e.preventDefault();
    if (!newSedeName.trim()) return;

    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/sedes/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ name: newSedeName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Error al crear la sede');

      showSuccessMessage(`Sede "${data.name}" creada con éxito.`);
      setNewSedeName('');
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
  };

  const handleEditUserClick = (targetUser) => {
    setEditingUserId(targetUser.id);
    setUsername(targetUser.dni || targetUser.username || '');
    setContactNumber(targetUser.contact_number || '+51 ');
    setIsAuthorized(targetUser.is_authorized);
    setFullName(targetUser.full_name);
    setPassword(''); // Leave blank unless changing PIN
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

    if (password && isEasyPin(password)) {
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

        <div>
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
                  <span>Operadores / Usuarios</span>
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
          </div>

          <button className="btn btn-secondary btn-icon" onClick={fetchData} title="Refrescar catálogo">
            <RefreshCw size={16} />
          </button>
        </div>

        {/* Dynamic Panels */}
        {activeTab === 'sedes' && user && user.role === 'superadmin' && (
          /* SEDES MANAGEMENT TAB */
          <div className="admin-content-grid">
            {/* Create Sede Card */}
            <div className="glass-panel admin-card">
              <h2 className="admin-card-title">
                <Building2 size={18} /> Nueva Sede
              </h2>
              <form onSubmit={handleCreateSede}>
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
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '10px' }} disabled={loading}>
                  <Plus size={16} />
                  <span>Crear Sede</span>
                </button>
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
                    <div key={s.id} className="sede-item">
                      <span className="sede-name">{s.name}</span>
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
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'users' && user && user.role === 'superadmin' && (
          /* USERS MANAGEMENT TAB */
          <div className="admin-content-grid" style={{ gridTemplateColumns: '360px 1fr' }}>
            {/* User Form Card */}
            <div className="glass-panel admin-card">
              <h2 className="admin-card-title">
                <Key size={18} /> {editingUserId ? 'Editar Operador' : 'Nuevo Operador'}
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
                </div>

                <div className="form-group">
                  <label className="form-label">Rol del Usuario</label>
                  <select 
                    className="form-input"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                  >
                    <option value="user">Operador (Permisos personalizados)</option>
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
          <div className="glass-panel admin-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '30px' }}>
            <h2 className="admin-card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <Download size={20} style={{ color: 'var(--accent-primary)' }} /> 
              <span>Exportar Expedientes (Empaquetado ZIP)</span>
            </h2>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '24px', lineHeight: '1.5' }}>
              Descarga masiva de los documentos de autorización escaneados. Los archivos PDF/imagen se organizarán automáticamente dentro del archivo ZIP en carpetas por <strong>Sede</strong> y <strong>DNI / Nombre del Trabajador</strong>.
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
                if (exportSedeId) params.append('sede_id', exportSedeId);

                const response = await fetch(`/api/authorizations/admin/export/zip?${params.toString()}`, {
                  headers: { 'Authorization': `Bearer ${user.access_token}` }
                });

                if (!response.ok) {
                  const data = await response.json();
                  throw new Error(data.detail || 'Error al generar el archivo de exportación masiva.');
                }

                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                
                const contentDisposition = response.headers.get('Content-Disposition');
                let filename = `Export_CB_${new Date().toISOString().slice(0,10)}.zip`;
                if (contentDisposition) {
                  const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
                  if (filenameMatch && filenameMatch[1]) {
                    filename = filenameMatch[1];
                  }
                }

                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                a.remove();
                setSuccess('El expediente ZIP se ha generado y descargado con éxito.');
              } catch (err) {
                setError(err.message);
              } finally {
                setExportLoading(false);
              }
            }} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
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
                <label className="form-label">Estado de Vigencia / Vencimiento</label>
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

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', padding: '12px', fontSize: '0.98rem', fontWeight: 600, marginTop: '8px' }}
                disabled={exportLoading}
              >
                {exportLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Empaquetando Archivos ZIP...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Descargar Archivo ZIP</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
