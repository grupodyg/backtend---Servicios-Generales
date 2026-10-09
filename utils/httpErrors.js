/**
 * Respuestas de error homogéneas para toda la API.
 *
 * Forma de cualquier respuesta de error:
 *   {
 *     error:      'Título corto'                      (compatibilidad con el frontend existente)
 *     message:    'Por qué ocurrió y cómo corregirlo' (lo que se muestra al usuario)
 *     tipo:       'validacion' | 'conflicto' | 'no_encontrado' | 'permiso' | 'sesion' | 'interno' | 'no_disponible'
 *     referencia: 'A1B2C3D4'                          (solo errores internos: permite buscarlo en los logs)
 *   }
 *
 * Los errores de PostgreSQL que provienen de datos del usuario (duplicados, registros
 * relacionados, formatos inválidos...) se traducen a 4xx con una explicación concreta.
 * El resto se responde como "Error interno del servidor" con un código de referencia.
 */
const crypto = require('crypto');

// Nombres legibles de las columnas que aparecen en restricciones de la BD
const ETIQUETAS_COLUMNAS = {
  email: 'correo electrónico',
  ruc: 'RUC',
  dni: 'DNI',
  name: 'nombre',
  code: 'código',
  prefix: 'prefijo',
  number: 'número',
  specialty: 'especialidad',
  phone: 'teléfono',
  client_id: 'cliente',
  order_id: 'orden de trabajo',
  work_order_id: 'orden de trabajo',
  user_id: 'usuario',
  role_id: 'rol',
  permission_id: 'permiso',
  category_id: 'categoría',
  material_id: 'material',
  tool_id: 'herramienta',
  quotation_id: 'cotización',
  technical_visit_id: 'visita técnica',
  installation_id: 'instalación',
  report_id: 'reporte',
  permit_id: 'permiso de empleado',
  employee_id: 'empleado',
  contact_id: 'contacto',
  service_type: 'tipo de servicio',
  due_date: 'fecha de vencimiento',
  start_date: 'fecha de inicio',
  end_date: 'fecha de fin',
  description: 'descripción',
  location: 'ubicación',
  status: 'estado',
  type: 'tipo',
  quantity: 'cantidad',
  unit: 'unidad',
  price: 'precio',
  password: 'contraseña'
};

// Nombres legibles de las tablas (para explicar qué registros dependen de otro)
const ETIQUETAS_TABLAS = {
  app_settings: 'configuración de la aplicación',
  client_contacts: 'contactos de clientes',
  clients: 'clientes',
  communications: 'comunicaciones',
  daily_reports: 'reportes diarios',
  employee_permits: 'permisos de empleados',
  final_report_items: 'ítems de informes finales',
  final_reports: 'informes finales',
  installations: 'instalaciones',
  material_categories: 'categorías de materiales',
  material_request_items: 'ítems de solicitudes de materiales',
  material_requests: 'solicitudes de materiales',
  materials: 'materiales',
  notifications: 'notificaciones',
  order_photos: 'fotos de órdenes',
  payment_conditions: 'condiciones de pago',
  payroll_slips: 'boletas de pago',
  permissions: 'permisos',
  permit_attachments: 'adjuntos de permisos',
  quotation_items: 'ítems de cotizaciones',
  quotations: 'cotizaciones',
  report_materials: 'materiales de reportes',
  report_photos: 'fotos de reportes',
  roles: 'roles',
  roles_permissions: 'permisos asignados a roles',
  service_types: 'tipos de servicio',
  specialty_rates: 'tarifas de especialidad',
  technical_visit_technicians: 'técnicos de visitas técnicas',
  technical_visits: 'visitas técnicas',
  tool_categories: 'categorías de herramientas',
  tool_request_items: 'ítems de solicitudes de herramientas',
  tool_requests: 'solicitudes de herramientas',
  tools: 'herramientas',
  users: 'usuarios',
  work_order_history: 'historial de órdenes',
  work_orders: 'órdenes de trabajo'
};

const etiquetaColumna = (columna) => ETIQUETAS_COLUMNAS[columna] || (columna || '').replace(/_/g, ' ');
const etiquetaTabla = (tabla) => ETIQUETAS_TABLAS[tabla] || (tabla || '').replace(/_/g, ' ');

// Códigos de error de red / conexión con la base de datos
const CODIGOS_SIN_CONEXION = new Set([
  'ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN',
  '57P01', '57P02', '57P03', // admin_shutdown, crash_shutdown, cannot_connect_now
  '53300', // too_many_connections
  '08000', '08001', '08003', '08004', '08006' // connection_exception
]);

/**
 * "Key (email)=(ana@x.com) already exists." -> { columnas: ['email'], valores: ['ana@x.com'] }
 */
