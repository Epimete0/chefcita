import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, getDocs, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyB5NQII0d_GqimWR08RkfjoEB6tFcXSkeQ',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'chefcita.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'chefcita',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'chefcita.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '965925513976',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:965925513976:web:b35b897ddf2d696344290d',
};

const NOW = new Date().toISOString();

export const DULCE_RUBI_INSUMOS = [
  {
    id: 'd01ce000-0000-4000-8000-000000000001',
    nombre: 'Harina',
    tipo: 'ingrediente',
    categoria: 'Secos',
    precio_compra: 720,
    cantidad_paquete: 1000,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas: 'DATO registrado en cálculo de masa de tarta ($0,72/g). Proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000002',
    nombre: 'Mantequilla',
    tipo: 'ingrediente',
    categoria: 'Lácteos',
    precio_compra: 2950,
    cantidad_paquete: 250,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas: 'DATO registrado en cálculo de masa de tarta ($11,80/g). Proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000003',
    nombre: 'Alulosa (histórica)',
    tipo: 'ingrediente',
    categoria: 'Endulzantes',
    precio_compra: 6890,
    cantidad_paquete: 500,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'Precio histórico registrado en chats de octubre/noviembre ($13,78/g). Proveedor: FALTA DATO. Conservado aparte de "Alulosa X mayor" ($4.830/500 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000004',
    nombre: 'Azúcar',
    tipo: 'ingrediente',
    categoria: 'Endulzantes',
    precio_compra: 1300,
    cantidad_paquete: 1000,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas: 'DATO de comparación de receta en noviembre vs alulosa ($1,30/g). Proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000005',
    nombre: 'Huevo',
    tipo: 'ingrediente',
    categoria: 'Frescos',
    precio_compra: 200,
    cantidad_paquete: 50,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'DATO de mini pie: 1 unidad de 50 g = $200 ($4/g). Guardado en gramos para compatibilidad con recetas pesadas. Proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000006',
    nombre: 'Relleno para donas',
    tipo: 'ingrediente',
    categoria: 'Rellenos',
    precio_compra: 200,
    cantidad_paquete: 1,
    unidad: 'u',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'DATO de octubre: costo adicional de $200 por porción/dona. Peso en gramos y proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000007',
    nombre: 'Relleno de mini pie',
    tipo: 'ingrediente',
    categoria: 'Rellenos',
    precio_compra: 1507,
    cantidad_paquete: 100,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas: 'DATO registrado en cálculo de mini pie ($15,07/g). Proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000008',
    nombre: 'Empaque mini pie',
    tipo: 'empaque',
    categoria: 'Envases',
    precio_compra: 50,
    cantidad_paquete: 1,
    unidad: 'u',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas: 'DATO registrado: $50 por unidad (4 empaques = $200). Proveedor: FALTA DATO.',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000009',
    nombre: 'Bizcocho (base)',
    tipo: 'ingrediente',
    categoria: 'Bases',
    precio_compra: 0,
    cantidad_paquete: 100,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'FALTA DATO: costo de producción o compra. Usado en Bizcocho con manjar y coco Reg. B (401 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000010',
    nombre: 'Manjar',
    tipo: 'ingrediente',
    categoria: 'Rellenos',
    precio_compra: 0,
    cantidad_paquete: 1000,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'FALTA DATO: precio de compra y proveedor. Usado en Bizcocho con manjar y coco Reg. B (301 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000011',
    nombre: 'Coco',
    tipo: 'ingrediente',
    categoria: 'Secos',
    precio_compra: 0,
    cantidad_paquete: 1000,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'FALTA DATO: precio de compra y proveedor. Usado en Bizcocho con manjar y coco Reg. B (200 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000012',
    nombre: 'Claras de huevo',
    tipo: 'ingrediente',
    categoria: 'Frescos',
    precio_compra: 0,
    cantidad_paquete: 100,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'FALTA DATO: costo por gramo asignado a claras (huevo entero registrado a $4/g). Usado en Soletillas (256 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000013',
    nombre: 'Yemas de huevo',
    tipo: 'ingrediente',
    categoria: 'Frescos',
    precio_compra: 0,
    cantidad_paquete: 100,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'FALTA DATO: costo por gramo asignado a yemas (huevo entero registrado a $4/g). Usado en Soletillas (149 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000014',
    nombre: 'Vainilla',
    tipo: 'ingrediente',
    categoria: 'Saborizantes',
    precio_compra: 0,
    cantidad_paquete: 100,
    unidad: 'g',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas: 'FALTA DATO: precio de compra y proveedor. Usado en Soletillas (15 g).',
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-8000-000000000015',
    nombre: 'Limón',
    tipo: 'ingrediente',
    categoria: 'Frescos',
    precio_compra: 0,
    cantidad_paquete: 1,
    unidad: 'u',
    stock_actual: 0,
    stock_minimo: 0,
    proveedor: '',
    notas:
      'FALTA DATO: precio de compra y proveedor. Registrado el 1 de noviembre: 4 limones en receta con limón y huevos.',
    updated_at: NOW,
  },
];

