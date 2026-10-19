-- ==========================================================
-- CƠ SỞ DỮ LIỆU POSTGRESQL CHO DỰ ÁN IOT
-- Cấu trúc 5 bảng chuẩn hóa: Tách riêng Điều khiển và Cảm biến
-- Bảng devices chỉ dùng cho thiết bị bật/tắt (không nối với data_sensor/sensor)
-- ==========================================================

DROP TABLE IF EXISTS history CASCADE;
DROP TABLE IF EXISTS data_sensor CASCADE;
DROP TABLE IF EXISTS sensor CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. Bảng Người dùng
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Bảng Thiết bị điều khiển (Đèn LED 1, 2, 3)
CREATE TABLE devices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    device_type VARCHAR(50) NOT NULL,
    is_online BOOLEAN DEFAULT TRUE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng Lịch sử điều khiển
CREATE TABLE history (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER,
    device_id VARCHAR(50) NOT NULL,
    action VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'success',
    message VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_history_device FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE
);

CREATE INDEX idx_history_created_at ON history(created_at DESC);
CREATE INDEX idx_history_device_time ON history(device_id, created_at DESC);

-- 4. Bảng Cảm biến (Độc lập, không khóa ngoại tới devices)
CREATE TABLE sensor (
    id SERIAL PRIMARY KEY,
    sensor_code VARCHAR(50) NOT NULL,
    sensor_name VARCHAR(100) NOT NULL,
    sensor_type VARCHAR(50) NOT NULL,
    unit VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bảng Dữ liệu đo lường cảm biến
CREATE TABLE data_sensor (
    id BIGSERIAL PRIMARY KEY,
    sensor_id INTEGER NOT NULL,
    temperature NUMERIC(5, 2),
    humidity NUMERIC(5, 2),
    light_lux INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_data_sensor_sensor FOREIGN KEY (sensor_id) REFERENCES sensor(id) ON DELETE CASCADE
);

CREATE INDEX idx_data_sensor_created_at ON data_sensor(created_at DESC);
CREATE INDEX idx_data_sensor_sensor_time ON data_sensor(sensor_id, created_at DESC);

-- ==========================================================
-- CHÈN DỮ LIỆU MẪU BAN ĐẦU
-- ==========================================================

INSERT INTO users (username, password_hash, full_name) VALUES
('B23DCCN633', '$2b$10$samplehashfor123456', 'Đỗ Trọng Ninh'),
('admin', '$2b$10$samplehashforadmin123', 'Quản trị viên');

-- 3 thiết bị bật tắt (Đèn LED 1, 2, 3)
INSERT INTO devices (id, name, device_type, is_online) VALUES
('LED_01', 'Đèn LED 1 (GPIO 18)', 'LED_ACTUATOR', TRUE),
('LED_02', 'Đèn LED 2 (GPIO 19)', 'LED_ACTUATOR', TRUE),
('LED_03', 'Đèn LED 3 (GPIO 21)', 'LED_ACTUATOR', TRUE);

-- Cảm biến đo lường
INSERT INTO sensor (sensor_code, sensor_name, sensor_type, unit) VALUES
('DHT22_01', 'Cảm biến Nhiệt độ & Độ ẩm', 'dht22', '°C / %'),
('LDR_01', 'Cảm biến Cường độ Ánh sáng', 'ldr', 'lux');

-- Dữ liệu đo mẫu
INSERT INTO data_sensor (sensor_id, temperature, humidity, light_lux, created_at) VALUES
(1, 29.50, 75.00, 1650, CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(1, 30.00, 74.00, 1750, CURRENT_TIMESTAMP - INTERVAL '5 minutes');

-- Nhật ký điều khiển mẫu
INSERT INTO history (user_id, device_id, action, status, message, created_at) VALUES
(1, 'LED_01', 'ON', 'success', 'Bật Đèn LED 1', CURRENT_TIMESTAMP - INTERVAL '15 minutes'),
(1, 'LED_02', 'OFF', 'success', 'Tắt Đèn LED 2', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
(1, 'LED_03', 'ON', 'success', 'Bật Đèn LED 3', CURRENT_TIMESTAMP - INTERVAL '5 minutes');
