-- ============================================================================
-- SEED DATA PARA CHEFCITA - PASTELERÍA PERSONAL, COSTOS, INSUMOS Y RECETARIO
-- ============================================================================

-- Limpiar datos previos si existen
TRUNCATE TABLE public.pedidos, public.receta_pasos, public.receta_items, public.recetas, public.insumos RESTART IDENTITY CASCADE;

-- 1. INSUMOS (INGREDIENTES Y EMPAQUES)
INSERT INTO public.insumos (id, nombre, tipo, categoria, precio_compra, cantidad_paquete, unidad, stock_actual, stock_minimo, proveedor, notas) VALUES
  -- Ingredientes
  ('10000000-0000-0000-0000-000000000001', 'Harina 0000 Refinada', 'ingrediente', 'Harinas y Secos', 1300, 1000, 'g', 3500, 1000, 'Mayorista Central', 'Ideal para masas esponjosas y pastelería fina'),
  ('10000000-0000-0000-0000-000000000002', 'Azúcar Blanca Común', 'ingrediente', 'Harinas y Secos', 1150, 1000, 'g', 2800, 1000, 'Mayorista Central', 'Grano fino'),
  ('10000000-0000-0000-0000-000000000003', 'Azúcar Impalpable', 'ingrediente', 'Harinas y Secos', 1600, 500, 'g', 800, 250, 'Cotillón Dulce Rosa', 'Para glasé real y espolvorear'),
  ('10000000-0000-0000-0000-000000000004', 'Manteca Primera Marca', 'ingrediente', 'Lácteos y Huevos', 2400, 200, 'g', 600, 200, 'Súper del Barrio', 'Usar siempre pomada en masas batidas'),
  ('10000000-0000-0000-0000-000000000005', 'Huevos Grandes Seleccionados', 'ingrediente', 'Lácteos y Huevos', 2400, 12, 'u', 24, 6, 'Granja Local', 'Docena de huevos frescos tamaño L (~60g c/u)'),
  ('10000000-0000-0000-0000-000000000006', 'Leche Entera', 'ingrediente', 'Lácteos y Huevos', 1350, 1000, 'ml', 2000, 1000, 'Súper del Barrio', 'Larga vida 3% tenor graso'),
  ('10000000-0000-0000-0000-000000000007', 'Levadura Fresca en Pan', 'ingrediente', 'Harinas y Secos', 650, 50, 'g', 100, 50, 'Panadería / Súper', 'Conservar en heladera bien cerrada'),
  ('10000000-0000-0000-0000-000000000008', 'Esencia de Vainilla Natural', 'ingrediente', 'Esencias y Colorantes', 1800, 100, 'ml', 85, 20, 'Cotillón Dulce Rosa', 'Aroma intenso'),
  ('10000000-0000-0000-0000-000000000009', 'Chocolate Cobertura Semiamargo', 'ingrediente', 'Chocolates y Dulces', 7500, 500, 'g', 900, 300, 'Cotillón Dulce Rosa', 'Para ganache y baños'),
  ('10000000-0000-0000-0000-000000000010', 'Chocolate Baño Rosa Frutilla', 'ingrediente', 'Chocolates y Dulces', 6800, 500, 'g', 650, 250, 'Cotillón Dulce Rosa', 'No requiere templado, ideal para donas'),
  ('10000000-0000-0000-0000-000000000011', 'Dulce de Leche Repostero', 'ingrediente', 'Chocolates y Dulces', 4200, 1000, 'g', 1500, 500, 'Cotillón Dulce Rosa', 'Pote de 1 kg bien firme para manga'),
  ('10000000-0000-0000-0000-000000000012', 'Crema de Leche Doble (39%)', 'ingrediente', 'Lácteos y Huevos', 3100, 360, 'ml', 720, 360, 'Súper del Barrio', 'Alta en grasa para batir o ganache'),
  ('10000000-0000-0000-0000-000000000013', 'Queso Crema Firme', 'ingrediente', 'Lácteos y Huevos', 3200, 400, 'g', 800, 400, 'Súper del Barrio', 'Para frosting de Red Velvet y Carrot Cake'),
  ('10000000-0000-0000-0000-000000000014', 'Cacao Amargo Puro Alcalino', 'ingrediente', 'Chocolates y Dulces', 4500, 250, 'g', 400, 100, 'Cotillón Dulce Rosa', 'Color oscuro e intenso sabor'),
  ('10000000-0000-0000-0000-000000000015', 'Granas y Perlas Rosas / Corazones', 'ingrediente', 'Esencias y Colorantes', 1500, 100, 'g', 180, 50, 'Cotillón Dulce Rosa', 'Mix pastel y rojo para decorar donas y cupcakes'),
  ('10000000-0000-0000-0000-000000000016', 'Colorante en Pasta Rojo Rubí', 'ingrediente', 'Esencias y Colorantes', 2100, 30, 'g', 28, 5, 'Cotillón Dulce Rosa', 'Alta concentración para Red Velvet'),
  ('10000000-0000-0000-0000-000000000017', 'Aceite Girasol Neutro', 'ingrediente', 'Harinas y Secos', 1900, 1000, 'ml', 1500, 500, 'Mayorista Central', 'Para fritura limpia de donas y tortas húmedas'),
  ('10000000-0000-0000-0000-000000000018', 'Polvo de Hornear Doble Acción', 'ingrediente', 'Harinas y Secos', 1200, 100, 'g', 90, 20, 'Cotillón Dulce Rosa', 'Leudante químico'),

  -- Empaques y Descartables
  ('20000000-0000-0000-0000-000000000001', 'Caja con Visor para 6 Donas / Cupcakes', 'empaque', 'Cajas y Bandejas', 7500, 10, 'u', 18, 6, 'Papelera Rosa Pack', 'Pack x10 cajas blancas con ventana de acetato ($750 c/u)'),
  ('20000000-0000-0000-0000-000000000002', 'Caja Individual Dona / Mini Cake', 'empaque', 'Cajas y Bandejas', 3800, 10, 'u', 15, 5, 'Papelera Rosa Pack', 'Pack x10 cajitas individuales ($380 c/u)'),
  ('20000000-0000-0000-0000-000000000003', 'Caja Alta para Torta con Visor 24x24', 'empaque', 'Cajas y Bandejas', 1850, 1, 'u', 6, 2, 'Papelera Rosa Pack', 'Caja reforzada para tortas altas'),
  ('20000000-0000-0000-0000-000000000004', 'Bandeja Circular Dorada Rígida 22cm', 'empaque', 'Cajas y Bandejas', 2750, 5, 'u', 8, 3, 'Papelera Rosa Pack', 'Base firme para tortas ($550 c/u)'),
  ('20000000-0000-0000-0000-000000000005', 'Papel Manteca Antigrasa Estampado Rosa', 'empaque', 'Bolsas y Papeles', 2500, 50, 'u', 42, 10, 'Papelera Rosa Pack', 'Hojas para base de cajas de donas y cookies ($50 c/u)'),
  ('20000000-0000-0000-0000-000000000006', 'Pirotines Rojos y Rosas Nº10', 'empaque', 'Bolsas y Papeles', 1500, 50, 'u', 80, 24, 'Cotillón Dulce Rosa', 'No destiñen en el horno ($30 c/u)'),
  ('20000000-0000-0000-0000-000000000007', 'Sticker Cierra Caja "Chefcita"', 'empaque', 'Stickers y Cintas', 2000, 50, 'u', 45, 15, 'Imprenta Digital', 'Etiqueta autoadhesiva troquelada ($40 c/u)'),
  ('20000000-0000-0000-0000-000000000008', 'Cinta de Raso Rosa Pastel (Rollo 10m)', 'empaque', 'Stickers y Cintas', 2500, 1000, 'cm', 750, 200, 'Mercería del Centro', 'Rollo de 10 metros = 1000 cm ($2.50 por cm)'),
  ('20000000-0000-0000-0000-000000000009', 'Bolsita Cristal Adhesiva para Cookies', 'empaque', 'Bolsas y Papeles', 1750, 50, 'u', 60, 20, 'Papelera Rosa Pack', 'Bolsitas individuales 12x15cm ($35 c/u)');

