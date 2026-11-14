import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Insumo, Receta, RecetaItem, RecetaPaso, Pedido } from './types';
import { SEED_INSUMOS, SEED_RECETAS, SEED_PEDIDOS } from './seed-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

/**
 * Carga todos los datos de Chefcita desde Supabase (o fallback local si no hay conexión)
 */
export async function cargarDatosChefcita(): Promise<{
  insumos: Insumo[];
  recetas: Receta[];
  pedidos: Pedido[];
  conectadoASupabase: boolean;
}> {
  if (!supabase) {
    return {
      insumos: SEED_INSUMOS,
      recetas: SEED_RECETAS,
      pedidos: SEED_PEDIDOS,
      conectadoASupabase: false,
    };
  }

  try {
    const [insumosRes, recetasRes, itemsRes, pasosRes, pedidosRes] = await Promise.all([
      supabase.from('insumos').select('*').order('tipo', { ascending: true }).order('nombre', { ascending: true }),
      supabase.from('recetas').select('*').order('favorita', { ascending: false }).order('created_at', { ascending: true }),
      supabase.from('receta_items').select('*').order('orden', { ascending: true }),
      supabase.from('receta_pasos').select('*').order('paso_numero', { ascending: true }),
      supabase.from('pedidos').select('*').order('fecha_entrega', { ascending: true }),
    ]);

    if (insumosRes.error) throw insumosRes.error;
    if (recetasRes.error) throw recetasRes.error;
    if (itemsRes.error) throw itemsRes.error;
    if (pasosRes.error) throw pasosRes.error;
    if (pedidosRes.error) throw pedidosRes.error;

    const insumos: Insumo[] = (insumosRes.data || []).map((row) => ({
      ...row,
      precio_compra: Number(row.precio_compra),
      cantidad_paquete: Number(row.cantidad_paquete),
      stock_actual: Number(row.stock_actual),
      stock_minimo: Number(row.stock_minimo),
    }));

    const insumosMap = new Map<string, Insumo>(insumos.map((i) => [i.id, i]));

    const itemsPorReceta = new Map<string, RecetaItem[]>();
    for (const rawItem of itemsRes.data || []) {
      const item: RecetaItem = {
        ...rawItem,
        cantidad: Number(rawItem.cantidad),
        orden: Number(rawItem.orden),
        insumo: insumosMap.get(rawItem.insumo_id),
      };
      const list = itemsPorReceta.get(item.receta_id) || [];
      list.push(item);
      itemsPorReceta.set(item.receta_id, list);
    }

    const pasosPorReceta = new Map<string, RecetaPaso[]>();
    for (const rawPaso of pasosRes.data || []) {
      const paso: RecetaPaso = {
        ...rawPaso,
        paso_numero: Number(rawPaso.paso_numero),
        tiempo_timer_min: rawPaso.tiempo_timer_min ? Number(rawPaso.tiempo_timer_min) : null,
      };
      const list = pasosPorReceta.get(paso.receta_id) || [];
      list.push(paso);
      pasosPorReceta.set(paso.receta_id, list);
    }

    const recetas: Receta[] = (recetasRes.data || []).map((row) => ({
      ...row,
      rendimiento_cantidad: Number(row.rendimiento_cantidad),
      unidades_por_pack: Number(row.unidades_por_pack),
      porcentaje_gastos_extras: Number(row.porcentaje_gastos_extras),
      costo_mano_obra_lote: Number(row.costo_mano_obra_lote),
      margen_objetivo_porcentaje: Number(row.margen_objetivo_porcentaje),
      precio_venta_unidad: Number(row.precio_venta_unidad),
      precio_venta_pack: Number(row.precio_venta_pack),
      precio_venta_lote: Number(row.precio_venta_lote),
      tiempo_preparacion_min: Number(row.tiempo_preparacion_min),
      tiempo_horneado_min: Number(row.tiempo_horneado_min),
      temperatura_horno_c: Number(row.temperatura_horno_c),
      items: itemsPorReceta.get(row.id) || [],
      pasos: pasosPorReceta.get(row.id) || [],
    }));

    const pedidos: Pedido[] = (pedidosRes.data || []).map((row) => ({
      ...row,
      cantidad_lotes: Number(row.cantidad_lotes),
      unidades_totales: Number(row.unidades_totales),
      costo_total_estimado: Number(row.costo_total_estimado),
      precio_venta_total: Number(row.precio_venta_total),
      ganancia_neta: Number(row.ganancia_neta),
      seña_pagada: Number(row.seña_pagada),
    }));

    return {
      insumos,
      recetas,
      pedidos,
      conectadoASupabase: true,
    };
  } catch (err) {
    console.error('Error conectando a Supabase, usando datos locales:', err);
    return {
      insumos: SEED_INSUMOS,
      recetas: SEED_RECETAS,
      pedidos: SEED_PEDIDOS,
      conectadoASupabase: false,
    };
  }
}

