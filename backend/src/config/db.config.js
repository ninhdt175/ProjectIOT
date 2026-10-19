const { Pool } = require('pg');
require('dotenv').config();

// Khởi tạo connection pool tới cơ sở dữ liệu PostgreSQL (iot_db)
const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'iot_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  max: 20, // Số kết nối tối đa trong pool
  idleTimeoutMillis: 30000, // Thời gian giải phóng kết nối không hoạt động (30s)
  connectionTimeoutMillis: 5000 // Hết thời gian chờ kết nối (5s)
});

// Lắng nghe sự kiện lỗi kết nối bất ngờ từ pool
pool.on('error', (err) => {
  console.error('Lỗi kết nối PostgreSQL Pool bất ngờ:', err.message);
});

// Hàm kiểm tra trạng thái kết nối tới cơ sở dữ liệu
const testDbConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() AS current_time, current_database() AS db_name;');
    client.release();
    console.log(`[Database] Kết nối PostgreSQL thành công! DB: ${result.rows[0].db_name} | Giờ: ${result.rows[0].current_time}`);
    return true;
  } catch (error) {
    console.error('[Database] Kết nối PostgreSQL thất bại:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  testDbConnection
};
