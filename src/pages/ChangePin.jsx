import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { ShieldAlert, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

const ChangePin = () => {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    } else if (!user.must_change_pin && !success) {
      navigate('/dashboard');
    }
  }, [user, navigate, success]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (newPin !== confirmPin) {
      setError('Los PINs no coinciden.');
      return;
    }
    
    if (newPin.length !== 6) {
      setError('El PIN debe tener exactamente 6 dígitos.');
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
    
    if (isEasyPin(newPin)) {
      setError('Por seguridad, no se permiten PINs fáciles, secuenciales o repetitivos (ej. 123456, 111111).');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.access_token}`
        },
        body: JSON.stringify({ new_pin: newPin }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al actualizar el PIN');
      }

      setSuccess(true);
      
      // Update local user state
      const updatedUser = { ...user, must_change_pin: false };
      login(updatedUser);
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-bg-glows">
        <div className="glow-sphere sphere-1" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
      </div>

      <div className="login-card glass-panel">
        <div className="login-header">
          <ShieldAlert size={48} color="var(--accent-primary)" style={{ marginBottom: '16px' }} />
          <h1 className="login-title" style={{ fontSize: '1.5rem', fontWeight: 800 }}>Actualización Requerida</h1>
          <p className="login-subtitle">Por razones de seguridad, debe crear un nuevo PIN antes de continuar.</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}
        
        {success && (
          <div className="login-error" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
            <CheckCircle size={18} />
            <span>PIN actualizado correctamente. Redirigiendo...</span>
          </div>
        )}

        {!success && (
          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nuevo PIN (6 dígitos)</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirmar Nuevo PIN</label>
              <input
                type="password"
                className="form-input"
                placeholder="••••••"
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading}
                maxLength={6}
              />
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '10px' }} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Actualizando...</span>
                </>
              ) : (
                <span>Guardar y Continuar</span>
              )}
            </button>
          </form>
        )}
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ChangePin;