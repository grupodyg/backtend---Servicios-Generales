/**
 * Script de comparación exhaustiva entre dos bases de datos PostgreSQL
 * Compara: tablas, columnas, tipos, constraints, índices, triggers,
 *          funciones, vistas, secuencias, enums, extensiones, policies
 */

const { Client } = require('pg');

const LOCAL_URL = 'postgresql://postgres:sql@localhost:5432/db_servicios_generales';
const RAILWAY_URL = 'postgresql://postgres:NjrpmvGYIRydWpbMaVAVlDOuKqeOakxk@interchange.proxy.rlwy.net:24029/railway';

// ── Queries de introspección ──────────────────────────────────────────

const QUERIES = {
  tables: `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `,

  columns: `
    SELECT
      table_name,
      column_name,
      ordinal_position,
      column_default,
      is_nullable,
      data_type,
      character_maximum_length,
      numeric_precision,
      numeric_scale,
      udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `,

  constraints: `
    SELECT
      tc.table_name,
      tc.constraint_name,
      tc.constraint_type,
      kcu.column_name,
      ccu.table_name AS foreign_table_name,
      ccu.column_name AS foreign_column_name
    FROM information_schema.table_constraints tc
    LEFT JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
    LEFT JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
    WHERE tc.table_schema = 'public'
    ORDER BY tc.table_name, tc.constraint_name;
  `,

  indexes: `
    SELECT
      tablename,
      indexname,
      indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `,

  triggers: `
    SELECT
      event_object_table AS table_name,
      trigger_name,
      event_manipulation,
      action_timing,
      action_statement
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
    ORDER BY event_object_table, trigger_name;
  `,

  functions: `
    SELECT
      p.proname AS function_name,
      pg_get_function_arguments(p.oid) AS arguments,
      pg_get_function_result(p.oid) AS return_type,
      p.prosrc AS source_code,
      l.lanname AS language,
      CASE p.prokind
        WHEN 'f' THEN 'function'
        WHEN 'p' THEN 'procedure'
        WHEN 'a' THEN 'aggregate'
        WHEN 'w' THEN 'window'
      END AS kind
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    JOIN pg_language l ON p.prolang = l.oid
    WHERE n.nspname = 'public'
    ORDER BY p.proname;
  `,

  views: `
    SELECT
      table_name AS view_name,
      view_definition
    FROM information_schema.views
    WHERE table_schema = 'public'
    ORDER BY table_name;
  `,

  sequences: `
    SELECT
      sequence_name,
      data_type,
      start_value,
      minimum_value,
      maximum_value,
      increment
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
    ORDER BY sequence_name;
  `,

  enums: `
    SELECT
      t.typname AS enum_name,
      string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS enum_values
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    JOIN pg_namespace n ON t.typnamespace = n.oid
    WHERE n.nspname = 'public'
    GROUP BY t.typname
    ORDER BY t.typname;
  `,

  extensions: `
    SELECT extname, extversion
    FROM pg_extension
    ORDER BY extname;
  `,

  policies: `
    SELECT
      schemaname,
      tablename,
      policyname,
      permissive,
      roles,
      cmd,
      qual,
      with_check
    FROM pg_policies
    WHERE schemaname = 'public'
    ORDER BY tablename, policyname;
  `,

  prisma_migrations: `
    SELECT migration_name, finished_at, applied_steps_count
    FROM _prisma_migrations
    ORDER BY finished_at;
  `,

  check_constraints: `
    SELECT
      tc.table_name,
      tc.constraint_name,
      cc.check_clause
    FROM information_schema.table_constraints tc
    JOIN information_schema.check_constraints cc
      ON tc.constraint_name = cc.constraint_name AND tc.constraint_schema = cc.constraint_schema
    WHERE tc.table_schema = 'public' AND tc.constraint_type = 'CHECK'
    ORDER BY tc.table_name, tc.constraint_name;
  `,
};

// ── Helpers ───────────────────────────────────────────────────────────

async function fetchAll(client, label) {
  const results = {};
  for (const [key, query] of Object.entries(QUERIES)) {
    try {
      const res = await client.query(query);
      results[key] = res.rows;
    } catch (err) {
      results[key] = { error: err.message };
    }
  }
  console.log(`  ✓ ${label}: ${Object.keys(results).length} consultas ejecutadas`);
  return results;
}

function toMap(rows, keyFn) {
  const map = {};
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const key = keyFn(row);
      map[key] = row;
    }
  }
  return map;
}

