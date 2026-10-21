const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { Server } = require('socket.io');
require('dotenv').config();

const { testDbConnection } = require('./config/db.config');
const swaggerSpec = require('./config/swagger.config');
const apiRoutes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');
const { initMQTTService } = require('./services/mqtt.service');
const { initSocketService } = require('./services/socket.service');

const app = express();
const server = http.createServer(app);

// Cấu hình Socket.IO với CORS linh hoạt
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware cơ bản
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Cấu hình Swagger API Docs tại /api-docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Tài liệu IoT System API - Swagger UI',
  customCss: '.swagger-ui .topbar { display: none }'
}));

// Endpoint xuất file cấu hình raw JSON của Swagger (dùng cho Postman / CI)
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

// Phục vụ giao diện tĩnh Front-End từ thư mục frontend/
const frontendPath = path.join(__dirname, '../../frontend');
app.use(express.static(frontendPath));

// API kiểm tra tình trạng ban đầu của Server
/**
 * @openapi
 * /api/status:
 *   get:
 *     summary: Kiểm tra tình trạng hoạt động của Server Back-End
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Server hoạt động bình thường
 */
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    message: 'Máy chủ IoT Back-End đang hoạt động ổn định',
    timestamp: new Date().toISOString(),
    author: 'Đỗ Trọng Ninh - B23DCCN633 - Nhóm 10'
  });
});

// Đăng ký toàn bộ các route API tại tiền tố /api
app.use('/api', apiRoutes);

// Khởi tạo dịch vụ MQTT và Socket.IO thời gian thực
initMQTTService(io);
initSocketService(io);

// Xử lý route không tồn tại (áp dụng cho các route /api/...)
app.use('/api/*', notFoundHandler);

// Middleware xử lý lỗi tập trung
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Khởi động Server sau khi kiểm tra CSDL
const startServer = async () => {
  console.log('====================================================');
  console.log('       HỆ THỐNG IOT BACKEND SERVER - GIAI ĐOẠN 3     ');
  console.log('    (TÍCH HỢP MQTT MOSQUITTO & SOCKET.IO REALTIME)  ');
  console.log('====================================================');

  await testDbConnection();

  server.listen(PORT, () => {
    console.log(`[Server] HTTP & WebSocket đang lắng nghe tại port: ${PORT}`);
    console.log(`[Swagger] Xem tài liệu API tại: http://localhost:${PORT}/api-docs`);
    console.log(`[Web App] Mở giao diện Dashboard tại: http://localhost:${PORT}/index.html`);
    console.log('====================================================');
  });
};

// Nếu file được gọi trực tiếp bằng Node.js thì khởi chạy server
if (require.main === module) {
  startServer();
}

module.exports = { app, server, io };
