/**
 * Script de comparación exhaustiva entre BD local y BD Railway
 * Compara: tablas, columnas, índices, foreign keys, constraints,
 *          funciones, triggers, vistas, secuencias, enums, extensiones
 */
const { Client } = require('pg');

const LOCAL_URL = 'postgresql://postgres:sql@localhost:5432/db_servicios_generales';
const RAILWAY_URL = 'postgresql://postgres:NjrpmvGYIRydWpbMaVAVlDOuKqeOakxk@interchange.proxy.rlwy.net:24029/railway';

// ── Queries de extracción de schema ──

const Q_TABLES = `
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name != '_prisma_migrations'
  ORDER BY table_name;
`;

const Q_COLUMNS = `
  SELECT c.table_name, c.column_name, c.ordinal_position,
         c.data_type, c.udt_name, c.character_maximum_length,
         c.numeric_precision, c.numeric_scale,
         c.is_nullable, c.column_default
  FROM information_schema.columns c
  JOIN information_schema.tables t
    ON c.table_name = t.table_name AND c.table_schema = t.table_schema
  WHERE c.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND c.table_name != '_prisma_migrations'
  ORDER BY c.table_name, c.ordinal_position;
`;

const Q_INDEXES = `
  SELECT tablename, indexname, indexdef
  FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename != '_prisma_migrations'
  ORDER BY tablename, indexname;
`;

const Q_FOREIGN_KEYS = `
  SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
  JOIN information_schema.referential_constraints rc
    ON tc.constraint_name = rc.constraint_name AND tc.table_schema = rc.constraint_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name != '_prisma_migrations'
  ORDER BY tc.table_name, tc.constraint_name;
`;

const Q_UNIQUE_CONSTRAINTS = `
  SELECT tc.table_name, tc.constraint_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'UNIQUE'
    AND tc.table_schema = 'public'
    AND tc.table_name != '_prisma_migrations'
  ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;
`;

const Q_PRIMARY_KEYS = `
  SELECT tc.table_name, tc.constraint_name, kcu.column_name
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name != '_prisma_migrations'
  ORDER BY tc.table_name, kcu.ordinal_position;
`;

const Q_SEQUENCES = `
  SELECT sequence_name, data_type, start_value, minimum_value, maximum_value, increment
  FROM information_schema.sequences
  WHERE sequence_schema = 'public'
  ORDER BY sequence_name;
`;

const Q_FUNCTIONS = `
  SELECT p.proname AS function_name,
         pg_get_function_arguments(p.oid) AS arguments,
         pg_get_function_result(p.oid) AS return_type,
         CASE p.prokind
           WHEN 'f' THEN 'function'
           WHEN 'p' THEN 'procedure'
           WHEN 'a' THEN 'aggregate'
           WHEN 'w' THEN 'window'
         END AS kind,
         p.prosrc AS source_code
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
  ORDER BY p.proname;
`;

const Q_TRIGGERS = `
  SELECT tg.tgname AS trigger_name,
         c.relname AS table_name,
         pg_get_triggerdef(tg.oid) AS trigger_definition
  FROM pg_trigger tg
  JOIN pg_class c ON tg.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE NOT tg.tgisinternal
    AND n.nspname = 'public'
  ORDER BY c.relname, tg.tgname;
`;

const Q_VIEWS = `
  SELECT viewname, definition
  FROM pg_views
  WHERE schemaname = 'public'
  ORDER BY viewname;
`;

const Q_ENUMS = `
  SELECT t.typname AS enum_name,
         string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
  FROM pg_type t
  JOIN pg_enum e ON t.oid = e.enumtypid
  JOIN pg_namespace n ON t.typnamespace = n.oid
  WHERE n.nspname = 'public'
  GROUP BY t.typname
  ORDER BY t.typname;
`;

const Q_EXTENSIONS = `
  SELECT extname, extversion
  FROM pg_extension
  ORDER BY extname;
`;

const Q_CHECK_CONSTRAINTS = `
  SELECT tc.table_name, tc.constraint_name, cc.check_clause
  FROM information_schema.table_constraints tc
  JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name AND tc.constraint_schema = cc.constraint_schema
  WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
    AND tc.table_name != '_prisma_migrations'
    AND tc.constraint_name NOT LIKE '%_not_null'
  ORDER BY tc.table_name, tc.constraint_name;
`;

// ── Funciones auxiliares ──