function toGroupMap(rows, keyFn) {
  const map = {};
  if (Array.isArray(rows)) {
    for (const row of rows) {
      const key = keyFn(row);
      if (!map[key]) map[key] = [];
      map[key].push(row);
    }
  }
  return map;
}

function normalizeDefault(val) {
  if (val === null || val === undefined) return null;
  return String(val).replace(/::[\w\s\[\]]+/g, '').replace(/'/g, '').trim();
}

function normalizeSource(src) {
  if (!src) return '';
  return src.replace(/\s+/g, ' ').trim();
}

// ── Comparadores ──────────────────────────────────────────────────────

function compareTables(local, railway) {
  const diffs = [];
  const localTables = new Set(Array.isArray(local.tables) ? local.tables.map(r => r.table_name) : []);
  const railwayTables = new Set(Array.isArray(railway.tables) ? railway.tables.map(r => r.table_name) : []);

  for (const t of localTables) {
    if (!railwayTables.has(t)) diffs.push({ type: 'SOLO_LOCAL', table: t });
  }
  for (const t of railwayTables) {
    if (!localTables.has(t)) diffs.push({ type: 'SOLO_RAILWAY', table: t });
  }
  return diffs;
}

function compareColumns(local, railway) {
  const diffs = [];
  const localCols = toMap(local.columns, r => `${r.table_name}.${r.column_name}`);
  const railwayCols = toMap(railway.columns, r => `${r.table_name}.${r.column_name}`);

  const allKeys = new Set([...Object.keys(localCols), ...Object.keys(railwayCols)]);

  for (const key of allKeys) {
    const l = localCols[key];
    const r = railwayCols[key];

    if (!l) {
      diffs.push({ type: 'SOLO_RAILWAY', column: key, detail: r });
      continue;
    }
    if (!r) {
      diffs.push({ type: 'SOLO_LOCAL', column: key, detail: l });
      continue;
    }

    const changes = [];
    if (l.data_type !== r.data_type) changes.push(`data_type: "${l.data_type}" vs "${r.data_type}"`);
    if (l.udt_name !== r.udt_name) changes.push(`udt_name: "${l.udt_name}" vs "${r.udt_name}"`);
    if (l.is_nullable !== r.is_nullable) changes.push(`nullable: "${l.is_nullable}" vs "${r.is_nullable}"`);
    if (normalizeDefault(l.column_default) !== normalizeDefault(r.column_default)) {
      changes.push(`default: "${l.column_default}" vs "${r.column_default}"`);
    }
    if (l.character_maximum_length !== r.character_maximum_length) {
      changes.push(`max_length: ${l.character_maximum_length} vs ${r.character_maximum_length}`);
    }

    if (changes.length > 0) {
      diffs.push({ type: 'DIFERENCIA', column: key, changes });
    }
  }
  return diffs;
}

function compareConstraints(local, railway) {
  const diffs = [];
  const localMap = toMap(local.constraints, r => `${r.table_name}::${r.constraint_name}::${r.column_name || ''}`);
  const railwayMap = toMap(railway.constraints, r => `${r.table_name}::${r.constraint_name}::${r.column_name || ''}`);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    if (!localMap[key]) diffs.push({ type: 'SOLO_RAILWAY', constraint: key });
    else if (!railwayMap[key]) diffs.push({ type: 'SOLO_LOCAL', constraint: key });
  }
  return diffs;
}

function compareIndexes(local, railway) {
  const diffs = [];
  const localMap = toMap(local.indexes, r => r.indexname);
  const railwayMap = toMap(railway.indexes, r => r.indexname);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    const l = localMap[key];
    const r = railwayMap[key];
    if (!l) { diffs.push({ type: 'SOLO_RAILWAY', index: key, def: r?.indexdef }); continue; }
    if (!r) { diffs.push({ type: 'SOLO_LOCAL', index: key, def: l?.indexdef }); continue; }
    if (l.indexdef !== r.indexdef) {
      diffs.push({ type: 'DIFERENCIA', index: key, local: l.indexdef, railway: r.indexdef });
    }
  }
  return diffs;
}

