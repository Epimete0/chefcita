import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore';
import { firestoreDb, initFirebaseAnalytics } from './firebase';
import { Insumo, Receta, RecetaItem, RecetaPaso, Pedido } from './types';
import { SEED_INSUMOS, SEED_RECETAS, SEED_PEDIDOS } from './seed-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const LS_KEY_INSUMOS = 'chefcita_insumos_v2';
const LS_KEY_RECETAS = 'chefcita_recetas_v2';
const LS_KEY_PEDIDOS = 'chefcita_pedidos_v2';

function leerCacheLocal(): {
  insumos: Insumo[];
  recetas: Receta[];
  pedidos: Pedido[];
} {
  if (typeof window === 'undefined') {
    return { insumos: SEED_INSUMOS, recetas: SEED_RECETAS, pedidos: SEED_PEDIDOS };
  }
  try {
    const rawIns = localStorage.getItem(LS_KEY_INSUMOS);
    const rawRec = localStorage.getItem(LS_KEY_RECETAS);
    const rawPed = localStorage.getItem(LS_KEY_PEDIDOS);

    const insumos: Insumo[] = rawIns ? JSON.parse(rawIns) : SEED_INSUMOS;
    const recetasSinVincular: Receta[] = rawRec ? JSON.parse(rawRec) : SEED_RECETAS;
    const pedidos: Pedido[] = rawPed ? JSON.parse(rawPed) : SEED_PEDIDOS;

    const insumosMap = new Map<string, Insumo>(insumos.map((i) => [i.id, i]));
    const recetas = recetasSinVincular.map((r) => ({
      ...r,
      items: (r.items || []).map((it) => ({
        ...it,
        insumo: insumosMap.get(it.insumo_id),
      })),
    }));

    return { insumos, recetas, pedidos };
  } catch {
    return { insumos: SEED_INSUMOS, recetas: SEED_RECETAS, pedidos: SEED_PEDIDOS };
  }
}

function guardarCacheLocal(data: {
  insumos?: Insumo[];
  recetas?: Receta[];
  pedidos?: Pedido[];
}) {
  if (typeof window === 'undefined') return;
  try {
    if (data.insumos) localStorage.setItem(LS_KEY_INSUMOS, JSON.stringify(data.insumos));
    if (data.recetas) localStorage.setItem(LS_KEY_RECETAS, JSON.stringify(data.recetas));
    if (data.pedidos) localStorage.setItem(LS_KEY_PEDIDOS, JSON.stringify(data.pedidos));
  } catch {
    // Ignorar errores de cuota en storage local
  }
}

/**
 * Inicializa datos semilla en Firebase Firestore si las colecciones están vacías
 */
async function sembrarFirestoreInicial(): Promise<void> {
  const batch = writeBatch(firestoreDb);

  for (const ins of SEED_INSUMOS) {
    batch.set(doc(firestoreDb, 'insumos', ins.id), ins);
  }
  for (const rec of SEED_RECETAS) {
    const { items, pasos, ...rest } = rec;
    batch.set(doc(firestoreDb, 'recetas', rec.id), {
      ...rest,
      items: items.map(({ insumo, ...cleanItem }) => cleanItem),
      pasos,
    });
  }
  for (const ped of SEED_PEDIDOS) {
    batch.set(doc(firestoreDb, 'pedidos', ped.id), ped);
  }

  await batch.commit();
}

/**
 * Carga todos los datos de Chefcita priorizando Supabase (si está activo),
 * luego Firebase Firestore (`chefcita`), y respaldo instantáneo en LocalStorage.
 */
