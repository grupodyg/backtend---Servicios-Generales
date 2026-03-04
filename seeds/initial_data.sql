-- ============================================================
-- SEEDS: Datos Iniciales para Desarrollo y Pruebas
-- Sistema: SGS DG v2 - Sistema de Gestión de Servicios Dig Group
-- Fecha: 2025-11-13
-- Propósito: Poblar la base de datos con datos de prueba
-- ============================================================

BEGIN;

\echo '===================================================='
\echo 'INSERCIÓN DE DATOS INICIALES - SGS DG v2'
\echo '===================================================='
\echo ''

-- ============================================================
-- 1. TIPOS DE SERVICIO
-- ============================================================
\echo '1. Insertando TIPOS DE SERVICIO...'

INSERT INTO service_types (name, description, icon, color, display_order, status, user_id_registration, date_time_registration)
VALUES
  ('Mantenimiento Preventivo', 'Mantenimiento programado y preventivo de equipos', 'wrench', '#3B82F6', 1, 'active', 1, CURRENT_TIMESTAMP),
  ('Mantenimiento Correctivo', 'Reparación de fallas y averías en equipos', 'tools', '#EF4444', 2, 'active', 1, CURRENT_TIMESTAMP),
  ('Instalación', 'Instalación de nuevos equipos y sistemas', 'plus-circle', '#10B981', 3, 'active', 1, CURRENT_TIMESTAMP),
  ('Inspección Técnica', 'Inspección y diagnóstico de equipos', 'search', '#F59E0B', 4, 'active', 1, CURRENT_TIMESTAMP),
  ('Asesoría Técnica', 'Consultoría y asesoramiento técnico', 'lightbulb', '#8B5CF6', 5, 'active', 1, CURRENT_TIMESTAMP),
  ('Calibración', 'Calibración de equipos de medición', 'adjustments', '#EC4899', 6, 'active', 1, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  display_order = EXCLUDED.display_order,
  status = EXCLUDED.status;

\echo '   ✓ Tipos de servicio insertados'
\echo ''

-- ============================================================
-- 2. CONDICIONES DE PAGO
-- ============================================================
\echo '2. Insertando CONDICIONES DE PAGO...'

INSERT INTO payment_conditions (name, description, display_order, status, user_id_registration, date_time_registration)
VALUES
  ('Contado', 'Pago inmediato al completar el servicio', 1, 'active', 1, CURRENT_TIMESTAMP),
  ('15 días', 'Pago a 15 días calendario', 2, 'active', 1, CURRENT_TIMESTAMP),
  ('30 días', 'Pago a 30 días calendario', 3, 'active', 1, CURRENT_TIMESTAMP),
  ('45 días', 'Pago a 45 días calendario', 4, 'active', 1, CURRENT_TIMESTAMP),
  ('60 días', 'Pago a 60 días calendario', 5, 'active', 1, CURRENT_TIMESTAMP),
  ('90 días', 'Pago a 90 días calendario', 6, 'active', 1, CURRENT_TIMESTAMP),
  ('50% Adelanto + 50% Contra Entrega', 'Pago en dos partes', 7, 'active', 1, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  display_order = EXCLUDED.display_order,
  status = EXCLUDED.status;

\echo '   ✓ Condiciones de pago insertadas'
\echo ''

-- ============================================================
-- 3. CLIENTES DE PRUEBA
-- ============================================================
\echo '3. Insertando CLIENTES DE PRUEBA...'

INSERT INTO clients (type, name, ruc, dni, email, phone, address, category, notes, status, user_id_registration, date_time_registration)
VALUES
  -- Clientes Jurídicos Premium
  ('juridico', 'Corporación ABC S.A.C.', '20123456789', NULL, 'contacto@abc-corp.com', '987654321', 'Av. Javier Prado Este 476, San Isidro, Lima', 'premium', 'Cliente corporativo premium con contrato anual de mantenimiento', 'active', 1, CURRENT_TIMESTAMP),
  ('juridico', 'Industrias XYZ E.I.R.L.', '20987654321', NULL, 'info@xyz-industrias.com', '912345678', 'Jr. Comercio 456, Cercado de Lima', 'premium', 'Cliente industrial con múltiples equipos HVAC', 'active', 1, CURRENT_TIMESTAMP),
  ('juridico', 'Grupo Empresarial DEF S.A.', '20555666777', NULL, 'servicios@grupodef.com', '945678901', 'Av. Benavides 1234, Miraflores, Lima', 'premium', 'Cliente con 5 sucursales en Lima', 'active', 1, CURRENT_TIMESTAMP),

  -- Clientes Jurídicos Regulares
  ('juridico', 'Comercial GHI S.R.L.', '20111222333', NULL, 'ventas@comercialghi.com', '923456789', 'Av. Colonial 789, Callao', 'regular', 'Cliente de servicios de mantenimiento mensual', 'active', 1, CURRENT_TIMESTAMP),
  ('juridico', 'Servicios JKL E.I.R.L.', '20444555666', NULL, 'contacto@serviciosjkl.com', '934567890', 'Av. Argentina 321, Cercado de Lima', 'regular', 'Cliente regular desde 2023', 'active', 1, CURRENT_TIMESTAMP),

  -- Clientes Naturales
  ('natural', 'Juan Carlos Pérez López', NULL, '12345678', 'juan.perez@email.com', '999888777', 'Calle Los Olivos 789, San Juan de Lurigancho, Lima', 'regular', 'Cliente particular - Casa de 2 pisos con sistema centralizado', 'active', 1, CURRENT_TIMESTAMP),
  ('natural', 'María Elena García Torres', NULL, '87654321', 'maria.garcia@email.com', '988777666', 'Av. Los Pinos 321, Surco, Lima', 'premium', 'Cliente VIP - Mantenimiento trimestral de piscina y HVAC', 'active', 1, CURRENT_TIMESTAMP),
  ('natural', 'Carlos Alberto Rodríguez Sánchez', NULL, '11223344', 'carlos.rodriguez@email.com', '977666555', 'Jr. Las Flores 456, La Molina, Lima', 'basico', 'Cliente particular - Servicio esporádico', 'active', 1, CURRENT_TIMESTAMP),
  ('natural', 'Ana Sofía Martínez Vega', NULL, '55667788', 'ana.martinez@email.com', '966555444', 'Av. Universitaria 654, Los Olivos, Lima', 'regular', 'Cliente particular - Mantenimiento semestral', 'active', 1, CURRENT_TIMESTAMP),
  ('natural', 'Luis Fernando Torres Castro', NULL, '99887766', 'luis.torres@email.com', '955444333', 'Calle San Martín 123, Miraflores, Lima', 'regular', 'Cliente particular con 2 equipos de aire acondicionado', 'active', 1, CURRENT_TIMESTAMP)
ON CONFLICT DO NOTHING;

\echo '   ✓ Clientes de prueba insertados'
\echo ''

-- ============================================================
-- 4. CATEGORÍAS DE MATERIALES
-- ============================================================
\echo '4. Insertando CATEGORÍAS DE MATERIALES...'

-- Insertar solo las categorías que no existen
INSERT INTO material_categories (name, prefix, description, status, user_id_registration, date_time_registration)
VALUES
  ('Refrigeración', 'REFR', 'Materiales y repuestos para sistemas de refrigeración', 'active', 1, CURRENT_TIMESTAMP),
  ('Químicos', 'QUIM', 'Productos químicos y refrigerantes', 'active', 1, CURRENT_TIMESTAMP),
  ('Filtros', 'FILT', 'Filtros de aire, agua y aceite', 'active', 1, CURRENT_TIMESTAMP),
  ('Seguridad', 'SEGU', 'Equipo de protección personal', 'active', 1, CURRENT_TIMESTAMP)
ON CONFLICT (name) DO NOTHING;

\echo '   ✓ Categorías de materiales insertadas'
\echo ''

-- ============================================================
-- 5. MATERIALES BÁSICOS
-- ============================================================
\echo '5. Insertando MATERIALES BÁSICOS...'
\echo '   (Saltando - Ya existen materiales en la base de datos)'
\echo ''

-- ============================================================
-- 6. HERRAMIENTAS BÁSICAS
-- ============================================================
\echo '6. Insertando HERRAMIENTAS BÁSICAS...'

INSERT INTO tools (code, name, brand, model, quantity, status, user_id_registration, date_time_registration)
VALUES
  ('TOOL-001', 'Taladro eléctrico', 'Bosch', 'GSB 13 RE', 3, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-002', 'Destornillador Phillips', 'Stanley', 'STHT65214', 8, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-003', 'Destornillador plano', 'Stanley', 'STHT65209', 8, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-004', 'Multímetro digital', 'Fluke', '117', 4, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-005', 'Llave inglesa ajustable 12"', 'Bahco', '9031', 6, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-006', 'Alicates universales', 'Klein Tools', 'D213-9NE', 5, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-007', 'Martillo de goma', 'Truper', 'MG-1', 4, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-008', 'Nivel de burbuja 24"', 'Stanley', 'STHT42465', 3, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-009', 'Metro de 5 metros', 'Stanley', 'STHT33561L', 10, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-010', 'Sierra de mano', 'DeWalt', 'DWHT20544', 2, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-011', 'Soldador eléctrico 60W', 'Weller', 'WLC100', 2, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-012', 'Pistola de calor', 'Bosch', 'GHG 600 CE', 2, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-013', 'Aspiradora industrial', 'Kärcher', 'WD 3 Premium', 2, 'available', 1, CURRENT_TIMESTAMP),
  ('TOOL-014', 'Escalera de aluminio 6 pasos', 'Cuprum', 'AL-106', 3, 'available', 1, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  quantity = EXCLUDED.quantity,
  status = EXCLUDED.status;

\echo '   ✓ Herramientas básicas insertadas'
\echo ''

-- ============================================================
-- COMMIT Y VERIFICACIÓN
-- ============================================================

COMMIT;

\echo '===================================================='
\echo 'DATOS INICIALES INSERTADOS CORRECTAMENTE'
\echo '===================================================='
\echo ''
\echo 'RESUMEN:'
SELECT
    'Tipos de Servicio' as tabla,
    COUNT(*) as registros_insertados
FROM service_types WHERE status = 'active'
UNION ALL
SELECT
    'Condiciones de Pago',
    COUNT(*)
FROM payment_conditions WHERE status = 'active'
UNION ALL
SELECT
    'Clientes',
    COUNT(*)
FROM clients WHERE status = 'active'
UNION ALL
SELECT
    'Categorías de Materiales',
    COUNT(*)
FROM material_categories WHERE status = 'active'
UNION ALL
SELECT
    'Materiales',
    COUNT(*)
FROM materials WHERE status = 'active'
UNION ALL
SELECT
    'Herramientas',
    COUNT(*)
FROM tools WHERE status = 'available';

\echo ''
\echo '✓ Base de datos lista para desarrollo y pruebas'
\echo ''
