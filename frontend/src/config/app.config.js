// Cấu hình toàn cục cho ứng dụng Front-End IoT
const APP_CONFIG = {
    // Địa chỉ Backend Server
    BACKEND_URL: (window.location.port === '3000') ? window.location.origin : 'http://localhost:3000',

    // Danh sách thiết bị điều khiển và mapping GPIO ESP32
    DEVICES: {
        LED_01: { name: 'Đèn LED 1', state: false, elementId: 'devItem1', pin: 18 },
        LED_02: { name: 'Đèn LED 2', state: false, elementId: 'devItem2', pin: 19 },
        LED_03: { name: 'Đèn LED 3', state: false, elementId: 'devItem3', pin: 21 },
        LED_04: { name: 'Đèn LED 4', state: false, elementId: 'devItem4', pin: 5 }
    }
};

window.APP_CONFIG = APP_CONFIG;