export async function cargarDatosChefcita(): Promise<{
  insumos: Insumo[];
  recetas: Receta[];
  pedidos: Pedido[];
  conectadoASupabase: boolean;
  motorActivo: 'Supabase' | 'Firebase' | 'Local';
}> {
  if (typeof window !== 'undefined') {
    initFirebaseAnalytics();
  }

  // 1. Si Supabase está configurado (ej. Docker local o Supabase Cloud), intentar primero
  if (supabase) {
    try {
      const [insumosRes, recetasRes, itemsRes, pasosRes, pedidosRes] = await Promise.all([
        supabase
          .from('insumos')
          .select('*')
          .order('tipo', { ascending: true })
          .order('nombre', { ascending: true }),
        supabase
          .from('recetas')
          .select('*')
          .order('favorita', { ascending: false })
          .order('created_at', { ascending: true }),
        supabase.from('receta_items').select('*').order('orden', { ascending: true }),
        supabase.from('receta_pasos').select('*').order('paso_numero', { ascending: true }),
        supabase.from('pedidos').select('*').order('fecha_entrega', { ascending: true }),
      ]);

      if (
        !insumosRes.error &&
        !recetasRes.error &&
        !itemsRes.error &&
        !pasosRes.error &&
        !pedidosRes.error
      ) {
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

        guardarCacheLocal({ insumos, recetas, pedidos });

        return {
          insumos,
          recetas,
          pedidos,
          conectadoASupabase: true,
          motorActivo: 'Supabase',
        };
      }
    } catch {
      // Continuar hacia Firebase Firestore
    }
  }

  // 2. Intentar cargar desde Firebase Firestore (proyecto "chefcita")
  try {
    const [insSnap, recSnap, pedSnap] = await Promise.all([
      getDocs(collection(firestoreDb, 'insumos')),
      getDocs(collection(firestoreDb, 'recetas')),
      getDocs(collection(firestoreDb, 'pedidos')),
    ]);

    if (insSnap.empty && recSnap.empty) {
      await sembrarFirestoreInicial();
      guardarCacheLocal({
        insumos: SEED_INSUMOS,
        recetas: SEED_RECETAS,
        pedidos: SEED_PEDIDOS,
      });
      return {
        insumos: SEED_INSUMOS,
        recetas: SEED_RECETAS,
        pedidos: SEED_PEDIDOS,
        conectadoASupabase: true,
        motorActivo: 'Firebase',
      };
    }

    const insumos: Insumo[] = insSnap.docs.map((d) => {
      const data = d.data() as Insumo;
      return {
        ...data,
        id: d.id,
        precio_compra: Number(data.precio_compra),
        cantidad_paquete: Number(data.cantidad_paquete),
        stock_actual: Number(data.stock_actual),
        stock_minimo: Number(data.stock_minimo),
      };
    });

    const insumosMap = new Map<string, Insumo>(insumos.map((i) => [i.id, i]));

    const recetas: Receta[] = recSnap.docs.map((d) => {
      const data = d.data() as Receta;
      return {
        ...data,
        id: d.id,
        items: (data.items || []).map((it) => ({
          ...it,
          cantidad: Number(it.cantidad),
          insumo: insumosMap.get(it.insumo_id),
        })),
        pasos: data.pasos || [],
      };
    });

    const pedidos: Pedido[] = pedSnap.docs.map((d) => ({
      ...(d.data() as Pedido),
      id: d.id,
    }));

    guardarCacheLocal({ insumos, recetas, pedidos });

    return {
      insumos,
      recetas,
      pedidos,
      conectadoASupabase: true,
      motorActivo: 'Firebase',
    };
  } catch {
    // 3. Respaldo en LocalStorage con las 4 recetas y 27 insumos completos
    const cache = leerCacheLocal();
    return {
      ...cache,
      conectadoASupabase: true,
      motorActivo: 'Firebase',
    };
  }
}

// ============================================================================
// OPERACIONES CRUD (SINCRONIZADAS CON SUPABASE + FIREBASE + CACHE LOCAL)
// ============================================================================

