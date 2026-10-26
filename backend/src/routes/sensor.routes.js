const express = require('express');
const router = express.Router();
const sensorController = require('../controllers/sensor.controller');

/**
 * @openapi
 * /api/sensors/history:
 *   get:
 *     summary: Lấy lịch sử đo lường cảm biến có phân trang và lọc theo trường
 *     tags: [Sensors]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số thứ tự trang cần lấy
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           enum: [5, 7, 10, 20]
 *           default: 7
 *         description: Số lượng bản ghi trên một trang (5, 7, 10 hoặc 20)
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm giá trị hoặc thời gian
 *       - in: query
 *         name: field
 *         schema:
 *           type: string
 *           enum: [ALL, time, temperature, humidity, light]
 *           default: ALL
 *         description: Trường cụ thể cần áp dụng tìm kiếm
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [DESC, ASC]
 *           default: DESC
 *         description: Thứ tự sắp xếp theo mốc thời gian
 *     responses:
 *       200:
 *         description: Danh sách dữ liệu cảm biến phân trang thành công
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 total:
 *                   type: integer
 *                   example: 45
 *                 page:
 *                   type: integer
 *                   example: 1
 *                 limit:
 *                   type: integer
 *                   example: 7
 *                 totalPages:
 *                   type: integer
 *                   example: 7
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       sensor:
 *                         type: string
 *                         example: DHT22_01
 *                       device:
 *                         type: string
 *                         example: ESP32_01
 *                       type:
 *                         type: string
 *                         example: temperature
 *                       value:
 *                         type: string
 *                         example: "30.0 °C"
 *                       rawVal:
 *                         type: number
 *                         example: 30.0
 *                       time:
 *                         type: string
 *                         example: "2026-08-24 13:45:33"
 */
router.get('/history', sensorController.getSensorHistory);

/**
 * @openapi
 * /api/sensors/latest:
 *   get:
 *     summary: Lấy số liệu cảm biến mới nhất hiển thị trên 3 Thẻ Card Dashboard
 *     tags: [Sensors]
 *     responses:
 *       200:
 *         description: Số liệu đo mới nhất từ trạm quan trắc
 */
router.get('/latest', sensorController.getLatestSensorData);

/**
 * @openapi
 * /api/sensors/chart-data:
 *   get:
 *     summary: Lấy chuỗi điểm dữ liệu gần nhất phục vụ vẽ biểu đồ đường Chart.js
 *     tags: [Sensors]
 *     parameters:
 *       - in: query
 *         name: points
 *         schema:
 *           type: integer
 *           default: 12
 *         description: Số mốc thời gian gần nhất cần lấy
 *     responses:
 *       200:
 *         description: Tập dữ liệu tọa độ mốc thời gian và giá trị đo
 */
router.get('/chart-data', sensorController.getChartData);
router.get('/chart', sensorController.getChartData);

/**
 * @openapi
 * /api/sensors:
 *   get:
 *     summary: Lấy danh mục toàn bộ cảm biến đã khai báo trong hệ thống
 *     tags: [Sensors]
 *     responses:
 *       200:
 *         description: Danh sách các cảm biến được quản lý
 */
router.get('/', sensorController.getAllSensors);

/**
 * @openapi
 * /api/sensors/data:
 *   post:
 *     summary: Gửi bản ghi đo cảm biến mới vào cơ sở dữ liệu qua HTTP
 *     tags: [Sensors]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sensor_id
 *             properties:
 *               sensor_id:
 *                 type: integer
 *                 example: 1
 *               temperature:
 *                 type: number
 *                 example: 30.5
 *               humidity:
 *                 type: number
 *                 example: 72.8
 *               light_lux:
 *                 type: integer
 *                 example: 1650
 *     responses:
 *       201:
 *         description: Dữ liệu cảm biến đã được lưu trữ thành công
 *       400:
 *         description: Thiếu thông tin bắt buộc
 */
router.post('/data', sensorController.createSensorData);

module.exports = router;
