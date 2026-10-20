const express = require('express');
const router = express.Router();

const sensorRoutes = require('./sensor.routes');
const controlRoutes = require('./control.routes');
const deviceRoutes = require('./device.routes');
const userRoutes = require('./user.routes');
const userController = require('../controllers/user.controller');

// Đăng ký các nhóm route API
router.use('/sensors', sensorRoutes);
router.use('/controls', controlRoutes);
router.use('/devices', deviceRoutes);
router.use('/users', userRoutes);

// Route tắt cho hồ sơ sinh viên (/api/profile)
router.get('/profile', userController.getUserProfile);

module.exports = router;
