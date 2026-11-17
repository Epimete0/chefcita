'use client';

import React, { useMemo, useState } from 'react';
import { EstadoPedido, Insumo, Pedido, Receta } from '@/lib/types';
import {
  calcularCostosReceta,
  calcularListaCompras,
  describirFecha,
  formatearMoneda,
  formatearCantidad,
  hoyISO,
  sumarDiasISO,
  ItemCompra,
} from '@/lib/costing';
import {
  Sheet,
  Campo,
  CampoDinero,
  Segmentos,
  Vacio,
  EncabezadoVista,
  Etiqueta,
  Confirmar,
  Tono,
} from './ui';
import {
  Plus,
  Trash,
  ClipboardText,
  PencilSimple,
  Copy,
  Check,
  ShoppingBag,
  MagnifyingGlass,
  CheckCircle,
  Circle,
} from '@phosphor-icons/react';

const ESTADO: Record<EstadoPedido, { texto: string; tono: Tono }> = {
  pendiente: { texto: 'Por preparar', tono: 'neutro' },
  en_preparacion: { texto: 'Preparando', tono: 'warn' },
  listo: { texto: 'Listo para entregar', tono: 'ok' },
  entregado: { texto: 'Entregado', tono: 'neutro' },
};

const SIGUIENTE: Record<EstadoPedido, { estado: EstadoPedido; accion: string } | null> = {
  pendiente: { estado: 'en_preparacion', accion: 'Empezar a preparar' },
  en_preparacion: { estado: 'listo', accion: 'Ya está listo' },
  listo: { estado: 'entregado', accion: 'Entregado y pagado' },
  entregado: null,
};

const TONO_FECHA: Record<string, Tono> = {
  atrasado: 'bad',
  hoy: 'berry',
  pronto: 'warn',
  normal: 'neutro',
};

/* -------------------------------------------------------------------------- */
/* Tarjeta de un pedido: qué es, cuánto falta cobrar y el siguiente paso       */
/* -------------------------------------------------------------------------- */

