# Hệ Thống IoT Giám Sát Môi Trường & Điều Khiển Thiết Bị Thời Gian Thực

## 1. Giới thiệu Tổng quan

Hệ thống IoT hoàn chỉnh khép kín từ phần cứng tới giao diện người dùng, bao gồm:
1. **Tầng Phần cứng (ESP32):** Vi điều khiển ESP32 đọc dữ liệu từ cảm biến nhiệt độ & độ ẩm DHT22 (GPIO 23), cảm biến quang trở LDR (GPIO 32) và điều khiển 3 đèn LED đầu ra (GPIO 18, 19, 21).
2. **Tầng Truyền thông (MQTT Broker):** Sử dụng Mosquitto Broker (port 1883) làm cầu nối truyền nhận bản tin JSON thời gian thực giữa thiết bị và máy chủ.
3. **Tầng Máy chủ (Back-End Server):** Xây dựng trên nền tảng Node.js & Express, tích hợp Socket.IO đồng bộ 2 chiều với Web, pg (PostgreSQL Pool) lưu trữ dữ liệu an toàn và Swagger UI (OpenAPI 3.0) tài liệu hóa các REST APIs.
4. **Tầng Cơ sở dữ liệu (PostgreSQL):** Cấu trúc 5 bảng chuẩn hóa theo ERD tách biệt luồng Telemetry cảm biến và luồng Actuation điều khiển.
5. **Tầng Giao diện (Front-End Web):** Giao diện hiện đại tối giản (Minimalist UI), biểu đồ Chart.js trực quan, bảng tra cứu dữ liệu phân trang động (5, 7, 10, 20 dòng) và bộ lọc trường độc lập.

---

## 2. Yêu cầu Môi trường (Prerequisites)

Trước khi khởi chạy hệ thống, đảm bảo máy tính đã cài đặt:
- **Node.js:** Phiên bản `>= 18.x` (khuyến nghị Node `v20.x` hoặc `v22.x`).
- **PostgreSQL:** Phiên bản `>= 15.x` (đang chạy cổng mặc định `5432`).
- **Mosquitto MQTT Broker:** Đang chạy cổng mặc định `1883`.
- **Arduino IDE:** (Nếu nạp code cho phần cứng thật ESP32) kèm gói thư viện `PubSubClient`, `DHT sensor library`, `ArduinoJson`.
- **Trình duyệt Web:** Chrome, Edge hoặc Firefox phiên bản mới nhất.

---

## 3. Hướng dẫn Cài đặt & Khởi chạy Chi tiết

### Bước 1: Khởi tạo Cơ sở Dữ liệu PostgreSQL (`iot_db`)

Mở terminal và thực thi các lệnh sau:

```bash
# Tạo database iot_db
psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE iot_db;"

# Tạo 5 bảng và nạp dữ liệu mẫu ban đầu
psql -U postgres -h 127.0.0.1 -d iot_db -f "backend/database/init_database.sql"
```

*(Kiểm tra danh sách bảng bằng lệnh `\dt` trong psql: thấy 5 bảng `users`, `devices`, `history`, `sensor`, `data_sensor` là thành công).*

### Bước 2: Cấu hình Biến môi trường Back-End

1. Di chuyển vào thư mục `backend/`:
   ```bash
   cd backend
   ```

2. Tạo file `.env` từ file mẫu `.env.example`:
   ```bash
   cp .env.example .env
   # Hoặc trên Windows PowerShell:
   Copy-Item .env.example .env
   ```

3. Mở file `.env` và kiểm tra/chỉnh sửa thông tin kết nối CSDL và MQTT:
   ```env
   # Cấu hình Server
   PORT=3000
   NODE_ENV=development

   # Cơ sở dữ liệu PostgreSQL
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=iot_db
   DB_USER=postgres
   DB_PASSWORD=123456   # Điền mật khẩu PostgreSQL của bạn

   # MQTT Broker (Mosquitto)
   MQTT_BROKER_URL=mqtt://127.0.0.1:1883
   MQTT_CLIENT_ID=backend_server_01

   # MQTT Topics
   MQTT_TOPIC_SENSOR_DATA=iot/sensors/data
   MQTT_TOPIC_DEVICE_CONTROL=iot/device/control
   MQTT_TOPIC_DEVICE_STATUS=iot/device/status
   ```

### Bước 3: Cài đặt Dependencies Back-End

Tại thư mục `backend/`, chạy lệnh cài đặt thư viện:

```bash
npm install
```

### Bước 4: Khởi động Mosquitto MQTT Broker

Đảm bảo dịch vụ Mosquitto đang hoạt động trên máy tính:
- **Cách 1 (Windows Services):** Mở `services.msc`, tìm dịch vụ `Mosquitto Broker` và nhấn **Start**.
- **Cách 2 (Dòng lệnh):**
  ```bash
  net start mosquitto
  # Hoặc chạy trực tiếp file thực thi:
  "C:\Program Files\mosquitto\mosquitto.exe" -v
  ```

### Bước 5: Khởi chạy Máy chủ Back-End

Tại thư mục `backend/`, chạy lệnh:

```bash
# Chế độ thông thường:
npm start

# Hoặc chế độ phát triển (nodemon tự reload khi sửa code):
npm run dev
```

### Bước 6: Truy cập Giao diện & Tài liệu API

- **Giao diện Web Dashboard:** `http://localhost:3000` hoặc `http://localhost:3000/index.html`
- **Tài liệu Swagger UI:** `http://localhost:3000/swagger-ui`
- **File đặc tả OpenAPI JSON thô:** `http://localhost:3000/swagger-ui.json` (hoặc `http://localhost:3000/api-docs.json`)

---

## 4. Cấu hình và Nạp Firmware ESP32 (Tùy chọn Phần cứng)

1. Mở file `esp32_firmware/esp32_firmware.ino` trong Arduino IDE.
2. Cập nhật thông số Wi-Fi và địa chỉ IP máy tính chạy Mosquitto Broker (`mqtt_server`):
   ```cpp
   const char* ssid = "Tên_WiFi_Của_Bạn";
   const char* password = "Mat_Khau_WiFi";
   const char* mqtt_server = "192.168.1.xxx"; // IP máy tính chạy MQTT Broker
   const int mqtt_port = 1883;
   ```
3. Chọn board `ESP32 Dev Module`, kết nối cáp USB và nhấn **Upload**.
4. Mở **Serial Monitor** (Baud rate `115200`) để theo dõi các bản tin dữ liệu cảm biến gửi lên MQTT Broker.
