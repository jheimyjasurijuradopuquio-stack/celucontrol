import React, { useState, useEffect } from 'react';
import { KitchenTicket, TicketStatus } from '../types';
import { subscribeKitchenTickets, updateKitchenTicketStatus } from '../services/dbService';
import {
  Clock,
  CheckCircle,
  Flame,
  BellRing,
  AlertTriangle,
  CheckCheck,
  Utensils
} from 'lucide-react';

export const KitchenPage: React.FC = () => {
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [activeTab, setActiveTab] = useState<'activas' | TicketStatus | 'todas'>('activas');
  const [now, setNow] = useState<number>(Date.now());

  // Actualizar reloj cada 30 segundos para cálculo de demoras
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Suscripción en tiempo real a Firestore con onSnapshot
  useEffect(() => {
    const unsubscribe = subscribeKitchenTickets((newTickets) => {
      setTickets(newTickets);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (ticketId: string, nextStatus: TicketStatus) => {
    try {
      await updateKitchenTicketStatus(ticketId, nextStatus);
    } catch (err: any) {
      alert('Error al actualizar comanda: ' + err.message);
    }
  };

  // Calcular minutos transcurridos
  const getElapsedMinutes = (timestamp: any): number => {
    if (!timestamp) return 0;
    const millis = timestamp.toMillis ? timestamp.toMillis() : (timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime());
    return Math.max(0, Math.floor((now - millis) / (1000 * 60)));
  };

  // Formatear hora de creación
  const formatCreationTime = (timestamp: any): string => {
    if (!timestamp) return '';
    const millis = timestamp.toMillis ? timestamp.toMillis() : (timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime());
    const date = new Date(millis);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Filtros
  const filteredTickets = tickets.filter((t) => {
    if (activeTab === 'activas') {
      // Activas en cocina: pendiente, preparando o listo
      return t.estado === 'pendiente' || t.estado === 'preparando' || t.estado === 'listo';
    }
    if (activeTab === 'todas') return true;
    return t.estado === activeTab;
  });

  const countPendientes = tickets.filter((t) => t.estado === 'pendiente').length;
  const countPreparando = tickets.filter((t) => t.estado === 'preparando').length;
  const countListas = tickets.filter((t) => t.estado === 'listo').length;

  return (
    <div className="kitchen-board-container">
      {/* Pestañas de Filtro */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div className="kitchen-filter-tabs">
          <button
            type="button"
            className={`kitchen-tab-btn ${activeTab === 'activas' ? 'active' : ''}`}
            onClick={() => setActiveTab('activas')}
          >
            <BellRing size={16} /> Comandas en Cocina ({countPendientes + countPreparando + countListas})
          </button>
          <button
            type="button"
            className={`kitchen-tab-btn ${activeTab === 'pendiente' ? 'active' : ''}`}
            onClick={() => setActiveTab('pendiente')}
          >
            <Clock size={16} /> Pendientes ({countPendientes})
          </button>
          <button
            type="button"
            className={`kitchen-tab-btn ${activeTab === 'preparando' ? 'active' : ''}`}
            onClick={() => setActiveTab('preparando')}
          >
            <Flame size={16} /> En Brasas ({countPreparando})
          </button>
          <button
            type="button"
            className={`kitchen-tab-btn ${activeTab === 'listo' ? 'active' : ''}`}
            onClick={() => setActiveTab('listo')}
          >
            <CheckCircle size={16} /> Listas para Salir ({countListas})
          </button>
          <button
            type="button"
            className={`kitchen-tab-btn ${activeTab === 'todas' ? 'active' : ''}`}
            onClick={() => setActiveTab('todas')}
          >
            Historial de Comandas ({tickets.length})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
          <span>Actualización en tiempo real vía onSnapshot</span>
        </div>
      </div>

      {/* Grid de Comandas */}
      {filteredTickets.length === 0 ? (
        <div style={{
          background: 'white',
          padding: 60,
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          border: '1px solid var(--color-cream-border)',
          maxWidth: 600,
          margin: '30px auto'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👨‍🍳</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-green-deep)', marginBottom: 8 }}>
            No hay comandas pendientes en cocina
          </h3>
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem' }}>
            Cuando el mozo registre un pedido en sala, la comanda aparecerá aquí instantáneamente en tiempo real.
          </p>
        </div>
      ) : (
        <div className="kitchen-tickets-grid">
          {filteredTickets.map((ticket) => {
            const elapsedMins = getElapsedMinutes(ticket.creadaEn);
            const isLate = elapsedMins >= 20;
            const isWarning = elapsedMins >= 12 && elapsedMins < 20;

            const borderColor =
              ticket.estado === 'pendiente'
                ? '#ef4444'
                : ticket.estado === 'preparando'
                ? 'var(--color-orange-primary)'
                : ticket.estado === 'listo'
                ? '#10b981'
                : '#94a3b8';

            return (
              <div
                key={ticket.id}
                className="kitchen-ticket-card"
                style={{ borderLeftColor: borderColor }}
              >
                {/* Cabecera de la comanda */}
                <div className="ticket-header">
                  <div>
                    {ticket.tipo === 'llevar' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <h4 style={{ margin: 0 }}>PEDIDO #{ticket.numeroPedido || ticket.numeroComanda}</h4>
                        <span style={{
                          background: 'var(--color-orange-primary)',
                          color: 'white',
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 12,
                          letterSpacing: '0.5px'
                        }}>
                          PARA LLEVAR
                        </span>
                      </div>
                    ) : (
                      <h4>MESA {ticket.mesaNumero}</h4>
                    )}
                    <small style={{ color: 'var(--color-gray-500)', fontWeight: 600, display: 'block', marginTop: 3 }}>
                      {ticket.tipo === 'llevar'
                        ? `${ticket.clienteNombre ? `Cliente: ${ticket.clienteNombre} · ` : ''}${formatCreationTime(ticket.creadaEn) ? `Hora: ${formatCreationTime(ticket.creadaEn)} · ` : ''}Mozo: ${ticket.mozoNombre}`
                        : `Comanda #${ticket.numeroComanda} · ${formatCreationTime(ticket.creadaEn) ? `Hora: ${formatCreationTime(ticket.creadaEn)} · ` : ''}Mozo: ${ticket.mozoNombre}`}
                    </small>
                  </div>

                  <div
                    className="ticket-timer-badge"
                    style={{
                      background: isLate ? '#fee2e2' : isWarning ? '#fef3c7' : 'var(--color-orange-light)',
                      color: isLate ? '#b91c1c' : isWarning ? '#b45309' : 'var(--color-orange-primary)'
                    }}
                  >
                    {isLate && <AlertTriangle size={13} />}
                    <Clock size={13} />
                    <span>hace {elapsedMins} min</span>
                  </div>
                </div>

                {/* Ítems pedidos y notas especiales de cocina */}
                <div className="ticket-items-list">
                  {ticket.items.map((item, idx) => (
                    <div key={idx} className="ticket-item">
                      <div className="ticket-item-main">
                        <div>
                          <span className="ticket-item-qty">{item.cantidad}x</span>
                          <strong style={{ color: 'var(--color-green-deep)' }}>{item.nombre}</strong>
                        </div>
                      </div>

                      {item.notas && (
                        <div>
                          <span className="ticket-item-note">
                            ⚠️ {item.notas}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}

                  {ticket.observaciones && (
                    <div style={{
                      marginTop: 6,
                      background: '#fffbeb',
                      border: '1px dashed #f59e0b',
                      padding: '6px 10px',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: '0.78rem',
                      color: '#92400e'
                    }}>
                      <strong>Nota del Mozo:</strong> {ticket.observaciones}
                    </div>
                  )}
                </div>

                {/* Acciones de transición de estado */}
                <div className="ticket-actions-bar">
                  {ticket.estado === 'pendiente' && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                      onClick={() => handleUpdateStatus(ticket.id, 'preparando')}
                    >
                      <Flame size={16} /> Iniciar Preparación
                    </button>
                  )}

                  {ticket.estado === 'preparando' && (
                    <button
                      type="button"
                      className="btn btn-green"
                      style={{ width: '100%', fontSize: '0.85rem' }}
                      onClick={() => handleUpdateStatus(ticket.id, 'listo')}
                    >
                      <CheckCircle size={16} /> ¡Comanda Lista!
                    </button>
                  )}

                  {ticket.estado === 'listo' && (
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ width: '100%', borderColor: '#10b981', color: '#065f46', fontSize: '0.85rem' }}
                      onClick={() => handleUpdateStatus(ticket.id, 'entregado')}
                    >
                      <CheckCheck size={16} /> Marcar como Entregado a Sala
                    </button>
                  )}

                  {ticket.estado === 'entregado' && (
                    <div style={{ width: '100%', textAlign: 'center', fontSize: '0.78rem', color: '#059669', fontWeight: 700, padding: 6 }}>
                      ✓ Entregado a comensales
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
