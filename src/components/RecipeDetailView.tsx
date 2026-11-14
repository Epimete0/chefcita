'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Insumo,
  Receta,
  ResumenCostosReceta,
} from '@/lib/types';
import {
  calcularCostosReceta,
  formatearMoneda,
  formatearCantidad,
  redondearPrecioComercial,
} from '@/lib/costing';
import {
  CookingPot,
  Package,
  CurrencyDollar,
  Sparkle,
  Timer,
  CheckCircle,
  Circle,
  Fire,
  Scales,
  TrendUp,
  WarningCircle,
  PencilSimple,
  Trash,
  Play,
  Pause,
  ArrowCounterClockwise,
  Heart,
  SlidersHorizontal,
  ArrowUpRight,
  FloppyDisk,
  Info,
} from '@phosphor-icons/react';

interface RecipeDetailViewProps {
  receta: Receta;
  insumosMap: Map<string, Insumo>;
  onActualizarPrecios: (
    recetaId: string,
    precios: {
      precio_venta_pack: number;
      precio_venta_unidad: number;
      precio_venta_lote: number;
      margen_objetivo_porcentaje?: number;
      porcentaje_gastos_extras?: number;
    }
  ) => Promise<void>;
  onEditarReceta: (receta: Receta) => void;
  onEliminarReceta: (recetaId: string) => Promise<void>;
  onCrearPedidoDesdeReceta: (receta: Receta, factorEscala: number, resumen: ResumenCostosReceta) => void;
}

