const db = require('../config/db.config');
const { publishDeviceControl } = require('./mqtt.service');

// Quản lý kết nối và các sự kiện thời gian thực Socket.IO
const initSocketService = (io) => {
  io.on('connection', async (socket) => {
    console.log(`[Socket.IO] Client Web đã kết nối: ${socket.id}`);

    // Gửi đồng bộ trạng thái ban đầu khi client vừa tải trang
    try {
      const { rows: latestSensors } = await db.query(
        `SELECT temperature, humidity, light_lux, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
         FROM data_sensor ORDER BY created_at DESC LIMIT 1`
      );
      if (latestSensors.length > 0) {
        socket.emit('sensor_data', latestSensors[0]);
      }

      const { rows: deviceStates } = await db.query(
        `SELECT d.id AS target,
                COALESCE((SELECT action FROM history WHERE device_id = d.id AND status = 'success' ORDER BY created_at DESC LIMIT 1), 'OFF') AS state
         FROM devices d`
      );
      deviceStates.forEach((dev) => {
        socket.emit('device_status', {
          target: dev.target,
          state: dev.state,
          status: 'success'
        });
      });
    } catch (syncErr) {
      console.warn('[Socket.IO] Đồng bộ trạng thái ban đầu lỗi:', syncErr.message);
    }

    // Lắng nghe sự kiện nháy đèn cảnh báo khi vượt ngưỡng từ Web Client
    socket.on('device_blink', async (data) => {
      try {
        const { target, count } = data;
        if (!target) return;
        console.log(`[Socket.IO Cảnh báo] Nháy đèn ${target} do vượt ngưỡng (Lần ${count || 1})`);
        // Phát lệnh BLINK tới vi điều khiển ESP32 qua MQTT
        try {
          await publishDeviceControl(target, 'BLINK');
        } catch (mqttErr) {
          console.warn('[Socket.IO] Không thể phát lệnh BLINK qua MQTT:', mqttErr.message);
        }
        // Phát thông báo tới toàn bộ Web Clients khác để đồng bộ số lần nháy
        io.emit('device_blink_alert', {
          target,
          count: count || 1,
          timestamp: new Date().toISOString()
        });
      } catch (blinkErr) {
        console.error('[Socket.IO] Lỗi xử lý sự kiện device_blink:', blinkErr.message);
      }
    });

    // Lắng nghe lệnh điều khiển thiết bị từ Web Client
    socket.on('device_control', async (data) => {
      try {
        const { target, action, requestId } = data;
        if (!target || !action) return;

        const cleanAction = String(action).toUpperCase();
        console.log(`[Socket.IO] Nhận yêu cầu điều khiển từ Web: ${target} -> ${cleanAction}`);

        // 1. Ghi nhận vào bảng history với trạng thái 'pending'
        let historyId = null;
        try {
          const insertRes = await db.query(
            `INSERT INTO history (user_id, device_id, action, status, message, created_at)
             VALUES (1, $1, $2, 'pending', $3, CURRENT_TIMESTAMP)
             RETURNING id`,
            [target, cleanAction, `Yêu cầu ${cleanAction === 'ON' ? 'bật' : 'tắt'} ${target} từ Web`]
          );
          historyId = insertRes.rows[0]?.id;
        } catch (dbErr) {
          console.error('[Socket.IO] Lỗi ghi history pending:', dbErr.message);
        }

        // 2. Phát lệnh qua MQTT tới phần cứng ESP32
        try {
          await publishDeviceControl(target, cleanAction, requestId);
        } catch (mqttErr) {
          console.error('[Socket.IO] Lỗi phát MQTT:', mqttErr.message);
          // Nếu MQTT lỗi ngay lập tức thì cập nhật failed
          if (historyId) {
            await db.query(
              `UPDATE history SET status = 'failed', message = 'Không thể gửi lệnh tới Broker MQTT' WHERE id = $1`,
              [historyId]
            );
          }
          socket.emit('device_control_ack', {
            target,
            action: cleanAction,
            status: 'failed',
            requestId,
            message: 'Không thể kết nối tới MQTT Broker'
          });
          return;
        }

        // 3. Cơ chế Timeout 5s: nếu quá 5s mà bản ghi vẫn 'pending' thì đánh dấu 'failed'
        if (historyId) {
          setTimeout(async () => {
            try {
              const checkRes = await db.query(
                `SELECT status FROM history WHERE id = $1`,
                [historyId]
              );
              if (checkRes.rows[0]?.status === 'pending') {
                console.warn(`[Socket.IO Timeout] Quá 5s không có ACK cho lệnh ${target} (${historyId}), chuyển sang failed.`);
                await db.query(
                  `UPDATE history SET status = 'failed', message = 'Hết thời gian chờ phản hồi từ thiết bị (5s)' WHERE id = $1`,
                  [historyId]
                );
                // Bắn phản hồi thất bại về Web
                io.emit('device_control_ack', {
                  target,
                  action: cleanAction,
                  status: 'failed',
                  requestId,
                  message: 'Hết thời gian chờ phản hồi từ thiết bị (5s)'
                });
              }
            } catch (timeoutErr) {
              console.error('[Socket.IO] Lỗi kiểm tra timeout 5s:', timeoutErr.message);
            }
          }, 5000);
        }

      } catch (err) {
        console.error('[Socket.IO] Lỗi xử lý sự kiện device_control:', err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client Web đã ngắt kết nối: ${socket.id}`);
    });
  });
};

module.exports = {
  initSocketService
};
