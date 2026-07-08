import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { FileLock2, AlertCircle, Loader2 } from 'lucide-react';
import './Login.css';

const Login = () => {
  const [dni, setDni] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // If already logged in, redirect to dashboard
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dni || !pin) {
      setError('Por favor complete todos los campos');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ dni, pin }),
      });

      const data = await response.json();

      if (response.status === 403) {
        // Redirect to waiting approval screen
        navigate('/waiting-approval');
        return;
      }

      if (!response.ok) {
        throw new Error(data.detail || 'Error al iniciar sesión');
      }

      login(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Decorative glows */}
      <div className="login-bg-glows">
        <div className="glow-sphere sphere-1"></div>
        <div className="glow-sphere sphere-2"></div>
      </div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <img 
            src="/logo/logo-cb.png" 
            alt="Logo CB" 
            style={{ maxHeight: '80px', maxWidth: '240px', marginBottom: '16px', objectFit: 'contain' }} 
          />
          <h1 className="login-title" style={{ fontSize: '1.7rem', fontWeight: 800 }}>Autorizaciones CB</h1>
          <p className="login-subtitle">Gestión y control de documentos por sedes</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="dni">DNI</label>
            <input
              type="text"
              id="dni"
              className="form-input"
              placeholder="Ingrese su DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
              disabled={loading}
              maxLength={20}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pin">PIN de Acceso</label>
            <input
              type="password"
              id="pin"
              className="form-input"
              placeholder="••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={loading}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Iniciando sesión...</span>
              </>
            ) : (
              <span>Acceder al Sistema</span>
            )}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: '20px' }}>
          <p>
            ¿No tiene una cuenta? <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textDecoration: 'none' }}>Regístrese aquí</Link>
          </p>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.05)', margin: '15px 0' }} />
          <p>Credenciales por defecto:</p>
          <p style={{ marginTop: '4px' }}>Admin: <b>00000000 / admin123</b> • User: <b>11111111 / user123</b></p>
        </div>
      </div>
      
      {/* Keyframe injection for spinner */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
