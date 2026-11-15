'use client';

import React, { useMemo, useState } from 'react';
import { Insumo, Receta, TipoInsumo, UnidadMedida } from '@/lib/types';
import {
  obtenerCostoUnitarioInsumo,
  formatearMoneda,
  formatearCantidad,
  NOMBRE_UNIDAD,
} from '@/lib/costing';
import { Sheet, Campo, CampoDinero, Segmentos, Vacio, EncabezadoVista, Confirmar } from './ui';
import { Plus, MagnifyingGlass, CaretRight, Basket, Trash } from '@phosphor-icons/react';

const UNIDADES: UnidadMedida[] = ['g', 'kg', 'ml', 'l', 'u', 'cm'];

/* -------------------------------------------------------------------------- */
/* Formulario para agregar o editar un ingrediente o envase                    */
/* -------------------------------------------------------------------------- */

export function InsumoFormSheet({
  insumoInicial,
  tipoInicial = 'ingrediente',
  productosQueLoUsan = 0,
  onClose,
  onGuardar,
  onEliminar,
}: {
  insumoInicial?: Insumo | null;
  tipoInicial?: TipoInsumo;
  productosQueLoUsan?: number;
  onClose: () => void;
  onGuardar: (insumo: Omit<Insumo, 'id'> & { id?: string }) => Promise<unknown>;
  onEliminar?: (id: string) => Promise<void>;
}) {
  const [tipo, setTipo] = useState<TipoInsumo>(insumoInicial?.tipo || tipoInicial);
  const [nombre, setNombre] = useState(insumoInicial?.nombre || '');
  const [precio, setPrecio] = useState(insumoInicial ? String(insumoInicial.precio_compra) : '');
  const [cantidad, setCantidad] = useState(
    insumoInicial ? String(insumoInicial.cantidad_paquete) : ''
  );
  const [unidad, setUnidad] = useState<UnidadMedida>(
    insumoInicial?.unidad || (tipoInicial === 'empaque' ? 'u' : 'g')
  );
  const [stock, setStock] = useState(
    insumoInicial && insumoInicial.stock_actual > 0 ? String(insumoInicial.stock_actual) : ''
  );
  const [proveedor, setProveedor] = useState(insumoInicial?.proveedor || '');
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const esEnvase = tipo === 'empaque';
  const precioNum = Number(precio) || 0;
  const cantidadNum = Number(cantidad) || 0;

  const errores = {
    nombre: !nombre.trim() ? 'Escribe un nombre para reconocerlo.' : '',
    cantidad: cantidadNum <= 0 ? 'Indica cuánto trae el paquete.' : '',
    precio: precio === '' ? 'Indica cuánto pagaste.' : '',
  };
  const hayErrores = Boolean(errores.nombre || errores.cantidad || errores.precio);

  const vistaPrevia =
    precioNum > 0 && cantidadNum > 0
      ? obtenerCostoUnitarioInsumo({
          id: 'previa',
          nombre,
          tipo,
          categoria: '',
          precio_compra: precioNum,
          cantidad_paquete: cantidadNum,
          unidad,
          stock_actual: 0,
          stock_minimo: 0,
          proveedor: '',
          notas: '',
        }).etiquetaCostoLegible
      : null;

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntentoGuardar(true);
    if (hayErrores) return;
    setGuardando(true);
    try {
      await onGuardar({
        id: insumoInicial?.id,
        nombre,
        tipo,
        categoria: insumoInicial?.categoria || (esEnvase ? 'Envases' : 'Ingredientes'),
        precio_compra: precioNum,
        cantidad_paquete: cantidadNum,
        unidad,
        stock_actual: Number(stock) || 0,
        stock_minimo: insumoInicial?.stock_minimo || 0,
        proveedor,
        notas: insumoInicial?.notas || '',
      });
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  if (confirmarBorrado && insumoInicial && onEliminar) {
    return (
      <Confirmar
        titulo={`¿Eliminar ${insumoInicial.nombre}?`}
        detalle={
          productosQueLoUsan > 0
            ? `Lo usas en ${productosQueLoUsan} ${
                productosQueLoUsan === 1 ? 'producto' : 'productos'
              }. Si lo eliminas, su costo dejará de contarlo.`
            : 'Esta acción no se puede deshacer.'
        }
        onCancelar={() => setConfirmarBorrado(false)}
        onConfirmar={async () => {
          await onEliminar(insumoInicial.id);
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet
      titulo={
        insumoInicial ? `Editar ${insumoInicial.nombre}` : esEnvase ? 'Nuevo envase' : 'Nuevo ingrediente'
      }
      subtitulo="Anota el paquete tal como lo compras. Nosotros sacamos la cuenta de cuánto usas en cada receta."
      onClose={onClose}
      pie={
        <div className="flex items-center gap-3">
          {insumoInicial && onEliminar && (
            <button
              type="button"
              onClick={() => setConfirmarBorrado(true)}
              aria-label="Eliminar"
              className="btn btn-secondary px-3 text-bad"
            >
              <Trash size={20} />
            </button>
          )}
          <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" form="form-insumo" disabled={guardando} className="btn btn-primary flex-1">
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      }
    >
      <form id="form-insumo" onSubmit={guardar} className="space-y-5" noValidate>
        {!insumoInicial && (
          <Segmentos
            opciones={[
              { id: 'ingrediente', etiqueta: 'Ingrediente' },
              { id: 'empaque', etiqueta: 'Envase o empaque' },
            ]}
            valor={tipo}
            onChange={(t) => {
              setTipo(t);
              setUnidad(t === 'empaque' ? 'u' : 'g');
            }}
          />
        )}

        <Campo etiqueta="Nombre" error={intentoGuardar ? errores.nombre : ''}>
          <input
            type="text"
            autoFocus={!insumoInicial}
            placeholder={esEnvase ? 'Ej: Caja para 6 unidades' : 'Ej: Harina de almendras'}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className={`input ${intentoGuardar && errores.nombre ? 'input-error' : ''}`}
          />
        </Campo>

        <Campo
          etiqueta="¿Cuánto trae el paquete?"
          ayuda={
            esEnvase
              ? 'Ej: un pack de 10 cajas → 10 unidades.'
              : 'Lo que dice el envase. Ej: 1 kilo, 500 gramos, 12 unidades.'
          }
          error={intentoGuardar ? errores.cantidad : ''}
        >
          <div className="flex gap-2">
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              placeholder={esEnvase ? '10' : '500'}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              className={`input num w-28 font-semibold ${
                intentoGuardar && errores.cantidad ? 'input-error' : ''
              }`}
            />
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value as UnidadMedida)}
              className="input flex-1"
              aria-label="Unidad"
            >
              {UNIDADES.map((u) => (
                <option key={u} value={u}>
                  {NOMBRE_UNIDAD[u]}
                </option>
              ))}
            </select>
          </div>
        </Campo>

        <Campo etiqueta="¿Cuánto pagaste por él?" error={intentoGuardar ? errores.precio : ''}>
          <CampoDinero
            value={precio}
            onChange={setPrecio}
            placeholder="0"
            className={intentoGuardar && errores.precio ? 'input-error' : ''}
          />
        </Campo>

        {vistaPrevia && (
          <p className="rounded-xl bg-sunken px-4 py-3 text-[0.9375rem]">
            Te sale <strong className="num">{vistaPrevia}</strong>.
          </p>
        )}

        <details className="group rounded-xl border border-line">
          <summary className="flex min-h-[48px] cursor-pointer list-none items-center justify-between px-4 text-[0.9375rem] font-semibold [&::-webkit-details-marker]:hidden">
            Más detalles (opcional)
            <CaretRight size={16} weight="bold" className="transition-transform group-open:rotate-90" />
          </summary>
          <div className="space-y-5 border-t border-line p-4">
            <Campo
              etiqueta={`¿Cuánto te queda en casa? (${NOMBRE_UNIDAD[unidad]})`}
              ayuda="Así tu lista de compras te dice solo lo que falta."
            >
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                placeholder="0"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                className="input num"
              />
            </Campo>
            <Campo etiqueta="¿Dónde lo compras?">
              <input
                type="text"
                placeholder="Ej: Tienda de repostería, supermercado"
                value={proveedor}
                onChange={(e) => setProveedor(e.target.value)}
                className="input"
              />
            </Campo>
          </div>
        </details>
      </form>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Pantalla: lista de ingredientes y envases                                   */
/* -------------------------------------------------------------------------- */

export default function InsumosView({
  insumos,
  recetas,
  onNuevo,
  onEditar,
}: {
  insumos: Insumo[];
  recetas: Receta[];
  onNuevo: (tipo: TipoInsumo) => void;
  onEditar: (insumo: Insumo) => void;
}) {
  const [filtro, setFiltro] = useState<'todos' | TipoInsumo>('todos');
  const [busqueda, setBusqueda] = useState('');

  const usos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const r of recetas) {
      const vistos = new Set(r.items.map((it) => it.insumo_id));
      vistos.forEach((id) => mapa.set(id, (mapa.get(id) || 0) + 1));
    }
    return mapa;
  }, [recetas]);

  const cuentaIngredientes = insumos.filter((i) => i.tipo === 'ingrediente').length;
  const cuentaEnvases = insumos.length - cuentaIngredientes;

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return insumos
      .filter((i) => filtro === 'todos' || i.tipo === filtro)
      .filter((i) => !q || i.nombre.toLowerCase().includes(q))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [insumos, filtro, busqueda]);

  return (
    <div className="space-y-6">
      <EncabezadoVista
        titulo="Ingredientes y envases"
        ayuda="Todo lo que compras para tus dulces. Si un precio sube, cámbialo aquí y el costo de tus productos se actualiza solo."
      >
        {insumos.length > 0 && (
          <>
            <button type="button" className="btn btn-secondary" onClick={() => onNuevo('empaque')}>
              <Plus size={18} weight="bold" />
              Envase
            </button>
            <button type="button" className="btn btn-primary" onClick={() => onNuevo('ingrediente')}>
              <Plus size={18} weight="bold" />
              Ingrediente
            </button>
          </>
        )}
      </EncabezadoVista>

      {insumos.length === 0 ? (
        <Vacio
          icono={<Basket size={28} weight="duotone" />}
          titulo="Aún no anotas lo que compras"
          texto="Empieza por lo que más usas: tu harina, tu endulzante, el chocolate, las cajas. Solo necesitas el nombre, cuánto trae y cuánto pagaste."
        >
          <button type="button" className="btn btn-primary" onClick={() => onNuevo('ingrediente')}>
            <Plus size={18} weight="bold" />
            Agregar ingrediente
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => onNuevo('empaque')}>
            <Plus size={18} weight="bold" />
            Agregar envase
          </button>
        </Vacio>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Segmentos
              className="sm:w-[26rem]"
              opciones={[
                { id: 'todos', etiqueta: 'Todos', cuenta: insumos.length },
                { id: 'ingrediente', etiqueta: 'Ingredientes', cuenta: cuentaIngredientes },
                { id: 'empaque', etiqueta: 'Envases', cuenta: cuentaEnvases },
              ]}
              valor={filtro}
              onChange={setFiltro}
            />
            {insumos.length > 6 && (
              <div className="relative sm:ml-auto sm:w-64">
                <MagnifyingGlass
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
                />
                <input
                  type="search"
                  placeholder="Buscar"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="input pl-10"
                />
              </div>
            )}
          </div>

          {visibles.length === 0 ? (
            <p className="card px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
              {busqueda
                ? `No hay nada que coincida con “${busqueda}”.`
                : filtro === 'empaque'
                  ? 'Aún no agregas envases.'
                  : 'Aún no agregas ingredientes.'}
            </p>
          ) : (
            <ul className="card divide-y divide-line overflow-hidden">
              {visibles.map((ins) => {
                const costo = obtenerCostoUnitarioInsumo(ins).etiquetaCostoLegible;
                const enProductos = usos.get(ins.id) || 0;
                return (
                  <li key={ins.id}>
                    <button
                      type="button"
                      onClick={() => onEditar(ins)}
                      className="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors hover:bg-paper sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-semibold">{ins.nombre}</div>
                        <div className="mt-0.5 text-sm text-ink-soft">
                          {ins.tipo === 'empaque' ? 'Envase' : 'Paquete'} de{' '}
                          {formatearCantidad(ins.cantidad_paquete, ins.unidad)} ·{' '}
                          <span className="num">{formatearMoneda(ins.precio_compra)}</span>
                          {enProductos > 0 && (
                            <span className="hidden sm:inline">
                              {' '}
                              · en {enProductos} {enProductos === 1 ? 'producto' : 'productos'}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="num shrink-0 text-right text-sm font-semibold">{costo}</div>
                      <CaretRight size={16} weight="bold" className="shrink-0 text-ink-soft" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