async function getSchema(client) {
  const schema = {};
  const queries = {
    tables: Q_TABLES,
    columns: Q_COLUMNS,
    indexes: Q_INDEXES,
    foreignKeys: Q_FOREIGN_KEYS,
    uniqueConstraints: Q_UNIQUE_CONSTRAINTS,
    primaryKeys: Q_PRIMARY_KEYS,
    sequences: Q_SEQUENCES,
    functions: Q_FUNCTIONS,
    triggers: Q_TRIGGERS,
    views: Q_VIEWS,
    enums: Q_ENUMS,
    extensions: Q_EXTENSIONS,
    checkConstraints: Q_CHECK_CONSTRAINTS,
  };

  for (const [key, query] of Object.entries(queries)) {
    try {
      const res = await client.query(query);
      schema[key] = res.rows;
    } catch (err) {
      console.error(`  ⚠ Error en query ${key}: ${err.message}`);
      schema[key] = [];
    }
  }
  return schema;
}

function setDiff(a, b) {
  return a.filter(x => !b.includes(x));
}

function compareColumns(localCols, railwayCols) {
  const diffs = [];
  const localMap = {};
  const railwayMap = {};

  for (const c of localCols) {
    const key = `${c.table_name}.${c.column_name}`;
    localMap[key] = c;
  }
  for (const c of railwayCols) {
    const key = `${c.table_name}.${c.column_name}`;
    railwayMap[key] = c;
  }

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);

  for (const key of [...allKeys].sort()) {
    const l = localMap[key];
    const r = railwayMap[key];

    if (!l) {
      diffs.push({ column: key, type: 'SOLO_EN_RAILWAY', detail: formatCol(r) });
    } else if (!r) {
      diffs.push({ column: key, type: 'SOLO_EN_LOCAL', detail: formatCol(l) });
    } else {
      const changes = [];
      if (l.data_type !== r.data_type || l.udt_name !== r.udt_name) {
        changes.push(`tipo: LOCAL=${l.udt_name}(${l.data_type}) vs RAILWAY=${r.udt_name}(${r.data_type})`);
      }
      if (l.is_nullable !== r.is_nullable) {
        changes.push(`nullable: LOCAL=${l.is_nullable} vs RAILWAY=${r.is_nullable}`);
      }
      if (normalizeDefault(l.column_default) !== normalizeDefault(r.column_default)) {
        changes.push(`default: LOCAL=${l.column_default || 'NULL'} vs RAILWAY=${r.column_default || 'NULL'}`);
      }
      if (l.character_maximum_length !== r.character_maximum_length) {
        changes.push(`max_length: LOCAL=${l.character_maximum_length} vs RAILWAY=${r.character_maximum_length}`);
      }
      if (changes.length > 0) {
        diffs.push({ column: key, type: 'DIFERENCIA', detail: changes.join(' | ') });
      }
    }
  }
  return diffs;
}

function formatCol(c) {
  return `${c.udt_name} nullable=${c.is_nullable} default=${c.column_default || 'NULL'}`;
}

function normalizeDefault(val) {
  if (!val) return 'NULL';
  return val.replace(/::[\w\s\[\]]+/g, '').replace(/\s+/g, ' ').trim();
}

function compareIndexes(local, railway) {
  const diffs = [];
  const localMap = {};
  const railwayMap = {};

  for (const idx of local) localMap[idx.indexname] = idx;
  for (const idx of railway) railwayMap[idx.indexname] = idx;

  const allNames = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const name of [...allNames].sort()) {
    const l = localMap[name];
    const r = railwayMap[name];
    if (!l) {
      diffs.push({ index: name, type: 'SOLO_EN_RAILWAY', table: r.tablename, def: r.indexdef });
    } else if (!r) {
      diffs.push({ index: name, type: 'SOLO_EN_LOCAL', table: l.tablename, def: l.indexdef });
    } else if (l.indexdef !== r.indexdef) {
      diffs.push({ index: name, type: 'DIFERENCIA', local: l.indexdef, railway: r.indexdef });
    }
  }
  return diffs;
}

function compareForeignKeys(local, railway) {
  const toKey = (fk) => `${fk.table_name}|${fk.constraint_name}|${fk.column_name}|${fk.foreign_table_name}|${fk.foreign_column_name}|${fk.update_rule}|${fk.delete_rule}`;
  const localSet = new Set(local.map(toKey));
  const railwaySet = new Set(railway.map(toKey));

  const diffs = [];
  for (const fk of local) {
    if (!railwaySet.has(toKey(fk))) {
      diffs.push({ type: 'SOLO_EN_LOCAL', ...fk });
    }
  }
  for (const fk of railway) {
    if (!localSet.has(toKey(fk))) {
      diffs.push({ type: 'SOLO_EN_RAILWAY', ...fk });
    }
  }
  return diffs;
}

