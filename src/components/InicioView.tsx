'use client';

import React, { useMemo } from 'react';
import { EstadoPedido, Insumo, Pedido, Receta, ResumenCostosReceta } from '@/lib/types';
import {
  calcularListaCompras,
  formatearCantidad,
  formatearMoneda,
  hoyISO,
} from '@/lib/costing';
import { Etiqueta } from './ui';
import { TarjetaPedido } from './PedidosView';
import { TONO_SALUD, TEXTO_SALUD } from './RecipeDetailView';
import { Plus, Check, CaretRight, ArrowRight } from '@phosphor-icons/react';

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
  resumenes: Map<string, ResumenCostosReceta>;
  insumosMap: Map<string, Insumo>;
  onNuevoInsumo: () => void;
  onNuevoProducto: () => void;
  onNuevoPedido: () => void;
  onVerPedidos: () => void;
  onVerCompras: () => void;
  onAbrirProducto: (id: string) => void;
  onEditarPedido: (pedido: Pedido) => void;
  onCambiarEstadoPedido: (pedido: Pedido, estado: EstadoPedido) => void;
}

/* -------------------------------------------------------------------------- */
/* Primeros pasos: una sola cosa por hacer a la vez                            */
/* -------------------------------------------------------------------------- */

function PrimerosPasos({
  insumos,
  recetas,
  pedidos,
  onNuevoInsumo,
  onNuevoProducto,
  onNuevoPedido,
}: Pick<
  InicioViewProps,
  'insumos' | 'recetas' | 'pedidos' | 'onNuevoInsumo' | 'onNuevoProducto' | 'onNuevoPedido'
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
      titulo: 'Anota tu primer pedido',
      texto:
        'Quién te pidió qué y para cuándo. Te mostramos cuánto ganas y qué te falta comprar.',
      hecho: pedidos.length > 0,
      resumenHecho: '',
      accion: 'Nuevo pedido',
      accionExtra: '',
      onClick: onNuevoPedido,
    },
  ];
  const actual = pasos.findIndex((p) => !p.hecho);
  const hechos = pasos.filter((p) => p.hecho).length;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-[2rem] font-semibold leading-tight sm:text-[2.5rem]">
        {hechos === 0 ? 'Bienvenida a Chefcita' : 'Vas muy bien'}
      </h1>
      <p className="mt-3 max-w-xl text-[1.0625rem] text-ink-soft">
        {hechos === 0
          ? 'Dejemos todo listo en tres pasos. Al terminar vas a saber cuánto ganas con cada dulce y qué tienes que entregar cada día.'
          : `Llevas ${hechos} de 3 pasos. Sigue con el que está marcado.`}
      </p>

      <ol className="card mt-8 divide-y divide-line">
        {pasos.map((p, i) => {
          const esActual = i === actual;
          const bloqueado = !p.hecho && !esActual;
          return (
            <li key={p.titulo} className={`flex gap-4 p-5 ${bloqueado ? 'opacity-55' : ''}`}>
              <span
                className={`num flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[0.9375rem] font-bold ${
                  p.hecho
                    ? 'bg-ok text-white'
                    : esActual
                      ? 'bg-berry text-white'
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
    resumenes,
    insumosMap,
    onNuevoProducto,
    onNuevoPedido,
    onVerPedidos,
    onVerCompras,
    onAbrirProducto,
    onEditarPedido,
    onCambiarEstadoPedido,
  } = props;

  const pendientes = useMemo(
    () =>
      pedidos
        .filter((p) => p.estado !== 'entregado')
        .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega)),
    [pedidos]
  );

  const mesActual = hoyISO().slice(0, 7);
  const porCobrar = pendientes.reduce(
    (s, p) => s + Math.max(0, p.precio_venta_total - p.seña_pagada),
    0
  );
  const gananciaMes = pedidos
    .filter((p) => p.estado === 'entregado' && p.fecha_entrega.startsWith(mesActual))
    .reduce((s, p) => s + p.ganancia_neta, 0);

  const faltantes = useMemo(
    () => calcularListaCompras(pedidos, recetas, insumosMap).filter((i) => i.faltante > 0),
    [pedidos, recetas, insumosMap]
  );

  const porRevisar = recetas.filter((r) => {
    const res = resumenes.get(r.id);
    return res && (res.costoTotalLote <= 0 || res.estadoSalud === 'perdida' || res.estadoSalud === 'bajo');
  });

  // Mientras no exista un producto y un pedido, la pantalla es la guía de primeros pasos
  if (recetas.length === 0 || pedidos.length === 0) {
    return <PrimerosPasos {...props} />;
  }

  const hoy = FORMATO_HOY.format(new Date());

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div>
          <h1 className="font-display text-[1.75rem] font-semibold leading-tight first-letter:uppercase sm:text-[2rem]">
            {hoy}
          </h1>
          <p className="mt-1.5 text-[0.9375rem] text-ink-soft">
            {pendientes.length === 0
              ? 'No tienes pedidos por entregar.'
              : pendientes.length === 1
                ? 'Tienes 1 pedido por entregar.'
                : `Tienes ${pendientes.length} pedidos por entregar.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" className="btn btn-secondary" onClick={onNuevoProducto}>
            <Plus size={18} weight="bold" />
            Producto
          </button>
          <button type="button" className="btn btn-primary" onClick={onNuevoPedido}>
            <Plus size={18} weight="bold" />
            Nuevo pedido
          </button>
        </div>
      </div>

      <dl className="card grid grid-cols-2 divide-x divide-line">
        <div className="p-4 sm:p-5">
          <dt className="text-sm text-ink-soft">Te falta cobrar</dt>
          <dd className="num mt-0.5 text-2xl font-bold">{formatearMoneda(porCobrar)}</dd>
        </div>
        <div className="p-4 sm:p-5">
          <dt className="text-sm text-ink-soft">Ganancia de {FORMATO_MES.format(new Date())}</dt>
          <dd className="num mt-0.5 text-2xl font-bold text-ok">{formatearMoneda(gananciaMes)}</dd>
        </div>
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
                  const sinCosto = res.costoTotalLote <= 0;
                  return (
                    <li key={r.id}>
                      <button
                        type="button"
                        onClick={() => onAbrirProducto(r.id)}
                        className="flex min-h-[52px] w-full cursor-pointer items-center gap-3 px-4 py-3 text-left hover:bg-paper sm:px-5"
                      >
                        <span className="min-w-0 flex-1 truncate">{r.nombre}</span>
                        <Etiqueta tono={sinCosto ? 'warn' : TONO_SALUD[res.estadoSalud]}>
                          {sinCosto ? 'Faltan ingredientes' : TEXTO_SALUD[res.estadoSalud]}
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
