const swaggerJsDoc = require('swagger-jsdoc');
require('dotenv').config();

const port = process.env.PORT || 3000;

// Cấu hình tài liệu chuẩn OpenAPI 3.0 cho toàn bộ hệ thống
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hệ Thống IoT Giám Sát & Điều Khiển ESP32 - REST APIs',
      version: '1.0.0',
      description: 'Tài liệu API tương tác cho hệ thống IoT (Đỗ Trọng Ninh - B23DCCN633 - Nhóm 10)',
      contact: {
        name: 'Đỗ Trọng Ninh',
        email: 'ninhdt175@gmail.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Local Development Server'
      }
    ],
    tags: [
      {
        name: 'Sensors',
        description: 'Nhóm API truy xuất và quản lý dữ liệu cảm biến (Nhiệt độ, Độ ẩm, Ánh sáng)'
      },
      {
        name: 'Controls & Devices',
        description: 'Nhóm API điều khiển thiết bị (LED_01, LED_02, LED_03) và tra cứu lịch sử'
      },
      {
        name: 'Users',
        description: 'Nhóm API hồ sơ người dùng / sinh viên'
      }
    ]
  },
  // Nơi đọc chú thích JSDoc cho các endpoint
  apis: ['./src/routes/*.js', './src/server.js']
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
