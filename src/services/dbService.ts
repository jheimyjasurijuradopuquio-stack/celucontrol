import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase.ts';
import {
  DiningTable,
  Product,
  Category,
  KitchenTicket,
  TableAttention,
  PaymentReceipt,
  OrderItem,
  TicketStatus,
  PaymentMethod
} from '../types';

// ==========================================
// 1. GESTIÓN DE MESAS
// ==========================================

export const subscribeTables = (callback: (tables: DiningTable[]) => void) => {
  const tablesRef = collection(db, 'mesas');
  const q = query(tablesRef, orderBy('numero', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const tables: DiningTable[] = [];
    snapshot.forEach((docSnap) => {
      tables.push({ id: docSnap.id, ...(docSnap.data() as Omit<DiningTable, 'id'>) });
    });
    callback(tables);
  }, (error) => {
    console.error('Error al suscribirse a mesas:', error);
  });
};

export const openTableAttention = async (
  mesaId: string,
  mesaNumero: number,
  mozoId: string,
  mozoNombre: string,
  comensales: number
): Promise<string> => {
  const atencionesRef = collection(db, 'atenciones');
  const nuevaAtencion: Omit<TableAttention, 'id'> = {
    mesaId,
    mesaNumero,
    mozoId,
    mozoNombre,
    comensales,
    estado: 'abierta',
    comandasIds: [],
    totalAcumulado: 0,
    subtotal: 0,
    igv: 0,
    fechaApertura: serverTimestamp()
  };

  const docRef = await addDoc(atencionesRef, nuevaAtencion);

  // Actualizar estado de la mesa
  const mesaRef = doc(db, 'mesas', mesaId);
  await updateDoc(mesaRef, {
    estado: 'ocupada',
    mozoId,
    mozoNombre,
    comensales,
    atencionActivaId: docRef.id,
    ultimaActualizacion: serverTimestamp()
  });

  return docRef.id;
};

// ==========================================
// 2. GESTIÓN DE COMANDAS (COCINA Y SALÓN)
// ==========================================

export const createKitchenTicket = async (
  atencionId: string,
  mesaId: string,
  mesaNumero: number,
  mozoId: string,
  mozoNombre: string,
  items: OrderItem[],
  observaciones?: string
): Promise<string> => {
  if (!items || items.length === 0) {
    throw new Error('No se pueden enviar comandas sin productos seleccionados.');
  }

  // Obtener conteo de comandas existentes para esta atención para numeración
  const comandasQuery = query(
    collection(db, 'comandas'),
    where('atencionId', '==', atencionId)
  );
  const snapshot = await getDocs(comandasQuery);
  const numeroComanda = snapshot.size + 1;

  // Calcular subtotal de esta comanda
  const subtotalComanda = items.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);

  const nuevaComanda: Omit<KitchenTicket, 'id'> = {
    atencionId,
    mesaId,
    mesaNumero,
    numeroComanda,
    mozoId,
    mozoNombre,
    items,
    estado: 'pendiente',
    observaciones: observaciones || '',
    creadaEn: serverTimestamp(),
    actualizadaEn: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'comandas'), nuevaComanda);

  // Actualizar atención vinculada acumulando el total y agregando la comanda
  const atencionRef = doc(db, 'atenciones', atencionId);
  const atencionSnap = await getDoc(atencionRef);
  
  if (atencionSnap.exists()) {
    const atencionData = atencionSnap.data() as TableAttention;
    const nuevoTotal = (atencionData.totalAcumulado || 0) + subtotalComanda;
    const nuevoSubtotal = +(nuevoTotal / 1.18).toFixed(2);
    const nuevoIgv = +(nuevoTotal - nuevoSubtotal).toFixed(2);
    const comandasIds = [...(atencionData.comandasIds || []), docRef.id];

    await updateDoc(atencionRef, {
      totalAcumulado: nuevoTotal,
      subtotal: nuevoSubtotal,
      igv: nuevoIgv,
      comandasIds
    });
  }

  return docRef.id;
};

