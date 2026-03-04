# 📊 Scripts de Base de Datos - SGS DG v2

## Descripción

Este directorio contiene scripts SQL para verificar y poblar la base de datos con datos iniciales necesarios para el desarrollo y pruebas del sistema.

---

## 📁 Archivos Disponibles

### 1. `verificar_datos.sql`
**Propósito:** Verificar que existan datos en las tablas críticas del sistema.

**Qué verifica:**
- ✅ Clientes activos
- ✅ Tipos de servicio activos
- ✅ Visitas técnicas completadas
- ✅ Usuarios técnicos y supervisores activos
- ✅ Materiales activos con stock
- ✅ Condiciones de pago activas

**Cómo ejecutar:**
```bash
# Opción 1: Desde la línea de comandos
psql -U postgres -d nombre_base_datos -f scripts/verificar_datos.sql

# Opción 2: Dentro de psql
\i C:/Users/pc/Desktop/proyectos/SGS DG v2/backend_sistema_gestion_servicios_dig_group/scripts/verificar_datos.sql
```

**Resultado esperado:**
El script mostrará un resumen de cuántos registros existen en cada tabla crítica. Si alguna tabla tiene 0 registros, debes ejecutar el script de seeds.

---

### 2. `initial_data.sql`
**Propósito:** Poblar la base de datos con datos de prueba para desarrollo.

**Qué inserta:**
- 6 Tipos de servicio (Mantenimiento, Instalación, etc.)
- 7 Condiciones de pago (Contado, 30 días, etc.)
- 10 Clientes de prueba (jurídicos y naturales)
- 8 Categorías de materiales
- 18 Materiales básicos con stock

**Cómo ejecutar:**
```bash
# Opción 1: Desde la línea de comandos
psql -U postgres -d nombre_base_datos -f seeds/initial_data.sql

# Opción 2: Dentro de psql
\i C:/Users/pc/Desktop/proyectos/SGS DG v2/backend_sistema_gestion_servicios_dig_group/seeds/initial_data.sql
```

**Resultado esperado:**
El script insertará todos los datos y mostrará un resumen al final indicando cuántos registros se insertaron en cada tabla.

---

## 🔧 Flujo de Trabajo Recomendado

### Paso 1: Verificar Estado Actual
```bash
psql -U postgres -d nombre_base_datos -f scripts/verificar_datos.sql
```

### Paso 2: Si hay tablas vacías, ejecutar Seeds
```bash
psql -U postgres -d nombre_base_datos -f seeds/initial_data.sql
```

### Paso 3: Verificar nuevamente
```bash
psql -U postgres -d nombre_base_datos -f scripts/verificar_datos.sql
```

---

## 📝 Notas Importantes

### Configuración de Base de Datos

**Nombre de la base de datos:**
- Reemplaza `nombre_base_datos` con el nombre real de tu base de datos
- Por defecto suele ser: `gestion_servicios_dig_group` o similar

**Usuario de PostgreSQL:**
- El usuario por defecto es `postgres`
- Si usas otro usuario, reemplaza en los comandos

**Puerto de PostgreSQL:**
- Por defecto PostgreSQL usa el puerto `5432`
- Si usas otro puerto, agrega `-p PUERTO` al comando

### Ejemplo con configuración personalizada:
```bash
psql -U mi_usuario -d mi_base_datos -p 5433 -f seeds/initial_data.sql
```

---

## ⚠️ Advertencias

1. **Datos Duplicados:**
   - El script `initial_data.sql` usa `ON CONFLICT` para evitar duplicados
   - Es seguro ejecutarlo múltiples veces

2. **Datos de Producción:**
   - ⚠️ **NO ejecutar estos scripts en producción**
   - Son solo para desarrollo y pruebas

3. **Backup:**
   - Siempre haz backup de tu base de datos antes de ejecutar scripts
   ```bash
   pg_dump -U postgres nombre_base_datos > backup_$(date +%Y%m%d).sql
   ```

---

## 🐛 Solución de Problemas

### Error: "No such file or directory"
**Solución:** Verifica que estés en el directorio correcto
```bash
cd "C:\Users\pc\Desktop\proyectos\SGS DG v2\backend_sistema_gestion_servicios_dig_group"
```

### Error: "FATAL: password authentication failed"
**Solución:** Verifica tu contraseña de PostgreSQL
```bash
psql -U postgres -W  # Te pedirá la contraseña
```

### Error: "database does not exist"
**Solución:** Crea la base de datos primero
```sql
CREATE DATABASE nombre_base_datos;
```

### Error: "relation does not exist"
**Solución:** Ejecuta primero el script de creación de tablas (schema)
```bash
psql -U postgres -d nombre_base_datos -f temp/schema/schema_gestion_servicios_dig_v1.sql
```

---

## 📧 Soporte

Si tienes problemas ejecutando los scripts:
1. Verifica que PostgreSQL esté corriendo
2. Verifica tus credenciales de acceso
3. Revisa los logs de errores
4. Consulta la documentación de PostgreSQL

---

**Última actualización:** 2025-11-13
