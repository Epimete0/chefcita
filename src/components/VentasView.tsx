'use client';

import React, { useMemo, useState } from 'react';
import { Insumo, Pedido, Receta, Venta } from '@/lib/types';
import {
  calcularMontosVenta,
  formatearFechaVenta,
  formatearMesAnio,
  formatearMoneda,
  hoyISO,
  resumirVentas,
  singular,
  sumarDiasISO,
  sumarMesISO,
} from '@/lib/costing';
import {
  Campo,
  CampoDinero,
  Confirmar,
  EncabezadoVista,
  Etiqueta,
  Segmentos,
  Sheet,
  Vacio,
} from './ui';
import {
  CalendarBlank,
  CaretLeft,
  CaretRight,
  Check,
  Copy,
  Minus,
  PencilSimple,
  Plus,
  Storefront,
  Trash,
  TrendUp,
} from '@phosphor-icons/react';

interface LineaVentaDraft {
  tempId: string;
  recetaId: string | null;
  nombreManual: string;
  presentacionManual: string;
  modoPresentacion: 'pack' | 'unidad';
  cantidad: string;
  precioUnitario: string;
  totalManual: string;
  usaTotalManual: boolean;
}

function crearDraftDesdeReceta(receta: Receta): LineaVentaDraft {
  return {
    tempId: crypto.randomUUID(),
    recetaId: receta.id,
    nombreManual: '',
    presentacionManual: 'Unidad',
    modoPresentacion: 'pack',
    cantidad: '1',
    precioUnitario: receta.precio_venta_pack > 0 ? String(Math.round(receta.precio_venta_pack)) : '',
    totalManual: '',
    usaTotalManual: false,
  };
}

function crearDraftManual(): LineaVentaDraft {
  return {
    tempId: crypto.randomUUID(),
    recetaId: null,
    nombreManual: '',
    presentacionManual: 'Unidad',
    modoPresentacion: 'pack',
    cantidad: '1',
    precioUnitario: '',
    totalManual: '',
    usaTotalManual: false,
  };
}

function draftDesdeVenta(venta: Venta, recetas: Receta[]): LineaVentaDraft {
  const receta = venta.receta_id ? recetas.find((r) => r.id === venta.receta_id) : undefined;
  const esUnidadEnPack =
    Boolean(receta && receta.unidades_por_pack > 1 && venta.unidades_por_presentacion === 1);
  return {
    tempId: venta.id,
    recetaId: receta ? receta.id : null,
    nombreManual: receta ? '' : venta.producto_nombre,
    presentacionManual: venta.presentacion_nombre || 'Unidad',
    modoPresentacion: esUnidadEnPack ? 'unidad' : 'pack',
    cantidad: String(venta.cantidad),
    precioUnitario: venta.precio_unitario > 0 ? String(Math.round(venta.precio_unitario)) : '',
    totalManual: venta.total_venta > 0 ? String(Math.round(venta.total_venta)) : '',
    usaTotalManual: true,
  };
}

function evaluarDraft(
  draft: LineaVentaDraft,
  recetasMap: Map<string, Receta>,
  insumosMap: Map<string, Insumo>
) {
  const receta = draft.recetaId ? recetasMap.get(draft.recetaId) : undefined;
  const cantidad = Number(draft.cantidad) || 0;
  const precioManual =
    !draft.usaTotalManual && draft.precioUnitario !== '' ? Number(draft.precioUnitario) : undefined;
  const totalManual =
    draft.usaTotalManual && draft.totalManual !== '' ? Number(draft.totalManual) : undefined;

  const montos = calcularMontosVenta({
    receta,
    insumosMap,
    cantidad,
    modoPresentacion: draft.modoPresentacion,
    precioUnitarioManual: precioManual,
    totalManual,
  });

  const productoNombre = receta ? receta.nombre : draft.nombreManual.trim();
  const presentacionNombre = receta
    ? montos.presentacionNombre
    : draft.presentacionManual.trim() || 'Unidad';

  const tienePrecioIngresado =
    draft.usaTotalManual
      ? draft.totalManual !== ''
      : draft.precioUnitario !== '' || montos.precioSugeridoUnitario > 0;

  return {
    ...montos,
    receta,
    cantidad,
    productoNombre,
    presentacionNombre,
    tienePrecioIngresado,
  };
}

function construirVentaDesdeDraft({
  draft,
  fecha,
  referencia,
  notas,
  recetasMap,
  insumosMap,
  existente,
}: {
  draft: LineaVentaDraft;
  fecha: string;
  referencia: string;
  notas: string;
  recetasMap: Map<string, Receta>;
  insumosMap: Map<string, Insumo>;
  existente?: Venta;
}): Omit<Venta, 'id'> & { id?: string } {
  const ev = evaluarDraft(draft, recetasMap, insumosMap);
  return {
    id: existente?.id,
    fecha,
    receta_id: ev.receta ? ev.receta.id : null,
    producto_nombre: ev.productoNombre || 'Producto',
    presentacion_nombre: ev.presentacionNombre,
    cantidad: ev.cantidad,
    unidades_por_presentacion: ev.unidadesPorPresentacion,
    unidades_totales: ev.unidadesTotales,
    precio_unitario: ev.precioUnitario,
    total_venta: ev.totalVenta,
    costo_unitario_estimado: ev.costoUnitarioEstimado,
    costo_total_estimado: ev.costoTotalEstimado,
    ganancia_neta: ev.gananciaNeta,
    costo_incompleto: ev.costoIncompleto,
    cliente_o_referencia: referencia.trim(),
    notas: notas.trim(),
    created_at: existente?.created_at,
  };
}

function formatearCantidadNumero(n: number): string {
  const r = Math.round(n * 100) / 100;
  return String(r).replace('.', ',');
}

