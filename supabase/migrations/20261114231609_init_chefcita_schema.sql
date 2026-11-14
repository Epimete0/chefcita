-- ============================================================================
-- CHEFCITA - ESQUEMA DE BASE DE DATOS PARA PASTELERÍA PERSONAL
-- ============================================================================

-- 1. Tabla de Insumos (Ingredientes y Empaques/Descartables)
CREATE TABLE IF NOT EXISTS public.insumos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'ingrediente' CHECK (tipo IN ('ingrediente', 'empaque')),
  categoria TEXT NOT NULL DEFAULT 'General',
  precio_compra NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_compra >= 0),
  cantidad_paquete NUMERIC(12,3) NOT NULL DEFAULT 1 CHECK (cantidad_paquete > 0),
  unidad TEXT NOT NULL DEFAULT 'g' CHECK (unidad IN ('g', 'kg', 'ml', 'l', 'u', 'cm')),
  stock_actual NUMERIC(12,3) NOT NULL DEFAULT 0,
  stock_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  proveedor TEXT NOT NULL DEFAULT '',
  notas TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Tabla de Recetas / Productos
CREATE TABLE IF NOT EXISTS public.recetas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  categoria TEXT NOT NULL DEFAULT 'Donas',
  descripcion TEXT NOT NULL DEFAULT '',
  rendimiento_cantidad NUMERIC(10,2) NOT NULL DEFAULT 12 CHECK (rendimiento_cantidad > 0),
  rendimiento_unidad TEXT NOT NULL DEFAULT 'unidades',
  unidades_por_pack NUMERIC(10,2) NOT NULL DEFAULT 6 CHECK (unidades_por_pack > 0),
  nombre_pack TEXT NOT NULL DEFAULT 'Caja x6',
  porcentaje_gastos_extras NUMERIC(5,2) NOT NULL DEFAULT 10 CHECK (porcentaje_gastos_extras >= 0),
  costo_mano_obra_lote NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (costo_mano_obra_lote >= 0),
  margen_objetivo_porcentaje NUMERIC(5,2) NOT NULL DEFAULT 60 CHECK (margen_objetivo_porcentaje >= 0 AND margen_objetivo_porcentaje < 100),
  precio_venta_unidad NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_venta_unidad >= 0),
  precio_venta_pack NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_venta_pack >= 0),
  precio_venta_lote NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (precio_venta_lote >= 0),
  tiempo_preparacion_min INTEGER NOT NULL DEFAULT 30,
  tiempo_horneado_min INTEGER NOT NULL DEFAULT 20,
  temperatura_horno_c INTEGER NOT NULL DEFAULT 180,
  metodo_coccion TEXT NOT NULL DEFAULT 'Horno',
  notas_chefcita TEXT NOT NULL DEFAULT '',
  color_tag TEXT NOT NULL DEFAULT 'rose',
  favorita BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Tabla de Items por Receta (separados en masa, relleno_cobertura y empaque)
CREATE TABLE IF NOT EXISTS public.receta_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
  insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE RESTRICT,
  seccion TEXT NOT NULL DEFAULT 'masa' CHECK (seccion IN ('masa', 'relleno_cobertura', 'empaque')),
  cantidad NUMERIC(12,3) NOT NULL CHECK (cantidad > 0),
  unidad TEXT NOT NULL DEFAULT 'g' CHECK (unidad IN ('g', 'kg', 'ml', 'l', 'u', 'cm')),
  nota TEXT NOT NULL DEFAULT '',
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Tabla de Pasos de Preparación (Recetario interactivo y timers)
CREATE TABLE IF NOT EXISTS public.receta_pasos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
  paso_numero INTEGER NOT NULL DEFAULT 1,
  etapa TEXT NOT NULL DEFAULT 'Preparación',
  instruccion TEXT NOT NULL,
  tiempo_timer_min INTEGER DEFAULT NULL,
  tip_secreto TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Tabla de Pedidos / Producciones
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_nombre TEXT NOT NULL,
  fecha_entrega DATE NOT NULL DEFAULT CURRENT_DATE,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_preparacion', 'listo', 'entregado')),
  receta_id UUID REFERENCES public.recetas(id) ON DELETE SET NULL,
  receta_nombre_snapshot TEXT NOT NULL,
  cantidad_lotes NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (cantidad_lotes > 0),
  unidades_totales NUMERIC(10,2) NOT NULL DEFAULT 1,
  costo_total_estimado NUMERIC(12,2) NOT NULL DEFAULT 0,
  precio_venta_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  ganancia_neta NUMERIC(12,2) NOT NULL DEFAULT 0,
  seña_pagada NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para llaves foráneas y rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_insumos_tipo ON public.insumos(tipo);
