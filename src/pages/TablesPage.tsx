import React, { useState, useEffect } from 'react';
import { DiningTable, TableStatus } from '../types';
import { subscribeTables, openTableAttention, seedInitialPolleriaData, subscribeOpenTakeoutOrders } from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  PlusCircle,
  Receipt,
  Utensils,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

interface TablesPageProps {
  onSelectTableForOrder: (table: DiningTable) => void;
  onSelectTableForCheckout: (table: DiningTable) => void;
  onTakeoutOrder?: () => void;
}

export const TablesPage: React.FC<TablesPageProps> = ({
  onSelectTableForOrder,
  onSelectTableForCheckout,
  onTakeoutOrder
}) => {
  const { user } = useAuth();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todos' | TableStatus>('todos');

  // Modal para abrir mesa
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [comensales, setComensales] = useState<number>(2);
  const [mozoNombre, setMozoNombre] = useState<string>(user?.displayName || 'Mozo Salón');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [takeoutOrdersCount, setTakeoutOrdersCount] = useState<number>(0);

  useEffect(() => {
    const unsubscribe = subscribeTables((updatedTables) => {
      setTables(updatedTables);
      setLoading(false);
    });

    const unsubTakeout = subscribeOpenTakeoutOrders((orders) => {
      setTakeoutOrdersCount(orders.length);
    });

    return () => {
      unsubscribe();
      unsubTakeout();
    };
  }, []);

  const handleOpenModal = (table: DiningTable) => {
    setSelectedTable(table);
    setComensales(table.capacidad || 2);
    setMozoNombre(user?.displayName || 'Mozo Salón');
    setErrorMessage(null);
    setModalOpen(true);
  };

  const handleConfirmOpenTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable) return;
    if (comensales <= 0) {
      setErrorMessage('Ingresa al menos 1 comensal.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const atencionId = await openTableAttention(
        selectedTable.id,
        selectedTable.numero,
        user?.id || 'mozo-01',
        mozoNombre,
        comensales
      );

      setModalOpen(false);
      // Tras abrir la mesa, ir directo a tomar el primer pedido
      const updatedTable: DiningTable = {
        ...selectedTable,
        estado: 'ocupada',
        comensales,
        mozoNombre,
        atencionActivaId: atencionId
      };
      onSelectTableForOrder(updatedTable);
    } catch (err: any) {
      console.error(err);
      setErrorMessage('No se pudo abrir la mesa: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutoSeed = async () => {
    setLoading(true);
    try {
      await seedInitialPolleriaData();
    } catch (err: any) {
      alert('Error inicializando: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Contadores
  const totalLibres = tables.filter((t) => t.estado === 'libre').length;
  const totalOcupadas = tables.filter((t) => t.estado === 'ocupada').length;
  const totalPorPagar = tables.filter((t) => t.estado === 'por_pagar').length;

  const filteredTables = tables.filter((t) => {
    if (filter === 'todos') return true;
    return t.estado === filter;
  });

  return (
    <div>
      {/* Barra superior de acción rápida */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ fontSize: '0.88rem', color: 'var(--color-gray-600)', fontWeight: 600 }}>
          Control de Mesas y Atención en Sala
        </div>
        {onTakeoutOrder && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onTakeoutOrder}
            style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <ShoppingBag size={16} />
            <span>Nuevo Pedido Para Llevar</span>
            {takeoutOrdersCount > 0 && (
              <span style={{
                background: 'rgba(255,255,255,0.35)',
                color: 'white',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                {takeoutOrdersCount} por cobrar
              </span>
            )}
          </button>
        )}
      </div>

      {/* Resumen de Salón */}
      <div className="tables-header-stats">
        <div
          className="stat-pill-card"
          style={{ cursor: 'pointer', borderColor: filter === 'todos' ? 'var(--color-green-primary)' : undefined }}
          onClick={() => setFilter('todos')}
        >
          <div className="stat-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            ▦
          </div>
          <div>
            <h3>{tables.length}</h3>
            <p>Total de Mesas</p>
          </div>
        </div>

        <div
          className="stat-pill-card"
          style={{ cursor: 'pointer', borderColor: filter === 'libre' ? 'var(--color-status-libre)' : undefined }}
          onClick={() => setFilter('libre')}
        >
          <div className="stat-icon-wrap" style={{ background: 'var(--color-status-libre-bg)', color: '#065f46' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3 style={{ color: '#065f46' }}>{totalLibres}</h3>
            <p>Mesas Libres</p>
          </div>
        </div>

        <div
          className="stat-pill-card"
          style={{ cursor: 'pointer', borderColor: filter === 'ocupada' ? 'var(--color-orange-primary)' : undefined }}
          onClick={() => setFilter('ocupada')}
        >
          <div className="stat-icon-wrap" style={{ background: 'var(--color-status-ocupada-bg)', color: 'var(--color-orange-primary)' }}>
            <Utensils size={22} />
          </div>
          <div>
            <h3 style={{ color: 'var(--color-orange-primary)' }}>{totalOcupadas}</h3>
            <p>Mesas Ocupadas</p>
          </div>
        </div>

        <div
          className="stat-pill-card"
          style={{ cursor: 'pointer', borderColor: filter === 'por_pagar' ? 'var(--color-status-pagar)' : undefined }}
          onClick={() => setFilter('por_pagar')}
        >
          <div className="stat-icon-wrap" style={{ background: 'var(--color-status-pagar-bg)', color: '#92400e' }}>
            <Receipt size={22} />
          </div>
          <div>
            <h3 style={{ color: '#92400e' }}>{totalPorPagar}</h3>
            <p>Por Cobrar</p>
          </div>
        </div>
      </div>

      {/* Grid de Mesas */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-gray-500)' }}>
          Cargando estado del salón en tiempo real...
        </div>
      ) : tables.length === 0 ? (
        <div style={{
          background: 'white',
          padding: 48,
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          maxWidth: 550,
          margin: '40px auto',
          border: '1px solid var(--color-cream-border)'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🍗</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-green-deep)', marginBottom: 8 }}>
            Salón de Pollería sin Mesas
          </h3>
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem', marginBottom: 20 }}>
            Tu base de datos de Firestore está conectada pero aún no tiene mesas configuradas. Haz clic abajo para precargar las 12 mesas y la carta completa de pollería en 1 clic.
          </p>
          <button type="button" className="btn btn-primary" onClick={handleAutoSeed}>
            <Sparkles size={18} /> Precargar 12 Mesas y Menú Don Brasa
          </button>
        </div>
      ) : (
        <div className="tables-grid">
          {filteredTables.map((table) => {
            const isLibre = table.estado === 'libre';
            const isOcupada = table.estado === 'ocupada';
            const isPorPagar = table.estado === 'por_pagar';

            return (
              <div key={table.id} className={`table-card ${table.estado}`}>
                <div className="table-top">
                  <div className="table-number">
                    <span>MESA</span> {table.numero}
                  </div>
                  <span className={`table-status-indicator status-${table.estado}`}>
                    {table.estado === 'libre' ? 'Libre' : table.estado === 'ocupada' ? 'Ocupada' : 'Por Cobrar'}
                  </span>
                </div>

                <div className="table-body-info">
                  <div className="info-row">
                    <span>Capacidad:</span>
                    <strong>{table.capacidad} personas</strong>
                  </div>
                  {isOcupada && (
                    <>
                      <div className="info-row">
                        <span>Mozo a cargo:</span>
                        <strong style={{ color: 'var(--color-green-deep)' }}>{table.mozoNombre || 'Asignado'}</strong>
                      </div>
                      <div className="info-row">
                        <span>Comensales:</span>
                        <strong>{table.comensales || 2} personas</strong>
                      </div>
                    </>
                  )}
                  {isPorPagar && (
                    <div className="info-row" style={{ color: '#b45309', fontWeight: 700 }}>
                      <AlertCircle size={14} /> Solicitó la cuenta
                    </div>
                  )}
                </div>

                <div className="table-actions">
                  {isLibre && (
                    <button
                      type="button"
                      className="btn btn-green"
                      style={{ width: '100%' }}
                      onClick={() => handleOpenModal(table)}
                    >
                      <PlusCircle size={16} /> Abrir Mesa
                    </button>
                  )}

                  {isOcupada && (
                    <>
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => onSelectTableForOrder(table)}
                        title="Tomar pedido o comanda adicional"
                      >
                        <Utensils size={15} /> Pedir
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => onSelectTableForCheckout(table)}
                        title="Ver cuenta acumulada o registrar pago"
                      >
                        <Receipt size={15} /> Cuenta
                      </button>
                    </>
                  )}

                  {isPorPagar && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', background: '#b45309' }}
                      onClick={() => onSelectTableForCheckout(table)}
                    >
                      <Receipt size={16} /> Cobrar en Caja
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Abrir Mesa */}
      {modalOpen && selectedTable && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Abrir Mesa {selectedTable.numero}</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmOpenTable}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                  Nombre del Mozo Responsable
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={mozoNombre}
                  onChange={(e) => setMozoNombre(e.target.value)}
                  required
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
                  Número de Comensales
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  className="input-field"
                  value={comensales}
                  onChange={(e) => setComensales(Number(e.target.value))}
                  required
                />
              </div>

              {errorMessage && (
                <div style={{ color: '#dc2626', fontSize: '0.8rem', marginBottom: 14 }}>
                  {errorMessage}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Abriendo mesa...' : 'Confirmar e Iniciar Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