export default function RecipeDetailView({
  receta,
  insumosMap,
  onActualizarPrecios,
  onEditarReceta,
  onEliminarReceta,
  onCrearPedidoDesdeReceta,
}: RecipeDetailViewProps) {
  const [subTab, setSubTab] = useState<'costos' | 'preparar'>('costos');
  const [factorEscala, setFactorEscala] = useState<number>(1);
  const [unidadesPersonalizadas, setUnidadesPersonalizadas] = useState<string>('');

  // Estados del simulador interactivo de precio de venta en vivo
  const [precioPackEdit, setPrecioPackEdit] = useState<number>(receta.precio_venta_pack);
  const [precioUnidadEdit, setPrecioUnidadEdit] = useState<number>(receta.precio_venta_unidad);
  const [gastosExtrasEdit, setGastosExtrasEdit] = useState<number>(receta.porcentaje_gastos_extras);
  const [guardandoPrecio, setGuardandoPrecio] = useState(false);
  const [mensajeGuardado, setMensajeGuardado] = useState(false);

  // Estados para Modo Preparar (checklist de ingredientes + pasos + timer de cocina)
  const [ingredientesMarcados, setIngredientesMarcados] = useState<Record<string, boolean>>({});
  const [pasosMarcados, setPasosMarcados] = useState<Record<string, boolean>>({});
  const [timerActivoPasoId, setTimerActivoPasoId] = useState<string | null>(null);
  const [timerSegundosRestantes, setTimerSegundosRestantes] = useState<number>(0);
  const [timerCorriendo, setTimerCorriendo] = useState<boolean>(false);
  const [timerEtiqueta, setTimerEtiqueta] = useState<string>('');

  // Sincronizar cuando cambia la receta seleccionada
  useEffect(() => {
    setPrecioPackEdit(receta.precio_venta_pack);
    setPrecioUnidadEdit(receta.precio_venta_unidad);
    setGastosExtrasEdit(receta.porcentaje_gastos_extras);
    setFactorEscala(1);
    setUnidadesPersonalizadas('');
    setIngredientesMarcados({});
    setPasosMarcados({});
  }, [receta.id, receta.precio_venta_pack, receta.precio_venta_unidad, receta.porcentaje_gastos_extras]);

  // Efecto del Temporizador de Cocina
  useEffect(() => {
    if (!timerCorriendo || timerSegundosRestantes <= 0) return;
    const interval = setInterval(() => {
      setTimerSegundosRestantes((prev) => {
        if (prev <= 1) {
          setTimerCorriendo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerCorriendo, timerSegundosRestantes]);

  // Receta virtual con los precios editados en vivo para ver el diagnóstico instantáneo
  const recetaSimulada = useMemo<Receta>(() => {
    const packsPorLote =
      receta.unidades_por_pack > 0 ? receta.rendimiento_cantidad / receta.unidades_por_pack : 1;
    return {
      ...receta,
      porcentaje_gastos_extras: gastosExtrasEdit,
      precio_venta_pack: precioPackEdit,
      precio_venta_unidad: precioUnidadEdit,
      precio_venta_lote: Math.round(precioPackEdit * packsPorLote),
    };
  }, [receta, precioPackEdit, precioUnidadEdit, gastosExtrasEdit]);

  const resumen = useMemo(
    () => calcularCostosReceta(recetaSimulada, insumosMap, factorEscala),
    [recetaSimulada, insumosMap, factorEscala]
  );

  // Porcentajes para la barra visual de costos vs ganancia
  const porcentajeMasaSobreVenta =
    resumen.precioVentaLote > 0
      ? Math.min(Math.max((resumen.costoMasa / resumen.precioVentaLote) * 100, 3), 100)
      : 25;
  const porcentajeRellenoSobreVenta =
    resumen.precioVentaLote > 0
      ? Math.min(Math.max((resumen.costoRellenoCobertura / resumen.precioVentaLote) * 100, 3), 100)
      : 20;
  const porcentajeEmpaqueSobreVenta =
    resumen.precioVentaLote > 0
      ? Math.min(Math.max((resumen.costoEmpaque / resumen.precioVentaLote) * 100, 3), 100)
      : 15;
  const porcentajeExtrasSobreVenta =
    resumen.precioVentaLote > 0
      ? Math.min(Math.max((resumen.costoGastosExtras / resumen.precioVentaLote) * 100, 2), 100)
      : 5;
  const porcentajeGananciaSobreVenta = Math.max(
    0,
    100 -
      (porcentajeMasaSobreVenta +
        porcentajeRellenoSobreVenta +
        porcentajeEmpaqueSobreVenta +
        porcentajeExtrasSobreVenta)
  );

  const handleCambiarPrecioPack = (nuevoValorPack: number) => {
    const limpio = Math.max(0, Math.round(nuevoValorPack));
    setPrecioPackEdit(limpio);
    if (receta.unidades_por_pack > 0) {
      setPrecioUnidadEdit(redondearPrecioComercial(limpio / receta.unidades_por_pack));
    }
  };

  const handleAplicarMultiplicador = (mult: number) => {
    const costoPackBase = resumen.costoPorPack / (factorEscala > 0 ? 1 : 1);
    const sugerido = redondearPrecioComercial(costoPackBase * mult);
    handleCambiarPrecioPack(sugerido);
  };

  const handleGuardarPrecios = async () => {
    setGuardandoPrecio(true);
    try {
      const packsPorLote =
        receta.unidades_por_pack > 0 ? receta.rendimiento_cantidad / receta.unidades_por_pack : 1;
      await onActualizarPrecios(receta.id, {
        precio_venta_pack: precioPackEdit,
        precio_venta_unidad: precioUnidadEdit,
        precio_venta_lote: Math.round(precioPackEdit * packsPorLote),
        porcentaje_gastos_extras: gastosExtrasEdit,
      });
      setMensajeGuardado(true);
      setTimeout(() => setMensajeGuardado(false), 2500);
    } finally {
      setGuardandoPrecio(false);
    }
  };

  const iniciarTimerPaso = (pasoId: string, minutos: number, etapa: string) => {
    setTimerActivoPasoId(pasoId);
    setTimerSegundosRestantes(minutos * 60);
    setTimerEtiqueta(etapa);
    setTimerCorriendo(true);
  };

  const formatearSegundos = (seg: number) => {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalIngredientesCount = receta.items.length;
  const ingredientesCompletadosCount = Object.values(ingredientesMarcados).filter(Boolean).length;
  const totalPasosCount = receta.pasos.length;
  const pasosCompletadosCount = Object.values(pasosMarcados).filter(Boolean).length;

  return (
    <div className="space-y-5">
      {/* Encabezado Principal de la Receta Activa */}
      <div className="bezel-shell">
        <div className="bezel-core p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#BE123C]">
                  <Sparkle size={13} weight="fill" />
                  {receta.categoria}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] px-3 py-1 text-xs font-medium text-[#7A4957]">
                  Rinde <strong className="font-nums text-[#2B1118]">{resumen.rendimientoEscalado}</strong>{' '}
                  {receta.rendimiento_unidad}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] px-3 py-1 text-xs font-medium text-[#7A4957]">
                  <Fire size={14} weight="duotone" className="text-[#E11D48]" />
                  {receta.metodo_coccion} {receta.temperatura_horno_c > 0 ? `· ${receta.temperatura_horno_c}°C` : ''}
                </span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1118]">
                {receta.nombre}
              </h2>
              <p className="text-sm text-[#7A4957] max-w-2xl leading-relaxed">
                {receta.descripcion}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onEditarReceta(receta)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F3] hover:bg-[#FFE0E7] active:scale-[0.98] px-4 py-2 text-xs font-semibold text-[#BE123C] spring-transition cursor-pointer"
              >
                <PencilSimple size={15} weight="duotone" />
                Editar receta
              </button>
              <button
                type="button"
                onClick={() => onEliminarReceta(receta.id)}
                title="Eliminar receta"
                className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-[#FFF0F3] hover:bg-[#FFE0E7] text-[#9F1239] active:scale-[0.96] spring-transition cursor-pointer"
              >
                <Trash size={16} weight="light" />
              </button>
            </div>
          </div>

          {/* Selector de Escala / Tanda en 1 toque */}
          <div className="mt-5 pt-4 border-t border-[#F8DCE4] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Scales size={18} weight="duotone" className="text-[#E11D48]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-[#7A4957]">
                Tamaño de tanda (escala):
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '½ Lote', val: 0.5 },
                { label: '1 Lote base', val: 1 },
                { label: '1.5x', val: 1.5 },
                { label: 'Doble (2x)', val: 2 },
                { label: 'Triple (3x)', val: 3 },
              ].map((op) => {
                const activo = Math.abs(factorEscala - op.val) < 0.01 && unidadesPersonalizadas === '';
                return (
                  <button
                    key={op.val}
                    type="button"
                    onClick={() => {
                      setFactorEscala(op.val);
                      setUnidadesPersonalizadas('');
                    }}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold spring-transition cursor-pointer ${
                      activo
                        ? 'bg-[#BE123C] text-white shadow-sm'
                        : 'bg-[#FFF0F3] text-[#7A4957] hover:bg-[#FFE4E9] hover:text-[#2B1118]'
                    }`}
                  >
                    {op.label} ({Math.round(receta.rendimiento_cantidad * op.val)} {receta.rendimiento_unidad})
                  </button>
                );
              })}

              <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF0F3] px-3 py-1 border border-[#F3C6D3]">
                <span className="text-[11px] font-medium text-[#7A4957]">Exactas:</span>
                <input
                  type="number"
                  min={1}
                  placeholder={String(receta.rendimiento_cantidad)}
                  value={unidadesPersonalizadas}
                  onChange={(e) => {
                    const val = e.target.value;
                    setUnidadesPersonalizadas(val);
                    const num = Number(val);
                    if (num > 0 && receta.rendimiento_cantidad > 0) {
                      setFactorEscala(num / receta.rendimiento_cantidad);
                    } else {
                      setFactorEscala(1);
                    }
                  }}
                  className="w-14 text-center font-nums text-xs font-bold text-[#BE123C] bg-white rounded-full py-0.5 px-1.5 focus:outline-none focus:ring-1 focus:ring-[#E11D48]"
                />
              </div>
            </div>
          </div>

          {/* Sub-Navegación: Costos y Precio vs Modo Preparar */}
          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-[#FDF2F5] p-1.5 border border-[#F5D0DC]">
            <button
              type="button"
              onClick={() => setSubTab('costos')}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-bold spring-transition cursor-pointer ${
                subTab === 'costos'
                  ? 'bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white shadow-md'
                  : 'text-[#7A4957] hover:text-[#2B1118]'
              }`}
            >
              <CurrencyDollar size={18} weight="bold" />
              <span>Costos, Empaque y Precio</span>
            </button>
            <button
              type="button"
              onClick={() => setSubTab('preparar')}
              className={`flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs sm:text-sm font-bold spring-transition cursor-pointer ${
                subTab === 'preparar'
                  ? 'bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white shadow-md'
                  : 'text-[#7A4957] hover:text-[#2B1118]'
              }`}
            >
              <CookingPot size={18} weight="duotone" />
              <span>Modo Preparar y Pasos ({receta.pasos.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* VISTA 1: COSTOS DE MASA, RELLENO, EMPAQUE Y SIMULADOR DE PRECIO      */}
      {/* ==================================================================== */}
      {subTab === 'costos' && (
        <div className="space-y-5">
          {/* 4 Tarjetas Clave del Desglose (Masa | Cobertura/Relleno | Empaque | Costo Total) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Costo de la Masa */}
            <div className="bezel-shell">
              <div className="bezel-core p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#9F1239]">
                    1. Costo de Masa
                  </span>
                  <span className="w-7 h-7 rounded-full bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center">
                    <CookingPot size={15} weight="duotone" />
                  </span>
                </div>
                <div className="my-2">
                  <div className="font-nums text-xl sm:text-2xl font-bold text-[#2B1118]">
                    {formatearMoneda(resumen.costoMasa)}
                  </div>
                  <div className="text-xs text-[#7A4957] mt-0.5">
                    <span className="font-nums font-semibold text-[#BE123C]">
                      {formatearMoneda(resumen.costoMasaPorUnidad)}
                    </span>{' '}
                    por cada {receta.rendimiento_unidad.replace(/s$/, '')}
                  </div>
                </div>
                <div className="text-[11px] text-[#7A4957] bg-[#FFF5F7] rounded-xl px-2.5 py-1.5">
                  {resumen.itemsMasa.length} insumos en la masa base
                </div>
              </div>
            </div>

            {/* 2. Costo de Relleno / Cobertura */}
            <div className="bezel-shell">
              <div className="bezel-core p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#C2185B]">
                    2. Baño y Relleno
                  </span>
                  <span className="w-7 h-7 rounded-full bg-[#FCE7F3] text-[#BE185D] flex items-center justify-center">
                    <Heart size={15} weight="duotone" />
                  </span>
                </div>
                <div className="my-2">
                  <div className="font-nums text-xl sm:text-2xl font-bold text-[#2B1118]">
                    {formatearMoneda(resumen.costoRellenoCobertura)}
                  </div>
                  <div className="text-xs text-[#7A4957] mt-0.5">
                    <span className="font-nums font-semibold text-[#BE185D]">
                      {formatearMoneda(resumen.costoRellenoPorUnidad)}
                    </span>{' '}
                    por unidad
                  </div>
                </div>
                <div className="text-[11px] text-[#7A4957] bg-[#FDF2F8] rounded-xl px-2.5 py-1.5">
                  {resumen.itemsRelleno.length} insumos de decoración/relleno
                </div>
              </div>
            </div>

            {/* 3. Costo de Empaque */}
            <div className="bezel-shell">
              <div className="bezel-core p-4 h-full flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#B91C1C]">
                    3. Costo Empaque
                  </span>
                  <span className="w-7 h-7 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center">
                    <Package size={15} weight="duotone" />
                  </span>
                </div>
                <div className="my-2">
                  <div className="font-nums text-xl sm:text-2xl font-bold text-[#2B1118]">
                    {formatearMoneda(resumen.costoEmpaque)}
                  </div>
                  <div className="text-xs text-[#7A4957] mt-0.5">
                    <span className="font-nums font-semibold text-[#B91C1C]">
                      {formatearMoneda(
                        resumen.cantidadPacksEnLote > 0
                          ? resumen.costoEmpaque / resumen.cantidadPacksEnLote
                          : resumen.costoEmpaque
                      )}
                    </span>{' '}
                    por {receta.nombre_pack.toLowerCase()}
                  </div>
                </div>
                <div className="text-[11px] text-[#7A4957] bg-[#FEF2F2] rounded-xl px-2.5 py-1.5">
                  Cajas, stickers, papel y cinta ({resumen.itemsEmpaque.length})
                </div>
              </div>
            </div>

            {/* 4. Costo Total (Insumos + Empaque + Horno/Extras) */}
            <div className="bezel-shell">
              <div className="bezel-core p-4 h-full flex flex-col justify-between bg-gradient-to-br from-[#FFF5F7] to-white">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#2B1118]">
                    4. Costo Real Total
                  </span>
                  <span className="rounded-full bg-[#2B1118] text-white px-2 py-0.5 text-[10px] font-nums font-semibold">
                    +{gastosExtrasEdit}% extras
                  </span>
                </div>
                <div className="my-2">
                  <div className="font-nums text-xl sm:text-2xl font-extrabold text-[#BE123C]">
                    {formatearMoneda(resumen.costoTotalLote)}
                  </div>
                  <div className="text-xs text-[#7A4957] mt-0.5">
                    <strong className="font-nums text-[#2B1118]">
                      {formatearMoneda(resumen.costoPorPack)}
                    </strong>{' '}
                    por {receta.nombre_pack.toLowerCase()} ·{' '}
                    <strong className="font-nums text-[#2B1118]">
                      {formatearMoneda(resumen.costoPorUnidad)}
                    </strong>{' '}
                    c/u
                  </div>
                </div>
                <div className="text-[11px] text-[#7A4957] bg-white border border-[#F3C6D3] rounded-xl px-2.5 py-1.5">
                  Incluye {formatearMoneda(resumen.costoGastosExtras)} de luz/gas/horno
                </div>
              </div>
            </div>
          </div>

          {/* PANEL ESTRELLA: SIMULADOR DE PRECIO DE VENTA Y DIAGNÓSTICO DE GANANCIA */}
          <div className="bezel-shell-crimson">
            <div className="bezel-core p-5 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#F8DCE4]">
                <div>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#BE123C]">
                    <SlidersHorizontal size={14} weight="bold" />
                    Diagnóstico de Precio y Ganancia en Vivo
                  </span>
                  <h3 className="font-editorial text-xl sm:text-2xl font-bold text-[#2B1118] mt-0.5">
                    ¿A cuánto vender y cuánto te queda limpio?
                  </h3>
                </div>

                {/* Semáforo de Salud del Precio */}
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${
                    resumen.estadoSalud === 'excelente'
                      ? 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC]'
                      : resumen.estadoSalud === 'correcto'
                        ? 'bg-[#FEF9C3] text-[#854D0E] border border-[#FDE047]'
                        : 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5]'
                  }`}
                >
                  {resumen.estadoSalud === 'excelente' || resumen.estadoSalud === 'correcto' ? (
                    <TrendUp size={16} weight="bold" />
                  ) : (
                    <WarningCircle size={16} weight="bold" />
                  )}
                  <span>
                    {resumen.estadoSalud === 'excelente'
                      ? `Rentabilidad Excelente (${Math.round(resumen.margenRealPorcentaje)}% margen · x${resumen.multiplicadorSobreCosto.toFixed(1)})`
                      : resumen.estadoSalud === 'correcto'
                        ? `Precio Equilibrado (${Math.round(resumen.margenRealPorcentaje)}% margen · x${resumen.multiplicadorSobreCosto.toFixed(1)})`
                        : resumen.estadoSalud === 'bajo'
                          ? `Margen Bajo (${Math.round(resumen.margenRealPorcentaje)}%)`
                          : '¡Cuidado! Precio a pérdida'}
                  </span>
                </div>
              </div>

              {/* Barra Visual de cómo se reparte el Precio de Venta */}
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-medium text-[#7A4957] mb-2">
                  <span>¿Adónde va cada peso cuando vendés una tanda a {formatearMoneda(resumen.precioVentaLote)}?</span>
                  <span className="font-nums font-bold text-[#15803D]">
                    Tu ganancia limpia: {Math.max(0, Math.round(resumen.margenRealPorcentaje))}%
                  </span>
                </div>
                <div className="h-4 w-full rounded-full overflow-hidden flex bg-[#FCE7F3] p-0.5 gap-0.5">
                  <div
                    style={{ width: `${porcentajeMasaSobreVenta}%` }}
                    className="bg-[#FB7185] h-full rounded-l-full transition-all duration-300"
                    title={`Masa: ${formatearMoneda(resumen.costoMasa)}`}
                  />
                  <div
                    style={{ width: `${porcentajeRellenoSobreVenta}%` }}
                    className="bg-[#E11D48] h-full transition-all duration-300"
                    title={`Relleno/Baño: ${formatearMoneda(resumen.costoRellenoCobertura)}`}
                  />
                  <div
                    style={{ width: `${porcentajeEmpaqueSobreVenta}%` }}
                    className="bg-[#9F1239] h-full transition-all duration-300"
                    title={`Empaque: ${formatearMoneda(resumen.costoEmpaque)}`}
                  />
                  <div
                    style={{ width: `${porcentajeExtrasSobreVenta}%` }}
                    className="bg-[#F59E0B] h-full transition-all duration-300"
                    title={`Luz/Gas/Extras: ${formatearMoneda(resumen.costoGastosExtras)}`}
                  />
                  <div
                    style={{ width: `${porcentajeGananciaSobreVenta}%` }}
                    className="bg-[#10B981] h-full rounded-r-full transition-all duration-300"
                    title={`Ganancia Limpia: ${formatearMoneda(resumen.gananciaPorLote)}`}
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#7A4957]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FB7185]" />
                    Masa ({formatearMoneda(resumen.costoMasa)})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E11D48]" />
                    Relleno/Cobertura ({formatearMoneda(resumen.costoRellenoCobertura)})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9F1239]" />
                    Empaque ({formatearMoneda(resumen.costoEmpaque)})
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                    Horno/Gas ({formatearMoneda(resumen.costoGastosExtras)})
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-[#15803D]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                    Tu Ganancia Limpia ({formatearMoneda(resumen.gananciaPorLote)})
                  </span>
                </div>
              </div>

              {/* Comparativa 3 Columnas: Por Unidad | Por Caja/Pack | Por Lote Completo */}
              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Columna 1: Por Unidad */}
                <div className="rounded-2xl bg-[#FFF5F7] border border-[#F3C6D3] p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7A4957]">
                    Por 1 {receta.rendimiento_unidad.replace(/s$/, '')} individual
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-[#7A4957]">Costo real:</span>
                    <span className="font-nums text-sm font-semibold text-[#2B1118]">
                      {formatearMoneda(resumen.costoPorUnidad)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs text-[#7A4957]">Precio venta:</span>
                    <span className="font-nums text-lg font-bold text-[#BE123C]">
                      {formatearMoneda(resumen.precioVentaUnidad)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#F3C6D3] flex items-baseline justify-between">
                    <span className="text-xs font-bold text-[#15803D]">Ganancia neta:</span>
                    <span className="font-nums text-base font-extrabold text-[#15803D]">
                      +{formatearMoneda(resumen.gananciaPorUnidad)}
                    </span>
                  </div>
                </div>

                {/* Columna 2: Por Caja / Pack (Destacada) */}
                <div className="rounded-2xl bg-gradient-to-br from-[#BE123C] to-[#E11D48] text-white p-4 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#FFE4E9]">
                      Por {receta.nombre_pack} ({receta.unidades_por_pack} u.)
                    </span>
                    <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
                      Más vendido
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-[#FFE4E9]">Costo masa + caja:</span>
                    <span className="font-nums text-sm font-semibold text-white">
                      {formatearMoneda(resumen.costoPorPack)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs text-[#FFE4E9]">Precio de venta:</span>
                    <span className="font-nums text-xl font-extrabold text-white">
                      {formatearMoneda(resumen.precioVentaPack)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-white/20 flex items-baseline justify-between">
                    <span className="text-xs font-bold text-[#BBF7D0]">Ganancia en mano:</span>
                    <span className="font-nums text-lg font-extrabold text-[#BBF7D0]">
                      +{formatearMoneda(resumen.gananciaPorPack)}
                    </span>
                  </div>
                </div>

                {/* Columna 3: Por Lote Completo */}
                <div className="rounded-2xl bg-[#FFF5F7] border border-[#F3C6D3] p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-[#7A4957]">
                    Tanda Completa ({resumen.rendimientoEscalado} {receta.rendimiento_unidad})
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-xs text-[#7A4957]">Inversión total:</span>
                    <span className="font-nums text-sm font-semibold text-[#2B1118]">
                      {formatearMoneda(resumen.costoTotalLote)}
                    </span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="text-xs text-[#7A4957]">Venta total tanda:</span>
                    <span className="font-nums text-lg font-bold text-[#BE123C]">
                      {formatearMoneda(resumen.precioVentaLote)}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-[#F3C6D3] flex items-baseline justify-between">
                    <span className="text-xs font-bold text-[#15803D]">Ganancia limpia:</span>
                    <span className="font-nums text-base font-extrabold text-[#15803D]">
                      +{formatearMoneda(resumen.gananciaPorLote)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mensaje Diagnóstico Explicado en Lenguaje Simple */}
              <div className="mt-4 rounded-2xl bg-[#FFF0F3] border border-[#F3C6D3] p-3.5 flex items-start gap-3">
                <Info size={20} weight="duotone" className="text-[#BE123C] shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-[#2B1118] leading-relaxed">
                  {resumen.mensajeDiagnostico}
                </p>
              </div>

              {/* Controles Interactivos para Probar y Guardar Precio de Venta */}
              <div className="mt-5 pt-4 border-t border-[#F8DCE4] grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                <div className="lg:col-span-7 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#2B1118]">
                      Probar Precio de Venta por {receta.nombre_pack}:
                    </label>
                    <span className="font-nums text-sm font-extrabold text-[#BE123C]">
                      {formatearMoneda(precioPackEdit)}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={Math.max(500, Math.round(resumen.costoPorPack * 0.8))}
                    max={Math.max(5000, Math.round(resumen.costoPorPack * 4.2))}
                    step={100}
                    value={precioPackEdit}
                    onChange={(e) => handleCambiarPrecioPack(Number(e.target.value))}
                    className="chefcita-slider"
                  />
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[11px] text-[#7A4957] mr-1">Sugeridos rápidos:</span>
                    {[
                      { label: 'x2.0 (Amigo)', mult: 2.0 },
                      { label: 'x2.5 (Ideal Pastelería)', mult: 2.5 },
                      { label: 'x3.0 (Artisanal)', mult: 3.0 },
                    ].map((btn) => (
                      <button
                        key={btn.mult}
                        type="button"
                        onClick={() => handleAplicarMultiplicador(btn.mult)}
                        className="rounded-full bg-[#FFF0F3] hover:bg-[#FFE0E7] border border-[#F3C6D3] px-3 py-1 text-[11px] font-semibold text-[#BE123C] spring-transition cursor-pointer"
                      >
                        {btn.label}: {formatearMoneda(redondearPrecioComercial(resumen.costoPorPack * btn.mult))}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="lg:col-span-5 flex flex-wrap sm:flex-nowrap items-center justify-end gap-2">
                  <div className="flex items-center gap-1.5 bg-[#FFF5F7] border border-[#F3C6D3] rounded-full px-3 py-1.5">
                    <span className="text-xs font-medium text-[#7A4957]">Precio {receta.nombre_pack}: $</span>
                    <input
                      type="number"
                      value={precioPackEdit}
                      onChange={(e) => handleCambiarPrecioPack(Number(e.target.value))}
                      className="w-24 font-nums font-bold text-sm text-[#2B1118] bg-transparent focus:outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={guardandoPrecio}
                    onClick={handleGuardarPrecios}
                    className="inline-flex items-center gap-2 rounded-full bg-[#2B1118] hover:bg-[#451A26] active:scale-[0.98] text-white px-4 py-2.5 text-xs font-bold spring-transition cursor-pointer"
                  >
                    <FloppyDisk size={16} weight="duotone" />
                    <span>{mensajeGuardado ? '¡Precio guardado!' : 'Fijar este precio'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* DESGLOSE DETALLADO POR SECCIÓN: 1. MASA | 2. RELLENO/BAÑO | 3. EMPAQUE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Tarjeta Desglose 1: MASA */}
            <div className="bezel-shell">
              <div className="bezel-core p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#BE123C]">
                        Sección 1
                      </span>
                      <h4 className="font-editorial text-lg font-bold text-[#2B1118]">
                        Ingredientes de la Masa
                      </h4>
                    </div>
                    <span className="font-nums text-base font-extrabold text-[#BE123C]">
                      {formatearMoneda(resumen.costoMasa)}
                    </span>
                  </div>

                  <ul className="mt-3 divide-y divide-[#FDF2F5]">
                    {resumen.itemsMasa.map((d) => (
                      <li key={d.item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <div className="font-semibold text-[#2B1118]">
                            {d.insumo?.nombre || 'Insumo'}
                          </div>
                          <div className="text-[11px] text-[#7A4957]">
                            <span className="font-nums font-semibold text-[#9F1239]">
                              {formatearCantidad(d.cantidadEscalada, d.item.unidad)}
                            </span>
                            {d.item.nota ? ` · ${d.item.nota}` : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-nums font-bold text-[#2B1118]">
                            {formatearMoneda(d.costoItem)}
                          </div>
                          <div className="font-nums text-[10px] text-[#7A4957]">
                            {Math.round(d.porcentajeDelTotal)}% del costo
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-4 pt-3 border-t border-[#F8DCE4] flex items-center justify-between text-xs">
                  <span className="font-medium text-[#7A4957]">Costo masa por unidad:</span>
                  <span className="font-nums font-bold text-[#BE123C]">
                    {formatearMoneda(resumen.costoMasaPorUnidad)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Desglose 2: RELLENO Y COBERTURA */}
            <div className="bezel-shell">
              <div className="bezel-core p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#BE185D]">
                        Sección 2
                      </span>
                      <h4 className="font-editorial text-lg font-bold text-[#2B1118]">
                        Relleno, Glasé y Decoración
                      </h4>
                    </div>
                    <span className="font-nums text-base font-extrabold text-[#BE185D]">
                      {formatearMoneda(resumen.costoRellenoCobertura)}
                    </span>
                  </div>

                  {resumen.itemsRelleno.length === 0 ? (
                    <p className="text-xs text-[#7A4957] py-6 text-center">
                      Sin insumos de cobertura cargados en esta receta.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[#FDF2F5]">
                      {resumen.itemsRelleno.map((d) => (
                        <li key={d.item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-[#2B1118]">
                              {d.insumo?.nombre || 'Insumo'}
                            </div>
                            <div className="text-[11px] text-[#7A4957]">
                              <span className="font-nums font-semibold text-[#BE185D]">
                                {formatearCantidad(d.cantidadEscalada, d.item.unidad)}
                              </span>
                              {d.item.nota ? ` · ${d.item.nota}` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-nums font-bold text-[#2B1118]">
                              {formatearMoneda(d.costoItem)}
                            </div>
                            <div className="font-nums text-[10px] text-[#7A4957]">
                              {Math.round(d.porcentajeDelTotal)}% del costo
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#F8DCE4] flex items-center justify-between text-xs">
                  <span className="font-medium text-[#7A4957]">Costo baño/relleno por unidad:</span>
                  <span className="font-nums font-bold text-[#BE185D]">
                    {formatearMoneda(resumen.costoRellenoPorUnidad)}
                  </span>
                </div>
              </div>
            </div>

            {/* Tarjeta Desglose 3: EMPAQUE Y PRESENTACIÓN */}
            <div className="bezel-shell">
              <div className="bezel-core p-5 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#B91C1C]">
                        Sección 3
                      </span>
                      <h4 className="font-editorial text-lg font-bold text-[#2B1118]">
                        Empaque y Packaging
                      </h4>
                    </div>
                    <span className="font-nums text-base font-extrabold text-[#B91C1C]">
                      {formatearMoneda(resumen.costoEmpaque)}
                    </span>
                  </div>

                  {resumen.itemsEmpaque.length === 0 ? (
                    <p className="text-xs text-[#7A4957] py-6 text-center">
                      Sin empaques asignados a esta receta.
                    </p>
                  ) : (
                    <ul className="mt-3 divide-y divide-[#FDF2F5]">
                      {resumen.itemsEmpaque.map((d) => (
                        <li key={d.item.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                          <div>
                            <div className="font-semibold text-[#2B1118]">
                              {d.insumo?.nombre || 'Empaque'}
                            </div>
                            <div className="text-[11px] text-[#7A4957]">
                              <span className="font-nums font-semibold text-[#B91C1C]">
                                {formatearCantidad(d.cantidadEscalada, d.item.unidad)}
                              </span>
                              {d.item.nota ? ` · ${d.item.nota}` : ''}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-nums font-bold text-[#2B1118]">
                              {formatearMoneda(d.costoItem)}
                            </div>
                            <div className="font-nums text-[10px] text-[#7A4957]">
                              {Math.round(d.porcentajeDelTotal)}% del costo
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#F8DCE4] flex items-center justify-between text-xs">
                  <span className="font-medium text-[#7A4957]">
                    Empaque por cada {receta.nombre_pack.toLowerCase()}:
                  </span>
                  <span className="font-nums font-bold text-[#B91C1C]">
                    {formatearMoneda(
                      resumen.cantidadPacksEnLote > 0
                        ? resumen.costoEmpaque / resumen.cantidadPacksEnLote
                        : resumen.costoEmpaque
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Acción Rápida: Agendar esta tanda como Pedido */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => onCrearPedidoDesdeReceta(receta, factorEscala, resumen)}
              className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white pl-6 pr-2 py-2 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.98] spring-transition cursor-pointer"
            >
              <span>
                Agendar tanda de {resumen.rendimientoEscalado} {receta.rendimiento_unidad} en Mis Pedidos
              </span>
              <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 spring-transition">
                <ArrowUpRight size={16} weight="bold" />
              </span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VISTA 2: MODO PREPARAR (RECETARIO INTERACTIVO + PESaje + TIMERS)      */}
      {/* ==================================================================== */}
      {subTab === 'preparar' && (
        <div className="space-y-5">
          {/* Timer Flotante si hay un temporizador activo */}
          {timerActivoPasoId && (
            <div className="bezel-shell-crimson sticky top-20 z-30">
              <div className="bezel-core-crimson p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center animate-pulse">
                    <Timer size={22} weight="duotone" />
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wider font-semibold text-[#FFE4E9]">
                      Temporizador de Cocina · {timerEtiqueta}
                    </div>
                    <div className="font-nums text-2xl font-extrabold">
                      {timerSegundosRestantes === 0
                        ? '¡Tiempo cumplido! 🔔'
                        : formatearSegundos(timerSegundosRestantes)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTimerCorriendo((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#BE123C] px-4 py-2 text-xs font-bold cursor-pointer"
                  >
                    {timerCorriendo ? <Pause size={15} weight="fill" /> : <Play size={15} weight="fill" />}
                    {timerCorriendo ? 'Pausar' : 'Continuar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTimerCorriendo(false);
                      setTimerActivoPasoId(null);
                    }}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white/20 text-white hover:bg-white/30 cursor-pointer"
                    title="Cerrar timer"
                  >
                    <ArrowCounterClockwise size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Columna Izquierda: Checklist de Ingredientes a Pesar (Mise en Place) */}
            <div className="lg:col-span-5 bezel-shell h-fit">
              <div className="bezel-core p-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#BE123C]">
                      Paso 1 · Mise en Place
                    </span>
                    <h3 className="font-editorial text-lg font-bold text-[#2B1118]">
                      Pesar Ingredientes ({ingredientesCompletadosCount}/{totalIngredientesCount})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIngredientesMarcados({})}
                    className="text-[11px] font-semibold text-[#BE123C] hover:underline cursor-pointer"
                  >
                    Reiniciar
                  </button>
                </div>

                <p className="text-xs text-[#7A4957] mt-2">
                  Tocá cada ingrediente a medida que lo pesás en la balanza para tu tanda de{' '}
                  <strong className="text-[#2B1118]">
                    {resumen.rendimientoEscalado} {receta.rendimiento_unidad}
                  </strong>
                  :
                </p>

                <div className="mt-4 space-y-4">
                  {[
                    { titulo: '🥣 Para la Masa', lista: resumen.itemsMasa },
                    { titulo: '🍓 Para Relleno y Cobertura', lista: resumen.itemsRelleno },
                    { titulo: '🎁 Empaques a preparar', lista: resumen.itemsEmpaque },
                  ].map(
                    (grupo) =>
                      grupo.lista.length > 0 && (
                        <div key={grupo.titulo} className="space-y-1.5">
                          <div className="text-xs font-bold text-[#9F1239]">{grupo.titulo}</div>
                          {grupo.lista.map((d) => {
                            const marcado = Boolean(ingredientesMarcados[d.item.id]);
                            return (
                              <button
                                key={d.item.id}
                                type="button"
                                onClick={() =>
                                  setIngredientesMarcados((prev) => ({
                                    ...prev,
                                    [d.item.id]: !prev[d.item.id],
                                  }))
                                }
                                className={`w-full flex items-center justify-between gap-2 rounded-2xl p-3 text-left spring-transition cursor-pointer border ${
                                  marcado
                                    ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
                                    : 'bg-[#FFF5F7] border-[#F3C6D3] hover:bg-[#FFE8EE] text-[#2B1118]'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  {marcado ? (
                                    <CheckCircle size={20} weight="fill" className="text-[#16A34A] shrink-0" />
                                  ) : (
                                    <Circle size={20} weight="regular" className="text-[#E11D48] shrink-0" />
                                  )}
                                  <div>
                                    <div className={`text-xs font-bold ${marcado ? 'line-through opacity-75' : ''}`}>
                                      {d.insumo?.nombre || 'Insumo'}
                                    </div>
                                    {d.item.nota && (
                                      <div className="text-[11px] opacity-75">{d.item.nota}</div>
                                    )}
                                  </div>
                                </div>
                                <span className="font-nums text-xs sm:text-sm font-extrabold px-2.5 py-1 rounded-full bg-white shadow-2xs">
                                  {formatearCantidad(d.cantidadEscalada, d.item.unidad)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )
                  )}
                </div>
              </div>
            </div>

            {/* Columna Derecha: Pasos de Preparación + Secretos de la Chefcita */}
            <div className="lg:col-span-7 space-y-4">
              <div className="bezel-shell">
                <div className="bezel-core p-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-[#BE123C]">
                        Paso 2 · Elaboración Paso a Paso
                      </span>
                      <h3 className="font-editorial text-lg font-bold text-[#2B1118]">
                        Instrucciones de Cocina ({pasosCompletadosCount}/{totalPasosCount})
                      </h3>
                    </div>
                    <div className="text-xs font-medium text-[#7A4957]">
                      Prep: <strong className="font-nums text-[#2B1118]">{receta.tiempo_preparacion_min} min</strong> ·
                      Cocción: <strong className="font-nums text-[#2B1118]">{receta.tiempo_horneado_min} min</strong>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3.5">
                    {receta.pasos.map((paso) => {
                      const completado = Boolean(pasosMarcados[paso.id]);
                      return (
                        <div
                          key={paso.id}
                          className={`rounded-2xl p-4 border spring-transition ${
                            completado
                              ? 'bg-[#F0FDF4]/80 border-[#BBF7D0]'
                              : 'bg-[#FFF9FA] border-[#F3C6D3]'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <button
                              type="button"
                              onClick={() =>
                                setPasosMarcados((prev) => ({
                                  ...prev,
                                  [paso.id]: !prev[paso.id],
                                }))
                              }
                              className="flex items-start gap-3 text-left cursor-pointer flex-1"
                            >
                              <span
                                className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center font-nums text-xs font-bold shrink-0 ${
                                  completado
                                    ? 'bg-[#16A34A] text-white'
                                    : 'bg-[#BE123C] text-white'
                                }`}
                              >
                                {completado ? '✓' : paso.paso_numero}
                              </span>
                              <div>
                                <div className="text-xs font-bold uppercase tracking-wider text-[#BE123C]">
                                  {paso.etapa}
                                </div>
                                <p
                                  className={`text-sm text-[#2B1118] mt-1 leading-relaxed ${
                                    completado ? 'line-through opacity-70' : ''
                                  }`}
                                >
                                  {paso.instruccion}
                                </p>
                              </div>
                            </button>

                            {paso.tiempo_timer_min && paso.tiempo_timer_min > 0 && (
                              <button
                                type="button"
                                onClick={() =>
                                  iniciarTimerPaso(paso.id, paso.tiempo_timer_min!, paso.etapa)
                                }
                                className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E9] hover:bg-[#FECDD3] text-[#BE123C] px-3 py-1.5 text-xs font-nums font-bold shrink-0 cursor-pointer spring-transition"
                              >
                                <Timer size={15} weight="duotone" />
                                {paso.tiempo_timer_min} min
                              </button>
                            )}
                          </div>

                          {paso.tip_secreto && (
                            <div className="mt-3 ml-10 rounded-xl bg-white/90 border border-[#F5D0DC] px-3 py-2 text-xs text-[#7A4957]">
                              <strong className="text-[#BE123C]">💡 Tip Chefcita:</strong>{' '}
                              {paso.tip_secreto}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Nota general / Secreto de conservación */}
                  {receta.notas_chefcita && (
                    <div className="mt-5 rounded-2xl bg-gradient-to-r from-[#FFF0F3] to-[#FCE7F3] border border-[#F3C6D3] p-4">
                      <div className="text-xs font-bold uppercase tracking-wider text-[#BE123C] mb-1">
                        ✨ Secreto de la Chefcita y Conservación
                      </div>
                      <p className="text-xs sm:text-sm text-[#2B1118] leading-relaxed">
                        {receta.notas_chefcita}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
