import {
  Insumo,
  Receta,
  RecetaItem,
  ResumenCostosReceta,
  UnidadMedida,
  Pedido,
  EstadoSaludPrecio,
  DesgloseItemCosto,
} from './types';

/**
 * Convierte una cantidad y su unidad a la unidad base correspondiente:
 * - kg -> g (x1000)
 * - l -> ml (x1000)
 * - g, ml, u, cm -> x1
 */
export function convertirAUnidadBase(
  cantidad: number,
  unidad: UnidadMedida
): { valor: number; base: 'g' | 'ml' | 'u' | 'cm' } {
  switch (unidad) {
    case 'kg':
      return { valor: cantidad * 1000, base: 'g' };
    case 'g':
      return { valor: cantidad, base: 'g' };
    case 'l':
      return { valor: cantidad * 1000, base: 'ml' };
    case 'ml':
      return { valor: cantidad, base: 'ml' };
    case 'cm':
      return { valor: cantidad, base: 'cm' };
    case 'u':
    default:
      return { valor: cantidad, base: 'u' };
  }
}

/**
 * Calcula el costo por unidad base ($/g, $/ml, $/u, $/cm) y una etiqueta fácil de leer
 */
export function obtenerCostoUnitarioInsumo(insumo: Insumo): {
  costoPorUnidadCompra: number;
  costoPorUnidadBase: number;
  unidadBase: 'g' | 'ml' | 'u' | 'cm';
  etiquetaCostoLegible: string;
} {
  const cantPaquete = Number(insumo.cantidad_paquete) || 1;
  const precio = Number(insumo.precio_compra) || 0;
  const costoPorUnidadCompra = precio / cantPaquete;

  const { valor: cantidadBase, base: unidadBase } = convertirAUnidadBase(cantPaquete, insumo.unidad);
  const costoPorUnidadBase = cantidadBase > 0 ? precio / cantidadBase : 0;

  let etiquetaCostoLegible = '';
  if (unidadBase === 'g') {
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase * 100)} cada 100 g`;
  } else if (unidadBase === 'ml') {
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase * 100)} cada 100 ml`;
  } else if (unidadBase === 'cm') {
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase * 100)} el metro`;
  } else {
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase)} cada uno`;
  }

  return {
    costoPorUnidadCompra,
    costoPorUnidadBase,
    unidadBase,
    etiquetaCostoLegible,
  };
}

/**
 * Calcula el costo exacto de un item dentro de una receta teniendo en cuenta las conversiones de unidades
 */
export function calcularCostoItemReceta(
  item: RecetaItem,
  insumo: Insumo | undefined,
  factorEscala: number = 1
): number {
  if (!insumo) return 0;
  const cantidadEscalada = (Number(item.cantidad) || 0) * factorEscala;
  const { costoPorUnidadBase, unidadBase } = obtenerCostoUnitarioInsumo(insumo);
  const { valor: cantItemBase, base: itemBase } = convertirAUnidadBase(cantidadEscalada, item.unidad);

  // Si coinciden las familias de unidades (ej. kg con g, l con ml), usamos la unidad base normalizada
  if (unidadBase === itemBase) {
    return cantItemBase * costoPorUnidadBase;
  }

  // Respaldo si se mezclaron unidades distintas
  const cantPaquete = Number(insumo.cantidad_paquete) || 1;
  return cantidadEscalada * ((Number(insumo.precio_compra) || 0) / cantPaquete);
}

/**
 * Redondea un precio sugerido para que sea cómodo de cobrar
 */
export function redondearPrecioComercial(valor: number): number {
  if (valor <= 0) return 0;
  if (valor < 1000) {
    return Math.ceil(valor / 50) * 50;
  }
  return Math.ceil(valor / 100) * 100;
}

/** Precio que deja el margen indicado (porcentaje del precio de venta) */
export function precioParaMargen(costo: number, margenPorcentaje: number): number {
  const margen = Math.min(Math.max(margenPorcentaje, 5), 90);
  return redondearPrecioComercial(costo / (1 - margen / 100));
}

