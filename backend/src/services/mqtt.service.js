const mqttClient = require('../config/mqtt.config');
const db = require('../config/db.config');

const TOPIC_SENSOR_DATA = process.env.MQTT_TOPIC_SENSOR_DATA || 'iot/sensors/data';
const TOPIC_DEVICE_CONTROL = process.env.MQTT_TOPIC_DEVICE_CONTROL || 'iot/device/control';
const TOPIC_DEVICE_STATUS = process.env.MQTT_TOPIC_DEVICE_STATUS || 'iot/device/status';

// Lưu trữ ánh xạ requestId đang chờ xử lý
const activeRequests = new Map();

// Khởi tạo dịch vụ MQTT lắng nghe và phân phối dữ liệu
const initMQTTService = (io) => {
  mqttClient.on('connect', () => {
    // Đăng ký nhận dữ liệu từ các chủ đề cảm biến và trạng thái thiết bị
    mqttClient.subscribe([TOPIC_SENSOR_DATA, TOPIC_DEVICE_STATUS], (err) => {
      if (err) {
        console.error('[MQTT Service] Đăng ký topic thất bại:', err.message);
      } else {
        console.log(`[MQTT Service] Đã subscribe thành công các topic: ${TOPIC_SENSOR_DATA}, ${TOPIC_DEVICE_STATUS}`);
      }
    });
  });

  // Tiếp nhận và xử lý các bản tin MQTT từ vi điều khiển ESP32
  mqttClient.on('message', async (topic, message) => {
    try {
      const payloadStr = message.toString();
      const payload = JSON.parse(payloadStr);

      // 1. Xử lý bản tin đo lường định kỳ từ cảm biến (Telemetry)
      if (topic === TOPIC_SENSOR_DATA) {
        const temperature = payload.temperature !== undefined ? parseFloat(payload.temperature) : null;
        const humidity = payload.humidity !== undefined ? parseFloat(payload.humidity) : null;
        const light_lux = payload.light_lux !== undefined ? parseInt(payload.light_lux, 10) : null;
        const sensor_id = payload.sensor_id || 1;
        const device_id = payload.device_id || 'ESP32_01';

        // Ghi dữ liệu cảm biến vào bảng data_sensor trong PostgreSQL
        try {
          await db.query(
            `INSERT INTO data_sensor (sensor_id, temperature, humidity, light_lux, created_at)
             VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)`,
            [sensor_id, temperature, humidity, light_lux]
          );
        } catch (dbErr) {
          console.error('[MQTT Service] Lỗi lưu data_sensor:', dbErr.message);
        }

        // Cập nhật trạng thái sống của thiết bị ESP32 trong bảng devices
        try {
          await db.query(
            `UPDATE devices SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1`,
            [device_id]
          );
        } catch (devErr) {
          // Bỏ qua nếu chưa khai báo mã ESP32
        }

        // Phát sự kiện Socket.IO tức thì tới Web Dashboard để nhảy số và vẽ đồ thị
        if (io) {
          io.emit('sensor_data', {
            device_id,
            sensor_id,
            temperature,
            humidity,
            light_lux
          });
        }
      }

      // 2. Xử lý bản tin phản hồi trạng thái thiết bị (ACK từ ESP32)
      if (topic === TOPIC_DEVICE_STATUS) {
        const target = payload.target;
        const state = payload.state || payload.action || 'OFF';
        const status = payload.status || 'success';

        // Cập nhật trạng thái bản ghi history đang chờ (pending -> success)
        try {
          await db.query(
            `UPDATE history
             SET status = $1, message = $2
             WHERE id IN (
               SELECT id FROM history
               WHERE device_id = $3 AND status = 'pending'
               ORDER BY created_at DESC
               LIMIT 1
             )`,
            [status, `Thiết bị ${target} phản hồi thành công`, target]
          );
        } catch (histErr) {
          console.error('[MQTT Service] Lỗi cập nhật history:', histErr.message);
        }

        // Cập nhật trạng thái hoạt động của đèn LED trong bảng devices
        try {
          await db.query(
            `UPDATE devices SET is_online = true, last_seen = CURRENT_TIMESTAMP WHERE id = $1`,
            [target]
          );
        } catch (devErr) {
          console.error('[MQTT Service] Lỗi cập nhật devices:', devErr.message);
        }

        // Tìm requestId liên quan nếu có
        let requestId = null;
        if (activeRequests.has(target)) {
          requestId = activeRequests.get(target);
          activeRequests.delete(target);
        }

        // Bắn Socket.IO xác nhận về Web Front-End
        if (io) {
          io.emit('device_control_ack', {
            target,
            action: state,
            status,
            requestId
          });

          io.emit('device_status', {
            target,
            state,
            status
          });
        }
      }
    } catch (parseErr) {
      console.error('[MQTT Service] Lỗi phân tích gói tin JSON:', parseErr.message);
    }
  });
};

// Xuất bản lệnh điều khiển đèn LED tới vi điều khiển ESP32 qua MQTT
const publishDeviceControl = (target, action, requestId) => {
  return new Promise((resolve, reject) => {
    if (!mqttClient.connected) {
      return reject(new Error('MQTT Broker chưa kết nối'));
    }

    if (requestId) {
      activeRequests.set(target, requestId);
    }

    const payload = JSON.stringify({
      target,
      action: String(action).toUpperCase(),
      requestId
    });

    mqttClient.publish(TOPIC_DEVICE_CONTROL, payload, { qos: 1 }, (err) => {
      if (err) {
        console.error(`[MQTT Service] Gửi lệnh tới ${TOPIC_DEVICE_CONTROL} thất bại:`, err.message);
        return reject(err);
      }
      console.log(`[MQTT Service] Đã phát lệnh điều khiển: ${payload}`);
      resolve(true);
    });
  });
};

module.exports = {
  initMQTTService,
  publishDeviceControl
};