export const createTakeoutOrder = async (
  mozoId: string,
  mozoNombre: string,
  items: OrderItem[],
  metodoPago: PaymentMethod,
  clienteNombre?: string,
  observaciones?: string,
  numeroPedido?: string
): Promise<{ comandaId: string; atencionId: string }> => {
  if (!items || items.length === 0) {
    throw new Error('No se pueden enviar pedidos sin productos seleccionados.');
  }

  const subtotalItems = items.reduce((acc, item) => acc + (item.precioUnitario * item.cantidad), 0);
  const subtotalGravado = +(subtotalItems / 1.18).toFixed(2);
  const igv = +(subtotalItems - subtotalGravado).toFixed(2);
  const codigoPedido = numeroPedido || `PL-${Math.floor(100 + Math.random() * 900)}`;

  // 1. Crear documento en 'atenciones'
  const atencionesRef = collection(db, 'atenciones');
  const atencionDoc = await addDoc(atencionesRef, {
    mesaId: 'llevar',
    mesaNumero: 0,
    mozoId,
    mozoNombre,
    comensales: 1,
    estado: 'cerrada',
    tipo: 'llevar',
    numeroPedido: codigoPedido,
    clienteNombre: clienteNombre?.trim() || 'Cliente Para Llevar',
    comandasIds: [],
    totalAcumulado: subtotalItems,
    subtotal: subtotalGravado,
    igv,
    metodoPago,
    fechaApertura: serverTimestamp(),
    fechaCierre: serverTimestamp()
  });

  // 2. Crear documento en 'comandas' para cocina
  const comandasRef = collection(db, 'comandas');
  const comandaDoc = await addDoc(comandasRef, {
    atencionId: atencionDoc.id,
    mesaId: 'llevar',
    mesaNumero: 0,
    numeroComanda: 1,
    tipo: 'llevar',
    numeroPedido: codigoPedido,
    clienteNombre: clienteNombre?.trim() || 'Cliente Para Llevar',
    mozoId,
    mozoNombre,
    items,
    estado: 'pendiente',
    observaciones: observaciones || '',
    metodoPago,
    total: subtotalItems,
    creadaEn: serverTimestamp(),
    actualizadaEn: serverTimestamp()
  });

  // Actualizar atención con comandaId
  await updateDoc(doc(db, 'atenciones', atencionDoc.id), {
    comandasIds: [comandaDoc.id]
  });

  // 3. Registrar en 'pagos' si el usuario tiene permisos (cajero/admin)
  try {
    const pagosRef = doc(collection(db, 'pagos'));
    await setDoc(pagosRef, {
      atencionId: atencionDoc.id,
      mesaNumero: 0,
      tipo: 'llevar',
      numeroPedido: codigoPedido,
      subtotal: subtotalGravado,
      igv,
      total: subtotalItems,
      metodoPago,
      montoRecibido: subtotalItems,
      vuelto: 0,
      tipoComprobante: 'ticket',
      clienteNombre: clienteNombre?.trim() || 'Cliente Para Llevar',
      cajeroId: mozoId,
      cajeroNombre: mozoNombre,
      fechaPago: serverTimestamp()
    });
  } catch (pagoErr) {
    console.info('Registro opcional en /pagos para pedido para llevar:', pagoErr);
  }

  return { comandaId: comandaDoc.id, atencionId: atencionDoc.id };
};

export const subscribeKitchenTickets = (
  callback: (tickets: KitchenTicket[]) => void,
  estadosPermitidos?: TicketStatus[]
) => {
  const comandasRef = collection(db, 'comandas');
  const q = query(comandasRef, orderBy('creadaEn', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const tickets: KitchenTicket[] = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const ticket: KitchenTicket = {
        id: docSnap.id,
        atencionId: data.atencionId,
        mesaId: data.mesaId,
        mesaNumero: data.mesaNumero,
        numeroComanda: data.numeroComanda || 1,
        mozoId: data.mozoId,
        mozoNombre: data.mozoNombre,
        items: data.items || [],
        estado: data.estado,
        observaciones: data.observaciones || '',
        creadaEn: data.creadaEn,
        actualizadaEn: data.actualizadaEn,
        tipo: data.tipo || 'salon',
        numeroPedido: data.numeroPedido || '',
        clienteNombre: data.clienteNombre || '',
        metodoPago: data.metodoPago,
        total: data.total
      };

      if (!estadosPermitidos || estadosPermitidos.includes(ticket.estado)) {
        tickets.push(ticket);
      }
    });
    callback(tickets);
  }, (error) => {
    console.error('Error al escuchar comandas en tiempo real:', error);
  });
};

