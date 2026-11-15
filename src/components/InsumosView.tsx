'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Insumo, TipoInsumo, UnidadMedida } from '@/lib/types';
import { obtenerCostoUnitarioInsumo, formatearMoneda } from '@/lib/costing';
import {
  MagnifyingGlass,
  Plus,
  CookingPot,
  Package,
  PencilSimple,
  Trash,
  Check,
  X,
  Warning,
  Storefront,
  FloppyDisk,
  Sparkle,
} from '@phosphor-icons/react';

interface InsumosViewProps {
  insumos: Insumo[];
  abrirNuevoTrigger?: number;
  onGuardarInsumo: (insumo: Omit<Insumo, 'id'> & { id?: string }) => Promise<void>;
  onActualizarPrecioRapido: (id: string, nuevoPrecio: number, nuevaCant?: number) => Promise<void>;
  onEliminarInsumo: (id: string) => Promise<void>;
}

const CATEGORIAS_INGREDIENTE = [
  'Harinas y Secos',
  'Lácteos y Huevos',
  'Chocolates y Dulces',
  'Esencias y Colorantes',
  'Frutas y Frutos Secos',
];

const CATEGORIAS_EMPAQUE = [
  'Cajas y Bandejas',
  'Bolsas y Papeles',
  'Stickers y Cintas',
  'Velas y Toppers',
];

