-- Migración: Crear tabla app_settings (clave/valor) para branding del login y sidebar
-- Fecha: 2026-05-28
-- Descripción: Permite configurar dinámicamente logo, nombre de empresa y subtítulo desde la UI

CREATE TABLE IF NOT EXISTS "app_settings" (
  "key"                    VARCHAR(100) PRIMARY KEY,
  "value"                  TEXT,
  "date_time_modification" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "user_id_modification"   INTEGER
);

INSERT INTO "app_settings" ("key", "value")
VALUES
  ('company_name',     'DIG Group'),
  ('company_subtitle', 'Sistema de Gestión de Mantenimiento'),
  ('login_logo_url',   '')
ON CONFLICT ("key") DO NOTHING;
