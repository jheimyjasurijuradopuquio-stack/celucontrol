import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Lock,
  Mail,
  UserCheck,
  AlertCircle,
  ChefHat,
  UtensilsCrossed,
  Receipt,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, loginAsRole, authError, isAuthConfigured, clearAuthError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('mozo');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await loginWithEmail(email, password, isRegistering ? { displayName, role: selectedRole } : undefined);
    } catch (err) {
      // Error manejado en AuthContext
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRoleLogin = async (role: UserRole) => {
    setLoading(true);
    try {
      await loginAsRole(role);
    } catch (err) {
      // Error manejado en AuthContext
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, var(--color-green-deep) 0%, #0d281a 100%)',
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 'var(--radius-xl)',
        maxWidth: 480,
        width: '100%',
        padding: 36,
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-cream-border)'
      }}>
        {/* Encabezado */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, var(--color-orange-primary), #f59e0b)',
            borderRadius: 'var(--radius-lg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            margin: '0 auto 12px',
            boxShadow: 'var(--shadow-orange)'
          }}>
            🍗
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-green-deep)', fontWeight: 800 }}>
            POLLERÍA DON BRASA
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-gray-500)', marginTop: 2 }}>
            Sistema de Toma de Pedidos en Sala & Gestión de Comandas
          </p>
        </div>

        {/* Alerta de Error o Configuración de Firebase Auth */}
        {authError && (
          <div style={{
            background: '#fee2e2',
            border: '1px solid #ef4444',
            color: '#991b1b',
            padding: '12px 16px',
            borderRadius: 'var(--radius-md)',
            marginBottom: 20,
            fontSize: '0.82rem',
            lineHeight: 1.4
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, marginBottom: 4 }}>
              <AlertCircle size={16} /> Atención:
            </div>
            {authError}
          </div>
        )}

        {/* Acceso Rápido por Roles de Firebase Auth */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-600)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10, textAlign: 'center' }}>
            Acceso Rápido por Rol (Firebase Auth Real)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
            <button
              type="button"
              className="btn"
              onClick={() => handleQuickRoleLogin('admin')}
              disabled={loading}
              style={{
                background: '#f5f3ff',
                color: '#6d28d9',
                border: '1px solid #ddd6fe',
                fontSize: '0.82rem',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <ShieldCheck size={18} />
              <strong>Administrador</strong>
              <small style={{ fontSize: '0.68rem', color: '#8b5cf6' }}>admin@donbrasa.pe</small>
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => handleQuickRoleLogin('mozo')}
              disabled={loading}
              style={{
                background: '#ecfdf5',
                color: '#047857',
                border: '1px solid #a7f3d0',
                fontSize: '0.82rem',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <UtensilsCrossed size={18} />
              <strong>Mozo Salón</strong>
              <small style={{ fontSize: '0.68rem', color: '#10b981' }}>mozo@donbrasa.pe</small>
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => handleQuickRoleLogin('cocina')}
              disabled={loading}
              style={{
                background: '#fffbeb',
                color: '#b45309',
                border: '1px solid #fde68a',
                fontSize: '0.82rem',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <ChefHat size={18} />
              <strong>Cocina & Brasas</strong>
              <small style={{ fontSize: '0.68rem', color: '#f59e0b' }}>cocina@donbrasa.pe</small>
            </button>

            <button
              type="button"
              className="btn"
              onClick={() => handleQuickRoleLogin('cajero')}
              disabled={loading}
              style={{
                background: '#fdf2f8',
                color: '#be185d',
                border: '1px solid #fbcfe8',
                fontSize: '0.82rem',
                padding: '12px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: 4
              }}
            >
              <Receipt size={18} />
              <strong>Cajero / Liquidación</strong>
              <small style={{ fontSize: '0.68rem', color: '#ec4899' }}>caja@donbrasa.pe</small>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--color-gray-200)' }}></div>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', textTransform: 'uppercase' }}>O con tu correo</span>
          <div style={{ flex: 1, height: 1, background: 'var(--color-gray-200)' }}></div>
        </div>

        {/* Formulario Manual de Correo y Contraseña */}
        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                  Nombre Completo
                </label>
                <input
                  type="text"
                  placeholder="Ej. Roberto Sánchez"
                  className="input-field"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required={isRegistering}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                  Rol Asignado en Pollería
                </label>
                <select
                  className="input-field"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                >
                  <option value="mozo">Mozo (Toma de pedidos en sala)</option>
                  <option value="cocina">Cocina (Monitor de comandas)</option>
                  <option value="cajero">Cajero (Cuentas y cobro)</option>
                </select>
                <small style={{ fontSize: '0.7rem', color: 'var(--color-gray-500)', display: 'block', marginTop: 4 }}>
                  🔒 El rol de Administrador no es de libre registro; se asigna por gerencia.
                </small>
              </div>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Mail size={14} /> Correo Electrónico
            </label>
            <input
              type="email"
              placeholder="tu.correo@donbrasa.pe"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Lock size={14} /> Contraseña
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', fontSize: '0.95rem', fontWeight: 800 }}
            disabled={loading}
          >
            {loading ? 'Autenticando en Firebase...' : isRegistering ? 'Crear Cuenta y Acceder' : 'Iniciar Sesión'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <button
              type="button"
              onClick={() => {
                setIsRegistering(!isRegistering);
                clearAuthError();
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-green-primary)',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
