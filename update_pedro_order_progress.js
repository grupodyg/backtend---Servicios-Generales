const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'db_sgs_dig',
  password: 'sql',
  port: 5432,
});

async function updatePedroOrderProgress() {
  console.log('\n🔧 ACTUALIZACIÓN DE PROGRESO DE ORDEN DE PEDRO\n');
  console.log('='.repeat(80));

  try {
    const order_id = 'OT-1762660597982-002';

    // Ver estado actual
    console.log('\n1️⃣ Estado ANTES de la actualización:\n');
    const beforeQuery = `
      SELECT id, client, assigned_technician, status, progress_percentage
      FROM work_orders
      WHERE id = $1
    `;
    const beforeResult = await pool.query(beforeQuery, [order_id]);

    if (beforeResult.rows.length > 0) {
      const order = beforeResult.rows[0];
      console.log(`   Orden: ${order.id}`);
      console.log(`   Cliente: ${order.client}`);
      console.log(`   Técnico: ${order.assigned_technician}`);
      console.log(`   Estado: ${order.status}`);
      console.log(`   Progreso ACTUAL: ${order.progress_percentage}%`);
    }

    // Ver reportes diarios
    console.log('\n2️⃣ Reportes diarios de esta orden:\n');
    const reportsQuery = `
      SELECT id, report_date, progress_percentage, status
      FROM daily_reports
      WHERE order_id = $1
      ORDER BY report_date DESC, id DESC
    `;
    const reportsResult = await pool.query(reportsQuery, [order_id]);

    if (reportsResult.rows.length > 0) {
      console.log(`   Total de reportes: ${reportsResult.rows.length}\n`);
      reportsResult.rows.forEach((report, idx) => {
        console.log(`   ${idx + 1}. Reporte ID: ${report.id}`);
        console.log(`      Fecha: ${report.report_date}`);
        console.log(`      Progreso: ${report.progress_percentage}%`);
        console.log(`      Estado: ${report.status}`);
        console.log('');
      });

      // Calcular máximo progreso
      const maxProgress = Math.max(...reportsResult.rows.map(r => r.progress_percentage || 0));
      console.log(`   📊 Progreso MÁXIMO de reportes: ${maxProgress}%`);
    } else {
      console.log('   ⚠️  No hay reportes para esta orden');
    }

    // Actualizar progreso
    console.log('\n3️⃣ Actualizando progreso de la orden...\n');
    const updateQuery = `
      UPDATE work_orders
      SET progress_percentage = (
        SELECT COALESCE(MAX(progress_percentage), 0)
        FROM daily_reports
        WHERE order_id = $1
          AND status = 'active'
      ),
      date_time_modification = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, progress_percentage
    `;

    const updateResult = await pool.query(updateQuery, [order_id]);

    if (updateResult.rows.length > 0) {
      const updated = updateResult.rows[0];
      console.log(`   ✅ Progreso actualizado a: ${updated.progress_percentage}%`);
    }

    // Ver estado final
    console.log('\n4️⃣ Estado DESPUÉS de la actualización:\n');
    const afterResult = await pool.query(beforeQuery, [order_id]);

    if (afterResult.rows.length > 0) {
      const order = afterResult.rows[0];
      console.log(`   Orden: ${order.id}`);
      console.log(`   Progreso NUEVO: ${order.progress_percentage}%`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('\n✅ ACTUALIZACIÓN COMPLETADA\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    await pool.end();
  }
}

updatePedroOrderProgress();
