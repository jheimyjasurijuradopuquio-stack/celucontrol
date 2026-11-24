import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  Lock,
  Mail,
  AlertCircle
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { loginWithEmail, authError, clearAuthError } = useAuth();
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
        maxWidth: 440,
        width: '100%',
        padding: 36,
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid var(--color-cream-border)'
      }}>
        {/* Encabezado Don Brasa */}
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

        {/* Alerta de Error de Firebase Auth */}
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

        {/* Formulario de Correo y Contraseña */}
        <form onSubmit={handleSubmit}>
          {isRegistering && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                  Nombre Completo del Trabajador
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
                  Rol de Trabajo en Pollería
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
                  🔒 El rol de Administrador no es de libre asignación; se otorga únicamente por gerencia.
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
            {loading ? 'Verificando credenciales...' : isRegistering ? 'Crear Cuenta y Acceder' : 'Ingresar al Sistema'}
          </button>

          <div style={{ textAlign: 'center', marginTop: 18 }}>
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
              {isRegistering ? '¿Ya tienes una cuenta registrada? Inicia sesión aquí' : '¿Nuevo trabajador? Regístrate aquí'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
