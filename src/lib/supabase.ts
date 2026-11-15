import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  collection,
  getDocs,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { firestoreDb, initFirebaseAnalytics } from './firebase';
import { Insumo, Receta, RecetaItem, RecetaPaso, Pedido } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const LS_KEY_INSUMOS = 'chefcita_real_insumos_v3';
const LS_KEY_RECETAS = 'chefcita_real_recetas_v3';
const LS_KEY_PEDIDOS = 'chefcita_real_pedidos_v3';

// IDs de los datos de demostración antiguos para filtrarlos si quedaron en la nube
const DEMO_IDS = new Set([
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000003',
  '10000000-0000-0000-0000-000000000004',
  '10000000-0000-0000-0000-000000000005',
  '10000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000008',
  '10000000-0000-0000-0000-000000000009',
  '10000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000012',
  '10000000-0000-0000-0000-000000000013',
  '10000000-0000-0000-0000-000000000014',
  '10000000-0000-0000-0000-000000000015',
  '10000000-0000-0000-0000-000000000016',
  '10000000-0000-0000-0000-000000000017',
  '10000000-0000-0000-0000-000000000018',
  '20000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000002',
  '20000000-0000-0000-0000-000000000003',
  '20000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000007',
  '20000000-0000-0000-0000-000000000008',
  '20000000-0000-0000-0000-000000000009',
  '30000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  '30000000-0000-0000-0000-000000000004',
  '40000000-0000-0000-0000-000000000001',
  '40000000-0000-0000-0000-000000000002',
  '40000000-0000-0000-0000-000000000003',
]);

function conTimeout<T>(promesa: Promise<T>, ms: number = 2200): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Timeout de red'));
    }, ms);
    promesa
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

export function leerCacheLocal(): {
  insumos: Insumo[];
  recetas: Receta[];
  pedidos: Pedido[];
} {
  if (typeof window === 'undefined') {
    return { insumos: [], recetas: [], pedidos: [] };
  }
  try {
    // Limpiar cualquier cache viejo de datos de prueba (v1/v2)
    localStorage.removeItem('chefcita_insumos_v2');
    localStorage.removeItem('chefcita_recetas_v2');
    localStorage.removeItem('chefcita_pedidos_v2');

    const rawIns = localStorage.getItem(LS_KEY_INSUMOS);
    const rawRec = localStorage.getItem(LS_KEY_RECETAS);
    const rawPed = localStorage.getItem(LS_KEY_PEDIDOS);

    const insumos: Insumo[] = rawIns
      ? (JSON.parse(rawIns) as Insumo[]).filter((i) => !DEMO_IDS.has(i.id))
      : [];
    const recetasSinVincular: Receta[] = rawRec
      ? (JSON.parse(rawRec) as Receta[]).filter((r) => !DEMO_IDS.has(r.id))
      : [];
    const pedidos: Pedido[] = rawPed
      ? (JSON.parse(rawPed) as Pedido[]).filter((p) => !DEMO_IDS.has(p.id))
      : [];

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
    return { insumos: [], recetas: [], pedidos: [] };
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
    // Ignorar errores de cuota
  }
}

