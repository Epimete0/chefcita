import {
  Insumo,
  Receta,
  RecetaItem,
  ResumenCostosReceta,
  UnidadMedida,
  Pedido,
  Venta,
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
  if (precio <= 0) {
    etiquetaCostoLegible = 'Falta precio';
  } else if (unidadBase === 'g') {
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
  let tieneInsumoSinPrecio = false;

  for (const item of receta.items || []) {
    const insumo = insumosMap.get(item.insumo_id) || item.insumo;
    if (!insumo || (Number(insumo.precio_compra) || 0) <= 0) {
      tieneInsumoSinPrecio = true;
    }
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
  const costoIncompleto =
    Boolean(receta.costo_incompleto) || costoTotalLote <= 0 || tieneInsumoSinPrecio;

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

  const precioSugeridoUnidad = costoIncompleto
    ? 0
    : redondearPrecioComercial(costoPorUnidad / divisorMargen);
  const precioSugeridoPack = costoIncompleto
    ? 0
    : redondearPrecioComercial(costoPorPack / divisorMargen);
  const precioSugeridoLote = costoIncompleto
    ? 0
    : redondearPrecioComercial(costoTotalLote / divisorMargen);

  // Precios de venta configurados por la pastelera (sin inventar precio si el costo está incompleto)
  const precioVentaPack =
    Number(receta.precio_venta_pack) || (costoIncompleto ? 0 : precioSugeridoPack);
  const precioVentaUnidad =
    Number(receta.precio_venta_unidad) ||
    (unidadesPorPack > 0 && precioVentaPack > 0
      ? Math.round(precioVentaPack / unidadesPorPack)
      : precioSugeridoUnidad);
  const precioVentaLote =
    (Number(receta.precio_venta_lote) ||
      (precioVentaPack > 0 ? precioVentaPack * (rendimientoBase / unidadesPorPack) : 0)) *
    escala;

  const gananciaPorUnidad = costoIncompleto ? 0 : precioVentaUnidad - costoPorUnidad;
  const gananciaPorPack = costoIncompleto ? 0 : precioVentaPack - costoPorPack;
  const gananciaPorLote = costoIncompleto ? 0 : precioVentaLote - costoTotalLote;

  const margenRealPorcentaje =
    !costoIncompleto && precioVentaLote > 0
      ? ((precioVentaLote - costoTotalLote) / precioVentaLote) * 100
      : 0;
  const multiplicadorSobreCosto =
    !costoIncompleto && costoTotalLote > 0 ? precioVentaLote / costoTotalLote : 0;

  let estadoSalud: EstadoSaludPrecio = 'correcto';
  let mensajeDiagnostico = '';
  const pack = (receta.nombre_pack || 'unidad').toLowerCase();

  if (costoIncompleto) {
    estadoSalud = 'bajo';
    mensajeDiagnostico =
      'Costo incompleto: falta completar ingredientes o precios antes de calcular la ganancia real.';
  } else if (gananciaPorLote <= 0) {
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
    costoIncompleto,
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

const FORMATO_DIA_LARGO = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const FORMATO_MES_ANIO = new Intl.DateTimeFormat('es-CL', {
  month: 'long',
  year: 'numeric',
});

function dateAISO(d: Date): string {
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Suma o resta días a una fecha YYYY-MM-DD en calendario local */
export function sumarDiasISO(fechaISO: string, dias: number): string {
  const base = fechaLocal(fechaISO) || fechaLocal(hoyISO())!;
  return dateAISO(new Date(base.getFullYear(), base.getMonth(), base.getDate() + dias));
}

/** Suma o resta meses a un mes YYYY-MM */
export function sumarMesISO(mesISO: string, meses: number): string {
  const [a, m] = (mesISO || '').split('-').map(Number);
  const d = a && m ? new Date(a, m - 1 + meses, 1) : new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/** Formatea un mes YYYY-MM como "noviembre 2026" */
export function formatearMesAnio(mesISO: string): string {
  const [a, m] = (mesISO || '').split('-').map(Number);
  if (!a || !m) return mesISO;
  return FORMATO_MES_ANIO.format(new Date(a, m - 1, 1));
}

/** Formatea la fecha de una venta diaria sin usar etiquetas de atraso */
export function formatearFechaVenta(fechaISO: string): {
  texto: string;
  corta: string;
  larga: string;
  esHoy: boolean;
  esAyer: boolean;
} {
  const fecha = fechaLocal(fechaISO);
  if (!fecha) {
    return { texto: 'Sin fecha', corta: 'Sin fecha', larga: 'Sin fecha', esHoy: false, esAyer: false };
  }
  const hoy = fechaLocal(hoyISO())!;
  const dias = Math.round((fecha.getTime() - hoy.getTime()) / 86400000);
  const corta = FORMATO_DIA.format(fecha).split('.').join('');
  const larga = FORMATO_DIA_LARGO.format(fecha);
  const esHoy = dias === 0;
  const esAyer = dias === -1;
  const texto = esHoy ? 'Hoy' : esAyer ? 'Ayer' : dias === 1 ? 'Mañana' : corta;
  return { texto, corta, larga, esHoy, esAyer };
}

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

export interface ResultadoCalculoVenta {
  presentacionNombre: string;
  unidadesPorPresentacion: number;
  unidadesTotales: number;
  precioSugeridoUnitario: number;
  precioUnitario: number;
  totalVenta: number;
  costoUnitarioEstimado: number;
  costoTotalEstimado: number;
  gananciaNeta: number;
  costoIncompleto: boolean;
}

/** Calcula unidades, costo estimado, precio y ganancia para una línea de venta diaria */
export function calcularMontosVenta({
  receta,
  insumosMap,
  cantidad,
  modoPresentacion = 'pack',
  precioUnitarioManual,
  totalManual,
}: {
  receta?: Receta;
  insumosMap: Map<string, Insumo>;
  cantidad: number;
  modoPresentacion?: 'pack' | 'unidad';
  precioUnitarioManual?: number;
  totalManual?: number;
}): ResultadoCalculoVenta {
  const cant = Math.max(0, Number(cantidad) || 0);
  if (!receta) {
    const unit = Math.max(0, Number(precioUnitarioManual) || 0);
    const total =
      totalManual !== undefined ? Math.max(0, Number(totalManual) || 0) : Math.round(unit * cant);
    return {
      presentacionNombre: 'Unidad',
      unidadesPorPresentacion: 1,
      unidadesTotales: cant,
      precioSugeridoUnitario: 0,
      precioUnitario: cant > 0 && totalManual !== undefined ? Math.round(total / cant) : unit,
      totalVenta: total,
      costoUnitarioEstimado: 0,
      costoTotalEstimado: 0,
      gananciaNeta: 0,
      costoIncompleto: true,
    };
  }

  const res = calcularCostosReceta(receta, insumosMap, 1);
  const unidPack = Math.max(1, Number(receta.unidades_por_pack) || 1);
  const porUnidad = modoPresentacion === 'unidad' || unidPack <= 1;

  const presentacionNombre =
    modoPresentacion === 'unidad'
      ? singular(receta.rendimiento_unidad)
      : unidPack > 1
        ? receta.nombre_pack || `Caja x${unidPack}`
        : receta.nombre_pack && receta.nombre_pack !== 'Unidad'
          ? receta.nombre_pack
          : singular(receta.rendimiento_unidad);

  const unidadesPorPresentacion = porUnidad && modoPresentacion === 'unidad' ? 1 : unidPack;
  const unidadesTotales = cant * unidadesPorPresentacion;

  const precioSugeridoUnitario = Math.round(
    porUnidad && modoPresentacion === 'unidad' ? res.precioVentaUnidad : res.precioVentaPack
  );
  const costoUnitarioEstimado = Math.round(
    porUnidad && modoPresentacion === 'unidad' ? res.costoPorUnidad : res.costoPorPack
  );

  const unit =
    precioUnitarioManual !== undefined ? Math.max(0, Number(precioUnitarioManual) || 0) : precioSugeridoUnitario;
  const totalVenta =
    totalManual !== undefined ? Math.max(0, Number(totalManual) || 0) : Math.round(unit * cant);
  const precioUnitario =
    cant > 0 && totalManual !== undefined ? Math.round(totalVenta / cant) : unit;
  const costoTotalEstimado = Math.round(costoUnitarioEstimado * cant);
  const costoIncompleto = res.costoIncompleto;
  const gananciaNeta = costoIncompleto ? 0 : totalVenta - costoTotalEstimado;

  return {
    presentacionNombre,
    unidadesPorPresentacion,
    unidadesTotales,
    precioSugeridoUnitario,
    precioUnitario,
    totalVenta,
    costoUnitarioEstimado,
    costoTotalEstimado,
    gananciaNeta,
    costoIncompleto,
  };
}

export interface ResumenProductoVendido {
  clave: string;
  productoNombre: string;
  presentacionNombre: string;
  cantidad: number;
  unidadesTotales: number;
  totalVenta: number;
}

export interface ResumenVentasGrupo {
  totalVendido: number;
  cantidadRegistros: number;
  cantidadPresentaciones: number;
  gananciaConocida: number;
  tieneCostoIncompleto: boolean;
  productos: ResumenProductoVendido[];
}

/** Agrupa y suma un conjunto de ventas (por ejemplo, de un día o de un mes) */
export function resumirVentas(ventas: Venta[]): ResumenVentasGrupo {
  let totalVendido = 0;
  let cantidadPresentaciones = 0;
  let gananciaConocida = 0;
  let tieneCostoIncompleto = false;
  const mapa = new Map<string, ResumenProductoVendido>();

  for (const v of ventas) {
    const total = Number(v.total_venta) || 0;
    const cant = Number(v.cantidad) || 0;
    const unid = Number(v.unidades_totales) || cant;
    totalVendido += total;
    cantidadPresentaciones += cant;
    if (v.costo_incompleto) {
      tieneCostoIncompleto = true;
    } else {
      gananciaConocida += Number(v.ganancia_neta) || 0;
    }

    const clave = `${v.producto_nombre}::${v.presentacion_nombre}`;
    const actual = mapa.get(clave);
    if (actual) {
      actual.cantidad += cant;
      actual.unidadesTotales += unid;
      actual.totalVenta += total;
    } else {
      mapa.set(clave, {
        clave,
        productoNombre: v.producto_nombre,
        presentacionNombre: v.presentacion_nombre,
        cantidad: cant,
        unidadesTotales: unid,
        totalVenta: total,
      });
    }
  }

  const productos = Array.from(mapa.values()).sort(
    (a, b) => b.totalVenta - a.totalVenta || b.cantidad - a.cantidad
  );

  return {
    totalVendido,
    cantidadRegistros: ventas.length,
    cantidadPresentaciones,
    gananciaConocida,
    tieneCostoIncompleto,
    productos,
  };
}
