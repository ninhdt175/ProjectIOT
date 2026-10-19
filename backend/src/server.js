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
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

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

// Cấu hình Swagger API Docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'IoT System API Documentation',
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

// API kiểm tra tình trạng ban đầu của Server (Phase 1 sanity check)
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

// Socket.IO kết nối realtime cơ bản
io.on('connection', (socket) => {
  console.log(`[Socket.IO] Client đã kết nối: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.IO] Client đã ngắt kết nối: ${socket.id}`);
  });
});

// Xử lý route không tồn tại (chỉ áp dụng cho các route /api/...)
app.use('/api/*', notFoundHandler);

// Middleware xử lý lỗi tập trung
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Khởi động Server sau khi kiểm tra CSDL
const startServer = async () => {
  console.log('====================================================');
  console.log('  ĐANG KHỞI ĐỘNG HỆ THỐNG IOT BACKEND (GIAI ĐOẠN 1)  ');
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
