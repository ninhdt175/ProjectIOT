const db = require('../config/db.config');

// Lấy lịch sử đo lường cảm biến có phân trang, tìm kiếm và lọc theo trường
const getSensorHistory = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.max(1, parseInt(req.query.limit, 10) || 7);
    const search = (req.query.search || '').trim().toLowerCase();
    const field = req.query.field || 'ALL';
    const sort = (req.query.sort || 'DESC').toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Truy vấn toàn bộ dữ liệu cảm biến kèm thông tin loại cảm biến
    const queryText = `
      SELECT ds.id, ds.sensor_id, s.sensor_code, s.sensor_name, s.sensor_type, s.unit,
             ds.temperature, ds.humidity, ds.light_lux,
             to_char(ds.created_at, 'YYYY-MM-DD HH24:MI:SS') AS time,
             ds.created_at
      FROM data_sensor ds
      JOIN sensor s ON ds.sensor_id = s.id
      ORDER BY ds.created_at ${sort};
    `;

    const { rows } = await db.query(queryText);

    // Chuyển đổi bản ghi tổng hợp thành các dòng chỉ số theo cấu trúc hiển thị bảng giao diện
    let flattenedList = [];
    rows.forEach((row) => {
      // Dòng đo Nhiệt độ
      if (row.temperature !== null && row.temperature !== undefined) {
        flattenedList.push({
          id: Number(row.id),
          sensor_id: row.sensor_id,
          sensor: row.sensor_code,
          device: 'ESP32_01',
          type: 'temperature',
          value: `${Number(row.temperature).toFixed(1)} °C`,
          rawVal: Number(row.temperature),
          time: row.time,
          created_at: row.created_at
        });
      }

      // Dòng đo Độ ẩm
      if (row.humidity !== null && row.humidity !== undefined) {
        flattenedList.push({
          id: Number(row.id),
          sensor_id: row.sensor_id,
          sensor: row.sensor_code,
          device: 'ESP32_01',
          type: 'humidity',
          value: `${Number(row.humidity).toFixed(1)} %`,
          rawVal: Number(row.humidity),
          time: row.time,
          created_at: row.created_at
        });
      }

      // Dòng đo Cường độ ánh sáng
      if (row.light_lux !== null && row.light_lux !== undefined) {
        flattenedList.push({
          id: Number(row.id),
          sensor_id: row.sensor_id,
          sensor: row.sensor_code,
          device: 'ESP32_01',
          type: 'light',
          value: `${row.light_lux} lux`,
          rawVal: Number(row.light_lux),
          time: row.time,
          created_at: row.created_at
        });
      }
    });

    // Lọc theo trường lựa chọn (field) và từ khóa tìm kiếm (search)
    let filteredList = flattenedList.filter((item) => {
      if (field === 'temperature' && item.type !== 'temperature') return false;
      if (field === 'humidity' && item.type !== 'humidity') return false;
      if (field === 'light' && item.type !== 'light') return false;

      if (!search) return true;

      if (field === 'time') {
        return Boolean(item.time && item.time.toLowerCase().includes(search));
      }

      if (field === 'temperature' || field === 'humidity' || field === 'light') {
        const valStr = item.value ? String(item.value).toLowerCase() : '';
        const rawStr = item.rawVal !== undefined ? String(item.rawVal).toLowerCase() : '';
        return Boolean(valStr.includes(search) || rawStr.includes(search));
      }

      // Tìm kiếm toàn diện (field === 'ALL')
      const typeName = item.type === 'temperature' ? 'nhiệt độ' : (item.type === 'humidity' ? 'độ ẩm' : 'ánh sáng');
      const valStr = item.value ? String(item.value).toLowerCase() : '';
      const rawStr = item.rawVal !== undefined ? String(item.rawVal).toLowerCase() : '';

      return Boolean(
        (item.time && item.time.toLowerCase().includes(search)) ||
        valStr.includes(search) ||
        rawStr.includes(search) ||
        (item.sensor && item.sensor.toLowerCase().includes(search)) ||
        (item.device && item.device.toLowerCase().includes(search)) ||
        typeName.includes(search)
      );
    });

    // Sắp xếp lại theo thời gian
    filteredList.sort((a, b) => {
      const timeA = new Date(String(a.time).replace(' ', 'T')).getTime() || 0;
      const timeB = new Date(String(b.time).replace(' ', 'T')).getTime() || 0;
      return sort === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    // Áp dụng phân trang (hỗ trợ 5, 7, 10, 20 dòng)
    const total = filteredList.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const offset = (page - 1) * limit;
    const paginatedData = filteredList.slice(offset, offset + limit);

    return res.json({
      success: true,
      total,
      page,
      limit,
      totalPages,
      data: paginatedData
    });
  } catch (error) {
    return next(error);
  }
};

