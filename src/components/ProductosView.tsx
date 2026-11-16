'use client';

import React, { useMemo, useState } from 'react';
import { Receta, ResumenCostosReceta } from '@/lib/types';
import { formatearMoneda, singular } from '@/lib/costing';
import { Vacio, EncabezadoVista, Etiqueta } from './ui';
import { TONO_SALUD, TEXTO_SALUD } from './RecipeDetailView';
import { Plus, CaretRight, Cookie, MagnifyingGlass } from '@phosphor-icons/react';

export default function ProductosView({
  recetas,
  resumenes,
  onAbrir,
  onNuevo,
}: {
  recetas: Receta[];
  resumenes: Map<string, ResumenCostosReceta>;
  onAbrir: (id: string) => void;
  onNuevo: () => void;
}) {
  const [busqueda, setBusqueda] = useState('');
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? recetas.filter((r) => r.nombre.toLowerCase().includes(q)) : recetas;
  }, [recetas, busqueda]);

  return (
    <div className="anim-rise space-y-6">
      <EncabezadoVista
        titulo="Productos"
        ayuda="Lo que vendes. Para cada uno te mostramos cuánto te cuesta hacerlo, a cuánto lo vendes y cuánto te queda."
      >
        {recetas.length > 0 && (
          <button type="button" className="btn btn-primary" onClick={onNuevo}>
            <Plus size={18} weight="bold" />
            Nuevo producto
          </button>
        )}
      </EncabezadoVista>

      {recetas.length > 5 && (
        <div className="relative sm:max-w-xs">
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
        <p className="card px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
          No hay productos que coincidan con “{busqueda}”.
        </p>
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {visibles.map((rec) => {
            const res = resumenes.get(rec.id);
            if (!res) return null;
            const vendeEnPack = rec.unidades_por_pack > 1;
            const nombreVenta = vendeEnPack ? rec.nombre_pack : singular(rec.rendimiento_unidad);
            const incompleto = res.costoIncompleto;
            const atencion = res.estadoSalud === 'perdida' || res.estadoSalud === 'bajo';
            return (
              <li key={rec.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(rec.id)}
                  className="flex w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors duration-150 hover:bg-paper/80 active:bg-sunken/60 sm:px-5"
                >
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      incompleto
                        ? 'bg-warn'
                        : res.estadoSalud === 'perdida'
                          ? 'bg-bad'
                          : res.estadoSalud === 'bajo'
                            ? 'bg-warn'
                            : 'bg-ok'
                    }`}
                    aria-hidden="true"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[1.0625rem] font-semibold">{rec.nombre}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                      <span>
                        {res.precioVentaPack > 0 ? (
                          <>
                            <span className="num">{formatearMoneda(res.precioVentaPack)}</span> por{' '}
                            {nombreVenta}
                          </>
                        ) : (
                          'Precio por definir'
                        )}
                      </span>
                      {incompleto ? (
                        <Etiqueta tono="warn">
                          {res.costoTotalLote > 0 ? 'Costo incompleto' : 'Faltan datos'}
                        </Etiqueta>
                      ) : (
                        atencion && (
                          <Etiqueta tono={TONO_SALUD[res.estadoSalud]}>
                            {TEXTO_SALUD[res.estadoSalud]}
                          </Etiqueta>
                        )
                      )}
                    </div>
                  </div>
                  {!incompleto && (
                    <div className="shrink-0 text-right">
                      <div
                        className={`num text-[1.0625rem] font-bold ${
                          res.gananciaPorPack <= 0
                            ? 'text-bad'
                            : res.estadoSalud === 'bajo'
                              ? 'text-warn'
                              : 'text-ok'
                        }`}
                      >
                        {res.gananciaPorPack < 0 ? '-' : '+'}
                        {formatearMoneda(Math.abs(res.gananciaPorPack))}
                      </div>
                      <div className="text-sm text-ink-soft">ganancia</div>
                    </div>
                  )}
                  <CaretRight size={16} weight="bold" className="shrink-0 text-ink-soft" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