-- 2. RECETAS
INSERT INTO public.recetas (
  id, nombre, categoria, descripcion,
  rendimiento_cantidad, rendimiento_unidad,
  unidades_por_pack, nombre_pack,
  porcentaje_gastos_extras, costo_mano_obra_lote, margen_objetivo_porcentaje,
  precio_venta_unidad, precio_venta_pack, precio_venta_lote,
  tiempo_preparacion_min, tiempo_horneado_min, temperatura_horno_c, metodo_coccion,
  notas_chefcita, color_tag, favorita
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'Donas Glaseadas & Sprinkles',
    'Donas',
    'Donas súper esponjosas de miga suave, bañadas en chocolate rosa frutilla, glasé real y lluvia de granas pastel. Rinde 12 donas (2 cajas de 6).',
    12, 'donas',
    6, 'Caja x6 Donas',
    10, 0, 60,
    1400, 7800, 15600,
    45, 15, 170, 'Fritura',
    'El secreto para que no absorban aceite es que el aceite esté exactamente entre 165°C y 170°C y respetar los dos leudados hasta que dupliquen su volumen.',
    'rose', true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'Cupcakes Red Velvet & Frosting',
    'Cupcakes',
    'Clásicos cupcakes rojo terciopelo húmedos con toque de cacao y generoso copo de frosting de queso crema y vainilla.',
    12, 'cupcakes',
    6, 'Caja x6 Cupcakes',
    10, 0, 60,
    1800, 9800, 19600,
    35, 20, 175, 'Horno',
    'No sobrebatir la mezcla una vez incorporada la harina para que salgan bien tiernos y con cúpula pareja.',
    'crimson', true
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'Torta Matilda Intensa',
    'Tortas',
    'Tres capas de bizcochuelo húmedo de chocolate negro, doble relleno de ganache y dulce de leche repostero, cubierta en ondas de chocolate.',
    8, 'porciones',
    8, 'Torta Entera (20cm)',
    12, 0, 58,
    4500, 32000, 32000,
    60, 45, 170, 'Horno',
    'Armar con aro de acetato y dejar reposar en heladera al menos 6 horas antes de decorar la cobertura final.',
    'berry', true
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'Cookies NY Rellenas Choco & Dulce',
    'Cookies',
    'Galletas estilo New York de 110g cada una, crocantes por fuera, húmedas por dentro y con corazón de dulce de leche.',
    8, 'cookies',
    4, 'Caja x4 Cookies XL',
    10, 0, 60,
    2200, 8200, 16400,
    30, 13, 190, 'Horno',
    'Congelar los bollos rellenos 40 minutos antes de hornear a horno fuerte (190°C) exactamente 13 minutos.',
    'pink', false
  );

