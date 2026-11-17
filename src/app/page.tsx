'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  EstadoPedido,
  Insumo,
  Receta,
  RecetaItem,
  RecetaPaso,
  Pedido,
  Venta,
  ResumenCostosReceta,
  TipoInsumo,
} from '@/lib/types';
import {
  cargarDatosChefcita,
  leerCacheLocal,
  guardarInsumoDB,
  eliminarInsumoDB,
  actualizarPreciosVentaRecetaDB,
  guardarRecetaCompletaDB,
  eliminarRecetaDB,
  guardarPedidoDB,
  cambiarEstadoPedidoDB,
  eliminarPedidoDB,
  guardarVentasLoteDB,
  guardarVentaDB,
  eliminarVentaDB,
} from '@/lib/supabase';
import { calcularCostosReceta } from '@/lib/costing';
import InicioView from '@/components/InicioView';
import VentasView, { RegistrarVentasSheet, EditarVentaSheet } from '@/components/VentasView';
import ProductosView from '@/components/ProductosView';
import RecipeDetailView from '@/components/RecipeDetailView';
import RecipeFormModal from '@/components/RecipeFormModal';
import InsumosView, { InsumoFormSheet } from '@/components/InsumosView';
import PedidosView, { PedidoFormSheet } from '@/components/PedidosView';
import {
  House,
  Storefront,
  ClipboardText,
  Cookie,
  Basket,
  CheckCircle,
  Plus,
} from '@phosphor-icons/react';

type Vista = 'inicio' | 'ventas' | 'pedidos' | 'productos' | 'ingredientes';

const NAVEGACION: Array<{
  id: Vista;
  etiqueta: string;
  etiquetaMovil?: string;
  icono: typeof House;
}> = [
  { id: 'inicio', etiqueta: 'Inicio', icono: House },
  { id: 'ventas', etiqueta: 'Ventas', icono: Storefront },
  { id: 'pedidos', etiqueta: 'Pedidos', icono: ClipboardText },
  { id: 'productos', etiqueta: 'Productos', icono: Cookie },
  { id: 'ingredientes', etiqueta: 'Ingredientes', etiquetaMovil: 'Insumos', icono: Basket },
];