function compareTriggers(local, railway) {
  const diffs = [];
  const localMap = toMap(local.triggers, r => `${r.table_name}::${r.trigger_name}`);
  const railwayMap = toMap(railway.triggers, r => `${r.table_name}::${r.trigger_name}`);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    const l = localMap[key];
    const r = railwayMap[key];
    if (!l) { diffs.push({ type: 'SOLO_RAILWAY', trigger: key, detail: r }); continue; }
    if (!r) { diffs.push({ type: 'SOLO_LOCAL', trigger: key, detail: l }); continue; }
    if (l.action_statement !== r.action_statement || l.event_manipulation !== r.event_manipulation || l.action_timing !== r.action_timing) {
      diffs.push({ type: 'DIFERENCIA', trigger: key, local: l, railway: r });
    }
  }
  return diffs;
}

function compareFunctions(local, railway) {
  const diffs = [];
  const localMap = toMap(local.functions, r => `${r.function_name}(${r.arguments})`);
  const railwayMap = toMap(railway.functions, r => `${r.function_name}(${r.arguments})`);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    const l = localMap[key];
    const r = railwayMap[key];
    if (!l) { diffs.push({ type: 'SOLO_RAILWAY', function: key, return: r?.return_type }); continue; }
    if (!r) { diffs.push({ type: 'SOLO_LOCAL', function: key, return: l?.return_type }); continue; }
    if (normalizeSource(l.source_code) !== normalizeSource(r.source_code)) {
      diffs.push({ type: 'DIFERENCIA', function: key, note: 'Código fuente diferente' });
    }
    if (l.return_type !== r.return_type) {
      diffs.push({ type: 'DIFERENCIA', function: key, note: `Return type: "${l.return_type}" vs "${r.return_type}"` });
    }
  }
  return diffs;
}

function compareViews(local, railway) {
  const diffs = [];
  const localMap = toMap(local.views, r => r.view_name);
  const railwayMap = toMap(railway.views, r => r.view_name);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    const l = localMap[key];
    const r = railwayMap[key];
    if (!l) { diffs.push({ type: 'SOLO_RAILWAY', view: key }); continue; }
    if (!r) { diffs.push({ type: 'SOLO_LOCAL', view: key }); continue; }
    if (normalizeSource(l.view_definition) !== normalizeSource(r.view_definition)) {
      diffs.push({ type: 'DIFERENCIA', view: key, note: 'Definición diferente' });
    }
  }
  return diffs;
}

function compareSequences(local, railway) {
  const diffs = [];
  const localMap = toMap(local.sequences, r => r.sequence_name);
  const railwayMap = toMap(railway.sequences, r => r.sequence_name);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    if (!localMap[key]) diffs.push({ type: 'SOLO_RAILWAY', sequence: key });
    else if (!railwayMap[key]) diffs.push({ type: 'SOLO_LOCAL', sequence: key });
  }
  return diffs;
}

function compareEnums(local, railway) {
  const diffs = [];
  const localMap = toMap(local.enums, r => r.enum_name);
  const railwayMap = toMap(railway.enums, r => r.enum_name);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    const l = localMap[key];
    const r = railwayMap[key];
    if (!l) { diffs.push({ type: 'SOLO_RAILWAY', enum: key, values: r?.enum_values }); continue; }
    if (!r) { diffs.push({ type: 'SOLO_LOCAL', enum: key, values: l?.enum_values }); continue; }
    if (l.enum_values !== r.enum_values) {
      diffs.push({ type: 'DIFERENCIA', enum: key, local: l.enum_values, railway: r.enum_values });
    }
  }
  return diffs;
}

function compareExtensions(local, railway) {
  const diffs = [];
  const localMap = toMap(local.extensions, r => r.extname);
  const railwayMap = toMap(railway.extensions, r => r.extname);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    const l = localMap[key];
    const r = railwayMap[key];
    if (!l) { diffs.push({ type: 'SOLO_RAILWAY', extension: key }); continue; }
    if (!r) { diffs.push({ type: 'SOLO_LOCAL', extension: key }); continue; }
    if (l.extversion !== r.extversion) {
      diffs.push({ type: 'DIFERENCIA', extension: key, local: l.extversion, railway: r.extversion });
    }
  }
  return diffs;
}

function comparePolicies(local, railway) {
  const diffs = [];
  const localMap = toMap(local.policies, r => `${r.tablename}::${r.policyname}`);
  const railwayMap = toMap(railway.policies, r => `${r.tablename}::${r.policyname}`);

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of allKeys) {
    if (!localMap[key]) diffs.push({ type: 'SOLO_RAILWAY', policy: key });
    else if (!railwayMap[key]) diffs.push({ type: 'SOLO_LOCAL', policy: key });
  }
  return diffs;
}

