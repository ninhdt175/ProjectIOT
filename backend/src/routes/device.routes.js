const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');

/**
 * @openapi
 * /api/devices:
 *   get:
 *     summary: Lấy danh sách toàn bộ thiết bị điều khiển và trạng thái kết nối
 *     tags: [Controls & Devices]
 *     responses:
 *       200:
 *         description: Danh sách thiết bị (LED 1, LED 2, LED 3)
 */
router.get('/', deviceController.getAllDevices);

/**
 * @openapi
 * /api/devices/{id}:
 *   get:
 *     summary: Tra cứu chi tiết trạng thái và thông tin của một thiết bị theo ID
 *     tags: [Controls & Devices]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Mã thiết bị (ví dụ LED_01, LED_02, LED_03)
 *     responses:
 *       200:
 *         description: Thông tin chi tiết thiết bị
 *       404:
 *         description: Không tìm thấy thiết bị
 */
router.get('/:id', deviceController.getDeviceById);

module.exports = router;
