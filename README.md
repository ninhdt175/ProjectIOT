# Hệ Thống IoT Giám Sát Môi Trường & Điều Khiển Thiết Bị Thời Gian Thực

> **Học phần:** Thực hành Hệ thống IoT & Ứng dụng  
> **Sinh viên thực hiện:** Đỗ Trọng Ninh - **MSV:** B23DCCN633 - **Lớp:** D23CQCN01-B - **Nhóm:** 10  
> **Giảng viên hướng dẫn:** TS. Nguyễn Quốc Uy  

---

## 📌 Giới thiệu Tổng quan

Hệ thống IoT hoàn chỉnh khép kín từ phần cứng tới giao diện người dùng, bao gồm:
1. **Tầng Phần cứng (ESP32):** Vi điều khiển ESP32 đọc dữ liệu từ cảm biến nhiệt độ & độ ẩm **DHT22** (GPIO 23), cảm biến quang trở **LDR** (GPIO 32) và điều khiển **3 đèn LED** đầu ra (GPIO 18, 19, 21).
2. **Tầng Truyền thông (MQTT Broker):** Sử dụng **Mosquitto Broker** (port 1883) làm cầu nối truyền nhận bản tin JSON thời gian thực giữa thiết bị và máy chủ.
3. **Tầng Máy chủ (Back-End Server):** Xây dựng trên nền tảng **Node.js & Express**, tích hợp **Socket.IO** đồng bộ 2 chiều với Web, **pg (PostgreSQL Pool)** lưu trữ dữ liệu an toàn và **Swagger UI (OpenAPI 3.0)** tài liệu hóa 10 REST APIs.
4. **Tầng Cơ sở dữ liệu (PostgreSQL):** Cấu trúc 5 bảng chuẩn hóa theo ERD tách biệt luồng Telemetry cảm biến và luồng Actuation điều khiển.
5. **Tầng Giao diện (Front-End Web):** Giao diện hiện đại tối giản (Minimalist UI), biểu đồ Chart.js trực quan, bảng tra cứu dữ liệu phân trang động (5, 7, 10, 20 dòng) và bộ lọc trường độc lập.

---

## 📂 Cấu trúc Thư mục Dự án

```text
projectIOT/
├── backend/                           # Mã nguồn Back-End (Node.js + Express)
│   ├── .env.example                   # Mẫu cấu hình biến môi trường
│   ├── package.json                   # Danh mục thư viện và scripts khởi chạy
│   ├── database/
│   │   └── init_database.sql          # Kịch bản tạo 5 bảng CSDL và dữ liệu mẫu
│   ├── postman/                       # Thư mục chứa kịch bản kiểm thử Postman
│   └── src/
│       ├── config/
│       │   ├── db.config.js           # Kết nối PostgreSQL Connection Pool (pg.Pool)
│       │   ├── mqtt.config.js         # Kết nối Mosquitto MQTT Broker
│       │   └── swagger.config.js      # Cấu hình OpenAPI 3.0 & Swagger UI
│       ├── controllers/
│       │   ├── sensor.controller.js   # Xử lý dữ liệu cảm biến (lọc, phân trang, chart)
│       │   ├── control.controller.js  # Xử lý lịch sử điều khiển & lệnh toggle
│       │   ├── device.controller.js   # Xử lý danh sách và trạng thái thiết bị LED
│       │   └── user.controller.js     # Xử lý thông tin hồ sơ sinh viên
│       ├── middlewares/
│       │   └── error.middleware.js    # Bắt lỗi tập trung chuẩn format và 404
│       ├── routes/
│       │   ├── sensor.routes.js       # Endpoints /api/sensors/... (kèm Swagger JSDoc)
│       │   ├── control.routes.js      # Endpoints /api/controls/... (kèm Swagger JSDoc)
│       │   ├── device.routes.js       # Endpoints /api/devices/... (kèm Swagger JSDoc)
│       │   ├── user.routes.js         # Endpoints /api/users/... (kèm Swagger JSDoc)
│       │   └── index.js               # Router tổng hợp toàn bộ API
│       └── server.js                  # Điểm khởi chạy HTTP, WebSocket & Swagger UI
├── frontend/                          # Giao diện Front-End Web Application
│   ├── index.html                     # Trang chính giao diện Single-Page (SPA)
│   ├── css/
│   │   ├── style.css                  # Bố cục giao diện, bảng màu, typography chuẩn
│   │   └── components.css             # Định kiểu Card chỉ số, Switch, Bảng, Phân trang
│   └── src/
│       ├── config/app.config.js       # Cấu hình thiết bị và dữ liệu mẫu
│       ├── api/http.service.js        # Giao tiếp HTTP REST với Back-End
│       ├── services/socket.service.js # Giao tiếp WebSocket thời gian thực
│       └── pages/                     # Bộ điều khiển từng trang (dashboard, sensors, history, profile)
├── esp32_firmware/
│   └── esp32_firmware.ino             # Mã nguồn nhúng ESP32 (Arduino IDE C/C++)
├── init_database.sql                  # File SQL khởi tạo CSDL PostgreSQL gốc
└── README.md                          # Tài liệu hướng dẫn cài đặt và vận hành hệ thống
```

