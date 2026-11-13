import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Sparkles, Clock, RefreshCw } from 'lucide-react';
import { seedInitialPolleriaData } from '../services/dbService';

interface TopNavbarProps {
  title: string;
  subtitle: string;
  selectedTableNumber?: number | null;
  onClearSelectedTable?: () => void;
  onRefreshData?: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  title,
  subtitle,
  selectedTableNumber,
  onClearSelectedTable,
  onRefreshData
}) => {
  const { user } = useAuth();
  const [seeding, setSeeding] = React.useState(false);
  const [seedMessage, setSeedMessage] = React.useState<string | null>(null);

  const handleSeed = async () => {
    if (window.confirm('¿Deseas precargar las 12 mesas y la carta completa de pollería en Firestore?')) {
      setSeeding(true);
      try {
        const result = await seedInitialPolleriaData();
        setSeedMessage(`¡Listo! Se crearon ${result.tablesCreated} mesas y ${result.productsCreated} productos.`);
        setTimeout(() => setSeedMessage(null), 4000);
        if (onRefreshData) onRefreshData();
      } catch (err: any) {
        alert('Error al poblar base de datos: ' + err.message);
      } finally {
        setSeeding(false);
      }
    }
  };

  return (
    <header className="top-navbar">
      <div className="page-title">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h2>{title}</h2>
          {selectedTableNumber && (
            <span style={{
              background: 'var(--color-orange-primary)',
              color: 'white',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 10px',
              borderRadius: 20
            }}>
              MESA {selectedTableNumber}
            </span>
          )}
        </div>
        <p>{subtitle}</p>
      </div>

      <div className="top-actions">
        {seedMessage && (
          <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 700 }}>
            {seedMessage}
          </span>
        )}

        {user?.role === 'admin' && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSeed}
            disabled={seeding}
            style={{ fontSize: '0.8rem', padding: '7px 12px' }}
            title="Poblar catálogo y mesas si la base de datos está vacía"
          >
            <Sparkles size={15} color="var(--color-orange-primary)" />
            {seeding ? 'Cargando...' : 'Precargar Carta de Pollería'}
          </button>
        )}

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--color-cream-surface)',
          padding: '6px 12px',
          borderRadius: 20,
          fontSize: '0.78rem',
          fontWeight: 600,
          color: 'var(--color-gray-700)'
        }}>
          <Clock size={14} color="var(--color-green-primary)" />
          <span>Pollería Don Brasa - Sala Activa</span>
        </div>
      </div>
    </header>
  );
};
