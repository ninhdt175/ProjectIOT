const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

/**
 * @openapi
 * /api/users/profile:
 *   get:
 *     summary: Lấy thông tin hồ sơ người dùng / sinh viên thực hiện đề tài
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
 *                     group:
 *                       type: string
 *                       example: Nhóm 10 - Môn IoT và Ứng dụng
 *                     supervisor:
 *                       type: string
 *                       example: Nguyễn Quốc Uy
 * /api/profile:
 *   get:
 *     summary: Lấy thông tin hồ sơ sinh viên (Route tắt trực tiếp)
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
 *                     group:
 *                       type: string
 *                       example: Nhóm 10 - Môn IoT và Ứng dụng
 *                     supervisor:
 *                       type: string
 *                       example: Nguyễn Quốc Uy
 */
router.get('/profile', userController.getUserProfile);

module.exports = router;
