'use client';

import React, { useMemo, useState } from 'react';
import {
  Insumo,
  Receta,
  RecetaItem,
  RecetaPaso,
  SeccionRecetaItem,
  TipoInsumo,
  UnidadMedida,
} from '@/lib/types';
import {
  calcularCostoItemReceta,
  formatearMoneda,
  precioParaMargen,
  redondearPrecioComercial,
  unidadesCompatibles,
  singular,
  NOMBRE_UNIDAD,
} from '@/lib/costing';
import { Sheet, Campo, CampoDinero } from './ui';
import { Plus, Trash, ArrowLeft, ArrowRight, Check } from '@phosphor-icons/react';

interface RecipeFormModalProps {
  recetaInicial?: Receta | null;
  insumos: Insumo[];
  onClose: () => void;
  onCrearInsumoRapido: (insumo: Omit<Insumo, 'id'>) => Promise<Insumo>;
  onSave: (
    receta: Omit<Receta, 'id' | 'items' | 'pasos'> & { id?: string },
    items: Array<Omit<RecetaItem, 'id' | 'receta_id'>>,
    pasos: Array<Omit<RecetaPaso, 'id' | 'receta_id'>>
  ) => Promise<void>;
}

interface ItemForm {
  tempId: string;
  insumo_id: string;
  seccion: SeccionRecetaItem;
  cantidad: string;
  unidad: UnidadMedida;
  nota: string;
}

interface PasoForm {
  tempId: string;
  etapa: string;
  instruccion: string;
  minutos: string;
  tip_secreto: string;
}

const PASOS_ASISTENTE = ['Lo básico', 'Ingredientes', 'Envase', 'Precio', 'Preparación'];
const UNIDADES: UnidadMedida[] = ['g', 'kg', 'ml', 'l', 'u', 'cm'];

function costoDeItem(it: ItemForm, insumo: Insumo | undefined): number {
  return calcularCostoItemReceta(
    {
      id: it.tempId,
      receta_id: '',
      insumo_id: it.insumo_id,
      seccion: it.seccion,
      cantidad: Number(it.cantidad) || 0,
      unidad: it.unidad,
      nota: it.nota,
      orden: 1,
    },
    insumo,
    1
  );
}

/* -------------------------------------------------------------------------- */
/* Lista editable de lo que lleva una parte de la receta                       */
/* -------------------------------------------------------------------------- */