-- 3. ITEMS DE RECETAS (MASA, RELLENO/COBERTURA Y EMPAQUE)

-- === RECETA 1: DONAS GLASEADAS (12 donas / 2 cajas x6) ===
INSERT INTO public.receta_items (receta_id, insumo_id, seccion, cantidad, unidad, nota, orden) VALUES
  -- Masa de las donas
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'masa', 500, 'g', 'Tamizada', 1),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000006', 'masa', 220, 'ml', 'Tibia (no caliente)', 2),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000005', 'masa', 2, 'u', 'A temperatura ambiente', 3),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002', 'masa', 70, 'g', 'Para la masa', 4),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004', 'masa', 60, 'g', 'Pomada blanda', 5),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000007', 'masa', 25, 'g', 'Medio cubito', 6),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000008', 'masa', 10, 'ml', '1 cucharada sopera', 7),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000017', 'masa', 250, 'ml', 'Consumo estimado de fritura', 8),
  -- Cobertura y Glaseado
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000010', 'relleno_cobertura', 160, 'g', 'Derretido a baño maría suave', 9),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', 'relleno_cobertura', 150, 'g', 'Para glasé clásico', 10),
  ('30000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000015', 'relleno_cobertura', 35, 'g', 'Para decorar arriba del baño', 11),
  -- Empaque (para las 2 cajas de 6 donas)
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'empaque', 2, 'u', '2 cajas para las 12 donas', 12),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000005', 'empaque', 2, 'u', 'Base antigrasa dentro de cada caja', 13),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000007', 'empaque', 2, 'u', 'Sello cierra caja', 14),
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000008', 'empaque', 120, 'cm', '60 cm de cinta rosa por caja', 15);