/* -------------------------------------------------------------------------- */
/* Selector de fecha reutilizable con accesos rápidos                          */
/* -------------------------------------------------------------------------- */

function SelectorFecha({
  fecha,
  onChange,
  etiqueta = 'Fecha de la venta',
}: {
  fecha: string;
  onChange: (nueva: string) => void;
  etiqueta?: string;
}) {
  const hoy = hoyISO();
  const ayer = sumarDiasISO(hoy, -1);
  const info = formatearFechaVenta(fecha);

  return (
    <Campo
      etiqueta={etiqueta}
      ayuda={<span className="first-letter:uppercase">{info.larga}</span>}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          aria-pressed={fecha === hoy}
          onClick={() => onChange(hoy)}
          className={`btn btn-sm ${fecha === hoy ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'}`}
        >
          Hoy
        </button>
        <button
          type="button"
          aria-pressed={fecha === ayer}
          onClick={() => onChange(ayer)}
          className={`btn btn-sm ${fecha === ayer ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'}`}
        >
          Ayer
        </button>
        <input
          type="date"
          value={fecha}
          onChange={(e) => {
            if (e.target.value) onChange(e.target.value);
          }}
          className="input min-w-[160px] flex-1 font-medium"
        />
      </div>
    </Campo>
  );
}

/* -------------------------------------------------------------------------- */
/* Editor compartido de una línea de venta (cantidad, presentación, precio)    */
/* -------------------------------------------------------------------------- */