function EditorItems({
  seccion,
  titulo,
  ayuda,
  items,
  insumos,
  insumosMap,
  onAgregar,
  onCambiar,
  onQuitar,
  onCrearInsumo,
}: {
  seccion: SeccionRecetaItem;
  titulo: string;
  ayuda: string;
  items: ItemForm[];
  insumos: Insumo[];
  insumosMap: Map<string, Insumo>;
  onAgregar: (seccion: SeccionRecetaItem, insumo: Insumo) => void;
  onCambiar: (tempId: string, cambios: Partial<ItemForm>) => void;
  onQuitar: (tempId: string) => void;
  onCrearInsumo: (insumo: Omit<Insumo, 'id'>) => Promise<Insumo>;
}) {
  const esEnvase = seccion === 'empaque';
  const tipo: TipoInsumo = esEnvase ? 'empaque' : 'ingrediente';
  const disponibles = insumos
    .filter((i) => i.tipo === tipo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const [creando, setCreando] = useState(false);
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoCantidad, setNuevoCantidad] = useState('');
  const [nuevoUnidad, setNuevoUnidad] = useState<UnidadMedida>(esEnvase ? 'u' : 'g');
  const [nuevoPrecio, setNuevoPrecio] = useState('');
  const [creandoGuardando, setCreandoGuardando] = useState(false);

  const puedeCrear = nuevoNombre.trim() && Number(nuevoCantidad) > 0 && nuevoPrecio !== '';

  const crear = async () => {
    if (!puedeCrear) return;
    setCreandoGuardando(true);
    try {
      const creado = await onCrearInsumo({
        nombre: nuevoNombre.trim(),
        tipo,
        categoria: esEnvase ? 'Envases' : 'Ingredientes',
        precio_compra: Number(nuevoPrecio) || 0,
        cantidad_paquete: Number(nuevoCantidad) || 1,
        unidad: nuevoUnidad,
        stock_actual: 0,
        stock_minimo: 0,
        proveedor: '',
        notas: '',
      });
      onAgregar(seccion, creado);
      setCreando(false);
      setNuevoNombre('');
      setNuevoCantidad('');
      setNuevoPrecio('');
    } finally {
      setCreandoGuardando(false);
    }
  };

  const subtotal = items.reduce((s, it) => s + costoDeItem(it, insumosMap.get(it.insumo_id)), 0);

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold">{titulo}</h3>
        {subtotal > 0 && (
          <span className="num text-sm font-semibold text-ink-soft">{formatearMoneda(subtotal)}</span>
        )}
      </div>
      <p className="mt-0.5 text-sm text-ink-soft">{ayuda}</p>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((it) => {
            const ins = insumosMap.get(it.insumo_id);
            const unidades = ins ? unidadesCompatibles(ins.unidad) : [it.unidad];
            const costo = costoDeItem(it, ins);
            return (
              <li key={it.tempId} className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-semibold">
                    {ins?.nombre || 'Ya no existe'}
                  </span>
                  <span className="num shrink-0 text-sm font-semibold">
                    {Number(it.cantidad) > 0 ? formatearMoneda(costo) : '—'}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="any"
                    placeholder="Cantidad"
                    autoFocus={it.cantidad === ''}
                    aria-label={`Cantidad de ${ins?.nombre || 'ingrediente'}`}
                    value={it.cantidad}
                    onChange={(e) => onCambiar(it.tempId, { cantidad: e.target.value })}
                    className="input num w-28 font-semibold"
                  />
                  {unidades.length > 1 ? (
                    <select
                      value={it.unidad}
                      aria-label="Unidad"
                      onChange={(e) => onCambiar(it.tempId, { unidad: e.target.value as UnidadMedida })}
                      className="input w-32"
                    >
                      {unidades.map((u) => (
                        <option key={u} value={u}>
                          {NOMBRE_UNIDAD[u]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[0.9375rem] text-ink-soft">{NOMBRE_UNIDAD[it.unidad]}</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onQuitar(it.tempId)}
                    aria-label={`Quitar ${ins?.nombre || ''}`}
                    className="ml-auto flex h-11 w-11 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-bad-soft hover:text-bad"
                  >
                    <Trash size={18} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {creando ? (
        <div className="mt-3 space-y-4 rounded-xl border border-berry bg-surface p-4">
          <div className="font-semibold">{esEnvase ? 'Nuevo envase' : 'Nuevo ingrediente'}</div>
          <Campo etiqueta="Nombre">
            <input
              type="text"
              autoFocus
              placeholder={esEnvase ? 'Ej: Caja para 6 unidades' : 'Ej: Harina de almendras'}
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              className="input"
            />
          </Campo>
          <Campo etiqueta="¿Cuánto trae el paquete?">
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder={esEnvase ? '10' : '500'}
                value={nuevoCantidad}
                onChange={(e) => setNuevoCantidad(e.target.value)}
                className="input num w-28 font-semibold"
              />
              <select
                value={nuevoUnidad}
                aria-label="Unidad"
                onChange={(e) => setNuevoUnidad(e.target.value as UnidadMedida)}
                className="input flex-1"
              >
                {UNIDADES.map((u) => (
                  <option key={u} value={u}>
                    {NOMBRE_UNIDAD[u]}
                  </option>
                ))}
              </select>
            </div>
          </Campo>
          <Campo etiqueta="¿Cuánto pagaste por él?">
            <CampoDinero value={nuevoPrecio} onChange={setNuevoPrecio} placeholder="0" />
          </Campo>
          <div className="flex gap-3">
            <button type="button" className="btn btn-secondary flex-1" onClick={() => setCreando(false)}>
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={!puedeCrear || creandoGuardando}
              onClick={crear}
            >
              Agregar
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          {disponibles.length > 0 && (
            <select
              value=""
              aria-label={`Agregar a ${titulo}`}
              onChange={(e) => {
                const ins = insumosMap.get(e.target.value);
                if (ins) onAgregar(seccion, ins);
              }}
              className="input flex-1 font-semibold text-berry"
            >
              <option value="">
                {esEnvase ? '+ Elegir de mis envases' : '+ Elegir de mis ingredientes'}
              </option>
              {disponibles.map((ins) => (
                <option key={ins.id} value={ins.id}>
                  {ins.nombre}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => setCreando(true)}
            className={`btn ${disponibles.length > 0 ? 'btn-secondary' : 'btn-primary'}`}
          >
            <Plus size={18} weight="bold" />
            {esEnvase ? 'Crear envase nuevo' : 'Crear ingrediente nuevo'}
          </button>
        </div>
      )}
    </section>
  );
}

/* -------------------------------------------------------------------------- */
/* Asistente para crear o editar un producto                                   */
/* -------------------------------------------------------------------------- */

export default function RecipeFormModal({
  recetaInicial,
  insumos,
  onClose,
  onCrearInsumoRapido,
  onSave,
}: RecipeFormModalProps) {
  const editando = Boolean(recetaInicial);
  const [paso, setPaso] = useState(0);
  const [mostrarErrores, setMostrarErrores] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // Paso 1: lo básico
  const [nombre, setNombre] = useState(recetaInicial?.nombre || '');
  const [rendCantidad, setRendCantidad] = useState(
    recetaInicial ? String(recetaInicial.rendimiento_cantidad) : ''
  );
  const [rendUnidad, setRendUnidad] = useState(recetaInicial?.rendimiento_unidad || 'unidades');
  const [modoVenta, setModoVenta] = useState<'unidad' | 'pack'>(
    recetaInicial && recetaInicial.unidades_por_pack > 1 ? 'pack' : 'unidad'
  );
  const [unidadesPack, setUnidadesPack] = useState(
    recetaInicial && recetaInicial.unidades_por_pack > 1
      ? String(recetaInicial.unidades_por_pack)
      : '6'
  );
  const [nombrePack, setNombrePack] = useState(
    recetaInicial && recetaInicial.unidades_por_pack > 1 ? recetaInicial.nombre_pack : 'Caja x6'
  );

  // Pasos 2 y 3: qué lleva
  const [items, setItems] = useState<ItemForm[]>(() =>
    (recetaInicial?.items || []).map((it) => ({
      tempId: it.id || crypto.randomUUID(),
      insumo_id: it.insumo_id,
      seccion: it.seccion,
      cantidad: String(it.cantidad),
      unidad: it.unidad,
      nota: it.nota || '',
    }))
  );
  const [extras, setExtras] = useState(String(recetaInicial?.porcentaje_gastos_extras ?? 10));

  // Paso 4: precio
  const [precio, setPrecio] = useState(
    recetaInicial && recetaInicial.precio_venta_pack > 0
      ? String(recetaInicial.precio_venta_pack)
      : ''
  );

  // Paso 5: preparación
  const [pasos, setPasos] = useState<PasoForm[]>(() => {
    const previos = (recetaInicial?.pasos || []).map((p) => ({
      tempId: p.id || crypto.randomUUID(),
      etapa: p.etapa,
      instruccion: p.instruccion,
      minutos: p.tiempo_timer_min ? String(p.tiempo_timer_min) : '',
      tip_secreto: p.tip_secreto || '',
    }));
    return previos.length > 0
      ? previos
      : [{ tempId: 'p-1', etapa: '', instruccion: '', minutos: '', tip_secreto: '' }];
  });
  const [notas, setNotas] = useState(recetaInicial?.notas_chefcita || '');

  const insumosMap = useMemo(
    () => new Map<string, Insumo>(insumos.map((i) => [i.id, i])),
    [insumos]
  );

  const rend = Math.max(1, Number(rendCantidad) || 1);
  const unidPack = modoVenta === 'pack' ? Math.max(1, Number(unidadesPack) || 1) : 1;
  const unidadSingular = singular(rendUnidad);
  const nombreVenta =
    modoVenta === 'pack' ? nombrePack.trim() || `Caja x${unidPack}` : unidadSingular;

  const costos = useMemo(() => {
    let ingredientes = 0;
    let envase = 0;
    for (const it of items) {
      const costo = costoDeItem(it, insumosMap.get(it.insumo_id));
      if (it.seccion === 'empaque') envase += costo;
      else ingredientes += costo;
    }
    const otros = ingredientes * ((Number(extras) || 0) / 100);
    const total = ingredientes + envase + otros + (recetaInicial?.costo_mano_obra_lote || 0);
    const porUnidad = total / rend;
    return { ingredientes, envase, otros, total, porUnidad, porVenta: porUnidad * unidPack };
  }, [items, insumosMap, extras, rend, unidPack, recetaInicial]);

  const sugerencias = [
    { id: 'ajustado', nombre: 'Ajustado', margen: 45 },
    { id: 'recomendado', nombre: 'Recomendado', margen: 60 },
    { id: 'premium', nombre: 'Premium', margen: 70 },
  ].map((s) => ({ ...s, precio: precioParaMargen(costos.porVenta, s.margen) }));

  const precioNum = Number(precio) || 0;
  const ganancia = precioNum - costos.porVenta;

  const errores = {
    nombre: !nombre.trim() ? 'Ponle un nombre a tu producto.' : '',
    rend: !(Number(rendCantidad) > 0) ? 'Indica cuántas unidades salen.' : '',
  };
  const basicoValido = !errores.nombre && !errores.rend;

  const irA = (destino: number) => {
    if (destino > 0 && !basicoValido) {
      setMostrarErrores(true);
      setPaso(0);
      return;
    }
    setPaso(Math.min(Math.max(destino, 0), PASOS_ASISTENTE.length - 1));
  };

  const agregarItem = (seccion: SeccionRecetaItem, insumo: Insumo) => {
    setItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        insumo_id: insumo.id,
        seccion,
        cantidad: '',
        unidad: insumo.unidad === 'kg' ? 'g' : insumo.unidad === 'l' ? 'ml' : insumo.unidad,
        nota: '',
      },
    ]);
  };
  const cambiarItem = (tempId: string, cambios: Partial<ItemForm>) =>
    setItems((prev) => prev.map((it) => (it.tempId === tempId ? { ...it, ...cambios } : it)));
  const quitarItem = (tempId: string) =>
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));

  const cambiarPaso = (tempId: string, cambios: Partial<PasoForm>) =>
    setPasos((prev) => prev.map((p) => (p.tempId === tempId ? { ...p, ...cambios } : p)));

  const guardar = async () => {
    if (!basicoValido) {
      setMostrarErrores(true);
      setPaso(0);
      return;
    }
    setGuardando(true);
    try {
      const precioVenta =
        precioNum > 0 ? precioNum : costos.porVenta > 0 ? precioParaMargen(costos.porVenta, 60) : 0;
      await onSave(
        {
          id: recetaInicial?.id,
          nombre,
          categoria: recetaInicial?.categoria || 'Dulces',
          descripcion: recetaInicial?.descripcion || '',
          rendimiento_cantidad: rend,
          rendimiento_unidad: rendUnidad.trim() || 'unidades',
          unidades_por_pack: unidPack,
          nombre_pack: nombreVenta,
          porcentaje_gastos_extras: Number(extras) || 0,
          costo_mano_obra_lote: recetaInicial?.costo_mano_obra_lote || 0,
          margen_objetivo_porcentaje: recetaInicial?.margen_objetivo_porcentaje || 60,
          precio_venta_unidad:
            modoVenta === 'pack' ? redondearPrecioComercial(precioVenta / unidPack) : precioVenta,
          precio_venta_pack: precioVenta,
          precio_venta_lote: Math.round(precioVenta * (rend / unidPack)),
          tiempo_preparacion_min: recetaInicial?.tiempo_preparacion_min || 30,
          tiempo_horneado_min: recetaInicial?.tiempo_horneado_min || 20,
          temperatura_horno_c: recetaInicial?.temperatura_horno_c ?? 180,
          metodo_coccion: recetaInicial?.metodo_coccion || 'Horno',
          notas_chefcita: notas,
          color_tag: recetaInicial?.color_tag || 'rose',
          favorita: recetaInicial?.favorita ?? true,
        },
        items
          .filter((it) => Number(it.cantidad) > 0 && insumosMap.has(it.insumo_id))
          .map((it, idx) => ({
            insumo_id: it.insumo_id,
            seccion: it.seccion,
            cantidad: Number(it.cantidad),
            unidad: it.unidad,
            nota: it.nota,
            orden: idx + 1,
          })),
        pasos
          .filter((p) => p.instruccion.trim().length > 0)
          .map((p, idx) => ({
            paso_numero: idx + 1,
            etapa: p.etapa || `Paso ${idx + 1}`,
            instruccion: p.instruccion,
            tiempo_timer_min: Number(p.minutos) > 0 ? Number(p.minutos) : null,
            tip_secreto: p.tip_secreto,
          }))
      );
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  const esUltimo = paso === PASOS_ASISTENTE.length - 1;
  const itemsDe = (s: SeccionRecetaItem) => items.filter((it) => it.seccion === s);
  const sinCantidad = items.filter((it) => !(Number(it.cantidad) > 0)).length;

  return (
    <Sheet
      titulo={editando ? `Editar ${recetaInicial!.nombre}` : 'Nuevo producto'}
      onClose={onClose}
      ancho="lg"
      alta
      subtitulo={
        <div>
          <div className="flex gap-1.5" role="tablist" aria-label="Pasos">
            {PASOS_ASISTENTE.map((etiqueta, i) => (
              <button
                key={etiqueta}
                type="button"
                role="tab"
                aria-selected={i === paso}
                aria-label={`Paso ${i + 1}: ${etiqueta}`}
                onClick={() => irA(i)}
                className="group flex-1 cursor-pointer py-1.5"
              >
                <span
                  className={`block h-1.5 rounded-full transition-colors ${
                    i <= paso ? 'bg-berry' : 'bg-line group-hover:bg-line-strong'
                  }`}
                />
              </button>
            ))}
          </div>
          <div className="mt-1">
            Paso {paso + 1} de {PASOS_ASISTENTE.length} ·{' '}
            <strong className="text-ink">{PASOS_ASISTENTE[paso]}</strong>
            {esUltimo && ' (opcional)'}
          </div>
        </div>
      }
      pie={
        <div>
          {costos.total > 0 && paso !== 3 && (
            <div className="mb-3 flex items-baseline justify-between gap-3 text-sm">
              <span className="text-ink-soft">Costo hasta ahora</span>
              <span className="num text-right font-semibold">
                {formatearMoneda(costos.total)}
                <span className="font-normal text-ink-soft">
                  {' '}
                  · {formatearMoneda(costos.porUnidad)} c/u
                </span>
              </span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => (paso === 0 ? onClose() : irA(paso - 1))}
            >
              {paso === 0 ? (
                'Cancelar'
              ) : (
                <>
                  <ArrowLeft size={18} weight="bold" />
                  Atrás
                </>
              )}
            </button>
            {!esUltimo && (
              <button
                type="button"
                className={`btn flex-1 ${editando ? 'btn-secondary' : 'btn-primary'}`}
                onClick={() => irA(paso + 1)}
              >
                Siguiente
                <ArrowRight size={18} weight="bold" />
              </button>
            )}
            {(esUltimo || editando) && (
              <button
                type="button"
                className="btn btn-primary flex-1"
                disabled={guardando}
                onClick={guardar}
              >
                <Check size={18} weight="bold" />
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Guardar producto'}
              </button>
            )}
          </div>
        </div>
      }
    >
      {/* ------------------------------ Paso 1 ------------------------------ */}
      {paso === 0 && (
        <div className="space-y-6">
          <Campo etiqueta="¿Cómo se llama?" error={mostrarErrores ? errores.nombre : ''}>
            <input
              type="text"
              autoFocus={!editando}
              placeholder="Ej: Brownies sin azúcar"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className={`input ${mostrarErrores && errores.nombre ? 'input-error' : ''}`}
            />
          </Campo>

          <Campo
            etiqueta="¿Cuántos salen cada vez que lo preparas?"
            ayuda="Con una receta completa. Ej: 12 brownies, 20 galletas, 1 torta."
            error={mostrarErrores ? errores.rend : ''}
          >
            <div className="flex gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                placeholder="12"
                value={rendCantidad}
                onChange={(e) => setRendCantidad(e.target.value)}
                className={`input num w-28 font-semibold ${
                  mostrarErrores && errores.rend ? 'input-error' : ''
                }`}
              />
              <input
                type="text"
                aria-label="Qué son"
                placeholder="brownies, galletas, tortas…"
                value={rendUnidad}
                onChange={(e) => setRendUnidad(e.target.value)}
                className="input flex-1"
              />
            </div>
          </Campo>

          <fieldset>
            <legend className="label">¿Cómo lo vendes?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  { id: 'unidad', titulo: 'De a uno', detalle: `Cada ${unidadSingular} por separado` },
                  { id: 'pack', titulo: 'En caja o pack', detalle: 'Varias unidades juntas' },
                ] as const
              ).map((op) => {
                const activo = modoVenta === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    aria-pressed={activo}
                    onClick={() => setModoVenta(op.id)}
                    className={`cursor-pointer rounded-xl border px-4 py-3 text-left transition-colors ${
                      activo
                        ? 'border-berry bg-berry-soft'
                        : 'border-line-strong bg-surface hover:bg-paper'
                    }`}
                  >
                    <div className="font-semibold">{op.titulo}</div>
                    <div className="text-sm text-ink-soft">{op.detalle}</div>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {modoVenta === 'pack' && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Campo etiqueta="¿Cuántas unidades trae?">
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={unidadesPack}
                  onChange={(e) => {
                    const v = e.target.value;
                    setUnidadesPack(v);
                    if (!nombrePack.trim() || /^Caja x\d*$/.test(nombrePack.trim())) {
                      setNombrePack(`Caja x${v}`);
                    }
                  }}
                  className="input num font-semibold"
                />
              </Campo>
              <Campo etiqueta="¿Cómo le dices?">
                <input
                  type="text"
                  placeholder="Caja x6"
                  value={nombrePack}
                  onChange={(e) => setNombrePack(e.target.value)}
                  className="input"
                />
              </Campo>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------ Paso 2 ------------------------------ */}
      {paso === 1 && (
        <div className="space-y-8">
          <p className="text-[0.9375rem] text-ink-soft">
            Anota cuánto usas de cada cosa para preparar{' '}
            <strong className="text-ink">
              {rend} {rendUnidad}
            </strong>
            . Si un ingrediente no está en tu lista, créalo aquí mismo.
          </p>
          <EditorItems
            seccion="masa"
            titulo="Masa o base"
            ayuda="Harinas, endulzante, huevos, mantequilla, cacao…"
            items={itemsDe('masa')}
            insumos={insumos}
            insumosMap={insumosMap}
            onAgregar={agregarItem}
            onCambiar={cambiarItem}
            onQuitar={quitarItem}
            onCrearInsumo={onCrearInsumoRapido}
          />
          <EditorItems
            seccion="relleno_cobertura"
            titulo="Relleno, cobertura y decoración"
            ayuda="Si no lleva, deja esta parte vacía."
            items={itemsDe('relleno_cobertura')}
            insumos={insumos}
            insumosMap={insumosMap}
            onAgregar={agregarItem}
            onCambiar={cambiarItem}
            onQuitar={quitarItem}
            onCrearInsumo={onCrearInsumoRapido}
          />
        </div>
      )}

      {/* ------------------------------ Paso 3 ------------------------------ */}
      {paso === 2 && (
        <div className="space-y-8">
          <EditorItems
            seccion="empaque"
            titulo="Envases y empaque"
            ayuda={`Lo que usas para entregar los ${rend} ${rendUnidad}: cajas, bolsas, etiquetas, cinta.${
              modoVenta === 'pack' && rend / unidPack >= 1
                ? ` Si vendes en ${nombreVenta}, serían ${Math.ceil(rend / unidPack)} ${
                    Math.ceil(rend / unidPack) === 1 ? 'caja' : 'cajas'
                  }.`
                : ''
            }`}
            items={itemsDe('empaque')}
            insumos={insumos}
            insumosMap={insumosMap}
            onAgregar={agregarItem}
            onCambiar={cambiarItem}
            onQuitar={quitarItem}
            onCrearInsumo={onCrearInsumoRapido}
          />

          <Campo
            etiqueta="Gas, luz y otros gastos"
            ayuda="Sumamos este porcentaje al costo de los ingredientes para cubrir horno, luz, agua y lavado. Si no estás segura, deja 10."
          >
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={0}
                max={50}
                value={extras}
                onChange={(e) => setExtras(e.target.value)}
                className="input num w-24 font-semibold"
              />
              <span className="font-semibold text-ink-soft">%</span>
              {costos.otros > 0 && (
                <span className="num ml-2 text-sm text-ink-soft">
                  = {formatearMoneda(costos.otros)}
                </span>
              )}
            </div>
          </Campo>
        </div>
      )}

      {/* ------------------------------ Paso 4 ------------------------------ */}
      {paso === 3 && (
        <div className="space-y-6">
          {costos.total > 0 ? (
            <>
              <div className="rounded-xl bg-sunken p-4">
                <div className="text-sm text-ink-soft">
                  Hacer {modoVenta === 'pack' ? `una ${nombreVenta}` : `cada ${unidadSingular}`} te
                  cuesta
                </div>
                <div className="num font-display text-3xl font-semibold">
                  {formatearMoneda(costos.porVenta)}
                </div>
                <dl className="num mt-3 space-y-1 border-t border-line pt-3 text-sm text-ink-soft">
                  <div className="flex justify-between">
                    <dt>Ingredientes</dt>
                    <dd>{formatearMoneda(costos.ingredientes)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Envases</dt>
                    <dd>{formatearMoneda(costos.envase)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Gas, luz y otros</dt>
                    <dd>{formatearMoneda(costos.otros)}</dd>
                  </div>
                  <div className="flex justify-between font-semibold text-ink">
                    <dt>
                      Total por {rend} {rendUnidad}
                    </dt>
                    <dd>{formatearMoneda(costos.total)}</dd>
                  </div>
                </dl>
              </div>
              {sinCantidad > 0 && (
                <p className="rounded-xl bg-warn-soft px-4 py-3 text-sm font-medium text-warn">
                  {sinCantidad === 1
                    ? 'Hay 1 ingrediente sin cantidad, así que no está sumado.'
                    : `Hay ${sinCantidad} ingredientes sin cantidad, así que no están sumados.`}
                </p>
              )}

              <fieldset>
                <legend className="label">Elige un precio o escribe el tuyo</legend>
                <div className="grid gap-2 sm:grid-cols-3">
                  {sugerencias.map((s) => {
                    const activo = precioNum === s.precio;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setPrecio(String(s.precio))}
                        className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-colors sm:block ${
                          activo
                            ? 'border-berry bg-berry-soft'
                            : 'border-line-strong bg-surface hover:bg-paper'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-semibold text-ink-soft">{s.nombre}</div>
                          <div className="num text-lg font-bold">{formatearMoneda(s.precio)}</div>
                        </div>
                        <div className="num text-sm font-semibold text-ok">
                          ganas {formatearMoneda(s.precio - costos.porVenta)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </>
          ) : (
            <p className="rounded-xl bg-warn-soft px-4 py-3 text-[0.9375rem] font-medium text-warn">
              Todavía no agregas ingredientes con cantidad, así que no podemos calcular el costo.
              Puedes anotar el precio que ya cobras y completar los ingredientes después.
            </p>
          )}

          <Campo etiqueta={`Precio de venta por ${nombreVenta}`}>
            <CampoDinero value={precio} onChange={setPrecio} placeholder="0" className="text-lg" />
          </Campo>

          {precioNum > 0 && costos.total > 0 && (
            <p
              className={`rounded-xl px-4 py-3 text-[0.9375rem] font-medium ${
                ganancia <= 0
                  ? 'bg-bad-soft text-bad'
                  : ganancia / precioNum < 0.38
                    ? 'bg-warn-soft text-warn'
                    : 'bg-ok-soft text-ok'
              }`}
            >
              {ganancia <= 0
                ? `Con este precio pierdes ${formatearMoneda(Math.abs(ganancia))} por ${nombreVenta}.`
                : ganancia / precioNum < 0.38
                  ? `Ganas ${formatearMoneda(ganancia)} por ${nombreVenta}. Es poco para tu trabajo.`
                  : `Ganas ${formatearMoneda(ganancia)} por ${nombreVenta}.`}
            </p>
          )}
        </div>
      )}

      {/* ------------------------------ Paso 5 ------------------------------ */}
      {paso === 4 && (
        <div className="space-y-6">
          <p className="text-[0.9375rem] text-ink-soft">
            Anota los pasos si quieres seguir la receta desde aquí mientras cocinas. Puedes saltarte
            esta parte y guardar.
          </p>

          <ol className="space-y-3">
            {pasos.map((p, idx) => (
              <li key={p.tempId} className="rounded-xl border border-line bg-paper p-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Paso {idx + 1}</span>
                  {pasos.length > 1 && (
                    <button
                      type="button"
                      aria-label={`Quitar paso ${idx + 1}`}
                      onClick={() => setPasos((prev) => prev.filter((x) => x.tempId !== p.tempId))}
                      className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-bad-soft hover:text-bad"
                    >
                      <Trash size={18} />
                    </button>
                  )}
                </div>
                <textarea
                  rows={2}
                  placeholder="Ej: Derretir el chocolate con la mantequilla a baño maría."
                  aria-label={`Instrucción del paso ${idx + 1}`}
                  value={p.instruccion}
                  onChange={(e) => cambiarPaso(p.tempId, { instruccion: e.target.value })}
                  className="input mt-1"
                />
                <label className="mt-2 flex items-center gap-2 text-sm text-ink-soft">
                  Temporizador
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    placeholder="—"
                    value={p.minutos}
                    onChange={(e) => cambiarPaso(p.tempId, { minutos: e.target.value })}
                    className="input num w-20 text-center"
                  />
                  minutos
                </label>
              </li>
            ))}
          </ol>

          <button
            type="button"
            className="btn btn-secondary w-full"
            onClick={() =>
              setPasos((prev) => [
                ...prev,
                { tempId: crypto.randomUUID(), etapa: '', instruccion: '', minutos: '', tip_secreto: '' },
              ])
            }
          >
            <Plus size={18} weight="bold" />
            Agregar paso
          </button>

          <Campo etiqueta="Notas (opcional)" ayuda="Conservación, trucos, cosas que no quieres olvidar.">
            <textarea
              rows={2}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="input"
            />
          </Campo>
        </div>
      )}
    </Sheet>
  );
}