/**
 * Calcula todo el desglose de costos de una receta:
 * - Masa vs Relleno/Cobertura vs Empaque vs Gastos Extras
 * - Costo por unidad, por pack y por preparación completa
 * - Diagnóstico de ganancia y sugerencia de precios
 */
export function calcularCostosReceta(
  receta: Receta,
  insumosMap: Map<string, Insumo>,
  factorEscala: number = 1
): ResumenCostosReceta {
  const escala = factorEscala > 0 ? factorEscala : 1;
  const rendimientoBase = Number(receta.rendimiento_cantidad) || 1;
  const rendimientoEscalado = rendimientoBase * escala;
  const unidadesPorPack = Number(receta.unidades_por_pack) || rendimientoBase;
  const cantidadPacksEnLote = unidadesPorPack > 0 ? rendimientoEscalado / unidadesPorPack : 1;

  let costoMasa = 0;
  let costoRellenoCobertura = 0;
  let costoEmpaque = 0;

  const itemsMasa: DesgloseItemCosto[] = [];
  const itemsRelleno: DesgloseItemCosto[] = [];
  const itemsEmpaque: DesgloseItemCosto[] = [];

  for (const item of receta.items || []) {
    const insumo = insumosMap.get(item.insumo_id) || item.insumo;
    const cantidadEscalada = (Number(item.cantidad) || 0) * escala;
    const costoItem = calcularCostoItemReceta(item, insumo, escala);

    const desglose: DesgloseItemCosto = {
      item,
      insumo,
      cantidadEscalada,
      costoItem,
      porcentajeDelTotal: 0,
    };

    if (item.seccion === 'masa') {
      costoMasa += costoItem;
      itemsMasa.push(desglose);
    } else if (item.seccion === 'relleno_cobertura') {
      costoRellenoCobertura += costoItem;
      itemsRelleno.push(desglose);
    } else {
      costoEmpaque += costoItem;
      itemsEmpaque.push(desglose);
    }
  }

  const costoIngredientesTotal = costoMasa + costoRellenoCobertura;
  const porcentajeExtras = Number(receta.porcentaje_gastos_extras) || 0;
  const costoGastosExtras = costoIngredientesTotal * (porcentajeExtras / 100);
  const costoManoObra = (Number(receta.costo_mano_obra_lote) || 0) * escala;

  const costoTotalLote =
    costoMasa + costoRellenoCobertura + costoEmpaque + costoGastosExtras + costoManoObra;

  const todosItems = [...itemsMasa, ...itemsRelleno, ...itemsEmpaque];
  for (const d of todosItems) {
    d.porcentajeDelTotal = costoTotalLote > 0 ? (d.costoItem / costoTotalLote) * 100 : 0;
  }

  const costoPorUnidad = rendimientoEscalado > 0 ? costoTotalLote / rendimientoEscalado : 0;
  const costoMasaPorUnidad = rendimientoEscalado > 0 ? costoMasa / rendimientoEscalado : 0;
  const costoRellenoPorUnidad =
    rendimientoEscalado > 0 ? costoRellenoCobertura / rendimientoEscalado : 0;
  const costoEmpaquePorUnidad = rendimientoEscalado > 0 ? costoEmpaque / rendimientoEscalado : 0;
  const costoPorPack = costoPorUnidad * unidadesPorPack;

  // Margen objetivo para calcular el precio sugerido
  const margenObjetivo = Math.min(Math.max(Number(receta.margen_objetivo_porcentaje) || 55, 10), 90);
  const divisorMargen = 1 - margenObjetivo / 100;

  const precioSugeridoUnidad = redondearPrecioComercial(costoPorUnidad / divisorMargen);
  const precioSugeridoPack = redondearPrecioComercial(costoPorPack / divisorMargen);
  const precioSugeridoLote = redondearPrecioComercial(costoTotalLote / divisorMargen);

  // Precios de venta configurados por la pastelera
  const precioVentaPack = Number(receta.precio_venta_pack) || precioSugeridoPack;
  const precioVentaUnidad =
    Number(receta.precio_venta_unidad) ||
    (unidadesPorPack > 0 ? Math.round(precioVentaPack / unidadesPorPack) : precioSugeridoUnidad);
  const precioVentaLote =
    (Number(receta.precio_venta_lote) || precioVentaPack * (rendimientoBase / unidadesPorPack)) *
    escala;

  const gananciaPorUnidad = precioVentaUnidad - costoPorUnidad;
  const gananciaPorPack = precioVentaPack - costoPorPack;
  const gananciaPorLote = precioVentaLote - costoTotalLote;

  const margenRealPorcentaje =
    precioVentaLote > 0 ? ((precioVentaLote - costoTotalLote) / precioVentaLote) * 100 : 0;
  const multiplicadorSobreCosto = costoTotalLote > 0 ? precioVentaLote / costoTotalLote : 0;

  let estadoSalud: EstadoSaludPrecio = 'correcto';
  let mensajeDiagnostico = '';
  const pack = (receta.nombre_pack || 'unidad').toLowerCase();

  if (gananciaPorLote <= 0) {
    estadoSalud = 'perdida';
    mensajeDiagnostico = `Con este precio pierdes dinero: hacer cada ${pack} te cuesta ${formatearMoneda(costoPorPack)}. Súbelo al menos a ${formatearMoneda(precioSugeridoPack)}.`;
  } else if (margenRealPorcentaje < 38) {
    estadoSalud = 'bajo';
    mensajeDiagnostico = `Cubres los costos, pero queda poco por tu trabajo. Un buen precio sería ${formatearMoneda(precioSugeridoPack)}.`;
  } else if (margenRealPorcentaje < 55) {
    estadoSalud = 'correcto';
    mensajeDiagnostico = `Buen precio: te quedan ${formatearMoneda(gananciaPorPack)} por cada ${pack}.`;
  } else {
    estadoSalud = 'excelente';
    mensajeDiagnostico = `Muy buen precio: te quedan ${formatearMoneda(gananciaPorPack)} por cada ${pack}.`;
  }

  return {
    factorEscala: escala,
    rendimientoEscalado,
    cantidadPacksEnLote,
    costoMasa,
    costoRellenoCobertura,
    costoIngredientesTotal,
    costoEmpaque,
    costoGastosExtras,
    costoManoObra,
    costoTotalLote,
    costoPorUnidad,
    costoMasaPorUnidad,
    costoRellenoPorUnidad,
    costoEmpaquePorUnidad,
    costoPorPack,
    precioVentaUnidad,
    precioVentaPack,
    precioVentaLote,
    gananciaPorUnidad,
    gananciaPorPack,
    gananciaPorLote,
    margenRealPorcentaje,
    multiplicadorSobreCosto,
    estadoSalud,
    mensajeDiagnostico,
    precioSugeridoUnidad,
    precioSugeridoPack,
    precioSugeridoLote,
    itemsMasa,
    itemsRelleno,
    itemsEmpaque,
  };
}