function compareMigrations(local, railway) {
  const diffs = [];
  if (local.prisma_migrations?.error || railway.prisma_migrations?.error) {
    return [{ type: 'INFO', note: `Local: ${local.prisma_migrations?.error || 'OK'}, Railway: ${railway.prisma_migrations?.error || 'OK'}` }];
  }
  const localSet = new Set(local.prisma_migrations.map(r => r.migration_name));
  const railwaySet = new Set(railway.prisma_migrations.map(r => r.migration_name));

  for (const m of localSet) {
    if (!railwaySet.has(m)) diffs.push({ type: 'SOLO_LOCAL', migration: m });
  }
  for (const m of railwaySet) {
    if (!localSet.has(m)) diffs.push({ type: 'SOLO_RAILWAY', migration: m });
  }
  return diffs;
}

// ── Reporte ───────────────────────────────────────────────────────────

function printSection(title, diffs) {
  console.log(`\n${'═'.repeat(70)}`);
  console.log(`  ${title}`);
  console.log(`${'═'.repeat(70)}`);
  if (diffs.length === 0) {
    console.log('  ✅ Sin diferencias');
    return;
  }
  for (const d of diffs) {
    const tag = d.type === 'SOLO_LOCAL' ? '🔵 SOLO LOCAL'
              : d.type === 'SOLO_RAILWAY' ? '🟠 SOLO RAILWAY'
              : d.type === 'DIFERENCIA' ? '🔴 DIFERENTE'
              : 'ℹ️  INFO';

    const parts = Object.entries(d)
      .filter(([k]) => k !== 'type')
      .map(([k, v]) => {
        if (typeof v === 'object' && v !== null) return `${k}: ${JSON.stringify(v)}`;
        return `${k}: ${v}`;
      })
      .join(' | ');

    console.log(`  ${tag}  ${parts}`);
  }
  console.log(`  Total: ${diffs.length} diferencia(s)`);
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║  COMPARACIÓN DE BASES DE DATOS PostgreSQL                           ║');
  console.log('║  LOCAL (db_servicios_generales) vs RAILWAY (railway)                ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');
  console.log('');

  const localClient = new Client({ connectionString: LOCAL_URL });
  const railwayClient = new Client({ connectionString: RAILWAY_URL, ssl: { rejectUnauthorized: false } });

  try {
    console.log('Conectando...');
    await localClient.connect();
    console.log('  ✓ Conectado a LOCAL');
    await railwayClient.connect();
    console.log('  ✓ Conectado a RAILWAY');

    console.log('\nObteniendo esquemas...');
    const local = await fetchAll(localClient, 'LOCAL');
    const railway = await fetchAll(railwayClient, 'RAILWAY');

    // Resumen
    console.log('\n── Resumen de objetos ──');
    for (const key of Object.keys(QUERIES)) {
      const lc = Array.isArray(local[key]) ? local[key].length : (local[key]?.error ? 'error' : 0);
      const rc = Array.isArray(railway[key]) ? railway[key].length : (railway[key]?.error ? 'error' : 0);
      console.log(`  ${key.padEnd(22)} LOCAL: ${String(lc).padStart(4)}  |  RAILWAY: ${String(rc).padStart(4)}`);
    }

    // Comparaciones
    printSection('1. TABLAS', compareTables(local, railway));
    printSection('2. COLUMNAS', compareColumns(local, railway));
    printSection('3. CONSTRAINTS (PK, FK, UNIQUE)', compareConstraints(local, railway));
    printSection('4. ÍNDICES', compareIndexes(local, railway));
    printSection('5. TRIGGERS', compareTriggers(local, railway));
    printSection('6. FUNCIONES / PROCEDIMIENTOS', compareFunctions(local, railway));
    printSection('7. VISTAS', compareViews(local, railway));
    printSection('8. SECUENCIAS', compareSequences(local, railway));
    printSection('9. ENUMS', compareEnums(local, railway));
    printSection('10. EXTENSIONES', compareExtensions(local, railway));
    printSection('11. POLÍTICAS (RLS)', comparePolicies(local, railway));
    printSection('12. MIGRACIONES PRISMA', compareMigrations(local, railway));

    console.log(`\n${'═'.repeat(70)}`);
    console.log('  COMPARACIÓN COMPLETADA');
    console.log(`${'═'.repeat(70)}\n`);

  } catch (err) {
    console.error('ERROR:', err.message);
  } finally {
    await localClient.end().catch(() => {});
    await railwayClient.end().catch(() => {});
  }
}

main();
