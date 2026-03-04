const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Establecer timezone ANTES de cualquier operacion con fechas
// Esto es critico para Railway y otros entornos en la nube
process.env.TZ = process.env.TZ || 'America/Lima';

const pool = require('./config/db');

// Importar todas las rutas
const authRoutes = require('./routes/authRoutes');
const serviceTypesRoutes = require('./routes/serviceTypesRoutes');
const specialtyRatesRoutes = require('./routes/specialtyRatesRoutes');
const paymentConditionsRoutes = require('./routes/paymentConditionsRoutes');
const materialCategoriesRoutes = require('./routes/materialCategoriesRoutes');
const toolCategoriesRoutes = require('./routes/toolCategoriesRoutes');
const usersRoutes = require('./routes/usersRoutes');
const rolesRoutes = require('./routes/rolesRoutes');
const permissionsRoutes = require('./routes/permissionsRoutes');
const rolesPermissionsRoutes = require('./routes/rolesPermissionsRoutes');
const clientsRoutes = require('./routes/clientsRoutes');
const clientContactsRoutes = require('./routes/clientContactsRoutes');
const materialsRoutes = require('./routes/materialsRoutes');
const toolsRoutes = require('./routes/toolsRoutes');
const installationsRoutes = require('./routes/installationsRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const workOrdersRoutes = require('./routes/workOrdersRoutes');
const orderPhotosRoutes = require('./routes/orderPhotosRoutes');
const technicalVisitsRoutes = require('./routes/technicalVisitsRoutes');
const quotationsRoutes = require('./routes/quotationsRoutes');
const dailyReportsRoutes = require('./routes/dailyReportsRoutes');
const reportPhotosRoutes = require('./routes/reportPhotosRoutes');
const quotationItemsRoutes = require('./routes/quotationItemsRoutes');
const materialRequestsRoutes = require('./routes/materialRequestsRoutes');
const toolRequestsRoutes = require('./routes/toolRequestsRoutes');
const finalReportsRoutes = require('./routes/finalReportsRoutes');
const employeePermitsRoutes = require('./routes/employeePermitsRoutes');
const communicationsRoutes = require('./routes/communicationsRoutes');
const payrollSlipsRoutes = require('./routes/payrollSlipsRoutes');
const permitAttachmentsRoutes = require('./routes/permitAttachmentsRoutes');
const filesRoutes = require('./routes/filesRoutes');

const app = express();
const PORT = process.env.PORT;

if (!PORT) {
  console.error('ERROR: PORT no está definido en las variables de entorno');
  process.exit(1);
}

// Middleware
app.use(cors());
app.use(express.json());

// 📌 Rutas de la API
// Autenticación
app.use('/api/auth', authRoutes);

// Configuración básica
app.use('/api/service-types', serviceTypesRoutes);
app.use('/api/specialty-rates', specialtyRatesRoutes);
app.use('/api/payment-conditions', paymentConditionsRoutes);
app.use('/api/material-categories', materialCategoriesRoutes);
app.use('/api/tool-categories', toolCategoriesRoutes);

// Gestión de usuarios y roles
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/permissions', permissionsRoutes);
app.use('/api/roles-permissions', rolesPermissionsRoutes);

// Clientes
app.use('/api/clients', clientsRoutes);
app.use('/api/client-contacts', clientContactsRoutes);

// Materiales y herramientas
app.use('/api/materials', materialsRoutes);
app.use('/api/tools', toolsRoutes);

// Instalaciones
app.use('/api/installations', installationsRoutes);

// Notificaciones
app.use('/api/notifications', notificationsRoutes);

// Órdenes de trabajo
app.use('/api/work-orders', workOrdersRoutes);
app.use('/api/order-photos', orderPhotosRoutes);

// Visitas técnicas y Cotizaciones
app.use('/api/technical-visits', technicalVisitsRoutes);
app.use('/api/quotations', quotationsRoutes);
app.use('/api/quotation-items', quotationItemsRoutes);

// Reportes diarios
app.use('/api/daily-reports', dailyReportsRoutes);

// Fotos de reportes diarios
app.use('/api/report-photos', reportPhotosRoutes);

// Solicitudes de materiales y herramientas
app.use('/api/material-requests', materialRequestsRoutes);
app.use('/api/tool-requests', toolRequestsRoutes);

// Reportes finales
app.use('/api/final-reports', finalReportsRoutes);

// RRHH - Permisos de empleados
app.use('/api/employee-permits', employeePermitsRoutes);

// Comunicaciones
app.use('/api/communications', communicationsRoutes);

// RRHH - Nóminas
app.use('/api/payroll-slips', payrollSlipsRoutes);

// RRHH - Adjuntos de Permisos
app.use('/api/permit-attachments', permitAttachmentsRoutes);

// Archivos S3 (proxy)
app.use('/api/files', filesRoutes);

// Ruta de prueba
app.get('/api/ping', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor backend corriendo en http://localhost:${PORT}`);
});