-- === RECETA 2: CUPCAKES RED VELVET (12 cupcakes / 2 cajas x6) ===
INSERT INTO public.receta_items (receta_id, insumo_id, seccion, cantidad, unidad, nota, orden) VALUES
  -- Masa
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'masa', 280, 'g', 'Tamizada con cacao', 1),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'masa', 240, 'g', 'Azúcar común', 2),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000004', 'masa', 120, 'g', 'Manteca pomada', 3),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000005', 'masa', 2, 'u', 'Huevos medianos/grandes', 4),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000006', 'masa', 240, 'ml', 'Con gotitas de limón (buttermilk)', 5),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000014', 'masa', 15, 'g', 'Cacao amargo para dar tono profundo', 6),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000016', 'masa', 6, 'g', 'Colorante rojo rubí', 7),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000018', 'masa', 8, 'g', 'Polvo de hornear', 8),
  -- Frosting
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000013', 'relleno_cobertura', 300, 'g', 'Queso crema bien frío', 9),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000003', 'relleno_cobertura', 180, 'g', 'Azúcar impalpable tamizada', 10),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000012', 'relleno_cobertura', 100, 'ml', 'Crema doble para montar el frosting', 11),
  ('30000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000015', 'relleno_cobertura', 20, 'g', 'Perlas y corazones arriba', 12),
  -- Empaque
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000006', 'empaque', 12, 'u', '12 pirotines rojos/rosas', 13),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'empaque', 2, 'u', '2 cajas con visor x6', 14),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000007', 'empaque', 2, 'u', 'Stickers Chefcita', 15);

-- === RECETA 3: TORTA MATILDA INTENSA (1 torta 8 porciones) ===
INSERT INTO public.receta_items (receta_id, insumo_id, seccion, cantidad, unidad, nota, orden) VALUES
  -- Masa bizcochuelo húmedo
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'masa', 350, 'g', 'Harina 0000', 1),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002', 'masa', 350, 'g', 'Azúcar común', 2),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000014', 'masa', 100, 'g', 'Cacao amargo puro', 3),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000005', 'masa', 3, 'u', 'Huevos grandes', 4),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000006', 'masa', 250, 'ml', 'Leche entera', 5),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000017', 'masa', 120, 'ml', 'Aceite neutro para humedad', 6),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000018', 'masa', 12, 'g', 'Polvo de hornear', 7),
  -- Relleno y Ganache
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000009', 'relleno_cobertura', 400, 'g', 'Chocolate cobertura semiamargo', 8),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000012', 'relleno_cobertura', 360, 'ml', 'Crema de leche para la ganache', 9),
  ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000011', 'relleno_cobertura', 400, 'g', 'Capa central de dulce de leche', 10),
  -- Empaque
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 'empaque', 1, 'u', 'Caja alta con visor', 11),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000004', 'empaque', 1, 'u', 'Bandeja circular dorada rígida', 12),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000008', 'empaque', 150, 'cm', 'Moño de cinta rosa alrededor', 13),
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000007', 'empaque', 1, 'u', 'Sticker sello Chefcita', 14);

-- === RECETA 4: COOKIES NY RELLENAS (8 cookies / 2 cajas x4) ===
INSERT INTO public.receta_items (receta_id, insumo_id, seccion, cantidad, unidad, nota, orden) VALUES
  -- Masa
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', 'masa', 320, 'g', 'Harina 0000', 1),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'masa', 150, 'g', 'Manteca fría en cubos', 2),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'masa', 160, 'g', 'Azúcar', 3),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000005', 'masa', 2, 'u', 'Huevos', 4),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000008', 'masa', 10, 'ml', 'Esencia de vainilla', 5),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000018', 'masa', 6, 'g', 'Polvo de hornear', 6),
  -- Relleno y Chips
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000009', 'relleno_cobertura', 150, 'g', 'Trozos de chocolate picado', 7),
  ('30000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000011', 'relleno_cobertura', 200, 'g', '8 botones congelados de dulce de leche', 8),
  -- Empaque
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000009', 'empaque', 8, 'u', 'Bolsita individual cristal para cada cookie', 9),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000001', 'empaque', 2, 'u', '2 cajas visor', 10),
  ('30000000-0000-0000-0000-000000000004', '20000000-0000-0000-0000-000000000007', 'empaque', 2, 'u', 'Sticker sello Chefcita', 11);

