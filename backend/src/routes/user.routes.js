const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');

/**
 * @openapi
 * /api/users/profile:
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

/**
 * @openapi
 * /api/users/login:
 *   post:
 *     summary: Đăng nhập và xác thực tài khoản người dùng
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: B23DCCN633
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Đăng nhập thành công, trả về JWT Token và thông tin người dùng
 *       400:
 *         description: Thiếu thông tin đăng nhập
 *       401:
 *         description: Sai thông tin đăng nhập
 */
router.post('/login', userController.loginUser);

module.exports = router;
