const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

/**
 * @openapi
 * /api/profile:
 *   get:
 *     summary: Lấy thông tin hồ sơ sinh viên
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: Thông tin hồ sơ sinh viên
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: B23DCCN633
 *                     full_name:
 *                       type: string
 *                       example: Đỗ Trọng Ninh
 *                     student_id:
 *                       type: string
 *                       example: B23DCCN633
 *                     major:
 *                       type: string
 *                       example: Công nghệ Thông tin
 *                     class:
 *                       type: string
 *                       example: D23CQCN01-B
 *                     group:
 *                       type: string
 *                       example: Nhóm 10 - Môn IoT và Ứng dụng
 *                     supervisor:
 *                       type: string
 *                       example: TS. Nguyễn Quốc Uy
 */
router.get('/profile', userController.getUserProfile);

module.exports = router;
