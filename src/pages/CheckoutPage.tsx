import React, { useState, useEffect } from 'react';
import {
  DiningTable,
  TableAttention,
  KitchenTicket,
  PaymentMethod,
  InvoiceType,
  OrderItem
} from '../types';
import {
  subscribeTables,
  subscribeAttention,
  subscribeAttentionTickets,
  registerPaymentAndCloseTable
} from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import {
  Receipt,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  CheckCircle2,
  Printer,
  ArrowLeft,
  DollarSign
} from 'lucide-react';

interface CheckoutPageProps {
  initialTable?: DiningTable | null;
  onFinished: () => void;
  onBackToTables: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  initialTable,
  onFinished,
  onBackToTables
}) => {
  const { user } = useAuth();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(initialTable || null);
  const [attention, setAttention] = useState<TableAttention | null>(null);
  const [tickets, setTickets] = useState<KitchenTicket[]>([]);
  const [loading, setLoading] = useState(false);

  // Formulario de Pago
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [tipoComprobante, setTipoComprobante] = useState<InvoiceType>('ticket');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteDocumento, setClienteDocumento] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceiptId, setSuccessReceiptId] = useState<string | null>(null);

  // Cargar mesas ocupadas o por cobrar
  useEffect(() => {
    const unsub = subscribeTables((allTables) => {
      const active = allTables.filter((t) => t.estado === 'ocupada' || t.estado === 'por_pagar');
      setTables(active);

      // Si no hay mesa seleccionada y hay mesas ocupadas, preseleccionar la primera
      if (!selectedTable && active.length > 0) {
        setSelectedTable(active[0]);
      } else if (selectedTable) {
        const found = allTables.find((t) => t.id === selectedTable.id);
        if (found) setSelectedTable(found);
      }
    });

    return () => unsub();
  }, []);

  // Cargar atención activa de la mesa seleccionada
  useEffect(() => {
    if (!selectedTable?.atencionActivaId) {
      setAttention(null);
      setTickets([]);
      return;
    }

    setLoading(true);
    const unsubAttention = subscribeAttention(selectedTable.atencionActivaId, (data) => {
      setAttention(data);
      setLoading(false);
    });

    const unsubTickets = subscribeAttentionTickets(selectedTable.atencionActivaId, (t) => {
      setTickets(t);
    });

    return () => {
      unsubAttention();
      unsubTickets();
    };
  }, [selectedTable]);

  // Consolidar todos los ítems de todas las comandas de esta atención
  const allItems: OrderItem[] = tickets.flatMap((t) => t.items);
  const total = attention?.totalAcumulado || allItems.reduce((acc, item) => acc + item.subtotal, 0);
  const subtotal = +(total / 1.18).toFixed(2);
  const igv = +(total - subtotal).toFixed(2);
  const propinaSugerida = +(total * 0.10).toFixed(2);

  // Cálculo de vuelto para efectivo
  const numRecibido = parseFloat(montoRecibido) || 0;
  const vuelto = metodoPago === 'efectivo' && numRecibido >= total ? +(numRecibido - total).toFixed(2) : 0;

  const handleProcessPayment = async () => {
    if (!selectedTable || !attention) {
      alert('Por favor selecciona una mesa con atención activa.');
      return;
    }

    if (total <= 0) {
      alert('El total debe ser mayor a 0 para emitir el cobro.');
      return;
    }

    if (metodoPago === 'efectivo' && numRecibido < total) {
      alert(`El monto recibido en efectivo (S/ ${numRecibido.toFixed(2)}) es menor al total a cobrar (S/ ${total.toFixed(2)}).`);
      return;
    }

    if (tipoComprobante === 'factura' && (!clienteDocumento || clienteDocumento.length !== 11)) {
      alert('Para emitir Factura ingresa un número de RUC válido de 11 dígitos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const receiptId = await registerPaymentAndCloseTable(
        attention.id,
        selectedTable.id,
        selectedTable.numero,
        {
          subtotal,
          igv,
          total,
          metodoPago,
          montoRecibido: metodoPago === 'efectivo' ? numRecibido : total,
          vuelto: metodoPago === 'efectivo' ? vuelto : 0,
          tipoComprobante,
          clienteNombre: clienteNombre || 'Público General',
          clienteDocumento: clienteDocumento || '00000000',
          cajeroId: user?.id || 'caja-01',
          cajeroNombre: user?.displayName || 'Caja Salón'
        }
      );

      setSuccessReceiptId(receiptId);
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar cobro: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Botón Volver y Selector de Mesas si hay varias */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onBackToTables}
          style={{ fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Volver al Salón
        </button>

        {tables.length > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-gray-700)' }}>
              Cambiar Mesa:
            </span>
            <select
              value={selectedTable?.id || ''}
              onChange={(e) => {
                const found = tables.find((t) => t.id === e.target.value);
                if (found) setSelectedTable(found);
              }}
              className="input-field"
              style={{ width: 'auto', marginTop: 0, padding: '6px 12px', fontSize: '0.85rem' }}
            >
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  Mesa {t.numero} ({t.mozoNombre || 'Mozo'})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {successReceiptId ? (
        /* Pantalla de Confirmación de Pago y Comprobante emitido */
        <div style={{
          background: 'white',
          borderRadius: 'var(--radius-xl)',
          padding: 36,
          maxWidth: 550,
          margin: '20px auto',
          textAlign: 'center',
          boxShadow: 'var(--shadow-lg)',
          border: '1px solid var(--color-cream-border)'
        }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: '#d1fae5',
            color: '#059669',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.6rem', color: 'var(--color-green-deep)', marginBottom: 6 }}>
            ¡Pago Registrado con Éxito!
          </h3>
          <p style={{ color: 'var(--color-gray-600)', fontSize: '0.9rem', marginBottom: 20 }}>
            La <strong>Mesa {selectedTable?.numero}</strong> ha sido liberada en Firestore y ya está disponible para nuevos clientes.
          </p>

          <div style={{
            background: 'var(--color-cream-surface)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
            textAlign: 'left',
            fontSize: '0.85rem',
            marginBottom: 24,
            border: '1px solid var(--color-cream-border)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Comprobante:</span>
              <strong>{tipoComprobante.toUpperCase()} #{successReceiptId.substring(0, 8)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Método:</span>
              <strong style={{ textTransform: 'capitalize' }}>{metodoPago}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span>Total Pagado:</span>
              <strong style={{ color: 'var(--color-green-deep)', fontSize: '1.1rem' }}>S/ {total.toFixed(2)}</strong>
            </div>
            {metodoPago === 'efectivo' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-orange-primary)' }}>
                <span>Vuelto Entregado:</span>
                <strong>S/ {vuelto.toFixed(2)}</strong>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handlePrint}
            >
              <Printer size={16} /> Imprimir Comprobante
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={onFinished}
            >
              Finalizar y Volver a Mesas
            </button>
          </div>
        </div>
      ) : !selectedTable ? (
        <div style={{
          background: 'white',
          padding: 60,
          borderRadius: 'var(--radius-xl)',
          textAlign: 'center',
          border: '1px solid var(--color-cream-border)',
          maxWidth: 550,
          margin: '30px auto'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>🧾</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', color: 'var(--color-green-deep)', marginBottom: 8 }}>
            No hay mesas con cuentas por cobrar
          </h3>
          <p style={{ color: 'var(--color-gray-500)', fontSize: '0.9rem', marginBottom: 20 }}>
            Actualmente todas las mesas están libres o no han generado pedidos.
          </p>
          <button type="button" className="btn btn-primary" onClick={onBackToTables}>
            Ir al Salón de Mesas
          </button>
        </div>
      ) : (
        /* Layout de Cobro: Precuenta a la izquierda, Pasarela de Pago a la derecha */
        <div className="checkout-container">
          {/* Precuenta / Desglose de Consumo Acumulado */}
          <div className="precuenta-receipt">
            <div className="receipt-header">
              <div style={{ fontSize: '2rem', marginBottom: 4 }}>🍗</div>
              <h3>POLLERÍA DON BRASA</h3>
              <p className="receipt-meta">RUC: 20608975411 · Av. Los Héroes 452, Lima</p>
              <p className="receipt-meta" style={{ fontWeight: 700, color: 'var(--color-green-deep)', marginTop: 4 }}>
                ESTADO DE CONSUMO · MESA {selectedTable.numero}
              </p>
              <p className="receipt-meta">
                Mozo: {selectedTable.mozoNombre || 'Salón'} · Comensales: {selectedTable.comensales || 2}
              </p>
            </div>

            {loading ? (
              <div style={{ padding: 30, textAlign: 'center', color: 'var(--color-gray-500)' }}>
                Cargando consumo acumulado...
              </div>
            ) : (
              <>
                <table className="receipt-table-summary">
                  <thead>
                    <tr>
                      <th style={{ width: '45%' }}>PLATO / BEBIDA</th>
                      <th style={{ textAlign: 'center' }}>CANT.</th>
                      <th style={{ textAlign: 'right' }}>P. UNIT</th>
                      <th style={{ textAlign: 'right' }}>TOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.length === 0 ? (
                      <tr>
                        <td colSpan={4} style={{ textAlign: 'center', padding: 20, color: 'var(--color-gray-500)' }}>
                          No hay comandas registradas en esta mesa.
                        </td>
                      </tr>
                    ) : (
                      allItems.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{item.nombre}</strong>
                            {item.notas && (
                              <div style={{ fontSize: '0.72rem', color: '#b45309' }}>
                                Nota: {item.notas}
                              </div>
                            )}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 700 }}>{item.cantidad}</td>
                          <td style={{ textAlign: 'right' }}>S/ {item.precioUnitario.toFixed(2)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 700 }}>S/ {item.subtotal.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>

                <div className="receipt-totals-box">
                  <div className="total-row">
                    <span>Op. Gravada (Subtotal sin IGV):</span>
                    <span>S/ {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="total-row">
                    <span>I.G.V. (18% Incluido):</span>
                    <span>S/ {igv.toFixed(2)}</span>
                  </div>
                  <div className="total-row" style={{ color: 'var(--color-gray-500)', fontSize: '0.8rem' }}>
                    <span>Propina Sugerida (10% voluntaria):</span>
                    <span>S/ {propinaSugerida.toFixed(2)}</span>
                  </div>
                  <div className="total-row grand-total">
                    <span>TOTAL A PAGAR:</span>
                    <span style={{ color: 'var(--color-orange-primary)' }}>S/ {total.toFixed(2)}</span>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Formulario de Pago y Cierre */}
          <div className="payment-actions-card">
            <div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', color: 'var(--color-green-deep)', marginBottom: 4 }}>
                Liquidación de Cuenta
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-gray-500)' }}>
                Selecciona la modalidad de cobro y tipo de comprobante.
              </p>
            </div>

            {/* Selector de Método de Pago */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'block', marginBottom: 8 }}>
                Método de Pago
              </label>
              <div className="payment-method-selector">
                <button
                  type="button"
                  className={`method-btn ${metodoPago === 'efectivo' ? 'selected' : ''}`}
                  onClick={() => setMetodoPago('efectivo')}
                >
                  <Banknote size={20} />
                  <span>Efectivo</span>
                </button>

                <button
                  type="button"
                  className={`method-btn ${metodoPago === 'tarjeta' ? 'selected' : ''}`}
                  onClick={() => setMetodoPago('tarjeta')}
                >
                  <CreditCard size={20} />
                  <span>Tarjeta</span>
                </button>

                <button
                  type="button"
                  className={`method-btn ${metodoPago === 'yape' ? 'selected' : ''}`}
                  onClick={() => setMetodoPago('yape')}
                >
                  <Smartphone size={20} />
                  <span>Yape</span>
                </button>

                <button
                  type="button"
                  className={`method-btn ${metodoPago === 'plin' ? 'selected' : ''}`}
                  onClick={() => setMetodoPago('plin')}
                >
                  <QrCode size={20} />
                  <span>Plin</span>
                </button>
              </div>
            </div>

            {/* Si es efectivo, calculadora de vuelto */}
            {metodoPago === 'efectivo' && (
              <div style={{ background: 'var(--color-cream-surface)', padding: 14, borderRadius: 'var(--radius-md)', border: '1px solid var(--color-cream-border)' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'block', marginBottom: 4 }}>
                  Monto Recibido del Cliente (S/)
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="number"
                    step="0.10"
                    placeholder={`Ej. ${(Math.ceil(total / 10) * 10).toFixed(2)}`}
                    className="input-field"
                    style={{ marginTop: 0 }}
                    value={montoRecibido}
                    onChange={(e) => setMontoRecibido(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                    onClick={() => setMontoRecibido(total.toFixed(2))}
                  >
                    Monto Exacto
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: '0.9rem', fontWeight: 800 }}>
                  <span style={{ color: 'var(--color-gray-700)' }}>Vuelto a entregar:</span>
                  <span style={{ color: vuelto > 0 ? '#059669' : 'var(--color-gray-500)', fontSize: '1.1rem' }}>
                    S/ {vuelto.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* Tipo de Comprobante */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'block', marginBottom: 6 }}>
                Tipo de Comprobante
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['ticket', 'boleta', 'factura'] as InvoiceType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipoComprobante(t)}
                    style={{
                      flex: 1,
                      padding: '8px 4px',
                      borderRadius: 'var(--radius-sm)',
                      border: tipoComprobante === t ? '2px solid var(--color-orange-primary)' : '1px solid var(--color-gray-300)',
                      background: tipoComprobante === t ? 'var(--color-orange-light)' : 'white',
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      cursor: 'pointer'
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Datos del Cliente si es Boleta o Factura */}
            {tipoComprobante !== 'ticket' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  placeholder={tipoComprobante === 'factura' ? 'Razón Social' : 'Nombre del Cliente'}
                  className="input-field"
                  style={{ marginTop: 0 }}
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                />
                <input
                  type="text"
                  placeholder={tipoComprobante === 'factura' ? 'Número de RUC (11 dígitos)' : 'DNI (8 dígitos)'}
                  className="input-field"
                  style={{ marginTop: 0 }}
                  value={clienteDocumento}
                  onChange={(e) => setClienteDocumento(e.target.value)}
                />
              </div>
            )}

            {/* Botón de Confirmación */}
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '16px', fontSize: '1rem', fontWeight: 800, marginTop: 'auto' }}
              onClick={handleProcessPayment}
              disabled={isSubmitting || total <= 0}
            >
              <DollarSign size={20} />
              {isSubmitting ? 'Registrando cobro...' : `COBRAR S/ ${total.toFixed(2)} Y LIBERAR MESA`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