function item(recetaId, idx, insumoId, seccion, cantidad, unidad, nota = '') {
  const num = String(idx).padStart(2, '0');
  const recetaSuffix = recetaId.slice(-4);
  return {
    id: `d01ce000-0000-4000-a${recetaSuffix.slice(1)}-0000000000${num}`,
    receta_id: recetaId,
    insumo_id: insumoId,
    seccion,
    cantidad,
    unidad,
    nota,
    orden: idx,
  };
}

export const DULCE_RUBI_RECETAS = [
  {
    id: 'd01ce000-0000-4000-9000-000000000001',
    nombre: 'Mini pie',
    categoria: 'Tartas y Pies',
    descripcion:
      'Registro del 11 de noviembre: 4 unidades elaboradas a $3.000 c/u (hasta $12.000 si se venden las 4). Tiempo: 2 horas.',
    rendimiento_cantidad: 4,
    rendimiento_unidad: 'mini pies',
    unidades_por_pack: 1,
    nombre_pack: 'Unidad',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 3000,
    precio_venta_pack: 3000,
    precio_venta_lote: 12000,
    tiempo_preparacion_min: 120,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS: Masa $5,42/g; Relleno $1.507/100 g ($15,07/g); Huevo $200/50 g ($4/g); Alulosa $6.890/500 g ($13,78/g); Merengue rinde ~20 mini pies; Empaque $50/u (4 u = $200); Tiempo 2 h. FALTA DATO: gramos de masa y relleno por unidad, receta exacta del merengue (y si el lote fue para 4 o 20), valor hora de mano de obra, gas y electricidad.',
    color_tag: 'rose',
    favorita: true,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000001',
        1,
        'd01ce000-0000-4000-8000-000000000008',
        'empaque',
        4,
        'u',
        '$50 por unidad (4 unidades elaboradas)'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000002',
    nombre: 'Donas rellenas (Caja x4)',
    categoria: 'Donas',
    descripcion:
      'Escenario de octubre: caja de 4 donas rellenas. Mano de obra registrada: $4.000 (1 hora) y $200 de relleno por dona.',
    rendimiento_cantidad: 4,
    rendimiento_unidad: 'donas',
    unidades_por_pack: 4,
    nombre_pack: 'Caja x4 rellenas',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 4000,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 60,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (octubre): 4 rellenos × $200 = $800; Mano de obra 1 hora = $4.000 ($1.000/dona si el lote es de 4); Se consultó aumentar 10 g de alulosa. FALTA DATO: masa e ingredientes de las 4 donas, costo de la caja/empaque y precio definitivo de venta.',
    color_tag: 'amber',
    favorita: true,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000002',
        1,
        'd01ce000-0000-4000-8000-000000000006',
        'relleno_cobertura',
        4,
        'u',
        '$200 por dona rellena'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000003',
    nombre: 'Donas (Caja x5)',
    categoria: 'Donas',
    descripcion:
      'Escenario de octubre: caja de 5 donas. Mano de obra registrada: $4.000 (1 hora). Si todas son rellenas, $1.000 en rellenos.',
    rendimiento_cantidad: 5,
    rendimiento_unidad: 'donas',
    unidades_por_pack: 5,
    nombre_pack: 'Caja x5',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 4000,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 60,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (octubre): 5 rellenos si todas son rellenas = $1.000 ($200 c/u); Mano de obra 1 hora = $4.000; Aumento de alulosa consultado: 10 g. FALTA DATO: confirmar si todas llevan relleno, ingredientes de las donas, costo de caja y precio de venta.',
    color_tag: 'amber',
    favorita: false,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000003',
        1,
        'd01ce000-0000-4000-8000-000000000006',
        'relleno_cobertura',
        5,
        'u',
        'Si las 5 son rellenas ($200 c/u = $1.000)'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000004',
    nombre: 'Bizcocho con manjar y coco (Reg. A · 12 u)',
    categoria: 'Bizcochos',
    descripcion:
      'Registro A (8 de octubre): producción de 12 unidades (10 vendidas a $400 = $4.000 cobrados, 2 sin vender).',
    rendimiento_cantidad: 12,
    rendimiento_unidad: 'unidades',
    unidades_por_pack: 1,
    nombre_pack: 'Unidad',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 400,
    precio_venta_pack: 400,
    precio_venta_lote: 4800,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (8 oct, Registro A): 12 unidades producidas, 10 vendidas, 2 sin vender, precio $400/u, ingresos cobrados $4.000. DUDA: confirmar si es receta diferente al Registro B (20 u a $500) o actualización de precio. FALTA DATO: ingredientes, empaque, mano de obra y costo por unidad.',
    color_tag: 'caramel',
    favorita: false,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000005',
    nombre: 'Bizcocho con manjar y coco (Reg. B · 20 u)',
    categoria: 'Bizcochos',
    descripcion:
      'Registro B (8 de octubre): 401 g bizcocho + 301 g manjar + 200 g coco (902 g totales) para 20 unidades de 30 g a $500 c/u.',
    rendimiento_cantidad: 20,
    rendimiento_unidad: 'unidades',
    unidades_por_pack: 1,
    nombre_pack: 'Unidad',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 500,
    precio_venta_pack: 500,
    precio_venta_lote: 10000,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (8 oct, Registro B): 401 g bizcocho + 301 g manjar + 200 g coco = 902 g totales; rendimiento informado: 20 u de 30 g; precio $500/u (ingreso potencial $10.000). INCONSISTENCIA: 20 u × 30 g = 600 g (quedan 302 g sin explicar). FALTA DATO: precios de bizcocho, manjar, coco, empaque y mano de obra.',
    color_tag: 'caramel',
    favorita: true,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000005',
        1,
        'd01ce000-0000-4000-8000-000000000009',
        'masa',
        401,
        'g',
        'Falta costo de bizcocho'
      ),
      item(
        'd01ce000-0000-4000-9000-000000000005',
        2,
        'd01ce000-0000-4000-8000-000000000010',
        'relleno_cobertura',
        301,
        'g',
        'Falta precio de manjar'
      ),
      item(
        'd01ce000-0000-4000-9000-000000000005',
        3,
        'd01ce000-0000-4000-8000-000000000011',
        'relleno_cobertura',
        200,
        'g',
        'Falta precio de coco'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000006',
    nombre: 'Postre de bizcocho y crema pastelera',
    categoria: 'Postres',
    descripcion:
      'Rinde 12 porciones en 1 hora. Precio normal: $4.500/porción (promoción de inauguración en noviembre: $3.500/porción).',
    rendimiento_cantidad: 12,
    rendimiento_unidad: 'porciones',
    unidades_por_pack: 1,
    nombre_pack: 'Porción',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 4500,
    precio_venta_pack: 4500,
    precio_venta_lote: 54000,
    tiempo_preparacion_min: 60,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS: 12 porciones; 1 hora; Precio normal $4.500 ($54.000 las 12); Promo todo noviembre $3.500 ($42.000 las 12, dcto $1.000 = 22,22%). Crema pastelera se prepara con agua y leche líquida; se usa para remojo y bizcocho. FALTA DATO: gramos y precios de bizcocho, crema pastelera, leche líquida, remojo, empaque y mano de obra.',
    color_tag: 'rose',
    favorita: true,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000007',
    nombre: 'Masa de tarta',
    categoria: 'Masas y Bases',
    descripcion:
      'Base calculada con harina ($720/kg), mantequilla ($2.950/250 g) y alulosa ($6.890/500 g). Costo unitario registrado: $5,42/g.',
    rendimiento_cantidad: 100,
    rendimiento_unidad: 'gramos',
    unidades_por_pack: 100,
    nombre_pack: '100 g',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATO registrado: $5,42/g (5 g=$27,10 | 10 g=$54,20 | 15 g=$81,30 | 20 g=$108,40 | 25 g=$135,50 | 30 g=$162,60 | 40 g=$216,80 | 50 g=$271 | 100 g=$542). Usada en Mini pie. FALTA DATO: receta con gramos exactos de harina, mantequilla y alulosa para recalcularlo y comprobarlo.',
    color_tag: 'caramel',
    favorita: false,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000008',
    nombre: 'Merengue',
    categoria: 'Masas y Bases',
    descripcion:
      'Registro del 11 de noviembre para mini pie. Rendimiento aproximado: 20 mini pies (usa huevo y alulosa).',
    rendimiento_cantidad: 20,
    rendimiento_unidad: 'mini pies',
    unidades_por_pack: 1,
    nombre_pack: 'Porción mini pie',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 20,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Batido',
    notas_chefcita:
      'DATOS (11 nov): rinde aprox. 20 mini pies; insumos mencionados: huevo ($200/50 g = $4/g) y alulosa ($6.890/500 g = $13,78/g). FALTA DATO: gramos exactos de la receta y confirmar si se preparó para los 4 mini pies o para 20.',
    color_tag: 'rose',
    favorita: false,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000009',
    nombre: 'Receta comparación azúcar / alulosa (Grupo x5)',
    categoria: 'Dulces',
    descripcion:
      'Consulta de noviembre sobre reemplazo de 80 g de alulosa ($1.102,40) por 80 g de azúcar ($104) y mano de obra de $4.000.',
    rendimiento_cantidad: 5,
    rendimiento_unidad: 'unidades',
    unidades_por_pack: 5,
    nombre_pack: 'Grupo x5',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 4000,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (nov): 80 g alulosa ($1.102,40 a $6.890/500 g) vs 80 g azúcar ($104 a $1.300/kg) = diferencia $998,40 en endulzante; mano de obra consultada $4.000; incremento consultado 100%; presentación en grupos de 5 unidades. FALTA DATO: nombre del producto, resto de ingredientes, rendimiento total y precio definitivo.',
    color_tag: 'caramel',
    favorita: false,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000009',
        1,
        'd01ce000-0000-4000-8000-000000000003',
        'masa',
        80,
        'g',
        '80 g alulosa ($1.102,40) vs 80 g azúcar ($104)'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000010',
    nombre: 'Torta sin azúcar (Tamaño 20)',
    categoria: 'Tortas',
    descripcion:
      'Conversación del 15 de noviembre: tamaño 20. Peso de bizcocho aclarado a 220 g (600 g iniciales correspondían a bizcocho + remojo).',
    rendimiento_cantidad: 1,
    rendimiento_unidad: 'torta',
    unidades_por_pack: 1,
    nombre_pack: 'Tamaño 20',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 60,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (15 nov): Tamaño 20; 220 g bizcocho aclarados vs 600 g bizcocho más remojo; recargos consultados 100% (costo ×2, margen 50%) y 200% (costo ×3, margen 66,67%). FALTA DATO: confirmar si 20 es cm de diámetro, ingredientes de bizcocho, remojo, relleno, cobertura, empaque, mano de obra y precio de venta.',
    color_tag: 'rose',
    favorita: false,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000011',
    nombre: 'Torta sin azúcar (Tamaño 25)',
    categoria: 'Tortas',
    descripcion:
      'Conversación del 15 de noviembre: tamaño 25. Se consultaron recargos sobre costo del 100% y 200%.',
    rendimiento_cantidad: 1,
    rendimiento_unidad: 'torta',
    unidades_por_pack: 1,
    nombre_pack: 'Tamaño 25',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 60,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (15 nov): Tamaño 25; referencia de 220 g bizcocho vs 600 g bizcocho más remojo; recargos consultados 100% y 200%. FALTA DATO: confirmar si 25 es cm de diámetro, ingredientes completos, remojo, relleno, cobertura, empaque, mano de obra y precio de venta.',
    color_tag: 'rose',
    favorita: false,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000012',
    nombre: 'Soletillas',
    categoria: 'Masas y Bases',
    descripcion:
      'Registro del 11 de noviembre: receta recalculada a partir de 256 g de claras, 149 g de yemas y 15 g de vainilla.',
    rendimiento_cantidad: 1,
    rendimiento_unidad: 'lote',
    unidades_por_pack: 1,
    nombre_pack: 'Lote',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Horno',
    notas_chefcita:
      'DATOS (11 nov): 256 g claras, 149 g yemas, 15 g vainilla. FALTA DATO: demás ingredientes de la receta original, rendimiento en unidades, costos de claras/yemas/vainilla y precio de venta.',
    color_tag: 'amber',
    favorita: false,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000012',
        1,
        'd01ce000-0000-4000-8000-000000000012',
        'masa',
        256,
        'g',
        'Falta precio de claras'
      ),
      item(
        'd01ce000-0000-4000-9000-000000000012',
        2,
        'd01ce000-0000-4000-8000-000000000013',
        'masa',
        149,
        'g',
        'Falta precio de yemas'
      ),
      item(
        'd01ce000-0000-4000-9000-000000000012',
        3,
        'd01ce000-0000-4000-8000-000000000014',
        'masa',
        15,
        'g',
        'Falta precio de vainilla'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000013',
    nombre: 'Mousse de limón sin azúcar',
    categoria: 'Postres',
    descripcion: 'Producto mencionado en conversación del 22 de octubre.',
    rendimiento_cantidad: 1,
    rendimiento_unidad: 'lote',
    unidades_por_pack: 1,
    nombre_pack: 'Lote',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Refrigerado',
    notas_chefcita:
      'DATO (22 oct): solo se recuperó el nombre. FALTA DATO: receta completa, cantidades, rendimiento, costos y precio de venta.',
    color_tag: 'amber',
    favorita: false,
    costo_incompleto: true,
    items: [],
    pasos: [],
    updated_at: NOW,
  },
  {
    id: 'd01ce000-0000-4000-9000-000000000014',
    nombre: 'Preparación de limón y huevo',
    categoria: 'Masas y Bases',
    descripcion: 'Consulta del 1 de noviembre: preparación con 4 limones y huevos.',
    rendimiento_cantidad: 1,
    rendimiento_unidad: 'lote',
    unidades_por_pack: 1,
    nombre_pack: 'Lote',
    porcentaje_gastos_extras: 0,
    costo_mano_obra_lote: 0,
    margen_objetivo_porcentaje: 60,
    precio_venta_unidad: 0,
    precio_venta_pack: 0,
    precio_venta_lote: 0,
    tiempo_preparacion_min: 30,
    tiempo_horneado_min: 0,
    temperatura_horno_c: 0,
    metodo_coccion: 'Olla',
    notas_chefcita:
      'DATO (1 nov): 4 limones y huevos. FALTA DATO: nombre definitivo, cantidad de huevos, demás ingredientes, rendimiento, costos y precio de venta.',
    color_tag: 'amber',
    favorita: false,
    costo_incompleto: true,
    items: [
      item(
        'd01ce000-0000-4000-9000-000000000014',
        1,
        'd01ce000-0000-4000-8000-000000000015',
        'masa',
        4,
        'u',
        'Falta precio de limones'
      ),
    ],
    pasos: [],
    updated_at: NOW,
  },
];