export const updateKitchenTicketStatus = async (
  ticketId: string,
  nuevoEstado: TicketStatus
) => {
  const ticketRef = doc(db, 'comandas', ticketId);
  await updateDoc(ticketRef, {
    estado: nuevoEstado,
    actualizadaEn: serverTimestamp()
  });
};

// ==========================================
// 3. ATENCIONES, CONSUMO ACUMULADO Y PAGOS
// ==========================================

export const subscribeAttention = (
  atencionId: string,
  callback: (attention: TableAttention | null) => void
) => {
  const atencionRef = doc(db, 'atenciones', atencionId);
  return onSnapshot(atencionRef, (docSnap) => {
    if (docSnap.exists()) {
      callback({ id: docSnap.id, ...(docSnap.data() as Omit<TableAttention, 'id'>) });
    } else {
      callback(null);
    }
  });
};

export const getTicketsForAttention = async (atencionId: string): Promise<KitchenTicket[]> => {
  const q = query(
    collection(db, 'comandas'),
    where('atencionId', '==', atencionId)
  );
  const snapshot = await getDocs(q);
  const tickets: KitchenTicket[] = [];
  snapshot.forEach((docSnap) => {
    tickets.push({ id: docSnap.id, ...(docSnap.data() as Omit<KitchenTicket, 'id'>) });
  });
  tickets.sort((a, b) => (a.numeroComanda || 1) - (b.numeroComanda || 1));
  return tickets;
};

export const subscribeAttentionTickets = (
  atencionId: string,
  callback: (tickets: KitchenTicket[]) => void
) => {
  const q = query(
    collection(db, 'comandas'),
    where('atencionId', '==', atencionId)
  );
  return onSnapshot(q, (snapshot) => {
    const tickets: KitchenTicket[] = [];
    snapshot.forEach((docSnap) => {
      tickets.push({ id: docSnap.id, ...(docSnap.data() as Omit<KitchenTicket, 'id'>) });
    });
    tickets.sort((a, b) => (a.numeroComanda || 1) - (b.numeroComanda || 1));
    callback(tickets);
  }, (err) => {
    console.error('Error al escuchar comandas de la mesa:', err);
  });
};

export const registerPaymentAndCloseTable = async (
  atencionId: string,
  mesaId: string,
  mesaNumero: number,
  pago: Omit<PaymentReceipt, 'id' | 'atencionId' | 'mesaNumero' | 'fechaPago'>
): Promise<string> => {
  const batch = writeBatch(db);

  // 1. Crear documento de pago
  const pagosRef = doc(collection(db, 'pagos'));
  const recibo: Omit<PaymentReceipt, 'id'> = {
    ...pago,
    atencionId,
    mesaNumero,
    fechaPago: serverTimestamp()
  };
  batch.set(pagosRef, recibo);

  // 2. Cerrar atención
  const atencionRef = doc(db, 'atenciones', atencionId);
  batch.update(atencionRef, {
    estado: 'cerrada',
    metodoPago: pago.metodoPago,
    fechaCierre: serverTimestamp()
  });

  // 3. Liberar mesa
  const mesaRef = doc(db, 'mesas', mesaId);
  batch.update(mesaRef, {
    estado: 'libre',
    mozoId: null,
    mozoNombre: null,
    comensales: null,
    atencionActivaId: null,
    ultimaActualizacion: serverTimestamp()
  });

  await batch.commit();
  return pagosRef.id;
};

// ==========================================
// 4. GESTIÓN DE PRODUCTOS Y CATEGORÍAS
// ==========================================

