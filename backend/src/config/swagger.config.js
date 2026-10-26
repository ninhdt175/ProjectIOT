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

// Cấu hình tài liệu 
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {},
    tags: [
      {
        name: 'Controls & Devices',
        description: 'Nhóm API điều khiển thiết bị và tra cứu lịch sử thao tác'
      },
      {
        name: 'Sensors',
        description: 'Nhóm API truy xuất và ghi nhận dữ liệu cảm biến '
      },
      {
        name: 'Users',
        description: 'Nhóm API hồ sơ người dùng / sinh viên'
      },
      {
        name: 'System',
        description: 'Nhóm API kiểm tra trạng thái hoạt động hệ thống'
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