---

## 🛠️ Yêu cầu Môi trường (Prerequisites)

Trước khi khởi chạy hệ thống, đảm bảo máy tính của bạn đã cài đặt:
1. **Node.js:** Phiên bản `>= 18.x` (khuyến nghị Node `v20.x` hoặc `v22.x`).
2. **PostgreSQL:** Phiên bản `15.x`, `16.x` hoặc `17.x` (đang chạy dịch vụ cổng `5432`).
3. **Mosquitto MQTT Broker:** Đang chạy tại cổng mặc định `1883`.
4. **Arduino IDE:** (Nếu nạp code cho phần cứng thật ESP32) kèm gói thư viện `PubSubClient`, `DHT sensor library`, `ArduinoJson`.
5. **Trình duyệt Web:** Chrome, Edge hoặc Firefox phiên bản mới nhất.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy Chi tiết

### Bước 1: Khởi tạo Cơ sở Dữ liệu PostgreSQL (`iot_db`)

1. Mở **PowerShell** hoặc **Command Prompt**, đăng nhập vào PostgreSQL bằng tài khoản `postgres`:
   ```powershell
   # Tạo database mới iot_db
   psql -U postgres -h 127.0.0.1 -c "CREATE DATABASE iot_db;"
   ```
2. Thực thi file kịch bản SQL để tạo 5 bảng và nạp dữ liệu mẫu ban đầu:
   ```powershell
   psql -U postgres -h 127.0.0.1 -d iot_db -f "backend/database/init_database.sql"
   ```
   *(Kiểm tra danh sách bảng bằng lệnh `\dt` trong psql: thấy 5 bảng `users`, `devices`, `history`, `sensor`, `data_sensor` là thành công).*

---

### Bước 2: Cấu hình Biến môi trường Back-End

1. Truy cập vào thư mục `backend/`:
   ```powershell
   cd backend
   ```
2. Tạo file `.env` từ mẫu `.env.example`:
   ```powershell
   Copy-Item .env.example .env
   ```
3. Mở file `.env` và kiểm tra/chỉnh sửa thông tin kết nối CSDL và MQTT:
   ```env
   # CẤU HÌNH SERVER
   PORT=3000
   NODE_ENV=development

   # CƠ SỞ DỮ LIỆU POSTGRESQL
   DB_HOST=127.0.0.1
   DB_PORT=5432
   DB_NAME=iot_db
   DB_USER=postgres
   DB_PASSWORD=123456   # <-- Điền mật khẩu PostgreSQL của bạn

   # MQTT BROKER (Mosquitto)
   MQTT_BROKER_URL=mqtt://127.0.0.1:1883
   MQTT_CLIENT_ID=backend_server_01

   # TOPICS MQTT
   MQTT_TOPIC_SENSOR_DATA=iot/sensors/data
   MQTT_TOPIC_DEVICE_CONTROL=iot/device/control
   MQTT_TOPIC_DEVICE_STATUS=iot/device/status
   ```

---

### Bước 3: Cài đặt Dependencies Back-End

Trong thư mục `backend/`, chạy lệnh cài đặt toàn bộ gói thư viện:
```powershell
npm install
```

---

### Bước 4: Khởi động Mosquitto MQTT Broker

Đảm bảo dịch vụ Mosquitto đang hoạt động trên máy tính của bạn:
* **Cách 1 (Qua dịch vụ Windows Services):** Mở `services.msc`, tìm dịch vụ `Mosquitto Broker` và nhấn **Start**.
* **Cách 2 (Qua dòng lệnh):**
  ```powershell
  net start mosquitto
  # hoặc chạy trực tiếp file mosquitto.exe
  "C:\Program Files\mosquitto\mosquitto.exe" -v
  ```

---

### Bước 5: Khởi chạy Back-End Server

Tại thư mục `backend/`, chạy lệnh sau để khởi động máy chủ:
```powershell
# Chế độ thông thường:
npm start

# Hoặc chế độ phát triển (tự động reload khi sửa code với nodemon):
npm run dev
```

Khi màn hình xuất hiện thông báo sau là hệ thống đã sẵn sàng:
```text
====================================================
       HỆ THỐNG IOT BACKEND SERVER - GIAI ĐOẠN 2     
====================================================
[Database] Kết nối PostgreSQL thành công! DB: iot_db | Giờ: ...
[Server] HTTP & WebSocket đang lắng nghe tại port: 3000
[Swagger UI] Xem tài liệu API tại: http://localhost:3000/swagger-ui
[Web App] Mở giao diện Dashboard tại: http://localhost:3000/index.html
====================================================
```

---

### Bước 6: Truy cập Giao diện & Tài liệu API