export const subscribeCategories = (callback: (categories: Category[]) => void) => {
  const catRef = collection(db, 'categorias');
  const q = query(catRef, orderBy('orden', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const categories: Category[] = [];
    snapshot.forEach((docSnap) => {
      categories.push({ id: docSnap.id, ...(docSnap.data() as Omit<Category, 'id'>) });
    });
    callback(categories);
  });
};

export const subscribeProducts = (callback: (products: Product[]) => void) => {
  const prodRef = collection(db, 'productos');
  const q = query(prodRef, orderBy('nombre', 'asc'));

  return onSnapshot(q, (snapshot) => {
    const products: Product[] = [];
    snapshot.forEach((docSnap) => {
      products.push({ id: docSnap.id, ...(docSnap.data() as Omit<Product, 'id'>) });
    });
    callback(products);
  });
};

export const addProduct = async (product: Omit<Product, 'id'>) => {
  return await addDoc(collection(db, 'productos'), product);
};

export const updateProduct = async (id: string, product: Partial<Product>) => {
  const prodRef = doc(db, 'productos', id);
  await updateDoc(prodRef, product);
};

export const deleteProduct = async (id: string) => {
  const prodRef = doc(db, 'productos', id);
  await updateDoc(prodRef, { disponible: false });
};

// ==========================================
// 5. REPORTES DE VENTAS
// ==========================================

export const getPaymentsList = async (): Promise<PaymentReceipt[]> => {
  try {
    const q = query(collection(db, 'pagos'));
    const snapshot = await getDocs(q);
    const pagos: PaymentReceipt[] = [];
    snapshot.forEach((d) => {
      pagos.push({ id: d.id, ...(d.data() as Omit<PaymentReceipt, 'id'>) });
    });
    pagos.sort((a, b) => {
      const timeA = a.fechaPago?.toMillis ? a.fechaPago.toMillis() : (a.fechaPago?.seconds ? a.fechaPago.seconds * 1000 : new Date(a.fechaPago || 0).getTime());
      const timeB = b.fechaPago?.toMillis ? b.fechaPago.toMillis() : (b.fechaPago?.seconds ? b.fechaPago.seconds * 1000 : new Date(b.fechaPago || 0).getTime());
      return timeB - timeA;
    });
    return pagos;
  } catch (err) {
    console.error('Error al consultar lista de pagos:', err);
    return [];
  }
};

// ==========================================
// 6. SEMILLA DE DATOS DE POLLERÍA (INICIALIZADOR)
// ==========================================

