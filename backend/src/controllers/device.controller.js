const db = require('../config/db.config');
const { isEsp32Connected, getDeviceStates } = require('../services/mqtt.service');

// Đồng bộ trạng thái kết nối thực tế của mạch trước khi trả kết quả API
const syncDevicesOnlineState = async () => {
  if (!isEsp32Connected()) {
    await db.query(`UPDATE devices SET is_online = false WHERE is_online = true`);
  } else {
    await db.query(
      `UPDATE devices
       SET is_online = false
       WHERE is_online = true
         AND (last_seen IS NULL OR EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_seen)) > 5)`
    );
  }
};

// Lấy danh sách toàn bộ thiết bị điều khiển kèm trạng thái hoạt động
const getAllDevices = async (req, res, next) => {
  try {
    await syncDevicesOnlineState();
    const liveStates = getDeviceStates();
    const onlineNow = isEsp32Connected();

    const queryText = `
      SELECT d.id, d.name, d.device_type, d.is_online,
             to_char(d.last_seen, 'YYYY-MM-DD HH24:MI:SS') AS last_seen,
             to_char(d.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
             CASE
               WHEN d.is_online = false THEN 'OFF'
               ELSE COALESCE(
                 (SELECT action FROM history WHERE device_id = d.id AND status = 'success' ORDER BY created_at DESC LIMIT 1),
                 'OFF'
               )
             END AS current_state
      FROM devices d
      ORDER BY d.id ASC;
    `;

    const { rows } = await db.query(queryText);

    const data = rows.map((row) => {
      const isOnline = Boolean(onlineNow && row.is_online);
      return {
        ...row,
        is_online: isOnline,
        current_state: isOnline ? (liveStates[row.id] || row.current_state || 'OFF') : 'OFF'
      };
    });

    return res.json({
      success: true,
      total: data.length,
      data
    });
  } catch (error) {
    return next(error);
  }
};

// Tra cứu chi tiết trạng thái hiện tại của một thiết bị cụ thể theo ID
const getDeviceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    await syncDevicesOnlineState();
    const liveStates = getDeviceStates();
    const onlineNow = isEsp32Connected();

    const queryText = `
      SELECT d.id, d.name, d.device_type, d.is_online,
             to_char(d.last_seen, 'YYYY-MM-DD HH24:MI:SS') AS last_seen,
             to_char(d.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at,
             CASE
               WHEN d.is_online = false THEN 'OFF'
               ELSE COALESCE(
                 (SELECT action FROM history WHERE device_id = d.id AND status = 'success' ORDER BY created_at DESC LIMIT 1),
                 'OFF'
               )
             END AS current_state
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

    const row = rows[0];
    const isOnline = Boolean(onlineNow && row.is_online);

    return res.json({
      success: true,
      data: {
        ...row,
        is_online: isOnline,
        current_state: isOnline ? (liveStates[row.id] || row.current_state || 'OFF') : 'OFF'
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAllDevices,
  getDeviceById
};
