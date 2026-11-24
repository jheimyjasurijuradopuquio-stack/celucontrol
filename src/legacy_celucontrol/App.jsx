
import { useEffect, useState } from "react";
import {
  ref,
  push,
  set,
  onValue,
  update,
  remove
} from "firebase/database";
import { database } from "./firebase";
import "./index.css";

const initialForm = {
  codigo: "",
  modelo: "",
  marca: "",
  precio: "",
  ram: "",
  pantalla: ""
};

function App() {
  const [celulares, setCelulares] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editando, setEditando] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [mensaje, setMensaje] = useState("");

  useEffect(() => {
    const celularesRef = ref(database, "celulares");

    const unsubscribe = onValue(celularesRef, (snapshot) => {
      const data = snapshot.val();

      if (data) {
        const lista = Object.entries(data).map(([id, celular]) => ({
          id,
          ...celular
        }));
        setCelulares(lista);
      } else {
        setCelulares([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const manejarCambio = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const guardarCelular = async (e) => {
    e.preventDefault();

    if (
      !form.codigo.trim() ||
      !form.modelo.trim() ||
      !form.marca.trim() ||
      !form.precio ||
      !form.ram.trim() ||
      !form.pantalla
    ) {
      setMensaje("Completa todos los campos.");
      return;
    }

    const precio = Number(form.precio);
    const pantalla = Number(form.pantalla);

    if (!Number.isFinite(precio) || precio <= 0 ||
        !Number.isFinite(pantalla) || pantalla <= 0) {
      setMensaje("Ingresa un precio y una pantalla válidos.");
      return;
    }

    const codigo = form.codigo.trim().toUpperCase();

    const repetido = celulares.some(
      (c) => c.codigo.toUpperCase() === codigo && c.id !== editando
    );

    if (repetido) {
      setMensaje("Ese código de celular ya está registrado.");
      return;
    }

    const datos = {
      ...form,
      codigo,
      modelo: form.modelo.trim(),
      marca: form.marca.trim(),
      ram: form.ram.trim(),
      precio,
      pantalla
    };

    try {
      if (editando) {
        await update(ref(database, `celulares/${editando}`), datos);
        setMensaje("Celular actualizado correctamente.");
      } else {
        const nuevoCelular = push(ref(database, "celulares"));
        await set(nuevoCelular, datos);
        setMensaje("Celular registrado correctamente.");
      }

      setForm(initialForm);
      setEditando(null);
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo guardar. Revisa la conexión y las reglas de Firebase.");
    }
  };

  const editarCelular = (celular) => {
    setForm({
      codigo: celular.codigo,
      modelo: celular.modelo,
      marca: celular.marca,
      precio: String(celular.precio),
      ram: celular.ram,
      pantalla: String(celular.pantalla)
    });

    setEditando(celular.id);
    setMensaje("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const eliminarCelular = async (id) => {
    if (!window.confirm("¿Estás segura de eliminar este celular?")) return;

    try {
      await remove(ref(database, `celulares/${id}`));
      setMensaje("Celular eliminado correctamente.");

      if (editando === id) {
        cancelarEdicion();
      }
    } catch (error) {
      console.error(error);
      setMensaje("No se pudo eliminar el celular.");
    }
  };

  const cancelarEdicion = () => {
    setForm(initialForm);
    setEditando(null);
    setMensaje("");
  };

  const filtrados = celulares.filter((c) =>
    [c.codigo, c.modelo, c.marca]
      .join(" ")
      .toLowerCase()
      .includes(busqueda.toLowerCase())
  );

  const totalInventario = celulares.reduce(
    (total, c) => total + Number(c.precio || 0),
    0
  );

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">📱</div>
          <div>
            <h2>CELUCONTROL</h2>
            <span>ADMINISTRACIÓN</span>
          </div>
        </div>

        <div className="menu-label">MENÚ PRINCIPAL</div>
        <a className="menu-item active" href="#inicio">▦ Panel principal</a>
        <a className="menu-item" href="#registro">＋ Registrar celular</a>
        <a className="menu-item" href="#inventario">▤ Inventario</a>

        <div className="sidebar-footer">
          <div className="status-dot"></div>
          Firebase conectado
          <small>Gestión de celulares</small>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar" id="inicio">
          <div>
            <p className="eyebrow">SISTEMA DE ADMINISTRACIÓN</p>
            <h1>Panel principal</h1>
          </div>
          <div className="admin-profile">
            <div className="avatar">A</div>
            <div>
              <strong>Administrador</strong>
              <small>CELUCONTROL</small>
            </div>
          </div>
        </header>

        <section className="welcome">
          <div>
            <span className="welcome-tag">BIENVENIDO</span>
            <h2>Controla tu inventario de celulares.</h2>
            <p>Registra, consulta y administra tus dispositivos desde un solo lugar.</p>
          </div>
          <div className="welcome-phone">📱</div>
        </section>

        <section className="stats">
          <article className="stat-card">
            <div className="stat-icon purple">▣</div>
            <div>
              <span>Total de celulares</span>
              <strong>{celulares.length}</strong>
              <small>Dispositivos registrados</small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon green">✓</div>
            <div>
              <span>Marcas registradas</span>
              <strong>{new Set(celulares.map(c => c.marca.toLowerCase())).size}</strong>
              <small>Marcas diferentes</small>
            </div>
          </article>

          <article className="stat-card">
            <div className="stat-icon orange">S/</div>
            <div>
              <span>Valor del inventario</span>
              <strong>S/ {totalInventario.toLocaleString("es-PE", { minimumFractionDigits: 2 })}</strong>
              <small>Suma de precios registrados</small>
            </div>
          </article>
        </section>

        <section className="panel form-panel" id="registro">
          <div className="section-heading">
            <div>
              <span className="eyebrow">GESTIÓN DE DISPOSITIVOS</span>
              <h2>{editando ? "Editar celular" : "Registrar nuevo celular"}</h2>
              <p>Completa la información del dispositivo.</p>
            </div>
            <span className="heading-icon">＋</span>
          </div>

          <form onSubmit={guardarCelular}>
            <div className="form-grid">
              <label>
                Código de celular
                <input name="codigo" value={form.codigo} onChange={manejarCambio} placeholder="Ej. CEL001" />
              </label>

              <label>
                Modelo
                <input name="modelo" value={form.modelo} onChange={manejarCambio} placeholder="Ej. Galaxy A55" />
              </label>

              <label>
                Marca
                <input name="marca" value={form.marca} onChange={manejarCambio} placeholder="Ej. Samsung" />
              </label>

              <label>
                Precio (S/)
                <input name="precio" type="number" min="0.01" step="0.01" value={form.precio} onChange={manejarCambio} placeholder="Ej. 1299.00" />
              </label>

              <label>
                Memoria RAM
                <select name="ram" value={form.ram} onChange={manejarCambio}>
                  <option value="">Seleccionar RAM</option>
                  <option value="2 GB">2 GB</option>
                  <option value="3 GB">3 GB</option>
                  <option value="4 GB">4 GB</option>
                  <option value="6 GB">6 GB</option>
                  <option value="8 GB">8 GB</option>
                  <option value="12 GB">12 GB</option>
                  <option value="16 GB">16 GB</option>
                  <option value="Otro">Otro</option>
                </select>
              </label>

              <label>
                Tamaño de pantalla (pulgadas)
                <input name="pantalla" type="number" min="0.1" step="0.1" value={form.pantalla} onChange={manejarCambio} placeholder="Ej. 6.6" />
              </label>
            </div>

            {mensaje && (
              <div className="message">{mensaje}</div>
            )}

            <div className="form-actions">
              {editando && (
                <button type="button" className="btn-secondary" onClick={cancelarEdicion}>
                  Cancelar
                </button>
              )}
              <button type="submit" className="btn-primary">
                {editando ? "Guardar cambios" : "＋ Registrar celular"}
              </button>
            </div>
          </form>
        </section>

        <section className="panel inventory-panel" id="inventario">
          <div className="section-heading inventory-heading">
            <div>
              <span className="eyebrow">BASE DE DATOS</span>
              <h2>Inventario de celulares</h2>
              <p>Consulta y administra todos tus dispositivos.</p>
            </div>
            <div className="count-badge">{celulares.length} registros</div>
          </div>

          <div className="search-box">
            <span>⌕</span>
            <input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por código, modelo o marca..."
            />
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>MODELO</th>
                  <th>MARCA</th>
                  <th>PRECIO</th>
                  <th>RAM</th>
                  <th>PANTALLA</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.length > 0 ? (
                  filtrados.map((celular) => (
                    <tr key={celular.id}>
                      <td><span className="code-tag">{celular.codigo}</span></td>
                      <td><strong>{celular.modelo}</strong></td>
                      <td>{celular.marca}</td>
                      <td className="price">S/ {Number(celular.precio).toFixed(2)}</td>
                      <td>{celular.ram}</td>
                      <td>{celular.pantalla}″</td>
                      <td>
                        <div className="actions">
                          <button className="edit-btn" onClick={() => editarCelular(celular)} title="Editar">✎</button>
                          <button className="delete-btn" onClick={() => eliminarCelular(celular.id)} title="Eliminar">⌫</button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="empty-state">
                      <div>📱</div>
                      <strong>{busqueda ? "No se encontraron resultados" : "Aún no hay celulares registrados"}</strong>
                      <p>{busqueda ? "Prueba con otra búsqueda." : "Utiliza el formulario para agregar tu primer celular."}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className="footer">
          CELUCONTROL © 2026 · Sistema de administración de celulares
          <span>Desarrollado con React + Firebase</span>
        </footer>
      </main>
    </div>
  );
}

export default App;

