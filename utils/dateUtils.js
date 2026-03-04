/**
 * Utilidades centralizadas para manejo de fechas en el Backend
 * Timezone: America/Lima (UTC-5)
 *
 * IMPORTANTE: Este archivo centraliza todo el manejo de fechas para garantizar
 * consistencia entre desarrollo local y produccion (Railway)
 *
 * REGLA DE ORO: Todas las fechas se manejan en zona horaria de Lima (America/Lima)
 * para evitar desfases entre desarrollo local y produccion.
 */

const TIMEZONE = 'America/Lima';
const LOCALE = 'es-PE';
const TIMEZONE_OFFSET = '-05:00'; // UTC-5 para Peru

/**
 * Obtiene la fecha/hora actual en timezone de Lima
 * @returns {Date} Fecha actual ajustada a America/Lima
 */
const getCurrentDate = () => {
  return new Date(new Date().toLocaleString('en-US', { timeZone: TIMEZONE }));
};

/**
 * Obtiene el timestamp actual en formato ISO con zona horaria de Lima
 * FORMATO: 2025-01-17T14:30:00.000-05:00
 * @returns {string} Timestamp ISO con offset de Lima
 */
const getCurrentTimestamp = () => {
  const now = new Date();
  // Obtener componentes de fecha/hora en timezone de Lima
  const options = { timeZone: TIMEZONE, hour12: false };
  const parts = new Intl.DateTimeFormat('en-CA', {
    ...options,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3
  }).formatToParts(now);

  // Construir ISO string con offset de Lima
  const get = (type) => parts.find(p => p.type === type)?.value || '00';
  const year = get('year');
  const month = get('month');
  const day = get('day');
  const hour = get('hour');
  const minute = get('minute');
  const second = get('second');

  // Obtener milisegundos
  const ms = now.getMilliseconds().toString().padStart(3, '0');

  return `${year}-${month}-${day}T${hour}:${minute}:${second}.${ms}${TIMEZONE_OFFSET}`;
};

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (en zona horaria de Lima)
 * @returns {string} Fecha en formato YYYY-MM-DD
 */
const getToday = () => {
  const now = new Date();
  // Formatear en timezone de Lima
  return now.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
};

/**
 * Obtiene la hora actual en formato HH:mm (en zona horaria de Lima)
 * @returns {string} Hora en formato HH:mm
 */
const getCurrentTime = () => {
  const now = new Date();
  return now.toLocaleTimeString('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

/**
 * Obtiene el ano actual
 * @returns {number} Ano actual (ej: 2025)
 */
const getCurrentYear = () => {
  return new Date().getFullYear();
};

/**
 * Obtiene el mes actual (1-12)
 * @returns {number} Mes actual
 */
const getCurrentMonth = () => {
  return new Date().getMonth() + 1;
};

/**
 * Formatea una fecha para mostrar en formato dd/MM/yyyy
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha formateada
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Formatea una fecha para mostrar en formato dd/MM/yyyy HH:mm
 * @param {Date|string} date - Fecha a formatear
 * @returns {string} Fecha y hora formateada
 */
const formatDateTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${day}/${month}/${year} ${hours}:${minutes}`;
};

/**
 * Formatea una hora en formato HH:mm
 * @param {Date|string} date - Fecha/hora a formatear
 * @returns {string} Hora formateada
 */
const formatTime = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * Convierte una fecha a formato ISO para guardar en BD
 * @param {Date|string} date - Fecha a convertir
 * @returns {string|null} Fecha en formato ISO o null
 */
const toISOString = (date) => {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

/**
 * Parsea una fecha de la BD (puede venir en varios formatos)
 * @param {string} dateString - Fecha como string
 * @returns {Date|null} Objeto Date o null
 */
const parseDate = (dateString) => {
  if (!dateString) return null;
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return null;
  return d;
};

/**
 * Verifica si una fecha es valida
 * @param {any} date - Valor a verificar
 * @returns {boolean} true si es fecha valida
 */
const isValidDate = (date) => {
  if (!date) return false;
  const d = new Date(date);
  return !isNaN(d.getTime());
};

/**
 * Obtiene la diferencia en dias entre dos fechas
 * @param {Date|string} date1 - Primera fecha
 * @param {Date|string} date2 - Segunda fecha
 * @returns {number} Diferencia en dias
 */
const diffInDays = (date1, date2) => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = Math.abs(d2 - d1);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Agrega dias a una fecha
 * @param {Date|string} date - Fecha base
 * @param {number} days - Dias a agregar (puede ser negativo)
 * @returns {Date} Nueva fecha
 */
const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

/**
 * Obtiene el inicio del dia (00:00:00)
 * @param {Date|string} date - Fecha
 * @returns {Date} Fecha al inicio del dia
 */
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Obtiene el fin del dia (23:59:59)
 * @param {Date|string} date - Fecha
 * @returns {Date} Fecha al fin del dia
 */
const endOfDay = (date) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Genera el SQL para obtener timestamp actual en zona horaria de Lima
 * Usar en queries: getCurrentTimestampSQL() en lugar de 'CURRENT_TIMESTAMP'
 * @returns {string} SQL fragment
 */
const getCurrentTimestampSQL = () => {
  return `(CURRENT_TIMESTAMP AT TIME ZONE 'UTC' AT TIME ZONE '${TIMEZONE}')`;
};

/**
 * Formatea una fecha de BD para mostrar en zona horaria de Lima
 * @param {Date|string} date - Fecha de la base de datos
 * @returns {string} Fecha formateada en dd/MM/yyyy
 */
const formatDateFromDB = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  // Formatear en zona horaria de Lima
  return d.toLocaleDateString('es-PE', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formatea una fecha/hora de BD para mostrar en zona horaria de Lima
 * @param {Date|string} date - Fecha de la base de datos
 * @returns {string} Fecha y hora formateada en dd/MM/yyyy HH:mm
 */
const formatDateTimeFromDB = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';

  // Formatear en zona horaria de Lima
  return d.toLocaleString('es-PE', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

module.exports = {
  TIMEZONE,
  TIMEZONE_OFFSET,
  LOCALE,
  getCurrentDate,
  getCurrentTimestamp,
  getCurrentTime,
  getToday,
  getCurrentYear,
  getCurrentMonth,
  formatDate,
  formatDateTime,
  formatTime,
  toISOString,
  parseDate,
  isValidDate,
  diffInDays,
  addDays,
  startOfDay,
  endOfDay,
  getCurrentTimestampSQL,
  formatDateFromDB,
  formatDateTimeFromDB
};