-- 4. PASOS DE PREPARACIÓN DE LAS RECETAS (MODO PREPARAR)

-- Pasos Donas Glaseadas
INSERT INTO public.receta_pasos (receta_id, paso_numero, etapa, instruccion, tiempo_timer_min, tip_secreto) VALUES
  ('30000000-0000-0000-0000-000000000001', 1, 'Esponja Previa', 'Disolver la levadura fresca en la leche tibia con 1 cucharada de azúcar y 2 cucharadas de harina. Dejar espumar en lugar cálido.', 10, 'La leche debe estar apenas tibia al tacto (35°C); si quema, mata la levadura.'),
  ('30000000-0000-0000-0000-000000000001', 2, 'Masa y Amasado', 'Formar una corona con la harina y el azúcar restante. Sumar los huevos, la vainilla y la esponja. Integrar y agregar la manteca pomada al final amasando hasta lograr un bollo liso y elástico.', 12, 'Al sumar la manteca parece que se corta la masa: ¡no agregues harina! Seguí amasando que se une sola.'),
  ('30000000-0000-0000-0000-000000000001', 3, 'Primer Leudado', 'Colocar el bollo en un bowl tapado con film o repasador húmedo hasta que duplique su tamaño.', 45, 'Podés poner el bowl dentro del horno apagado con una taza de agua hirviendo al lado.'),
  ('30000000-0000-0000-0000-000000000001', 4, 'Corte y Segundo Leudado', 'Estirar la masa a 1.5 cm de espesor, cortar las 12 donas y colocar cada una sobre un cuadradito de papel manteca. Dejar leudar nuevamente.', 30, 'El cuadradito de papel individual te permite tirarlas al aceite sin tocarlas con los dedos ni desinflarlas.'),
  ('30000000-0000-0000-0000-000000000001', 5, 'Fritura Dorada', 'Freír en abundante aceite a 170°C durante 1 minuto y medio de cada lado. Retirar sobre rejilla o papel absorbente.', 2, 'Si se doran en menos de 30 segundos, bajá el fuego para que no queden crudas en el centro.'),
  ('30000000-0000-0000-0000-000000000001', 6, 'Glaseado y Empaque', 'Bañar la mitad de cada dona tibia en el chocolate rosa derretido o glasé real, decorar con granas al instante y acomodar de a 6 en las cajas con papel antigrasa.', 15, 'Poné las granas enseguida antes de que cristalice el baño para que queden bien adheridas.');

-- Pasos Cupcakes Red Velvet
INSERT INTO public.receta_pasos (receta_id, paso_numero, etapa, instruccion, tiempo_timer_min, tip_secreto) VALUES
  ('30000000-0000-0000-0000-000000000002', 1, 'Cremado Base', 'Batir la manteca pomada con el azúcar hasta obtener una crema pálida y aireada. Incorporar los huevos de a uno junto con la vainilla y el colorante rojo rubí.', 8, 'Usá colorante en pasta o gel, nunca líquido, para lograr un rojo vibrante sin licuar la mezcla.'),
  ('30000000-0000-0000-0000-000000000002', 2, 'Secos y Líquidos', 'Tamizar la harina con el cacao amargo y polvo de hornear. Incorporar en 3 partes alternando con la leche, integrando con espátula.', 5, 'Apenas desaparezca la harina, dejá de batir para que la miga sea súper tierna.'),
  ('30000000-0000-0000-0000-000000000002', 3, 'Horneado Parejo', 'Rellenar los 12 pirotines hasta 2/3 de su capacidad y hornear a 175°C hasta que al pinchar salga limpio.', 20, 'Usá una cuchara de helado para que los 12 cupcakes tengan exactamente el mismo peso.'),
  ('30000000-0000-0000-0000-000000000002', 4, 'Frosting y Decoración', 'Batir el queso crema frío con el azúcar impalpable y la crema doble hasta punto pico firme. Decorar con boquilla rizada cuando los cupcakes estén fríos.', 10, 'Nunca decores cupcakes tibios o el frosting de queso crema perderá forma.');

