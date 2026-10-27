const path = require('path');
const fs = require('fs');
const swaggerJsDoc = require('swagger-jsdoc');
require('dotenv').config();

// Đọc danh sách tất cả các file routes bằng đường dẫn tuyệt đối
const routesDir = path.join(__dirname, '../routes');
const routeFiles = fs.existsSync(routesDir)
  ? fs.readdirSync(routesDir)
      .filter((file) => file.endsWith('.js'))
      .map((file) => path.join(routesDir, file))
  : [];

// Cấu hình tài liệu chuẩn Swagger UI mặc định
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {},
    tags: [
      {
        name: 'Users',
        description: 'Nhóm API xác thực và người dùng'
      },
      {
        name: 'Sensors',
        description: 'Nhóm API dữ liệu cảm biến và tra cứu'
      },
      {
        name: 'Controls & Devices',
        description: 'Nhóm API quản lý thiết bị và lịch sử điều khiển'
      },
      {
        name: 'System',
        description: 'Nhóm API giám sát hệ thống'
      }
    ]
  },
  apis: [
    ...routeFiles,
    path.join(__dirname, '../server.js')
  ]
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
