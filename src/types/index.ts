export type UserRole = 'admin' | 'mozo' | 'cocina' | 'cajero';

export interface AppUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

export interface Category {
  id: string;
  nombre: string;
  descripcion?: string;
  orden: number;
  activo: boolean;
  icono?: string;
}

export interface Product {
  id: string;
  nombre: string;
  categoriaId: string;
  categoriaNombre?: string;
  precio: number;
  descripcion: string;
  disponible: boolean;
  imagen?: string;
  codigo?: string;
}

export type TableStatus = 'libre' | 'ocupada' | 'por_pagar';

export interface DiningTable {
  id: string;
  numero: number;
  capacidad: number;
  estado: TableStatus;
  mozoId?: string;
  mozoNombre?: string;
  comensales?: number;
  atencionActivaId?: string;
  ultimaActualizacion?: any;
}

export interface OrderItem {
  id: string;
  productoId: string;
  nombre: string;
  precioUnitario: number; // Precio histórico congelado
  cantidad: number;
  subtotal: number;
  notas?: string;
}

export type TicketStatus = 'pendiente' | 'preparando' | 'listo' | 'entregado';
export type OrderMode = 'salon' | 'llevar';

export interface KitchenTicket {
  id: string;
  atencionId: string;
  mesaId?: string;
  mesaNumero?: number;
  numeroComanda: number;
  mozoId: string;
  mozoNombre: string;
  items: OrderItem[];
  estado: TicketStatus;
  observaciones?: string;
  creadaEn: any; // Firestore Timestamp or ISO
  actualizadaEn?: any;
  tiempoEsperaMinutos?: number;
  tipo?: OrderMode;
  numeroPedido?: string;
  clienteNombre?: string;
  metodoPago?: PaymentMethod;
  total?: number;
}

export type AttentionStatus = 'abierta' | 'cerrada' | 'cancelada';

export interface TableAttention {
  id: string;
  mesaId?: string;
  mesaNumero?: number;
  mozoId: string;
  mozoNombre: string;
  comensales: number;
  estado: AttentionStatus;
  comandasIds: string[];
  totalAcumulado: number;
  subtotal: number;
  igv: number;
  fechaApertura: any;
  fechaCierre?: any;
  metodoPago?: PaymentMethod;
  tipo?: OrderMode;
  numeroPedido?: string;
  clienteNombre?: string;
}

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'yape' | 'plin';
export type InvoiceType = 'ticket' | 'boleta' | 'factura';

export interface PaymentReceipt {
  id: string;
  atencionId: string;
  mesaNumero: number;
  subtotal: number;
  igv: number;
  total: number;
  metodoPago: PaymentMethod;
  montoRecibido?: number;
  vuelto?: number;
  tipoComprobante: InvoiceType;
  clienteNombre?: string;
  clienteDocumento?: string; // DNI o RUC
  cajeroId: string;
  cajeroNombre: string;
  fechaPago: any;
}

export interface DailySummary {
  totalVentas: number;
  cantidadOrdenes: number;
  porMetodoPago: Record<PaymentMethod, number>;
  productosMasVendidos: Array<{ nombre: string; cantidad: number; total: number }>;
}
