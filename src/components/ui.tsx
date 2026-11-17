'use client';

import React, { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

/* -------------------------------------------------------------------------- */
/* Hoja / diálogo: sube desde abajo en celular, centrada en computador         */
/* -------------------------------------------------------------------------- */

export function Sheet({
  titulo,
  subtitulo,
  onClose,
  children,
  pie,
  ancho = 'md',
  alta = false,
}: {
  titulo: string;
  subtitulo?: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  pie?: React.ReactNode;
  ancho?: 'sm' | 'md' | 'lg';
  alta?: boolean;
}) {
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', alTeclear);
    return () => {
      document.body.style.overflow = previo;
      window.removeEventListener('keydown', alTeclear);
    };
  }, [onClose]);

  const anchoClase =
    ancho === 'sm' ? 'sm:max-w-sm' : ancho === 'lg' ? 'sm:max-w-2xl' : 'sm:max-w-lg';

  return (
    <div
      className="anim-fade fixed inset-0 z-50 flex items-end justify-center bg-ink/45 backdrop-blur-[3px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`anim-sheet flex w-full ${anchoClase} ${
          alta ? 'h-[96dvh] sm:h-auto sm:max-h-[92dvh]' : 'max-h-[94dvh]'
        } flex-col rounded-t-[20px] border border-line/80 bg-surface shadow-[0_-12px_40px_rgba(45,20,32,0.18)] sm:rounded-[20px] sm:shadow-[0_24px_60px_rgba(45,20,32,0.24)]`}
      >
        <div className="flex justify-center pt-2.5 sm:hidden" aria-hidden="true">
          <span className="h-1 w-10 rounded-full bg-line-strong" />
        </div>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 className="font-display text-xl font-semibold leading-tight">{titulo}</h2>
            {subtitulo && <div className="mt-1 text-sm text-ink-soft">{subtitulo}</div>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 -mt-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-ink-soft hover:bg-sunken hover:text-ink"
          >
            <X size={20} weight="bold" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {pie && (
          <div className="border-t border-line px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Confirmación antes de borrar                                                */
/* -------------------------------------------------------------------------- */

export function Confirmar({
  titulo,
  detalle,
  accion = 'Eliminar',
  onConfirmar,
  onCancelar,
}: {
  titulo: string;
  detalle?: React.ReactNode;
  accion?: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  return (
    <Sheet
      titulo={titulo}
      onClose={onCancelar}
      ancho="sm"
      pie={
        <div className="flex gap-3">
          <button type="button" className="btn btn-secondary flex-1" onClick={onCancelar}>
            Cancelar
          </button>
          <button type="button" className="btn btn-danger flex-1" onClick={onConfirmar}>
            {accion}
          </button>
        </div>
      }
    >
      <p className="text-[0.9375rem] text-ink-soft">{detalle || 'Esta acción no se puede deshacer.'}</p>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/* Campos                                                                      */
/* -------------------------------------------------------------------------- */

export function Campo({
  etiqueta,
  ayuda,
  error,
  children,
  className = '',
}: {
  etiqueta: string;
  ayuda?: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{etiqueta}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-[0.8125rem] font-medium text-bad">{error}</span>
      ) : (
        ayuda && <span className="hint block">{ayuda}</span>
      )}
    </label>
  );
}

/** Campo de dinero: muestra el signo $ y abre el teclado numérico en el celular */
export function CampoDinero({
  value,
  onChange,
  placeholder,
  autoFocus,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-semibold text-ink-soft">
        $
      </span>
      <input
        type="number"
        inputMode="numeric"
        min={0}
        autoFocus={autoFocus}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`input num pl-8 font-semibold ${className}`}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Selector de pestañas internas                                               */
/* -------------------------------------------------------------------------- */

export function Segmentos<T extends string>({
  opciones,
  valor,
  onChange,
  className = '',
}: {
  opciones: Array<{ id: T; etiqueta: string; cuenta?: number }>;
  valor: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      className={`flex gap-1 overflow-x-auto rounded-xl bg-sunken p-1 ring-1 ring-inset ring-line ${className}`}
      role="tablist"
    >
      {opciones.map((op) => {
        const activo = op.id === valor;
        return (
          <button
            key={op.id}
            type="button"
            role="tab"
            aria-selected={activo}
            onClick={() => onChange(op.id)}
            className={`flex min-h-[40px] flex-1 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[9px] px-2.5 text-[0.8125rem] font-semibold transition-all duration-150 active:scale-[0.98] sm:px-3 sm:text-sm ${
              activo
                ? 'bg-surface text-ink shadow-[0_1px_3px_rgba(45,20,32,0.12)]'
                : 'text-ink-soft hover:text-ink'
            }`}
          >
            <span>{op.etiqueta}</span>
            {typeof op.cuenta === 'number' && op.cuenta > 0 && (
              <span
                className={`num rounded-full px-1.5 text-xs ${
                  activo ? 'bg-berry-soft text-berry-dark' : 'bg-line text-ink-soft'
                }`}
              >
                {op.cuenta}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Etiquetas de estado                                                         */
/* -------------------------------------------------------------------------- */

export type Tono = 'ok' | 'warn' | 'bad' | 'neutro' | 'berry';

const TONOS: Record<Tono, string> = {
  ok: 'bg-ok-soft text-ok ring-1 ring-inset ring-ok/15',
  warn: 'bg-warn-soft text-warn ring-1 ring-inset ring-warn/15',
  bad: 'bg-bad-soft text-bad ring-1 ring-inset ring-bad/15',
  neutro: 'bg-sunken text-ink-soft ring-1 ring-inset ring-line-strong/45',
  berry: 'bg-berry-soft text-berry-dark ring-1 ring-inset ring-berry/15',
};

export function Etiqueta({
  tono = 'neutro',
  children,
}: {
  tono?: Tono;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold ${TONOS[tono]}`}
    >
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Estado vacío: explica qué va aquí y ofrece el siguiente paso                */
/* -------------------------------------------------------------------------- */

export function Vacio({
  icono,
  titulo,
  texto,
  children,
}: {
  icono?: React.ReactNode;
  titulo: string;
  texto: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="card anim-rise flex flex-col items-center px-6 py-12 text-center">
      {icono && (
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-berry-soft text-berry ring-1 ring-inset ring-berry/15 shadow-[0_6px_18px_rgba(201,36,103,0.12)]">
          {icono}
        </div>
      )}
      <h3 className="font-display text-2xl font-semibold">{titulo}</h3>
      <p className="mt-2 max-w-md text-[0.9375rem] text-ink-soft">{texto}</p>
      {children && <div className="mt-6 flex flex-wrap justify-center gap-3">{children}</div>}
    </div>
  );
}

/** Encabezado de cada pantalla: título, una línea de ayuda y la acción principal */
export function EncabezadoVista({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[1.75rem] font-semibold leading-tight sm:text-[2rem]">
          {titulo}
        </h1>
        {ayuda && <p className="mt-1.5 max-w-xl text-[0.9375rem] text-ink-soft">{ayuda}</p>}
      </div>
      {children && <div className="flex w-full flex-wrap gap-2.5 sm:w-auto sm:gap-3">{children}</div>}
    </div>
  );
}
