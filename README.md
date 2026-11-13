# Sistema Web de Toma de Pedidos en Sala y Gestión de Comandas · Pollería Don Brasa

Sistema web integral de alta disponibilidad para restaurantes y pollerías tradicionales, desarrollado con **React 19**, **TypeScript**, **Vite** y **Firebase Cloud Firestore**.

---

## 🍗 Características y Módulos Desarrollados

### 1. Sistema de Autenticación y Control de Roles
* **4 Roles Operativos:**
  * **Administrador (`admin`):** Gestión de carta, precios, disponibilidad de platos y reportes de ventas.
  * **Mozo (`mozo`):** Apertura de mesas, comensales, toma de pedidos y comanda de cocina.
  * **Cocina (`cocina`):** Monitor Kanban en tiempo real con alertas y cronómetro de preparación.
  * **Cajero (`cajero`):** Consulta de consumo acumulado, emisión de boletas/facturas/tickets y cobro.
* **Selector Rápido de Roles:** Barra de cambio de rol inmediata para pruebas y demostraciones operativas en sala.
* **Integración Firebase Auth:** Compatible con sesiones persistentes y autenticación por correo/contraseña.

### 2. Panel de Salón & Control de Mesas
* Cuadrícula interactiva de 12 mesas con indicadores de estado:
  * **Libre (Verde):** Permite abrir mesa ingresando mozo a cargo y número de comensales.
  * **Ocupada (Naranja):** Muestra mozo responsable, comensales y acceso rápido a *Pedir* o *Cuenta*.
  * **Por Cobrar (Ámbar):** Alerta de comensales listos para liquidación de cuenta.
* Filtros rápidos por estado de mesa y métricas en vivo.

### 3. Carta Tradicional de Pollería Peruana & Precarga de Semilla
* Catálogo clasificado por categorías:
  * *Pollos a la Brasa* (1/4 Pollo, 1/2 Pollo, Pollo Entero, Pollo Parrillero Familiar).
  * *Mostritos & Chaufas* (Mostrito clásico, Mostrito Don Brasa, Chaufa al Wok).
  * *Guarniciones & Porciones* (Papas nativas fritas, Tequeños polleros, Ensalada rusa, Papas familiares).
  * *Parrillas & Anticuchos* (Anticuchos clásicos de corazón, Piqueo Pollero).
  * *Bebidas & Refrescos* (Chicha morada casera en jarra y vaso, Inka Kola, Coca Cola).
  * *Cervezas & Tragos* (Cusqueña, Pilsen).
  * *Postres Tradicionales* (Torta de chocolate, Suspiro a la limeña).
* **Botón de Inicialización Semilla en 1 Clic:** Puebla automáticamente las 12 mesas y la carta completa en Firestore si la base de datos se encuentra vacía.

### 4. Toma de Pedidos, Comandas y Prevención de Duplicados
* Buscador en tiempo real por nombre de plato o código.
* Filtros interactivos por pastillas de categoría.
* Carrito de comanda con selector de cantidades y notas personalizadas por plato (ej. *"papas bien doradas"*, *"pechuga sin ensalada"*, *"cremas aparte"*).
* **Precios Históricos Congelados:** Cada comanda registra el precio unitario del ítem en el instante exacto de la orden. Modificaciones futuras de la carta no alteran órdenes pasadas ni cuentas abiertas.
* **Protección Idempotente contra Duplicados:** Bloqueo transaccional del botón de envío (`isSubmitting`) durante la mutación de Firestore.
* **Comandas Adicionales:** Permite agregar múltiples comandas secuenciales a una misma mesa abierta, acumulando el total automáticamente.

### 5. Monitor de Cocina en Tiempo Real (`onSnapshot`)
* Tablero Kanban con sincronización continua mediante escucha de Firestore `onSnapshot`.
* Flujo de estados: `Pendiente` $\rightarrow$ `En Brasas (Preparando)` $\rightarrow$ `¡Listo para Salir!` $\rightarrow$ `Entregado a Sala`.
* **Cronómetro de Demora:** Calcula los minutos transcurridos desde el envío de la comanda con alertas de color (< 12 min normal, 12-20 min aviso ámbar, > 20 min demora crítica en rojo).
* Resaltado visual de notas especiales y requerimientos del cliente.

### 6. Caja, Consumo Acumulado y Cierre de Mesa
* Desglose detallado de todos los ítems ordenados en la mesa.
* Cálculo de Op. Gravada (Subtotal), IGV (18% incluido) y Propina sugerida (10%).
* Métodos de Pago:
  * **Efectivo:** Calculadora integrada de monto recibido y vuelto en soles.
  * **Tarjeta:** POS / Débito / Crédito.
  * **Yape / Plin:** Billeteras digitales peruanas.
* Tipos de Comprobante: Ticket, Boleta o Factura (con validación de RUC de 11 dígitos).
* **Cierre Atómico:** Actualiza Firestore en una única transacción:
  1. Registra el pago en la colección `pagos`.
  2. Cierra la atención (`estado: 'cerrada'`).
  3. Libera inmediatamente la mesa (`estado: 'libre'`).

### 7. Reportes de Ventas
* Total facturado en el día.
* Conteo de mesas y atenciones cerradas.
* Ticket promedio por mesa.
* Desglose de ingresos por Efectivo, Tarjetas y Billeteras Digitales.
* Historial de comprobantes emitidos con detalle de cajero y mesa.

---

## 🛠️ Tecnologías y Configuración

* **Frontend:** React 19, TypeScript, Vite 8, Lucide React.
* **Backend & Persistencia:** Firebase Cloud Firestore & Firebase Auth.
* **Estilos:** CSS3 modular con diseño profesional pollería (verde oscuro `#123826`, naranja `#D9531E`, crema `#F9F7F2` y blanco).

---

## 🚀 Comandos de Ejecución

### 1. Iniciar en Desarrollo
```bash
npm run dev
```

### 2. Verificar Tipado TypeScript
```bash
npx tsc --noEmit
```

### 3. Compilar para Producción
```bash
npm run build
```

### 4. Previsualizar Build de Producción
```bash
npm run preview
```

---

## 🔒 Reglas de Seguridad de Firestore (`firestore.rules`)
El archivo [`firestore.rules`](./firestore.rules) se encuentra incluido en la raíz del proyecto para su despliegue inmediato con:
```bash
firebase deploy --only firestore:rules
```