function sqlText(val) {
  return `'${String(val ?? '').replace(/'/g, "''")}'`;
}

function buildSeedSql() {
  const lines = [
    '-- Seed generado desde scripts/seed-dulce-rubi.mjs (Inventario Dulce Rubí)',
    '',
    'INSERT INTO public.insumos (id, nombre, tipo, categoria, precio_compra, cantidad_paquete, unidad, stock_actual, stock_minimo, proveedor, notas)',
    'VALUES',
    DULCE_RUBI_INSUMOS.map(
      (i) =>
        `  (${sqlText(i.id)}, ${sqlText(i.nombre)}, ${sqlText(i.tipo)}, ${sqlText(i.categoria)}, ${i.precio_compra}, ${i.cantidad_paquete}, ${sqlText(i.unidad)}, ${i.stock_actual}, ${i.stock_minimo}, ${sqlText(i.proveedor)}, ${sqlText(i.notas)})`
    ).join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
    '',
    'INSERT INTO public.recetas (id, nombre, categoria, descripcion, rendimiento_cantidad, rendimiento_unidad, unidades_por_pack, nombre_pack, porcentaje_gastos_extras, costo_mano_obra_lote, margen_objetivo_porcentaje, precio_venta_unidad, precio_venta_pack, precio_venta_lote, tiempo_preparacion_min, tiempo_horneado_min, temperatura_horno_c, metodo_coccion, notas_chefcita, color_tag, favorita, costo_incompleto)',
    'VALUES',
    DULCE_RUBI_RECETAS.map(
      (r) =>
        `  (${sqlText(r.id)}, ${sqlText(r.nombre)}, ${sqlText(r.categoria)}, ${sqlText(r.descripcion)}, ${r.rendimiento_cantidad}, ${sqlText(r.rendimiento_unidad)}, ${r.unidades_por_pack}, ${sqlText(r.nombre_pack)}, ${r.porcentaje_gastos_extras}, ${r.costo_mano_obra_lote}, ${r.margen_objetivo_porcentaje}, ${r.precio_venta_unidad}, ${r.precio_venta_pack}, ${r.precio_venta_lote}, ${r.tiempo_preparacion_min}, ${r.tiempo_horneado_min}, ${r.temperatura_horno_c}, ${sqlText(r.metodo_coccion)}, ${sqlText(r.notas_chefcita)}, ${sqlText(r.color_tag)}, ${r.favorita}, ${r.costo_incompleto})`
    ).join(',\n') + '\nON CONFLICT (id) DO NOTHING;',
  ];

  const allItems = DULCE_RUBI_RECETAS.flatMap((r) => r.items || []);
  if (allItems.length > 0) {
    lines.push(
      '',
      'INSERT INTO public.receta_items (id, receta_id, insumo_id, seccion, cantidad, unidad, nota, orden)',
      'VALUES',
      allItems
        .map(
          (it) =>
            `  (${sqlText(it.id)}, ${sqlText(it.receta_id)}, ${sqlText(it.insumo_id)}, ${sqlText(it.seccion)}, ${it.cantidad}, ${sqlText(it.unidad)}, ${sqlText(it.nota)}, ${it.orden})`
        )
        .join(',\n') + '\nON CONFLICT (id) DO NOTHING;'
    );
  }

  return `${lines.join('\n')}\n`;
}

