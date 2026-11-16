-- Agregar columna costo_incompleto para marcar productos cuyos ingredientes o precios faltan por confirmar
ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS costo_incompleto BOOLEAN NOT NULL DEFAULT false;
