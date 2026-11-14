import {
  Insumo,
  Receta,
  RecetaItem,
  ResumenCostosReceta,
  UnidadMedida,
  EstadoSaludPrecio,
  DesgloseItemCosto,
} from './types';

/**
 * Convierte una cantidad y su unidad a la unidad base correspondiente:
 * - kg -> g (x1000)
 * - l -> ml (x1000)
 * - g, ml, u, cm -> x1
 */
export function convertirAUnidadBase(cantidad: number, unidad: UnidadMedida): { valor: number; base: 'g' | 'ml' | 'u' | 'cm' } {
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
 * Calcula el costo por unidad base (ej. $/g, $/ml, $/u, $/cm) y también el costo en la unidad de compra
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
    const por100g = costoPorUnidadBase * 100;
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase, true)} / g (${formatearMoneda(por100g)} cada 100g)`;
  } else if (unidadBase === 'ml') {
    const por100ml = costoPorUnidadBase * 100;
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase, true)} / ml (${formatearMoneda(por100ml)} cada 100ml)`;
  } else if (unidadBase === 'cm') {
    const porMetro = costoPorUnidadBase * 100;
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase, true)} / cm (${formatearMoneda(porMetro)} el metro)`;
  } else {
    etiquetaCostoLegible = `${formatearMoneda(costoPorUnidadBase)} c/u`;
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

  // Fallback directo si el usuario mezcló unidades distintas
  const cantPaquete = Number(insumo.cantidad_paquete) || 1;
  return cantidadEscalada * ((Number(insumo.precio_compra) || 0) / cantPaquete);
}

/**
 * Redondea un precio sugerido al múltiplo de 50 o 100 más cercano para que sea comercialmente limpio
 */
export function redondearPrecioComercial(valor: number): number {
  if (valor <= 0) return 0;
  if (valor < 1000) {
    return Math.ceil(valor / 50) * 50;
  }
  return Math.ceil(valor / 100) * 100;
}

/**
 * Calcula todo el desglose de costos de una receta:
 * - Masa vs Relleno/Cobertura vs Empaque vs Gastos Extras
 * - Costo por unidad, por pack (ej. Caja x6) y por lote completo
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
    const insumo = item.insumo || insumosMap.get(item.insumo_id);
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

  // Actualizar porcentajes de cada item sobre el costo total
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

  if (gananciaPorLote <= 0) {
    estadoSalud = 'perdida';
    mensajeDiagnostico = `¡Atención! A este precio perdés plata. Tu costo por ${receta.nombre_pack.toLowerCase()} es ${formatearMoneda(costoPorPack)}. Subilo al menos a ${formatearMoneda(precioSugeridoPack)}.`;
  } else if (margenRealPorcentaje < 38) {
    estadoSalud = 'bajo';
    mensajeDiagnostico = `Ganancia ajustada (${Math.round(margenRealPorcentaje)}%). Cubrís masa y empaque, pero te queda poco por tu tiempo. Te sugerimos vender cada ${receta.nombre_pack.toLowerCase()} a ${formatearMoneda(precioSugeridoPack)}.`;
  } else if (margenRealPorcentaje < 55) {
    estadoSalud = 'correcto';
    mensajeDiagnostico = `¡Precio saludable! Cubrís el costo de masa (${formatearMoneda(costoMasa)}), relleno (${formatearMoneda(costoRellenoCobertura)}) y empaque (${formatearMoneda(costoEmpaque)}), ganando ${formatearMoneda(gananciaPorPack)} limpios por ${receta.nombre_pack.toLowerCase()}.`;
  } else {
    estadoSalud = 'excelente';
    mensajeDiagnostico = `¡Excelente rentabilidad (${Math.round(margenRealPorcentaje)}% de margen | x${multiplicadorSobreCosto.toFixed(1)})! Ganás ${formatearMoneda(gananciaPorPack)} limpios por cada ${receta.nombre_pack.toLowerCase()} (${formatearMoneda(gananciaPorLote)} por lote).`;
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

/**
 * Formatea valores en pesos de manera clara y amigable
 */
export function formatearMoneda(valor: number, conDecimales: boolean = false): string {
  const num = Number(valor) || 0;
  if (conDecimales || (num > 0 && num < 10)) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: num < 10 ? 2 : 0,
      maximumFractionDigits: 2,
    }).format(num);
  }
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(num));
}

export function formatearCantidad(valor: number, unidad: string): string {
  const num = Number(valor) || 0;
  const redondeado = Number.isInteger(num) ? num.toString() : num.toFixed(1).replace(/\.0$/, '');
  return `${redondeado} ${unidad}`;
}
