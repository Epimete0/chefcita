# Chefcita · Atelier Personal de Pastelería, Costos y Recetario 🍓🍩

Aplicación web enfocada en **mobile y desktop** para gestionar tu pastelería artesanal desde casa:
- **Desglose Real por Producto**: Calculá por separado cuánto cuesta la **Masa / Base**, el **Relleno / Cobertura**, el **Empaque (cajas, stickers, papel, cinta)** y los **Gastos Extras (horno, gas, luz)**.
- **Simulador de Precio de Venta y Diagnóstico de Ganancia**: Mirá al instante cuánto te cuesta cada unidad, cada caja/pack (ej. *Caja x6 Donas*) y cada tanda completa, con semáforo de rentabilidad y sugerencias de precio (`x2`, `x2.5`, `x3`).
- **Modo Preparar (Recetario Interactivo)**: Escalador de tanda en 1 toque (`½ lote`, `1 lote`, `1.5x`, `2x`, `3x` o unidades exactas), checklist de pesaje (*Mise en place*) y pasos con **temporizador de cocina integrado**.
- **Insumos y Empaques con Recálculo Automático**: Actualizá el precio de cualquier paquete (harina, manteca, chocolate, cajas con visor) en un toque y todas tus recetas recalculan sus costos y ganancias automáticamente.
- **Agenda de Pedidos y Lista de Compras Inteligente**: Cotizá pedidos, registrá señas y mirá qué insumos te alcanzan con tu stock actual y cuáles necesitás comprar.

---

## 🚀 Cómo usar localmente (Next.js + Supabase en Docker)

1. **Base de datos local en Docker (Supabase)**:
   - API URL: `http://127.0.0.1:54461`
   - Supabase Studio (Panel visual de tablas): `http://127.0.0.1:54463`
   - PostgreSQL Port: `54462`

2. **Iniciar servidor de desarrollo**:
   ```bash
   npm run dev
   ```

---

## ☁️ Cómo pasar a Supabase Cloud y desplegar en Vercel

1. **En Supabase Cloud**:
   - Creá un proyecto en [supabase.com](https://supabase.com).
   - Ejecutá el archivo [`supabase/migrations/20261114231609_init_chefcita_schema.sql`](./supabase/migrations/20261114231609_init_chefcita_schema.sql) y opcionalmente los datos iniciales de [`supabase/seed.sql`](./supabase/seed.sql) en el **SQL Editor** de Supabase (o mediante `npx supabase db push`).

2. **En Vercel**:
   - Importá este repositorio en Vercel.
   - Configurá las dos variables de entorno de tu proyecto de Supabase:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - ¡Listo!