CREATE INDEX IF NOT EXISTS idx_receta_items_receta_id ON public.receta_items(receta_id);
CREATE INDEX IF NOT EXISTS idx_receta_items_insumo_id ON public.receta_items(insumo_id);
CREATE INDEX IF NOT EXISTS idx_receta_pasos_receta_id ON public.receta_pasos(receta_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_receta_id ON public.pedidos(receta_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_entrega ON public.pedidos(fecha_entrega);

-- Permisos explícitos para Data API de Supabase (anon y authenticated)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Habilitar Row Level Security (RLS) en todas las tablas públicas
ALTER TABLE public.insumos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_pasos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- Políticas para App Personal (Single-User) con validación de integridad en RLS
CREATE POLICY "chefcita_insumos_select" ON public.insumos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chefcita_insumos_insert" ON public.insumos FOR INSERT TO anon, authenticated WITH CHECK (length(trim(nombre)) > 0 AND cantidad_paquete > 0);
CREATE POLICY "chefcita_insumos_update" ON public.insumos FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (length(trim(nombre)) > 0 AND cantidad_paquete > 0);
CREATE POLICY "chefcita_insumos_delete" ON public.insumos FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "chefcita_recetas_select" ON public.recetas FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chefcita_recetas_insert" ON public.recetas FOR INSERT TO anon, authenticated WITH CHECK (length(trim(nombre)) > 0 AND rendimiento_cantidad > 0);
CREATE POLICY "chefcita_recetas_update" ON public.recetas FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (length(trim(nombre)) > 0 AND rendimiento_cantidad > 0);
CREATE POLICY "chefcita_recetas_delete" ON public.recetas FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "chefcita_receta_items_select" ON public.receta_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chefcita_receta_items_insert" ON public.receta_items FOR INSERT TO anon, authenticated WITH CHECK (receta_id IS NOT NULL AND insumo_id IS NOT NULL AND cantidad > 0);
CREATE POLICY "chefcita_receta_items_update" ON public.receta_items FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (receta_id IS NOT NULL AND insumo_id IS NOT NULL AND cantidad > 0);
CREATE POLICY "chefcita_receta_items_delete" ON public.receta_items FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "chefcita_receta_pasos_select" ON public.receta_pasos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chefcita_receta_pasos_insert" ON public.receta_pasos FOR INSERT TO anon, authenticated WITH CHECK (receta_id IS NOT NULL AND length(trim(instruccion)) > 0);
CREATE POLICY "chefcita_receta_pasos_update" ON public.receta_pasos FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (receta_id IS NOT NULL AND length(trim(instruccion)) > 0);
CREATE POLICY "chefcita_receta_pasos_delete" ON public.receta_pasos FOR DELETE TO anon, authenticated USING (id IS NOT NULL);

CREATE POLICY "chefcita_pedidos_select" ON public.pedidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "chefcita_pedidos_insert" ON public.pedidos FOR INSERT TO anon, authenticated WITH CHECK (length(trim(cliente_nombre)) > 0 AND cantidad_lotes > 0);
CREATE POLICY "chefcita_pedidos_update" ON public.pedidos FOR UPDATE TO anon, authenticated USING (id IS NOT NULL) WITH CHECK (length(trim(cliente_nombre)) > 0 AND cantidad_lotes > 0);
CREATE POLICY "chefcita_pedidos_delete" ON public.pedidos FOR DELETE TO anon, authenticated USING (id IS NOT NULL);
