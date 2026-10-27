const express = require('express');
const router = express.Router();
const controlController = require('../controllers/control.controller');

/**
 * @openapi
 * /api/controls/history:
 *   get:
 *     summary: Lấy danh sách lịch sử điều khiển thiết bị
 *     tags: [Controls & Devices]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Số thứ tự trang
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           enum: [5, 7, 10, 20]
 *           default: 7
 *         description: Số bản ghi trên một trang (5, 7, 10, 20)
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *         description: Lọc theo chuỗi ngày giờ
 *       - in: query
 *         name: device
 *         schema:
 *           type: string
 *           default: ALL
 *         description: Lọc theo mã thiết bị (ALL, LED_01, LED_02, LED_03)
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [ALL, ON, OFF]
 *           default: ALL
 *         description: Lọc theo hành động
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, success, failed, pending]
 *           default: ALL
 *         description: Lọc theo trạng thái thực thi
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [DESC, ASC]
 *           default: DESC
 *         description: Thứ tự sắp xếp theo mốc thời gian
 *     responses:
 *       200:
 *         description: Danh sách lịch sử điều khiển phân trang thành công
 */
router.get('/history', controlController.getControlHistory);

/**
 * @openapi
 * /api/controls/toggle:
 *   post:
 *     summary: Tiếp nhận lệnh điều khiển Bật hoặc Tắt thiết bị
 *     tags: [Controls & Devices]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - device_id
 *               - action
 *             properties:
 *               device_id:
 *                 type: string
 *                 example: LED_01
 *               action:
 *                 type: string
 *                 enum: [ON, OFF]
 *                 example: ON
 *               user_id:
 *                 type: integer
 *                 example: 1
 *               message:
 *                 type: string
 *                 example: Yêu cầu bật Đèn LED 1
 *     responses:
 *       200:
 *         description: Lệnh điều khiển đã được tiếp nhận và phát tới thiết bị qua MQTT
 *       400:
 *         description: Tham số không hợp lệ
 *       404:
 *         description: Không tìm thấy thiết bị
 */
router.post('/toggle', controlController.toggleDevice);

module.exports = router;