export const seedInitialPolleriaData = async (): Promise<{ tablesCreated: number; productsCreated: number }> => {
  const batch = writeBatch(db);

  // 1. Crear 12 Mesas si no existen
  const mesasSnap = await getDocs(collection(db, 'mesas'));
  let tablesCreated = 0;
  if (mesasSnap.empty) {
    const capacidades = [4, 4, 2, 6, 4, 8, 4, 2, 6, 4, 10, 4];
    for (let i = 1; i <= 12; i++) {
      const mesaRef = doc(collection(db, 'mesas'), `mesa-${i.toString().padStart(2, '0')}`);
      batch.set(mesaRef, {
        numero: i,
        capacidad: capacidades[i - 1] || 4,
        estado: 'libre',
        mozoId: null,
        mozoNombre: null,
        atencionActivaId: null
      });
      tablesCreated++;
    }
  }

  // 2. Categorías de Pollería
  const categoriasBase = [
    { id: 'cat-pollos', nombre: 'Pollos a la Brasa', orden: 1, activo: true, icono: '🍗', descripcion: 'Nuestro clásico pollo con sabor peruano' },
    { id: 'cat-mostritos', nombre: 'Mostritos & Chaufas', orden: 2, activo: true, icono: '🍚', descripcion: 'La combinación perfecta de pollo y chaufa' },
    { id: 'cat-porciones', nombre: 'Guarniciones & Porciones', orden: 3, activo: true, icono: '🍟', descripcion: 'Papas doraditas, ensaladas y tequeños' },
    { id: 'cat-anticuchos', nombre: 'Parrillas & Anticuchos', orden: 4, activo: true, icono: '🍢', descripcion: 'Corazón tierno con papas doradas y choclo' },
    { id: 'cat-bebidas', nombre: 'Bebidas & Refrescos', orden: 5, activo: true, icono: '🥤', descripcion: 'Chicha morada casera y gaseosas heladas' },
    { id: 'cat-cervezas', nombre: 'Cervezas & Tragos', orden: 6, activo: true, icono: '🍺', descripcion: 'Cusqueña, Pilsen, Cristal y cócteles' },
    { id: 'cat-postres', nombre: 'Postres Tradicionales', orden: 7, activo: true, icono: '🍰', descripcion: 'Torta de chocolate, suspiro y crema volteada' }
  ];

  for (const cat of categoriasBase) {
    const catRef = doc(db, 'categorias', cat.id);
    batch.set(catRef, cat);
  }

  // 3. Productos Típicos de Pollería
  const productosBase: Array<Omit<Product, 'id'>> = [
    { codigo: 'POL-001', nombre: '1 Pollo a la Brasa Entero', categoriaId: 'cat-pollos', categoriaNombre: 'Pollos a la Brasa', precio: 68.00, descripcion: 'Incluye papas fritas familiares, ensalada clásica y todas las cremas de la casa.', disponible: true },
    { codigo: 'POL-002', nombre: '1/2 Pollo a la Brasa', categoriaId: 'cat-pollos', categoriaNombre: 'Pollos a la Brasa', precio: 38.00, descripcion: 'Medio pollo dorado con papas fritas medianas, ensalada y cremas.', disponible: true },
    { codigo: 'POL-003', nombre: '1/4 Pollo a la Brasa', categoriaId: 'cat-pollos', categoriaNombre: 'Pollos a la Brasa', precio: 22.00, descripcion: 'Cuarto de pollo (pechuga o pierna) con papas fritas personales y ensalada.', disponible: true },
    { codigo: 'POL-004', nombre: 'Pollo Parrillero Familiar', categoriaId: 'cat-pollos', categoriaNombre: 'Pollos a la Brasa', precio: 82.00, descripcion: '1 Pollo entero + 4 porciones de anticuchos + papas + ensalada + chicha 1.5L.', disponible: true },
    
    { codigo: 'MOS-001', nombre: 'Mostrito Clásico de 1/4', categoriaId: 'cat-mostritos', categoriaNombre: 'Mostritos & Chaufas', precio: 25.00, descripcion: '1/4 de pollo a la brasa + abundante arroz chaufa de la casa + papas fritas y cremas.', disponible: true },
    { codigo: 'MOS-002', nombre: 'Mostrito Especial Don Brasa', categoriaId: 'cat-mostritos', categoriaNombre: 'Mostritos & Chaufas', precio: 42.00, descripcion: '1/2 pollo a la brasa + porción grande de chaufa ahumado + papas.', disponible: true },
    { codigo: 'MOS-003', nombre: 'Arroz Chaufa al Wok', categoriaId: 'cat-mostritos', categoriaNombre: 'Mostritos & Chaufas', precio: 18.00, descripcion: 'Chaufa con trozos de pollo, cebollita china, huevo y aceite de ajonjolí.', disponible: true },

    { codigo: 'POR-001', nombre: 'Porción de Papas Nativas Fritas', categoriaId: 'cat-porciones', categoriaNombre: 'Guarniciones & Porciones', precio: 14.00, descripcion: 'Papas nativas peruanas con cáscara crocante y salsa huancaína.', disponible: true },
    { codigo: 'POR-002', nombre: 'Tequeños Rellenos de Pollo a la Brasa (8 un.)', categoriaId: 'cat-porciones', categoriaNombre: 'Guarniciones & Porciones', precio: 16.00, descripcion: 'Masa wantán crujiente rellena con pollo a la brasa y queso, acompañado de guacamole.', disponible: true },
    { codigo: 'POR-003', nombre: 'Ensalada Rusa Cocida', categoriaId: 'cat-porciones', categoriaNombre: 'Guarniciones & Porciones', precio: 10.00, descripcion: 'Betarraga, zanahoria, arvejas, papa y mayonesa casera.', disponible: true },
    { codigo: 'POR-004', nombre: 'Papas Fritas Clásicas Familiares', categoriaId: 'cat-porciones', categoriaNombre: 'Guarniciones & Porciones', precio: 15.00, descripcion: 'Porción generosa de papas amarillas fritas crocantes.', disponible: true },

    { codigo: 'ANT-001', nombre: 'Porción de Anticuchos Clásicos (2 palos)', categoriaId: 'cat-anticuchos', categoriaNombre: 'Parrillas & Anticuchos', precio: 24.00, descripcion: 'Finos cortes de corazón marinados en ají panca, acompañados de papa dorada y choclo.', disponible: true },
    { codigo: 'ANT-002', nombre: 'Piqueo Pollero Don Brasa', categoriaId: 'cat-anticuchos', categoriaNombre: 'Parrillas & Anticuchos', precio: 48.00, descripcion: '2 palitos de anticucho, mollejitas a la parrilla, tequeños y papas doradas.', disponible: true },

    { codigo: 'BEB-001', nombre: 'Jarra de Chicha Morada Casera (1L)', categoriaId: 'cat-bebidas', categoriaNombre: 'Bebidas & Refrescos', precio: 14.00, descripcion: 'Elaborada con maíz morado, piña, manzana, canela y toques de limón.', disponible: true },
    { codigo: 'BEB-002', nombre: 'Vaso de Chicha Morada', categoriaId: 'cat-bebidas', categoriaNombre: 'Bebidas & Refrescos', precio: 5.00, descripcion: 'Vaso helado de chicha morada tradicional.', disponible: true },
    { codigo: 'BEB-003', nombre: 'Inca Kola 1.5L (Gordita)', categoriaId: 'cat-bebidas', categoriaNombre: 'Bebidas & Refrescos', precio: 12.00, descripcion: 'Inca Kola helada familiar.', disponible: true },
    { codigo: 'BEB-004', nombre: 'Coca Cola 1.5L', categoriaId: 'cat-bebidas', categoriaNombre: 'Bebidas & Refrescos', precio: 12.00, descripcion: 'Coca Cola helada familiar.', disponible: true },
    { codigo: 'BEB-005', nombre: 'Gaseosa Personal 500ml', categoriaId: 'cat-bebidas', categoriaNombre: 'Bebidas & Refrescos', precio: 5.00, descripcion: 'Inca Kola, Coca Cola o Fanta personal bien helada.', disponible: true },

    { codigo: 'CER-001', nombre: 'Cerveza Cusqueña Dorada 330ml', categoriaId: 'cat-cervezas', categoriaNombre: 'Cervezas & Tragos', precio: 9.00, descripcion: 'Cerveza premium de malta helada.', disponible: true },
    { codigo: 'CER-002', nombre: 'Cerveza Pilsen Callao 630ml', categoriaId: 'cat-cervezas', categoriaNombre: 'Cervezas & Tragos', precio: 12.00, descripcion: 'Botella grande helada para compartir.', disponible: true },

    { codigo: 'POS-001', nombre: 'Torta Húmeda de Chocolate', categoriaId: 'cat-postres', categoriaNombre: 'Postres Tradicionales', precio: 10.00, descripcion: 'Bizcocho bañado en fudge artesanal con chispas de chocolate.', disponible: true },
    { codigo: 'POS-002', nombre: 'Suspiro a la Limeña Clásico', categoriaId: 'cat-postres', categoriaNombre: 'Postres Tradicionales', precio: 9.00, descripcion: 'Dulce de manjarblanco artesanal coronado con merengue al oporto y canela.', disponible: true }
  ];

  const prodsSnap = await getDocs(collection(db, 'productos'));
  let productsCreated = 0;
  if (prodsSnap.empty) {
    for (const prod of productosBase) {
      const prodRef = doc(collection(db, 'productos'));
      batch.set(prodRef, prod);
      productsCreated++;
    }
  }

  await batch.commit();
  return { tablesCreated, productsCreated };
};