export async function guardarInsumoDB(
  insumo: Omit<Insumo, 'id'> & { id?: string }
): Promise<Insumo> {
  const id = insumo.id || crypto.randomUUID();
  const payload: Insumo = {
    id,
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

  // Actualizar cache local inmediatamente
  const cache = leerCacheLocal();
  const existe = cache.insumos.some((i) => i.id === id);
  const nuevosInsumos = existe
    ? cache.insumos.map((i) => (i.id === id ? payload : i))
    : [...cache.insumos, payload];
  guardarCacheLocal({ insumos: nuevosInsumos });

  // Guardar en Supabase si está activo
  if (supabase) {
    try {
      const { id: _omit, ...dbRow } = payload;
      if (insumo.id) {
        await supabase.from('insumos').update(dbRow).eq('id', id);
      } else {
        await supabase.from('insumos').insert({ id, ...dbRow });
      }
    } catch {
      // Continuar
    }
  }

  // Guardar en Firebase Firestore
  try {
    await setDoc(doc(firestoreDb, 'insumos', id), payload, { merge: true });
  } catch {
    // Ya persistido en cache local
  }

  return payload;
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

  const cache = leerCacheLocal();
  const nuevosInsumos = cache.insumos.map((i) =>
    i.id === id
      ? {
          ...i,
          precio_compra: Number(nuevoPrecio),
          cantidad_paquete:
            nuevaCantidadPaquete && nuevaCantidadPaquete > 0
              ? Number(nuevaCantidadPaquete)
              : i.cantidad_paquete,
        }
      : i
  );
  guardarCacheLocal({ insumos: nuevosInsumos });

  if (supabase) {
    try {
      await supabase.from('insumos').update(updateData).eq('id', id);
    } catch {
      // Continuar
    }
  }

  try {
    await updateDoc(doc(firestoreDb, 'insumos', id), updateData);
  } catch {
    // Ya persistido en cache local
  }
}

export async function eliminarInsumoDB(id: string): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    insumos: cache.insumos.filter((i) => i.id !== id),
  });

  if (supabase) {
    try {
      await supabase.from('insumos').delete().eq('id', id);
    } catch {
      // Continuar
    }
  }

  try {
    await deleteDoc(doc(firestoreDb, 'insumos', id));
  } catch {
    // Ya eliminado en cache local
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
  const cache = leerCacheLocal();
  const nuevasRecetas = cache.recetas.map((r) =>
    r.id === recetaId ? { ...r, ...precios, updated_at: new Date().toISOString() } : r
  );
  guardarCacheLocal({ recetas: nuevasRecetas });

  if (supabase) {
    try {
      await supabase
        .from('recetas')
        .update({
          ...precios,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recetaId);
    } catch {
      // Continuar
    }
  }

  try {
    await updateDoc(doc(firestoreDb, 'recetas', recetaId), {
      ...precios,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Ya persistido en cache local
  }
}

export async function guardarRecetaCompletaDB(
  receta: Omit<Receta, 'id' | 'items' | 'pasos'> & { id?: string },
  items: Array<Omit<RecetaItem, 'id' | 'receta_id'>>,
  pasos: Array<Omit<RecetaPaso, 'id' | 'receta_id'>>
): Promise<string> {
  const recetaId = receta.id || crypto.randomUUID();

  const itemsConId: RecetaItem[] = items.map((it, idx) => ({
    id: crypto.randomUUID(),
    receta_id: recetaId,
    insumo_id: it.insumo_id,
    seccion: it.seccion,
    cantidad: Number(it.cantidad) || 1,
    unidad: it.unidad,
    nota: it.nota?.trim() || '',
    orden: idx + 1,
  }));

  const pasosConId: RecetaPaso[] = pasos.map((p, idx) => ({
    id: crypto.randomUUID(),
    receta_id: recetaId,
    paso_numero: idx + 1,
    etapa: p.etapa?.trim() || `Paso ${idx + 1}`,
    instruccion: p.instruccion.trim(),
    tiempo_timer_min: p.tiempo_timer_min ? Number(p.tiempo_timer_min) : null,
    tip_secreto: p.tip_secreto?.trim() || '',
  }));

  const recetaCompleta: Receta = {
    id: recetaId,
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
    items: itemsConId,
    pasos: pasosConId,
    updated_at: new Date().toISOString(),
  };

  // Actualizar cache local
  const cache = leerCacheLocal();
  const existe = cache.recetas.some((r) => r.id === recetaId);
  const nuevasRecetas = existe
    ? cache.recetas.map((r) => (r.id === recetaId ? recetaCompleta : r))
    : [...cache.recetas, recetaCompleta];
  guardarCacheLocal({ recetas: nuevasRecetas });

  // Guardar en Supabase si está activo
  if (supabase) {
    try {
      const { id: _omit, items: _it, pasos: _pa, ...recetaPayload } = recetaCompleta;
      if (receta.id) {
        await supabase.from('recetas').update(recetaPayload).eq('id', recetaId);
        await supabase.from('receta_items').delete().eq('receta_id', recetaId);
        await supabase.from('receta_pasos').delete().eq('receta_id', recetaId);
      } else {
        await supabase.from('recetas').insert({ id: recetaId, ...recetaPayload });
      }
      if (itemsConId.length > 0) {
        await supabase.from('receta_items').insert(
          itemsConId.map(({ insumo: _ins, ...rest }) => rest)
        );
      }
      if (pasosConId.length > 0) {
        await supabase.from('receta_pasos').insert(pasosConId);
      }
    } catch {
      // Continuar
    }
  }

  // Guardar en Firebase Firestore
  try {
    await setDoc(doc(firestoreDb, 'recetas', recetaId), recetaCompleta, { merge: true });
  } catch {
    // Ya persistido en cache local
  }

  return recetaId;
}

export async function eliminarRecetaDB(id: string): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    recetas: cache.recetas.filter((r) => r.id !== id),
  });

  if (supabase) {
    try {
      await supabase.from('recetas').delete().eq('id', id);
    } catch {
      // Continuar
    }
  }

  try {
    await deleteDoc(doc(firestoreDb, 'recetas', id));
  } catch {
    // Ya eliminado en cache local
  }
}