// Lấy dữ liệu cảm biến mới nhất hiển thị trên 3 Thẻ Card Dashboard
const getLatestSensorData = async (req, res, next) => {
  try {
    const queryText = `
      SELECT ds.id, ds.sensor_id, s.sensor_code, s.sensor_name,
             ds.temperature, ds.humidity, ds.light_lux,
             to_char(ds.created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM data_sensor ds
      JOIN sensor s ON ds.sensor_id = s.id
      ORDER BY ds.created_at DESC
      LIMIT 1;
    `;

    const { rows } = await db.query(queryText);

    if (rows.length === 0) {
      return res.json({
        success: true,
        data: {
          temperature: 0,
          humidity: 0,
          light_lux: 0,
          sensor_code: 'DHT22_01',
          created_at: new Date().toISOString()
        }
      });
    }

    const row = rows[0];
    return res.json({
      success: true,
      data: {
        id: Number(row.id),
        sensor_id: row.sensor_id,
        sensor_code: row.sensor_code,
        temperature: Number(row.temperature),
        humidity: Number(row.humidity),
        light_lux: Number(row.light_lux),
        created_at: row.created_at
      }
    });
  } catch (error) {
    return next(error);
  }
};

// Lấy chuỗi điểm dữ liệu gần nhất phục vụ vẽ biểu đồ ban đầu
const getChartData = async (req, res, next) => {
  try {
    const points = Math.min(50, Math.max(5, parseInt(req.query.points, 10) || 12));

    const queryText = `
      SELECT id, temperature, humidity, light_lux,
             to_char(created_at, 'HH24:MI:SS') AS time_label,
             created_at
      FROM (
          SELECT id, temperature, humidity, light_lux, created_at
          FROM data_sensor
          ORDER BY created_at DESC
          LIMIT $1
      ) sub
      ORDER BY created_at ASC;
    `;

    const { rows } = await db.query(queryText, [points]);

    const labels = rows.map((r) => r.time_label);
    const temperature = rows.map((r) => (r.temperature !== null ? Number(r.temperature) : null));
    const humidity = rows.map((r) => (r.humidity !== null ? Number(r.humidity) : null));
    const light_lux = rows.map((r) => (r.light_lux !== null ? Number(r.light_lux) : null));

    return res.json({
      success: true,
      points: rows.length,
      labels,
      temperature,
      humidity,
      light_lux
    });
  } catch (error) {
    return next(error);
  }
};

// Lấy danh mục các loại cảm biến đã khai báo trong hệ thống
const getAllSensors = async (req, res, next) => {
  try {
    const queryText = `
      SELECT id, sensor_code, sensor_name, sensor_type, unit,
             to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at
      FROM sensor
      ORDER BY id ASC;
    `;

    const { rows } = await db.query(queryText);

    return res.json({
      success: true,
      data: rows.map((r) => ({
        id: r.id,
        sensor_code: r.sensor_code,
        sensor_name: r.sensor_name,
        sensor_type: r.sensor_type,
        unit: r.unit,
        created_at: r.created_at
      }))
    });
  } catch (error) {
    return next(error);
  }
};

// API ghi nhận dữ liệu cảm biến mới (Giao thức HTTP Ingestion)
const createSensorData = async (req, res, next) => {
  try {
    const { sensor_id, temperature, humidity, light_lux } = req.body;

    if (!sensor_id) {
      return res.status(400).json({
        success: false,
        message: 'sensor_id là trường bắt buộc'
      });
    }

    const queryText = `
      INSERT INTO data_sensor (sensor_id, temperature, humidity, light_lux, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING id, to_char(created_at, 'YYYY-MM-DD HH24:MI:SS') AS created_at;
    `;

    const { rows } = await db.query(queryText, [
      sensor_id,
      temperature !== undefined ? temperature : null,
      humidity !== undefined ? humidity : null,
      light_lux !== undefined ? light_lux : null
    ]);

    return res.status(201).json({
      success: true,
      message: 'Dữ liệu cảm biến đã lưu thành công vào cơ sở dữ liệu',
      data: {
        id: Number(rows[0].id),
        created_at: rows[0].created_at
      }
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getSensorHistory,
  getLatestSensorData,
  getChartData,
  getAllSensors,
  createSensorData
};
