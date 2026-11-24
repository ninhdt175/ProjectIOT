const db = require('../config/db.config');
const {
  publishDeviceControl,
  waitForDeviceAck,
  markEsp32Offline,
  isEsp32Connected
} = require('../services/mqtt.service');

// Lấy lịch sử điều khiển thiết bị có lọc theo 4 tiêu chí và phân trang (5, 7, 10, 20 dòng)
const getControlHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 7);
    const timeFilter = (req.query.time || '').trim().toLowerCase();
    const deviceFilter = req.query.device || 'ALL';
    const actionFilter = req.query.action || 'ALL';
    const statusFilter = req.query.status || 'ALL';
    const sort = (req.query.sort || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Truy vấn kết hợp bảng history, devices và users
    const queryText = `
      SELECT h.id, h.user_id, COALESCE(u.full_name, 'Đỗ Trọng Ninh') AS user_name,
             h.device_id, d.name AS device_name, d.device_type,
             h.action, h.status, h.message,
             to_char(h.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at_formatted,
             h.created_at
      FROM history h
      JOIN devices d ON h.device_id = d.id
      LEFT JOIN users u ON h.user_id = u.id
      ORDER BY h.created_at ${sort};
    `;

    const { rows } = await db.query(queryText);

    // Chuyển đổi dữ liệu chuẩn hóa theo giao diện trang Lịch sử
    let mappedList = rows.map((row) => ({
      id: Number(row.id),
      time: row.created_at_formatted,
      device: (row.device_name || row.device_id).replace(/\s*\([^)]*(?:GPIO|LED)[^)]*\)/gi, '').trim(),
      deviceId: row.device_id,
      action: row.action,
      user: row.user_name,
      status: row.status,
      message: row.message || `${row.action === 'ON' ? 'Bật' : 'Tắt'} ${row.device_name}`,
      created_at: row.created_at_formatted
    }));

    // Áp dụng bộ lọc 4 tiêu chí
    let filteredList = mappedList.filter((item) => {
      const matchesTime = !timeFilter || (item.time && item.time.toLowerCase().includes(timeFilter));
      const matchesDevice = deviceFilter === 'ALL' || item.deviceId === deviceFilter || item.device.includes(deviceFilter);
      const matchesAction = actionFilter === 'ALL' || item.action === actionFilter;
      const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

      return matchesTime && matchesDevice && matchesAction && matchesStatus;
    });

    // Sắp xếp theo thời gian
    filteredList.sort((a, b) => {
      const timeA = new Date(String(a.time).replace(' ', 'T')).getTime() || 0;
      const timeB = new Date(String(b.time).replace(' ', 'T')).getTime() || 0;
      return sort === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    // Phân trang
    const total = filteredList.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginatedData = filteredList.slice(offset, offset + limit);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      data: paginatedData
    });
  } catch (error) {
    return next(error);
  }
};