// ============================================================================
// OPERACIONES CRUD EN SUPABASE
// ============================================================================

export async function guardarInsumoDB(
  insumo: Omit<Insumo, 'id'> & { id?: string }
): Promise<Insumo> {
  const payload = {
    nombre: insumo.nombre.trim(),
    tipo: insumo.tipo,
    categoria: insumo.categoria.trim() || 'General',
    precio_compra: Number(insumo.precio_compra) || 0,
    cantidad_paquete: Number(insumo.cantidad_paquete) || 1,
    unidad: insumo.unidad,
    stock_actual: Number(insumo.stock_actual) || 0,
    stock_minimo: Number(insumo.stock_minimo) || 0,
    proveedor: insumo.proveedor?.trim() || '',
    notas: insumo.notas?.trim() || '',
    updated_at: new Date().toISOString(),
  };

  if (supabase) {
    if (insumo.id) {
      const { data, error } = await supabase
        .from('insumos')
        .update(payload)
        .eq('id', insumo.id)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        precio_compra: Number(data.precio_compra),
        cantidad_paquete: Number(data.cantidad_paquete),
        stock_actual: Number(data.stock_actual),
        stock_minimo: Number(data.stock_minimo),
      };
    } else {
      const { data, error } = await supabase
        .from('insumos')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return {
        ...data,
        precio_compra: Number(data.precio_compra),
        cantidad_paquete: Number(data.cantidad_paquete),
        stock_actual: Number(data.stock_actual),
        stock_minimo: Number(data.stock_minimo),
      };
    }
  }

  return {
    id: insumo.id || crypto.randomUUID(),
    ...payload,
  };
}

export async function actualizarPrecioInsumoDB(
  id: string,
  nuevoPrecio: number,
  nuevaCantidadPaquete?: number
): Promise<void> {
  const updateData: Record<string, unknown> = {
    precio_compra: Number(nuevoPrecio),
    updated_at: new Date().toISOString(),
  };
  if (nuevaCantidadPaquete && nuevaCantidadPaquete > 0) {
    updateData.cantidad_paquete = Number(nuevaCantidadPaquete);
  }
  if (supabase) {
    const { error } = await supabase.from('insumos').update(updateData).eq('id', id);
    if (error) throw error;
  }
}

export async function eliminarInsumoDB(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('insumos').delete().eq('id', id);
    if (error) throw error;
  }
}