const parsearDetalleClave = (detalle) => {
  const match = /Key \(([^)]+)\)=\((.*)\)/.exec(detalle || '');
  if (!match) return { columnas: [], valores: [] };
  return {
    columnas: match[1].split(',').map(c => c.trim().replace(/"/g, '')),
    valores: match[2].split(',').map(v => v.trim())
  };
};

/**
 * Traduce un error de PostgreSQL a una respuesta entendible por el usuario.
 * Devuelve null si el error no es de datos (es decir, es un fallo interno).
 */
const traducirErrorBD = (error) => {
  if (!error || typeof error !== 'object') return null;
  const { code, detail, column, table, constraint } = error;

  if (CODIGOS_SIN_CONEXION.has(code)) {
    return {
      status: 503,
      error: 'Servicio no disponible',
      message: 'El servidor no pudo conectarse con la base de datos en este momento. No es un problema de los datos que ingresaste: espera unos minutos y vuelve a intentarlo. Si el problema continúa, avisa al administrador del sistema.',
      tipo: 'no_disponible'
    };
  }

  switch (code) {
    case '23505': { // unique_violation
      const { columnas, valores } = parsearDetalleClave(detail);
      const campos = columnas.map(etiquetaColumna).join(' y ') || 'uno de los campos';
      const valor = valores.length === 1 ? ` «${valores[0]}»` : '';
      return {
        status: 409,
        error: 'Registro duplicado',
        message: `Ya existe un registro con el mismo ${campos}${valor}. Ese dato debe ser único: cámbialo en el formulario por uno que no esté registrado, o busca y edita el registro existente.`,
        tipo: 'conflicto'
      };
    }
    case '23503': { // foreign_key_violation
      const { columnas } = parsearDetalleClave(detail);
      const campo = columnas.length ? etiquetaColumna(columnas[0]) : 'registro relacionado';
      const referenciadoDesde = /referenced from table "([^"]+)"/.exec(detail || '');
      if (referenciadoDesde) {
        const dependiente = etiquetaTabla(referenciadoDesde[1]);
        return {
          status: 409,
          error: 'Registro en uso',
          message: `No se puede completar la operación porque este registro todavía está vinculado a ${dependiente}. Elimina o reasigna primero esos registros relacionados y vuelve a intentarlo.`,
          tipo: 'conflicto'
        };
      }
      return {
        status: 400,
        error: 'Referencia no válida',
        message: `El ${campo} seleccionado no existe o fue eliminado. Recarga la página y vuelve a seleccionar el ${campo} en el formulario.`,
        tipo: 'validacion'
      };
    }
    case '23502': { // not_null_violation
      const campo = etiquetaColumna(column);
      return {
        status: 400,
        error: 'Falta un dato obligatorio',
        message: `El campo «${campo}» es obligatorio y llegó vacío. Complétalo en el formulario y vuelve a guardar.`,
        tipo: 'validacion'
      };
    }
    case '23514': { // check_violation
      const regla = constraint ? ` (regla «${constraint}»${table ? ` de ${etiquetaTabla(table)}` : ''})` : '';
      return {
        status: 400,
        error: 'Valor no permitido',
        message: `Uno de los valores ingresados no cumple las reglas permitidas${regla}. Revisa los campos del formulario (por ejemplo, cantidades negativas, estados o tipos no válidos) y corrígelos.`,
        tipo: 'validacion'
      };
    }
    case '22P02': // invalid_text_representation
      return {
        status: 400,
        error: 'Formato no válido',
        message: 'Uno de los valores tiene un formato no válido (por ejemplo, texto en un campo numérico o un identificador incorrecto). Revisa los campos numéricos y de selección del formulario.',
        tipo: 'validacion'
      };
    case '22001': // string_data_right_truncation
      return {
        status: 400,
        error: 'Texto demasiado largo',
        message: 'Uno de los textos ingresados supera la longitud máxima permitida para su campo. Acorta el texto (nombres, códigos, prefijos o descripciones) y vuelve a guardar.',
        tipo: 'validacion'
      };
    case '22003': // numeric_value_out_of_range
      return {
        status: 400,
        error: 'Número fuera de rango',
        message: 'Uno de los valores numéricos es demasiado grande o tiene demasiados decimales para su campo. Revisa cantidades, precios y porcentajes.',
        tipo: 'validacion'
      };
    case '22007': // invalid_datetime_format
    case '22008': // datetime_field_overflow
      return {
        status: 400,
        error: 'Fecha no válida',
        message: 'Una de las fechas u horas ingresadas no es válida. Revisa los campos de fecha y hora del formulario.',
        tipo: 'validacion'
      };
    default:
      return null;
  }
};

const generarReferencia = () => crypto.randomBytes(4).toString('hex').toUpperCase();

/**
 * Responde a un error capturado en un controlador.
 * - Errores de datos (duplicados, registros en uso, formatos...) -> 4xx con explicación concreta.
 * - Cualquier otro fallo -> 500 "Error interno del servidor" con un código de referencia
 *   que también queda en el log, para poder localizarlo.
 *
 * @param {import('express').Response} res
 * @param {Error} error   Error capturado
 * @param {string} accion Descripción de lo que se intentaba hacer (ej: 'Error al crear cliente')
 */
const responderErrorServidor = (res, error, accion = 'Error al procesar la solicitud') => {
  const traducido = traducirErrorBD(error);
  if (traducido) {
    const { status, ...cuerpo } = traducido;
    console.warn(`⚠️ ${accion} [${error.code}]: ${error.detail || error.message}`);
    return res.status(status).json(cuerpo);
  }

  const referencia = generarReferencia();
  console.error(`🔴 [${referencia}] ${accion}:`, error);

  const cuerpo = {
    error: 'Error interno del servidor',
    message: `${accion}: ocurrió un fallo inesperado en el servidor. No es un problema de los datos que ingresaste. Vuelve a intentarlo en unos minutos; si el error se repite, comunícalo al administrador del sistema indicando el código de referencia ${referencia}.`,
    tipo: 'interno',
    referencia
  };
  if (process.env.NODE_ENV === 'development' && error?.message) {
    cuerpo.detalleTecnico = error.message;
  }
  return res.status(500).json(cuerpo);
};

module.exports = {
  traducirErrorBD,
  responderErrorServidor,
  generarReferencia
};
