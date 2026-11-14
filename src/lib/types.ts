export type UnidadMedida = 'g' | 'kg' | 'ml' | 'l' | 'u' | 'cm';

export type TipoInsumo = 'ingrediente' | 'empaque';

export type SeccionRecetaItem = 'masa' | 'relleno_cobertura' | 'empaque';

export type EstadoPedido = 'pendiente' | 'en_preparacion' | 'listo' | 'entregado';

export interface Insumo {
  id: string;
  nombre: string;
  tipo: TipoInsumo;
  categoria: string;
  precio_compra: number;
  cantidad_paquete: number;
  unidad: UnidadMedida;
  stock_actual: number;
  stock_minimo: number;
  proveedor: string;
  notas: string;
  created_at?: string;
  updated_at?: string;
}

export interface RecetaItem {
  id: string;
  receta_id: string;
  insumo_id: string;
  seccion: SeccionRecetaItem;
  cantidad: number;
  unidad: UnidadMedida;
  nota: string;
  orden: number;
  insumo?: Insumo;
}

export interface RecetaPaso {
  id: string;
  receta_id: string;
  paso_numero: number;
  etapa: string;
  instruccion: string;
  tiempo_timer_min: number | null;
  tip_secreto: string;
}

export interface Receta {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  rendimiento_cantidad: number;
  rendimiento_unidad: string;
  unidades_por_pack: number;
  nombre_pack: string;
  porcentaje_gastos_extras: number;
  costo_mano_obra_lote: number;
  margen_objetivo_porcentaje: number;
  precio_venta_unidad: number;
  precio_venta_pack: number;
  precio_venta_lote: number;
  tiempo_preparacion_min: number;
  tiempo_horneado_min: number;
  temperatura_horno_c: number;
  metodo_coccion: string;
  notas_chefcita: string;
  color_tag: string;
  favorita: boolean;
  items: RecetaItem[];
  pasos: RecetaPaso[];
  created_at?: string;
  updated_at?: string;
}

export interface Pedido {
  id: string;
  cliente_nombre: string;
  fecha_entrega: string;
  estado: EstadoPedido;
  receta_id: string | null;
  receta_nombre_snapshot: string;
  cantidad_lotes: number;
  unidades_totales: number;
  costo_total_estimado: number;
  precio_venta_total: number;
  ganancia_neta: number;
  seña_pagada: number;
  notas: string;
  created_at?: string;
}

export type EstadoSaludPrecio = 'perdida' | 'bajo' | 'correcto' | 'excelente';

export interface DesgloseItemCosto {
  item: RecetaItem;
  insumo: Insumo | undefined;
  cantidadEscalada: number;
  costoItem: number;
  porcentajeDelTotal: number;
}

export interface ResumenCostosReceta {
  factorEscala: number;
  rendimientoEscalado: number;
  cantidadPacksEnLote: number;
  // Costos por sección del lote
  costoMasa: number;
  costoRellenoCobertura: number;
  costoIngredientesTotal: number;
  costoEmpaque: number;
  costoGastosExtras: number;
  costoManoObra: number;
  costoTotalLote: number;
  // Costos unitarios y por pack
  costoPorUnidad: number;
  costoMasaPorUnidad: number;
  costoRellenoPorUnidad: number;
  costoEmpaquePorUnidad: number;
  costoPorPack: number;
  // Precios de venta actuales escalados
  precioVentaUnidad: number;
  precioVentaPack: number;
  precioVentaLote: number;
  // Ganancias reales
  gananciaPorUnidad: number;
  gananciaPorPack: number;
  gananciaPorLote: number;
  // Métricas de rentabilidad
  margenRealPorcentaje: number;
  multiplicadorSobreCosto: number;
  estadoSalud: EstadoSaludPrecio;
  mensajeDiagnostico: string;
  // Precios sugeridos según objetivo
  precioSugeridoUnidad: number;
  precioSugeridoPack: number;
  precioSugeridoLote: number;
  // Listas detalladas
  itemsMasa: DesgloseItemCosto[];
  itemsRelleno: DesgloseItemCosto[];
  itemsEmpaque: DesgloseItemCosto[];
}
