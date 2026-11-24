import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { Sidebar } from './components/Sidebar';
import { TopNavbar } from './components/TopNavbar';
import { TablesPage } from './pages/TablesPage';
import { OrderTakingPage } from './pages/OrderTakingPage';
import { KitchenPage } from './pages/KitchenPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { MenuManagementPage } from './pages/MenuManagementPage';
import { ReportsPage } from './pages/ReportsPage';
import { DiningTable, KitchenTicket, UserRole } from './types';
import { subscribeKitchenTickets } from './services/dbService';

const isViewAllowedForRole = (view: string, role?: UserRole): boolean => {
  if (!role) return false;
  if (role === 'admin') return true;
  if (role === 'cajero') return ['caja', 'mesas', 'order-taking', 'cocina'].includes(view);
  if (role === 'mozo') return ['mesas', 'order-taking', 'cocina'].includes(view);
  if (role === 'cocina') return ['cocina'].includes(view);
  return false;
};

const getDefaultViewForRole = (role?: UserRole): string => {
  if (role === 'cocina') return 'cocina';
  if (role === 'cajero') return 'caja';
  return 'mesas';
};

const MainDashboard: React.FC = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<string>(() => getDefaultViewForRole(user?.role));
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [initialOrderMode, setInitialOrderMode] = useState<'salon' | 'llevar'>('salon');
  const [pendingKitchenCount, setPendingKitchenCount] = useState<number>(0);

  // Sincronizar vista permitida cuando cambia el rol del usuario
  useEffect(() => {
    if (user?.role) {
      if (!isViewAllowedForRole(currentView, user.role)) {
        setCurrentView(getDefaultViewForRole(user.role));
      }
    }
  }, [user?.role]);

  // Escuchar comandas en cocina para mostrar badge en el menú
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeKitchenTickets((tickets: KitchenTicket[]) => {
      const pending = tickets.filter((t) => t.estado === 'pendiente' || t.estado === 'preparando').length;
      setPendingKitchenCount(pending);
    });
    return () => unsub();
  }, [user]);

  // Manejadores de navegación
  const handleSelectTableForOrder = (table: DiningTable) => {
    setSelectedTable(table);
    setInitialOrderMode('salon');
    setCurrentView('order-taking');
  };

  const handleTakeoutOrder = () => {
    setSelectedTable(null);
    setInitialOrderMode('llevar');
    setCurrentView('order-taking');
  };

  const handleSelectTableForCheckout = (table: DiningTable) => {
    if (user?.role === 'cajero' || user?.role === 'admin') {
      setSelectedTable(table);
      setCurrentView('caja');
    } else {
      alert('La liquidación y cobro de cuentas está restringida al rol de Cajero o Administrador.');
    }
  };

  const handleBackToTables = () => {
    setSelectedTable(null);
    if (isViewAllowedForRole('mesas', user?.role)) {
      setCurrentView('mesas');
    } else {
      setCurrentView(getDefaultViewForRole(user?.role));
    }
  };

  const handleOrderSent = () => {
    setSelectedTable(null);
    if (user?.role === 'cajero') {
      setCurrentView('caja');
    } else {
      setCurrentView('mesas');
    }
  };

  // Títulos contextuales
  const getViewTitle = () => {
    switch (currentView) {
      case 'mesas':
        return { title: 'Salón de Mesas', subtitle: 'Monitoreo de estado de atención en sala' };
      case 'order-taking':
        return {
          title: selectedTable ? `Toma de Pedidos · Mesa ${selectedTable.numero}` : 'Toma de Pedidos · Para Llevar',
          subtitle: 'Selección de carta, porciones y envío seguro a cocina'
        };
      case 'cocina':
        return { title: 'Monitor de Cocina & Brasas', subtitle: 'Comandas en tiempo real vía onSnapshot' };
      case 'caja':
        return { title: 'Caja & Cierre de Cuentas', subtitle: 'Liquidación de consumos, emisión de comprobantes y liberación' };
      case 'menu':
        return { title: 'Gestión de Carta & Menú', subtitle: 'Control de precios, platos típicos y disponibilidad' };
      case 'reportes':
        return { title: 'Reportes de Venta Diaria', subtitle: 'Resumen consolidado de ingresos y recaudación' };
      default:
        return { title: 'Sistema Pollería Don Brasa', subtitle: 'Control de pedidos y comandas' };
    }
  };

  const { title, subtitle } = getViewTitle();

  return (
    <div className="app-container">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          if (isViewAllowedForRole(view, user?.role)) {
            setSelectedTable(null);
            setCurrentView(view);
          }
        }}
        pendingKitchenCount={pendingKitchenCount}
      />

      <div className="main-wrapper">
        <TopNavbar
          title={title}
          subtitle={subtitle}
          selectedTableNumber={selectedTable?.numero}
          onClearSelectedTable={() => setSelectedTable(null)}
        />

        <main className="content-body">
          {currentView === 'mesas' && isViewAllowedForRole('mesas', user?.role) && (
            <TablesPage
              onSelectTableForOrder={handleSelectTableForOrder}
              onSelectTableForCheckout={handleSelectTableForCheckout}
              onTakeoutOrder={handleTakeoutOrder}
            />
          )}

          {currentView === 'order-taking' && isViewAllowedForRole('order-taking', user?.role) && (
            <OrderTakingPage
              table={selectedTable}
              onBackToTables={handleBackToTables}
              onOrderSent={handleOrderSent}
              initialMode={initialOrderMode}
            />
          )}

          {currentView === 'cocina' && isViewAllowedForRole('cocina', user?.role) && (
            <KitchenPage />
          )}

          {currentView === 'caja' && isViewAllowedForRole('caja', user?.role) && (
            <CheckoutPage
              initialTable={selectedTable}
              onFinished={handleBackToTables}
              onBackToTables={handleBackToTables}
            />
          )}

          {currentView === 'menu' && isViewAllowedForRole('menu', user?.role) && (
            <MenuManagementPage />
          )}

          {currentView === 'reportes' && isViewAllowedForRole('reportes', user?.role) && (
            <ReportsPage />
          )}
        </main>
      </div>
    </div>
  );
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-cream-bg)',
        color: 'var(--color-green-deep)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: 16 }}>🍗</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>
          Conectando con Firebase...
        </h3>
        <p style={{ color: 'var(--color-gray-500)', fontSize: '0.85rem' }}>
          Verificando sesión segura en Pollería Don Brasa
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return <MainDashboard />;
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
