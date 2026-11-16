'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Insumo, Receta, DesgloseItemCosto } from '@/lib/types';
import {
  calcularCostosReceta,
  formatearMoneda,
  formatearCantidad,
  precioParaMargen,
  redondearPrecioComercial,
  singular,
} from '@/lib/costing';
import { CampoDinero, Segmentos, Etiqueta, Confirmar, Tono } from './ui';
import {
  ArrowLeft,
  PencilSimple,
  Trash,
  Plus,
  Timer,
  Play,
  Pause,
  X,
  CheckCircle,
  Circle,
  Check,
} from '@phosphor-icons/react';

interface RecipeDetailViewProps {
  receta: Receta;
  insumosMap: Map<string, Insumo>;
  onVolver: () => void;
  onActualizarPrecios: (
    recetaId: string,
    precios: {
      precio_venta_pack: number;
      precio_venta_unidad: number;
      precio_venta_lote: number;
    }
  ) => Promise<void>;
  onEditarReceta: (receta: Receta) => void;
  onEliminarReceta: (recetaId: string) => Promise<void>;
  onNuevoPedido: (receta: Receta) => void;
}

export const TONO_SALUD: Record<string, Tono> = {
  perdida: 'bad',
  bajo: 'warn',
  correcto: 'ok',
  excelente: 'ok',
};

export const TEXTO_SALUD: Record<string, string> = {
  perdida: 'Pierdes dinero',
  bajo: 'Ganancia baja',
  correcto: 'Buen precio',
  excelente: 'Muy buen precio',
};

const COLOR_TEXTO: Record<Tono, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  bad: 'text-bad',
  neutro: 'text-ink',
  berry: 'text-berry',
};

