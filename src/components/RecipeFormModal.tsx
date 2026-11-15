'use client';

import React, { useState, useMemo } from 'react';
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
  redondearPrecioComercial,
} from '@/lib/costing';
import {
  X,
  Plus,
  Trash,
  FloppyDisk,
  CookingPot,
  Package,
  Heart,
  ListNumbers,
  Sparkle,
  Check,
} from '@phosphor-icons/react';

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

const CATEGORIAS_RECETA = ['Donas', 'Cupcakes', 'Tortas', 'Cookies', 'Alfajores', 'Tartas', 'Boxes y Combos'];
const METODOS_COCCION = ['Horno', 'Fritura', 'Frío / Heladera', 'Baño María', 'Sin cocción'];

export default function RecipeFormModal({
  recetaInicial,
  insumos,
  onClose,
  onCrearInsumoRapido,
  onSave,
}: RecipeFormModalProps) {
  const [nombre, setNombre] = useState(recetaInicial?.nombre || '');
  const [categoria, setCategoria] = useState(recetaInicial?.categoria || 'Donas');
  const [descripcion, setDescripcion] = useState(recetaInicial?.descripcion || '');
  const [rendimientoCantidad, setRendimientoCantidad] = useState<number>(
    recetaInicial?.rendimiento_cantidad || 12
  );
  const [rendimientoUnidad, setRendimientoUnidad] = useState(
    recetaInicial?.rendimiento_unidad || 'unidades'
  );
  const [unidadesPorPack, setUnidadesPorPack] = useState<number>(
    recetaInicial?.unidades_por_pack || 6
  );
  const [nombrePack, setNombrePack] = useState(recetaInicial?.nombre_pack || 'Caja x6');
  const [porcentajeExtras, setPorcentajeExtras] = useState<number>(
    recetaInicial?.porcentaje_gastos_extras ?? 10
  );
  const [margenObjetivo, setMargenObjetivo] = useState<number>(
    recetaInicial?.margen_objetivo_porcentaje ?? 60
  );
  const [precioVentaPack, setPrecioVentaPack] = useState<number>(
    recetaInicial?.precio_venta_pack || 0
  );
  const [tiempoPrep, setTiempoPrep] = useState<number>(
    recetaInicial?.tiempo_preparacion_min || 40
  );
  const [tiempoHorneado, setTiempoHorneado] = useState<number>(
    recetaInicial?.tiempo_horneado_min || 20
  );
  const [temperaturaHorno, setTemperaturaHorno] = useState<number>(
    recetaInicial?.temperatura_horno_c ?? 180
  );
  const [metodoCoccion, setMetodoCoccion] = useState(
    recetaInicial?.metodo_coccion || 'Horno'
  );
  const [notasChefcita, setNotasChefcita] = useState(recetaInicial?.notas_chefcita || '');
  const [favorita] = useState<boolean>(recetaInicial?.favorita ?? true);

  // Mini creador rápido de insumo dentro de la receta
  const [creandoInsumoSeccion, setCreandoInsumoSeccion] = useState<SeccionRecetaItem | null>(null);
  const [nuevoInsNombre, setNuevoInsNombre] = useState('');
  const [nuevoInsPrecio, setNuevoInsPrecio] = useState<number>(1500);
  const [nuevoInsCantPaq, setNuevoInsCantPaq] = useState<number>(1000);
  const [nuevoInsUnidad, setNuevoInsUnidad] = useState<UnidadMedida>('g');
  const [nuevoInsCantUsada, setNuevoInsCantUsada] = useState<number>(250);

  const insumosIngredientes = useMemo(
    () => insumos.filter((i) => i.tipo === 'ingrediente'),
    [insumos]
  );
  const insumosEmpaques = useMemo(
    () => insumos.filter((i) => i.tipo === 'empaque'),
    [insumos]
  );
  const insumosMap = useMemo(
    () => new Map<string, Insumo>(insumos.map((i) => [i.id, i])),
    [insumos]
  );

  // Items del formulario
  const [items, setItems] = useState<
    Array<{
      tempId: string;
      insumo_id: string;
      seccion: SeccionRecetaItem;
      cantidad: number;
      unidad: UnidadMedida;
      nota: string;
    }>
  >(() => {
    if (recetaInicial && recetaInicial.items.length > 0) {
      return recetaInicial.items.map((it) => ({
        tempId: it.id || crypto.randomUUID(),
        insumo_id: it.insumo_id,
        seccion: it.seccion,
        cantidad: it.cantidad,
        unidad: it.unidad,
        nota: it.nota || '',
      }));
    }
    return [];
  });

  // Pasos de preparación
  const [pasos, setPasos] = useState<
    Array<{
      tempId: string;
      etapa: string;
      instruccion: string;
      tiempo_timer_min: number | null;
      tip_secreto: string;
    }>
  >(() => {
    if (recetaInicial && recetaInicial.pasos.length > 0) {
      return recetaInicial.pasos.map((p) => ({
        tempId: p.id || crypto.randomUUID(),
        etapa: p.etapa,
        instruccion: p.instruccion,
        tiempo_timer_min: p.tiempo_timer_min,
        tip_secreto: p.tip_secreto || '',
      }));
    }
    return [
      {
        tempId: 'p-1',
        etapa: 'Preparación',
        instruccion: '',
        tiempo_timer_min: null,
        tip_secreto: '',
      },
    ];
  });

  const [guardando, setGuardando] = useState(false);

  const agregarItemExistente = (seccion: SeccionRecetaItem) => {
    const listaCandidata = seccion === 'empaque' ? insumosEmpaques : insumosIngredientes;
    const defaultInsumo = listaCandidata[0] || insumos[0];
    if (!defaultInsumo) {
      // Si aún no hay insumos creados, abrimos el mini-creador rápido directo en esa sección
      abrirMiniCreadorInsumo(seccion);
      return;
    }
    setItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        insumo_id: defaultInsumo.id,
        seccion,
        cantidad: seccion === 'empaque' ? 1 : 100,
        unidad: defaultInsumo.unidad,
        nota: '',
      },
    ]);
  };

  const abrirMiniCreadorInsumo = (seccion: SeccionRecetaItem) => {
    setCreandoInsumoSeccion(seccion);
    setNuevoInsNombre('');
    if (seccion === 'empaque') {
      setNuevoInsPrecio(5000);
      setNuevoInsCantPaq(10);
      setNuevoInsUnidad('u');
      setNuevoInsCantUsada(2);
    } else {
      setNuevoInsPrecio(1500);
      setNuevoInsCantPaq(1000);
      setNuevoInsUnidad('g');
      setNuevoInsCantUsada(250);
    }
  };

  const handleConfirmarMiniInsumo = async () => {
    if (!nuevoInsNombre.trim() || !creandoInsumoSeccion) return;
    const tipoInsumo: TipoInsumo = creandoInsumoSeccion === 'empaque' ? 'empaque' : 'ingrediente';
    const creado = await onCrearInsumoRapido({
      nombre: nuevoInsNombre.trim(),
      tipo: tipoInsumo,
      categoria: tipoInsumo === 'empaque' ? 'Cajas y Bandejas' : 'Harinas y Secos',
      precio_compra: Number(nuevoInsPrecio) || 0,
      cantidad_paquete: Math.max(0.01, Number(nuevoInsCantPaq) || 1),
      unidad: nuevoInsUnidad,
      stock_actual: Number(nuevoInsCantPaq) || 0,
      stock_minimo: 0,
      proveedor: '',
      notas: '',
    });

    setItems((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        insumo_id: creado.id,
        seccion: creandoInsumoSeccion,
        cantidad: Number(nuevoInsCantUsada) || 1,
        unidad: creado.unidad,
        nota: '',
      },
    ]);
    setCreandoInsumoSeccion(null);
  };

  const eliminarItem = (tempId: string) => {
    setItems((prev) => prev.filter((it) => it.tempId !== tempId));
  };

  const actualizarItem = (
    tempId: string,
    cambios: Partial<{
      insumo_id: string;
      cantidad: number;
      unidad: UnidadMedida;
      nota: string;
    }>
  ) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.tempId !== tempId) return it;
        const nuevo = { ...it, ...cambios };
        if (cambios.insumo_id) {
          const ins = insumosMap.get(cambios.insumo_id);
          if (ins) nuevo.unidad = ins.unidad;
        }
        return nuevo;
      })
    );
  };

  // Cálculo en vivo de costos dentro del modal
  const resumenVivo = useMemo(() => {
    let masa = 0;
    let relleno = 0;
    let empaque = 0;

    for (const it of items) {
      const ins = insumosMap.get(it.insumo_id);
      const costo = calcularCostoItemReceta(
        {
          id: it.tempId,
          receta_id: '',
          insumo_id: it.insumo_id,
          seccion: it.seccion,
          cantidad: it.cantidad,
          unidad: it.unidad,
          nota: it.nota,
          orden: 1,
        },
        ins,
        1
      );
      if (it.seccion === 'masa') masa += costo;
      else if (it.seccion === 'relleno_cobertura') relleno += costo;
      else empaque += costo;
    }

    const extras = (masa + relleno) * ((Number(porcentajeExtras) || 0) / 100);
    const costoTotalLote = masa + relleno + empaque + extras;
    const rend = Math.max(1, Number(rendimientoCantidad) || 1);
    const unidPack = Math.max(1, Number(unidadesPorPack) || 1);
    const costoUnidad = costoTotalLote / rend;
    const costoPack = costoUnidad * unidPack;
    const divisorMargen = 1 - Math.min(Math.max(Number(margenObjetivo) || 55, 10), 90) / 100;
    const sugeridoPack = redondearPrecioComercial(costoPack / divisorMargen);

    return {
      masa,
      relleno,
      empaque,
      extras,
      costoTotalLote,
      costoUnidad,
      costoPack,
      sugeridoPack,
    };
  }, [items, insumosMap, porcentajeExtras, rendimientoCantidad, unidadesPorPack, margenObjetivo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;
    setGuardando(true);
    try {
      const rend = Math.max(1, Number(rendimientoCantidad) || 1);
      const unidPack = Math.max(1, Number(unidadesPorPack) || 1);
      const packsEnLote = rend / unidPack;
      const pPack = Number(precioVentaPack) > 0 ? Number(precioVentaPack) : resumenVivo.sugeridoPack;
      const pUnidad = redondearPrecioComercial(pPack / unidPack);
      const pLote = Math.round(pPack * packsEnLote);

      await onSave(
        {
          id: recetaInicial?.id,
          nombre,
          categoria,
          descripcion,
          rendimiento_cantidad: rend,
          rendimiento_unidad: rendimientoUnidad,
          unidades_por_pack: unidPack,
          nombre_pack: nombrePack,
          porcentaje_gastos_extras: Number(porcentajeExtras) || 0,
          costo_mano_obra_lote: 0,
          margen_objetivo_porcentaje: Number(margenObjetivo) || 60,
          precio_venta_unidad: pUnidad,
          precio_venta_pack: pPack,
          precio_venta_lote: pLote,
          tiempo_preparacion_min: Number(tiempoPrep) || 30,
          tiempo_horneado_min: Number(tiempoHorneado) || 20,
          temperatura_horno_c: Number(temperaturaHorno) || 0,
          metodo_coccion: metodoCoccion,
          notas_chefcita: notasChefcita,
          color_tag: 'rose',
          favorita,
        },
        items.map((it, idx) => ({
          insumo_id: it.insumo_id,
          seccion: it.seccion,
          cantidad: Number(it.cantidad) || 1,
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
            tiempo_timer_min: p.tiempo_timer_min ? Number(p.tiempo_timer_min) : null,
            tip_secreto: p.tip_secreto,
          }))
      );
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#2B1118]/60 backdrop-blur-md p-0 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-4xl max-h-[94dvh] overflow-y-auto rounded-t-[32px] sm:rounded-[32px] bg-[#FFF8F9] border border-[#F3C6D3] shadow-2xl p-4 sm:p-6">
        <div className="flex items-center justify-between pb-4 border-b border-[#F3C6D3] sticky top-0 bg-[#FFF8F9] z-10">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#BE123C]">
              Atelier de Recetas y Costos
            </span>
            <h2 className="font-editorial text-xl sm:text-2xl font-bold text-[#2B1118]">
              {recetaInicial ? `Editar: ${recetaInicial.nombre}` : 'Nueva Receta y Estructura de Costos'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#FFE4E9] text-[#BE123C] flex items-center justify-center hover:bg-[#FECDD3] cursor-pointer"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-6">
          {/* Datos Generales y Rendimiento */}
          <div className="bezel-shell">
            <div className="bezel-core p-4 sm:p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Nombre del Producto / Receta *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Donas Glaseadas, Torta Matilda..."
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3.5 py-2.5 text-sm text-[#2B1118] focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">Categoría</label>
                  <select
                    value={categoria}
                    onChange={(e) => setCategoria(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3.5 py-2.5 text-sm text-[#2B1118] focus:outline-none focus:ring-2 focus:ring-[#E11D48]"
                  >
                    {CATEGORIAS_RECETA.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1118] mb-1">
                  Descripción breve
                </label>
                <input
                  type="text"
                  placeholder="Ej: Masa esponjosa bañada en chocolate rosa y granas..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3.5 py-2 text-sm text-[#2B1118]"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Rinde (Cantidad)
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={rendimientoCantidad}
                    onChange={(e) => setRendimientoCantidad(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-sm font-bold text-[#BE123C]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Unidad que rinde
                  </label>
                  <input
                    type="text"
                    placeholder="donas, porciones..."
                    value={rendimientoUnidad}
                    onChange={(e) => setRendimientoUnidad(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-sm text-[#2B1118]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Nombre del Pack/Caja
                  </label>
                  <input
                    type="text"
                    placeholder="Caja x6 Donas"
                    value={nombrePack}
                    onChange={(e) => setNombrePack(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-sm text-[#2B1118]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Unidades por Pack
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={unidadesPorPack}
                    onChange={(e) => setUnidadesPorPack(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-sm font-bold text-[#BE123C]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIONES DE INSUMOS: 1. MASA | 2. RELLENO/BAÑO | 3. EMPAQUE */}
          {[
            {
              seccion: 'masa' as SeccionRecetaItem,
              titulo: '1. Ingredientes de la Masa / Base',
              subtitulo: 'Harina, huevos, leche, manteca, azúcar, levadura...',
              color: 'text-[#BE123C]',
              icono: <CookingPot size={18} weight="duotone" />,
              subtotal: resumenVivo.masa,
            },
            {
              seccion: 'relleno_cobertura' as SeccionRecetaItem,
              titulo: '2. Relleno, Cobertura y Decoración',
              subtitulo: 'Chocolate baño, dulce de leche, glasé, crema, granas...',
              color: 'text-[#BE185D]',
              icono: <Heart size={18} weight="duotone" />,
              subtotal: resumenVivo.relleno,
            },
            {
              seccion: 'empaque' as SeccionRecetaItem,
              titulo: '3. Empaque y Descartables de la Tanda',
              subtitulo: 'Cajas con visor, bandejas, papel antigrasa, stickers, cinta...',
              color: 'text-[#B91C1C]',
              icono: <Package size={18} weight="duotone" />,
              subtotal: resumenVivo.empaque,
            },
          ].map((bloque) => {
            const itemsSeccion = items.filter((i) => i.seccion === bloque.seccion);
            const mostrandoCreadorAqui = creandoInsumoSeccion === bloque.seccion;

            return (
              <div key={bloque.seccion} className="bezel-shell">
                <div className="bezel-core p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#F8DCE4]">
                    <div className="flex items-center gap-2">
                      <span className={bloque.color}>{bloque.icono}</span>
                      <div>
                        <h3 className="font-editorial text-base sm:text-lg font-bold text-[#2B1118]">
                          {bloque.titulo}
                        </h3>
                        <p className="text-xs text-[#7A4957]">{bloque.subtitulo}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-nums text-xs sm:text-sm font-extrabold text-[#BE123C]">
                        Subtotal: {formatearMoneda(bloque.subtotal)}
                      </span>
                      {insumos.length > 0 && (
                        <button
                          type="button"
                          onClick={() => agregarItemExistente(bloque.seccion)}
                          className="inline-flex items-center gap-1 rounded-full bg-[#FFE4E9] hover:bg-[#FECDD3] text-[#BE123C] px-3 py-1.5 text-xs font-bold cursor-pointer"
                        >
                          <Plus size={14} weight="bold" />
                          Elegir de mis insumos
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirMiniCreadorInsumo(bloque.seccion)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#2B1118] text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Plus size={14} weight="bold" />
                        Crear insumo nuevo acá
                      </button>
                    </div>
                  </div>

                  {/* Mini creador rápido de Insumo dentro de la sección */}
                  {mostrandoCreadorAqui && (
                    <div className="mt-3 rounded-2xl bg-[#FFF0F3] border-2 border-[#E11D48] p-3.5 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#BE123C]">
                          Crear nuevo {bloque.seccion === 'empaque' ? 'empaque' : 'ingrediente'} y sumarlo a esta sección:
                        </span>
                        <button
                          type="button"
                          onClick={() => setCreandoInsumoSeccion(null)}
                          className="text-xs text-[#7A4957] hover:text-[#2B1118] cursor-pointer"
                        >
                          Cerrar
                        </button>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] font-bold text-[#7A4957]">
                            Nombre (ej: Harina, Caja x6)
                          </label>
                          <input
                            type="text"
                            placeholder="Nombre del insumo"
                            value={nuevoInsNombre}
                            onChange={(e) => setNuevoInsNombre(e.target.value)}
                            className="w-full rounded-xl bg-white border border-[#F3C6D3] px-2.5 py-1.5 text-xs font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#7A4957]">
                            Precio Paquete ($)
                          </label>
                          <input
                            type="number"
                            value={nuevoInsPrecio}
                            onChange={(e) => setNuevoInsPrecio(Number(e.target.value))}
                            className="w-full font-nums rounded-xl bg-white border border-[#F3C6D3] px-2.5 py-1.5 text-xs font-bold text-[#BE123C]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#7A4957]">
                            Viene en el paquete
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={nuevoInsCantPaq}
                              onChange={(e) => setNuevoInsCantPaq(Number(e.target.value))}
                              className="w-full font-nums rounded-xl bg-white border border-[#F3C6D3] px-2 py-1.5 text-xs font-bold"
                            />
                            <select
                              value={nuevoInsUnidad}
                              onChange={(e) => setNuevoInsUnidad(e.target.value as UnidadMedida)}
                              className="rounded-xl bg-white border border-[#F3C6D3] px-1.5 py-1.5 text-xs font-bold"
                            >
                              <option value="g">g</option>
                              <option value="kg">kg</option>
                              <option value="ml">ml</option>
                              <option value="l">l</option>
                              <option value="u">u</option>
                              <option value="cm">cm</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-[#15803D]">
                            Usás en esta receta
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="number"
                              value={nuevoInsCantUsada}
                              onChange={(e) => setNuevoInsCantUsada(Number(e.target.value))}
                              className="w-full font-nums rounded-xl bg-white border border-[#16A34A] px-2 py-1.5 text-xs font-bold text-[#15803D]"
                            />
                            <button
                              type="button"
                              onClick={handleConfirmarMiniInsumo}
                              className="rounded-xl bg-[#16A34A] text-white px-3 py-1.5 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Check size={14} weight="bold" />
                              Sumar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {itemsSeccion.length === 0 ? (
                    <p className="text-xs text-[#7A4957] py-4 text-center">
                      Todavía no sumaste insumos en esta sección. Tocá{' '}
                      <strong>&ldquo;+ Crear insumo nuevo acá&rdquo;</strong> o{' '}
                      <strong>&ldquo;+ Elegir de mis insumos&rdquo;</strong>.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-2.5">
                      {itemsSeccion.map((item) => {
                        const insumoObj = insumosMap.get(item.insumo_id);
                        const costoCalculado = calcularCostoItemReceta(
                          {
                            id: item.tempId,
                            receta_id: '',
                            insumo_id: item.insumo_id,
                            seccion: item.seccion,
                            cantidad: item.cantidad,
                            unidad: item.unidad,
                            nota: item.nota,
                            orden: 1,
                          },
                          insumoObj,
                          1
                        );
                        return (
                          <div
                            key={item.tempId}
                            className="grid grid-cols-12 gap-2 items-center rounded-2xl bg-[#FFF5F7] p-2.5 border border-[#F3C6D3]"
                          >
                            <div className="col-span-12 sm:col-span-5">
                              <select
                                value={item.insumo_id}
                                onChange={(e) =>
                                  actualizarItem(item.tempId, { insumo_id: e.target.value })
                                }
                                className="w-full rounded-xl bg-white border border-[#F3C6D3] px-2.5 py-1.5 text-xs font-semibold text-[#2B1118]"
                              >
                                {insumos.map((ins) => (
                                  <option key={ins.id} value={ins.id}>
                                    {ins.tipo === 'empaque' ? '🎁 ' : '🥣 '}
                                    {ins.nombre} ({formatearMoneda(ins.precio_compra)} /{' '}
                                    {ins.cantidad_paquete}
                                    {ins.unidad})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="col-span-4 sm:col-span-2">
                              <input
                                type="number"
                                step="any"
                                min={0.1}
                                value={item.cantidad}
                                onChange={(e) =>
                                  actualizarItem(item.tempId, { cantidad: Number(e.target.value) })
                                }
                                className="w-full font-nums rounded-xl bg-white border border-[#F3C6D3] px-2.5 py-1.5 text-xs font-bold text-[#BE123C] text-center"
                              />
                            </div>
                            <div className="col-span-3 sm:col-span-2">
                              <select
                                value={item.unidad}
                                onChange={(e) =>
                                  actualizarItem(item.tempId, {
                                    unidad: e.target.value as UnidadMedida,
                                  })
                                }
                                className="w-full rounded-xl bg-white border border-[#F3C6D3] px-2 py-1.5 text-xs text-[#2B1118]"
                              >
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="ml">ml</option>
                                <option value="l">l</option>
                                <option value="u">u (unid)</option>
                                <option value="cm">cm</option>
                              </select>
                            </div>
                            <div className="col-span-3 sm:col-span-2 text-right font-nums text-xs font-extrabold text-[#2B1118]">
                              {formatearMoneda(costoCalculado)}
                            </div>
                            <div className="col-span-2 sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => eliminarItem(item.tempId)}
                                className="w-7 h-7 rounded-full bg-white text-[#9F1239] hover:bg-[#FFE4E9] flex items-center justify-center cursor-pointer"
                              >
                                <Trash size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* RESUMEN EN VIVO Y PRECIO DE VENTA */}
          <div className="bezel-shell-crimson">
            <div className="bezel-core p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#BE123C]">
                    Vista Previa de Costos y Precio
                  </span>
                  <h3 className="font-editorial text-lg font-bold text-[#2B1118]">
                    Costo por {nombrePack}: {formatearMoneda(resumenVivo.costoPack)} · Sugerido:{' '}
                    {formatearMoneda(resumenVivo.sugeridoPack)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPrecioVentaPack(resumenVivo.sugeridoPack)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#FFE4E9] text-[#BE123C] px-3.5 py-1.5 text-xs font-bold cursor-pointer"
                >
                  <Sparkle size={14} weight="fill" />
                  Usar precio sugerido ({formatearMoneda(resumenVivo.sugeridoPack)})
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    % Gastos Extras (Horno, luz, gas)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={porcentajeExtras}
                    onChange={(e) => setPorcentajeExtras(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-sm font-bold text-[#2B1118]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    % Margen de Ganancia Objetivo
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={85}
                    value={margenObjetivo}
                    onChange={(e) => setMargenObjetivo(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-sm font-bold text-[#2B1118]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#BE123C] mb-1">
                    Tu Precio de Venta por {nombrePack} ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    placeholder={String(resumenVivo.sugeridoPack)}
                    value={precioVentaPack || ''}
                    onChange={(e) => setPrecioVentaPack(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border-2 border-[#E11D48] bg-white px-3 py-2 text-base font-extrabold text-[#BE123C]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* PASOS DE PREPARACIÓN Y COCCIÓN */}
          <div className="bezel-shell">
            <div className="bezel-core p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#F8DCE4]">
                <div className="flex items-center gap-2">
                  <ListNumbers size={18} className="text-[#BE123C]" />
                  <h3 className="font-editorial text-lg font-bold text-[#2B1118]">
                    Pasos del Recetario y Tiempos
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setPasos((prev) => [
                      ...prev,
                      {
                        tempId: crypto.randomUUID(),
                        etapa: `Paso ${prev.length + 1}`,
                        instruccion: '',
                        tiempo_timer_min: null,
                        tip_secreto: '',
                      },
                    ])
                  }
                  className="inline-flex items-center gap-1 rounded-full bg-[#FFE4E9] text-[#BE123C] px-3 py-1.5 text-xs font-bold cursor-pointer"
                >
                  <Plus size={14} weight="bold" />
                  Sumar paso
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Método Cocción
                  </label>
                  <select
                    value={metodoCoccion}
                    onChange={(e) => setMetodoCoccion(e.target.value)}
                    className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-xs text-[#2B1118]"
                  >
                    {METODOS_COCCION.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Temp (°C)
                  </label>
                  <input
                    type="number"
                    value={temperaturaHorno}
                    onChange={(e) => setTemperaturaHorno(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Prep. (min)
                  </label>
                  <input
                    type="number"
                    value={tiempoPrep}
                    onChange={(e) => setTiempoPrep(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#2B1118] mb-1">
                    Cocción (min)
                  </label>
                  <input
                    type="number"
                    value={tiempoHorneado}
                    onChange={(e) => setTiempoHorneado(Number(e.target.value))}
                    className="w-full font-nums rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3 py-2 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="space-y-3">
                {pasos.map((p, idx) => (
                  <div
                    key={p.tempId}
                    className="rounded-2xl bg-[#FFF5F7] border border-[#F3C6D3] p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-6 h-6 rounded-full bg-[#BE123C] text-white font-nums text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          placeholder="Título de etapa (ej: Amasado, Leudado, Horneado)"
                          value={p.etapa}
                          onChange={(e) =>
                            setPasos((prev) =>
                              prev.map((item) =>
                                item.tempId === p.tempId ? { ...item, etapa: e.target.value } : item
                              )
                            )
                          }
                          className="rounded-xl bg-white border border-[#F3C6D3] px-3 py-1 text-xs font-bold text-[#2B1118] flex-1"
                        />
                        <input
                          type="number"
                          placeholder="Timer (min)"
                          value={p.tiempo_timer_min ?? ''}
                          onChange={(e) =>
                            setPasos((prev) =>
                              prev.map((item) =>
                                item.tempId === p.tempId
                                  ? {
                                      ...item,
                                      tiempo_timer_min: e.target.value
                                        ? Number(e.target.value)
                                        : null,
                                    }
                                  : item
                              )
                            )
                          }
                          className="w-24 font-nums rounded-xl bg-white border border-[#F3C6D3] px-2.5 py-1 text-xs text-center"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setPasos((prev) => prev.filter((item) => item.tempId !== p.tempId))
                        }
                        className="text-[#9F1239] hover:text-[#BE123C] p-1 cursor-pointer"
                      >
                        <Trash size={15} />
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      placeholder="Explicación del paso..."
                      value={p.instruccion}
                      onChange={(e) =>
                        setPasos((prev) =>
                          prev.map((item) =>
                            item.tempId === p.tempId
                              ? { ...item, instruccion: e.target.value }
                              : item
                          )
                        )
                      }
                      className="w-full rounded-xl bg-white border border-[#F3C6D3] px-3 py-2 text-xs text-[#2B1118]"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1118] mb-1">
                  Secreto / Tip de la Chefcita
                </label>
                <input
                  type="text"
                  placeholder="Ej: Conservar en caja cerrada hasta 48 hs..."
                  value={notasChefcita}
                  onChange={(e) => setNotasChefcita(e.target.value)}
                  className="w-full rounded-xl border border-[#F3C6D3] bg-[#FFF9FA] px-3.5 py-2 text-xs text-[#2B1118]"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-[#FFE4E9] text-[#BE123C] px-5 py-2.5 text-xs font-bold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#BE123C] to-[#E11D48] text-white px-6 py-2.5 text-xs sm:text-sm font-bold shadow-md cursor-pointer"
            >
              <FloppyDisk size={18} weight="duotone" />
              <span>{guardando ? 'Guardando...' : 'Guardar Receta y Costos'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
