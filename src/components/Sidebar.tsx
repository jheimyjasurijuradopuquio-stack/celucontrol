import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  UtensilsCrossed,
  ChefHat,
  Receipt,
  BookOpen,
  BarChart3,
  LogOut
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
  const { user, logout } = useAuth();

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

      {/* User profile info */}
      <div className="user-profile-badge">
        <div className="user-profile-header">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {user?.displayName || 'Trabajador'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#a3c4b0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
              {user?.email}
            </div>
            <span className={`role-pill ${user?.role || 'mozo'}`}>
              Rol: {user?.role ? user.role.toUpperCase() : 'MOZO'}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="nav-menu">
        <div className="nav-heading">OPERACIÓN SALÓN</div>

        {(user?.role === 'admin' || user?.role === 'mozo' || user?.role === 'cajero') && (
          <button
            type="button"
            className={`nav-link ${currentView === 'mesas' ? 'active' : ''}`}
            onClick={() => onNavigate('mesas')}
          >
            <UtensilsCrossed size={18} />
            <span>Mesas & Salón</span>
          </button>
        )}

        {(user?.role === 'admin' || user?.role === 'cocina' || user?.role === 'mozo' || user?.role === 'cajero') && (
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
        )}

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

        {user?.role === 'admin' && (
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
