import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Clock, ShieldAlert, ChevronLeft } from 'lucide-react';
import './Login.css';

const WaitingApproval = () => {
  const navigate = useNavigate();

  return (
    <div className="login-container">
      {/* Decorative glows */}
      <div className="login-bg-glows">
        <div className="glow-sphere sphere-1"></div>
        <div className="glow-sphere sphere-2"></div>
      </div>

      <div className="login-card glass-panel" style={{ maxWidth: '500px', textAlign: 'center' }}>
        <div className="login-logo" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--color-warning)', boxShadow: '0 8px 24px rgba(245, 158, 11, 0.15)', width: '70px', height: '70px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <Clock size={36} />
        </div>

        <h1 className="login-title" style={{ fontSize: '1.8rem', fontWeight: 800, background: 'linear-gradient(135deg, #ffffff 60%, var(--color-warning) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '12px' }}>
          Registro Recibido
        </h1>
        
        <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
          Esperando Autorización del Administrador
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '24px' }}>
          Su cuenta se ha creado con éxito, pero requiere que un administrador la <b>autorice</b> y le asigne su <b>Rol</b>, <b>Permisos</b> y <b>Sedes</b> autorizadas antes de poder acceder al sistema.
        </p>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', marginBottom: '24px', textAlign: 'left', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <ShieldAlert size={20} style={{ color: 'var(--color-warning)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>¿Qué debo hacer ahora?</h4>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Comuníquese con el administrador del sistema para informarle sobre su registro y coordinar los permisos correspondientes.
            </p>
          </div>
        </div>

        <Link 
          to="/login" 
          className="btn btn-secondary" 
          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', padding: '10px 20px', width: '100%', justifyContent: 'center', boxSizing: 'border-box' }}
        >
          <ChevronLeft size={16} />
          <span>Volver al Iniciar Sesión</span>
        </Link>
      </div>
    </div>
  );
};

export default WaitingApproval;
