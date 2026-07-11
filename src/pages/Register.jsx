import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { UserPlus, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import './Login.css';

const Register = () => {
  const [dni, setDni] = useState('');
  const [fullName, setFullName] = useState('');
  const [contactNumber, setContactNumber] = useState('+51 ');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showPin, setShowPin] = useState(false);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dni || !fullName || !contactNumber || !pin) {
      setError('Por favor complete todos los campos');
      return;
    }

    if (dni.length !== 8) {
      setError('El DNI debe tener exactamente 8 dígitos');
      return;
    }

    if (pin.length !== 6) {
      setError('El PIN debe tener exactamente 6 dígitos');
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

    if (isEasyPin(pin)) {
      setError('Por seguridad, no se permiten PINs fáciles, secuenciales o repetitivos (ej. 123456, 111111, 121212).');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          dni, 
          full_name: fullName.toUpperCase(), 
          contact_number: contactNumber, 
          pin 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al registrar usuario');
      }

      setSuccess(true);
      setTimeout(() => {
        navigate('/waiting-approval');
      }, 2000);
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

      <div className="login-card glass-panel" style={{ maxWidth: '480px' }}>
        <div className="login-header">
          <img 
            src="/logo/logo-cb.png" 
            alt="Logo CB" 
            style={{ maxHeight: '80px', maxWidth: '240px', marginBottom: '16px', objectFit: 'contain' }} 
          />
          <h1 className="login-title" style={{ fontSize: '1.7rem', fontWeight: 800 }}>Registro de Trabajador</h1>
          <p className="login-subtitle">Cree una cuenta para acceder a la gestión de autorizaciones</p>
        </div>

        {error && (
          <div className="login-error">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="login-error" style={{ background: 'var(--color-success-bg)', borderColor: 'var(--color-success-border)', color: '#a7f3d0' }}>
            <CheckCircle2 size={18} />
            <span>¡Registro exitoso! Redirigiendo...</span>
          </div>
        )}

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="dni">DNI (8 dígitos)</label>
            <input
              type="text"
              id="dni"
              className="form-input"
              placeholder="Ingrese su DNI"
              value={dni}
              onChange={(e) => setDni(e.target.value.replace(/\D/g, '').slice(0, 8))}
              disabled={loading || success}
              maxLength={8}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="fullName">Nombre Completo</label>
            <input
              type="text"
              id="fullName"
              className="form-input"
              placeholder="APELLIDOS Y NOMBRES"
              value={fullName}
              onChange={(e) => setFullName(e.target.value.toUpperCase())}
              style={{ textTransform: 'uppercase' }}
              disabled={loading || success}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="contactNumber">Número de Contacto</label>
            <input
              type="text"
              id="contactNumber"
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
              disabled={loading || success}
              maxLength={15}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pin">PIN de Acceso (6 dígitos)</label>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
                type={showPin ? 'text' : 'password'}
                id="pin"
                className="form-input"
                placeholder="••••••"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={loading || success}
                maxLength={6}
                style={{ paddingRight: '40px', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '15px' }} disabled={loading || success}>
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                <span>Registrando...</span>
              </>
            ) : (
              <span>Solicitar Registro</span>
            )}
          </button>
        </form>

        <div className="login-footer" style={{ marginTop: '20px' }}>
          <p>
            ¿Ya tiene una cuenta? <Link to="/login" style={{ color: 'var(--accent-primary)', fontWeight: 'bold', textDecoration: 'none' }}>Inicie sesión aquí</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