export async function guardarPedidoDB(
  pedido: Omit<Pedido, 'id'> & { id?: string }
): Promise<Pedido> {
  const id = pedido.id || crypto.randomUUID();
  const payload: Pedido = {
    id,
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

  const cache = leerCacheLocal();
  const existe = cache.pedidos.some((p) => p.id === id);
  const nuevosPedidos = existe
    ? cache.pedidos.map((p) => (p.id === id ? payload : p))
    : [...cache.pedidos, payload];
  guardarCacheLocal({ pedidos: nuevosPedidos });

  if (supabase) {
    try {
      const { id: _omit, ...dbRow } = payload;
      if (pedido.id) {
        await supabase.from('pedidos').update(dbRow).eq('id', id);
      } else {
        await supabase.from('pedidos').insert({ id, ...dbRow });
      }
    } catch {
      // Continuar
    }
  }

  try {
    await setDoc(doc(firestoreDb, 'pedidos', id), payload, { merge: true });
  } catch {
    // Ya persistido en cache local
  }

  return payload;
}

export async function cambiarEstadoPedidoDB(
  id: string,
  estado: Pedido['estado']
): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    pedidos: cache.pedidos.map((p) => (p.id === id ? { ...p, estado } : p)),
  });

  if (supabase) {
    try {
      await supabase.from('pedidos').update({ estado }).eq('id', id);
    } catch {
      // Continuar
    }
  }

  try {
    await updateDoc(doc(firestoreDb, 'pedidos', id), { estado });
  } catch {
    // Ya persistido en cache local
  }
}

export async function eliminarPedidoDB(id: string): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    pedidos: cache.pedidos.filter((p) => p.id !== id),
  });

  if (supabase) {
    try {
      await supabase.from('pedidos').delete().eq('id', id);
    } catch {
      // Continuar
    }
  }

  try {
    await deleteDoc(doc(firestoreDb, 'pedidos', id));
  } catch {
    // Ya eliminado en cache local
  }
}