export default function ChefcitaApp() {
  const [vista, setVista] = useState<Vista>('inicio');
  const [cargado, setCargado] = useState(false);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [ventas, setVentas] = useState<Venta[]>([]);

  const [productoAbiertoId, setProductoAbiertoId] = useState<string | null>(null);
  const [pestanaPedidos, setPestanaPedidos] = useState<'pendientes' | 'compras' | 'entregados'>(
    'pendientes'
  );
  const [filtroProductos, setFiltroProductos] = useState<'todos' | 'revisar'>('todos');

  // Formularios (solo uno abierto a la vez)
  const [formInsumo, setFormInsumo] = useState<{ insumo?: Insumo; tipo?: TipoInsumo } | null>(null);
  const [formReceta, setFormReceta] = useState<{ receta?: Receta } | null>(null);
  const [formPedido, setFormPedido] = useState<{ pedido?: Pedido; recetaId?: string } | null>(null);
  const [formVentasLote, setFormVentasLote] = useState<{
    fecha?: string;
    recetaId?: string;
  } | null>(null);
  const [formVentaEditar, setFormVentaEditar] = useState<Venta | null>(null);

  const [aviso, setAviso] = useState<string | null>(null);
  const avisar = useCallback((texto: string) => {
    setAviso(texto);
    setTimeout(() => setAviso((actual) => (actual === texto ? null : actual)), 3000);
  }, []);

  const refrescarDesdeCache = useCallback(() => {
    const local = leerCacheLocal();
    setInsumos(local.insumos);
    setRecetas(local.recetas);
    setPedidos(local.pedidos);
    setVentas(local.ventas);
  }, []);

  useEffect(() => {
    let vigente = true;
    (async () => {
      // 1. Lo guardado en este dispositivo aparece al instante
      await Promise.resolve();
      if (!vigente) return;
      refrescarDesdeCache();
      setCargado(true);
      // 2. Luego se sincroniza con la nube sin bloquear la pantalla
      const data = await cargarDatosChefcita();
      if (!vigente) return;
      setInsumos(data.insumos);
      setRecetas(data.recetas);
      setPedidos(data.pedidos);
      setVentas(data.ventas);
    })();
    return () => {
      vigente = false;
    };
  }, [refrescarDesdeCache]);

  const insumosMap = useMemo(
    () => new Map<string, Insumo>(insumos.map((i) => [i.id, i])),
    [insumos]
  );

  const resumenes = useMemo(() => {
    const map = new Map<string, ResumenCostosReceta>();
    for (const r of recetas) {
      map.set(r.id, calcularCostosReceta(r, insumosMap, 1));
    }
    return map;
  }, [recetas, insumosMap]);

  const productoAbierto = useMemo(
    () => recetas.find((r) => r.id === productoAbiertoId) || null,
    [recetas, productoAbiertoId]
  );

  const porEntregar = pedidos.filter((p) => p.estado !== 'entregado').length;

  const irA = (destino: Vista) => {
    setVista(destino);
    setProductoAbiertoId(null);
    if (destino === 'pedidos') setPestanaPedidos('pendientes');
    if (destino === 'productos') setFiltroProductos('todos');
    window.scrollTo({ top: 0 });
  };

  const abrirProducto = (id: string) => {
    setVista('productos');
    setProductoAbiertoId(id);
    window.scrollTo({ top: 0 });
  };

  /* ------------------------------ Ingredientes ----------------------------- */

  const guardarInsumo = async (insumo: Omit<Insumo, 'id'> & { id?: string }) => {
    const guardado = await guardarInsumoDB(insumo);
    refrescarDesdeCache();
    avisar(insumo.id ? 'Cambios guardados. Tus costos se actualizaron.' : `${guardado.nombre} agregado.`);
    return guardado;
  };

  const eliminarInsumo = async (id: string) => {
    await eliminarInsumoDB(id);
    refrescarDesdeCache();
    avisar('Eliminado.');
  };

  /* -------------------------------- Productos ------------------------------ */

  const guardarReceta = async (
    recetaData: Omit<Receta, 'id' | 'items' | 'pasos'> & { id?: string },
    items: Array<Omit<RecetaItem, 'id' | 'receta_id'>>,
    pasos: Array<Omit<RecetaPaso, 'id' | 'receta_id'>>
  ) => {
    const id = await guardarRecetaCompletaDB(recetaData, items, pasos);
    refrescarDesdeCache();
    abrirProducto(id);
    avisar(recetaData.id ? 'Producto actualizado.' : 'Producto creado. Aquí está tu ganancia.');
  };

  const actualizarPrecio = async (
    recetaId: string,
    precios: { precio_venta_pack: number; precio_venta_unidad: number; precio_venta_lote: number }
  ) => {
    await actualizarPreciosVentaRecetaDB(recetaId, precios);
    refrescarDesdeCache();
    avisar('Precio guardado.');
  };

  const eliminarReceta = async (id: string) => {
    await eliminarRecetaDB(id);
    refrescarDesdeCache();
    setProductoAbiertoId(null);
    avisar('Producto eliminado.');
  };

  /* --------------------------------- Pedidos ------------------------------- */

  const guardarPedido = async (pedido: Omit<Pedido, 'id'> & { id?: string }) => {
    await guardarPedidoDB(pedido);
    refrescarDesdeCache();
    avisar(pedido.id ? 'Pedido actualizado.' : 'Pedido anotado.');
  };

  const cambiarEstadoPedido = async (pedido: Pedido, estado: EstadoPedido) => {
    if (estado === 'entregado') {
      // Al entregar se da por pagado completo
      await guardarPedidoDB({ ...pedido, estado, seña_pagada: pedido.precio_venta_total });
      avisar(`Entregado a ${pedido.cliente_nombre}.`);
    } else {
      await cambiarEstadoPedidoDB(pedido.id, estado);
    }
    refrescarDesdeCache();
  };

  const eliminarPedido = async (id: string) => {
    await eliminarPedidoDB(id);
    refrescarDesdeCache();
    avisar('Pedido eliminado.');
  };

  const nuevoPedido = (recetaId?: string) => {
    if (recetas.length === 0) {
      setFormReceta({});
      return;
    }
    setFormPedido({ recetaId });
  };

  /* --------------------------------- Ventas -------------------------------- */

  const guardarVentasLote = async (nuevas: Array<Omit<Venta, 'id'>>) => {
    await guardarVentasLoteDB(nuevas);
    refrescarDesdeCache();
    avisar(
      nuevas.length === 1
        ? `Venta anotada (${nuevas[0].producto_nombre}).`
        : `${nuevas.length} ventas anotadas.`
    );
  };

  const guardarVenta = async (venta: Venta) => {
    await guardarVentaDB(venta);
    refrescarDesdeCache();
    avisar('Venta actualizada.');
  };

  const eliminarVenta = async (id: string) => {
    await eliminarVentaDB(id);
    refrescarDesdeCache();
    avisar('Venta eliminada.');
  };

  return (
    <div className="min-h-[100dvh] pb-28 lg:pb-14">
      {/* Barra superior */}
      <header className="sticky top-0 z-30 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div aria-hidden="true" className="bg-pastel h-[3px]" />
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <button
            type="button"
            onClick={() => irA('inicio')}
            className="group flex cursor-pointer items-center gap-2.5 rounded-xl py-1 pr-2 transition-transform duration-150 active:scale-[0.98]"
            aria-label="Chefcita, ir al inicio"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white shadow-[0_3px_10px_rgba(141,83,107,0.28)] transition-transform duration-200 group-hover:scale-105">
              <Cookie size={19} weight="fill" />
            </span>
            <span className="font-display text-brand text-2xl font-bold tracking-tight">
              Chefcita
            </span>
          </button>

          <nav
            className="hidden items-center gap-1 rounded-2xl bg-sunken/85 p-1 ring-1 ring-inset ring-line lg:flex"
            aria-label="Principal"
          >
            {NAVEGACION.map((item) => {
              const Icono = item.icono;
              const activo = vista === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={activo ? 'page' : undefined}
                  onClick={() => irA(item.id)}
                  className={`flex min-h-[38px] cursor-pointer items-center gap-2 rounded-xl px-3.5 text-[0.9375rem] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] ${
                    activo
                      ? 'bg-surface text-berry-dark shadow-[0_1px_4px_rgba(54,32,41,0.1)]'
                      : 'text-ink-soft hover:bg-surface/55 hover:text-ink'
                  }`}
                >
                  <Icono size={19} weight={activo ? 'fill' : 'regular'} />
                  <span>{item.etiqueta}</span>
                  {item.id === 'pedidos' && porEntregar > 0 && (
                    <span className="num rounded-full bg-brand px-1.5 py-0.25 text-xs text-white">
                      {porEntregar}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setFormVentasLote({})}
            className="btn btn-primary btn-sm shrink-0"
          >
            <Plus size={16} weight="bold" />
            <span className="sm:hidden">Venta</span>
            <span className="hidden sm:inline">Anotar venta</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-9">
        {!cargado ? (
          <div className="space-y-6" aria-busy="true" aria-label="Cargando">
            <div className="h-9 w-56 animate-pulse rounded-xl bg-sunken" />
            <div className="grid gap-4 lg:grid-cols-12">
              <div className="h-48 animate-pulse rounded-[22px] bg-sunken/70 lg:col-span-7" />
              <div className="h-48 animate-pulse rounded-[22px] bg-sunken/60 lg:col-span-5" />
            </div>
            <div className="grid gap-5 lg:grid-cols-12">
              <div className="h-44 animate-pulse rounded-2xl bg-sunken/65 lg:col-span-7" />
              <div className="h-44 animate-pulse rounded-2xl bg-sunken/55 lg:col-span-5" />
            </div>
          </div>
        ) : (
          <>
            {vista === 'inicio' && (
              <InicioView
                insumos={insumos}
                recetas={recetas}
                pedidos={pedidos}
                ventas={ventas}
                resumenes={resumenes}
                insumosMap={insumosMap}
                onNuevoInsumo={() => setFormInsumo({ tipo: 'ingrediente' })}
                onNuevoProducto={() => setFormReceta({})}
                onNuevoPedido={() => nuevoPedido()}
                onNuevaVenta={(fecha, recetaId) => setFormVentasLote({ fecha, recetaId })}
                onVerVentas={() => irA('ventas')}
                onVerPedidos={() => irA('pedidos')}
                onVerEntregados={() => {
                  irA('pedidos');
                  setPestanaPedidos('entregados');
                }}
                onVerCompras={() => {
                  irA('pedidos');
                  setPestanaPedidos('compras');
                }}
                onVerProductosRevisar={() => {
                  irA('productos');
                  setFiltroProductos('revisar');
                }}
                onAbrirProducto={abrirProducto}
                onEditarPedido={(pedido) => setFormPedido({ pedido })}
                onEditarVenta={(venta) => setFormVentaEditar(venta)}
                onCambiarEstadoPedido={cambiarEstadoPedido}
              />
            )}

            {vista === 'ventas' && (
              <VentasView
                ventas={ventas}
                pedidos={pedidos}
                onNuevaVenta={(fecha) => setFormVentasLote({ fecha })}
                onEditarVenta={(venta) => setFormVentaEditar(venta)}
              />
            )}

            {vista === 'pedidos' && (
              <PedidosView
                key={pestanaPedidos}
                pedidos={pedidos}
                recetas={recetas}
                insumosMap={insumosMap}
                pestanaInicial={pestanaPedidos}
                onNuevo={() => nuevoPedido()}
                onEditar={(pedido) => setFormPedido({ pedido })}
                onCambiarEstado={cambiarEstadoPedido}
                onCrearProducto={() => setFormReceta({})}
              />
            )}

            {vista === 'productos' &&
              (productoAbierto ? (
                <RecipeDetailView
                  key={productoAbierto.id}
                  receta={productoAbierto}
                  insumosMap={insumosMap}
                  onVolver={() => setProductoAbiertoId(null)}
                  onActualizarPrecios={actualizarPrecio}
                  onEditarReceta={(receta) => setFormReceta({ receta })}
                  onEliminarReceta={eliminarReceta}
                  onNuevoPedido={(receta) => nuevoPedido(receta.id)}
                  onRegistrarVenta={(receta) => setFormVentasLote({ recetaId: receta.id })}
                />
              ) : (
                <ProductosView
                  key={filtroProductos}
                  recetas={recetas}
                  resumenes={resumenes}
                  filtroInicial={filtroProductos}
                  onAbrir={abrirProducto}
                  onNuevo={() => setFormReceta({})}
                  onRegistrarVenta={(receta) => setFormVentasLote({ recetaId: receta.id })}
                />
              ))}

            {vista === 'ingredientes' && (
              <InsumosView
                insumos={insumos}
                recetas={recetas}
                onNuevo={(tipo) => setFormInsumo({ tipo })}
                onEditar={(insumo) => setFormInsumo({ insumo })}
              />
            )}
          </>
        )}
      </main>

      {/* Navegación flotante inferior en celular y tablet */}
      <nav
        className="fixed inset-x-3 bottom-[max(0.625rem,env(safe-area-inset-bottom))] z-30 grid grid-cols-5 rounded-2xl border border-line-strong/65 bg-surface/92 p-1 shadow-[0_12px_32px_rgba(54,32,41,0.16)] backdrop-blur-md sm:inset-x-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 lg:hidden"
        aria-label="Principal"
      >
        {NAVEGACION.map((item) => {
          const Icono = item.icono;
          const activo = vista === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={activo ? 'page' : undefined}
              onClick={() => irA(item.id)}
              className={`relative flex min-h-[54px] cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 text-[10.5px] font-semibold transition-[background-color,color,transform] duration-150 active:scale-95 sm:px-1 sm:text-xs ${
                activo ? 'bg-berry-soft/85 text-berry-dark' : 'text-ink-soft'
              }`}
            >
              <span className="relative flex h-6 w-9 items-center justify-center">
                <Icono size={20} weight={activo ? 'fill' : 'regular'} />
                {item.id === 'pedidos' && porEntregar > 0 && (
                  <span className="num absolute -right-1.5 -top-1 min-w-[17px] rounded-full bg-brand px-1 text-center text-[10px] leading-[17px] text-white">
                    {porEntregar}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">
                {item.etiquetaMovil || item.etiqueta}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Aviso de confirmación */}
      {aviso && (
        <div
          role="status"
          className="anim-sheet fixed inset-x-4 bottom-[92px] z-[60] mx-auto flex max-w-sm items-center gap-2.5 rounded-2xl border border-white/10 bg-ink px-4 py-3 text-[0.9375rem] font-medium text-white shadow-[0_12px_32px_rgba(54,32,41,0.32)] lg:bottom-8"
        >
          <CheckCircle size={20} weight="fill" className="shrink-0 text-[#7ddba6]" />
          {aviso}
        </div>
      )}

      {/* Formularios */}
      {formInsumo && (
        <InsumoFormSheet
          insumoInicial={formInsumo.insumo}
          tipoInicial={formInsumo.tipo}
          productosQueLoUsan={
            formInsumo.insumo
              ? recetas.filter((r) => r.items.some((it) => it.insumo_id === formInsumo.insumo!.id))
                  .length
              : 0
          }
          onClose={() => setFormInsumo(null)}
          onGuardar={guardarInsumo}
          onEliminar={eliminarInsumo}
        />
      )}

      {formReceta && (
        <RecipeFormModal
          recetaInicial={formReceta.receta}
          insumos={insumos}
          onClose={() => setFormReceta(null)}
          onCrearInsumoRapido={guardarInsumo}
          onSave={guardarReceta}
        />
      )}

      {formPedido && (
        <PedidoFormSheet
          pedidoInicial={formPedido.pedido}
          recetaInicialId={formPedido.recetaId}
          recetas={recetas}
          insumosMap={insumosMap}
          onClose={() => setFormPedido(null)}
          onGuardar={guardarPedido}
          onEliminar={eliminarPedido}
        />
      )}

      {formVentasLote && (
        <RegistrarVentasSheet
          fechaInicial={formVentasLote.fecha}
          recetaInicialId={formVentasLote.recetaId}
          recetas={recetas}
          insumosMap={insumosMap}
          onClose={() => setFormVentasLote(null)}
          onGuardarLote={guardarVentasLote}
        />
      )}

      {formVentaEditar && (
        <EditarVentaSheet
          venta={formVentaEditar}
          recetas={recetas}
          insumosMap={insumosMap}
          onClose={() => setFormVentaEditar(null)}
          onGuardar={guardarVenta}
          onEliminar={eliminarVenta}
        />
      )}
    </div>
  );
}
