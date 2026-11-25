const mqttClient = require('../config/mqtt.config');
const db = require('../config/db.config');

const TOPIC_SENSOR_DATA = process.env.MQTT_TOPIC_SENSOR_DATA || 'iot/sensors/data';
const TOPIC_DEVICE_CONTROL = process.env.MQTT_TOPIC_DEVICE_CONTROL || 'iot/device/control';
const TOPIC_DEVICE_STATUS = process.env.MQTT_TOPIC_DEVICE_STATUS || 'iot/device/status';

// Lưu trữ ánh xạ requestId đang chờ xử lý
const activeRequests = new Map();
const pendingAckResolvers = new Map();

// Ngưỡng thời gian (ms) không nhận được gói tin từ ESP32 thì coi như đã rút kết nối mạch (ESP32 gửi định kỳ mỗi 2.5s)
const ESP32_OFFLINE_TIMEOUT_MS = 5000;
let lastEsp32SeenAt = 0;
let isEsp32Online = false;
let ioInstance = null;

// Trạng thái thực tế hiện tại của 4 đèn LED trên mạch
const deviceStates = {
  LED_01: 'OFF',
  LED_02: 'OFF',
  LED_03: 'OFF',
  LED_04: 'OFF'
};

// Đánh dấu mạch ESP32 và toàn bộ thiết bị đang ONLINE
const markEsp32Online = async () => {
  lastEsp32SeenAt = Date.now();
  const wasOffline = !isEsp32Online;
  isEsp32Online = true;

  try {
    await db.query(`UPDATE devices SET is_online = true, last_seen = CURRENT_TIMESTAMP`);
  } catch (err) {
    console.error('[MQTT Service] Lỗi cập nhật devices online:', err.message);
  }

  if (wasOffline && ioInstance) {
    console.log('[MQTT Service] Mạch ESP32 đã kết nối (ONLINE)');
    ioInstance.emit('esp32_status', {
      is_online: true,
      devices: { ...deviceStates }
    });
  }
};

// Đánh dấu mạch ESP32 và toàn bộ thiết bị đã OFFLINE (khi rút mạch hoặc mất phản hồi)
const markEsp32Offline = async () => {
  const wasOnline = isEsp32Online;
  isEsp32Online = false;
  deviceStates.LED_01 = 'OFF';
  deviceStates.LED_02 = 'OFF';
  deviceStates.LED_03 = 'OFF';
  deviceStates.LED_04 = 'OFF';

  try {
    await db.query(`UPDATE devices SET is_online = false WHERE is_online = true`);
  } catch (err) {
    console.error('[MQTT Service] Lỗi cập nhật devices offline:', err.message);
  }

  if (wasOnline && ioInstance) {
    console.warn('[MQTT Service] Mất kết nối với mạch ESP32 (OFFLINE) -> Đặt is_online = false và tắt trạng thái nút trên Web');
    ioInstance.emit('esp32_status', {
      is_online: false,
      devices: { ...deviceStates }
    });
  }
};

const isEsp32Connected = () => {
  return isEsp32Online && (Date.now() - lastEsp32SeenAt <= ESP32_OFFLINE_TIMEOUT_MS);
};

const getDeviceStates = () => ({ ...deviceStates });

// Khởi tạo dịch vụ MQTT lắng nghe và phân phối dữ liệu
const initMQTTService = (io) => {
  ioInstance = io;

  // Khởi tạo trạng thái ban đầu: nếu quá 5s chưa có tín hiệu thì đặt is_online = false trong DB
  db.query(
    `UPDATE devices SET is_online = false WHERE last_seen IS NULL OR EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_seen)) > 5`
  ).catch(() => {});

  // Bộ giám sát (Watchdog) kiểm tra mỗi 1 giây: nếu rút mạch (quá 5s không có gói tin từ ESP32) thì chuyển ngay sang OFFLINE
  setInterval(() => {
    if (isEsp32Online && (Date.now() - lastEsp32SeenAt > ESP32_OFFLINE_TIMEOUT_MS)) {
      markEsp32Offline();
    }
  }, 1000);

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
        const oxygen = payload.oxygen !== undefined ? parseFloat(payload.oxygen) : null;
        const sensor_id = payload.sensor_id || 1;
        const device_id = payload.device_id || 'ESP32_01';

        // Ghi dữ liệu cảm biến vào bảng data_sensor trong PostgreSQL
        try {
          await db.query(
            `INSERT INTO data_sensor (sensor_id, temperature, humidity, light_lux, oxygen, created_at)
             VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
            [sensor_id, temperature, humidity, light_lux, oxygen]
          );
        } catch (dbErr) {
          console.error('[MQTT Service] Lỗi lưu data_sensor:', dbErr.message);
        }

        // Cập nhật trạng thái sống của toàn bộ thiết bị trên mạch ESP32 trong bảng devices
        await markEsp32Online();

        // Phát sự kiện Socket.IO tức thì tới Web Dashboard để nhảy số và vẽ đồ thị
        if (io) {
          const now = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const timeFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
          io.emit('sensor_data', {
            device_id,
            sensor_id,
            temperature,
            humidity,
            light_lux,
            oxygen,
            time: timeFormatted,
            created_at: timeFormatted
          });
        }
      }

      // 2. Xử lý bản tin phản hồi trạng thái thiết bị (ACK từ ESP32)
      if (topic === TOPIC_DEVICE_STATUS) {
        const target = payload.target;
        const state = payload.state || payload.action || 'OFF';
        const status = payload.status || 'success';

        if (target && (state === 'ON' || state === 'OFF')) {
          deviceStates[target] = state;
        }

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

        // Cập nhật trạng thái hoạt động của thiết bị trong bảng devices
        await markEsp32Online();

        // Tìm requestId liên quan nếu có
        let requestId = null;
        if (activeRequests.has(target)) {
          requestId = activeRequests.get(target);
          activeRequests.delete(target);
        }

        // Giải phóng các Promise đang chờ phản hồi ACK trực tiếp (từ HTTP / Swagger API)
        if (target && pendingAckResolvers.has(target)) {
          const resolvers = pendingAckResolvers.get(target);
          pendingAckResolvers.delete(target);
          resolvers.forEach((resolveFn) => resolveFn({ target, state, status, requestId }));
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

// Chờ phản hồi ACK thực tế từ ESP32 cho một thiết bị cụ thể (dùng cho HTTP API đồng bộ)
const waitForDeviceAck = (target, timeoutMs = 4500) => {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (pendingAckResolvers.has(target)) {
        const list = pendingAckResolvers.get(target).filter((fn) => fn !== onAck);
        if (list.length > 0) {
          pendingAckResolvers.set(target, list);
        } else {
          pendingAckResolvers.delete(target);
        }
      }
      resolve(null);
    }, timeoutMs);

    const onAck = (ackData) => {
      clearTimeout(timer);
      resolve(ackData);
    };

    const existing = pendingAckResolvers.get(target) || [];
    existing.push(onAck);
    pendingAckResolvers.set(target, existing);
  });
};

module.exports = {
  initMQTTService,
  publishDeviceControl,
  waitForDeviceAck,
  markEsp32Offline,
  isEsp32Connected,
  getDeviceStates
};
