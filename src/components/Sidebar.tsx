import React from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  BookOpen,
  BarChart3,
  LogOut,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  pendingKitchenCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  pendingKitchenCount = 0
}) => {
  const { user, loginAsRole, logout } = useAuth();
  const [switching, setSwitching] = React.useState(false);

  const handleRoleSwitch = async (r: UserRole) => {
    setSwitching(true);
    try {
      await loginAsRole(r);
    } catch (err) {
      console.error('Error switching role:', err);
    } finally {
      setSwitching(false);
    }
  };

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="brand-section">
        <div className="brand-emblem">🍗</div>
        <div className="brand-info">
          <h1>DON BRASA</h1>
          <span>SISTEMA DE COMANDAS</span>
        </div>
      </div>

      {/* User info & Quick Role Switcher */}
      <div className="user-profile-badge">
        <div className="user-profile-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.displayName}
            </div>
            <span className={`role-pill ${user?.role || 'mozo'}`}>
              Rol: {user?.role}
            </span>
          </div>
        </div>

        <div style={{ fontSize: '0.65rem', color: '#a3c4b0', marginBottom: 4, fontWeight: 600 }}>
          Cambiar rol de prueba:
        </div>
        <div className="quick-role-switcher">
          <button
            type="button"
            className={`role-switch-btn ${user?.role === 'admin' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('admin')}
            title="Administrador"
          >
            Admin
          </button>
          <button
            type="button"
            className={`role-switch-btn ${user?.role === 'mozo' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('mozo')}
            title="Mozo de Salón"
          >
            Mozo
          </button>
          <button
            type="button"
            className={`role-switch-btn ${user?.role === 'cocina' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('cocina')}
            title="Cocina"
          >
            Cocina
          </button>
          <button
            type="button"
            className={`role-switch-btn ${user?.role === 'cajero' ? 'active' : ''}`}
            onClick={() => handleRoleSwitch('cajero')}
            title="Cajero"
          >
            Caja
          </button>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        <div className="nav-heading">OPERACIÓN SALÓN</div>

        <button
          type="button"
          className={`nav-link ${currentView === 'mesas' ? 'active' : ''}`}
          onClick={() => onNavigate('mesas')}
        >
          <UtensilsCrossed size={18} />
          <span>Mesas & Salón</span>
        </button>

        <button
          type="button"
          className={`nav-link ${currentView === 'cocina' ? 'active' : ''}`}
          onClick={() => onNavigate('cocina')}
        >
          <ChefHat size={18} />
          <span>Monitor Cocina</span>
          {pendingKitchenCount > 0 && (
            <span className="nav-badge">{pendingKitchenCount}</span>
          )}
        </button>

        {(user?.role === 'cajero' || user?.role === 'admin') && (
          <button
            type="button"
            className={`nav-link ${currentView === 'caja' ? 'active' : ''}`}
            onClick={() => onNavigate('caja')}
          >
            <Receipt size={18} />
            <span>Caja & Cierre</span>
          </button>
        )}

        {(user?.role === 'admin') && (
          <>
            <div className="nav-heading">ADMINISTRACIÓN</div>

            <button
              type="button"
              className={`nav-link ${currentView === 'menu' ? 'active' : ''}`}
              onClick={() => onNavigate('menu')}
            >
              <BookOpen size={18} />
              <span>Carta & Platos</span>
            </button>

            <button
              type="button"
              className={`nav-link ${currentView === 'reportes' ? 'active' : ''}`}
              onClick={() => onNavigate('reportes')}
            >
              <BarChart3 size={18} />
              <span>Reportes de Venta</span>
            </button>
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span>Firestore Activo</span>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          style={{ background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
          title="Cerrar sesión"
        >
          <LogOut size={14} /> Salir
        </button>
      </div>
    </aside>
  );
};
