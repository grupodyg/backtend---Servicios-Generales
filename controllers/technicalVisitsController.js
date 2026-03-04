const {
  getAllTechnicalVisits,
  getTechnicalVisitById,
  getVisitsByTechnician,
  createTechnicalVisit,
  updateTechnicalVisit,
  deleteTechnicalVisit,
  generateTechnicalVisitId
} = require('../models/technicalVisitsModel');
const { checkTechnicalVisitDependencies, logDeletion } = require('../services/deletionService');

const getAll = async (req, res) => {
  try {
    const { status = 'all', client_id, assigned_technician, visit_date_from, visit_date_to, search } = req.query;

    // DEBUG: Log para verificar datos del usuario
    console.log('🔍 [DEBUG] getAll - Usuario autenticado:', {
      id: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      role_id: req.user?.role_id,
      name: req.user?.name
    });

    // Filtrado automático según rol del usuario
    // Si es técnico, solo ve sus propias visitas
    // Si es admin o supervisor, ve todas las visitas
    let visits;

    if (req.user && req.user.role === 'tecnico') {
      // Técnico: filtrar por su ID usando la tabla relacional
      console.log(`✅ [DEBUG] Usuario es técnico - Filtrando visitas para technician_id=${req.user.id}`);
      visits = await getVisitsByTechnician(req.user.id, { status, visit_date_from, visit_date_to, search });
      console.log(`✅ [DEBUG] Visitas encontradas para técnico: ${visits.length}`);
    } else {
      // Admin/Supervisor: obtener todas las visitas con filtros opcionales
      console.log(`✅ [DEBUG] Usuario es admin/supervisor - Obteniendo todas las visitas`);
      visits = await getAllTechnicalVisits({ status, client_id, assigned_technician, visit_date_from, visit_date_to, search });
      console.log(`✅ [DEBUG] Visitas totales encontradas: ${visits.length}`);
    }

    res.json(visits);
  } catch (error) {
    console.error('Error al obtener visitas técnicas:', error);
    res.status(500).json({ error: 'Error al obtener visitas técnicas' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const visit = await getTechnicalVisitById(id);
    if (!visit) return res.status(404).json({ error: 'Visita técnica no encontrada' });
    res.json(visit);
  } catch (error) {
    console.error('Error al obtener visita técnica:', error);
    res.status(500).json({ error: 'Error al obtener visita técnica' });
  }
};

const create = async (req, res) => {
  try {
    const {
      client, client_id, address, contact, phone, email, visit_date, visit_time,
      service_type, service_description, observations, assigned_technician, requested_by,
      project_name, gps_coordinates, estimated_materials, required_tools, required_personnel,
      personnel_list, place_status, solpe, technicians
    } = req.body;

    const id = await generateTechnicalVisitId();

    const visitData = {
      id, client, client_id: client_id || null, address: address || null, contact: contact || null,
      phone: phone || null, email: email || null, visit_date: visit_date || null, visit_time: visit_time || null,
      service_type: service_type || null, service_description: service_description || null,
      observations: observations || null, assigned_technician: assigned_technician || null,
      requested_by: requested_by || null, project_name: project_name || null,
      gps_coordinates: gps_coordinates || null, estimated_materials: estimated_materials || null,
      required_tools: required_tools || null, required_personnel: required_personnel || null,
      personnel_list: personnel_list || null, place_status: place_status || null,
      solpe: solpe || null, technicians: technicians || null, user_id_registration: req.user.id
    };

    const newVisit = await createTechnicalVisit(visitData);
    res.status(201).json({ mensaje: 'Visita técnica creada exitosamente', data: newVisit });
  } catch (error) {
    console.error('Error al crear visita técnica:', error);
    res.status(500).json({ error: 'Error al crear visita técnica' });
  }
};

const update = async (req, res) => {
  try {
    const { id } = req.params;
    console.log('🔄 UPDATE Request - ID:', id);
    console.log('🔄 UPDATE Request - Body:', JSON.stringify(req.body, null, 2));

    const existingVisit = await getTechnicalVisitById(id);
    if (!existingVisit) return res.status(404).json({ error: 'Visita técnica no encontrada' });

    const visitData = { ...req.body, user_id_modification: req.user.id };
    console.log('🔄 visitData to update:', JSON.stringify(visitData, null, 2));

    const updatedVisit = await updateTechnicalVisit(id, visitData);
    console.log('✅ Visit updated successfully');
    res.json({ mensaje: 'Visita técnica actualizada exitosamente', data: updatedVisit });
  } catch (error) {
    console.error('❌ Error al actualizar visita técnica:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error message:', error.message);
    res.status(500).json({ error: 'Error al actualizar visita técnica', details: error.message });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;

    // Log para debug
    console.log('📝 req.body:', req.body);
    console.log('📝 req.params:', req.params);

    const reason = req.body?.reason || 'Sin motivo especificado';

    const existingVisit = await getTechnicalVisitById(id);
    if (!existingVisit) {
      return res.status(404).json({ error: 'Visita técnica no encontrada' });
    }

    // Verificar dependencias antes de eliminar
    const dependencyCheck = await checkTechnicalVisitDependencies(id);

    // Registrar la eliminación en el log
    await logDeletion({
      entity_type: 'technical_visit',
      entity_id: id,
      deleted_by_user_id: req.user.id,
      deletion_reason: reason,
      dependencies_info: dependencyCheck.dependencies
    });

    // Realizar eliminación lógica
    const deletedVisit = await deleteTechnicalVisit(id, req.user.id);

    res.json({
      mensaje: 'Visita técnica eliminada exitosamente',
      data: deletedVisit,
      dependenciesInfo: {
        hasDependencies: dependencyCheck.hasDependencies,
        totalDependencies: dependencyCheck.totalDependencies,
        message: dependencyCheck.message
      }
    });
  } catch (error) {
    console.error('❌ Error al eliminar visita técnica:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    res.status(500).json({ error: 'Error al eliminar visita técnica', details: error.message });
  }
};

const getNextId = async (req, res) => {
  try {
    const nextId = await generateTechnicalVisitId();
    res.json({ next_id: nextId });
  } catch (error) {
    console.error('Error al generar ID de visita:', error);
    res.status(500).json({ error: 'Error al generar ID de visita' });
  }
};

const checkCanDelete = async (req, res) => {
  try {
    const { id } = req.params;

    const existingVisit = await getTechnicalVisitById(id);
    if (!existingVisit) {
      return res.status(404).json({ error: 'Visita técnica no encontrada' });
    }

    const dependencyCheck = await checkTechnicalVisitDependencies(id);

    res.json({
      canDelete: dependencyCheck.canDelete,
      hasDependencies: dependencyCheck.hasDependencies,
      totalDependencies: dependencyCheck.totalDependencies,
      dependencies: dependencyCheck.dependencies,
      message: dependencyCheck.message
    });
  } catch (error) {
    console.error('Error al verificar dependencias:', error);
    res.status(500).json({ error: 'Error al verificar dependencias' });
  }
};

module.exports = { getAll, getById, create, update, remove, getNextId, checkCanDelete };
