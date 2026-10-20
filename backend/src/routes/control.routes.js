const express = require('express');
const router = express.Router();
const controlController = require('../controllers/control.controller');

/**
 * @openapi
 * /api/controls/history:
 *   get:
 *     summary: Lấy lịch sử thao tác điều khiển thiết bị có lọc theo 4 tiêu chí và phân trang
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
 *         description: Số lượng dòng hiển thị trên một trang
 *       - in: query
 *         name: time
 *         schema:
 *           type: string
 *         description: Từ khóa mốc thời gian cần tìm
 *       - in: query
 *         name: device
 *         schema:
 *           type: string
 *           enum: [ALL, LED_01, LED_02, LED_03]
 *           default: ALL
 *         description: Lọc theo mã thiết bị điều khiển
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *           enum: [ALL, ON, OFF]
 *           default: ALL
 *         description: Lọc theo hành động bật hoặc tắt
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ALL, success, pending, failed]
 *           default: ALL
 *         description: Lọc theo trạng thái phản hồi lệnh
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [DESC, ASC]
 *           default: DESC
 *         description: Thứ tự sắp xếp theo thời gian
 *     responses:
 *       200:
 *         description: Danh sách lịch sử điều khiển phân trang thành công
 */
router.get('/history', controlController.getControlHistory);

/**
 * @openapi
 * /api/controls/toggle:
 *   post:
 *     summary: Gửi lệnh bật/tắt thiết bị điều khiển qua HTTP REST
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
 *                 example: Bật Đèn LED 1 từ giao diện
 *     responses:
 *       200:
 *         description: Lệnh điều khiển đã tiếp nhận thành công
 *       400:
 *         description: Dữ liệu gửi lên không hợp lệ
 *       404:
 *         description: Không tìm thấy thiết bị
 */
router.post('/toggle', controlController.toggleDevice);

module.exports = router;
