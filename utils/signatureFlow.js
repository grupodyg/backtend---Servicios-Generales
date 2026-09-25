/**
 * Flujo de firmas del informe final.
 *
 * La configuración de firmas vive en work_orders.signature_config con la forma
 *   { tecnico: boolean, supervisor: boolean, administrador: boolean }
 * donde true = obligatoria y false = opcional. Las firmas se recogen en el orden
 * técnico → supervisor → administrador, saltando las opcionales.
 *
 * Este módulo es la única fuente de verdad del backend para:
 *   - normalizar/validar la configuración recibida
 *   - calcular el estado del informe final a partir de la configuración y las firmas
 */

const SIGNATURE_TYPES = ['tecnico', 'supervisor', 'administrador'];

const DEFAULT_SIGNATURE_CONFIG = Object.freeze({
  tecnico: true,
  supervisor: true,
  administrador: true
});

const PENDING_STATUS_BY_TYPE = Object.freeze({
  tecnico: 'pendiente_firma_tecnico',
  supervisor: 'pendiente_firma_supervisor',
  administrador: 'pendiente_firma_administrador'
});

const COMPLETED_STATUS = 'completado';

const parseJson = (value) => {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (e) {
    return null;
  }
};

/**
 * Devuelve siempre un objeto con las tres claves. Cualquier valor que no sea
 * exactamente `false` se interpreta como obligatoria (true).
 */
const normalizeSignatureConfig = (rawConfig) => {
  const config = parseJson(rawConfig);
  const source = config && typeof config === 'object' && !Array.isArray(config) ? config : {};
  return SIGNATURE_TYPES.reduce((acc, type) => {
    acc[type] = source[type] !== false;
    return acc;
  }, {});
};

/**
 * Valida que la configuración recibida desde el cliente tenga exactamente las
 * tres claves esperadas con valores booleanos.
 */
const isValidSignatureConfig = (rawConfig) => {
  const config = parseJson(rawConfig);
  if (!config || typeof config !== 'object' || Array.isArray(config)) return false;
  const keys = Object.keys(config);
  if (keys.length !== SIGNATURE_TYPES.length) return false;
  return SIGNATURE_TYPES.every((type) => typeof config[type] === 'boolean');
};

/**
 * Primera firma obligatoria que todavía no se ha registrado, o null si no queda ninguna.
 */
const getPendingSignatureType = (rawConfig, rawSignatures) => {
  const config = normalizeSignatureConfig(rawConfig);
  const signatures = parseJson(rawSignatures) || {};
  return SIGNATURE_TYPES.find((type) => config[type] && !signatures[type]) || null;
};

/**
 * Estado y bloqueo que corresponden a un informe final dada su configuración y sus firmas.
 */
const computeSignatureStatus = (rawConfig, rawSignatures) => {
  const pending = getPendingSignatureType(rawConfig, rawSignatures);
  if (!pending) {
    return { status: COMPLETED_STATUS, blocked: true };
  }
  return { status: PENDING_STATUS_BY_TYPE[pending], blocked: false };
};

module.exports = {
  SIGNATURE_TYPES,
  DEFAULT_SIGNATURE_CONFIG,
  PENDING_STATUS_BY_TYPE,
  COMPLETED_STATUS,
  normalizeSignatureConfig,
  isValidSignatureConfig,
  getPendingSignatureType,
  computeSignatureStatus
};
