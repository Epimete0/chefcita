'use client';

import React, { useMemo } from 'react';
import { EstadoPedido, Insumo, Pedido, Receta, ResumenCostosReceta, Venta } from '@/lib/types';
import {
  calcularListaCompras,
  formatearCantidad,
  formatearMoneda,
  hoyISO,
  resumirVentas,
  sumarDiasISO,
} from '@/lib/costing';
import { Etiqueta } from './ui';
import { TarjetaPedido } from './PedidosView';
import { TarjetaVenta } from './VentasView';
import { TONO_SALUD, TEXTO_SALUD } from './RecipeDetailView';
import { Plus, Check, CaretRight, ArrowRight, Wallet, TrendUp, Storefront } from '@phosphor-icons/react';

const FORMATO_HOY = new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const FORMATO_MES = new Intl.DateTimeFormat('es-CL', { month: 'long' });

interface InicioViewProps {
  insumos: Insumo[];
  recetas: Receta[];
  pedidos: Pedido[];
  ventas: Venta[];
  resumenes: Map<string, ResumenCostosReceta>;
  insumosMap: Map<string, Insumo>;
  onNuevoInsumo: () => void;
  onNuevoProducto: () => void;
  onNuevoPedido: () => void;
  onNuevaVenta: (fecha?: string) => void;
  onVerVentas: () => void;
  onVerPedidos: () => void;
  onVerEntregados?: () => void;
  onVerCompras: () => void;
  onAbrirProducto: (id: string) => void;
  onEditarPedido: (pedido: Pedido) => void;
  onEditarVenta: (venta: Venta) => void;
  onCambiarEstadoPedido: (pedido: Pedido, estado: EstadoPedido) => void;
}

/* -------------------------------------------------------------------------- */
/* Primeros pasos: una sola cosa por hacer a la vez                            */
/* -------------------------------------------------------------------------- */

