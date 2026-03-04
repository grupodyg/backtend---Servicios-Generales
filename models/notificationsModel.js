const pool = require('../config/db');

const getAllNotifications = async (filters = {}) => {
  const { user_id, read, notification_type } = filters;
  let query = `SELECT * FROM notifications WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (user_id) {
    query += ` AND user_id = $${paramIndex}`;
    params.push(user_id);
    paramIndex++;
  }

  if (read !== undefined) {
    query += ` AND read = $${paramIndex}`;
    params.push(read === 'true');
    paramIndex++;
  }

  if (notification_type) {
    query += ` AND notification_type = $${paramIndex}`;
    params.push(notification_type);
    paramIndex++;
  }

  query += ' ORDER BY date_time_registration DESC';
  const result = await pool.query(query, params);
  return result.rows;
};

const getNotificationById = async (id) => {
  const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const createNotification = async (notificationData) => {
  const { user_id, notification_type, title, message, data } = notificationData;
  const query = `
    INSERT INTO notifications (
      user_id, notification_type, title, message, read, data, status, date_time_registration
    ) VALUES ($1, $2, $3, $4, false, $5, 'active', CURRENT_TIMESTAMP)
    RETURNING *
  `;
  const result = await pool.query(query, [user_id, notification_type, title, message, data || null]);
  return result.rows[0];
};

const markAsRead = async (id) => {
  const query = `
    UPDATE notifications
    SET read = true, date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

const markAllAsReadByUser = async (user_id) => {
  const query = `
    UPDATE notifications
    SET read = true, date_time_modification = CURRENT_TIMESTAMP
    WHERE user_id = $1 AND read = false
    RETURNING *
  `;
  const result = await pool.query(query, [user_id]);
  return result.rows;
};

const deleteNotification = async (id) => {
  const query = `
    UPDATE notifications
    SET status = 'inactive', date_time_modification = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
  `;
  const result = await pool.query(query, [id]);
  return result.rows.length > 0 ? result.rows[0] : null;
};

module.exports = {
  getAllNotifications,
  getNotificationById,
  createNotification,
  markAsRead,
  markAllAsReadByUser,
  deleteNotification
};