const FORMATO_PESOS = new Intl.NumberFormat('es-CL', {
  maximumFractionDigits: 0,
  useGrouping: 'always',
} as Intl.NumberFormatOptions);

/**
 * Formatea valores en pesos chilenos (sin decimales): $12.500
 */
export function formatearMoneda(valor: number): string {
  const num = Math.round(Number(valor) || 0);
  return `${num < 0 ? '-' : ''}$${FORMATO_PESOS.format(Math.abs(num))}`;
}

function limpiarNumero(num: number): string {
  const redondeado = Math.round(num * 100) / 100;
  return String(redondeado).replace('.', ',');
}

/** Cantidades como se leen en la cocina: 250 g, 1,5 kg, 2 unidades */
export function formatearCantidad(valor: number, unidad: string): string {
  const num = Number(valor) || 0;
  if (unidad === 'g' && num >= 1000) return `${limpiarNumero(num / 1000)} kg`;
  if (unidad === 'ml' && num >= 1000) return `${limpiarNumero(num / 1000)} l`;
  if (unidad === 'u') return `${limpiarNumero(num)} ${num === 1 ? 'unidad' : 'unidades'}`;
  return `${limpiarNumero(num)} ${unidad}`;
}

/** Unidades que se pueden usar con un insumo según cómo se compra */
export function unidadesCompatibles(unidad: UnidadMedida): UnidadMedida[] {
  if (unidad === 'g' || unidad === 'kg') return ['g', 'kg'];
  if (unidad === 'ml' || unidad === 'l') return ['ml', 'l'];
  return [unidad];
}