function PrimerosPasos({
  insumos,
  recetas,
  pedidos,
  ventas,
  onNuevoInsumo,
  onNuevoProducto,
  onNuevaVenta,
}: Pick<
  InicioViewProps,
  'insumos' | 'recetas' | 'pedidos' | 'ventas' | 'onNuevoInsumo' | 'onNuevoProducto' | 'onNuevaVenta'
>) {
  const pasos = [
    {
      titulo: 'Anota lo que compras',
      texto:
        'Tus ingredientes y envases, con lo que pagaste por cada paquete. Con tres o cuatro basta para partir.',
      hecho: insumos.length > 0,
      resumenHecho: `${insumos.length} ${insumos.length === 1 ? 'anotado' : 'anotados'}`,
      accion: 'Agregar ingrediente',
      accionExtra: 'Agregar otro',
      onClick: onNuevoInsumo,
    },
    {
      titulo: 'Crea tu primer producto',
      texto:
        'Dinos qué lleva uno de tus dulces. Te decimos cuánto te cuesta hacerlo y a qué precio conviene venderlo.',
      hecho: recetas.length > 0,
      resumenHecho: `${recetas.length} ${recetas.length === 1 ? 'creado' : 'creados'}`,
      accion: 'Crear producto',
      accionExtra: '',
      onClick: onNuevoProducto,
    },
    {
      titulo: 'Anota tu primera venta o pedido',
      texto:
        'Registra lo que vendes en el día o los encargos que te hacen, con fecha editable y total cobrado.',
      hecho: ventas.length > 0 || pedidos.length > 0,
      resumenHecho: '',
      accion: 'Anotar venta',
      accionExtra: '',
      onClick: () => onNuevaVenta(),
    },
  ];
  const actual = pasos.findIndex((p) => !p.hecho);
  const hechos = pasos.filter((p) => p.hecho).length;

  return (
    <div className="anim-rise mx-auto max-w-2xl">
      <p className="text-sm font-semibold tracking-wide text-berry">Tu cuaderno de pastelería</p>
      <h1 className="font-display mt-1 text-[2rem] font-semibold leading-[1.12] sm:text-[2.625rem]">
        {hechos === 0 ? 'Bienvenida a Chefcita' : 'Vas muy bien'}
      </h1>
      <p className="mt-3 max-w-xl text-[1.0625rem] text-ink-soft">
        {hechos === 0
          ? 'Dejemos todo listo en tres pasos. Al terminar vas a saber cuánto ganas con cada dulce y qué tienes que entregar cada día.'
          : `Llevas ${hechos} de 3 pasos. Sigue con el que está marcado.`}
      </p>

      <ol className="card mt-8 divide-y divide-line overflow-hidden">
        {pasos.map((p, i) => {
          const esActual = i === actual;
          const bloqueado = !p.hecho && !esActual;
          return (
            <li
              key={p.titulo}
              className={`flex gap-4 p-5 transition-colors sm:p-6 ${
                esActual ? 'bg-berry-soft/35' : ''
              } ${bloqueado ? 'opacity-55' : ''}`}
            >
              <span
                className={`num flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-bold ${
                  p.hecho
                    ? 'bg-ok text-white'
                    : esActual
                      ? 'bg-berry text-white shadow-[0_4px_12px_rgba(176,32,63,0.28)]'
                      : 'bg-sunken text-ink-soft'
                }`}
              >
                {p.hecho ? <Check size={18} weight="bold" /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-3">
                  <h2 className="text-[1.0625rem] font-bold">{p.titulo}</h2>
                  {p.hecho && p.resumenHecho && (
                    <span className="text-sm font-medium text-ok">{p.resumenHecho}</span>
                  )}
                </div>
                {!p.hecho && <p className="mt-1 text-[0.9375rem] text-ink-soft">{p.texto}</p>}
                {esActual && (
                  <button type="button" className="btn btn-primary mt-4" onClick={p.onClick}>
                    <Plus size={18} weight="bold" />
                    {p.accion}
                  </button>
                )}
                {p.hecho && p.accionExtra && (
                  <button
                    type="button"
                    className="mt-1 cursor-pointer text-sm font-semibold text-berry hover:underline"
                    onClick={p.onClick}
                  >
                    {p.accionExtra}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-5 text-center">
        <button
          type="button"
          onClick={() => onNuevaVenta()}
          className="cursor-pointer text-sm font-semibold text-berry hover:underline"
        >
          ¿Solo quieres anotar una venta del día ahora? Hazlo aquí
        </button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Inicio                                                                      */
/* -------------------------------------------------------------------------- */

export default function InicioView(props: InicioViewProps) {
  const {
    recetas,
    pedidos,
    ventas,
    resumenes,
    insumosMap,
    onNuevoPedido,
    onNuevaVenta,
    onVerVentas,
    onVerPedidos,
    onVerCompras,
    onAbrirProducto,
    onEditarPedido,
    onEditarVenta,
    onCambiarEstadoPedido,
  } = props;

  const hoyIso = hoyISO();
  const ayerIso = sumarDiasISO(hoyIso, -1);
  const mesActual = hoyIso.slice(0, 7);

  const ventasHoy = useMemo(() => ventas.filter((v) => v.fecha === hoyIso), [ventas, hoyIso]);
  const resumenHoy = useMemo(() => resumirVentas(ventasHoy), [ventasHoy]);

  const ventasAyer = useMemo(() => ventas.filter((v) => v.fecha === ayerIso), [ventas, ayerIso]);
  const resumenAyer = useMemo(() => resumirVentas(ventasAyer), [ventasAyer]);

  const ventasMes = useMemo(
    () => ventas.filter((v) => v.fecha.startsWith(mesActual)),
    [ventas, mesActual]
  );
  const resumenVentasMes = useMemo(() => resumirVentas(ventasMes), [ventasMes]);

  const pendientes = useMemo(
    () =>
      pedidos
        .filter((p) => p.estado !== 'entregado')
        .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega)),
    [pedidos]
  );

  const entregadosMes = useMemo(
    () => pedidos.filter((p) => p.estado === 'entregado' && p.fecha_entrega.startsWith(mesActual)),
    [pedidos, mesActual]
  );

  const porCobrar = pendientes.reduce(
    (s, p) => s + Math.max(0, p.precio_venta_total - p.seña_pagada),
    0
  );
  const vendidoPedidosMes = entregadosMes.reduce((s, p) => s + p.precio_venta_total, 0);
  const vendidoMesTotal = resumenVentasMes.totalVendido + vendidoPedidosMes;
  const gananciaMes =
    resumenVentasMes.gananciaConocida + entregadosMes.reduce((s, p) => s + p.ganancia_neta, 0);

  const faltantes = useMemo(
    () => calcularListaCompras(pedidos, recetas, insumosMap).filter((i) => i.faltante > 0),
    [pedidos, recetas, insumosMap]
  );

  const porRevisar = recetas.filter((r) => {
    const res = resumenes.get(r.id);
    return res && (res.costoIncompleto || res.estadoSalud === 'perdida' || res.estadoSalud === 'bajo');
  });

  // Mientras no haya productos ni registros, la pantalla es la guía de primeros pasos
  if (recetas.length === 0 && ventas.length === 0 && pedidos.length === 0) {
    return <PrimerosPasos {...props} />;
  }

  const hoy = FORMATO_HOY.format(new Date());

  return (
    <div className="anim-rise space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-[1.875rem] font-semibold leading-tight first-letter:uppercase sm:text-[2.25rem]">
            {hoy}
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
            {resumenHoy.cantidadRegistros > 0
              ? `Hoy llevas ${formatearMoneda(resumenHoy.totalVendido)} en ventas`
              : 'Aún no registras ventas hoy'}
            {pendientes.length === 0
              ? ' · Sin pedidos pendientes.'
              : pendientes.length === 1
                ? ' · 1 pedido por entregar.'
                : ` · ${pendientes.length} pedidos por entregar.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-secondary" onClick={onNuevoPedido}>
            <Plus size={18} weight="bold" />
            Nuevo pedido
          </button>
          <button type="button" className="btn btn-primary" onClick={() => onNuevaVenta(hoyIso)}>
            <Plus size={18} weight="bold" />
            Anotar venta
          </button>
        </div>
      </div>

      {/* =========================== VENTAS DE HOY ============================ */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-berry">
              <Storefront size={17} weight="duotone" />
              Ventas de hoy
            </div>
            <div className="num font-display mt-1 text-[1.875rem] font-semibold leading-none sm:text-[2.125rem]">
              {formatearMoneda(resumenHoy.totalVendido)}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={onVerVentas} className="btn btn-secondary btn-sm">
              Ver por día
              <ArrowRight size={14} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => onNuevaVenta(hoyIso)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={16} weight="bold" />
              {ventasHoy.length > 0 ? 'Agregar más' : 'Anotar venta'}
            </button>
          </div>
        </div>

        {ventasHoy.length === 0 ? (
          <div className="px-5 py-6 text-center sm:px-6">
            <p className="text-[0.9375rem] text-ink-soft">
              Anota lo que vendes en el día (por ejemplo: 3 cajas de donas, 2 mini pies) y edita la
              fecha si quieres cargar ventas de otro día.
            </p>
            {resumenAyer.cantidadRegistros > 0 && (
              <p className="mt-2 text-sm text-ink-soft">
                Ayer vendiste{' '}
                <strong className="num text-ink">{formatearMoneda(resumenAyer.totalVendido)}</strong>
                .
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 border-b border-line bg-paper/55 px-4 py-3 sm:px-5">
              {resumenHoy.productos.map((p) => (
                <span
                  key={p.clave}
                  className="num rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink"
                >
                  {String(Math.round(p.cantidad * 100) / 100).replace('.', ',')} ×{' '}
                  {p.presentacionNombre} · {p.productoNombre}
                </span>
              ))}
            </div>
            <div className="divide-y divide-line">
              {ventasHoy.slice(0, 5).map((v) => (
                <TarjetaVenta key={v.id} venta={v} onEditar={onEditarVenta} />
              ))}
            </div>
            {ventasHoy.length > 5 && (
              <button
                type="button"
                onClick={onVerVentas}
                className="flex min-h-[46px] w-full cursor-pointer items-center justify-between border-t border-line px-4 text-sm font-semibold text-berry hover:bg-paper sm:px-5"
              >
                Ver las {ventasHoy.length} ventas de hoy
                <CaretRight size={14} weight="bold" />
              </button>
            )}
          </>
        )}
      </section>

      {/* ============================== RESUMEN ============================== */}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <button
          type="button"
          onClick={onVerVentas}
          className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
        >
          <div className="min-w-0">
            <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-berry-soft text-berry">
                <Storefront size={16} weight="duotone" />
              </span>
              Vendido en {FORMATO_MES.format(new Date())}
            </dt>
            <dd className="num font-display mt-2 text-2xl font-semibold sm:text-[1.75rem]">
              {formatearMoneda(vendidoMesTotal)}
            </dd>
            {vendidoPedidosMes > 0 && resumenVentasMes.totalVendido > 0 && (
              <div className="num mt-0.5 text-xs text-ink-soft">
                {formatearMoneda(resumenVentasMes.totalVendido)} diario ·{' '}
                {formatearMoneda(vendidoPedidosMes)} pedidos
              </div>
            )}
          </div>
          <CaretRight
            size={18}
            weight="bold"
            className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </button>

        <button
          type="button"
          onClick={onVerVentas}
          className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
        >
          <div className="min-w-0">
            <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ok-soft text-ok">
                <TrendUp size={16} weight="duotone" />
              </span>
              Ganancia de {FORMATO_MES.format(new Date())}
            </dt>
            <dd className="num font-display mt-2 text-2xl font-semibold text-ok sm:text-[1.75rem]">
              {formatearMoneda(gananciaMes)}
            </dd>
            {resumenVentasMes.tieneCostoIncompleto && (
              <div className="mt-0.5 text-xs text-ink-soft">Solo de productos con costo listo</div>
            )}
          </div>
          <CaretRight
            size={18}
            weight="bold"
            className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </button>

        <button
          type="button"
          onClick={onVerPedidos}
          className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
        >
          <div>
            <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-caramel-soft text-caramel">
                <Wallet size={16} weight="duotone" />
              </span>
              Te falta cobrar
            </dt>
            <dd className="num font-display mt-2 text-2xl font-semibold sm:text-[1.75rem]">
              {formatearMoneda(porCobrar)}
            </dd>
          </div>
          <CaretRight
            size={18}
            weight="bold"
            className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </button>
      </dl>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold">Próximas entregas</h2>
          {pendientes.length > 0 && (
            <button
              type="button"
              onClick={onVerPedidos}
              className="inline-flex cursor-pointer items-center gap-1 text-sm font-semibold text-berry hover:underline"
            >
              Ver todos
              <ArrowRight size={14} weight="bold" />
            </button>
          )}
        </div>
        {pendientes.length === 0 ? (
          <p className="card mt-3 px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
            Todo entregado. Cuando te pidan algo, anótalo con “Nuevo pedido”.
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {pendientes.slice(0, 4).map((p) => (
              <TarjetaPedido
                key={p.id}
                pedido={p}
                onCambiarEstado={onCambiarEstadoPedido}
                onEditar={onEditarPedido}
              />
            ))}
          </div>
        )}
      </section>

      {(faltantes.length > 0 || porRevisar.length > 0) && (
        <div className="grid gap-8 md:grid-cols-2 md:gap-6">
          {faltantes.length > 0 && (
            <section>
              <h2 className="text-lg font-bold">Te falta comprar</h2>
              <div className="card mt-3 overflow-hidden">
                <ul className="divide-y divide-line">
                  {faltantes.slice(0, 5).map((it) => (
                    <li key={it.insumo.id} className="flex items-baseline justify-between gap-3 px-4 py-3 sm:px-5">
                      <span className="truncate">{it.insumo.nombre}</span>
                      <span className="num shrink-0 font-semibold">
                        {formatearCantidad(it.faltante, it.unidadBase)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onVerCompras}
                  className="flex min-h-[48px] w-full cursor-pointer items-center justify-between border-t border-line px-4 text-sm font-semibold text-berry hover:bg-paper sm:px-5"
                >
                  {faltantes.length > 5
                    ? `Ver la lista completa (${faltantes.length})`
                    : 'Ver la lista de compras'}
                  <CaretRight size={14} weight="bold" />
                </button>
              </div>
            </section>
          )}

          {porRevisar.length > 0 && (
            <section>
              <h2 className="text-lg font-bold">Precios para revisar</h2>
              <ul className="card mt-3 divide-y divide-line overflow-hidden">
                {porRevisar.map((r) => {
                  const res = resumenes.get(r.id)!;
                  const incompleto = res.costoIncompleto;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onAbrirProducto(r.id)}
                        className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-paper sm:px-5"
                      >
                        <span className="min-w-0 flex-1 truncate">{r.nombre}</span>
                        <Etiqueta tono={incompleto ? 'warn' : TONO_SALUD[res.estadoSalud]}>
                          {incompleto
                            ? res.costoTotalLote > 0
                              ? 'Costo incompleto'
                              : 'Faltan datos'
                            : TEXTO_SALUD[res.estadoSalud]}
                        </Etiqueta>
                        <CaretRight size={14} weight="bold" className="shrink-0 text-ink-soft" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