export async function actualizarPreciosVentaRecetaDB(
  recetaId: string,
  precios: {
    precio_venta_pack: number;
    precio_venta_unidad: number;
    precio_venta_lote: number;
    margen_objetivo_porcentaje?: number;
    porcentaje_gastos_extras?: number;
  }
): Promise<void> {
  if (supabase) {
    const { error } = await supabase
      .from('recetas')
      .update({
        ...precios,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recetaId);
    if (error) throw error;
  }
}

export async function guardarRecetaCompletaDB(
  receta: Omit<Receta, 'id' | 'items' | 'pasos'> & { id?: string },
  items: Array<Omit<RecetaItem, 'id' | 'receta_id'>>,
  pasos: Array<Omit<RecetaPaso, 'id' | 'receta_id'>>
): Promise<string> {
  const recetaPayload = {
    nombre: receta.nombre.trim(),
    categoria: receta.categoria,
    descripcion: receta.descripcion.trim(),
    rendimiento_cantidad: Number(receta.rendimiento_cantidad) || 1,
    rendimiento_unidad: receta.rendimiento_unidad.trim() || 'unidades',
    unidades_por_pack: Number(receta.unidades_por_pack) || 1,
    nombre_pack: receta.nombre_pack.trim() || 'Unidad',
    porcentaje_gastos_extras: Number(receta.porcentaje_gastos_extras) || 0,
    costo_mano_obra_lote: Number(receta.costo_mano_obra_lote) || 0,
    margen_objetivo_porcentaje: Number(receta.margen_objetivo_porcentaje) || 55,
    precio_venta_unidad: Number(receta.precio_venta_unidad) || 0,
    precio_venta_pack: Number(receta.precio_venta_pack) || 0,
    precio_venta_lote: Number(receta.precio_venta_lote) || 0,
    tiempo_preparacion_min: Number(receta.tiempo_preparacion_min) || 30,
    tiempo_horneado_min: Number(receta.tiempo_horneado_min) || 20,
    temperatura_horno_c: Number(receta.temperatura_horno_c) || 180,
    metodo_coccion: receta.metodo_coccion || 'Horno',
    notas_chefcita: receta.notas_chefcita.trim(),
    color_tag: receta.color_tag || 'rose',
    favorita: Boolean(receta.favorita),
    updated_at: new Date().toISOString(),
  };

  if (!supabase) {
    return receta.id || crypto.randomUUID();
  }

  let recetaId = receta.id;

  if (recetaId) {
    const { error } = await supabase.from('recetas').update(recetaPayload).eq('id', recetaId);
    if (error) throw error;
    await supabase.from('receta_items').delete().eq('receta_id', recetaId);
    await supabase.from('receta_pasos').delete().eq('receta_id', recetaId);
  } else {
    const { data, error } = await supabase
      .from('recetas')
      .insert(recetaPayload)
      .select('id')
      .single();
    if (error) throw error;
    recetaId = data.id;
  }

  if (items.length > 0 && recetaId) {
    const itemsPayload = items.map((it, idx) => ({
      receta_id: recetaId,
      insumo_id: it.insumo_id,
      seccion: it.seccion,
      cantidad: Number(it.cantidad) || 1,
      unidad: it.unidad,
      nota: it.nota?.trim() || '',
      orden: idx + 1,
    }));
    const { error: itemsError } = await supabase.from('receta_items').insert(itemsPayload);
    if (itemsError) throw itemsError;
  }

  if (pasos.length > 0 && recetaId) {
    const pasosPayload = pasos.map((p, idx) => ({
      receta_id: recetaId,
      paso_numero: idx + 1,
      etapa: p.etapa?.trim() || `Paso ${idx + 1}`,
      instruccion: p.instruccion.trim(),
      tiempo_timer_min: p.tiempo_timer_min ? Number(p.tiempo_timer_min) : null,
      tip_secreto: p.tip_secreto?.trim() || '',
    }));
    const { error: pasosError } = await supabase.from('receta_pasos').insert(pasosPayload);
    if (pasosError) throw pasosError;
  }

  return recetaId!;
}

export async function eliminarRecetaDB(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('recetas').delete().eq('id', id);
    if (error) throw error;
  }
}

export async function guardarPedidoDB(
  pedido: Omit<Pedido, 'id'> & { id?: string }
): Promise<Pedido> {
  const payload = {
    cliente_nombre: pedido.cliente_nombre.trim(),
    fecha_entrega: pedido.fecha_entrega,
    estado: pedido.estado,
    receta_id: pedido.receta_id,
    receta_nombre_snapshot: pedido.receta_nombre_snapshot,
    cantidad_lotes: Number(pedido.cantidad_lotes) || 1,
    unidades_totales: Number(pedido.unidades_totales) || 1,
    costo_total_estimado: Number(pedido.costo_total_estimado) || 0,
    precio_venta_total: Number(pedido.precio_venta_total) || 0,
    ganancia_neta: Number(pedido.ganancia_neta) || 0,
    seña_pagada: Number(pedido.seña_pagada) || 0,
    notas: pedido.notas?.trim() || '',
  };

  if (supabase) {
    if (pedido.id) {
      const { data, error } = await supabase
        .from('pedidos')
        .update(payload)
        .eq('id', pedido.id)
        .select()
        .single();
      if (error) throw error;
      return data as Pedido;
    } else {
      const { data, error } = await supabase.from('pedidos').insert(payload).select().single();
      if (error) throw error;
      return data as Pedido;
    }
  }

  return {
    id: pedido.id || crypto.randomUUID(),
    ...payload,
  };
}

export async function cambiarEstadoPedidoDB(
  id: string,
  estado: Pedido['estado']
): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('pedidos').update({ estado }).eq('id', id);
    if (error) throw error;
  }
}

export async function eliminarPedidoDB(id: string): Promise<void> {
  if (supabase) {
    const { error } = await supabase.from('pedidos').delete().eq('id', id);
    if (error) throw error;
  }
}
