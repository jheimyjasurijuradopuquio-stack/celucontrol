import React, { useState, useEffect } from 'react';
import { DiningTable, Product, Category, OrderItem, PaymentMethod, OrderMode } from '../types';
import {
  subscribeProducts,
  subscribeCategories,
  createKitchenTicket,
  createTakeoutOrder,
  cancelTableAttention,
  getTicketsForAttention
} from '../services/dbService';
import { useAuth } from '../context/AuthContext';
import {
  ArrowLeft,
  Plus,
  Minus,
  Trash2,
  Send,
  Search,
  MessageSquare,
  CheckCircle2,
  ShoppingBag,
  Utensils
} from 'lucide-react';

interface OrderTakingPageProps {
  table?: DiningTable | null;
  onBackToTables: () => void;
  onOrderSent: (atencionId?: string) => void;
  initialMode?: OrderMode;
}

export const OrderTakingPage: React.FC<OrderTakingPageProps> = ({
  table,
  onBackToTables,
  onOrderSent,
  initialMode = 'salon'
}) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modalidad: 'salon' o 'llevar'
  const [mode, setMode] = useState<OrderMode>(initialMode || (table ? 'salon' : 'llevar'));
  const [takeoutNumber, setTakeoutNumber] = useState<string>(() => `PL-${Math.floor(100 + Math.random() * 900)}`);
  const [clienteNombre, setClienteNombre] = useState<string>('');
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>('efectivo');

  // Carrito de la comanda actual
  const [cartItems, setCartItems] = useState<OrderItem[]>([]);
  const [observacionesGenerales, setObservacionesGenerales] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubProd = subscribeProducts(setProducts);
    const unsubCat = subscribeCategories(setCategories);

    return () => {
      unsubProd();
      unsubCat();
    };
  }, []);

  const handleSwitchMode = async (newMode: OrderMode) => {
    if (newMode === mode) return;

    if (newMode === 'salon' && !table) {
      alert('Para tomar pedidos en salón, por favor selecciona o abre una mesa desde el panel de mesas.');
      return;
    }

    if (newMode === 'llevar' && table && table.atencionActivaId) {
      try {
        const existingTickets = await getTicketsForAttention(table.atencionActivaId);
        if (existingTickets.length > 0) {
          alert(`La Mesa ${table.numero} ya tiene ${existingTickets.length} comanda(s) activas y consumo registrado en salón. No se puede cambiar a Para Llevar. Debes cobrar la cuenta de la mesa en Caja antes de iniciar otra atención.`);
          return;
        }

        const confirmCancel = window.confirm(
          `La Mesa ${table.numero} fue abierta pero aún no tiene pedidos enviados a cocina.\n\n¿Deseas cancelar la apertura de la Mesa ${table.numero}, liberarla y continuar en modalidad PARA LLEVAR?`
        );

        if (!confirmCancel) {
          return;
        }

        await cancelTableAttention(table.id, table.atencionActivaId);
        setMode('llevar');
      } catch (err: any) {
        alert('Error al verificar atención de la mesa: ' + err.message);
        return;
      }
    } else {
      setMode(newMode);
    }
  };

  const handleBack = async () => {
    if (mode === 'salon' && table && table.atencionActivaId && cartItems.length === 0) {
      try {
        const existingTickets = await getTicketsForAttention(table.atencionActivaId);
        if (existingTickets.length === 0) {
          const wantToCancel = window.confirm(
            `La Mesa ${table.numero} fue abierta pero no tiene ningún pedido enviado a cocina.\n\n¿Deseas cancelar la apertura y dejar la mesa libre en el salón?`
          );
          if (wantToCancel) {
            await cancelTableAttention(table.id, table.atencionActivaId);
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    onBackToTables();
  };

  const handleAddToCart = (product: Product) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productoId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productoId === product.id
            ? { ...item, cantidad: item.cantidad + 1, subtotal: (item.cantidad + 1) * item.precioUnitario }
            : item
        );
      } else {
        const newItem: OrderItem = {
          id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          productoId: product.id,
          nombre: product.nombre,
          precioUnitario: product.precio, // Precio congelado histórico
          cantidad: 1,
          subtotal: product.precio,
          notas: ''
        };
        return [...prev, newItem];
      }
    });
  };

  const handleUpdateQuantity = (itemId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.id === itemId) {
            const newQty = item.cantidad + delta;
            return newQty > 0
              ? { ...item, cantidad: newQty, subtotal: newQty * item.precioUnitario }
              : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleUpdateNotes = (itemId: string, notes: string) => {
    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notas: notes } : item))
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  // Cálculo total del carrito
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.subtotal, 0);

  // Envío de comanda en salón (flujo original intacto)
  const handleSendComanda = async () => {
    if (cartItems.length === 0) {
      alert('Agrega al menos un producto antes de enviar la comanda.');
      return;
    }

    if (!table || !table.atencionActivaId) {
      alert('Error: La mesa no tiene una atención activa vinculada.');
      return;
    }

    setIsSubmitting(true);

    try {
      await createKitchenTicket(
        table.atencionActivaId,
        table.id,
        table.numero,
        user?.id || 'mozo-01',
        table.mozoNombre || user?.displayName || 'Mozo Salón',
        cartItems,
        observacionesGenerales
      );

      setSuccessToast(`¡Comanda enviada a cocina para Mesa ${table.numero}!`);
      setCartItems([]);
      setObservacionesGenerales('');

      setTimeout(() => {
        onOrderSent();
      }, 1200);
    } catch (err: any) {
      console.error(err);
      alert('Error al enviar comanda a cocina: ' + err.message);
      setIsSubmitting(false);
    }
  };

 
  // Envío de pedido para llevar
  const handleSendTakeoutOrder = async () => {
    if (cartItems.length === 0) {
      alert('Agrega al menos un producto antes de registrar el pedido para llevar.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Si la mesa física fue abierta previamente pero no tiene comandas, liberarla de forma segura
      if (table && table.atencionActivaId) {
        try {
          const tickets = await getTicketsForAttention(table.atencionActivaId);
          if (tickets.length === 0) {
            await cancelTableAttention(table.id, table.atencionActivaId);
          }
        } catch (checkErr) {
          console.warn('Nota al verificar mesa previa:', checkErr);
        }
      }

      const resultado = await createTakeoutOrder(
        user?.id || 'mozo-01',
        user?.displayName || 'Personal Pollería',
        cartItems,
        metodoPago,
        clienteNombre,
        observacionesGenerales,
        takeoutNumber
      );

      setSuccessToast(`¡Pedido Para Llevar #${takeoutNumber} enviado a cocina exitosamente!`);
      setCartItems([]);
      setObservacionesGenerales('');
      setClienteNombre('');
      setTakeoutNumber(`PL-${Math.floor(100 + Math.random() * 900)}`);

      setTimeout(() => {
        onOrderSent(resultado.atencionId);
      }, 1400);
    } catch (err: any) {
      console.error(err);
      alert('Error al registrar pedido para llevar: ' + err.message);
      setIsSubmitting(false);
    }
  };


  // Filtros de productos
  const filteredProducts = products.filter((p) => {
    if (!p.disponible) return false;
    const matchesCategory = selectedCategory === 'todos' || p.categoriaId === selectedCategory;
    const matchesSearch = p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.descripcion.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div>
      {/* Barra superior de control con Selector de Modalidad */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={handleBack}
          style={{ fontSize: '0.85rem' }}
        >
          <ArrowLeft size={16} /> Volver a Mesas
        </button>

        {/* SELECTOR DE MODALIDAD */}
        <div style={{
          display: 'inline-flex',
          background: 'var(--color-cream-surface)',
          padding: 4,
          borderRadius: 30,
          border: '1px solid var(--color-cream-border)',
          gap: 4
        }}>
          <button
            type="button"
            onClick={() => handleSwitchMode('salon')}
            style={{
              padding: '6px 16px',
              borderRadius: 24,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: mode === 'salon' ? 'var(--color-green-primary)' : 'transparent',
              color: mode === 'salon' ? 'white' : 'var(--color-gray-700)',
              transition: 'all 0.2s'
            }}
          >
            <Utensils size={14} /> EN SALÓN
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('llevar')}
            style={{
              padding: '6px 16px',
              borderRadius: 24,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: mode === 'llevar' ? 'var(--color-orange-primary)' : 'transparent',
              color: mode === 'llevar' ? 'white' : 'var(--color-gray-700)',
              transition: 'all 0.2s'
            }}
          >
            <ShoppingBag size={14} /> PARA LLEVAR
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            background: mode === 'llevar' ? 'var(--color-orange-primary)' : 'var(--color-green-primary)',
            color: 'white',
            padding: '6px 14px',
            borderRadius: 20,
            fontSize: '0.85rem',
            fontWeight: 800
          }}>
            {mode === 'llevar' ? `PEDIDO PARA LLEVAR · #${takeoutNumber}` : `TOMA DE PEDIDO · MESA ${table?.numero || '-'}`}
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--color-gray-600)' }}>
            Mozo: <strong>{user?.displayName || table?.mozoNombre || 'Salón'}</strong>
          </span>
        </div>
      </div>

      {successToast && (
        <div style={{
          background: '#d1fae5',
          border: '1px solid #10b981',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: 'var(--radius-md)',
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontWeight: 700
        }}>
          <CheckCircle2 size={20} />
          {successToast}
        </div>
      )}

      {/* Layout Principal: Catálogo a la izquierda, Comanda/Carrito a la derecha */}
      <div className="order-taking-layout">
        {/* Catálogo */}
        <section className="catalog-panel">
          {/* Barra de Búsqueda */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <Search
              size={18}
              color="var(--color-gray-500)"
              style={{ position: 'absolute', left: 12, top: 11 }}
            />
            <input
              type="text"
              placeholder="Buscar en la carta (ej. 1/4 pollo, chaufa, chicha, papas)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 38, marginTop: 0 }}
            />
          </div>

          {/* Filtros de Categoría */}
          <div className="categories-bar">
            <button
              type="button"
              className={`cat-pill ${selectedCategory === 'todos' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('todos')}
            >
              🍗 Todo el Menú
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                className={`cat-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                {cat.icono} {cat.nombre}
              </button>
            ))}
          </div>

          {/* Grid de Productos */}
          <div className="products-grid">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="product-item-card"
                onClick={() => handleAddToCart(prod)}
              >
                <div>
                  <h4>{prod.nombre}</h4>
                  <p>{prod.descripcion}</p>
                </div>
                <div className="product-bottom-row">
                  <span className="product-price">
                    S/ {prod.precio.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    className="btn-add-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(prod);
                    }}
                    title="Agregar a la comanda"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            ))}
            {filteredProducts.length === 0 && (
              <div style={{ gridColumn: '1 / -1', padding: 40, textAlign: 'center', color: 'var(--color-gray-500)' }}>
                No se encontraron productos en esta categoría.
              </div>
            )}
          </div>
        </section>

        {/* Panel de Comanda / Carrito */}
        <aside className="cart-panel">
          <div className="cart-header" style={{
            background: mode === 'llevar' ? 'linear-gradient(135deg, var(--color-orange-primary), #ea580c)' : 'var(--color-green-deep)'
          }}>
            <div>
              <h3>{mode === 'llevar' ? `Para Llevar #${takeoutNumber}` : `Comanda en Mesa ${table?.numero || '-'}`}</h3>
              <small style={{ color: mode === 'llevar' ? '#ffedd5' : '#a3c4b0' }}>
                {mode === 'llevar' ? 'Pedido para llevar a cocina' : 'Nuevos ítems a enviar'}
              </small>
            </div>
            <span>{cartItems.reduce((acc, i) => acc + i.cantidad, 0)} platos</span>
          </div>

          {/* Nombre de cliente opcional para pedidos para llevar */}
          {mode === 'llevar' && (
            <div style={{ padding: '12px 16px', background: 'var(--color-cream-surface)', borderBottom: '1px solid var(--color-cream-border)' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'block', marginBottom: 4 }}>
                Nombre del Cliente (Opcional)
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Juan Pérez / Cliente To-Go"
                value={clienteNombre}
                onChange={(e) => setClienteNombre(e.target.value)}
                style={{ marginTop: 0, padding: '6px 10px', fontSize: '0.82rem' }}
              />
            </div>
          )}

          <div className="cart-items-list">
            {cartItems.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--color-gray-500)' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📝</div>
                <p style={{ fontWeight: 600 }}>La comanda está vacía.</p>
                <small>Selecciona platos o bebidas de la carta para agregarlos.</small>
              </div>
            ) : (
              cartItems.map((item) => (
                <div key={item.id} className="cart-item-row">
                  <div className="cart-item-title-row">
                    <span>{item.nombre}</span>
                    <span style={{ color: 'var(--color-orange-primary)' }}>
                      S/ {item.subtotal.toFixed(2)}
                    </span>
                  </div>

                  <div className="cart-item-controls">
                    <div className="quantity-stepper">
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                      >
                        <Minus size={12} />
                      </button>
                      <span style={{ fontWeight: 800, fontSize: '0.85rem', minWidth: 20, textAlign: 'center' }}>
                        {item.cantidad}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                      title="Eliminar de la comanda"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {/* Campo de Notas Especiales por plato */}
                  <input
                    type="text"
                    className="cart-item-notes-input"
                    placeholder="Nota de cocina (ej. papas bien doradas, pechuga, cremas aparte)"
                    value={item.notas || ''}
                    onChange={(e) => handleUpdateNotes(item.id, e.target.value)}
                  />
                </div>
              ))
            )}
          </div>

          {/* Footer de Comanda */}
          <div className="cart-footer">
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <MessageSquare size={13} /> Observación General de la Comanda
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Ej. Envolver bien / salsas extra"
                value={observacionesGenerales}
                onChange={(e) => setObservacionesGenerales(e.target.value)}
                style={{ fontSize: '0.78rem', padding: '6px 10px', marginTop: 4 }}
              />
            </div>

            {/* Selector de método de pago exclusivo para PARA LLEVAR */}
            {mode === 'llevar' && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-gray-700)', display: 'block', marginBottom: 6 }}>
                  Método de Pago
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
                  {(['efectivo', 'tarjeta', 'yape', 'plin'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMetodoPago(m)}
                      style={{
                        padding: '6px 2px',
                        borderRadius: 'var(--radius-sm)',
                        border: metodoPago === m ? '2px solid var(--color-orange-primary)' : '1px solid var(--color-gray-300)',
                        background: metodoPago === m ? 'var(--color-orange-light)' : 'white',
                        color: metodoPago === m ? 'var(--color-orange-primary)' : 'var(--color-gray-700)',
                        fontWeight: 700,
                        fontSize: '0.72rem',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {m === 'efectivo' ? '💵 Efectivo' : m === 'tarjeta' ? '💳 Tarjeta' : m === 'yape' ? '📱 Yape' : '📲 Plin'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="cart-total-line">
              <span>{mode === 'llevar' ? 'Total a Pagar:' : 'Subtotal Comanda:'}</span>
              <span>S/ {cartSubtotal.toFixed(2)}</span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800 }}
              onClick={mode === 'llevar' ? handleSendTakeoutOrder : handleSendComanda}
              disabled={isSubmitting || cartItems.length === 0}
            >
              <Send size={18} />
              {isSubmitting
                ? 'Registrando pedido...'
                : mode === 'llevar'
                ? `REGISTRAR PEDIDO · S/ ${cartSubtotal.toFixed(2)}`
                : 'ENVIAR COMANDA A COCINA'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
};
