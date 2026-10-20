const db = require('../config/db.config');

// Lấy danh sách toàn bộ thiết bị điều khiển kèm trạng thái hoạt động
const getAllDevices = async (req, res, next) => {
  try {
    const queryText = `
      SELECT d.id, d.name, d.device_type, d.is_online,
             to_char(d.last_seen, 'YYYY-MM-DD HH24:MI:SS') AS last_seen,
             to_char(d.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
             COALESCE(
               (SELECT action FROM history WHERE device_id = d.id AND status = 'success' ORDER BY created_at DESC LIMIT 1),
               'OFF'
             ) AS current_state
      FROM devices d
      ORDER BY d.id ASC;
    `;

    const { rows } = await db.query(queryText);

    return res.json({
      success: true,
      total: rows.length,
      data: rows
    });
  } catch (error) {
    return next(error);
  }
};

// Tra cứu chi tiết trạng thái hiện tại của một thiết bị cụ thể theo ID
const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const queryText = `
      SELECT d.id, d.name, d.device_type, d.is_online,
             to_char(d.last_seen, 'YYYY-MM-DD HH24:MI:SS') AS last_seen,
             to_char(d.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
             COALESCE(
               (SELECT action FROM history WHERE device_id = d.id AND status = 'success' ORDER BY created_at DESC LIMIT 1),
               'OFF'
             ) AS current_state
      FROM devices d
      WHERE d.id = $1;
    `;

    const { rows } = await db.query(queryText, [id]);

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy thiết bị với mã: ${id}`
      });
    }

    return res.json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllDevices,
  getDeviceById
};