function ItemVentaEditor({
  draft,
  recetas,
  recetasMap,
  insumosMap,
  mostrarErrores,
  permitirCambiarProducto,
  onChange,
  onQuitar,
}: {
  draft: LineaVentaDraft;
  recetas: Receta[];
  recetasMap: Map<string, Receta>;
  insumosMap: Map<string, Insumo>;
  mostrarErrores: boolean;
  permitirCambiarProducto?: boolean;
  onChange: (cambios: Partial<LineaVentaDraft>) => void;
  onQuitar?: () => void;
}) {
  const ev = evaluarDraft(draft, recetasMap, insumosMap);
  const receta = ev.receta;
  const tienePack = Boolean(receta && receta.unidades_por_pack > 1);
  const errorNombre = mostrarErrores && !receta && !draft.nombreManual.trim();
  const errorCant = mostrarErrores && ev.cantidad <= 0;
  const errorPrecio = mostrarErrores && !ev.tienePrecioIngresado;

  const valorPrecioInput = draft.usaTotalManual
    ? ev.cantidad > 0 && ev.totalVenta > 0
      ? String(Math.round(ev.totalVenta / ev.cantidad))
      : ''
    : draft.precioUnitario;

  const valorTotalInput = draft.usaTotalManual
    ? draft.totalManual
    : ev.totalVenta > 0
      ? String(Math.round(ev.totalVenta))
      : '';

  const ajustarCantidad = (nueva: number) => {
    const limpia = Math.max(1, Math.round(nueva * 100) / 100);
    onChange({
      cantidad: String(limpia),
      usaTotalManual: false,
      totalManual: '',
    });
  };

  return (
    <div className="rounded-2xl border border-line bg-paper/75 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {permitirCambiarProducto ? (
            <select
              value={draft.recetaId || '__manual__'}
              aria-label="Producto vendido"
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__manual__') {
                  onChange({
                    recetaId: null,
                    modoPresentacion: 'pack',
                    precioUnitario: '',
                    totalManual: '',
                    usaTotalManual: false,
                  });
                } else {
                  const nuevaReceta = recetasMap.get(val);
                  onChange({
                    recetaId: val,
                    modoPresentacion: 'pack',
                    precioUnitario:
                      nuevaReceta && nuevaReceta.precio_venta_pack > 0
                        ? String(Math.round(nuevaReceta.precio_venta_pack))
                        : '',
                    totalManual: '',
                    usaTotalManual: false,
                  });
                }
              }}
              className="input font-semibold"
            >
              {recetas.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                  {r.unidades_por_pack > 1 ? ` · ${r.nombre_pack}` : ''}
                </option>
              ))}
              <option value="__manual__">Otro producto (escribir nombre)</option>
            </select>
          ) : (
            <div className="text-[1.0625rem] font-bold leading-snug">
              {receta ? receta.nombre : 'Otro producto'}
            </div>
          )}

          {!receta && (
            <div className="mt-2.5 grid gap-2 sm:grid-cols-3">
              <input
                type="text"
                placeholder="Nombre (ej: Caja surtida)"
                value={draft.nombreManual}
                onChange={(e) => onChange({ nombreManual: e.target.value })}
                className={`input sm:col-span-2 ${errorNombre ? 'input-error' : ''}`}
              />
              <input
                type="text"
                placeholder="Unidad / Caja"
                value={draft.presentacionManual}
                onChange={(e) => onChange({ presentacionManual: e.target.value })}
                className="input"
              />
            </div>
          )}
          {errorNombre && (
            <p className="mt-1 text-xs font-medium text-bad">Escribe qué producto vendiste.</p>
          )}
        </div>

        {onQuitar && (
          <button
            type="button"
            onClick={onQuitar}
            aria-label={`Quitar ${ev.productoNombre || 'producto'}`}
            className="-mr-1 -mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-bad-soft hover:text-bad"
          >
            <Trash size={18} />
          </button>
        )}
      </div>

      {/* Presentación (si tiene caja/pack) */}
      {tienePack && receta && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
            Se vendió por:
          </span>
          <button
            type="button"
            aria-pressed={draft.modoPresentacion === 'pack'}
            onClick={() =>
              onChange({
                modoPresentacion: 'pack',
                precioUnitario:
                  receta.precio_venta_pack > 0 ? String(Math.round(receta.precio_venta_pack)) : '',
                totalManual: '',
                usaTotalManual: false,
              })
            }
            className={`btn btn-sm ${
              draft.modoPresentacion === 'pack' ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
            }`}
          >
            {receta.nombre_pack} ({receta.unidades_por_pack} {receta.rendimiento_unidad})
          </button>
          <button
            type="button"
            aria-pressed={draft.modoPresentacion === 'unidad'}
            onClick={() => {
              const unitPrecio =
                receta.precio_venta_unidad > 0
                  ? Math.round(receta.precio_venta_unidad)
                  : receta.precio_venta_pack > 0
                    ? Math.round(receta.precio_venta_pack / Math.max(1, receta.unidades_por_pack))
                    : 0;
              onChange({
                modoPresentacion: 'unidad',
                precioUnitario: unitPrecio > 0 ? String(unitPrecio) : '',
                totalManual: '',
                usaTotalManual: false,
              });
            }}
            className={`btn btn-sm ${
              draft.modoPresentacion === 'unidad' ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
            }`}
          >
            Por {singular(receta.rendimiento_unidad)} suelta
          </button>
        </div>
      )}

      {/* Cantidad con stepper + atajos */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Restar uno"
            onClick={() => ajustarCantidad(Math.max(1, ev.cantidad - 1))}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-sunken active:scale-95"
          >
            <Minus size={18} weight="bold" />
          </button>
          <input
            type="number"
            inputMode="decimal"
            min={0.1}
            step="any"
            aria-label="Cantidad vendida"
            value={draft.cantidad}
            onChange={(e) =>
              onChange({
                cantidad: e.target.value,
                usaTotalManual: false,
                totalManual: '',
              })
            }
            className={`input num w-20 text-center font-bold ${errorCant ? 'input-error' : ''}`}
          />
          <button
            type="button"
            aria-label="Sumar uno"
            onClick={() => ajustarCantidad(ev.cantidad + 1)}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-sunken active:scale-95"
          >
            <Plus size={18} weight="bold" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-pressed={ev.cantidad === n}
              onClick={() => ajustarCantidad(n)}
              className={`btn btn-sm num ${
                ev.cantidad === n ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <span className="text-sm font-medium text-ink-soft">
          {ev.presentacionNombre}
          {ev.unidadesPorPresentacion > 1 && ev.cantidad > 0 && receta
            ? ` (= ${formatearCantidadNumero(ev.unidadesTotales)} ${receta.rendimiento_unidad})`
            : ''}
        </span>
      </div>
      {errorCant && <p className="mt-1 text-xs font-medium text-bad">Indica la cantidad vendida.</p>}

      {/* Precio unitario y Total cobrado */}
      <div className="mt-3 grid grid-cols-2 items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">
            Precio por {ev.presentacionNombre}
          </span>
          <CampoDinero
            value={valorPrecioInput}
            placeholder={ev.precioSugeridoUnitario > 0 ? String(ev.precioSugeridoUnitario) : '0'}
            onChange={(val) =>
              onChange({
                precioUnitario: val,
                usaTotalManual: false,
                totalManual: '',
              })
            }
            className={errorPrecio ? 'input-error' : ''}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-ink-soft">Total cobrado</span>
          <CampoDinero
            value={valorTotalInput}
            placeholder="0"
            onChange={(val) =>
              onChange({
                totalManual: val,
                usaTotalManual: true,
              })
            }
            className={errorPrecio ? 'input-error' : ''}
          />
        </label>
      </div>
      {errorPrecio ? (
        <p className="mt-1 text-xs font-medium text-bad">
          Este producto aún no tiene precio guardado: anota a cuánto lo vendiste.
        </p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-ink-soft">
          {ev.costoIncompleto ? (
            <span>Costo incompleto (solo registramos el ingreso de la venta).</span>
          ) : (
            <span className="num">
              Costo est. {formatearMoneda(ev.costoTotalEstimado)} ·{' '}
              <strong className={ev.gananciaNeta >= 0 ? 'text-ok' : 'text-bad'}>
                {ev.gananciaNeta >= 0 ? 'Ganas' : 'Pierdes'}{' '}
                {formatearMoneda(Math.abs(ev.gananciaNeta))}
              </strong>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Hoja para anotar varias ventas del día de una sola vez                     */
/* -------------------------------------------------------------------------- */

export function RegistrarVentasSheet({
  fechaInicial,
  recetaInicialId,
  recetas,
  insumosMap,
  onClose,
  onGuardarLote,
}: {
  fechaInicial?: string;
  recetaInicialId?: string;
  recetas: Receta[];
  insumosMap: Map<string, Insumo>;
  onClose: () => void;
  onGuardarLote: (ventas: Array<Omit<Venta, 'id'>>) => Promise<void>;
}) {
  const recetasMap = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const recetasOrdenadas = useMemo(
    () =>
      [...recetas].sort(
        (a, b) => Number(b.favorita) - Number(a.favorita) || a.nombre.localeCompare(b.nombre)
      ),
    [recetas]
  );

  const [fecha, setFecha] = useState(fechaInicial || hoyISO());
  const [lineas, setLineas] = useState<LineaVentaDraft[]>(() => {
    if (recetaInicialId) {
      const r = recetas.find((x) => x.id === recetaInicialId);
      if (r) return [crearDraftDesdeReceta(r)];
    }
    return recetas.length === 0 ? [crearDraftManual()] : [];
  });
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const recetasFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q
      ? recetasOrdenadas.filter((r) => r.nombre.toLowerCase().includes(q))
      : recetasOrdenadas;
  }, [recetasOrdenadas, busqueda]);

  const tocarProducto = (receta: Receta) => {
    // Si ya está en la lista en su presentación por defecto, suma +1 directo
    const idx = lineas.findIndex(
      (l) => l.recetaId === receta.id && l.modoPresentacion === 'pack'
    );
    if (idx >= 0) {
      setLineas((prev) =>
        prev.map((l, i) =>
          i === idx
            ? {
                ...l,
                cantidad: String((Number(l.cantidad) || 0) + 1),
                usaTotalManual: false,
                totalManual: '',
              }
            : l
        )
      );
      return;
    }
    setLineas((prev) => [...prev, crearDraftDesdeReceta(receta)]);
  };

  const evaluadas = useMemo(
    () => lineas.map((l) => evaluarDraft(l, recetasMap, insumosMap)),
    [lineas, recetasMap, insumosMap]
  );

  const totalGeneral = evaluadas.reduce((s, e) => s + e.totalVenta, 0);
  const hayErrores =
    lineas.length === 0 ||
    evaluadas.some((e) => !e.productoNombre || e.cantidad <= 0 || !e.tienePrecioIngresado);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (hayErrores) return;
    setGuardando(true);
    try {
      const ventasParaGuardar = lineas.map((draft) =>
        construirVentaDesdeDraft({
          draft,
          fecha,
          referencia,
          notas,
          recetasMap,
          insumosMap,
        })
      );
      await onGuardarLote(ventasParaGuardar);
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Sheet
      titulo="Anotar ventas del día"
      subtitulo="Elige la fecha y toca todo lo que vendiste ese día."
      ancho="lg"
      alta
      onClose={onClose}
      pie={
        <div>
          {lineas.length > 0 && (
            <div className="num mb-3 flex items-baseline justify-between text-sm">
              <span className="text-ink-soft">
                {lineas.length} {lineas.length === 1 ? 'producto' : 'productos'} ·{' '}
                {formatearFechaVenta(fecha).texto}
              </span>
              <span className="font-display text-lg font-bold text-ink">
                Total {formatearMoneda(totalGeneral)}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              form="form-ventas-lote"
              disabled={guardando}
              className="btn btn-primary flex-1"
            >
              {guardando
                ? 'Guardando…'
                : lineas.length > 1
                  ? `Guardar ${lineas.length} ventas`
                  : 'Guardar venta'}
            </button>
          </div>
        </div>
      }
    >
      <form id="form-ventas-lote" onSubmit={guardar} className="space-y-5" noValidate>
        <SelectorFecha fecha={fecha} onChange={setFecha} />

        {/* Selector rápido de productos */}
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="label mb-0">Toca para agregar lo que vendiste</span>
            <button
              type="button"
              onClick={() => setLineas((prev) => [...prev, crearDraftManual()])}
              className="cursor-pointer text-sm font-semibold text-berry hover:underline"
            >
              + Otro producto libre
            </button>
          </div>
          {recetas.length > 6 && (
            <input
              type="search"
              placeholder="Filtrar producto…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="input mt-2"
            />
          )}
          <div className="mt-2.5 flex flex-wrap gap-2">
            {recetasFiltradas.map((r) => {
              const enLista = lineas
                .filter((l) => l.recetaId === r.id)
                .reduce((s, l) => s + (Number(l.cantidad) || 0), 0);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => tocarProducto(r)}
                  className={`inline-flex min-h-[42px] cursor-pointer items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-sm font-semibold transition-all active:scale-[0.97] ${
                    enLista > 0
                      ? 'border-berry/40 bg-berry-soft text-berry-dark'
                      : 'border-line-strong bg-surface text-ink hover:bg-sunken'
                  }`}
                >
                  <Plus size={15} weight="bold" className="shrink-0" />
                  <span>{r.nombre}</span>
                  {r.precio_venta_pack > 0 && (
                    <span className="num text-xs font-medium text-ink-soft">
                      {formatearMoneda(r.precio_venta_pack)}
                    </span>
                  )}
                  {enLista > 0 && (
                    <span className="num rounded-full bg-brand px-1.5 text-xs text-white">
                      {formatearCantidadNumero(enLista)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Lista de productos agregados */}
        <section className="space-y-3">
          {lineas.length === 0 ? (
            <div
              className={`rounded-2xl border border-dashed px-4 py-6 text-center text-sm ${
                intento ? 'border-bad bg-bad-soft/40 text-bad' : 'border-line-strong text-ink-soft'
              }`}
            >
              {intento
                ? 'Toca al menos un producto arriba para anotar tu venta.'
                : 'Toca un producto arriba (cada toque suma +1 caja o unidad) o elige “Otro producto libre”.'}
            </div>
          ) : (
            lineas.map((draft) => (
              <ItemVentaEditor
                key={draft.tempId}
                draft={draft}
                recetas={recetasOrdenadas}
                recetasMap={recetasMap}
                insumosMap={insumosMap}
                mostrarErrores={intento}
                onChange={(cambios) =>
                  setLineas((prev) =>
                    prev.map((l) => (l.tempId === draft.tempId ? { ...l, ...cambios } : l))
                  )
                }
                onQuitar={() => setLineas((prev) => prev.filter((l) => l.tempId !== draft.tempId))}
              />
            ))
          )}
        </section>

        {lineas.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo etiqueta="Cliente o lugar (opcional)">
              <input
                type="text"
                placeholder="Ej: Venta directa, Feria, Camila"
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                className="input"
              />
            </Campo>
            <Campo etiqueta="Notas (opcional)">
              <input
                type="text"
                placeholder="Ej: Pago transferencia, promo nov"
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                className="input"
              />
            </Campo>
          </div>
        )}
      </form>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Hoja para editar una venta existente (incluye editar fecha)                 */
/* -------------------------------------------------------------------------- */

export function EditarVentaSheet({
  venta,
  recetas,
  insumosMap,
  onClose,
  onGuardar,
  onEliminar,
}: {
  venta: Venta;
  recetas: Receta[];
  insumosMap: Map<string, Insumo>;
  onClose: () => void;
  onGuardar: (venta: Venta) => Promise<void>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const recetasMap = useMemo(() => new Map(recetas.map((r) => [r.id, r])), [recetas]);
  const [fecha, setFecha] = useState(venta.fecha);
  const [draft, setDraft] = useState<LineaVentaDraft>(() => draftDesdeVenta(venta, recetas));
  const [referencia, setReferencia] = useState(venta.cliente_o_referencia || '');
  const [notas, setNotas] = useState(venta.notas || '');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const ev = evaluarDraft(draft, recetasMap, insumosMap);
  const hayErrores = !ev.productoNombre || ev.cantidad <= 0 || !ev.tienePrecioIngresado;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (hayErrores) return;
    setGuardando(true);
    try {
      const payload = construirVentaDesdeDraft({
        draft,
        fecha,
        referencia,
        notas,
        recetasMap,
        insumosMap,
        existente: venta,
      });
      await onGuardar({ ...payload, id: venta.id });
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  if (confirmarBorrado) {
    return (
      <Confirmar
        titulo={`¿Eliminar esta venta de ${venta.producto_nombre}?`}
        detalle={`Del ${formatearFechaVenta(venta.fecha).larga} por ${formatearMoneda(venta.total_venta)}.`}
        onCancelar={() => setConfirmarBorrado(false)}
        onConfirmar={async () => {
          await onEliminar(venta.id);
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet
      titulo="Editar venta"
      subtitulo="Puedes corregir la fecha, la cantidad o el monto cobrado."
      onClose={onClose}
      pie={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setConfirmarBorrado(true)}
            aria-label="Eliminar venta"
            className="btn btn-secondary px-3 text-bad"
          >
            <Trash size={20} />
          </button>
          <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="submit"
            form="form-editar-venta"
            disabled={guardando}
            className="btn btn-primary flex-1"
          >
            {guardando ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      }
    >
      <form id="form-editar-venta" onSubmit={guardar} className="space-y-5" noValidate>
        <SelectorFecha fecha={fecha} onChange={setFecha} />

        <ItemVentaEditor
          draft={draft}
          recetas={recetas}
          recetasMap={recetasMap}
          insumosMap={insumosMap}
          mostrarErrores={intento}
          permitirCambiarProducto
          onChange={(cambios) => setDraft((prev) => ({ ...prev, ...cambios }))}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Cliente o lugar (opcional)">
            <input
              type="text"
              placeholder="Ej: Venta directa, Feria"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="input"
            />
          </Campo>
          <Campo etiqueta="Notas (opcional)">
            <input
              type="text"
              placeholder="Ej: Efectivo, promo"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input"
            />
          </Campo>
        </div>
      </form>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Tarjeta de una venta registrada                                             */
/* -------------------------------------------------------------------------- */

export function TarjetaVenta({
  venta,
  onEditar,
}: {
  venta: Venta;
  onEditar: (venta: Venta) => void;
}) {
  const cantTxt = formatearCantidadNumero(venta.cantidad);
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="num rounded-md bg-berry-soft px-2 py-0.5 text-sm font-bold text-berry-dark">
            {cantTxt} × {venta.presentacion_nombre}
          </span>
          <span className="truncate font-semibold text-ink">{venta.producto_nombre}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm text-ink-soft">
          {venta.unidades_por_presentacion > 1 && (
            <span className="num">{formatearCantidadNumero(venta.unidades_totales)} unidades</span>
          )}
          {venta.precio_unitario > 0 && (
            <span className="num">{formatearMoneda(venta.precio_unitario)} c/u</span>
          )}
          {venta.cliente_o_referencia && <span>· {venta.cliente_o_referencia}</span>}
          {venta.notas && <span>· “{venta.notas}”</span>}
        </div>
      </div>

      <div className="shrink-0 text-right">
        <div className="num text-[1.0625rem] font-bold text-ink">
          {formatearMoneda(venta.total_venta)}
        </div>
        {!venta.costo_incompleto ? (
          <div className={`num text-xs font-semibold ${venta.ganancia_neta >= 0 ? 'text-ok' : 'text-bad'}`}>
            {venta.ganancia_neta >= 0 ? 'Ganancia ' : 'Pérdida '}
            {formatearMoneda(Math.abs(venta.ganancia_neta))}
          </div>
        ) : (
          <div className="text-xs text-ink-soft">Costo por confirmar</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => onEditar(venta)}
        aria-label={`Editar venta de ${venta.producto_nombre}`}
        className="-mr-2 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
      >
        <PencilSimple size={18} />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pantalla principal de Ventas diarias                                        */
/* -------------------------------------------------------------------------- */

export default function VentasView({
  ventas,
  pedidos,
  onNuevaVenta,
  onEditarVenta,
}: {
  ventas: Venta[];
  pedidos: Pedido[];
  onNuevaVenta: (fecha?: string) => void;
  onEditarVenta: (venta: Venta) => void;
}) {
  const hoy = hoyISO();
  const ayer = sumarDiasISO(hoy, -1);
  const mesActual = hoy.slice(0, 7);

  const [pestana, setPestana] = useState<'dia' | 'historial'>('dia');
  const [fechaVista, setFechaVista] = useState(hoy);
  const [mesVista, setMesVista] = useState(mesActual);
  const [verTodosMeses, setVerTodosMeses] = useState(false);
  const [copiadoDia, setCopiadoDia] = useState(false);

  const ventasHoy = useMemo(() => ventas.filter((v) => v.fecha === hoy), [ventas, hoy]);
  const resumenHoy = useMemo(() => resumirVentas(ventasHoy), [ventasHoy]);

  const ventasMesActual = useMemo(
    () => ventas.filter((v) => v.fecha.startsWith(mesActual)),
    [ventas, mesActual]
  );
  const resumenMesActual = useMemo(() => resumirVentas(ventasMesActual), [ventasMesActual]);

  const diasActivosRecientes = useMemo(() => {
    const unicos = Array.from(new Set(ventas.map((v) => v.fecha)))
      .filter((f) => f !== hoy && f !== ayer)
      .sort((a, b) => b.localeCompare(a));
    return unicos.slice(0, 4);
  }, [ventas, hoy, ayer]);

  const ventasDelDia = useMemo(
    () => ventas.filter((v) => v.fecha === fechaVista),
    [ventas, fechaVista]
  );
  const resumenDia = useMemo(() => resumirVentas(ventasDelDia), [ventasDelDia]);
  const infoDia = formatearFechaVenta(fechaVista);

  const pedidosEntregadosDia = useMemo(
    () => pedidos.filter((p) => p.estado === 'entregado' && p.fecha_entrega === fechaVista),
    [pedidos, fechaVista]
  );

  // Historial por mes / general
  const ventasPeriodo = useMemo(
    () => (verTodosMeses ? ventas : ventas.filter((v) => v.fecha.startsWith(mesVista))),
    [ventas, verTodosMeses, mesVista]
  );
  const resumenPeriodo = useMemo(() => resumirVentas(ventasPeriodo), [ventasPeriodo]);

  const pedidosEntregadosPeriodo = useMemo(
    () =>
      pedidos.filter(
        (p) =>
          p.estado === 'entregado' && (verTodosMeses || p.fecha_entrega.startsWith(mesVista))
      ),
    [pedidos, verTodosMeses, mesVista]
  );
  const totalPedidosPeriodo = pedidosEntregadosPeriodo.reduce(
    (s, p) => s + (Number(p.precio_venta_total) || 0),
    0
  );

  const diasAgrupados = useMemo(() => {
    const mapa = new Map<string, Venta[]>();
    for (const v of ventasPeriodo) {
      const lista = mapa.get(v.fecha) || [];
      lista.push(v);
      mapa.set(v.fecha, lista);
    }
    return Array.from(mapa.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([fecha, lista]) => ({
        fecha,
        info: formatearFechaVenta(fecha),
        resumen: resumirVentas(lista),
      }));
  }, [ventasPeriodo]);

  const copiarResumenDia = async () => {
    const lineas = [
      `Ventas · ${infoDia.larga}`,
      ...resumenDia.productos.map(
        (p) =>
          `- ${formatearCantidadNumero(p.cantidad)} × ${p.presentacionNombre} (${p.productoNombre}): ${formatearMoneda(p.totalVenta)}`
      ),
      `Total vendido: ${formatearMoneda(resumenDia.totalVendido)}`,
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lineas);
      setCopiadoDia(true);
      setTimeout(() => setCopiadoDia(false), 2500);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  return (
    <div className="anim-rise space-y-6">
      <EncabezadoVista
        titulo="Ventas diarias"
        ayuda="Anota todo lo que vendes cada día, cambia la fecha cuando quieras y revisa cuánto entra."
      >
        <button type="button" className="btn btn-primary" onClick={() => onNuevaVenta(fechaVista)}>
          <Plus size={18} weight="bold" />
          Anotar venta
        </button>
      </EncabezadoVista>

      {/* Tarjetas de resumen rápidas */}
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        <button
          type="button"
          onClick={() => {
            setFechaVista(hoy);
            setPestana('dia');
          }}
          className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
        >
          <div className="min-w-0">
            <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-berry-soft text-berry">
                <Storefront size={16} weight="duotone" />
              </span>
              Vendido hoy
            </dt>
            <dd className="num font-display mt-2 text-2xl font-semibold sm:text-[1.875rem]">
              {formatearMoneda(resumenHoy.totalVendido)}
            </dd>
            <div className="mt-1 truncate text-xs text-ink-soft">
              {resumenHoy.productos.length === 0
                ? 'Aún sin ventas anotadas hoy'
                : resumenHoy.productos
                    .slice(0, 2)
                    .map((p) => `${formatearCantidadNumero(p.cantidad)} × ${p.productoNombre}`)
                    .join(' · ')}
            </div>
          </div>
          <CaretRight
            size={18}
            weight="bold"
            className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </button>

        <button
          type="button"
          onClick={() => {
            setMesVista(mesActual);
            setVerTodosMeses(false);
            setPestana('historial');
          }}
          className="card card-interactive group flex w-full cursor-pointer items-center justify-between gap-3 p-4 text-left sm:p-5"
        >
          <div className="min-w-0">
            <dt className="flex items-center gap-2 text-sm font-medium text-ink-soft">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-ok-soft text-ok">
                <TrendUp size={16} weight="duotone" />
              </span>
              <span className="first-letter:uppercase">{formatearMesAnio(mesActual)}</span>
            </dt>
            <dd className="num font-display mt-2 text-2xl font-semibold text-ok sm:text-[1.875rem]">
              {formatearMoneda(resumenMesActual.totalVendido)}
            </dd>
            <div className="mt-1 text-xs text-ink-soft">
              {resumenMesActual.cantidadRegistros === 0
                ? 'Sin ventas en este mes'
                : `${resumenMesActual.cantidadRegistros} ${resumenMesActual.cantidadRegistros === 1 ? 'venta anotada' : 'ventas anotadas'}`}
            </div>
          </div>
          <CaretRight
            size={18}
            weight="bold"
            className="shrink-0 text-ink-soft transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </button>
      </dl>

      {ventas.length === 0 ? (
        <Vacio
          icono={<Storefront size={28} weight="duotone" />}
          titulo="Lleva el control de tus ventas diarias"
          texto="Anota fácilmente qué vendiste hoy o cualquier día anterior (por ejemplo: 3 cajas de donas, 2 mini pies, etc.) y edita la fecha o cantidades cuando necesites."
        >
          <button type="button" className="btn btn-primary" onClick={() => onNuevaVenta(hoy)}>
            <Plus size={18} weight="bold" />
            Anotar primera venta
          </button>
        </Vacio>
      ) : (
        <>
          <Segmentos
            className="sm:w-96"
            opciones={[
              { id: 'dia', etiqueta: 'Por día' },
              { id: 'historial', etiqueta: 'Historial del mes' },
            ]}
            valor={pestana}
            onChange={setPestana}
          />

          {/* ============================= POR DÍA ============================= */}
          {pestana === 'dia' && (
            <div className="space-y-5">
              {/* Barra de fecha editable y atajos */}
              <div className="card space-y-3 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    aria-label="Día anterior"
                    onClick={() => setFechaVista((f) => sumarDiasISO(f, -1))}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-sunken"
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <div className="relative min-w-[165px] flex-1 sm:max-w-[220px]">
                    <input
                      type="date"
                      aria-label="Seleccionar fecha"
                      value={fechaVista}
                      onChange={(e) => {
                        if (e.target.value) setFechaVista(e.target.value);
                      }}
                      className="input font-semibold"
                    />
                  </div>
                  <button
                    type="button"
                    aria-label="Día siguiente"
                    onClick={() => setFechaVista((f) => sumarDiasISO(f, 1))}
                    className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-sunken"
                  >
                    <CaretRight size={18} weight="bold" />
                  </button>

                  <div className="flex flex-wrap gap-1.5 sm:ml-auto">
                    <button
                      type="button"
                      aria-pressed={fechaVista === hoy}
                      onClick={() => setFechaVista(hoy)}
                      className={`btn btn-sm ${
                        fechaVista === hoy ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                      }`}
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      aria-pressed={fechaVista === ayer}
                      onClick={() => setFechaVista(ayer)}
                      className={`btn btn-sm ${
                        fechaVista === ayer ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                      }`}
                    >
                      Ayer
                    </button>
                    {diasActivosRecientes.map((f) => (
                      <button
                        key={f}
                        type="button"
                        aria-pressed={fechaVista === f}
                        onClick={() => setFechaVista(f)}
                        className={`btn btn-sm ${
                          fechaVista === f ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                        }`}
                      >
                        {formatearFechaVenta(f).corta}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Encabezado y detalle del día seleccionado */}
              <section className="card overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line p-4 sm:p-5">
                  <div>
                    <div className="flex items-center gap-2">
                      {(infoDia.esHoy || infoDia.esAyer) && (
                        <Etiqueta tono={infoDia.esHoy ? 'berry' : 'neutro'}>{infoDia.texto}</Etiqueta>
                      )}
                      <h2 className="font-display text-xl font-semibold first-letter:uppercase">
                        {infoDia.larga}
                      </h2>
                    </div>
                    <p className="mt-1 text-sm text-ink-soft">
                      {resumenDia.cantidadRegistros === 0
                        ? 'Sin ventas registradas en esta fecha.'
                        : `${resumenDia.cantidadRegistros} ${resumenDia.cantidadRegistros === 1 ? 'registro' : 'registros'} · Total vendido ${formatearMoneda(resumenDia.totalVendido)}`}
                      {resumenDia.cantidadRegistros > 0 &&
                        !resumenDia.tieneCostoIncompleto &&
                        ` · Ganancia ${formatearMoneda(resumenDia.gananciaConocida)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resumenDia.cantidadRegistros > 0 && (
                      <button
                        type="button"
                        onClick={copiarResumenDia}
                        className="btn btn-secondary btn-sm"
                      >
                        {copiadoDia ? <Check size={16} weight="bold" /> : <Copy size={16} />}
                        {copiadoDia ? 'Copiado' : 'Copiar día'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onNuevaVenta(fechaVista)}
                      className="btn btn-primary btn-sm"
                    >
                      <Plus size={16} weight="bold" />
                      Agregar a este día
                    </button>
                  </div>
                </div>

                {resumenDia.cantidadRegistros === 0 ? (
                  <div className="px-5 py-10 text-center">
                    <CalendarBlank size={28} weight="duotone" className="mx-auto text-ink-soft" />
                    <p className="mt-2 text-[0.9375rem] text-ink-soft">
                      No hay ventas anotadas para esta fecha.
                    </p>
                    <button
                      type="button"
                      onClick={() => onNuevaVenta(fechaVista)}
                      className="btn btn-secondary mt-4"
                    >
                      <Plus size={18} weight="bold" />
                      Anotar ventas del {infoDia.esHoy ? 'día' : infoDia.corta}
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Resumen agrupado por producto */}
                    <div className="border-b border-line bg-paper/55 px-4 py-3.5 sm:px-5">
                      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                        Resumen del día
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {resumenDia.productos.map((p) => (
                          <div
                            key={p.clave}
                            className="inline-flex items-baseline gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm"
                          >
                            <span className="num font-bold text-berry-dark">
                              {formatearCantidadNumero(p.cantidad)} × {p.presentacionNombre}
                            </span>
                            <span className="font-medium text-ink">{p.productoNombre}</span>
                            <span className="num text-ink-soft">
                              {formatearMoneda(p.totalVenta)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Registros individuales (editables) */}
                    <div className="divide-y divide-line">
                      {ventasDelDia.map((v) => (
                        <TarjetaVenta key={v.id} venta={v} onEditar={onEditarVenta} />
                      ))}
                    </div>
                  </>
                )}
              </section>

              {pedidosEntregadosDia.length > 0 && (
                <section className="card p-4 sm:p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-base font-bold">Pedidos entregados este día</h3>
                    <span className="num text-sm font-bold text-ok">
                      {formatearMoneda(
                        pedidosEntregadosDia.reduce((s, p) => s + p.precio_venta_total, 0)
                      )}
                    </span>
                  </div>
                  <ul className="mt-2 divide-y divide-line">
                    {pedidosEntregadosDia.map((p) => (
                      <li key={p.id} className="flex items-baseline justify-between gap-3 py-2 text-sm">
                        <span className="min-w-0 truncate">
                          <strong>{p.cliente_nombre}</strong> ·{' '}
                          <span className="num">{p.unidades_totales}</span> ×{' '}
                          {p.receta_nombre_snapshot}
                        </span>
                        <span className="num shrink-0 font-semibold">
                          {formatearMoneda(p.precio_venta_total)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {/* ========================= HISTORIAL DEL MES ======================== */}
          {pestana === 'historial' && (
            <div className="space-y-6">
              <div className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={verTodosMeses}
                    aria-label="Mes anterior"
                    onClick={() => setMesVista((m) => sumarMesISO(m, -1))}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-sunken disabled:opacity-40"
                  >
                    <CaretLeft size={18} weight="bold" />
                  </button>
                  <span className="font-display min-w-[155px] text-center text-lg font-semibold first-letter:uppercase">
                    {verTodosMeses ? 'Todo el historial' : formatearMesAnio(mesVista)}
                  </span>
                  <button
                    type="button"
                    disabled={verTodosMeses}
                    aria-label="Mes siguiente"
                    onClick={() => setMesVista((m) => sumarMesISO(m, 1))}
                    className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl border border-line-strong bg-surface text-ink hover:bg-sunken disabled:opacity-40"
                  >
                    <CaretRight size={18} weight="bold" />
                  </button>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    aria-pressed={!verTodosMeses && mesVista === mesActual}
                    onClick={() => {
                      setVerTodosMeses(false);
                      setMesVista(mesActual);
                    }}
                    className={`btn btn-sm ${
                      !verTodosMeses && mesVista === mesActual
                        ? 'bg-berry-soft text-berry-dark'
                        : 'btn-secondary'
                    }`}
                  >
                    Este mes
                  </button>
                  <button
                    type="button"
                    aria-pressed={verTodosMeses}
                    onClick={() => setVerTodosMeses((v) => !v)}
                    className={`btn btn-sm ${
                      verTodosMeses ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                    }`}
                  >
                    Todos
                  </button>
                </div>
              </div>

              {diasAgrupados.length === 0 ? (
                <p className="card px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
                  No hay ventas diarias registradas en {formatearMesAnio(mesVista)}.
                </p>
              ) : (
                <>
                  {/* Totales del período */}
                  <div className="card p-5">
                    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div>
                        <dt className="text-sm text-ink-soft">Ventas diarias</dt>
                        <dd className="num font-display mt-1 text-2xl font-semibold">
                          {formatearMoneda(resumenPeriodo.totalVendido)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-ink-soft">Días con ventas</dt>
                        <dd className="num font-display mt-1 text-2xl font-semibold">
                          {diasAgrupados.length}
                        </dd>
                      </div>
                      <div className="col-span-2 border-t border-line pt-3 sm:col-span-1 sm:border-t-0 sm:pt-0">
                        <dt className="text-sm text-ink-soft">
                          {totalPedidosPeriodo > 0
                            ? 'Total c/ pedidos entregados'
                            : 'Promedio por día'}
                        </dt>
                        <dd className="num font-display mt-1 text-2xl font-semibold text-ok">
                          {totalPedidosPeriodo > 0
                            ? formatearMoneda(resumenPeriodo.totalVendido + totalPedidosPeriodo)
                            : formatearMoneda(
                                Math.round(resumenPeriodo.totalVendido / diasAgrupados.length)
                              )}
                        </dd>
                      </div>
                    </dl>

                    {resumenPeriodo.productos.length > 0 && (
                      <div className="mt-4 border-t border-line pt-4">
                        <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                          Lo más vendido en este período
                        </div>
                        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                          {resumenPeriodo.productos.slice(0, 6).map((p) => (
                            <li
                              key={p.clave}
                              className="flex items-baseline justify-between gap-2 rounded-xl bg-paper px-3 py-2 text-sm"
                            >
                              <span className="min-w-0 truncate">
                                <strong className="num text-berry-dark">
                                  {formatearCantidadNumero(p.cantidad)} × {p.presentacionNombre}
                                </strong>{' '}
                                {p.productoNombre}
                              </span>
                              <span className="num shrink-0 font-semibold">
                                {formatearMoneda(p.totalVenta)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Lista día por día */}
                  <div className="space-y-3">
                    {diasAgrupados.map((dia) => (
                      <article key={dia.fecha} className="card card-interactive p-4 sm:p-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {(dia.info.esHoy || dia.info.esAyer) && (
                              <Etiqueta tono={dia.info.esHoy ? 'berry' : 'neutro'}>
                                {dia.info.texto}
                              </Etiqueta>
                            )}
                            <h3 className="font-display text-lg font-semibold first-letter:uppercase">
                              {dia.info.larga}
                            </h3>
                          </div>
                          <div className="num font-display text-xl font-semibold text-ink">
                            {formatearMoneda(dia.resumen.totalVendido)}
                          </div>
                        </div>

                        <div className="mt-2.5 flex flex-wrap gap-1.5">
                          {dia.resumen.productos.map((p) => (
                            <span
                              key={p.clave}
                              className="num rounded-lg bg-sunken px-2.5 py-1 text-xs font-medium text-ink"
                            >
                              {formatearCantidadNumero(p.cantidad)} × {p.presentacionNombre} ·{' '}
                              {p.productoNombre}
                            </span>
                          ))}
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                          <button
                            type="button"
                            onClick={() => {
                              setFechaVista(dia.fecha);
                              setPestana('dia');
                            }}
                            className="btn btn-secondary btn-sm"
                          >
                            Ver y editar día
                          </button>
                          <button
                            type="button"
                            onClick={() => onNuevaVenta(dia.fecha)}
                            className="btn btn-ghost btn-sm"
                          >
                            <Plus size={15} weight="bold" />
                            Agregar más
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
