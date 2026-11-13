import React, { useState, useEffect } from 'react';
import { PaymentReceipt } from '../types';
import { getPaymentsList } from '../services/dbService';
import {
  DollarSign,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  RefreshCw
} from 'lucide-react';

export const ReportsPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentReceipt[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const list = await getPaymentsList();
      setPayments(list);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const totalVentas = payments.reduce((acc, p) => acc + (p.total || 0), 0);
  const totalSubtotal = payments.reduce((acc, p) => acc + (p.subtotal || 0), 0);
  const totalIgv = payments.reduce((acc, p) => acc + (p.igv || 0), 0);
  const ticketPromedio = payments.length > 0 ? totalVentas / payments.length : 0;

  // Totales por método
  const ventasEfectivo = payments.filter((p) => p.metodoPago === 'efectivo').reduce((acc, p) => acc + p.total, 0);
  const ventasTarjeta = payments.filter((p) => p.metodoPago === 'tarjeta').reduce((acc, p) => acc + p.total, 0);
  const ventasYapePlin = payments.filter((p) => p.metodoPago === 'yape' || p.metodoPago === 'plin').reduce((acc, p) => acc + p.total, 0);

  return (
    <div>
      {/* Botón Refrescar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={fetchPayments}
          disabled={loading}
          style={{ fontSize: '0.85rem' }}
        >
          <RefreshCw size={15} /> Refrescar Reporte
        </button>
      </div>

      {/* Tarjetas de Métricas */}
      <div className="tables-header-stats">
        <div className="stat-pill-card">
          <div className="stat-icon-wrap" style={{ background: '#d1fae5', color: '#065f46' }}>
            <DollarSign size={24} />
          </div>
          <div>
            <h3 style={{ color: '#065f46' }}>S/ {totalVentas.toFixed(2)}</h3>
            <p>Ventas Totales del Día</p>
          </div>
        </div>

        <div className="stat-pill-card">
          <div className="stat-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <Receipt size={24} />
          </div>
          <div>
            <h3 style={{ color: '#0369a1' }}>{payments.length}</h3>
            <p>Cuentas Cobradas</p>
          </div>
        </div>

        <div className="stat-pill-card">
          <div className="stat-icon-wrap" style={{ background: '#fef3c7', color: '#92400e' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <h3 style={{ color: '#92400e' }}>S/ {ticketPromedio.toFixed(2)}</h3>
            <p>Ticket Promedio por Mesa</p>
          </div>
        </div>
      </div>

      {/* Desglose por Método de Pago */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: 'white', padding: 20, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-cream-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Banknote size={20} color="#059669" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Efectivo en Caja</h4>
          </div>
          <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-green-deep)' }}>
            S/ {ventasEfectivo.toFixed(2)}
          </div>
        </div>

        <div style={{ background: 'white', padding: 20, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-cream-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <CreditCard size={20} color="#2563eb" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Tarjetas (POS)</h4>
          </div>
          <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-green-deep)' }}>
            S/ {ventasTarjeta.toFixed(2)}
          </div>
        </div>

        <div style={{ background: 'white', padding: 20, borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-cream-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Smartphone size={20} color="#7c3aed" />
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Billeteras (Yape / Plin)</h4>
          </div>
          <div style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--color-green-deep)' }}>
            S/ {ventasYapePlin.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Historial de Transacciones */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-cream-border)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.15rem', color: 'var(--color-green-deep)' }}>
            Registro de Pagos y Comprobantes
          </h3>
          <span style={{ fontSize: '0.78rem', color: 'var(--color-gray-500)', fontWeight: 600 }}>
            {payments.length} transacciones registradas
          </span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-cream-surface)', fontSize: '0.78rem', color: 'var(--color-gray-700)', borderBottom: '1px solid var(--color-cream-border)' }}>
              <th style={{ padding: '12px 20px' }}>COMPROBANTE</th>
              <th style={{ padding: '12px 20px' }}>MESA</th>
              <th style={{ padding: '12px 20px' }}>CLIENTE</th>
              <th style={{ padding: '12px 20px' }}>MÉTODO</th>
              <th style={{ padding: '12px 20px' }}>CAJERO</th>
              <th style={{ padding: '12px 20px', textAlign: 'right' }}>TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ padding: 30, textAlign: 'center', color: 'var(--color-gray-500)' }}>
                  Cargando transacciones...
                </td>
              </tr>
            ) : payments.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-gray-500)' }}>
                  Aún no se han cobrado mesas el día de hoy.
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--color-gray-100)', fontSize: '0.85rem' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{ fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-green-deep)' }}>
                      {p.tipoComprobante}
                    </span>
                    <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--color-gray-500)' }}>
                      #{p.id.substring(0, 8)}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', fontWeight: 700 }}>
                    Mesa {p.mesaNumero}
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <div>{p.clienteNombre || 'Público General'}</div>
                    <small style={{ color: 'var(--color-gray-500)' }}>{p.clienteDocumento}</small>
                  </td>
                  <td style={{ padding: '12px 20px' }}>
                    <span style={{
                      textTransform: 'capitalize',
                      padding: '3px 8px',
                      borderRadius: 12,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      background: p.metodoPago === 'efectivo' ? '#d1fae5' : p.metodoPago === 'tarjeta' ? '#dbeafe' : '#f3e8ff',
                      color: p.metodoPago === 'efectivo' ? '#065f46' : p.metodoPago === 'tarjeta' ? '#1e40af' : '#6b21a8'
                    }}>
                      {p.metodoPago}
                    </span>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>
                    {p.cajeroNombre}
                  </td>
                  <td style={{ padding: '12px 20px', textAlign: 'right', fontWeight: 900, color: 'var(--color-orange-primary)', fontSize: '1rem' }}>
                    S/ {p.total.toFixed(2)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