export function TarjetaPedido({
  pedido,
  onCambiarEstado,
  onEditar,
}: {
  pedido: Pedido;
  onCambiarEstado: (pedido: Pedido, estado: EstadoPedido) => void;
  onEditar: (pedido: Pedido) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const fecha = describirFecha(pedido.fecha_entrega);
  const entregado = pedido.estado === 'entregado';
  const faltaCobrar = Math.max(0, pedido.precio_venta_total - pedido.seña_pagada);
  const siguiente = SIGUIENTE[pedido.estado];

  const copiarPedido = async () => {
    const lineas = [
      `Pedido · ${pedido.cliente_nombre}`,
      `${pedido.unidades_totales} × ${pedido.receta_nombre_snapshot}`,
      `Entrega: ${fecha.texto.replace('Atrasado · ', '')}`,
      `Total: ${formatearMoneda(pedido.precio_venta_total)}`,
      ...(pedido.seña_pagada > 0 && !entregado
        ? [`Abonado: ${formatearMoneda(pedido.seña_pagada)}`]
        : []),
      ...(!entregado
        ? [faltaCobrar > 0 ? `Falta cobrar: ${formatearMoneda(faltaCobrar)}` : 'Pagado completo']
        : []),
    ].join('\n');
    try {
      await navigator.clipboard.writeText(lineas);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Ignorar si clipboard no está disponible
    }
  };

  const acentoUrgencia =
    !entregado && fecha.tono === 'atrasado'
      ? 'border-l-4 border-l-bad'
      : !entregado && fecha.tono === 'hoy'
        ? 'border-l-4 border-l-berry'
        : '';

  const indiceEstado =
    pedido.estado === 'pendiente' ? 0 : pedido.estado === 'en_preparacion' ? 1 : 2;

  return (
    <article className={`card card-interactive flex min-w-0 flex-col justify-between p-4 sm:p-5 ${acentoUrgencia}`}>
      <div>
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {!entregado && <Etiqueta tono={TONO_FECHA[fecha.tono]}>{fecha.texto}</Etiqueta>}
          <Etiqueta tono={ESTADO[pedido.estado].tono}>{ESTADO[pedido.estado].texto}</Etiqueta>
          <div className="-my-1 -mr-2 ml-auto flex items-center">
            <button
              type="button"
              onClick={copiarPedido}
              aria-label={`Copiar resumen del pedido de ${pedido.cliente_nombre}`}
              title={copiado ? 'Copiado' : 'Copiar resumen para enviar'}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              {copiado ? <Check size={17} weight="bold" className="text-ok" /> : <Copy size={17} />}
            </button>
            <button
              type="button"
              onClick={() => onEditar(pedido)}
              aria-label={`Editar pedido de ${pedido.cliente_nombre}`}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
            >
              <PencilSimple size={18} />
            </button>
          </div>
        </div>

        <h3 className="font-display mt-2.5 text-lg font-bold leading-snug">{pedido.cliente_nombre}</h3>
        <p className="text-[0.9375rem] text-ink-soft">
          <span className="num font-semibold text-ink">{pedido.unidades_totales}</span> ×{' '}
          {pedido.receta_nombre_snapshot}
          {entregado && ` · ${fecha.texto.replace('Atrasado · ', '')}`}
        </p>
        {pedido.notas && (
          <p className="mt-1.5 rounded-lg bg-paper/80 px-2.5 py-1.5 text-sm text-ink-soft">
            “{pedido.notas}”
          </p>
        )}

        {!entregado && (
          <div className="mt-3 flex items-center gap-1.5" aria-hidden="true">
            {['Por preparar', 'Preparando', 'Listo'].map((label, i) => (
              <div key={label} className="flex flex-1 items-center gap-1.5">
                <span
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    i <= indiceEstado
                      ? indiceEstado === 2
                        ? 'bg-ok'
                        : 'bg-berry'
                      : 'bg-sunken'
                  }`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-line pt-3">
        {!entregado && pedido.seña_pagada > 0 && faltaCobrar > 0 && pedido.precio_venta_total > 0 && (
          <div className="mb-2.5 h-1.5 w-full overflow-hidden rounded-full bg-sunken">
            <div
              className="h-full rounded-full bg-ok transition-[width] duration-300"
              style={{
                width: `${Math.min(100, Math.round((pedido.seña_pagada / pedido.precio_venta_total) * 100))}%`,
              }}
            />
          </div>
        )}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="num text-sm text-ink-soft">
            Total {formatearMoneda(pedido.precio_venta_total)}
            {pedido.seña_pagada > 0 && !entregado && ` · abonó ${formatearMoneda(pedido.seña_pagada)}`}
            <div className="text-[0.9375rem] font-bold text-ink">
              {entregado
                ? `Ganaste ${formatearMoneda(pedido.ganancia_neta)}`
                : faltaCobrar > 0
                  ? `Falta cobrar ${formatearMoneda(faltaCobrar)}`
                  : 'Ya está pagado'}
            </div>
          </div>
          {siguiente ? (
            <button
              type="button"
              className={`btn btn-sm ${siguiente.estado === 'entregado' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => onCambiarEstado(pedido, siguiente.estado)}
            >
              {siguiente.accion}
            </button>
          ) : (
            <button
              type="button"
              className="cursor-pointer rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-soft transition-colors hover:bg-sunken hover:text-ink"
              onClick={() => onCambiarEstado(pedido, 'listo')}
            >
              Deshacer entrega
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

/* -------------------------------------------------------------------------- */
/* Formulario para anotar o editar un pedido                                   */
/* -------------------------------------------------------------------------- */

export function PedidoFormSheet({
  pedidoInicial,
  recetaInicialId,
  recetas,
  insumosMap,
  onClose,
  onGuardar,
  onEliminar,
}: {
  pedidoInicial?: Pedido | null;
  recetaInicialId?: string;
  recetas: Receta[];
  insumosMap: Map<string, Insumo>;
  onClose: () => void;
  onGuardar: (pedido: Omit<Pedido, 'id'> & { id?: string }) => Promise<void>;
  onEliminar?: (id: string) => Promise<void>;
}) {
  const recetaDePartida =
    recetas.find((r) => r.id === (pedidoInicial?.receta_id || recetaInicialId)) || recetas[0];

  const [cliente, setCliente] = useState(pedidoInicial?.cliente_nombre || '');
  const [recetaId, setRecetaId] = useState(recetaDePartida?.id || '');
  const [unidades, setUnidades] = useState(
    pedidoInicial
      ? String(pedidoInicial.unidades_totales)
      : String(
          recetaDePartida
            ? recetaDePartida.unidades_por_pack > 1
              ? recetaDePartida.unidades_por_pack
              : recetaDePartida.rendimiento_cantidad
            : ''
        )
  );
  const [fecha, setFecha] = useState(pedidoInicial?.fecha_entrega || hoyISO());
  const [precio, setPrecio] = useState(
    pedidoInicial ? String(pedidoInicial.precio_venta_total) : ''
  );
  const [abono, setAbono] = useState(
    pedidoInicial && pedidoInicial.seña_pagada > 0 ? String(pedidoInicial.seña_pagada) : ''
  );
  const [notas, setNotas] = useState(pedidoInicial?.notas || '');
  const [intento, setIntento] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  const receta = recetas.find((r) => r.id === recetaId) || recetaDePartida;
  const unidadesNum = Number(unidades) || 0;
  const factor = receta && unidadesNum > 0 ? unidadesNum / (receta.rendimiento_cantidad || 1) : 1;

  const resumen = useMemo(
    () => (receta ? calcularCostosReceta(receta, insumosMap, factor) : null),
    [receta, insumosMap, factor]
  );

  const precioSugerido = Math.round(resumen?.precioVentaLote || 0);
  const precioFinal = Number(precio) > 0 ? Number(precio) : precioSugerido;
  const costo = Math.round(resumen?.costoTotalLote || 0);
  const ganancia = resumen?.costoIncompleto ? 0 : precioFinal - costo;
  const unidPack = receta ? Math.max(1, receta.unidades_por_pack) : 1;
  const atajos = receta
    ? unidPack > 1
      ? [1, 2, 3, 4].map((n) => n * unidPack)
      : [0.5, 1, 2, 3]
          .map((n) => Math.round(receta.rendimiento_cantidad * n))
          .filter((n, i, arr) => n > 0 && arr.indexOf(n) === i)
    : [];

  const errores = {
    cliente: !cliente.trim() ? 'Anota para quién es.' : '',
    unidades: unidadesNum <= 0 ? 'Indica cuántas unidades.' : '',
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setIntento(true);
    if (!receta || errores.cliente || errores.unidades) return;
    setGuardando(true);
    try {
      await onGuardar({
        id: pedidoInicial?.id,
        cliente_nombre: cliente,
        fecha_entrega: fecha,
        estado: pedidoInicial?.estado || 'pendiente',
        receta_id: receta.id,
        receta_nombre_snapshot: receta.nombre,
        cantidad_lotes: factor,
        unidades_totales: unidadesNum,
        costo_total_estimado: costo,
        precio_venta_total: precioFinal,
        ganancia_neta: ganancia,
        seña_pagada: Number(abono) || 0,
        notas,
      });
      onClose();
    } finally {
      setGuardando(false);
    }
  };

  if (confirmarBorrado && pedidoInicial && onEliminar) {
    return (
      <Confirmar
        titulo={`¿Eliminar el pedido de ${pedidoInicial.cliente_nombre}?`}
        onCancelar={() => setConfirmarBorrado(false)}
        onConfirmar={async () => {
          await onEliminar(pedidoInicial.id);
          onClose();
        }}
      />
    );
  }

  return (
    <Sheet
      titulo={pedidoInicial ? 'Editar pedido' : 'Nuevo pedido'}
      onClose={onClose}
      pie={
        <div>
          {resumen &&
            unidadesNum > 0 &&
            (resumen.costoIncompleto ? (
              <div className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-xs font-medium text-warn">
                Costo incompleto: falta completar datos para calcular la ganancia real.
              </div>
            ) : (
              <div className="num mb-3 flex items-baseline justify-between text-sm">
                <span className="text-ink-soft">Te cuesta {formatearMoneda(costo)}</span>
                <span className={`font-bold ${ganancia > 0 ? 'text-ok' : 'text-bad'}`}>
                  {ganancia >= 0 ? 'Ganas' : 'Pierdes'} {formatearMoneda(Math.abs(ganancia))}
                </span>
              </div>
            ))}
          <div className="flex items-center gap-3">
            {pedidoInicial && onEliminar && (
              <button
                type="button"
                onClick={() => setConfirmarBorrado(true)}
                aria-label="Eliminar pedido"
                className="btn btn-secondary px-3 text-bad"
              >
                <Trash size={20} />
              </button>
            )}
            <button type="button" className="btn btn-secondary flex-1" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" form="form-pedido" disabled={guardando} className="btn btn-primary flex-1">
              {guardando ? 'Guardando…' : pedidoInicial ? 'Guardar' : 'Anotar pedido'}
            </button>
          </div>
        </div>
      }
    >
      <form id="form-pedido" onSubmit={guardar} className="space-y-5" noValidate>
        <Campo etiqueta="¿Para quién es?" error={intento ? errores.cliente : ''}>
          <input
            type="text"
            autoFocus={!pedidoInicial}
            placeholder="Ej: Camila, cumpleaños de Sofi"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
            className={`input ${intento && errores.cliente ? 'input-error' : ''}`}
          />
        </Campo>

        <Campo etiqueta="¿Qué te pidió?">
          <select
            value={receta?.id || ''}
            onChange={(e) => {
              setRecetaId(e.target.value);
              setPrecio('');
              const nueva = recetas.find((r) => r.id === e.target.value);
              if (nueva) {
                setUnidades(
                  String(nueva.unidades_por_pack > 1 ? nueva.unidades_por_pack : nueva.rendimiento_cantidad)
                );
              }
            }}
            className="input"
          >
            {recetas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo
          etiqueta={`¿Cuántos ${receta?.rendimiento_unidad || 'unidades'}?`}
          error={intento ? errores.unidades : ''}
          ayuda={
            receta && unidPack > 1 && unidadesNum > 0
              ? `Son ${String(Math.round((unidadesNum / unidPack) * 10) / 10).replace('.', ',')} × ${receta.nombre_pack}.`
              : undefined
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={unidades}
              onChange={(e) => {
                setUnidades(e.target.value);
                if (!pedidoInicial) setPrecio('');
              }}
              className={`input num w-24 font-semibold ${intento && errores.unidades ? 'input-error' : ''}`}
            />
            {atajos.map((n) => (
              <button
                key={n}
                type="button"
                aria-pressed={unidadesNum === n}
                onClick={() => {
                  setUnidades(String(n));
                  if (!pedidoInicial) setPrecio('');
                }}
                className={`btn btn-sm num ${
                  unidadesNum === n ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </Campo>

        <Campo
          etiqueta="¿Para cuándo?"
          ayuda={<span className="first-letter:uppercase">{describirFecha(fecha).texto}</span>}
        >
          <div className="flex flex-wrap items-center gap-2">
            {[
              { etiqueta: 'Hoy', valor: hoyISO() },
              { etiqueta: 'Mañana', valor: sumarDiasISO(hoyISO(), 1) },
              { etiqueta: 'En 3 días', valor: sumarDiasISO(hoyISO(), 3) },
            ].map((op) => (
              <button
                key={op.etiqueta}
                type="button"
                aria-pressed={fecha === op.valor}
                onClick={() => setFecha(op.valor)}
                className={`btn btn-sm ${
                  fecha === op.valor ? 'bg-berry-soft text-berry-dark' : 'btn-secondary'
                }`}
              >
                {op.etiqueta}
              </button>
            ))}
            <input
              type="date"
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="input min-w-[140px] flex-1"
            />
          </div>
        </Campo>

        <div className="grid gap-5 sm:grid-cols-2">
          <Campo
            etiqueta="Total a cobrar"
            ayuda={
              precioSugerido > 0
                ? `Según tu precio: ${formatearMoneda(precioSugerido)}. Cámbialo si acordaste otro.`
                : undefined
            }
          >
            <CampoDinero
              value={precio}
              onChange={setPrecio}
              placeholder={precioSugerido > 0 ? String(precioSugerido) : '0'}
            />
          </Campo>
          <Campo
            etiqueta="¿Ya te abonó algo?"
            ayuda={
              Number(abono) > 0 && precioFinal > 0
                ? precioFinal - Number(abono) > 0
                  ? `Faltará cobrar ${formatearMoneda(precioFinal - Number(abono))}.`
                  : 'Queda pagado completo.'
                : 'Déjalo vacío si aún no paga nada.'
            }
          >
            <CampoDinero value={abono} onChange={setAbono} placeholder="0" />
          </Campo>
        </div>

        <Campo etiqueta="Notas (opcional)">
          <input
            type="text"
            placeholder={`Ej: sin nueces, retira a las 17:00`}
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            className="input"
          />
        </Campo>
      </form>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Lista de compras                                                            */
/* -------------------------------------------------------------------------- */

function ListaCompras({ lista, pedidosPorPreparar }: { lista: ItemCompra[]; pedidosPorPreparar: number }) {
  const [copiada, setCopiada] = useState(false);
  const [enCarrito, setEnCarrito] = useState<Record<string, boolean>>({});
  const faltantes = lista.filter((i) => i.faltante > 0);
  const marcadosCount = faltantes.filter((i) => enCarrito[i.insumo.id]).length;

  const copiar = async () => {
    const texto = ['Lista de compras', ...faltantes.map((i) => `- ${i.insumo.nombre}: ${formatearCantidad(i.faltante, i.unidadBase)}`)].join('\n');
    try {
      await navigator.clipboard.writeText(texto);
      setCopiada(true);
      setTimeout(() => setCopiada(false), 2500);
    } catch {
      // El navegador no permitió copiar
    }
  };

  if (lista.length === 0) {
    return (
      <Vacio
        icono={<ShoppingBag size={28} weight="duotone" />}
        titulo="Nada que comprar por ahora"
        texto="Cuando tengas pedidos por preparar, aquí aparece cuánto necesitas de cada ingrediente, ya sumado."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9375rem] text-ink-soft">
          Para {pedidosPorPreparar === 1 ? '1 pedido' : `${pedidosPorPreparar} pedidos`} por preparar ·
          toca cada ítem al comprarlo.
        </p>
        <div className="flex flex-wrap gap-2">
          {marcadosCount > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setEnCarrito({})}
            >
              Limpiar ({marcadosCount})
            </button>
          )}
          {faltantes.length > 0 && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={copiar}>
              {copiada ? <Check size={16} weight="bold" /> : <Copy size={16} />}
              {copiada ? 'Copiada' : 'Copiar lista'}
            </button>
          )}
        </div>
      </div>
      <ul className="card divide-y divide-line overflow-hidden">
        {lista.map((it) => {
          const necesitaComprar = it.faltante > 0;
          const marcado = necesitaComprar && Boolean(enCarrito[it.insumo.id]);
          return (
            <li key={it.insumo.id}>
              {necesitaComprar ? (
                <button
                  type="button"
                  aria-pressed={marcado}
                  onClick={() =>
                    setEnCarrito((prev) => ({ ...prev, [it.insumo.id]: !prev[it.insumo.id] }))
                  }
                  className="flex min-h-[60px] w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-paper/75 sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {marcado ? (
                      <CheckCircle size={22} weight="fill" className="shrink-0 text-ok" />
                    ) : (
                      <Circle size={22} className="shrink-0 text-line-strong" />
                    )}
                    <div className="min-w-0">
                      <div className={`truncate font-semibold ${marcado ? 'text-ink-soft line-through' : ''}`}>
                        {it.insumo.nombre}
                      </div>
                      <div className="num text-sm text-ink-soft">
                        Necesitas {formatearCantidad(it.necesario, it.unidadBase)}
                        {it.enCasa > 0 && ` · tienes ${formatearCantidad(it.enCasa, it.unidadBase)}`}
                      </div>
                    </div>
                  </div>
                  <Etiqueta tono={marcado ? 'neutro' : 'berry'}>
                    {marcado ? 'Listo' : `Comprar ${formatearCantidad(it.faltante, it.unidadBase)}`}
                  </Etiqueta>
                </button>
              ) : (
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{it.insumo.nombre}</div>
                    <div className="num text-sm text-ink-soft">
                      Necesitas {formatearCantidad(it.necesario, it.unidadBase)} · tienes{' '}
                      {formatearCantidad(it.enCasa, it.unidadBase)}
                    </div>
                  </div>
                  <Etiqueta tono="ok">Te alcanza</Etiqueta>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Pantalla de pedidos                                                         */
/* -------------------------------------------------------------------------- */

export default function PedidosView({
  pedidos,
  recetas,
  insumosMap,
  pestanaInicial = 'pendientes',
  onNuevo,
  onEditar,
  onCambiarEstado,
  onCrearProducto,
}: {
  pedidos: Pedido[];
  recetas: Receta[];
  insumosMap: Map<string, Insumo>;
  pestanaInicial?: 'pendientes' | 'compras' | 'entregados';
  onNuevo: () => void;
  onEditar: (pedido: Pedido) => void;
  onCambiarEstado: (pedido: Pedido, estado: EstadoPedido) => void;
  onCrearProducto: () => void;
}) {
  const [pestana, setPestana] = useState(pestanaInicial);
  const [busqueda, setBusqueda] = useState('');

  const pendientes = useMemo(
    () =>
      pedidos
        .filter((p) => p.estado !== 'entregado')
        .sort((a, b) => a.fecha_entrega.localeCompare(b.fecha_entrega)),
    [pedidos]
  );
  const entregados = useMemo(
    () =>
      pedidos
        .filter((p) => p.estado === 'entregado')
        .sort((a, b) => b.fecha_entrega.localeCompare(a.fecha_entrega)),
    [pedidos]
  );
  const q = busqueda.trim().toLowerCase();
  const pendientesVisibles = useMemo(
    () =>
      q
        ? pendientes.filter(
            (p) =>
              p.cliente_nombre.toLowerCase().includes(q) ||
              p.receta_nombre_snapshot.toLowerCase().includes(q)
          )
        : pendientes,
    [pendientes, q]
  );
  const entregadosVisibles = useMemo(
    () =>
      q
        ? entregados.filter(
            (p) =>
              p.cliente_nombre.toLowerCase().includes(q) ||
              p.receta_nombre_snapshot.toLowerCase().includes(q)
          )
        : entregados,
    [entregados, q]
  );
  const lista = useMemo(
    () => calcularListaCompras(pedidos, recetas, insumosMap),
    [pedidos, recetas, insumosMap]
  );
  const porPreparar = pedidos.filter(
    (p) => p.estado === 'pendiente' || p.estado === 'en_preparacion'
  ).length;

  const sinProductos = recetas.length === 0;
  const mostrarBuscador =
    (pestana === 'pendientes' && pendientes.length > 4) ||
    (pestana === 'entregados' && entregados.length > 4);

  return (
    <div className="anim-rise space-y-6">
      <EncabezadoVista titulo="Pedidos">
        {pedidos.length > 0 && (
          <button type="button" className="btn btn-primary w-full sm:w-auto" onClick={onNuevo}>
            <Plus size={18} weight="bold" />
            Nuevo pedido
          </button>
        )}
      </EncabezadoVista>

      {pedidos.length === 0 ? (
        sinProductos ? (
          <Vacio
            icono={<ClipboardText size={28} weight="duotone" />}
            titulo="Primero crea un producto"
            texto="Para anotar un pedido necesitamos saber qué vendes. Crea tu primer producto y vuelve aquí."
          >
            <button type="button" className="btn btn-primary" onClick={onCrearProducto}>
              <Plus size={18} weight="bold" />
              Crear producto
            </button>
          </Vacio>
        ) : (
          <Vacio
            icono={<ClipboardText size={28} weight="duotone" />}
            titulo="Anota tu primer pedido"
            texto="Dinos quién te pidió qué y para cuándo. Te mostramos cuánto ganas, qué tienes que comprar y te recordamos lo que falta cobrar."
          >
            <button type="button" className="btn btn-primary" onClick={onNuevo}>
              <Plus size={18} weight="bold" />
              Nuevo pedido
            </button>
          </Vacio>
        )
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Segmentos
              className="sm:w-[30rem]"
              opciones={[
                { id: 'pendientes', etiqueta: 'Por entregar', cuenta: pendientes.length },
                {
                  id: 'compras',
                  etiqueta: 'Qué comprar',
                  cuenta: lista.filter((i) => i.faltante > 0).length,
                },
                { id: 'entregados', etiqueta: 'Entregados' },
              ]}
              valor={pestana}
              onChange={setPestana}
            />

            {mostrarBuscador && (
              <div className="relative sm:ml-auto sm:w-64">
                <MagnifyingGlass
                  size={18}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft"
                />
                <input
                  type="search"
                  placeholder="Buscar cliente o dulce"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="input pl-10"
                />
              </div>
            )}
          </div>

          {pestana === 'pendientes' &&
            (pendientes.length === 0 ? (
              <p className="card-sunken px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
                No tienes pedidos por entregar. Todo al día.
              </p>
            ) : pendientesVisibles.length === 0 ? (
              <p className="card-sunken px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
                No hay pedidos pendientes que coincidan con “{busqueda}”.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {pendientesVisibles.map((p) => (
                  <TarjetaPedido key={p.id} pedido={p} onCambiarEstado={onCambiarEstado} onEditar={onEditar} />
                ))}
              </div>
            ))}

          {pestana === 'compras' && <ListaCompras lista={lista} pedidosPorPreparar={porPreparar} />}

          {pestana === 'entregados' &&
            (entregados.length === 0 ? (
              <p className="card-sunken px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
                Aún no marcas ningún pedido como entregado.
              </p>
            ) : entregadosVisibles.length === 0 ? (
              <p className="card-sunken px-5 py-8 text-center text-[0.9375rem] text-ink-soft">
                No hay entregas que coincidan con “{busqueda}”.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                {entregadosVisibles.map((p) => (
                  <TarjetaPedido key={p.id} pedido={p} onCambiarEstado={onCambiarEstado} onEditar={onEditar} />
                ))}
              </div>
            ))}
        </>
      )}
    </div>
  );
}
