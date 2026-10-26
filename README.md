# Hướng Dẫn Cài Đặt & Khởi Chạy Hệ Thống IoT

## 1. Yêu cầu Môi trường (Prerequisites)
- **Node.js**: Phiên bản `>= 18.x`
- **PostgreSQL**: Phiên bản `>= 15.x` (đang chạy cổng mặc định `5432`)
- **Mosquitto MQTT Broker**: Đang chạy cổng mặc định `1883`

---

## 2. Các Bước Cài Đặt & Khởi Chạy

### Bước 1: Khởi tạo Cơ sở Dữ liệu PostgreSQL
Mở terminal và thực thi lệnh:
```bash
# Tạo cơ sở dữ liệu iot_db
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE iot_db;"

# Tạo bảng và nạp dữ liệu mẫu
psql -U postgres -h 127.0.0.1 -d iot_db -f "backend/database/init_database.sql"
```

### Bước 2: Cấu hình Biến môi trường Back-End
1. Di chuyển vào thư mục `backend`:
   ```bash
   cd backend
   ```
2. Tạo file `.env` từ mẫu `.env.example`:
   ```bash
   cp .env.example .env
   ```
   *(Trên Windows PowerShell: `Copy-Item .env.example .env`)*
3. Chỉnh sửa thông số trong `.env` phù hợp với máy của bạn (đặc biệt là mật khẩu PostgreSQL `DB_PASSWORD`):
   ```env
   PORT=3000
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=iot_db
   DB_USER=postgres
   DB_PASSWORD=your_password
   MQTT_BROKER_URL=mqtt://127.0.0.1:1883
   ```

### Bước 3: Cài đặt Dependencies
Tại thư mục `backend`, chạy:
```bash
npm install
```

### Bước 4: Khởi động Mosquitto MQTT Broker
Đảm bảo Mosquitto đang chạy:
```bash
net start mosquitto
# hoặc chạy trực tiếp file mosquitto: "C:\Program Files\mosquitto\mosquitto.exe" -v
```

### Bước 5: Khởi chạy Máy chủ Back-End
Tại thư mục `backend`:
```bash
npm start
# hoặc chế độ dev (nodemon tự reload): npm run dev
```

### Bước 6: Truy cập Hệ thống
- **Giao diện Web Dashboard**: `http://localhost:3000`
- **Tài liệu Swagger UI**: `http://localhost:3000/swagger-ui`

---

## 3. Nạp Firmware ESP32 (Tùy chọn Phần cứng)
1. Mở file `esp32_firmware/esp32_firmware.ino` trong Arduino IDE.
2. Cập nhật thông số Wi-Fi và IP máy tính chạy Mosquitto Broker (`mqtt_server`).
3. Chọn board `ESP32 Dev Module` và nạp chương trình.