export const NOMBRE_UNIDAD: Record<UnidadMedida, string> = {
  g: 'gramos',
  kg: 'kilos',
  ml: 'mililitros',
  l: 'litros',
  u: 'unidades',
  cm: 'centímetros',
};

/** Fecha de hoy en formato AAAA-MM-DD según la hora local (no UTC) */
export function hoyISO(): string {
  const d = new Date();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

function fechaLocal(fechaISO: string): Date | null {
  const [a, m, d] = (fechaISO || '').split('-').map(Number);
  if (!a || !m || !d) return null;
  return new Date(a, m - 1, d);
}

const FORMATO_DIA = new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

export type TonoFecha = 'atrasado' | 'hoy' | 'pronto' | 'normal';

/** Convierte una fecha de entrega en algo que se lee de un vistazo: Hoy, Mañana, vie 20 nov */
export function describirFecha(fechaISO: string): {
  texto: string;
  tono: TonoFecha;
  dias: number;
} {
  const fecha = fechaLocal(fechaISO);
  if (!fecha) return { texto: 'Sin fecha', tono: 'normal', dias: 9999 };
  const hoy = fechaLocal(hoyISO())!;
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  const corta = FORMATO_DIA.format(fecha).split('.').join('');
  if (dias < 0) return { texto: `Atrasado · ${corta}`, tono: 'atrasado', dias };
  if (dias === 0) return { texto: 'Hoy', tono: 'hoy', dias };
  if (dias === 1) return { texto: 'Mañana', tono: 'pronto', dias };
  return { texto: corta, tono: 'normal', dias };
}

export interface ItemCompra {
  insumo: Insumo;
  unidadBase: string;
  necesario: number;
  enCasa: number;
  faltante: number;
}

/**
 * Suma lo que hace falta para todos los pedidos que aún no se preparan
 * y lo compara con lo que hay en casa.
 */
export function calcularListaCompras(
  pedidos: Pedido[],
  recetas: Receta[],
  insumosMap: Map<string, Insumo>
): ItemCompra[] {
  const mapa = new Map<string, ItemCompra>();
  const porCocinar = pedidos.filter(
    (p) => p.estado === 'pendiente' || p.estado === 'en_preparacion'
  );

  for (const ped of porCocinar) {
    const rec = recetas.find((r) => r.id === ped.receta_id);
    if (!rec) continue;
    for (const item of rec.items) {
      const ins = insumosMap.get(item.insumo_id);
      if (!ins) continue;
      const { valor, base } = convertirAUnidadBase(
        (Number(item.cantidad) || 0) * (Number(ped.cantidad_lotes) || 1),
        item.unidad
      );
      const actual = mapa.get(ins.id);
      if (actual) {
        actual.necesario += valor;
      } else {
        const { valor: enCasa } = convertirAUnidadBase(Number(ins.stock_actual) || 0, ins.unidad);
        mapa.set(ins.id, { insumo: ins, unidadBase: base, necesario: valor, enCasa, faltante: 0 });
      }
    }
  }

  return Array.from(mapa.values())
    .map((it) => ({ ...it, faltante: Math.max(0, it.necesario - it.enCasa) }))
    .sort(
      (a, b) =>
        Number(b.faltante > 0) - Number(a.faltante > 0) ||
        a.insumo.nombre.localeCompare(b.insumo.nombre)
    );
}

/** "brownies" -> "brownie" (para frases como "por cada brownie") */
export function singular(palabra: string): string {
  const p = (palabra || 'unidad').trim();
  if (/(d|l|n|r|z)es$/i.test(p) && p.length > 4) return p.slice(0, -2);
  if (/s$/i.test(p) && p.length > 2) return p.slice(0, -1);
  return p;
}
