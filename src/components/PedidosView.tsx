'use client';

import React, { useState, useMemo } from 'react';
import { Insumo, Pedido, Receta } from '@/lib/types';
import {
  calcularCostosReceta,
  convertirAUnidadBase,
  formatearMoneda,
  formatearCantidad,
} from '@/lib/costing';
import {
  CalendarBlank,
  Plus,
  CheckCircle,
  Clock,
  CookingPot,
  ShoppingBag,
  Trash,
  Sparkle,
  CurrencyDollar,
  Package,
  WhatsappLogo,
} from '@phosphor-icons/react';

interface PedidosViewProps {
  pedidos: Pedido[];
  recetas: Receta[];
  insumos: Insumo[];
  insumosMap: Map<string, Insumo>;
  onCrearPedido: (pedido: Omit<Pedido, 'id'>) => Promise<void>;
  onCambiarEstadoPedido: (id: string, estado: Pedido['estado']) => Promise<void>;
  onEliminarPedido: (id: string) => Promise<void>;
}

export default function PedidosView({
  pedidos,
  recetas,
  insumos,
  insumosMap,
  onCrearPedido,
  onCambiarEstadoPedido,
  onEliminarPedido,
}: PedidosViewProps) {
  const [clienteNombre, setClienteNombre] = useState('');
  const [recetaIdSeleccionada, setRecetaIdSeleccionada] = useState<string>(
    recetas[0]?.id || ''
  );
  const [cantidadLotes, setCantidadLotes] = useState<number>(1);
  const [fechaEntrega, setFechaEntrega] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [precioVentaPersonalizado, setPrecioVentaPersonalizado] = useState<string>('');
  const [señaPagada, setSeñaPagada] = useState<number>(0);
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const recetaSeleccionada = useMemo(
    () => recetas.find((r) => r.id === recetaIdSeleccionada) || recetas[0],
    [recetas, recetaIdSeleccionada]
  );

  const resumenSimulado = useMemo(() => {
    if (!recetaSeleccionada) return null;
    return calcularCostosReceta(recetaSeleccionada, insumosMap, cantidadLotes);
  }, [recetaSeleccionada, insumosMap, cantidadLotes]);

  const precioFinalPedido = useMemo(() => {
    if (precioVentaPersonalizado !== '' && Number(precioVentaPersonalizado) > 0) {
      return Number(precioVentaPersonalizado);
    }
    return resumenSimulado?.precioVentaLote || 0;
  }, [precioVentaPersonalizado, resumenSimulado]);

  const gananciaFinalPedido = useMemo(() => {
    if (!resumenSimulado) return 0;
    return precioFinalPedido - resumenSimulado.costoTotalLote;
  }, [precioFinalPedido, resumenSimulado]);

  const handleSubmitPedido = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteNombre.trim() || !recetaSeleccionada || !resumenSimulado) return;
    setGuardando(true);
    try {
      await onCrearPedido({
        cliente_nombre: clienteNombre,
        fecha_entrega: fechaEntrega,
        estado: 'pendiente',
        receta_id: recetaSeleccionada.id,
        receta_nombre_snapshot: recetaSeleccionada.nombre,
        cantidad_lotes: cantidadLotes,
        unidades_totales: resumenSimulado.rendimientoEscalado,
        costo_total_estimado: Math.round(resumenSimulado.costoTotalLote),
        precio_venta_total: Math.round(precioFinalPedido),
        ganancia_neta: Math.round(gananciaFinalPedido),
        seña_pagada: Number(señaPagada) || 0,
        notas,
      });
      setClienteNombre('');
      setPrecioVentaPersonalizado('');
      setSeñaPagada(0);
      setNotas('');
    } finally {
      setGuardando(false);
    }
  };

  // Totales de pedidos activos
  const metricasPedidos = useMemo(() => {
    let ventaTotal = 0;
    let costoTotal = 0;
    let gananciaTotal = 0;
    let pendienteCobrar = 0;

    for (const p of pedidos) {
      ventaTotal += p.precio_venta_total;
      costoTotal += p.costo_total_estimado;
      gananciaTotal += p.ganancia_neta;
      if (p.estado !== 'entregado') {
        pendienteCobrar += Math.max(0, p.precio_venta_total - p.seña_pagada);
      }
    }
    return { ventaTotal, costoTotal, gananciaTotal, pendienteCobrar };
  }, [pedidos]);

  // Lista de compras inteligente sumando los insumos de pedidos pendientes/en_preparacion
  const listaCompras = useMemo(() => {
    const mapaNecesidades = new Map<
      string,
      {
        insumo: Insumo;
        cantidadNecesariaBase: number;
        unidadBase: string;
      }
    >();

    const pedidosPorCocinar = pedidos.filter(
      (p) => p.estado === 'pendiente' || p.estado === 'en_preparacion'
    );

    for (const ped of pedidosPorCocinar) {
      const rec = recetas.find((r) => r.id === ped.receta_id);
      if (!rec) continue;
      for (const item of rec.items) {
        const ins = insumosMap.get(item.insumo_id);
        if (!ins) continue;
        const { valor: cantBase, base } = convertirAUnidadBase(
          item.cantidad * ped.cantidad_lotes,
          item.unidad
        );
        const actual = mapaNecesidades.get(ins.id);
        if (actual) {
          actual.cantidadNecesariaBase += cantBase;
        } else {
          mapaNecesidades.set(ins.id, {
            insumo: ins,
            cantidadNecesariaBase: cantBase,
            unidadBase: base,
          });
        }
      }
    }

    return Array.from(mapaNecesidades.values()).map((entry) => {
      const { valor: stockBase } = convertirAUnidadBase(
        entry.insumo.stock_actual,
        entry.insumo.unidad
      );
      const faltanteBase = Math.max(0, entry.cantidadNecesariaBase - stockBase);
      return {
        ...entry,
        stockBase,
        faltanteBase,
        alcanza: faltanteBase === 0,
      };
    });
  }, [pedidos, recetas, insumosMap]);

  return (
    <div className="space-y-5">
      {/* Resumen Financiero de Pedidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bezel-shell">
          <div className="bezel-core p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7A4957]">
              Total Ventas Pedidos
            </span>
            <div className="font-nums text-xl sm:text-2xl font-extrabold text-[#2B1118] mt-1">
              {formatearMoneda(metricasPedidos.ventaTotal)}
            </div>
            <div className="text-[11px] text-[#7A4957] mt-1">
              En {pedidos.length} pedidos registrados
            </div>
          </div>
        </div>

        <div className="bezel-shell">
          <div className="bezel-core p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#BE123C]">
              Costo Masa + Empaque
            </span>
            <div className="font-nums text-xl sm:text-2xl font-bold text-[#BE123C] mt-1">
              {formatearMoneda(metricasPedidos.costoTotal)}
            </div>
            <div className="text-[11px] text-[#7A4957] mt-1">
              Inversión total de producción
            </div>
          </div>
        </div>

        <div className="bezel-shell">
          <div className="bezel-core p-4 bg-[#F0FDF4]/60">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#15803D]">
              Tu Ganancia Limpia
            </span>
            <div className="font-nums text-xl sm:text-2xl font-extrabold text-[#15803D] mt-1">
              +{formatearMoneda(metricasPedidos.gananciaTotal)}
            </div>
            <div className="text-[11px] text-[#166534] mt-1">
              Dinero libre para vos
            </div>
          </div>
        </div>

        <div className="bezel-shell">
          <div className="bezel-core p-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45309]">
              Saldo a Cobrar en Entregas
            </span>
            <div className="font-nums text-xl sm:text-2xl font-bold text-[#B45309] mt-1">
              {formatearMoneda(metricasPedidos.pendienteCobrar)}
            </div>
            <div className="text-[11px] text-[#7A4957] mt-1">
              Descontando señas recibidas
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Columna Izquierda: Presupuestador y Nuevo Pedido */}
        <div className="lg:col-span-5 bezel-shell h-fit">
          <div className="bezel-core p-5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFE4E9] px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#BE123C]">
              <Sparkle size={12} weight="fill" />
              Calculadora de Pedido
            </span>
            <h3 className="font-editorial text-xl font-bold text-[#2B1118] mt-1.5">
              Cotizar y Agendar Pedido
            </h3>
            <p className="text-xs text-[#7A4957] mt-0.5">
              Elegí qué te pidieron y mirá al instante cuánto te cuesta la masa + empaque y cuánto ganás.
            </p>

            <form onSubmit={handleSubmitPedido} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#2B1118] mb-1">
                  Nombre de la Clienta / Evento *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Martina (Caja de Donas Cumple)"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3.5 py-2.5 text-sm text-[#2B1118]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Receta / Producto
                  </label>
                  <select
                    value={recetaSeleccionada?.id || ''}
                    onChange={(e) => {
                      setRecetaIdSeleccionada(e.target.value);
                      setPrecioVentaPersonalizado('');
                    }}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2.5 text-xs font-bold text-[#2B1118]"
                  >
                    {recetas.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.nombre} ({r.rendimiento_cantidad} {r.rendimiento_unidad})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Cantidad de Lotes
                  </label>
                  <select
                    value={cantidadLotes}
                    onChange={(e) => {
                      setCantidadLotes(Number(e.target.value));
                      setPrecioVentaPersonalizado('');
                    }}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2.5 text-xs font-bold text-[#BE123C]"
                  >
                    <option value={0.5}>
                      ½ Lote ({Math.round((recetaSeleccionada?.rendimiento_cantidad || 12) * 0.5)}{' '}
                      {recetaSeleccionada?.rendimiento_unidad})
                    </option>
                    <option value={1}>
                      1 Lote ({recetaSeleccionada?.rendimiento_cantidad}{' '}
                      {recetaSeleccionada?.rendimiento_unidad})
                    </option>
                    <option value={1.5}>
                      1.5 Lotes ({Math.round((recetaSeleccionada?.rendimiento_cantidad || 12) * 1.5)}{' '}
                      {recetaSeleccionada?.rendimiento_unidad})
                    </option>
                    <option value={2}>
                      2 Lotes ({(recetaSeleccionada?.rendimiento_cantidad || 12) * 2}{' '}
                      {recetaSeleccionada?.rendimiento_unidad})
                    </option>
                    <option value={3}>
                      3 Lotes ({(recetaSeleccionada?.rendimiento_cantidad || 12) * 3}{' '}
                      {recetaSeleccionada?.rendimiento_unidad})
                    </option>
                  </select>
                </div>
              </div>

              {/* Resumen automático de costos del pedido */}
              {resumenSimulado && (
                <div className="rounded-2xl bg-[#FFF0F3] border border-[#F3C6D3] p-3.5 space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#7A4957]">Costo Masa + Relleno:</span>
                    <span className="font-nums font-semibold text-[#2B1118]">
                      {formatearMoneda(resumenSimulado.costoIngredientesTotal)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#7A4957]">Costo Empaque + Extras:</span>
                    <span className="font-nums font-semibold text-[#2B1118]">
                      {formatearMoneda(
                        resumenSimulado.costoEmpaque + resumenSimulado.costoGastosExtras
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#F3C6D3]">
                    <span className="font-bold text-[#2B1118]">Costo Total de hacer este pedido:</span>
                    <span className="font-nums font-bold text-[#BE123C]">
                      {formatearMoneda(resumenSimulado.costoTotalLote)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-bold text-[#15803D]">Ganancia neta que te queda:</span>
                    <span className="font-nums font-extrabold text-[#15803D]">
                      +{formatearMoneda(gananciaFinalPedido)}
                    </span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#BE123C] mb-1">
                    Precio a Cobrar ($)
                  </label>
                  <input
                    type="number"
                    placeholder={String(Math.round(resumenSimulado?.precioVentaLote || 0))}
                    value={precioVentaPersonalizado}
                    onChange={(e) => setPrecioVentaPersonalizado(e.target.value)}
                    className="w-full font-nums rounded-xl border-2 border-[#E11D48] bg-white px-2.5 py-2 text-xs font-extrabold text-[#BE123C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Seña recibida ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={señaPagada}
                    onChange={(e) => setSeñaPagada(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-2.5 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Fecha Entrega
                  </label>
                  <input
                    type="date"
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-2.5 py-2 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1118] mb-1">
                  Detalles / Dedicatoria / Colores
                </label>
                <input
                  type="text"
                  placeholder="Ej: 6 donas baño rosa y 6 chocolate blanco..."
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={guardando}
                className="w-full flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white py-3 text-xs sm:text-sm font-bold shadow-md hover:shadow-lg active:scale-[0.99] spring-transition cursor-pointer"
              >
                <Plus size={17} weight="bold" />
                <span>
                  {guardando
                    ? 'Guardando pedido...'
                    : `Guardar Pedido (${formatearMoneda(precioFinalPedido)})`}
                </span>
              </button>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Lista de Pedidos + Lista de Compras */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bezel-shell">
            <div className="bezel-core p-5">
              <h3 className="font-editorial text-xl font-bold text-[#2B1118] pb-3 border-b border-[#F8DCE4]">
                Agenda de Pedidos y Entregas ({pedidos.length})
              </h3>

              <div className="mt-4 space-y-3">
                {pedidos.map((ped) => {
                  const faltaCobrar = Math.max(0, ped.precio_venta_total - ped.seña_pagada);
                  return (
                    <div
                      key={ped.id}
                      className="rounded-2xl bg-[#FFF9FA] border border-[#F3C6D3] p-4 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-editorial text-base font-bold text-[#2B1118]">
                              {ped.cliente_nombre}
                            </span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-[#FFE4E9] px-2.5 py-0.5 text-[11px] font-nums font-bold text-[#BE123C]">
                              <CalendarBlank size={12} />
                              {ped.fecha_entrega}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-[#9F1239] mt-0.5">
                            {ped.receta_nombre_snapshot} ·{' '}
                            <span className="font-nums">{ped.unidades_totales} u.</span> (
                            {ped.cantidad_lotes} lote{ped.cantidad_lotes !== 1 ? 's' : ''})
                          </div>
                          {ped.notas && (
                            <p className="text-xs text-[#7A4957] mt-1">{ped.notas}</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => onEliminarPedido(ped.id)}
                          className="w-7 h-7 rounded-full bg-[#FFF0F3] text-[#9F1239] hover:bg-[#FFE4E9] flex items-center justify-center cursor-pointer"
                          title="Eliminar pedido"
                        >
                          <Trash size={14} />
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-white border border-[#F5D0DC] p-2.5 text-xs">
                        <div>
                          <span className="text-[10px] text-[#7A4957] block">Costo Total</span>
                          <span className="font-nums font-bold text-[#2B1118]">
                            {formatearMoneda(ped.costo_total_estimado)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#7A4957] block">Precio Venta</span>
                          <span className="font-nums font-bold text-[#BE123C]">
                            {formatearMoneda(ped.precio_venta_total)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-[#15803D] font-bold block">
                            Ganancia Neta
                          </span>
                          <span className="font-nums font-extrabold text-[#15803D]">
                            +{formatearMoneda(ped.ganancia_neta)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <div className="flex flex-wrap items-center gap-1">
                          {(
                            [
                              { id: 'pendiente', label: 'Pendiente' },
                              { id: 'en_preparacion', label: 'En cocina' },
                              { id: 'listo', label: 'Listo en caja' },
                              { id: 'entregado', label: 'Entregado ✓' },
                            ] as const
                          ).map((st) => (
                            <button
                              key={st.id}
                              type="button"
                              onClick={() => onCambiarEstadoPedido(ped.id, st.id)}
                              className={`rounded-full px-2.5 py-1 text-[11px] font-bold cursor-pointer spring-transition ${
                                ped.estado === st.id
                                  ? st.id === 'entregado'
                                    ? 'bg-[#16A34A] text-white'
                                    : 'bg-[#BE123C] text-white'
                                  : 'bg-[#FFF0F3] text-[#7A4957] hover:bg-[#FFE4E9]'
                              }`}
                            >
                              {st.label}
                            </button>
                          ))}
                        </div>

                        <span className="font-nums text-xs font-semibold text-[#7A4957]">
                          {faltaCobrar > 0
                            ? `Resta cobrar: ${formatearMoneda(faltaCobrar)}`
                            : 'Pagado 100%'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Lista de Compras e Insumos Necesarios para los Pedidos */}
          <div className="bezel-shell">
            <div className="bezel-core p-5">
              <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} weight="duotone" className="text-[#BE123C]" />
                  <div>
                    <h3 className="font-editorial text-lg font-bold text-[#2B1118]">
                      Insumos y Empaques Necesarios para Pedidos Activos
                    </h3>
                    <p className="text-xs text-[#7A4957]">
                      Calculado automáticamente según tus pedidos pendientes y en preparación.
                    </p>
                  </div>
                </div>
              </div>

              {listaCompras.length === 0 ? (
                <p className="text-xs text-[#7A4957] py-4 text-center">
                  No hay pedidos pendientes por cocinar en este momento.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {listaCompras.map((item) => (
                    <div
                      key={item.insumo.id}
                      className={`rounded-2xl p-3 border flex items-center justify-between gap-2 text-xs ${
                        item.alcanza
                          ? 'bg-[#FFF9FA] border-[#F3C6D3]'
                          : 'bg-[#FEF2F2] border-[#FCA5A5]'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-[#2B1118]">{item.insumo.nombre}</div>
                        <div className="text-[11px] text-[#7A4957]">
                          Necesitás:{' '}
                          <strong className="font-nums text-[#BE123C]">
                            {formatearCantidad(item.cantidadNecesariaBase, item.unidadBase)}
                          </strong>
                        </div>
                      </div>
                      <div className="text-right">
                        {item.alcanza ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#DCFCE7] text-[#166534] px-2.5 py-0.5 text-[10px] font-bold">
                            ✓ Tenés stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#FEE2E2] text-[#991B1B] px-2.5 py-0.5 text-[10px] font-bold">
                            Comprar {formatearCantidad(item.faltanteBase, item.unidadBase)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
