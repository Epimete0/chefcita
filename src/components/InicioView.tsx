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
import {
  Plus,
  Check,
  CaretRight,
  ArrowRight,
  Wallet,
  TrendUp,
  Storefront,
  WarningCircle,
  Sparkle,
  ShoppingBag,
  Tag,
} from '@phosphor-icons/react';

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
  onNuevaVenta: (fecha?: string, recetaId?: string) => void;
  onVerVentas: () => void;
  onVerPedidos: () => void;
  onVerEntregados?: () => void;
  onVerCompras: () => void;
  onVerProductosRevisar?: () => void;
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
      <p className="eyebrow text-berry">Tu cuaderno de pastelería</p>
      <h1 className="font-display mt-1.5 text-[clamp(1.875rem,1.45rem+1.8vw,2.625rem)] font-bold leading-[1.1]">
        {hechos === 0 ? 'Bienvenida a Chefcita' : 'Vas muy bien'}
      </h1>
      <p className="mt-3 max-w-[56ch] text-[1.0625rem] leading-relaxed text-ink-soft">
        {hechos === 0
          ? 'Dejemos todo listo en tres pasos. Al terminar vas a saber cuánto ganas con cada dulce y qué tienes que entregar cada día.'
          : `Llevas ${hechos} de 3 pasos. Sigue con el que está marcado.`}
      </p>

      <div className="mt-6 flex items-center gap-3" aria-hidden="true">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-sunken">
          <div
            className="bg-brand h-full rounded-full transition-[width] duration-300"
            style={{ width: `${Math.max(8, Math.round((hechos / 3) * 100))}%` }}
          />
        </div>
        <span className="num text-xs font-bold text-ink-soft">{hechos}/3</span>
      </div>

      <ol className="card mt-5 divide-y divide-line overflow-hidden">
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
                      ? 'bg-brand text-white shadow-[0_4px_12px_rgba(141,83,107,0.28)]'
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
    onVerProductosRevisar,
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

  const porRevisar = useMemo(() => {
    const prioridad = (r: Receta) => {
      const res = resumenes.get(r.id);
      if (!res) return 3;
      if (!res.costoIncompleto && res.estadoSalud === 'perdida') return 0;
      if (!res.costoIncompleto && res.estadoSalud === 'bajo') return 1;
      return 2;
    };
    return recetas
      .filter((r) => {
        const res = resumenes.get(r.id);
        return res && (res.costoIncompleto || res.estadoSalud === 'perdida' || res.estadoSalud === 'bajo');
      })
      .sort((a, b) => prioridad(a) - prioridad(b) || a.nombre.localeCompare(b.nombre));
  }, [recetas, resumenes]);

  const hayAlertas = faltantes.length > 0 || porRevisar.length > 0;

  const productosRapidos = useMemo(
    () =>
      [...recetas]
        .sort((a, b) => Number(b.favorita) - Number(a.favorita) || a.nombre.localeCompare(b.nombre))
        .slice(0, 4),
    [recetas]
  );

  const entregasUrgentes = useMemo(
    () => pendientes.filter((p) => p.fecha_entrega <= hoyIso).length,
    [pendientes, hoyIso]
  );

  // Mientras no haya productos ni registros, la pantalla es la guía de primeros pasos
  if (recetas.length === 0 && ventas.length === 0 && pedidos.length === 0) {
    return <PrimerosPasos {...props} />;
  }

  const hoy = FORMATO_HOY.format(new Date());

  return (
    <div className="anim-rise space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <p className="eyebrow text-berry">Tu día en el obrador</p>
          <h1 className="font-display mt-1 text-[clamp(1.625rem,1.3rem+1.4vw,2.375rem)] font-bold leading-[1.12] first-letter:uppercase">
            {hoy}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[0.9375rem] text-ink-soft">
            <span>
              {resumenHoy.cantidadRegistros > 0
                ? `Hoy llevas ${formatearMoneda(resumenHoy.totalVendido)} en ventas`
                : 'Aún no registras ventas hoy'}
              {pendientes.length === 0
                ? ' · Sin pedidos pendientes'
                : pendientes.length === 1
                  ? ' · 1 pedido por entregar'
                  : ` · ${pendientes.length} pedidos por entregar`}
            </span>
            {entregasUrgentes > 0 && (
              <button
                type="button"
                onClick={onVerPedidos}
                className="inline-flex cursor-pointer items-center gap-1 rounded-full bg-berry-soft px-2.5 py-0.5 text-xs font-semibold text-berry-dark ring-1 ring-inset ring-berry/20 hover:bg-berry/15"
              >
                <WarningCircle size={14} weight="fill" />
                {entregasUrgentes === 1 ? '1 para hoy o atrasado' : `${entregasUrgentes} para hoy o atrasados`}
              </button>
            )}
          </div>
        </div>
        <div className="flex w-full gap-2.5 sm:w-auto sm:gap-3">
          <button
            type="button"
            className="btn btn-secondary flex-1 whitespace-nowrap px-3 text-sm sm:flex-initial sm:px-[1.125rem] sm:text-[0.9375rem]"
            onClick={onNuevoPedido}
          >
            <Plus size={17} weight="bold" />
            Nuevo pedido
          </button>
          <button
            type="button"
            className="btn btn-primary flex-1 whitespace-nowrap px-3 text-sm sm:flex-initial sm:px-[1.125rem] sm:text-[0.9375rem]"
            onClick={() => onNuevaVenta(hoyIso)}
          >
            <Plus size={17} weight="bold" />
            Anotar venta
          </button>
        </div>
      </header>

      {/* ==================== BENTO PRINCIPAL: HOY + MES ==================== */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Caja de hoy */}
        <section className="card-atelier flex min-w-0 flex-col justify-between overflow-hidden lg:col-span-7">
          <div>
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line/90 p-5 sm:p-6">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-berry">
                  <Storefront size={17} weight="duotone" />
                  Ventas de hoy
                </div>
                <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                  <span className="num font-display text-[clamp(2rem,1.6rem+1.6vw,2.625rem)] font-bold leading-none">
                    {formatearMoneda(resumenHoy.totalVendido)}
                  </span>
                  {resumenHoy.cantidadRegistros > 0 && !resumenHoy.tieneCostoIncompleto && (
                    <Etiqueta tono={resumenHoy.gananciaConocida >= 0 ? 'ok' : 'bad'}>
                      {resumenHoy.gananciaConocida >= 0 ? 'Ganas ' : 'Pierdes '}
                      <span className="num">{formatearMoneda(Math.abs(resumenHoy.gananciaConocida))}</span>
                    </Etiqueta>
                  )}
                </div>
              </div>
              <button type="button" onClick={onVerVentas} className="btn btn-secondary btn-sm">
                Ver por día
                <ArrowRight size={14} weight="bold" />
              </button>
            </div>

            {ventasHoy.length === 0 ? (
              <div className="px-5 py-6 sm:px-6">
                <p className="max-w-[52ch] text-[0.9375rem] leading-relaxed text-ink-soft">
                  Anota lo que vendes en el día (por ejemplo: 3 cajas de donas, 2 mini pies) y
                  edita la fecha si quieres cargar ventas de otro día.
                </p>
                {resumenAyer.cantidadRegistros > 0 && (
                  <p className="mt-2.5 text-sm text-ink-soft">
                    Ayer vendiste{' '}
                    <strong className="num text-ink">{formatearMoneda(resumenAyer.totalVendido)}</strong>.
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2 border-b border-line/80 bg-surface/55 px-5 py-3 sm:px-6">
                  {resumenHoy.productos.map((p) => (
                    <span
                      key={p.clave}
                      className="num rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-semibold text-ink shadow-[0_1px_2px_rgba(54,32,41,0.03)]"
                    >
                      {String(Math.round(p.cantidad * 100) / 100).replace('.', ',')} ×{' '}
                      {p.presentacionNombre} · {p.productoNombre}
                    </span>
                  ))}
                </div>
                <div className="divide-y divide-line/85 bg-surface/65">
                  {ventasHoy.slice(0, 4).map((v) => (
                    <TarjetaVenta key={v.id} venta={v} onEditar={onEditarVenta} />
                  ))}
                </div>
                {ventasHoy.length > 4 && (
                  <button
                    type="button"
                    onClick={onVerVentas}
                    className="flex min-h-[46px] w-full cursor-pointer items-center justify-between border-t border-line/85 bg-surface/75 px-5 text-sm font-semibold text-berry hover:bg-berry-soft/35 sm:px-6"
                  >
                    Ver las {ventasHoy.length} ventas de hoy
                    <CaretRight size={14} weight="bold" />
                  </button>
                )}
              </>
            )}
          </div>

          {productosRapidos.length > 0 && (
            <div className="border-t border-line/85 bg-surface/65 px-4 py-3.5 sm:px-6">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <Sparkle size={14} weight="fill" className="text-berry" />
                <span>Registro rápido en 1 toque:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {productosRapidos.map((rec) => (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => onNuevaVenta(hoyIso, rec.id)}
                    className="inline-flex min-h-[36px] max-w-full cursor-pointer items-center gap-1.5 rounded-xl border border-line-strong/80 bg-surface px-3 py-1 text-left text-xs font-semibold text-ink transition-[background-color,border-color,color,transform] duration-150 hover:border-berry hover:bg-berry-soft/50 hover:text-berry-dark active:scale-[0.97]"
                  >
                    <Plus size={13} weight="bold" className="shrink-0 text-berry" />
                    <span className="truncate">{rec.nombre}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Resumen del mes y cobros */}
        <dl className="grid min-w-0 grid-cols-2 gap-3.5 sm:grid-cols-3 lg:col-span-5 lg:grid-cols-1">
          <button
            type="button"
            onClick={onVerVentas}
            className="card card-interactive group col-span-2 flex w-full cursor-pointer items-center justify-between gap-3 border-ok/20 bg-ok-soft/45 p-4 text-left sm:col-span-1 sm:p-5"
          >
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ok-soft text-ok ring-1 ring-inset ring-ok/15">
                  <TrendUp size={16} weight="duotone" />
                </span>
                <span className="truncate">Ganancia de {FORMATO_MES.format(new Date())}</span>
              </dt>
              <dd className="num font-display mt-2 text-2xl font-bold text-ok sm:text-[1.75rem]">
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
            onClick={onVerVentas}
            className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
          >
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-berry-soft text-berry">
                  <Storefront size={16} weight="duotone" />
                </span>
                <span className="truncate">Vendido en {FORMATO_MES.format(new Date())}</span>
              </dt>
              <dd className="num font-display mt-2 text-xl font-bold sm:text-[1.625rem]">
                {formatearMoneda(vendidoMesTotal)}
              </dd>
              {vendidoPedidosMes > 0 && resumenVentasMes.totalVendido > 0 && (
                <div className="num mt-0.5 truncate text-xs text-ink-soft">
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
            onClick={onVerPedidos}
            className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 border-lila/45 bg-lila-soft/65 p-4 text-left sm:p-5"
          >
            <div className="min-w-0">
              <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-lila-ink ring-1 ring-inset ring-lila/45">
                  <Wallet size={16} weight="duotone" />
                </span>
                <span className="truncate">Te falta cobrar</span>
              </dt>
              <dd className="num font-display mt-2 text-xl font-bold sm:text-[1.625rem]">
                {formatearMoneda(porCobrar)}
              </dd>
              {pendientes.length > 0 && (
                <div className="mt-0.5 truncate text-xs text-ink-soft">
                  De {pendientes.length} {pendientes.length === 1 ? 'pedido activo' : 'pedidos activos'}
                </div>
              )}
            </div>
            <CaretRight
              size={18}
              weight="bold"
              className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
            />
          </button>
        </dl>
      </div>

      {/* ==================== OPERACIÓN: ENTREGAS Y PENDIENTES ==================== */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <section className={`min-w-0 ${hayAlertas ? 'lg:col-span-7' : 'lg:col-span-12'}`}>
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow text-ink-soft">Agenda activa</p>
              <h2 className="font-display mt-0.5 text-xl font-bold">Próximas entregas</h2>
            </div>
            {pendientes.length > 0 && (
              <button
                type="button"
                onClick={onVerPedidos}
                className="inline-flex shrink-0 cursor-pointer items-center gap-1 text-sm font-semibold text-berry hover:underline"
              >
                {pendientes.length > 4 ? `Ver todos (${pendientes.length})` : 'Ver pedidos'}
                <ArrowRight size={14} weight="bold" />
              </button>
            )}
          </div>
          {pendientes.length === 0 ? (
            <div className="card-sunken mt-3 flex flex-wrap items-center justify-between gap-3 px-5 py-6">
              <p className="text-[0.9375rem] text-ink-soft">
                Todo entregado. Cuando te pidan algo, anótalo para organizar tu horno y compras.
              </p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={onNuevoPedido}>
                <Plus size={15} weight="bold" />
                Nuevo pedido
              </button>
            </div>
          ) : (
            <div
              className={`mt-3 grid grid-cols-1 gap-3.5 ${
                pendientes.length === 1 ? '' : hayAlertas ? 'sm:grid-cols-2' : 'md:grid-cols-2'
              }`}
            >
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

        {hayAlertas && (
          <aside className="min-w-0 space-y-5 lg:col-span-5">
            {faltantes.length > 0 && (
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-berry-soft/40 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-berry shadow-[0_1px_3px_rgba(54,32,41,0.08)]">
                      <ShoppingBag size={16} weight="duotone" />
                    </span>
                    <h2 className="font-display text-base font-bold text-ink">Te falta comprar</h2>
                  </div>
                  <Etiqueta tono="berry">
                    <span className="num">{faltantes.length}</span>
                  </Etiqueta>
                </div>
                <ul className="divide-y divide-line">
                  {faltantes.slice(0, 4).map((it) => (
                    <li key={it.insumo.id} className="flex items-baseline justify-between gap-3 px-4 py-2.5 text-[0.9375rem] sm:px-5">
                      <span className="min-w-0 truncate font-medium">{it.insumo.nombre}</span>
                      <span className="num shrink-0 font-bold text-berry-dark">
                        {formatearCantidad(it.faltante, it.unidadBase)}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={onVerCompras}
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-between border-t border-line bg-paper/55 px-4 text-sm font-semibold text-berry transition-colors hover:bg-berry-soft/35 sm:px-5"
                >
                  {faltantes.length > 4
                    ? `Ver lista completa (${faltantes.length})`
                    : 'Abrir lista de compras'}
                  <CaretRight size={14} weight="bold" />
                </button>
              </section>
            )}

            {porRevisar.length > 0 && (
              <section className="card overflow-hidden">
                <div className="flex items-center justify-between gap-3 border-b border-line bg-warn-soft/55 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface text-warn shadow-[0_1px_3px_rgba(54,32,41,0.08)]">
                      <Tag size={16} weight="duotone" />
                    </span>
                    <h2 className="font-display text-base font-bold text-ink">Precios para revisar</h2>
                  </div>
                  <Etiqueta tono="warn">
                    <span className="num">{porRevisar.length}</span>
                  </Etiqueta>
                </div>
                <ul className="divide-y divide-line">
                  {porRevisar.slice(0, 4).map((r) => {
                    const res = resumenes.get(r.id)!;
                    const incompleto = res.costoIncompleto;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => onAbrirProducto(r.id)}
                          className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-paper/80 sm:px-5"
                        >
                          <span className="min-w-0 flex-1 truncate text-[0.9375rem] font-medium">
                            {r.nombre}
                          </span>
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
                {onVerProductosRevisar && porRevisar.length > 4 && (
                  <button
                    type="button"
                    onClick={onVerProductosRevisar}
                    className="flex min-h-[44px] w-full cursor-pointer items-center justify-between border-t border-line bg-paper/55 px-4 text-sm font-semibold text-berry transition-colors hover:bg-berry-soft/35 sm:px-5"
                  >
                    Ver los {porRevisar.length} productos por revisar
                    <CaretRight size={14} weight="bold" />
                  </button>
                )}
              </section>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
