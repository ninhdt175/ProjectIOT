// Middleware xử lý và chuẩn hóa lỗi cho toàn bộ API hệ thống
const errorHandler = (err, req, res, next) => {
  console.error(`[Error] ${req.method} ${req.originalUrl} - ${err.message}`);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Đã có lỗi xảy ra trên máy chủ';

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

// Middleware bắt lỗi 404 cho các route không tồn tại
const notFoundHandler = (req, res, next) => {
  res.status(404).json({
    success: false,
    statusCode: 404,
    message: `Đường dẫn API ${req.method} ${req.originalUrl} không tồn tại`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