/**
 * Carga únicamente los datos creados por la usuaria (empieza 100% en blanco si aún no cargó nada).
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

  // 1. Si Supabase está configurado (ej. Docker local), consultar datos reales
  if (supabase) {
    try {
      const [insumosRes, recetasRes, itemsRes, pasosRes, pedidosRes] = await conTimeout(
        Promise.all([
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
        ]),
        1800
      );

      if (
        !insumosRes.error &&
        !recetasRes.error &&
        !itemsRes.error &&
        !pasosRes.error &&
        !pedidosRes.error
      ) {
        const insumos: Insumo[] = (insumosRes.data || [])
          .filter((row) => !DEMO_IDS.has(row.id))
          .map((row) => ({
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

        const recetas: Receta[] = (recetasRes.data || [])
          .filter((row) => !DEMO_IDS.has(row.id))
          .map((row) => ({
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

        const pedidos: Pedido[] = (pedidosRes.data || [])
          .filter((row) => !DEMO_IDS.has(row.id))
          .map((row) => ({
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

  // 2. Consultar Firebase Firestore (sin precargar datos falsos)
  try {
    const [insSnap, recSnap, pedSnap] = await conTimeout(
      Promise.all([
        getDocs(collection(firestoreDb, 'insumos')),
        getDocs(collection(firestoreDb, 'recetas')),
        getDocs(collection(firestoreDb, 'pedidos')),
      ]),
      2000
    );

    const insumos: Insumo[] = insSnap.docs
      .filter((d) => !DEMO_IDS.has(d.id))
      .map((d) => {
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

    const recetas: Receta[] = recSnap.docs
      .filter((d) => !DEMO_IDS.has(d.id))
      .map((d) => {
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

    const pedidos: Pedido[] = pedSnap.docs
      .filter((d) => !DEMO_IDS.has(d.id))
      .map((d) => ({
        ...(d.data() as Pedido),
        id: d.id,
      }));

    // Si en cache local ya había datos creados por la usuaria pero Firestore aún estaba vacío, conservar los de la usuaria
    const cache = leerCacheLocal();
    const insumosFinal = insumos.length > 0 ? insumos : cache.insumos;
    const recetasFinal = recetas.length > 0 ? recetas : cache.recetas;
    const pedidosFinal = pedidos.length > 0 ? pedidos : cache.pedidos;

    guardarCacheLocal({
      insumos: insumosFinal,
      recetas: recetasFinal,
      pedidos: pedidosFinal,
    });

    return {
      insumos: insumosFinal,
      recetas: recetasFinal,
      pedidos: pedidosFinal,
      conectadoASupabase: true,
      motorActivo: 'Firebase',
    };
  } catch {
    const cache = leerCacheLocal();
    return {
      ...cache,
      conectadoASupabase: true,
      motorActivo: 'Firebase',
    };
  }
}

// ============================================================================
// OPERACIONES CRUD INSTANTÁNEAS
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

  const cache = leerCacheLocal();
  const existe = cache.insumos.some((i) => i.id === id);
  const nuevosInsumos = existe
    ? cache.insumos.map((i) => (i.id === id ? payload : i))
    : [payload, ...cache.insumos];
  guardarCacheLocal({ insumos: nuevosInsumos });

  if (supabase) {
    const { id: _omit, ...dbRow } = payload;
    const op = insumo.id
      ? supabase.from('insumos').update(dbRow).eq('id', id)
      : supabase.from('insumos').insert({ id, ...dbRow });
    Promise.resolve(op).catch(() => {});
  }

  conTimeout(setDoc(doc(firestoreDb, 'insumos', id), payload, { merge: true }), 2000).catch(
    () => {}
  );

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
    Promise.resolve(supabase.from('insumos').update(updateData).eq('id', id)).catch(() => {});
  }

  conTimeout(updateDoc(doc(firestoreDb, 'insumos', id), updateData), 2000).catch(() => {});
}

export async function eliminarInsumoDB(id: string): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    insumos: cache.insumos.filter((i) => i.id !== id),
  });

  if (supabase) {
    Promise.resolve(supabase.from('insumos').delete().eq('id', id)).catch(() => {});
  }

  conTimeout(deleteDoc(doc(firestoreDb, 'insumos', id)), 2000).catch(() => {});
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
    Promise.resolve(
      supabase
        .from('recetas')
        .update({
          ...precios,
          updated_at: new Date().toISOString(),
        })
        .eq('id', recetaId)
    ).catch(() => {});
  }

  conTimeout(
    updateDoc(doc(firestoreDb, 'recetas', recetaId), {
      ...precios,
      updated_at: new Date().toISOString(),
    }),
    2000
  ).catch(() => {});
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

  const cache = leerCacheLocal();
  const existe = cache.recetas.some((r) => r.id === recetaId);
  const nuevasRecetas = existe
    ? cache.recetas.map((r) => (r.id === recetaId ? recetaCompleta : r))
    : [recetaCompleta, ...cache.recetas];
  guardarCacheLocal({ recetas: nuevasRecetas });

  if (supabase) {
    (async () => {
      const { id: _omit, items: _it, pasos: _pa, ...recetaPayload } = recetaCompleta;
      if (receta.id) {
        await supabase.from('recetas').update(recetaPayload).eq('id', recetaId);
        await supabase.from('receta_items').delete().eq('receta_id', recetaId);
        await supabase.from('receta_pasos').delete().eq('receta_id', recetaId);
      } else {
        await supabase.from('recetas').insert({ id: recetaId, ...recetaPayload });
      }
      if (itemsConId.length > 0) {
        await supabase
          .from('receta_items')
          .insert(itemsConId.map(({ insumo: _ins, ...rest }) => rest));
      }
      if (pasosConId.length > 0) {
        await supabase.from('receta_pasos').insert(pasosConId);
      }
    })().catch(() => {});
  }

  conTimeout(
    setDoc(doc(firestoreDb, 'recetas', recetaId), recetaCompleta, { merge: true }),
    2000
  ).catch(() => {});

  return recetaId;
}

export async function eliminarRecetaDB(id: string): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    recetas: cache.recetas.filter((r) => r.id !== id),
  });

  if (supabase) {
    Promise.resolve(supabase.from('recetas').delete().eq('id', id)).catch(() => {});
  }

  conTimeout(deleteDoc(doc(firestoreDb, 'recetas', id)), 2000).catch(() => {});
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
    : [payload, ...cache.pedidos];
  guardarCacheLocal({ pedidos: nuevosPedidos });

  if (supabase) {
    const { id: _omit, ...dbRow } = payload;
    const op = pedido.id
      ? supabase.from('pedidos').update(dbRow).eq('id', id)
      : supabase.from('pedidos').insert({ id, ...dbRow });
    Promise.resolve(op).catch(() => {});
  }

  conTimeout(setDoc(doc(firestoreDb, 'pedidos', id), payload, { merge: true }), 2000).catch(
    () => {}
  );

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
    Promise.resolve(supabase.from('pedidos').update({ estado }).eq('id', id)).catch(() => {});
  }

  conTimeout(updateDoc(doc(firestoreDb, 'pedidos', id), { estado }), 2000).catch(() => {});
}

export async function eliminarPedidoDB(id: string): Promise<void> {
  const cache = leerCacheLocal();
  guardarCacheLocal({
    pedidos: cache.pedidos.filter((p) => p.id !== id),
  });

  if (supabase) {
    Promise.resolve(supabase.from('pedidos').delete().eq('id', id)).catch(() => {});
  }

  conTimeout(deleteDoc(doc(firestoreDb, 'pedidos', id)), 2000).catch(() => {});
}