export default function InsumosView({
  insumos,
  abrirNuevoTrigger = 0,
  onGuardarInsumo,
  onActualizarPrecioRapido,
  onEliminarInsumo,
}: InsumosViewProps) {
  const [filtroTipo, setFiltroTipo] = useState<'todos' | TipoInsumo>('todos');
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActiva, setCategoriaActiva] = useState<string>('Todas');

  // Edición rápida de precio en 1 toque
  const [editandoPrecioId, setEditandoPrecioId] = useState<string | null>(null);
  const [precioRapidoVal, setPrecioRapidoVal] = useState<number>(0);
  const [cantidadRapidaVal, setCantidadRapidaVal] = useState<number>(1);

  // Modal de creación / edición completa
  const [modalAbierto, setModalAbierto] = useState(false);
  const [insumoEditando, setInsumoEditando] = useState<Insumo | null>(null);

  // Campos del modal
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState<TipoInsumo>('ingrediente');
  const [categoria, setCategoria] = useState('Harinas y Secos');
  const [precioCompra, setPrecioCompra] = useState<number>(1500);
  const [cantidadPaquete, setCantidadPaquete] = useState<number>(1000);
  const [unidad, setUnidad] = useState<UnidadMedida>('g');
  const [stockActual, setStockActual] = useState<number>(1000);
  const [stockMinimo, setStockMinimo] = useState<number>(200);
  const [proveedor, setProveedor] = useState('');
  const [notas, setNotas] = useState('');
  const [guardando, setGuardando] = useState(false);

  const abrirModalNuevo = (tipoInicial: TipoInsumo = 'ingrediente') => {
    setInsumoEditando(null);
    setNombre('');
    setTipo(tipoInicial);
    setCategoria(tipoInicial === 'empaque' ? 'Cajas y Bandejas' : 'Harinas y Secos');
    setPrecioCompra(tipoInicial === 'empaque' ? 4500 : 1500);
    setCantidadPaquete(tipoInicial === 'empaque' ? 10 : 1000);
    setUnidad(tipoInicial === 'empaque' ? 'u' : 'g');
    setStockActual(tipoInicial === 'empaque' ? 10 : 1000);
    setStockMinimo(tipoInicial === 'empaque' ? 3 : 250);
    setProveedor('');
    setNotas('');
    setModalAbierto(true);
  };

  useEffect(() => {
    if (abrirNuevoTrigger > 0) {
      abrirModalNuevo('ingrediente');
    }
  }, [abrirNuevoTrigger]);

  const abrirModalEditar = (ins: Insumo) => {
    setInsumoEditando(ins);
    setNombre(ins.nombre);
    setTipo(ins.tipo);
    setCategoria(ins.categoria);
    setPrecioCompra(ins.precio_compra);
    setCantidadPaquete(ins.cantidad_paquete);
    setUnidad(ins.unidad);
    setStockActual(ins.stock_actual);
    setStockMinimo(ins.stock_minimo);
    setProveedor(ins.proveedor);
    setNotas(ins.notas);
    setModalAbierto(true);
  };

  const categoriasDisponibles = useMemo(() => {
    const setCats = new Set<string>();
    insumos
      .filter((i) => filtroTipo === 'todos' || i.tipo === filtroTipo)
      .forEach((i) => setCats.add(i.categoria));
    return ['Todas', ...Array.from(setCats)];
  }, [insumos, filtroTipo]);

  const insumosFiltrados = useMemo(() => {
    return insumos.filter((ins) => {
      if (filtroTipo !== 'todos' && ins.tipo !== filtroTipo) return false;
      if (categoriaActiva !== 'Todas' && ins.categoria !== categoriaActiva) return false;
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        return (
          ins.nombre.toLowerCase().includes(q) ||
          ins.categoria.toLowerCase().includes(q) ||
          ins.proveedor.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [insumos, filtroTipo, categoriaActiva, busqueda]);

  const countIngredientes = useMemo(
    () => insumos.filter((i) => i.tipo === 'ingrediente').length,
    [insumos]
  );
  const countEmpaques = useMemo(
    () => insumos.filter((i) => i.tipo === 'empaque').length,
    [insumos]
  );

  const handleSubmitModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      await onGuardarInsumo({
        id: insumoEditando?.id,
        nombre,
        tipo,
        categoria,
        precio_compra: Number(precioCompra) || 0,
        cantidad_paquete: Math.max(0.01, Number(cantidadPaquete) || 1),
        unidad,
        stock_actual: Number(stockActual) || 0,
        stock_minimo: Number(stockMinimo) || 0,
        proveedor,
        notas,
      });
      setModalAbierto(false);
    } finally {
      setGuardando(false);
    }
  };

  const previewInsumoModal = useMemo(
    () =>
      obtenerCostoUnitarioInsumo({
        id: 'preview',
        nombre: nombre || 'Insumo',
        tipo,
        categoria,
        precio_compra: Number(precioCompra) || 0,
        cantidad_paquete: Math.max(1, Number(cantidadPaquete) || 1),
        unidad,
        stock_actual: 0,
        stock_minimo: 0,
        proveedor: '',
        notas: '',
      }),
    [nombre, tipo, categoria, precioCompra, cantidadPaquete, unidad]
  );

  return (
    <div className="space-y-5">
      {/* Cabecera de Insumos y Empaques */}
      <div className="bezel-shell">
        <div className="bezel-core p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E9] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-[#BE123C]">
                <Sparkle size={13} weight="fill" />
                Despensa & Packaging
              </span>
              <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#2B1118] mt-1">
                Insumos, Materia Prima y Empaques
              </h2>
              <p className="text-xs sm:text-sm text-[#7A4957] mt-1">
                Cuando actualizás el precio de un paquete acá, <strong className="text-[#2B1118]">todas tus recetas actualizan su costo y ganancia automáticamente</strong>.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => abrirModalNuevo('ingrediente')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white px-4 py-2.5 text-xs font-bold shadow-sm hover:shadow-md active:scale-[0.98] spring-transition cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span>Nuevo Ingrediente</span>
              </button>
              <button
                type="button"
                onClick={() => abrirModalNuevo('empaque')}
                className="inline-flex items-center gap-2 rounded-full bg-[#2B1118] text-white px-4 py-2.5 text-xs font-bold shadow-sm hover:bg-[#451A26] active:scale-[0.98] spring-transition cursor-pointer"
              >
                <Package size={15} weight="duotone" />
                <span>Nuevo Empaque / Caja</span>
              </button>
            </div>
          </div>

          {/* Filtros Principales: Todos | Ingredientes | Empaques + Buscador */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-7 flex flex-wrap gap-1.5">
              {[
                { id: 'todos', label: `Todos (${insumos.length})`, icon: null },
                {
                  id: 'ingrediente',
                  label: `🥣 Ingredientes (${countIngredientes})`,
                  icon: null,
                },
                {
                  id: 'empaque',
                  label: `🎁 Empaques y Cajas (${countEmpaques})`,
                  icon: null,
                },
              ].map((tab) => {
                const activo = filtroTipo === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setFiltroTipo(tab.id as 'todos' | TipoInsumo);
                      setCategoriaActiva('Todas');
                    }}
                    className={`rounded-full px-4 py-2 text-xs font-bold spring-transition cursor-pointer ${
                      activo
                        ? 'bg-[#BE123C] text-white shadow-sm'
                        : 'bg-[#FFF0F3] text-[#7A4957] hover:bg-[#FFE4E9] hover:text-[#2B1118]'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="md:col-span-5 relative">
              <MagnifyingGlass
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#BE123C]"
              />
              <input
                type="text"
                placeholder="Buscar harina, chocolate, caja, sticker..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full rounded-full bg-[#FFF5F7] border border-[#F3C6D3] pl-9 pr-4 py-2 text-xs text-[#2B1118] focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
              />
            </div>
          </div>

          {/* Chips de Categorías */}
          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {categoriasDisponibles.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoriaActiva(cat)}
                className={`shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold spring-transition cursor-pointer ${
                  categoriaActiva === cat
                    ? 'bg-[#2B1118] text-white'
                    : 'bg-[#FFF5F7] text-[#7A4957] border border-[#F3C6D3] hover:bg-[#FFE4E9]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grilla de Tarjetas de Insumos y Empaques */}
      {insumosFiltrados.length === 0 && (
        <div className="bezel-shell">
          <div className="bezel-core p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center mx-auto">
              <Package size={28} weight="duotone" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-editorial text-xl font-bold text-[#2B1118]">
                Todavía no cargaste insumos ni empaques
              </h3>
              <p className="text-xs sm:text-sm text-[#7A4957]">
                Empezá agregando tus ingredientes (harina, azúcar, manteca, chocolate) y tus cajas o bolsas con el precio que los pagás.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => abrirModalNuevo('ingrediente')}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
              >
                <Plus size={15} weight="bold" />
                <span>Cargar mi primer Ingrediente</span>
              </button>
              <button
                type="button"
                onClick={() => abrirModalNuevo('empaque')}
                className="inline-flex items-center gap-2 rounded-full bg-[#2B1118] text-white px-5 py-2.5 text-xs font-bold shadow-sm cursor-pointer"
              >
                <Package size={15} weight="duotone" />
                <span>Cargar mi primer Empaque / Caja</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {insumosFiltrados.map((ins) => {
          const infoUnitario = obtenerCostoUnitarioInsumo(ins);
          const editandoEste = editandoPrecioId === ins.id;
          const stockBajo = ins.stock_minimo > 0 && ins.stock_actual <= ins.stock_minimo;

          return (
            <div key={ins.id} className="bezel-shell">
              <div className="bezel-core p-4 h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-8 h-8 rounded-2xl flex items-center justify-center shrink-0 ${
                          ins.tipo === 'empaque'
                            ? 'bg-[#FEE2E2] text-[#B91C1C]'
                            : 'bg-[#FFE4E9] text-[#BE123C]'
                        }`}
                      >
                        {ins.tipo === 'empaque' ? (
                          <Package size={17} weight="duotone" />
                        ) : (
                          <CookingPot size={17} weight="duotone" />
                        )}
                      </span>
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#7A4957]">
                          {ins.categoria}
                        </span>
                        <h3 className="font-editorial text-base font-bold text-[#2B1118] leading-snug">
                          {ins.nombre}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => abrirModalEditar(ins)}
                        className="w-7 h-7 rounded-full bg-[#FFF0F3] hover:bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center cursor-pointer"
                        title="Editar insumo"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onEliminarInsumo(ins.id)}
                        className="w-7 h-7 rounded-full bg-[#FFF0F3] hover:bg-[#FFE4E9] text-[#9F1239] flex items-center justify-center cursor-pointer"
                        title="Eliminar insumo"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Bloque de Precio de Compra y Costo por Gramo/Unidad */}
                  <div className="mt-3 rounded-2xl bg-[#FFF5F7] border border-[#F3C6D3] p-3">
                    {!editandoEste ? (
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-[11px] text-[#7A4957]">
                            Envase de{' '}
                            <strong className="font-nums text-[#2B1118]">
                              {ins.cantidad_paquete} {ins.unidad}
                            </strong>
                          </div>
                          <div className="font-nums text-lg font-extrabold text-[#BE123C]">
                            {formatearMoneda(ins.precio_compra)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditandoPrecioId(ins.id);
                            setPrecioRapidoVal(ins.precio_compra);
                            setCantidadRapidaVal(ins.cantidad_paquete);
                          }}
                          className="rounded-full bg-white hover:bg-[#FFE4E9] border border-[#F3C6D3] px-3 py-1.5 text-[11px] font-bold text-[#BE123C] shadow-2xs cursor-pointer spring-transition"
                        >
                          Cambiar precio
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[11px] font-bold text-[#BE123C]">
                          Actualizar precio y cantidad del paquete:
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1">
                            <span className="text-[10px] text-[#7A4957]">Precio ($)</span>
                            <input
                              type="number"
                              value={precioRapidoVal}
                              onChange={(e) => setPrecioRapidoVal(Number(e.target.value))}
                              className="w-full font-nums rounded-xl bg-white border border-[#E11D48] px-2.5 py-1 text-xs font-bold text-[#2B1118]"
                            />
                          </div>
                          <div className="w-24">
                            <span className="text-[10px] text-[#7A4957]">Cant. ({ins.unidad})</span>
                            <input
                              type="number"
                              value={cantidadRapidaVal}
                              onChange={(e) => setCantidadRapidaVal(Number(e.target.value))}
                              className="w-full font-nums rounded-xl bg-white border border-[#F3C6D3] px-2 py-1 text-xs font-bold text-[#2B1118]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              await onActualizarPrecioRapido(
                                ins.id,
                                precioRapidoVal,
                                cantidadRapidaVal
                              );
                              setEditandoPrecioId(null);
                            }}
                            className="mt-4 w-8 h-8 rounded-full bg-[#16A34A] text-white flex items-center justify-center cursor-pointer"
                            title="Guardar"
                          >
                            <Check size={15} weight="bold" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditandoPrecioId(null)}
                            className="mt-4 w-8 h-8 rounded-full bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center cursor-pointer"
                            title="Cancelar"
                          >
                            <X size={15} weight="bold" />
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="mt-2 pt-2 border-t border-[#F5D0DC] flex items-center justify-between text-[11px]">
                      <span className="text-[#7A4957]">Costo exacto:</span>
                      <span className="font-nums font-bold text-[#2B1118]">
                        {infoUnitario.etiquetaCostoLegible}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pie de Tarjeta: Stock y Proveedor */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-[#7A4957]">
                  <span className="inline-flex items-center gap-1 truncate max-w-[55%]">
                    <Storefront size={13} className="text-[#BE123C] shrink-0" />
                    {ins.proveedor || 'Compra habitual'}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 font-nums font-semibold px-2 py-0.5 rounded-full ${
                      stockBajo
                        ? 'bg-[#FEE2E2] text-[#991B1B]'
                        : 'bg-[#FFF0F3] text-[#7A4957]'
                    }`}
                  >
                    {stockBajo && <Warning size={12} weight="fill" />}
                    Stock: {ins.stock_actual} {ins.unidad}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal para Crear / Editar Insumo o Empaque */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2B1118]/60 backdrop-blur-md p-0 sm:p-4">
          <div className="w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] bg-[#FFF8F9] border border-[#F3C6D3] shadow-2xl p-5 sm:p-6 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#F3C6D3]">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#BE123C]">
                  {tipo === 'empaque' ? 'Empaque y Descartables' : 'Ingrediente de Pastelería'}
                </span>
                <h3 className="font-editorial text-xl font-bold text-[#2B1118]">
                  {insumoEditando ? `Editar ${insumoEditando.nombre}` : 'Cargar Nuevo Insumo'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalAbierto(false)}
                className="w-9 h-9 rounded-full bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center cursor-pointer"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            <form onSubmit={handleSubmitModal} className="mt-4 space-y-4">
              {/* Tipo: Ingrediente vs Empaque */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-[#FFF0F3] p-1 border border-[#F3C6D3]">
                <button
                  type="button"
                  onClick={() => {
                    setTipo('ingrediente');
                    setCategoria('Harinas y Secos');
                    setUnidad('g');
                  }}
                  className={`rounded-xl py-2 text-xs font-bold cursor-pointer ${
                    tipo === 'ingrediente'
                      ? 'bg-[#BE123C] text-white shadow-xs'
                      : 'text-[#7A4957]'
                  }`}
                >
                  🥣 Ingrediente
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTipo('empaque');
                    setCategoria('Cajas y Bandejas');
                    setUnidad('u');
                  }}
                  className={`rounded-xl py-2 text-xs font-bold cursor-pointer ${
                    tipo === 'empaque'
                      ? 'bg-[#BE123C] text-white shadow-xs'
                      : 'text-[#7A4957]'
                  }`}
                >
                  🎁 Empaque / Caja
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1118] mb-1">
                  Nombre del {tipo === 'empaque' ? 'Empaque' : 'Ingrediente'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    tipo === 'empaque'
                      ? 'Ej: Caja con visor para 6 donas'
                      : 'Ej: Harina 0000 Refinada'
                  }
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full rounded-xl border border-[#F3C6D3] bg-white px-3.5 py-2.5 text-sm text-[#2B1118]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-white px-3 py-2.5 text-xs text-[#2B1118]"
                  >
                    {(tipo === 'empaque' ? CATEGORIAS_EMPAQUE : CATEGORIAS_INGREDIENTE).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Lugar de Compra / Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Cotillón Dulce Rosa"
                    value={proveedor}
                    onChange={(e) => setProveedor(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-white px-3 py-2 text-xs text-[#2B1118]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#BE123C] mb-1">
                    Precio Paquete ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="any"
                    required
                    value={precioCompra}
                    onChange={(e) => setPrecioCompra(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border-2 border-[#E11D48] bg-white px-3 py-2 text-sm font-extrabold text-[#BE123C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Cant. Paquete
                  </label>
                  <input
                    type="number"
                    min={0.01}
                    step="any"
                    required
                    value={cantidadPaquete}
                    onChange={(e) => setCantidadPaquete(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-white px-3 py-2 text-sm font-bold text-[#2B1118]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">Unidad</label>
                  <select
                    value={unidad}
                    onChange={(e) => setUnidad(e.target.value as UnidadMedida)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-white px-2.5 py-2 text-xs font-bold text-[#2B1118]"
                  >
                    <option value="g">Gramos (g)</option>
                    <option value="kg">Kilos (kg)</option>
                    <option value="ml">Mililitros (ml)</option>
                    <option value="l">Litros (l)</option>
                    <option value="u">Unidades (u)</option>
                    <option value="cm">Centímetros (cm)</option>
                  </select>
                </div>
              </div>

              {/* Vista previa instantánea del costo unitario */}
              <div className="rounded-2xl bg-[#FFF0F3] border border-[#F3C6D3] p-3 flex items-center justify-between text-xs">
                <span className="font-semibold text-[#7A4957]">Costo unitario calculado:</span>
                <span className="font-nums font-extrabold text-[#BE123C]">
                  {previewInsumoModal.etiquetaCostoLegible}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Stock actual en casa ({unidad})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stockActual}
                    onChange={(e) => setStockActual(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-white px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Avisar si baja de ({unidad})
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stockMinimo}
                    onChange={(e) => setStockMinimo(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-white px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalAbierto(false)}
                  className="rounded-full bg-[#FFE4E9] text-[#BE123C] px-4 py-2 text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={guardando}
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white px-5 py-2.5 text-xs font-bold shadow-md cursor-pointer"
                >
                  <FloppyDisk size={16} weight="duotone" />
                  <span>{guardando ? 'Guardando...' : 'Guardar Insumo'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
