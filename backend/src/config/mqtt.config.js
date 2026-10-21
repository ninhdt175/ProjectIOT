const mqtt = require('mqtt');
require('dotenv').config();

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1705';
const options = {
  clientId: (process.env.MQTT_CLIENT_ID || 'backend_server_01') + '_' + Math.random().toString(16).substring(2, 8),
  clean: true,
  connectTimeout: 5000,
  reconnectPeriod: 3000
};

if (process.env.MQTT_USERNAME) {
  options.username = process.env.MQTT_USERNAME;
}
if (process.env.MQTT_PASSWORD) {
  options.password = process.env.MQTT_PASSWORD;
}

// Khởi tạo kết nối MQTT Client
const mqttClient = mqtt.connect(brokerUrl, options);

mqttClient.on('connect', () => {
  console.log(`[MQTT] Kết nối thành công tới Mosquitto Broker tại: ${brokerUrl}`);
});

mqttClient.on('error', (err) => {
  console.error('[MQTT] Lỗi kết nối Broker:', err.message);
});

mqttClient.on('reconnect', () => {
  console.log('[MQTT] Đang cố gắng kết nối lại Broker...');
});

mqttClient.on('offline', () => {
  console.warn('[MQTT] Mất kết nối tới Mosquitto Broker!');
});

module.exports = mqttClient;
