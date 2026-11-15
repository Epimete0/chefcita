'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Insumo,
  Receta,
  RecetaItem,
  RecetaPaso,
  Pedido,
  ResumenCostosReceta,
} from '@/lib/types';
import { SEED_INSUMOS, SEED_RECETAS, SEED_PEDIDOS } from '@/lib/seed-data';
import {
  cargarDatosChefcita,
  leerCacheLocal,
  guardarInsumoDB,
  actualizarPrecioInsumoDB,
  eliminarInsumoDB,
  actualizarPreciosVentaRecetaDB,
  guardarRecetaCompletaDB,
  eliminarRecetaDB,
  guardarPedidoDB,
  cambiarEstadoPedidoDB,
  eliminarPedidoDB,
} from '@/lib/supabase';
import { calcularCostosReceta, formatearMoneda } from '@/lib/costing';
import RecipeDetailView from '@/components/RecipeDetailView';
import RecipeFormModal from '@/components/RecipeFormModal';
import InsumosView from '@/components/InsumosView';
import PedidosView from '@/components/PedidosView';
import {
  CookingPot,
  Package,
  CalendarCheck,
  Plus,
  Sparkle,
  TrendUp,
  CheckCircle,
  Heart,
  Database,
  ArrowUpRight,
} from '@phosphor-icons/react';

type TabPrincipal = 'recetas' | 'insumos' | 'pedidos';

