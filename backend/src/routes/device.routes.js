const express = require('express');
const router = express.Router();
const deviceController = require('../controllers/device.controller');

/**
 * @openapi
 * /api/devices:
 *   get:
 *     summary: Lấy danh sách toàn bộ thiết bị và trạng thái kết nối
 *     tags: [Controls & Devices]
 *     responses:
 *       200:
 *         description: Danh sách thiết bị (LED_01, LED_02, LED_03)
 */
router.get('/', deviceController.getAllDevices);
router.get('/:id', deviceController.getDeviceById);

module.exports = router;