* 🌐 **Giao diện Web Dashboard:** Mở trình duyệt và truy cập:  
  👉 **`http://localhost:3000`** hoặc **`http://localhost:3000/index.html`**
* 📖 **Tài liệu Tương tác Swagger UI (OpenAPI 3.0):**  
  👉 **`http://localhost:3000/swagger-ui`**  
  *(Bạn có thể nhấn vào nút **"Try it out"** của từng API để gửi request và xem kết quả trả về trực tiếp).*
* 📄 **File đặc tả OpenAPI JSON thô:**  
  👉 **`http://localhost:3000/swagger-ui.json`** (hoặc `http://localhost:3000/api-docs.json`)

---

### Bước 7: Cấu hình và Nạp Firmware cho ESP32 *(Tùy chọn Phần cứng)*

1. Mở file [`esp32_firmware/esp32_firmware.ino`](esp32_firmware/esp32_firmware.ino) trong **Arduino IDE**.
2. Cập nhật thông số Wi-Fi và địa chỉ IP máy tính chạy Mosquitto:
   ```cpp
   const char* ssid = "Tên_WiFi_Của_Bạn";
   const char* password = "Mat_Khau_WiFi";
   const char* mqtt_server = "192.168.1.xxx"; // IP máy tính chạy MQTT Broker
   const int mqtt_port = 1883;
   ```
3. Chọn Board `ESP32 Dev Module`, cắm cáp Micro-USB và nhấn **Upload**.
4. Mở **Serial Monitor** (Baud rate `115200`) để theo dõi các bản tin đo cảm biến được phát lên MQTT Broker.

---

## 📑 Danh mục 10 REST APIs Đã Triển khai

| STT | Phương thức | Đường dẫn Endpoint | Phân hệ | Chức năng chính |
| :---: | :---: | :--- | :---: | :--- |
| **1** | `GET` | `/api/sensors/history` | Sensors | Lấy lịch sử cảm biến có phân trang (5, 7, 10, 20) & lọc trường (`ALL`, `time`, `temperature`, `humidity`, `light`) |
| **2** | `GET` | `/api/sensors/latest` | Sensors | Lấy chỉ số mới nhất hiển thị trên 3 Thẻ Card Dashboard |
| **3** | `GET` | `/api/sensors/chart-data` | Sensors | Lấy 12 mốc dữ liệu gần nhất phục vụ vẽ biểu đồ Chart.js |
| **4** | `GET` | `/api/sensors` | Sensors | Danh mục các cảm biến trong hệ thống (`DHT22_01`, `LDR_01`) |
| **5** | `POST` | `/api/sensors/data` | Sensors | API ghi nhận dữ liệu cảm biến mới qua giao thức HTTP |
| **6** | `GET` | `/api/controls/history` | Controls | Lấy lịch sử điều khiển bật/tắt (lọc 4 tiêu chí: time, device, action, status) |
| **7** | `POST` | `/api/controls/toggle` | Controls | Gửi lệnh bật/tắt thiết bị (ghi `pending` vào CSDL) |
| **8** | `GET` | `/api/devices` | Devices | Lấy danh sách 3 đèn LED (`LED_01`, `LED_02`, `LED_03`) và trạng thái |
| **9** | `GET` | `/api/devices/:id` | Devices | Tra cứu chi tiết trạng thái của 1 thiết bị cụ thể |
| **10** | `GET` | `/api/users/profile` | Users | Lấy thông tin hồ sơ sinh viên thực hiện đề tài |

---

## 🧪 Kiểm thử Tự động với Postman / CLI

Hệ thống hỗ trợ kiểm thử tự động toàn diện:
1. **Kiểm thử trực tiếp trên Swagger UI:** Truy cập `http://localhost:3000/swagger-ui`, chọn API bất kỳ và bấm **Execute**.
2. **Kiểm thử nhanh bằng lệnh Node.js:**
   ```powershell
   cd backend
   node -e "require('./src/config/db.config').testDbConnection().then(() => process.exit(0));"
   ```
3. **Import vào Postman:**
   - Mở Postman, chọn **Import** &rarr; Dán link `http://localhost:3000/swagger-ui.json` (hoặc `http://localhost:3000/api-docs.json`).
   - Postman sẽ tự động sinh toàn bộ danh mục 10 APIs với đầy đủ URL, headers và body mẫu để kiểm thử.

---

## 👨‍💻 Thông tin Tác giả & Bản quyền

* **Họ và tên:** Đỗ Trọng Ninh
* **Mã sinh viên:** B23DCCN633
* **Lớp:** D23CQCN01-B - Khóa 2023 - 2028
* **Khoa:** Công nghệ Thông tin 1 - Học viện Công nghệ Bưu chính Viễn thông (PTIT)
* **Email:** [dtn17505@gmail.com](mailto:dtn17505@gmail.com)
* **GitHub Repository:** [https://github.com/ninhdt175/projectIOT](https://github.com/ninhdt175/projectIOT)
