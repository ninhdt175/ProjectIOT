const path = require('path');
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
      description: 'Tài liệu API tương tác trực quan cho hệ thống IoT (Đỗ Trọng Ninh - B23DCCN633 - Nhóm 10)',
      contact: {
        name: 'Đỗ Trọng Ninh',
        email: 'dtn17505@gmail.com'
      }
    },
    servers: [
      {
        url: `http://localhost:${port}`,
        description: 'Máy chủ phát triển cục bộ (Local Development Server)'
      }
    ],
    tags: [
      {
        name: 'Sensors',
        description: 'Nhóm API truy xuất và ghi nhận dữ liệu cảm biến (Nhiệt độ, Độ ẩm, Cường độ ánh sáng)'
      },
      {
        name: 'Controls & Devices',
        description: 'Nhóm API điều khiển thiết bị (LED_01, LED_02, LED_03) và tra cứu lịch sử thao tác'
      },
      {
        name: 'Users',
        description: 'Nhóm API hồ sơ người dùng / sinh viên'
      }
    ]
  },
  // Đường dẫn tuyệt đối tới các file route để Swagger đọc chú thích JSDoc
  apis: [
    path.join(__dirname, '../routes/*.js'),
    path.join(__dirname, '../server.js')
  ]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
