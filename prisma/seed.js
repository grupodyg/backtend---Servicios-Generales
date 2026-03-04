const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed de produccion...\n');

  // ========================================
  // 1. ROLES
  // No tienen interfaz de gestion en el frontend.
  // El sistema depende de estos 4 roles exactos.
  // ========================================
  console.log('[1/5] Creando roles...');

  const rolesData = [
    { name: 'Administrador', description: 'Acceso completo al sistema. Puede gestionar usuarios, configuraciones, aprobar presupuestos y administrar todas las ordenes de trabajo.' },
    { name: 'Supervisor', description: 'Supervisa ordenes de trabajo, aprueba solicitudes, gestiona presupuestos y coordina tecnicos.' },
    { name: 'RRHH', description: 'Gestiona permisos de empleados, boletas de pago y recursos humanos.' },
    { name: 'Tecnico', description: 'Ejecuta ordenes de trabajo asignadas, crea reportes diarios, solicita materiales y herramientas.' },
  ];

  const roles = [];
  for (const roleData of rolesData) {
    const role = await prisma.roles.upsert({
      where: { name: roleData.name },
      update: { description: roleData.description, status: 'active' },
      create: { ...roleData, status: 'active' },
    });
    roles.push(role);
  }

  console.log(`   ${roles.length} roles listos`);

  // ========================================
  // 2. USUARIO ADMINISTRADOR
  // Se necesita al menos 1 admin para iniciar sesion
  // y configurar el resto del sistema.
  // ========================================
  console.log('[2/5] Creando usuario administrador...');

  const hashedPassword = await bcrypt.hash('admin2025', 10);

  const adminUser = await prisma.users.upsert({
    where: { email: 'admin@diggroup.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: 'admin@diggroup.com',
      password: hashedPassword,
      role_id: roles[0].id,
      position: 'Administrador del Sistema',
      status: 'active',
    },
  });

  console.log(`   Usuario admin listo (ID: ${adminUser.id})`);

  // Actualizar user_id_registration de los roles
  for (const role of roles) {
    await prisma.roles.update({
      where: { id: role.id },
      data: { user_id_registration: adminUser.id },
    });
  }

  // ========================================
  // 3. PERMISSIONS
  // No tienen interfaz de gestion en el frontend.
  // El sistema de autorizacion depende de estos
  // permisos exactos (verificados por nombre).
  // ========================================
  console.log('[3/5] Creando permisos...');

  const permissionsData = [
    // Administrator
    { name: 'administrator.dashboard', description: 'Acceso al dashboard de administrador', module: 'administrator' },
    { name: 'administrator.users', description: 'Gestion completa de usuarios', module: 'administrator' },
    { name: 'administrator.roles', description: 'Gestion de roles y permisos', module: 'administrator' },
    { name: 'administrator.configuration', description: 'Configuracion del sistema', module: 'administrator' },
    { name: 'administrator.all', description: 'Acceso completo a todas las funcionalidades', module: 'administrator' },
    // Supervisor
    { name: 'supervisor.dashboard', description: 'Acceso al dashboard de supervisor', module: 'supervisor' },
    { name: 'supervisor.orders', description: 'Supervision de ordenes de trabajo', module: 'supervisor' },
    { name: 'supervisor.approvals', description: 'Aprobar solicitudes y presupuestos', module: 'supervisor' },
    { name: 'supervisor.reports', description: 'Visualizacion de reportes', module: 'supervisor' },
    { name: 'supervisor.quotations', description: 'Gestion de presupuestos', module: 'supervisor' },
    // Technician
    { name: 'technician.dashboard', description: 'Acceso al dashboard de tecnico', module: 'technician' },
    { name: 'technician.orders', description: 'Ver ordenes asignadas', module: 'technician' },
    { name: 'technician.reports', description: 'Crear reportes diarios', module: 'technician' },
    { name: 'technician.materials', description: 'Solicitar materiales', module: 'technician' },
    { name: 'technician.tools', description: 'Solicitar herramientas', module: 'technician' },
    // RRHH
    { name: 'rrhh.dashboard', description: 'Acceso al dashboard de RRHH', module: 'rrhh' },
    { name: 'rrhh.permits', description: 'Gestion de permisos de empleados', module: 'rrhh' },
    { name: 'rrhh.payroll', description: 'Gestion de boletas de pago', module: 'rrhh' },
    { name: 'rrhh.employees', description: 'Gestion de empleados', module: 'rrhh' },
    // Shared
    { name: 'shared.dashboard', description: 'Acceso al dashboard general', module: 'shared' },
    { name: 'shared.ordenes', description: 'Acceso a ordenes de trabajo', module: 'shared' },
    { name: 'shared.reportes', description: 'Acceso a reportes', module: 'shared' },
    { name: 'shared.materiales', description: 'Acceso a gestion de materiales', module: 'shared' },
    { name: 'shared.gantt', description: 'Acceso a vista Gantt', module: 'shared' },
    { name: 'shared.presupuestos', description: 'Acceso a presupuestos', module: 'shared' },
    // Permiso directo usado por RRHH en el frontend
    { name: 'permisos', description: 'Gestion de permisos de empleados', module: 'rrhh' },
  ];

  const permissions = [];
  for (const permData of permissionsData) {
    const perm = await prisma.permissions.upsert({
      where: { name: permData.name },
      update: { description: permData.description, module: permData.module, status: 'active' },
      create: { ...permData, status: 'active', user_id_registration: adminUser.id },
    });
    permissions.push(perm);
  }

  console.log(`   ${permissions.length} permisos listos`);

  // ========================================
  // 4. ROLES_PERMISSIONS
  // No tienen interfaz de gestion en el frontend.
  // Define que puede hacer cada rol en el sistema.
  // ========================================
  console.log('[4/5] Asignando permisos a roles...');

  // Mapa de permisos por nombre para acceso rapido
  const permMap = {};
  permissions.forEach(p => { permMap[p.name] = p.id; });

  // Administrador: TODOS los permisos
  const adminPermIds = permissions.map(p => p.id);

  // Supervisor: permisos de supervisor + shared
  const supervisorPermNames = [
    'supervisor.dashboard', 'supervisor.orders', 'supervisor.approvals',
    'supervisor.reports', 'supervisor.quotations',
    'shared.dashboard', 'shared.ordenes', 'shared.reportes',
    'shared.materiales', 'shared.gantt', 'shared.presupuestos',
  ];
  const supervisorPermIds = supervisorPermNames.map(n => permMap[n]).filter(Boolean);

  // RRHH: permisos de rrhh + dashboard + permisos directo
  const rrhhPermNames = [
    'rrhh.dashboard', 'rrhh.permits', 'rrhh.payroll', 'rrhh.employees',
    'shared.dashboard', 'permisos',
  ];
  const rrhhPermIds = rrhhPermNames.map(n => permMap[n]).filter(Boolean);

  // Tecnico: permisos de technician + shared limitados
  const tecnicoPermNames = [
    'technician.dashboard', 'technician.orders', 'technician.reports',
    'technician.materials', 'technician.tools',
    'shared.ordenes', 'shared.reportes', 'shared.materiales',
  ];
  const tecnicoPermIds = tecnicoPermNames.map(n => permMap[n]).filter(Boolean);

  const rolePermissionAssignments = [
    { roleId: roles[0].id, permIds: adminPermIds },      // Administrador
    { roleId: roles[1].id, permIds: supervisorPermIds },  // Supervisor
    { roleId: roles[2].id, permIds: rrhhPermIds },        // RRHH
    { roleId: roles[3].id, permIds: tecnicoPermIds },     // Tecnico
  ];

  let totalAssigned = 0;
  for (const { roleId, permIds } of rolePermissionAssignments) {
    for (const permissionId of permIds) {
      await prisma.roles_permissions.upsert({
        where: {
          role_id_permission_id: { role_id: roleId, permission_id: permissionId },
        },
        update: { status: 'active' },
        create: {
          role_id: roleId,
          permission_id: permissionId,
          status: 'active',
          user_id_registration: adminUser.id,
        },
      });
      totalAssigned++;
    }
  }

  console.log(`   ${totalAssigned} asignaciones de permisos listas`);

  // ========================================
  // 5. SPECIALTY_RATES
  // No tienen interfaz de gestion en el frontend.
  // Se usan en el modulo de presupuestos para
  // calcular costos de mano de obra.
  // ========================================
  console.log('[5/5] Creando tarifas de especialidades...');

  const specialtyRatesData = [
    { specialty: 'Electricista', description: 'Trabajos de instalacion y mantenimiento electrico', daily_rate: 150.00, hourly_rate: 20.00 },
    { specialty: 'Gasfitero', description: 'Trabajos de plomeria e instalaciones sanitarias', daily_rate: 130.00, hourly_rate: 17.00 },
    { specialty: 'Tecnico HVAC', description: 'Especialista en aire acondicionado y refrigeracion', daily_rate: 180.00, hourly_rate: 24.00 },
    { specialty: 'Albanil', description: 'Trabajos de construccion y acabados', daily_rate: 120.00, hourly_rate: 15.00 },
    { specialty: 'Soldador', description: 'Trabajos de soldadura industrial', daily_rate: 160.00, hourly_rate: 21.00 },
    { specialty: 'Pintor', description: 'Trabajos de pintura y acabados', daily_rate: 100.00, hourly_rate: 13.00 },
    { specialty: 'Tecnico en Refrigeracion', description: 'Mantenimiento de equipos de frio', daily_rate: 170.00, hourly_rate: 22.00 },
    { specialty: 'Ayudante', description: 'Apoyo en trabajos generales', daily_rate: 80.00, hourly_rate: 10.00 },
    { specialty: 'Supervisor', description: 'Supervision de obra y coordinacion', daily_rate: 200.00, hourly_rate: 26.00 },
    { specialty: 'Especialista', description: 'Trabajos especializados varios', daily_rate: 190.00, hourly_rate: 25.00 },
  ];

  let ratesCreated = 0;
  for (const rateData of specialtyRatesData) {
    await prisma.specialty_rates.upsert({
      where: { specialty: rateData.specialty },
      update: {
        description: rateData.description,
        daily_rate: rateData.daily_rate,
        hourly_rate: rateData.hourly_rate,
        status: 'active',
      },
      create: {
        ...rateData,
        status: 'active',
        user_id_registration: adminUser.id,
      },
    });
    ratesCreated++;
  }

  console.log(`   ${ratesCreated} tarifas de especialidades listas`);

  // ========================================
  // RESUMEN
  // ========================================
  console.log('\n========================================');
  console.log('Seed de produccion completado');
  console.log('========================================');
  console.log(`Roles:                ${roles.length}`);
  console.log(`Usuario admin:        1`);
  console.log(`Permisos:             ${permissions.length}`);
  console.log(`Asignaciones rol-perm: ${totalAssigned}`);
  console.log(`Tarifas especialidad: ${ratesCreated}`);
  console.log('========================================');
  console.log('');
  console.log('Credenciales del administrador:');
  console.log('  Email:    admin@diggroup.com');
  console.log('  Password: admin2025');
  console.log('');
  console.log('Tablas que se configuran desde el frontend:');
  console.log('  - Tipos de servicio    (Configuracion)');
  console.log('  - Condiciones de pago  (Configuracion)');
  console.log('  - Categorias materiales (Materiales)');
  console.log('  - Categorias herram.   (Herramientas)');
  console.log('========================================\n');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('Error en seed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