export default function ChefcitaApp() {
  const [tabActiva, setTabActiva] = useState<TabPrincipal>('recetas');
  // Inicializamos al instante sin pantalla de bloqueo
  const [insumos, setInsumos] = useState<Insumo[]>(SEED_INSUMOS);
  const [recetas, setRecetas] = useState<Receta[]>(SEED_RECETAS);
  const [pedidos, setPedidos] = useState<Pedido[]>(SEED_PEDIDOS);
  const [recetaActivaId, setRecetaActivaId] = useState<string>(SEED_RECETAS[0]?.id || '');
  const [motorActivo, setMotorActivo] = useState<'Supabase' | 'Firebase' | 'Local'>('Firebase');

  // Modal de crear / editar receta
  const [modalRecetaAbierto, setModalRecetaAbierto] = useState(false);
  const [recetaEnEdicion, setRecetaEnEdicion] = useState<Receta | null>(null);

  // Trigger para abrir modal de Nuevo Insumo directo desde cualquier pantalla
  const [abrirModalInsumoDirecto, setAbrirModalInsumoDirecto] = useState<number>(0);

  // Toast de feedback
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const mostrarToast = useCallback((texto: string) => {
    setToastMsg(texto);
    setTimeout(() => {
      setToastMsg((actual) => (actual === texto ? null : actual));
    }, 3200);
  }, []);

  const recargarTodo = useCallback(async () => {
    // 1. Cargar instantáneamente del cache local en el navegador (0ms)
    const local = leerCacheLocal();
    setInsumos(local.insumos);
    setRecetas(local.recetas);
    setPedidos(local.pedidos);
    setRecetaActivaId((prev) => {
      if (prev && local.recetas.some((r) => r.id === prev)) return prev;
      return local.recetas[0]?.id || '';
    });

    // 2. Sincronizar con Firebase / Supabase en background sin bloquear la UI
    const data = await cargarDatosChefcita();
    setInsumos(data.insumos);
    setRecetas(data.recetas);
    setPedidos(data.pedidos);
    setMotorActivo(data.motorActivo);
    setRecetaActivaId((prev) => {
      if (prev && data.recetas.some((r) => r.id === prev)) return prev;
      return data.recetas[0]?.id || '';
    });
  }, []);

  useEffect(() => {
    recargarTodo();
  }, [recargarTodo]);

  const insumosMap = useMemo(
    () => new Map<string, Insumo>(insumos.map((i) => [i.id, i])),
    [insumos]
  );

  // Mapa de resúmenes de costos de todas las recetas
  const resumenesPorReceta = useMemo(() => {
    const map = new Map<string, ResumenCostosReceta>();
    for (const r of recetas) {
      map.set(r.id, calcularCostosReceta(r, insumosMap, 1));
    }
    return map;
  }, [recetas, insumosMap]);

  const recetaActiva = useMemo(
    () => recetas.find((r) => r.id === recetaActivaId) || recetas[0] || null,
    [recetas, recetaActivaId]
  );

  // Estadísticas generales del Atelier
  const estadisticasGenerales = useMemo(() => {
    if (recetas.length === 0) {
      return { margenPromedio: 0, gananciaPromedioLote: 0 };
    }
    let sumaMargen = 0;
    let sumaGanancia = 0;
    for (const r of recetas) {
      const res = resumenesPorReceta.get(r.id);
      if (res) {
        sumaMargen += res.margenRealPorcentaje;
        sumaGanancia += res.gananciaPorLote;
      }
    }
    return {
      margenPromedio: Math.round(sumaMargen / recetas.length),
      gananciaPromedioLote: Math.round(sumaGanancia / recetas.length),
    };
  }, [recetas, resumenesPorReceta]);

  // Handlers de Recetas
  const handleActualizarPreciosReceta = async (
    recetaId: string,
    precios: {
      precio_venta_pack: number;
      precio_venta_unidad: number;
      precio_venta_lote: number;
      margen_objetivo_porcentaje?: number;
      porcentaje_gastos_extras?: number;
    }
  ) => {
    await actualizarPreciosVentaRecetaDB(recetaId, precios);
    const local = leerCacheLocal();
    setRecetas(local.recetas);
    mostrarToast('¡Precio de venta y ganancia actualizados!');
  };

  const handleGuardarRecetaCompleta = async (
    recetaData: Omit<Receta, 'id' | 'items' | 'pasos'> & { id?: string },
    items: Array<Omit<RecetaItem, 'id' | 'receta_id'>>,
    pasos: Array<Omit<RecetaPaso, 'id' | 'receta_id'>>
  ) => {
    const idGuardado = await guardarRecetaCompletaDB(recetaData, items, pasos);
    const local = leerCacheLocal();
    setRecetas(local.recetas);
    setRecetaActivaId(idGuardado);
    mostrarToast(
      recetaData.id ? 'Receta actualizada con éxito.' : '¡Nueva receta creada en tu recetario!'
    );
  };

  const handleEliminarReceta = async (recetaId: string) => {
    await eliminarRecetaDB(recetaId);
    const local = leerCacheLocal();
    setRecetas(local.recetas);
    setRecetaActivaId(local.recetas[0]?.id || '');
    mostrarToast('Receta eliminada.');
  };

  const handleCrearPedidoDesdeReceta = async (
    receta: Receta,
    factorEscala: number,
    resumen: ResumenCostosReceta
  ) => {
    await guardarPedidoDB({
      cliente_nombre: `Tanda de ${receta.nombre}`,
      fecha_entrega: new Date().toISOString().split('T')[0],
      estado: 'pendiente',
      receta_id: receta.id,
      receta_nombre_snapshot: receta.nombre,
      cantidad_lotes: factorEscala,
      unidades_totales: resumen.rendimientoEscalado,
      costo_total_estimado: Math.round(resumen.costoTotalLote),
      precio_venta_total: Math.round(resumen.precioVentaLote),
      ganancia_neta: Math.round(resumen.gananciaPorLote),
      seña_pagada: 0,
      notas: `Generado desde calculadora (${resumen.rendimientoEscalado} ${receta.rendimiento_unidad})`,
    });
    const local = leerCacheLocal();
    setPedidos(local.pedidos);
    setTabActiva('pedidos');
    mostrarToast('¡Tanda agendada en Mis Pedidos!');
  };

  // Handlers de Insumos
  const handleGuardarInsumo = async (insumo: Omit<Insumo, 'id'> & { id?: string }) => {
    await guardarInsumoDB(insumo);
    const local = leerCacheLocal();
    setInsumos(local.insumos);
    setRecetas(local.recetas);
    mostrarToast('¡Insumo guardado! Costos de recetas recalculados.');
  };

  const handleActualizarPrecioRapido = async (
    id: string,
    nuevoPrecio: number,
    nuevaCantidad?: number
  ) => {
    await actualizarPrecioInsumoDB(id, nuevoPrecio, nuevaCantidad);
    const local = leerCacheLocal();
    setInsumos(local.insumos);
    setRecetas(local.recetas);
    mostrarToast('¡Precio actualizado! Todas tus recetas se recalcularon.');
  };

  const handleEliminarInsumo = async (id: string) => {
    await eliminarInsumoDB(id);
    const local = leerCacheLocal();
    setInsumos(local.insumos);
    mostrarToast('Insumo eliminado.');
  };

  // Handlers de Pedidos
  const handleCrearPedido = async (pedido: Omit<Pedido, 'id'>) => {
    await guardarPedidoDB(pedido);
    const local = leerCacheLocal();
    setPedidos(local.pedidos);
    mostrarToast('¡Pedido agendado correctamente!');
  };

  const handleCambiarEstadoPedido = async (id: string, estado: Pedido['estado']) => {
    await cambiarEstadoPedidoDB(id, estado);
    const local = leerCacheLocal();
    setPedidos(local.pedidos);
    mostrarToast('Estado del pedido actualizado.');
  };

  const handleEliminarPedido = async (id: string) => {
    await eliminarPedidoDB(id);
    const local = leerCacheLocal();
    setPedidos(local.pedidos);
    mostrarToast('Pedido eliminado.');
  };

  return (
    <div className="min-h-[100dvh] pb-28 sm:pb-16">
      {/* Toast Flotante de Confirmación */}
      {toastMsg && (
        <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex items-center gap-2.5 rounded-full bg-[#2B1118] text-white px-5 py-3 text-xs sm:text-sm font-bold shadow-xl border border-[#F43F5E]/40">
          <CheckCircle size={18} weight="fill" className="text-[#4ADE80] shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Barra Superior Estilo "Fluid Island" */}
      <header className="sticky top-0 z-30 pt-3 sm:pt-5 px-3 sm:px-6">
        <div className="max-w-6xl mx-auto rounded-full bg-white/90 backdrop-blur-xl border border-[#F3C6D3] shadow-[0_10px_30px_-10px_rgba(190,18,60,0.12)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-2">
          {/* Marca Chefcita */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-[#BE123C] via-[#E11D48] to-[#FB7185] text-white flex items-center justify-center shadow-sm shrink-0">
              <Heart size={19} weight="fill" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-editorial text-lg sm:text-xl font-extrabold text-[#2B1118] leading-none">
                  Chefcita
                </h1>
                <span className="hidden lg:inline-flex items-center gap-1 rounded-full bg-[#FFF0F3] border border-[#F3C6D3] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#BE123C]">
                  <Database size={11} weight="duotone" />
                  {motorActivo === 'Supabase' ? 'Supabase + Firebase' : 'Firebase · chefcita'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#7A4957]">
                Costos, Masa, Empaque & Recetario
              </p>
            </div>
          </div>

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center gap-1.5 rounded-full bg-[#FFF0F3] p-1 border border-[#F3C6D3]">
            {[
              { id: 'recetas', label: 'Recetas y Costos', icon: CookingPot, count: recetas.length },
              { id: 'insumos', label: 'Insumos y Empaques', icon: Package, count: insumos.length },
              {
                id: 'pedidos',
                label: 'Pedidos y Compras',
                icon: CalendarCheck,
                count: pedidos.filter((p) => p.estado !== 'entregado').length,
              },
            ].map((item) => {
              const Icon = item.icon;
              const activo = tabActiva === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTabActiva(item.id as TabPrincipal)}
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold spring-transition cursor-pointer ${
                    activo
                      ? 'bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white shadow-sm'
                      : 'text-[#7A4957] hover:text-[#2B1118]'
                  }`}
                >
                  <Icon size={16} weight={activo ? 'fill' : 'duotone'} />
                  <span>{item.label}</span>
                  <span
                    className={`font-nums text-[10px] px-1.5 py-0.2 rounded-full ${
                      activo ? 'bg-white/25 text-white' : 'bg-white text-[#BE123C]'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Acciones Directas: + Insumo y + Receta */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setTabActiva('insumos');
                setAbrirModalInsumoDirecto((n) => n + 1);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E9] hover:bg-[#FECDD3] active:scale-[0.98] text-[#BE123C] px-3 py-2 text-xs font-bold spring-transition cursor-pointer"
            >
              <Plus size={14} weight="bold" />
              <span>Insumo / Caja</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRecetaEnEdicion(null);
                setModalRecetaAbierto(true);
              }}
              className="group inline-flex items-center gap-2 rounded-full bg-[#2B1118] hover:bg-[#451A26] active:scale-[0.98] text-white pl-3.5 pr-1.5 py-1.5 text-xs font-bold spring-transition cursor-pointer"
            >
              <span>Receta</span>
              <span className="w-6 h-6 rounded-full bg-[#E11D48] text-white flex items-center justify-center group-hover:translate-x-0.5 group-hover:-translate-y-0.5 spring-transition">
                <Plus size={13} weight="bold" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal (Sin pantalla de bloqueo) */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: RECETAS, DESGLOSE MASA/EMPAQUE, PRECIO Y MODO PREPARAR  */}
        {/* ============================================================== */}
        {tabActiva === 'recetas' && (
          <div className="space-y-6">
            {/* Banner de Bienvenida + Accesos Rápidos */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
              <div className="lg:col-span-7 bezel-shell-crimson">
                <div className="bezel-core-crimson p-5 sm:p-6 h-full flex flex-col justify-between">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
                      <Sparkle size={12} weight="fill" />
                      Tu Atelier de Pastelería en Casa
                    </span>
                    <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-white mt-2 leading-tight">
                      Calculá cuánto sale tu masa, tu empaque y tu ganancia real.
                    </h2>
                    <p className="text-xs sm:text-sm text-[#FFE4E9] mt-1.5 leading-relaxed">
                      Abajo tenés tus recetas listas (como <strong className="text-white">Donas Glaseadas</strong>, <strong className="text-white">Red Velvet</strong> o <strong className="text-white">Torta Matilda</strong>), y podés cargar todos los insumos, cajas o recetas nuevas que quieras.
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/20 flex flex-wrap items-center gap-3 text-xs">
                    <div>
                      <span className="text-[#FFE4E9] block text-[11px]">Margen Promedio</span>
                      <span className="font-nums text-lg font-extrabold text-white">
                        {estadisticasGenerales.margenPromedio}% de ganancia
                      </span>
                    </div>
                    <div className="h-7 w-px bg-white/20" />
                    <div>
                      <span className="text-[#FFE4E9] block text-[11px]">
                        Ganancia Promedio por Tanda
                      </span>
                      <span className="font-nums text-lg font-extrabold text-[#BBF7D0]">
                        +{formatearMoneda(estadisticasGenerales.gananciaPromedioLote)}
                      </span>
                    </div>
                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTabActiva('insumos');
                          setAbrirModalInsumoDirecto((n) => n + 1);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white text-[#BE123C] px-3.5 py-2 text-xs font-bold shadow-xs hover:bg-[#FFF0F3] cursor-pointer spring-transition"
                      >
                        <Plus size={14} weight="bold" />
                        <span>Crear Insumo / Empaque</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setTabActiva('insumos')}
                        className="inline-flex items-center gap-1.5 rounded-full bg-white/20 text-white px-3.5 py-2 text-xs font-bold hover:bg-white/30 cursor-pointer spring-transition"
                      >
                        <span>Ver mis {insumos.length} insumos</span>
                        <ArrowUpRight size={14} weight="bold" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tarjetas Resumen Rápidas de Costos */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setTabActiva('insumos')}
                  className="bezel-shell text-left cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="bezel-core p-4 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center">
                        <Package size={20} weight="duotone" />
                      </div>
                      <span className="rounded-full bg-[#FFE4E9] text-[#BE123C] px-2.5 py-0.5 text-[10px] font-bold">
                        Ver / Crear +
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="font-nums text-2xl font-extrabold text-[#2B1118]">
                        {insumos.length}
                      </div>
                      <div className="text-xs font-bold text-[#2B1118]">
                        Insumos y Empaques
                      </div>
                      <div className="text-[11px] text-[#7A4957] mt-0.5">
                        Tocá para cargar harinas, cajas o cambiar precios
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTabActiva('pedidos')}
                  className="bezel-shell text-left cursor-pointer hover:-translate-y-0.5"
                >
                  <div className="bezel-core p-4 h-full flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <div className="w-9 h-9 rounded-2xl bg-[#DCFCE7] text-[#15803D] flex items-center justify-center">
                        <TrendUp size={20} weight="bold" />
                      </div>
                      <span className="rounded-full bg-[#DCFCE7] text-[#15803D] px-2.5 py-0.5 text-[10px] font-bold">
                        Cotizar +
                      </span>
                    </div>
                    <div className="mt-3">
                      <div className="font-nums text-2xl font-extrabold text-[#15803D]">
                        {pedidos.filter((p) => p.estado !== 'entregado').length}
                      </div>
                      <div className="text-xs font-bold text-[#2B1118]">
                        Pedidos en Curso
                      </div>
                      <div className="text-[11px] text-[#7A4957] mt-0.5">
                        Ver agenda y lista de compras
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Selector Visual de Recetas (Tarjetas horizontales interactivas) */}
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 px-1">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#BE123C]">
                    Mis Recetas Costeadas ({recetas.length})
                  </span>
                  <h3 className="font-editorial text-lg sm:text-xl font-bold text-[#2B1118]">
                    Elegí un producto para ver su masa, su empaque y su precio
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setRecetaEnEdicion(null);
                    setModalRecetaAbierto(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#BE123C] text-white px-4 py-2 text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  <span>Agregar Nueva Receta</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {recetas.map((rec) => {
                  const res = resumenesPorReceta.get(rec.id);
                  const seleccionada = rec.id === recetaActiva?.id;
                  if (!res) return null;

                  return (
                    <button
                      key={rec.id}
                      type="button"
                      onClick={() => setRecetaActivaId(rec.id)}
                      className={`text-left rounded-[26px] p-1.5 spring-transition cursor-pointer ${
                        seleccionada
                          ? 'bg-gradient-to-br from-[#BE123C] to-[#F43F5E] shadow-[0_14px_30px_-8px_rgba(190,18,60,0.35)] -translate-y-0.5'
                          : 'bg-[#FCE8EE]/80 hover:bg-[#F9D5E0] border border-[#F3C6D3]'
                      }`}
                    >
                      <div className="rounded-[21px] bg-white p-4 h-full flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded-full bg-[#FFE4E9] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#BE123C]">
                              {rec.categoria}
                            </span>
                            <span className="font-nums text-[11px] font-bold text-[#15803D] bg-[#DCFCE7] px-2 py-0.5 rounded-full">
                              +{Math.round(res.margenRealPorcentaje)}% margen
                            </span>
                          </div>
                          <h4 className="font-editorial text-base font-bold text-[#2B1118] mt-2 leading-snug">
                            {rec.nombre}
                          </h4>
                        </div>

                        <div className="mt-3 pt-2.5 border-t border-[#F8DCE4] space-y-1 text-xs">
                          <div className="flex justify-between text-[11px] text-[#7A4957]">
                            <span>Masa + Cobertura:</span>
                            <span className="font-nums font-semibold text-[#2B1118]">
                              {formatearMoneda(res.costoIngredientesTotal)}
                            </span>
                          </div>
                          <div className="flex justify-between text-[11px] text-[#7A4957]">
                            <span>Empaque ({rec.nombre_pack}):</span>
                            <span className="font-nums font-semibold text-[#B91C1C]">
                              {formatearMoneda(res.costoEmpaque)}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline pt-1">
                            <span className="text-[11px] font-bold text-[#BE123C]">
                              Venta {rec.nombre_pack}:
                            </span>
                            <span className="font-nums text-sm font-extrabold text-[#BE123C]">
                              {formatearMoneda(res.precioVentaPack)}
                            </span>
                          </div>
                          <div className="flex justify-between items-baseline text-[11px] text-[#15803D] font-bold">
                            <span>Ganancia por pack:</span>
                            <span className="font-nums">
                              +{formatearMoneda(res.gananciaPorPack)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Panel Detallado de la Receta Seleccionada */}
            {recetaActiva && (
              <RecipeDetailView
                receta={recetaActiva}
                insumosMap={insumosMap}
                onActualizarPrecios={handleActualizarPreciosReceta}
                onEditarReceta={(r) => {
                  setRecetaEnEdicion(r);
                  setModalRecetaAbierto(true);
                }}
                onEliminarReceta={handleEliminarReceta}
                onCrearPedidoDesdeReceta={handleCrearPedidoDesdeReceta}
              />
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: INSUMOS, MATERIA PRIMA Y EMPAQUES                       */}
        {/* ============================================================== */}
        {tabActiva === 'insumos' && (
          <InsumosView
            insumos={insumos}
            abrirNuevoTrigger={abrirModalInsumoDirecto}
            onGuardarInsumo={handleGuardarInsumo}
            onActualizarPrecioRapido={handleActualizarPrecioRapido}
            onEliminarInsumo={handleEliminarInsumo}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 3: PEDIDOS, PRESUPUESTADOR Y LISTA DE COMPRAS              */}
        {/* ============================================================== */}
        {tabActiva === 'pedidos' && (
          <PedidosView
            pedidos={pedidos}
            recetas={recetas}
            insumos={insumos}
            insumosMap={insumosMap}
            onCrearPedido={handleCrearPedido}
            onCambiarEstadoPedido={handleCambiarEstadoPedido}
            onEliminarPedido={handleEliminarPedido}
          />
        )}
      </main>

      {/* Barra de Navegación Flotante Mobile (Pensada para el pulgar en celular) */}
      <nav className="md:hidden fixed bottom-3 inset-x-3 z-40 rounded-full bg-[#2B1118]/95 backdrop-blur-xl border border-white/15 p-1.5 shadow-[0_16px_40px_rgba(43,17,24,0.4)] grid grid-cols-3 gap-1">
        {[
          { id: 'recetas', label: 'Recetas y Costos', icon: CookingPot },
          { id: 'insumos', label: 'Insumos y Cajas', icon: Package },
          { id: 'pedidos', label: 'Mis Pedidos', icon: CalendarCheck },
        ].map((item) => {
          const Icon = item.icon;
          const activo = tabActiva === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTabActiva(item.id as TabPrincipal)}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-full py-2 px-2 text-[11px] font-bold spring-transition cursor-pointer ${
                activo
                  ? 'bg-gradient-to-r from-[#BE123C] to-[#F43F5E] text-white shadow-md'
                  : 'text-[#FDA4AF] hover:text-white'
              }`}
            >
              <Icon size={19} weight={activo ? 'fill' : 'duotone'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Modal de Crear / Editar Receta */}
      {modalRecetaAbierto && (
        <RecipeFormModal
          recetaInicial={recetaEnEdicion}
          insumos={insumos}
          onClose={() => {
            setModalRecetaAbierto(false);
            setRecetaEnEdicion(null);
          }}
          onSave={handleGuardarRecetaCompleta}
        />
      )}
    </div>
  );
}