function compareSimpleList(local, railway, keyFn, label) {
  const diffs = [];
  const localMap = {};
  const railwayMap = {};

  for (const item of local) localMap[keyFn(item)] = item;
  for (const item of railway) railwayMap[keyFn(item)] = item;

  const allKeys = new Set([...Object.keys(localMap), ...Object.keys(railwayMap)]);
  for (const key of [...allKeys].sort()) {
    if (!localMap[key]) {
      diffs.push({ [label]: key, type: 'SOLO_EN_RAILWAY', detail: railwayMap[key] });
    } else if (!railwayMap[key]) {
      diffs.push({ [label]: key, type: 'SOLO_EN_LOCAL', detail: localMap[key] });
    } else if (JSON.stringify(localMap[key]) !== JSON.stringify(railwayMap[key])) {
      diffs.push({ [label]: key, type: 'DIFERENCIA', local: localMap[key], railway: railwayMap[key] });
    }
  }
  return diffs;
}

// ── Main ──

async function main() {
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║   COMPARACIÓN EXHAUSTIVA DE BASES DE DATOS                      ║');
  console.log('║   LOCAL vs RAILWAY                                              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  const localClient = new Client({ connectionString: LOCAL_URL });
  const railwayClient = new Client({ connectionString: RAILWAY_URL });

  try {
    console.log('🔌 Conectando a LOCAL...');
    await localClient.connect();
    console.log('   ✅ LOCAL conectada');

    console.log('🔌 Conectando a RAILWAY...');
    await railwayClient.connect();
    console.log('   ✅ RAILWAY conectada');
    console.log('');

    console.log('📊 Extrayendo schemas...');
    const localSchema = await getSchema(localClient);
    const railwaySchema = await getSchema(railwayClient);
    console.log('   ✅ Schemas extraídos');
    console.log('');

    let totalDiffs = 0;

    // ── 1. TABLAS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  1. TABLAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const localTableNames = localSchema.tables.map(t => t.table_name);
    const railwayTableNames = railwaySchema.tables.map(t => t.table_name);

    const soloLocal = setDiff(localTableNames, railwayTableNames);
    const soloRailway = setDiff(railwayTableNames, localTableNames);

    console.log(`  LOCAL: ${localTableNames.length} tablas | RAILWAY: ${railwayTableNames.length} tablas`);

    if (soloLocal.length === 0 && soloRailway.length === 0) {
      console.log('  ✅ Mismas tablas en ambas bases de datos');
    } else {
      if (soloLocal.length > 0) {
        console.log(`  ❌ SOLO en LOCAL (${soloLocal.length}):`);
        soloLocal.forEach(t => console.log(`     - ${t}`));
        totalDiffs += soloLocal.length;
      }
      if (soloRailway.length > 0) {
        console.log(`  ❌ SOLO en RAILWAY (${soloRailway.length}):`);
        soloRailway.forEach(t => console.log(`     - ${t}`));
        totalDiffs += soloRailway.length;
      }
    }
    console.log('');

    // ── 2. COLUMNAS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  2. COLUMNAS (tipo, nullable, default, max_length)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const colDiffs = compareColumns(localSchema.columns, railwaySchema.columns);
    if (colDiffs.length === 0) {
      console.log('  ✅ Todas las columnas son idénticas');
    } else {
      console.log(`  ❌ ${colDiffs.length} diferencias encontradas:`);
      for (const d of colDiffs) {
        console.log(`     [${d.type}] ${d.column}`);
        console.log(`       ${d.detail}`);
      }
      totalDiffs += colDiffs.length;
    }
    console.log('');

    // ── 3. ÍNDICES ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  3. ÍNDICES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const idxDiffs = compareIndexes(localSchema.indexes, railwaySchema.indexes);
    console.log(`  LOCAL: ${localSchema.indexes.length} índices | RAILWAY: ${railwaySchema.indexes.length} índices`);
    if (idxDiffs.length === 0) {
      console.log('  ✅ Índices idénticos');
    } else {
      console.log(`  ❌ ${idxDiffs.length} diferencias:`);
      for (const d of idxDiffs) {
        if (d.type === 'DIFERENCIA') {
          console.log(`     [${d.type}] ${d.index}`);
          console.log(`       LOCAL:   ${d.local}`);
          console.log(`       RAILWAY: ${d.railway}`);
        } else {
          console.log(`     [${d.type}] ${d.index} (tabla: ${d.table})`);
          console.log(`       ${d.def}`);
        }
      }
      totalDiffs += idxDiffs.length;
    }
    console.log('');

    // ── 4. FOREIGN KEYS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  4. FOREIGN KEYS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const fkDiffs = compareForeignKeys(localSchema.foreignKeys, railwaySchema.foreignKeys);
    console.log(`  LOCAL: ${localSchema.foreignKeys.length} FKs | RAILWAY: ${railwaySchema.foreignKeys.length} FKs`);
    if (fkDiffs.length === 0) {
      console.log('  ✅ Foreign keys idénticas');
    } else {
      console.log(`  ❌ ${fkDiffs.length} diferencias:`);
      for (const d of fkDiffs) {
        console.log(`     [${d.type}] ${d.table_name}.${d.column_name} -> ${d.foreign_table_name}.${d.foreign_column_name} (${d.constraint_name}) ON DELETE ${d.delete_rule} ON UPDATE ${d.update_rule}`);
      }
      totalDiffs += fkDiffs.length;
    }
    console.log('');

    // ── 5. UNIQUE CONSTRAINTS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  5. UNIQUE CONSTRAINTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const uqDiffs = compareSimpleList(
      localSchema.uniqueConstraints, railwaySchema.uniqueConstraints,
      (c) => `${c.table_name}|${c.constraint_name}|${c.column_name}`, 'constraint'
    );
    console.log(`  LOCAL: ${localSchema.uniqueConstraints.length} | RAILWAY: ${railwaySchema.uniqueConstraints.length}`);
    if (uqDiffs.length === 0) {
      console.log('  ✅ Unique constraints idénticos');
    } else {
      console.log(`  ❌ ${uqDiffs.length} diferencias:`);
      for (const d of uqDiffs) {
        console.log(`     [${d.type}] ${d.constraint}`);
      }
      totalDiffs += uqDiffs.length;
    }
    console.log('');

    // ── 6. PRIMARY KEYS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  6. PRIMARY KEYS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const pkDiffs = compareSimpleList(
      localSchema.primaryKeys, railwaySchema.primaryKeys,
      (c) => `${c.table_name}|${c.column_name}`, 'pk'
    );
    if (pkDiffs.length === 0) {
      console.log('  ✅ Primary keys idénticas');
    } else {
      console.log(`  ❌ ${pkDiffs.length} diferencias:`);
      for (const d of pkDiffs) {
        console.log(`     [${d.type}] ${d.pk}`);
      }
      totalDiffs += pkDiffs.length;
    }
    console.log('');

    // ── 7. SECUENCIAS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  7. SECUENCIAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const seqDiffs = compareSimpleList(
      localSchema.sequences, railwaySchema.sequences,
      (s) => s.sequence_name, 'sequence'
    );
    console.log(`  LOCAL: ${localSchema.sequences.length} | RAILWAY: ${railwaySchema.sequences.length}`);
    if (seqDiffs.length === 0) {
      console.log('  ✅ Secuencias idénticas');
    } else {
      console.log(`  ❌ ${seqDiffs.length} diferencias:`);
      for (const d of seqDiffs) {
        console.log(`     [${d.type}] ${d.sequence}`);
      }
      totalDiffs += seqDiffs.length;
    }
    console.log('');

    // ── 8. FUNCIONES / PROCEDIMIENTOS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  8. FUNCIONES / PROCEDIMIENTOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const fnDiffs = compareSimpleList(
      localSchema.functions, railwaySchema.functions,
      (f) => `${f.function_name}(${f.arguments})`, 'function'
    );
    console.log(`  LOCAL: ${localSchema.functions.length} | RAILWAY: ${railwaySchema.functions.length}`);
    if (fnDiffs.length === 0) {
      console.log('  ✅ Sin diferencias (o ambas sin funciones)');
    } else {
      console.log(`  ❌ ${fnDiffs.length} diferencias:`);
      for (const d of fnDiffs) {
        console.log(`     [${d.type}] ${d.function}`);
        if (d.detail) console.log(`       Kind: ${d.detail.kind}, Returns: ${d.detail.return_type}`);
      }
      totalDiffs += fnDiffs.length;
    }
    console.log('');

    // ── 9. TRIGGERS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  9. TRIGGERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const trgDiffs = compareSimpleList(
      localSchema.triggers, railwaySchema.triggers,
      (t) => `${t.table_name}.${t.trigger_name}`, 'trigger'
    );
    console.log(`  LOCAL: ${localSchema.triggers.length} | RAILWAY: ${railwaySchema.triggers.length}`);
    if (trgDiffs.length === 0) {
      console.log('  ✅ Sin diferencias (o ambas sin triggers)');
    } else {
      console.log(`  ❌ ${trgDiffs.length} diferencias:`);
      for (const d of trgDiffs) {
        console.log(`     [${d.type}] ${d.trigger}`);
      }
      totalDiffs += trgDiffs.length;
    }
    console.log('');

    // ── 10. VISTAS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  10. VISTAS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const viewDiffs = compareSimpleList(
      localSchema.views, railwaySchema.views,
      (v) => v.viewname, 'view'
    );
    console.log(`  LOCAL: ${localSchema.views.length} | RAILWAY: ${railwaySchema.views.length}`);
    if (viewDiffs.length === 0) {
      console.log('  ✅ Sin diferencias (o ambas sin vistas)');
    } else {
      console.log(`  ❌ ${viewDiffs.length} diferencias:`);
      for (const d of viewDiffs) {
        console.log(`     [${d.type}] ${d.view}`);
      }
      totalDiffs += viewDiffs.length;
    }
    console.log('');

    // ── 11. ENUMS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  11. TIPOS ENUM');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const enumDiffs = compareSimpleList(
      localSchema.enums, railwaySchema.enums,
      (e) => e.enum_name, 'enum'
    );
    console.log(`  LOCAL: ${localSchema.enums.length} | RAILWAY: ${railwaySchema.enums.length}`);
    if (enumDiffs.length === 0) {
      console.log('  ✅ Sin diferencias (o ambas sin enums)');
    } else {
      console.log(`  ❌ ${enumDiffs.length} diferencias:`);
      for (const d of enumDiffs) {
        console.log(`     [${d.type}] ${d.enum}`);
        if (d.detail) console.log(`       Valores: ${d.detail.values}`);
        if (d.local && d.railway) {
          console.log(`       LOCAL:   ${d.local.values}`);
          console.log(`       RAILWAY: ${d.railway.values}`);
        }
      }
      totalDiffs += enumDiffs.length;
    }
    console.log('');

    // ── 12. EXTENSIONES ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  12. EXTENSIONES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const extDiffs = compareSimpleList(
      localSchema.extensions, railwaySchema.extensions,
      (e) => e.extname, 'extension'
    );
    console.log(`  LOCAL: ${localSchema.extensions.length} | RAILWAY: ${railwaySchema.extensions.length}`);
    if (extDiffs.length === 0) {
      console.log('  ✅ Extensiones idénticas');
    } else {
      console.log(`  ❌ ${extDiffs.length} diferencias:`);
      for (const d of extDiffs) {
        console.log(`     [${d.type}] ${d.extension}`);
        if (d.detail) console.log(`       Versión: ${d.detail.extversion}`);
        if (d.local && d.railway) {
          console.log(`       LOCAL:   v${d.local.extversion}`);
          console.log(`       RAILWAY: v${d.railway.extversion}`);
        }
      }
      totalDiffs += extDiffs.length;
    }
    console.log('');

    // ── 13. CHECK CONSTRAINTS ──
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  13. CHECK CONSTRAINTS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const chkDiffs = compareSimpleList(
      localSchema.checkConstraints, railwaySchema.checkConstraints,
      (c) => `${c.table_name}|${c.constraint_name}`, 'check'
    );
    console.log(`  LOCAL: ${localSchema.checkConstraints.length} | RAILWAY: ${railwaySchema.checkConstraints.length}`);
    if (chkDiffs.length === 0) {
      console.log('  ✅ Check constraints idénticos');
    } else {
      console.log(`  ❌ ${chkDiffs.length} diferencias:`);
      for (const d of chkDiffs) {
        console.log(`     [${d.type}] ${d.check}`);
      }
      totalDiffs += chkDiffs.length;
    }
    console.log('');

    // ── RESUMEN FINAL ──
    console.log('╔══════════════════════════════════════════════════════════════════╗');
    if (totalDiffs === 0) {
      console.log('║   ✅ RESULTADO: LAS BASES DE DATOS SON IDÉNTICAS              ║');
    } else {
      console.log(`║   ❌ RESULTADO: ${String(totalDiffs).padEnd(3)} DIFERENCIAS ENCONTRADAS                   ║`);
    }
    console.log('╚══════════════════════════════════════════════════════════════════╝');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('ECONNREFUSED')) {
      console.error('   Verifica que PostgreSQL local esté corriendo.');
    }
  } finally {
    await localClient.end().catch(() => {});
    await railwayClient.end().catch(() => {});
  }
}

main();
