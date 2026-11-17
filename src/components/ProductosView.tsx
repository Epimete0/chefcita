'use client';

import React, { useMemo, useState } from 'react';
import { Receta, ResumenCostosReceta } from '@/lib/types';
import { formatearMoneda, singular } from '@/lib/costing';
import { Vacio, EncabezadoVista, Etiqueta, Segmentos } from './ui';
import { TONO_SALUD, TEXTO_SALUD } from './RecipeDetailView';
import { Plus, CaretRight, Cookie, MagnifyingGlass, Star } from '@phosphor-icons/react';

export default function ProductosView({
  recetas,
  resumenes,
  filtroInicial = 'todos',
  onAbrir,
  onNuevo,
  onRegistrarVenta,
}: {
  recetas: Receta[];
  resumenes: Map<string, ResumenCostosReceta>;
  filtroInicial?: 'todos' | 'revisar';
  onAbrir: (id: string) => void;
  onNuevo: () => void;
  onRegistrarVenta?: (receta: Receta) => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'revisar'>(filtroInicial);

  const porRevisarCount = useMemo(
    () =>
      recetas.filter((r) => {
        const res = resumenes.get(r.id);
        return res && (res.costoIncompleto || res.estadoSalud === 'perdida' || res.estadoSalud === 'bajo');
      }).length,
    [recetas, resumenes]
  );

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return recetas
      .filter((r) => {
        if (filtro === 'revisar') {
          const res = resumenes.get(r.id);
          if (!res || (!res.costoIncompleto && res.estadoSalud !== 'perdida' && res.estadoSalud !== 'bajo')) {
            return false;
          }
        }
        return !q || r.nombre.toLowerCase().includes(q);
      })
      .sort((a, b) => Number(b.favorita) - Number(a.favorita) || a.nombre.localeCompare(b.nombre));
  }, [recetas, resumenes, filtro, busqueda]);

  return (
    <div className="anim-rise space-y-6">
      <EncabezadoVista
        etiqueta="Catálogo y márgenes"
        titulo="Productos"
        ayuda="Lo que vendes. Para cada uno te mostramos cuánto te cuesta hacerlo, a cuánto lo vendes y cuánto te queda."
      >
        {recetas.length > 0 && (
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={onNuevo}>
            <Plus size={18} weight="bold" />
            Nuevo producto
          </button>
        )}
      </EncabezadoVista>

      {(recetas.length > 3 || porRevisarCount > 0) && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {porRevisarCount > 0 && (
            <Segmentos
              className="sm:w-72"
              opciones={[
                { id: 'todos', etiqueta: 'Todos', cuenta: recetas.length },
                { id: 'revisar', etiqueta: 'Por revisar', cuenta: porRevisarCount },
              ]}
              valor={filtro}
              onChange={setFiltro}
            />
          )}
          {recetas.length > 3 && (
            <div className={`relative ${porRevisarCount > 0 ? 'sm:ml-auto' : ''} sm:w-64`}>
              <MagnifyingGlass
                size={18}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
              />
              <input
                type="search"
                placeholder="Buscar producto"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="input pl-10"
              />
            </div>
          )}
        </div>
      )}

      {recetas.length === 0 ? (
        <Vacio
          icono={<Cookie size={28} weight="duotone" />}
          titulo="Crea tu primer producto"
          texto="Cuéntanos qué lleva uno de tus dulces y te decimos cuánto te cuesta hacerlo y a qué precio conviene venderlo. Toma unos 5 minutos."
        >
          <button type="button" className="btn btn-primary" onClick={onNuevo}>
            <Plus size={18} weight="bold" />
            Crear producto
          </button>
        </Vacio>
      ) : visibles.length === 0 ? (
        <p className="card-sunken px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
          No hay productos que coincidan con “{busqueda}”.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibles.map((rec) => {
            const res = resumenes.get(rec.id);
            if (!res) return null;
            const vendeEnPack = rec.unidades_por_pack > 1;
            const nombreVenta = vendeEnPack ? rec.nombre_pack : singular(rec.rendimiento_unidad);
            const incompleto = res.costoIncompleto;
            const tono = incompleto ? 'warn' : TONO_SALUD[res.estadoSalud];

            return (
              <article
                key={rec.id}
                className="card card-interactive flex min-w-0 flex-col justify-between overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => onAbrir(rec.id)}
                  className="flex flex-1 cursor-pointer flex-col p-4 text-left sm:p-5"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <Etiqueta tono={tono}>
                      {incompleto
                        ? res.costoTotalLote > 0
                          ? 'Costo incompleto'
                          : 'Faltan datos'
                        : TEXTO_SALUD[res.estadoSalud]}
                    </Etiqueta>
                    {rec.favorita && (
                      <Star size={16} weight="fill" className="shrink-0 text-berry" aria-label="Favorito" />
                    )}
                  </div>

                  <h2 className="font-display mt-3 text-lg font-bold leading-snug text-ink">
                    {rec.nombre}
                  </h2>
                  <p className="mt-0.5 text-sm text-ink-soft">
                    Por {nombreVenta} · salen {rec.rendimiento_cantidad} {rec.rendimiento_unidad}
                  </p>

                  <dl className="num mt-4 grid w-full grid-cols-3 gap-2 rounded-xl bg-paper/80 p-3 text-xs">
                    <div className="min-w-0">
                      <dt className="text-ink-soft">Costo</dt>
                      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                        {res.costoPorPack > 0 ? formatearMoneda(res.costoPorPack) : '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-ink-soft">Venta</dt>
                      <dd className="mt-0.5 truncate text-sm font-semibold text-ink">
                        {res.precioVentaPack > 0 ? formatearMoneda(res.precioVentaPack) : '—'}
                      </dd>
                    </div>
                    <div className="min-w-0">
                      <dt className="text-ink-soft">Ganancia</dt>
                      <dd
                        className={`mt-0.5 truncate text-sm font-bold ${
                          incompleto
                            ? 'text-ink-soft'
                            : res.gananciaPorPack <= 0
                              ? 'text-bad'
                              : res.estadoSalud === 'bajo'
                                ? 'text-warn'
                                : 'text-ok'
                        }`}
                      >
                        {incompleto
                          ? '—'
                          : `${res.gananciaPorPack < 0 ? '-' : '+'}${formatearMoneda(
                              Math.abs(res.gananciaPorPack)
                            )}`}
                      </dd>
                    </div>
                  </dl>
                </button>

                <div className="flex items-center justify-between gap-2 border-t border-line bg-paper/45 px-4 py-2.5 sm:px-5">
                  <button
                    type="button"
                    onClick={() => onAbrir(rec.id)}
                    className="inline-flex min-h-[36px] cursor-pointer items-center gap-1 text-sm font-semibold text-berry hover:underline"
                  >
                    Ver detalle
                    <CaretRight size={14} weight="bold" />
                  </button>
                  {onRegistrarVenta && (
                    <button
                      type="button"
                      onClick={() => onRegistrarVenta(rec)}
                      className="btn btn-secondary btn-sm"
                    >
                      <Plus size={14} weight="bold" />
                      Venta
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
