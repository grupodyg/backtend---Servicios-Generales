const {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsReadByUser,
  deleteNotification
} = require('../models/notificationsModel');

const getAll = async (req, res) => {
  try {
    const { user_id, read, notification_type } = req.query;
    const notifications = await getAllNotifications({ user_id, read, notification_type });
    res.json(notifications);
  } catch (error) {
    console.error('Error al obtener notificaciones:', error);
    res.status(500).json({ error: 'Error al obtener notificaciones' });
  }
};

const getById = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await getNotificationById(id);
    if (!notification) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json(notification);
  } catch (error) {
    console.error('Error al obtener notificación:', error);
    res.status(500).json({ error: 'Error al obtener notificación' });
  }
};

const create = async (req, res) => {
  try {
    const { user_id, notification_type, title, message, data } = req.body;
    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'user_id, title y message son requeridos' });
    }
    const notificationData = { user_id, notification_type: notification_type || null, title, message, data: data || null };
    const newNotification = await createNotification(notificationData);
    res.status(201).json({ mensaje: 'Notificación creada exitosamente', data: newNotification });
  } catch (error) {
    console.error('Error al crear notificación:', error);
    res.status(500).json({ error: 'Error al crear notificación' });
  }
};

const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await markAsRead(id);
    if (!notification) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ mensaje: 'Notificación marcada como leída', data: notification });
  } catch (error) {
    console.error('Error al marcar notificación como leída:', error);
    res.status(500).json({ error: 'Error al marcar notificación como leída' });
  }
};

const markAllRead = async (req, res) => {
  try {
    const { user_id } = req.params;
    const notifications = await markAllAsReadByUser(user_id);
    res.json({ mensaje: 'Todas las notificaciones marcadas como leídas', data: notifications });
  } catch (error) {
    console.error('Error al marcar todas las notificaciones como leídas:', error);
    res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas' });
  }
};

const remove = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await deleteNotification(id);
    if (!notification) return res.status(404).json({ error: 'Notificación no encontrada' });
    res.json({ mensaje: 'Notificación eliminada exitosamente', data: notification });
  } catch (error) {
    console.error('Error al eliminar notificación:', error);
    res.status(500).json({ error: 'Error al eliminar notificación' });
  }
};

module.exports = { getAll, getById, create, markRead, markAllRead, remove };
