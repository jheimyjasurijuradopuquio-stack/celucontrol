import React, { useState, useEffect } from 'react';
import { Product, Category } from '../types';
import {
  subscribeProducts,
  subscribeCategories,
  addProduct,
  updateProduct,
  deleteProduct,
  seedInitialPolleriaData
} from '../services/dbService';
import {
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Search,
  CheckCircle,
  XCircle,
  Utensils
} from 'lucide-react';

export const MenuManagementPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todas');
  
  // Modal de Crear / Editar
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formCodigo, setFormCodigo] = useState('');
  const [formNombre, setFormNombre] = useState('');
  const [formCategoriaId, setFormCategoriaId] = useState('');
  const [formPrecio, setFormPrecio] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formDisponible, setFormDisponible] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [seedSuccess, setSeedSuccess] = useState<string | null>(null);

  useEffect(() => {
    const unsubProd = subscribeProducts(setProducts);
    const unsubCat = subscribeCategories((cats) => {
      setCategories(cats);
      if (cats.length > 0 && !formCategoriaId) {
        setFormCategoriaId(cats[0].id);
      }
    });

    return () => {
      unsubProd();
      unsubCat();
    };
  }, []);

  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setFormCodigo(`POL-${Math.floor(100 + Math.random() * 900)}`);
    setFormNombre('');
    setFormCategoriaId(categories[0]?.id || '');
    setFormPrecio('');
    setFormDescripcion('');
    setFormDisponible(true);
    setModalOpen(true);
  };

  const handleOpenEditModal = (p: Product) => {
    setEditingProduct(p);
    setFormCodigo(p.codigo || '');
    setFormNombre(p.nombre);
    setFormCategoriaId(p.categoriaId);
    setFormPrecio(p.precio.toString());
    setFormDescripcion(p.descripcion);
    setFormDisponible(p.disponible);
    setModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNombre.trim()) {
      alert('Ingresa el nombre del producto.');
      return;
    }

    const price = parseFloat(formPrecio);
    if (isNaN(price) || price <= 0) {
      alert('Ingresa un precio válido mayor a 0.');
      return;
    }

    const catObj = categories.find((c) => c.id === formCategoriaId);
    const categoriaNombre = catObj ? catObj.nombre : 'Pollería';

    setIsSubmitting(true);
    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          codigo: formCodigo.trim(),
          nombre: formNombre.trim(),
          categoriaId: formCategoriaId,
          categoriaNombre,
          precio: price,
          descripcion: formDescripcion.trim(),
          disponible: formDisponible
        });
      } else {
        await addProduct({
          codigo: formCodigo.trim(),
          nombre: formNombre.trim(),
          categoriaId: formCategoriaId,
          categoriaNombre,
          precio: price,
          descripcion: formDescripcion.trim(),
          disponible: formDisponible
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      alert('Error al guardar producto: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleDisponible = async (p: Product) => {
    try {
      await updateProduct(p.id, { disponible: !p.disponible });
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  const handleSeed = async () => {
    if (window.confirm('¿Deseas precargar la carta completa de Pollería Don Brasa en Firestore?')) {
      try {
        const res = await seedInitialPolleriaData();
        setSeedSuccess(`¡Se generaron ${res.productsCreated} productos y ${res.tablesCreated} mesas!`);
        setTimeout(() => setSeedSuccess(null), 4000);
      } catch (err: any) {
        alert('Error poblando base de datos: ' + err.message);
      }
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = categoryFilter === 'todas' || p.categoriaId === categoryFilter;
    const matchesSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
                          p.descripcion.toLowerCase().includes(search.toLowerCase()) ||
                          (p.codigo && p.codigo.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  return (
    <div>
      {/* Barra de Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} color="var(--color-gray-500)" style={{ position: 'absolute', left: 12, top: 11 }} />
            <input
              type="text"
              placeholder="Buscar plato o código..."
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ marginTop: 0, paddingLeft: 36, width: 260 }}
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="input-field"
            style={{ marginTop: 0, width: 'auto' }}
          >
            <option value="todas">Todas las Categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleSeed}
          >
            <Sparkles size={16} color="var(--color-orange-primary)" />
            Poblar Carta Tradicional
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleOpenCreateModal}
          >
            <Plus size={16} />
            Nuevo Plato / Bebida
          </button>
        </div>
      </div>

      {seedSuccess && (
        <div style={{ background: '#d1fae5', color: '#065f46', padding: '10px 16px', borderRadius: 'var(--radius-md)', marginBottom: 16, fontWeight: 700 }}>
          ✓ {seedSuccess}
        </div>
      )}

      {/* Tabla de Productos */}
      <div style={{ background: 'white', borderRadius: 'var(--radius-xl)', border: '1px solid var(--color-cream-border)', overflow: 'hidden', boxShadow: 'var(--shadow-sm)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ background: 'var(--color-cream-surface)', borderBottom: '1px solid var(--color-cream-border)', fontSize: '0.8rem', color: 'var(--color-gray-700)' }}>
              <th style={{ padding: '14px 18px' }}>CÓDIGO</th>
              <th style={{ padding: '14px 18px' }}>NOMBRE DEL PLATO</th>
              <th style={{ padding: '14px 18px' }}>CATEGORÍA</th>
              <th style={{ padding: '14px 18px' }}>PRECIO</th>
              <th style={{ padding: '14px 18px' }}>ESTADO</th>
              <th style={{ padding: '14px 18px', textAlign: 'right' }}>ACCIONES</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--color-gray-500)' }}>
                  No se encontraron productos registrados.
                </td>
              </tr>
            ) : (
              filtered.map((prod) => (
                <tr key={prod.id} style={{ borderBottom: '1px solid var(--color-gray-100)', fontSize: '0.85rem' }}>
                  <td style={{ padding: '14px 18px', fontWeight: 700, color: 'var(--color-gray-500)' }}>
                    {prod.codigo || 'S/C'}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <strong style={{ color: 'var(--color-green-deep)', display: 'block' }}>{prod.nombre}</strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)' }}>{prod.descripcion}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: 'var(--color-cream-surface)', padding: '3px 8px', borderRadius: 12, fontSize: '0.75rem', fontWeight: 600 }}>
                      {prod.categoriaNombre || 'General'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px', fontWeight: 800, color: 'var(--color-orange-primary)', fontSize: '0.95rem' }}>
                    S/ {prod.precio.toFixed(2)}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <button
                      type="button"
                      onClick={() => handleToggleDisponible(prod)}
                      style={{
                        background: prod.disponible ? '#d1fae5' : '#fee2e2',
                        color: prod.disponible ? '#065f46' : '#991b1b',
                        border: 'none',
                        padding: '4px 8px',
                        borderRadius: 12,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      {prod.disponible ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {prod.disponible ? 'Disponible' : 'Agotado'}
                    </button>
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 6 }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem' }}
                        onClick={() => handleOpenEditModal(prod)}
                        title="Editar plato"
                      >
                        <Edit2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Crear / Editar */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProduct ? 'Editar Plato / Bebida' : 'Nuevo Plato o Bebida'}</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct}>
              <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Código</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formCodigo}
                    onChange={(e) => setFormCodigo(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Nombre del Plato</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formNombre}
                    onChange={(e) => setFormNombre(e.target.value)}
                    placeholder="Ej. 1/4 Pollo a la Brasa"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Categoría</label>
                  <select
                    className="input-field"
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(e.target.value)}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Precio de Venta (S/)</label>
                  <input
                    type="number"
                    step="0.50"
                    min="0.10"
                    className="input-field"
                    value={formPrecio}
                    onChange={(e) => setFormPrecio(e.target.value)}
                    placeholder="Ej. 24.00"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 700 }}>Descripción / Ingredientes</label>
                <textarea
                  className="input-field"
                  rows={3}
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej. Acompañado de papas fritas y ensalada clásica..."
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <input
                  type="checkbox"
                  id="chkDisponible"
                  checked={formDisponible}
                  onChange={(e) => setFormDisponible(e.target.checked)}
                />
                <label htmlFor="chkDisponible" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                  Disponible para venta en sala
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
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
                  {isSubmitting ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Guardar Plato'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