async function run() {
  if (process.argv.includes('--write-sql')) {
    const outPath = resolve(process.cwd(), 'supabase', 'seed.sql');
    writeFileSync(outPath, buildSeedSql(), 'utf8');
    console.log(`Archivo SQL actualizado en ${outPath}`);
    process.exit(0);
  }

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Verificar insumo existente ("Alulosa X mayor") para no sobrescribirlo ni duplicarlo
  const existingInsumosSnap = await getDocs(collection(db, 'insumos'));
  const existingIds = new Set();
  existingInsumosSnap.forEach((d) => existingIds.add(d.id));
  console.log(`Insumos ya existentes en Firestore: ${existingIds.size}`);

  let insumosEscritos = 0;
  for (const insumo of DULCE_RUBI_INSUMOS) {
    await setDoc(doc(db, 'insumos', insumo.id), insumo, { merge: true });
    insumosEscritos += 1;
  }

  let recetasEscritas = 0;
  for (const receta of DULCE_RUBI_RECETAS) {
    await setDoc(doc(db, 'recetas', receta.id), receta, { merge: true });
    recetasEscritas += 1;
  }

  console.log(`Carga completada en Firestore: ${insumosEscritos} insumos, ${recetasEscritas} recetas.`);
  process.exit(0);
}

const isMain =
  Boolean(process.argv[1]) && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  run().catch((err) => {
    console.error('Error al cargar inventario Dulce Rubí:', err);
    process.exit(1);
  });
}