// Gửi lệnh điều khiển bật/tắt thiết bị qua HTTP REST
const toggleDevice = async (req, res, next) => {
  try {
    const { device_id, action, user_id, message } = req.body;

    if (!device_id || !action) {
      return res.status(400).json({
        success: false,
        message: 'device_id và action là các trường bắt buộc'
      });
    }

    const cleanAction = String(action).toUpperCase();
    if (cleanAction !== 'ON' && cleanAction !== 'OFF') {
      return res.status(400).json({
        success: false,
        message: "action chỉ chấp nhận giá trị 'ON' hoặc 'OFF'"
      });
    }

    // Kiểm tra thiết bị có tồn tại trong cơ sở dữ liệu không
    const deviceCheck = await db.query('SELECT id, name FROM devices WHERE id = $1', [device_id]);
    if (deviceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy thiết bị có mã: ${device_id}`
      });
    }

    const deviceName = deviceCheck.rows[0].name;
    const defaultMsg = message || `Yêu cầu ${cleanAction === 'ON' ? 'bật' : 'tắt'} ${deviceName}`;
    const requestId = 'swagger_' + Date.now() + '_' + device_id;
    const io = req.app ? req.app.get('io') : null;

    // 1. Nếu mạch ESP32 đang bị rút kết nối (Offline), từ chối ngay và trả về success: false
    if (!isEsp32Connected()) {
      await markEsp32Offline();
      const offlineMsg = `Thất bại: Mạch ESP32 đang ngoại tuyến (đã rút kết nối)`;
      const { rows } = await db.query(
        `INSERT INTO history (user_id, device_id, action, status, message, created_at)
         VALUES ($1, $2, $3, 'failed', $4, CURRENT_TIMESTAMP)
         RETURNING id, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at;`,
        [user_id || 1, device_id, cleanAction, offlineMsg]
      );

      if (io) {
        io.emit('device_control_ack', {
          target: device_id,
          action: cleanAction,
          status: 'failed',
          requestId,
          message: offlineMsg
        });
      }

      return res.status(200).json({
        success: false,
        message: 'Không thể điều khiển: Mạch ESP32 đang ngoại tuyến (đã rút kết nối)',
        history_id: Number(rows[0].id),
        status: 'failed',
        is_online: false,
        device_id,
        action: cleanAction,
        created_at: rows[0].created_at
      });
    }

    // 2. Lưu vào bảng history với trạng thái 'pending' chờ phản hồi phần cứng
    const insertQuery = `
      INSERT INTO history (user_id, device_id, action, status, message, created_at)
      VALUES ($1, $2, $3, 'pending', $4, CURRENT_TIMESTAMP)
      RETURNING id, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at;
    `;

    const { rows } = await db.query(insertQuery, [user_id || 1, device_id, cleanAction, defaultMsg]);
    const historyId = Number(rows[0].id);

    // 3. Phát lệnh điều khiển tới thiết bị phần cứng qua MQTT và chờ phản hồi ACK thực tế
    const ackPromise = waitForDeviceAck(device_id, 4500);
    try {
      await publishDeviceControl(device_id, cleanAction, requestId);
    } catch (mqttErr) {
      console.warn('[Control Controller] Không thể gửi lệnh qua MQTT:', mqttErr.message);
      await db.query(
        "UPDATE history SET status = 'failed', message = 'Không thể kết nối tới MQTT Broker' WHERE id = $1",
        [historyId]
      );
      return res.status(200).json({
        success: false,
        message: 'Không thể gửi lệnh tới MQTT Broker',
        history_id: historyId,
        status: 'failed',
        is_online: false,
        device_id,
        action: cleanAction,
        created_at: rows[0].created_at
      });
    }

    const ackResult = await ackPromise;

    // Nếu không nhận được ACK từ ESP32 (mạch vừa bị rút ra) -> trả về success: false
    if (!ackResult || ackResult.status !== 'success') {
      await db.query(
        "UPDATE history SET status = 'failed', message = 'Hết thời gian chờ phản hồi từ thiết bị (mạch đã ngắt kết nối)' WHERE id = $1 AND status = 'pending'",
        [historyId]
      );
      await markEsp32Offline();
      if (io) {
        io.emit('device_control_ack', {
          target: device_id,
          action: cleanAction,
          status: 'failed',
          requestId,
          message: 'Hết thời gian chờ phản hồi từ thiết bị (mạch đã ngắt kết nối)'
        });
      }

      return res.status(200).json({
        success: false,
        message: 'Không thể điều khiển: Thiết bị không phản hồi (mạch ESP32 đã rút kết nối)',
        history_id: historyId,
        status: 'failed',
        is_online: false,
        device_id,
        action: cleanAction,
        created_at: rows[0].created_at
      });
    }

    return res.status(200).json({
      success: true,
      message: `Đã ${cleanAction === 'ON' ? 'bật' : 'tắt'} ${deviceName} thành công`,
      history_id: historyId,
      status: 'success',
      is_online: true,
      device_id,
      action: cleanAction,
      created_at: rows[0].created_at
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getControlHistory,
  toggleDevice
};
