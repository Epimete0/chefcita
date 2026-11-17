-- Soporte para registro de ventas diarias dentro de la tabla unificada de pedidos/ventas
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS registro_tipo TEXT NOT NULL DEFAULT 'pedido' CHECK (registro_tipo IN ('pedido', 'venta')),
  ADD COLUMN IF NOT EXISTS presentacion_nombre TEXT NOT NULL DEFAULT 'Unidad',
  ADD COLUMN IF NOT EXISTS cantidad_presentacion NUMERIC(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS unidades_por_presentacion NUMERIC(10,2) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS precio_unitario_presentacion NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_unitario_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS costo_incompleto BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_pedidos_registro_tipo ON public.pedidos(registro_tipo);