-- Pasos Torta Matilda
INSERT INTO public.receta_pasos (receta_id, paso_numero, etapa, instruccion, tiempo_timer_min, tip_secreto) VALUES
  ('30000000-0000-0000-0000-000000000003', 1, 'Batido de Bizcochuelo', 'Mezclar harina, azúcar, cacao amargo y polvo de hornear. Sumar huevos, leche y aceite batiendo hasta lograr una preparación lisa y brillante.', 10, 'Tamizar el cacao amargo evita cualquier grumo oscuro en la miga.'),
  ('30000000-0000-0000-0000-000000000003', 2, 'Horneado de Capas', 'Dividir en 3 moldes de 20cm con papel manteca en la base y hornear a 170°C.', 35, 'Hornear en 3 moldes separados ahorra tiempo y deja bordes súper prolijos.'),
  ('30000000-0000-0000-0000-000000000003', 3, 'Ganache de Chocolate', 'Calentar la crema de leche sin que hierva, volcar sobre el chocolate cobertura picado, esperar 3 minutos y emulsionar desde el centro.', 15, 'Dejar enfriar a temperatura ambiente hasta que tenga textura untable tipo pomada.'),
  ('30000000-0000-0000-0000-000000000003', 4, 'Armado y Ondas Matilda', 'Armar sobre la bandeja dorada intercalando dulce de leche y ganache. Cubrir toda la torta haciendo las clásicas ondas con cuchara o espátula acodada.', 20, 'Pasá la espátula por agua tibia y secala para lograr ondas brillantes de vidriera.');

-- Pasos Cookies NY
INSERT INTO public.receta_pasos (receta_id, paso_numero, etapa, instruccion, tiempo_timer_min, tip_secreto) VALUES
  ('30000000-0000-0000-0000-000000000004', 1, 'Congelado de Centros', 'Formar 8 cucharadas generosas de dulce de leche repostero sobre papel film y llevar al freezer hasta que estén firmes.', 30, 'El centro congelado evita que el dulce de leche hierva durante el horneado.'),
  ('30000000-0000-0000-0000-000000000004', 2, 'Masa con Manteca Fría', 'Arenar la manteca fría con el azúcar, sumar huevos y vainilla, y por último harina con polvo de hornear y los trozos de chocolate sin amasar de más.', 10, 'No amases: solo uní con las manos para que queden altas y rústicas.'),
  ('30000000-0000-0000-0000-000000000004', 3, 'Armado y Frío', 'Dividir en 8 bollos de 110g, encerrar un centro de dulce de leche congelado dentro de cada uno y llevar al freezer.', 40, 'El choque de bollo congelado + horno bien fuerte es la clave de la cookie NY.'),
  ('30000000-0000-0000-0000-000000000004', 4, 'Horneado Fuerte', 'Hornear a 190°C en placa con papel manteca apenas 13 minutos (deben verse doradas en los bordes y tiernas al centro). Dejar enfriar antes de embolsar.', 13, 'Al salir del horno parecen blandas: se terminan de afirmar en la placa fuera del horno.');

-- 5. PEDIDOS / PRODUCCIONES DE EJEMPLO
INSERT INTO public.pedidos (
  cliente_nombre, fecha_entrega, estado, receta_id, receta_nombre_snapshot,
  cantidad_lotes, unidades_totales, costo_total_estimado, precio_venta_total, ganancia_neta, seña_pagada, notas
) VALUES
  (
    'Valentina (Mesa Dulce)', CURRENT_DATE, 'en_preparacion',
    '30000000-0000-0000-0000-000000000001', 'Donas Glaseadas & Sprinkles',
    1, 12, 6241, 15600, 9359, 5000, 'Quiere 6 con baño rosa y granas de corazón, y 6 con glasé clásico.'
  ),
  (
    'Sofía (Cumpleaños)', CURRENT_DATE + INTERVAL '1 day', 'pendiente',
    '30000000-0000-0000-0000-000000000003', 'Torta Matilda Intensa',
    1, 8, 12966, 32000, 19034, 15000, 'Agregar cartelito feliz cumple y cinta rosa pastel en la caja.'
  ),
  (
    'Camila (Regalo Aniversario)', CURRENT_DATE, 'listo',
    '30000000-0000-0000-0000-000000000002', 'Cupcakes Red Velvet & Frosting',
    0.5, 6, 3915, 9800, 5885, 9800, '1 Caja x6 cupcakes lista en heladera para retirar 18:30 hs.'
  );
