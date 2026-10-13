// Cấu hình toàn cục cho ứng dụng Front-End IoT
const APP_CONFIG = {
    // Địa chỉ Backend Server
    BACKEND_URL: window.location.origin,

    // Danh sách thiết bị điều khiển và mapping GPIO ESP32
    DEVICES: {
        LED_01: { name: 'Đèn LED 1', state: true, elementId: 'devItem1', pin: 2 },
        LED_02: { name: 'Đèn LED 2', state: false, elementId: 'devItem2', pin: 4 },
        LED_03: { name: 'Đèn LED 3', state: false, elementId: 'devItem3', pin: 5 }
    },

    // Dữ liệu cảm biến mẫu ban đầu (Mock Data)
    DEFAULT_SENSORS: [
        { id: 1, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '30.0 °C', rawVal: 30.0, time: '2026-08-24 13:45:33' },
        { id: 2, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '74.0 %', rawVal: 74.0, time: '2026-08-24 13:45:33' },
        { id: 3, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1750 lux', rawVal: 1750, time: '2026-08-24 13:45:30' },
        { id: 4, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '29.8 °C', rawVal: 29.8, time: '2026-08-24 13:40:15' },
        { id: 5, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '75.2 %', rawVal: 75.2, time: '2026-08-24 13:40:15' },
        { id: 6, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1820 lux', rawVal: 1820, time: '2026-08-24 13:40:12' },
        { id: 7, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '29.5 °C', rawVal: 29.5, time: '2026-08-24 13:35:00' },
        { id: 8, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '76.0 %', rawVal: 76.0, time: '2026-08-24 13:35:00' },
        { id: 9, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1680 lux', rawVal: 1680, time: '2026-08-24 13:34:55' },
        { id: 10, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '29.2 °C', rawVal: 29.2, time: '2026-08-24 13:30:10' },
        { id: 11, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '77.1 %', rawVal: 77.1, time: '2026-08-24 13:30:10' },
        { id: 12, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1590 lux', rawVal: 1590, time: '2026-08-24 13:30:05' },
        { id: 13, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '28.9 °C', rawVal: 28.9, time: '2026-08-24 13:25:00' },
        { id: 14, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '78.0 %', rawVal: 78.0, time: '2026-08-24 13:25:00' },
        { id: 15, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1450 lux', rawVal: 1450, time: '2026-08-24 13:24:50' },
        { id: 16, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '28.5 °C', rawVal: 28.5, time: '2026-08-24 13:20:10' },
        { id: 17, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '79.2 %', rawVal: 79.2, time: '2026-08-24 13:20:10' },
        { id: 18, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1380 lux', rawVal: 1380, time: '2026-08-24 13:20:00' },
        { id: 19, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '28.1 °C', rawVal: 28.1, time: '2026-08-24 13:15:30' },
        { id: 20, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '80.0 %', rawVal: 80.0, time: '2026-08-24 13:15:30' }
    ],

    // Dữ liệu lịch sử điều khiển mẫu ban đầu (Mock Data)
    DEFAULT_HISTORY: [
        { id: 1, time: 'Hôm nay, 13:40:05', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 2, time: 'Hôm nay, 13:15:20', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 3, time: 'Hôm nay, 12:45:11', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'pending' },
        { id: 4, time: 'Hôm qua, 22:30:00', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 5, time: 'Hôm qua, 18:00:15', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 6, time: 'Hôm qua, 15:10:20', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'pending' },
        { id: 7, time: 'Hôm qua, 09:20:00', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'failed' },
        { id: 8, time: '2026-08-22 21:10:00', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 9, time: '2026-08-22 18:05:40', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 10, time: '2026-08-22 14:30:15', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'pending' },
        { id: 11, time: '2026-08-21 23:00:10', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 12, time: '2026-08-21 19:45:00', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 13, time: '2026-08-21 11:20:30', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'failed' },
        { id: 14, time: '2026-08-20 20:00:00', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' }
    ]
};

window.APP_CONFIG = APP_CONFIG;
