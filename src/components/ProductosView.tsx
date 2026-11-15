'use client';

import React from 'react';
import { Receta, ResumenCostosReceta } from '@/lib/types';
import { formatearMoneda, singular } from '@/lib/costing';
import { Vacio, EncabezadoVista, Etiqueta } from './ui';
import { TONO_SALUD, TEXTO_SALUD } from './RecipeDetailView';
import { Plus, CaretRight, Cookie } from '@phosphor-icons/react';

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
  return (
    <div className="space-y-6">
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
      ) : (
        <ul className="card divide-y divide-line overflow-hidden">
          {recetas.map((rec) => {
            const res = resumenes.get(rec.id);
            if (!res) return null;
            const vendeEnPack = rec.unidades_por_pack > 1;
            const nombreVenta = vendeEnPack ? rec.nombre_pack : singular(rec.rendimiento_unidad);
            const sinCosto = res.costoTotalLote <= 0;
            const atencion = res.estadoSalud === 'perdida' || res.estadoSalud === 'bajo';
            return (
              <li key={rec.id}>
                <button
                  type="button"
                  onClick={() => onAbrir(rec.id)}
                  className="flex w-full cursor-pointer items-center gap-4 px-4 py-4 text-left transition-colors hover:bg-paper sm:px-5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[1.0625rem] font-semibold">{rec.nombre}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-ink-soft">
                      <span>
                        <span className="num">{formatearMoneda(res.precioVentaPack)}</span> por{' '}
                        {nombreVenta}
                      </span>
                      {sinCosto ? (
                        <Etiqueta tono="warn">Faltan ingredientes</Etiqueta>
                      ) : (
                        atencion && (
                          <Etiqueta tono={TONO_SALUD[res.estadoSalud]}>
                            {TEXTO_SALUD[res.estadoSalud]}
                          </Etiqueta>
                        )
                      )}
                    </div>
                  </div>
                  {!sinCosto && (
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