function formatearTiempo(seg: number) {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RecipeDetailView({
  receta,
  insumosMap,
  onVolver,
  onActualizarPrecios,
  onEditarReceta,
  onEliminarReceta,
  onNuevoPedido,
}: RecipeDetailViewProps) {
  const [pestana, setPestana] = useState<'precio' | 'preparar'>('precio');
  const [precioEdit, setPrecioEdit] = useState(String(receta.precio_venta_pack || ''));
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  // Modo preparar
  const [veces, setVeces] = useState(1);
  const [marcados, setMarcados] = useState<Record<string, boolean>>({});
  const [pasosHechos, setPasosHechos] = useState<Record<string, boolean>>({});
  const [timerPaso, setTimerPaso] = useState<string | null>(null);
  const [timerSeg, setTimerSeg] = useState(0);
  const [timerCorriendo, setTimerCorriendo] = useState(false);

  // Si el precio guardado cambia (por ejemplo al editar el producto), el campo lo refleja
  const [precioGuardado, setPrecioGuardado] = useState(receta.precio_venta_pack);
  if (precioGuardado !== receta.precio_venta_pack) {
    setPrecioGuardado(receta.precio_venta_pack);
    setPrecioEdit(String(receta.precio_venta_pack || ''));
  }

  useEffect(() => {
    if (!timerCorriendo) return;
    const intervalo = setInterval(() => {
      setTimerSeg((prev) => {
        if (prev <= 1) {
          setTimerCorriendo(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalo);
  }, [timerCorriendo]);

  const unidPack = Math.max(1, receta.unidades_por_pack || 1);
  const vendeEnPack = unidPack > 1;
  const packsPorPreparacion = receta.rendimiento_cantidad / unidPack;
  const precioNum = Number(precioEdit) || 0;
  const unidad = singular(receta.rendimiento_unidad);
  const nombreVenta = vendeEnPack ? receta.nombre_pack : unidad;

  const recetaSimulada = useMemo<Receta>(
    () => ({
      ...receta,
      precio_venta_pack: precioNum,
      precio_venta_unidad: vendeEnPack ? redondearPrecioComercial(precioNum / unidPack) : precioNum,
      precio_venta_lote: Math.round(precioNum * packsPorPreparacion),
    }),
    [receta, precioNum, vendeEnPack, unidPack, packsPorPreparacion]
  );

  const r = useMemo(
    () => calcularCostosReceta(recetaSimulada, insumosMap, 1),
    [recetaSimulada, insumosMap]
  );
  const rPreparar = useMemo(
    () => calcularCostosReceta(receta, insumosMap, veces),
    [receta, insumosMap, veces]
  );

  const incompleto = r.costoIncompleto;
  const tono: Tono = incompleto ? 'warn' : TONO_SALUD[r.estadoSalud];
  const precioCambiado = precioNum !== (receta.precio_venta_pack || 0) && precioNum > 0;

  const sugerencias = [
    { nombre: 'Ajustado', precio: precioParaMargen(r.costoPorPack, 45) },
    { nombre: 'Recomendado', precio: precioParaMargen(r.costoPorPack, 60) },
    { nombre: 'Premium', precio: precioParaMargen(r.costoPorPack, 70) },
  ];

  const guardarPrecio = async () => {
    setGuardando(true);
    try {
      await onActualizarPrecios(receta.id, {
        precio_venta_pack: recetaSimulada.precio_venta_pack,
        precio_venta_unidad: recetaSimulada.precio_venta_unidad,
        precio_venta_lote: recetaSimulada.precio_venta_lote,
      });
    } finally {
      setGuardando(false);
    }
  };

  // Reparto de cada venta
  const venta = Math.max(r.precioVentaLote, r.costoTotalLote, 1);
  const partes = [
    { nombre: 'Ingredientes', valor: r.costoIngredientesTotal, color: 'bg-ink' },
    { nombre: 'Envases', valor: r.costoEmpaque, color: 'bg-ink/55' },
    { nombre: 'Gas, luz y otros', valor: r.costoGastosExtras + r.costoManoObra, color: 'bg-ink/25' },
    { nombre: 'Tu ganancia', valor: Math.max(0, r.gananciaPorLote), color: 'bg-ok' },
  ].filter((p) => p.valor > 0);

  const grupos: Array<{ titulo: string; lista: DesgloseItemCosto[]; total: number }> = [
    { titulo: 'Masa o base', lista: r.itemsMasa, total: r.costoMasa },
    { titulo: 'Relleno, cobertura y decoración', lista: r.itemsRelleno, total: r.costoRellenoCobertura },
    { titulo: 'Envases y empaque', lista: r.itemsEmpaque, total: r.costoEmpaque },
  ].filter((g) => g.lista.length > 0);

  const gruposPreparar = [
    { titulo: 'Masa o base', lista: rPreparar.itemsMasa },
    { titulo: 'Relleno, cobertura y decoración', lista: rPreparar.itemsRelleno },
    { titulo: 'Envases y empaque', lista: rPreparar.itemsEmpaque },
  ].filter((g) => g.lista.length > 0);

  const filas = [
    {
      nombre: `Por ${unidad}`,
      costo: r.costoPorUnidad,
      venta: r.precioVentaPack / unidPack,
      gana: r.gananciaPorPack / unidPack,
    },
    ...(vendeEnPack
      ? [
          {
            nombre: `Por ${receta.nombre_pack}`,
            costo: r.costoPorPack,
            venta: r.precioVentaPack,
            gana: r.gananciaPorPack,
          },
        ]
      : []),
    {
      nombre: `Por los ${receta.rendimiento_cantidad} ${receta.rendimiento_unidad}`,
      costo: r.costoTotalLote,
      venta: r.precioVentaLote,
      gana: r.gananciaPorLote,
    },
  ];

  return (
    <div className="anim-rise space-y-6">
      <div>
        <button
          type="button"
          onClick={onVolver}
          className="-ml-2 inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-lg px-2 text-[0.9375rem] font-semibold text-ink-soft hover:text-ink"
        >
          <ArrowLeft size={18} weight="bold" />
          Productos
        </button>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            <h1 className="font-display text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
              {receta.nombre}
            </h1>
            <p className="mt-1 text-[0.9375rem] text-ink-soft">
              Salen {receta.rendimiento_cantidad} {receta.rendimiento_unidad} cada vez
              {vendeEnPack ? ` · se vende en ${receta.nombre_pack}` : ' · se vende de a uno'}
            </p>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary" onClick={() => onEditarReceta(receta)}>
              <PencilSimple size={18} />
              Editar
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onNuevoPedido(receta)}>
              <Plus size={18} weight="bold" />
              Nuevo pedido
            </button>
          </div>
        </div>
      </div>

      <Segmentos
        className="sm:w-96"
        opciones={[
          { id: 'precio', etiqueta: 'Precio y ganancia' },
          { id: 'preparar', etiqueta: 'Preparar' },
        ]}
        valor={pestana}
        onChange={setPestana}
      />

      {/* ============================ PRECIO Y GANANCIA ============================ */}
      {pestana === 'precio' && (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="min-w-0 space-y-6 lg:col-span-3">
            {incompleto ? (
              <div className="card p-5 sm:p-6">
                <Etiqueta tono="warn">
                  {r.costoTotalLote > 0 ? 'Costo incompleto · falta dato' : 'Faltan ingredientes y costos'}
                </Etiqueta>
                <h2 className="mt-3 text-lg font-bold">Aún no calculamos la ganancia real</h2>
                <p className="mt-1 text-[0.9375rem] text-ink-soft">
                  Este producto tiene ingredientes, cantidades o precios pendientes por confirmar.
                  Complétalos para ver el margen real y sugerencias de precio sin cifras falsas.
                </p>
                {(r.costoTotalLote > 0 || r.precioVentaPack > 0) && (
                  <dl className="mt-4 grid grid-cols-1 gap-3 border-t border-line pt-4 sm:grid-cols-2">
                    {r.costoTotalLote > 0 && (
                      <div>
                        <dt className="text-sm text-ink-soft">Costo parcial registrado</dt>
                        <dd className="num font-display mt-0.5 text-xl font-semibold">
                          {formatearMoneda(r.costoPorPack)}
                        </dd>
                        <div className="text-xs text-ink-soft">
                          Por {nombreVenta} ({formatearMoneda(r.costoTotalLote)} lote)
                        </div>
                      </div>
                    )}
                    {r.precioVentaPack > 0 && (
                      <div>
                        <dt className="text-sm text-ink-soft">Precio de venta anotado</dt>
                        <dd className="num font-display mt-0.5 text-xl font-semibold">
                          {formatearMoneda(r.precioVentaPack)}
                        </dd>
                        <div className="text-xs text-ink-soft">Por {nombreVenta}</div>
                      </div>
                    )}
                  </dl>
                )}
                {receta.notas_chefcita && (
                  <p className="mt-4 rounded-xl bg-sunken px-4 py-3 text-[0.9375rem] leading-relaxed">
                    <strong>Registro y datos pendientes:</strong> {receta.notas_chefcita}
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary mt-4"
                  onClick={() => onEditarReceta(receta)}
                >
                  Completar producto
                </button>
              </div>
            ) : (
              <div className="card overflow-hidden p-5 sm:p-6">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-3">
                  <div>
                    <dt className="text-sm text-ink-soft">Te cuesta</dt>
                    <dd className="num font-display mt-0.5 text-xl font-semibold sm:text-2xl">
                      {formatearMoneda(r.costoPorPack)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink-soft">Lo vendes a</dt>
                    <dd className="num font-display mt-0.5 text-xl font-semibold sm:text-2xl">
                      {formatearMoneda(r.precioVentaPack)}
                    </dd>
                  </div>
                  <div className="col-span-2 border-t border-line pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0">
                    <dt className="text-sm text-ink-soft">{r.gananciaPorPack < 0 ? 'Pierdes' : 'Ganas'}</dt>
                    <dd className={`num font-display mt-0.5 text-2xl font-semibold ${COLOR_TEXTO[tono]}`}>
                      {formatearMoneda(Math.abs(r.gananciaPorPack))}
                    </dd>
                  </div>
                </dl>
                <p className="mt-1 text-sm text-ink-soft">Por {nombreVenta}</p>

                <div className="mt-4 flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-sunken">
                  {partes.map((p) => (
                    <div
                      key={p.nombre}
                      className={`${p.color} h-full transition-[width] duration-300 ease-out`}
                      style={{ width: `${(p.valor / venta) * 100}%` }}
                    />
                  ))}
                </div>
                <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-soft">
                  {partes.map((p) => (
                    <li key={p.nombre} className="flex items-center gap-1.5">
                      <span className={`h-2.5 w-2.5 rounded-full ${p.color}`} />
                      {p.nombre} <span className="num">{Math.round((p.valor / venta) * 100)}%</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
                  <Etiqueta tono={tono}>{TEXTO_SALUD[r.estadoSalud]}</Etiqueta>
                  <p className="text-[0.9375rem]">{r.mensajeDiagnostico}</p>
                </div>
              </div>
            )}

            <div className="card p-5">
              <h2 className="text-lg font-bold">Cambiar el precio</h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Prueba un precio y mira arriba cuánto ganarías. No se guarda hasta que lo confirmes.
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <div className="sm:w-48">
                  <CampoDinero value={precioEdit} onChange={setPrecioEdit} placeholder="0" />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={!precioCambiado || guardando}
                  onClick={guardarPrecio}
                >
                  <Check size={18} weight="bold" />
                  {guardando ? 'Guardando…' : 'Guardar precio'}
                </button>
                {precioCambiado && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => setPrecioEdit(String(receta.precio_venta_pack || ''))}
                  >
                    Deshacer
                  </button>
                )}
              </div>
              {!incompleto && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {sugerencias.map((s) => (
                    <button
                      key={s.nombre}
                      type="button"
                      aria-pressed={precioNum === s.precio}
                      onClick={() => setPrecioEdit(String(s.precio))}
                      className={`btn btn-sm ${
                        precioNum === s.precio ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                      }`}
                    >
                      {s.nombre} <span className="num">{formatearMoneda(s.precio)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!incompleto && (
              <div className="card overflow-x-auto">
                <table className="num w-full text-left text-[0.9375rem]">
                  <thead>
                    <tr className="border-b border-line text-sm text-ink-soft">
                      <th className="px-5 py-3 font-medium"></th>
                      <th className="px-2 py-3 text-right font-medium sm:px-3">Costo</th>
                      <th className="px-2 py-3 text-right font-medium sm:px-3">Venta</th>
                      <th className="py-3 pl-2 pr-4 text-right font-medium sm:pr-5">Ganancia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filas.map((f) => (
                      <tr key={f.nombre}>
                        <th className="py-3 pl-4 pr-2 font-semibold sm:pl-5">{f.nombre}</th>
                        <td className="px-2 py-3 text-right sm:px-3">{formatearMoneda(f.costo)}</td>
                        <td className="px-2 py-3 text-right sm:px-3">{formatearMoneda(f.venta)}</td>
                        <td className={`py-3 pl-2 pr-4 text-right font-bold sm:pr-5 ${COLOR_TEXTO[tono]}`}>
                          {formatearMoneda(f.gana)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="min-w-0 lg:col-span-2">
            <div className="card p-5">
              <h2 className="text-lg font-bold">
                {incompleto && r.costoTotalLote > 0
                  ? 'Costos parciales registrados'
                  : 'En qué se va el costo'}
              </h2>
              <p className="mt-0.5 text-sm text-ink-soft">
                Para {receta.rendimiento_cantidad} {receta.rendimiento_unidad}.
              </p>

              {grupos.length === 0 && r.costoManoObra <= 0 ? (
                <p className="mt-4 text-[0.9375rem] text-ink-soft">Aún no hay ingredientes.</p>
              ) : (
                <div className="mt-4 space-y-5">
                  {grupos.map((g) => (
                    <div key={g.titulo}>
                      <div className="flex items-baseline justify-between text-sm font-semibold text-ink-soft">
                        <span>{g.titulo}</span>
                        <span className="num">{formatearMoneda(g.total)}</span>
                      </div>
                      <ul className="mt-1.5 divide-y divide-line">
                        {g.lista.map((d) => {
                          const sinPrecioItem =
                            !d.insumo || (Number(d.insumo.precio_compra) || 0) <= 0;
                          return (
                            <li
                              key={d.item.id}
                              className="flex items-baseline justify-between gap-3 py-2"
                            >
                              <div className="min-w-0">
                                <span className={d.insumo ? '' : 'text-bad'}>
                                  {d.insumo?.nombre || 'Ingrediente eliminado'}
                                </span>
                                <span className="num ml-2 text-sm text-ink-soft">
                                  {formatearCantidad(d.cantidadEscalada, d.item.unidad)}
                                </span>
                              </div>
                              {sinPrecioItem ? (
                                <span className="shrink-0 text-sm font-semibold text-warn">
                                  Falta precio
                                </span>
                              ) : (
                                <span className="num shrink-0 font-semibold">
                                  {formatearMoneda(d.costoItem)}
                                </span>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                  {r.costoGastosExtras > 0 && (
                    <div className="flex items-baseline justify-between text-[0.9375rem]">
                      <span>
                        Gas, luz y otros{' '}
                        <span className="num text-sm text-ink-soft">
                          ({receta.porcentaje_gastos_extras}%)
                        </span>
                      </span>
                      <span className="num font-semibold">{formatearMoneda(r.costoGastosExtras)}</span>
                    </div>
                  )}
                  {r.costoManoObra > 0 && (
                    <div className="flex items-baseline justify-between text-[0.9375rem]">
                      <span>Mano de obra</span>
                      <span className="num font-semibold">{formatearMoneda(r.costoManoObra)}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between border-t border-line-strong pt-3 text-base font-bold">
                    <span>{incompleto ? 'Costo parcial (incompleto)' : 'Costo total'}</span>
                    <span className="num">{formatearMoneda(r.costoTotalLote)}</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              className="btn btn-ghost mt-4 text-bad hover:bg-bad-soft"
            >
              <Trash size={18} />
              Eliminar producto
            </button>
          </div>
        </div>
      )}

      {/* ================================ PREPARAR ================================ */}
      {pestana === 'preparar' && (
        <div className="space-y-6">
          {timerPaso && (
            <div className="sticky top-20 z-20 flex items-center justify-between gap-3 rounded-2xl bg-ink px-5 py-3 text-white shadow-[0_8px_24px_rgba(42,31,27,0.25)]">
              <div className="flex items-center gap-3">
                <Timer size={24} weight="duotone" />
                <span className="num font-display text-2xl font-semibold">
                  {timerSeg === 0 ? '¡Tiempo!' : formatearTiempo(timerSeg)}
                </span>
              </div>
              <div className="flex gap-2">
                {timerSeg > 0 && (
                  <button
                    type="button"
                    onClick={() => setTimerCorriendo((v) => !v)}
                    className="btn btn-sm bg-white text-ink"
                  >
                    {timerCorriendo ? <Pause size={16} weight="fill" /> : <Play size={16} weight="fill" />}
                    {timerCorriendo ? 'Pausar' : 'Seguir'}
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Cerrar temporizador"
                  onClick={() => {
                    setTimerCorriendo(false);
                    setTimerPaso(null);
                  }}
                  className="flex h-[38px] w-[38px] cursor-pointer items-center justify-center rounded-[10px] bg-white/15 hover:bg-white/25"
                >
                  <X size={18} weight="bold" />
                </button>
              </div>
            </div>
          )}

          <div className="card p-5">
            <h2 className="text-lg font-bold">¿Cuánto vas a preparar?</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { v: 0.5, n: 'La mitad' },
                { v: 1, n: 'Una receta' },
                { v: 2, n: 'El doble' },
                { v: 3, n: 'El triple' },
              ].map((op) => (
                <button
                  key={op.v}
                  type="button"
                  aria-pressed={veces === op.v}
                  onClick={() => setVeces(op.v)}
                  className={`btn btn-sm ${
                    veces === op.v ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                  }`}
                >
                  {op.n}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[0.9375rem] text-ink-soft">
              Salen{' '}
              <strong className="num text-ink">
                {Math.round(rPreparar.rendimientoEscalado * 10) / 10} {receta.rendimiento_unidad}
              </strong>
              . Las cantidades de abajo ya están ajustadas.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-5">
            <div className="card min-w-0 p-5 lg:col-span-2">
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold">Lo que necesitas</h2>
                {Object.values(marcados).some(Boolean) && (
                  <button
                    type="button"
                    onClick={() => setMarcados({})}
                    className="cursor-pointer text-sm font-semibold text-berry hover:underline"
                  >
                    Desmarcar todo
                  </button>
                )}
              </div>
              {gruposPreparar.length === 0 ? (
                <p className="mt-3 text-[0.9375rem] text-ink-soft">
                  Este producto aún no tiene ingredientes.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {gruposPreparar.map((g) => (
                    <div key={g.titulo}>
                      <div className="text-sm font-semibold text-ink-soft">{g.titulo}</div>
                      <ul className="mt-1">
                        {g.lista.map((d) => {
                          const listo = Boolean(marcados[d.item.id]);
                          return (
                            <li key={d.item.id}>
                              <button
                                type="button"
                                aria-pressed={listo}
                                onClick={() =>
                                  setMarcados((prev) => ({ ...prev, [d.item.id]: !prev[d.item.id] }))
                                }
                                className="flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-lg px-1 text-left hover:bg-paper"
                              >
                                {listo ? (
                                  <CheckCircle size={24} weight="fill" className="shrink-0 text-ok" />
                                ) : (
                                  <Circle size={24} className="shrink-0 text-line-strong" />
                                )}
                                <span className={`flex-1 ${listo ? 'text-ink-soft line-through' : ''}`}>
                                  {d.insumo?.nombre || 'Ingrediente eliminado'}
                                </span>
                                <span className={`num font-semibold ${listo ? 'text-ink-soft' : ''}`}>
                                  {formatearCantidad(d.cantidadEscalada, d.item.unidad)}
                                </span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card min-w-0 p-5 lg:col-span-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="text-lg font-bold">Paso a paso</h2>
                {receta.pasos.length > 0 && (
                  <span className="num text-sm font-medium text-ink-soft">
                    {receta.pasos.filter((p) => pasosHechos[p.id]).length} de {receta.pasos.length}{' '}
                    listos
                  </span>
                )}
              </div>
              {receta.pasos.length === 0 ? (
                <div className="mt-3">
                  <p className="text-[0.9375rem] text-ink-soft">
                    Aún no anotas los pasos de esta receta. Si los agregas, puedes seguirlos desde
                    aquí mientras cocinas, con temporizador incluido.
                  </p>
                  <button
                    type="button"
                    className="btn btn-secondary mt-4"
                    onClick={() => onEditarReceta(receta)}
                  >
                    Anotar los pasos
                  </button>
                </div>
              ) : (
                <ol className="mt-3 divide-y divide-line">
                  {receta.pasos.map((paso, idx) => {
                    const hecho = Boolean(pasosHechos[paso.id]);
                    return (
                      <li key={paso.id} className="flex items-start gap-3 py-3">
                        <button
                          type="button"
                          aria-pressed={hecho}
                          aria-label={`Marcar paso ${idx + 1} como hecho`}
                          onClick={() =>
                            setPasosHechos((prev) => ({ ...prev, [paso.id]: !prev[paso.id] }))
                          }
                          className={`num mt-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-sm font-bold transition-colors ${
                            hecho ? 'bg-ok text-white' : 'bg-sunken text-ink hover:bg-line'
                          }`}
                        >
                          {hecho ? <Check size={16} weight="bold" /> : idx + 1}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={`leading-relaxed ${hecho ? 'text-ink-soft line-through' : ''}`}>
                            {paso.instruccion}
                          </p>
                          {paso.tip_secreto && (
                            <p className="mt-1 text-sm text-ink-soft">{paso.tip_secreto}</p>
                          )}
                          {paso.tiempo_timer_min && paso.tiempo_timer_min > 0 ? (
                            <button
                              type="button"
                              onClick={() => {
                                setTimerPaso(paso.id);
                                setTimerSeg(paso.tiempo_timer_min! * 60);
                                setTimerCorriendo(true);
                              }}
                              className="btn btn-sm btn-secondary mt-2"
                            >
                              <Timer size={16} />
                              Iniciar {paso.tiempo_timer_min} min
                            </button>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
              {receta.notas_chefcita && (
                <p className="mt-4 rounded-xl bg-sunken px-4 py-3 text-[0.9375rem]">
                  <strong>Notas:</strong> {receta.notas_chefcita}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmarBorrado && (
        <Confirmar
          titulo={`¿Eliminar ${receta.nombre}?`}
          detalle="Se borra el producto con sus ingredientes y pasos. Los pedidos ya anotados no se tocan."
          onCancelar={() => setConfirmarBorrado(false)}
          onConfirmar={async () => {
            setConfirmarBorrado(false);
            await onEliminarReceta(receta.id);
          }}
        />
      )}
    </div>
  );
}
