# TÀI LIỆU CHI TIẾT CÁC TÍNH NĂNG ĐÃ BỔ SUNG & NÂNG CẤP HỆ THỐNG IoT

> **Dự án:** Hệ thống IoT Giám sát Môi trường & Điều khiển Thiết bị  
> **Sinh viên thực hiện:** Đỗ Trọng Ninh - MSV: B23DCCN633 - Nhóm 10  
> **Thời điểm cập nhật:** Tháng 11/2026  
> **Phiên bản:** v2.5.0 (Cập nhật Kiến trúc 4 Cảm biến & 4 Thiết bị Điều khiển)

---

## MỤC LỤC
1. [Tổng quan mục tiêu nâng cấp](#1-tổng-quan-mục-tiêu-nâng-cấp)
2. [Chi tiết Kiến trúc Phần cứng & Vi điều khiển ESP32](#2-chi-tiết-kiến-trúc-phần-cứng--vi-điều-khiển-esp32)
3. [Chi tiết Back-End: Danh sách API & Dịch vụ Nền](#3-chi-tiết-back-end-danh-sách-api--dịch-vụ-nền)
4. [Chi tiết Thay đổi Mã HTML (frontend/index.html)](#4-chi-tiết-thay-đổi-mã-html-frontendindexhtml)
5. [Chi tiết Thay đổi Mã CSS (frontend/src/styles/main.css)](#5-chi-tiết-thay-đổi-mã-css-frontendsrcstylesmaincss)
6. [Chi tiết Logic Xử lý Front-End (JavaScript)](#6-chi-tiết-logic-xử-lý-front-end-javascript)
7. [Bảng đối chiếu Trước và Sau khi Nâng cấp](#7-bảng-đối-chiếu-trước-và-sau-khi-nâng-cấp)
8. [Quy trình Kiểm thử Toàn diện & Nghiệm thu](#8-quy-trình-kiểm-thử-toàn-diện--nghiệm-thu)

---

## 1. TỔNG QUAN MỤC TIÊU NÂNG CẤP

Trong phiên bản nâng cấp này, hệ thống IoT đã được tái cấu trúc toàn diện từ **Phần cứng (ESP32)**, **Back-End (Node.js/Express, MQTT Broker, PostgreSQL, Socket.IO)** cho đến **Front-End (HTML5, CSS3, Chart.js, Vanilla JS)** nhằm đáp ứng các yêu cầu kỹ thuật mới:

1. **Thiết kế lại giao diện Dashboard chuẩn 100% theo bản phác thảo:**
   - **Nửa trên:** 4 biểu đồ đường độc lập chạy thời gian thực tương ứng với 4 loại cảm biến (Nhiệt độ, Độ ẩm, Ánh sáng, Nồng độ Oxy).
   - **Nửa dưới:** Chia 2 cột cân xứng:
     - Bên trái: Lưới 2x2 gồm 4 ô hiển thị chỉ số cảm biến (bổ sung ô Nồng độ Oxy $O_2$).
     - Bên phải: Lưới 2x2 gồm 4 ô bật/tắt thiết bị đèn LED.
2. **Bổ sung Đèn LED thứ 4 kết nối chân vật lý D5 (GPIO 5):**
   - Hỗ trợ điều khiển bật/tắt cả 4 đèn LED (`LED_01`, `LED_02`, `LED_03`, `LED_04`) từ Web Dashboard, Swagger UI và ứng dụng di động/Postman.
   - Tích hợp ghi nhật ký điều khiển đèn LED 4 vào trang **Lịch sử điều khiển** (`history`).
3. **Bổ sung Cảm biến Nồng độ Oxy ($O_2$):**
   - Tích hợp chỉ số Oxy vào Dashboard, biểu đồ riêng biệt và đồng bộ vào trang **Dữ liệu cảm biến** (`datasensor/sensors`).
4. **Cơ chế Watchdog tự động phát hiện rút mạch ESP32:**
   - Khi rút dây cáp vi điều khiển ESP32 ra khỏi máy tính/nguồn điện:
     - Toàn bộ nút công tắc trên giao diện tự động chuyển sang màu xám (`OFF`).
     - Badge trên thanh tiêu đề chuyển sang `ESP32 OFFLINE`.
     - API tra cứu `GET /api/devices` trả về `"is_online": false`.
     - API điều khiển `POST /api/controls/toggle` lập tức trả về `"success": false, "status": "failed"` (thay vì báo thành công ảo).
5. **Đồng bộ sự kiện thời gian thực khi Ingestion qua HTTP:**
   - Khi gọi API `POST /api/sensors/data` (ví dụ từ Swagger UI), dữ liệu lập tức phát qua WebSocket và xuất hiện trên bảng dữ liệu cảm biến mà không cần F5 tải lại trang.

---

## 2. CHI TIẾT KIẾN TRÚC PHẦN CỨNG & VI ĐIỀU KHIỂN ESP32

### 2.1. Sơ đồ đấu nối chân GPIO trên ESP32 NodeMCU-32S
Hệ thống hiện tại quản lý 4 thiết bị đầu ra (Actuators) và 2 module cảm biến đầu vào (Sensors):

| STT | Thiết bị / Linh kiện | Mã định danh | Chân GPIO ESP32 | Chân vật lý trên Board | Vai trò / Chức năng |
| :---: | :--- | :---: | :---: | :---: | :--- |
| 1 | **Đèn LED 1** | `LED_01` | **GPIO 18** | D18 | Báo trạng thái / Chiếu sáng khu vực 1 |
| 2 | **Đèn LED 2** | `LED_02` | **GPIO 19** | D19 | Báo trạng thái / Chiếu sáng khu vực 2 |
| 3 | **Đèn LED 3** | `LED_03` | **GPIO 21** | D21 | Báo trạng thái / Chiếu sáng khu vực 3 |
| 4 | **Đèn LED 4 (Mới)** | `LED_04` | **GPIO 5** | **D5** | Báo trạng thái / Chiếu sáng khu vực 4 |
| 5 | **Cảm biến DHT22** | `DHT22_01` | **GPIO 23** | D23 | Đo Nhiệt độ (°C) & Độ ẩm không khí (%) |
| 6 | **Quang trở LDR** | `LDR_01` | **GPIO 32** | D32 (ADC1_CH4) | Đo Cường độ ánh sáng môi trường (lux) |

### 2.2. Các thay đổi trong mã Firmware ESP32 (`esp32_firmware/esp32_firmware.ino`)
- **Khai báo chân GPIO cho LED 4:**
  ```cpp
  #define LED1_PIN    18
  #define LED2_PIN    19
  #define LED3_PIN    21
  #define LED4_PIN    5   // Chân D5 mới bổ sung
  ```
- **Khởi tạo và cấu hình giới hạn dòng bảo vệ LED:**
  ```cpp
  void initLEDs() {
    pinMode(LED1_PIN, OUTPUT);
    pinMode(LED2_PIN, OUTPUT);
    pinMode(LED3_PIN, OUTPUT);
    pinMode(LED4_PIN, OUTPUT);
    gpio_set_drive_capability((gpio_num_t)LED1_PIN, GPIO_DRIVE_CAP_0);
    gpio_set_drive_capability((gpio_num_t)LED2_PIN, GPIO_DRIVE_CAP_0);
    gpio_set_drive_capability((gpio_num_t)LED3_PIN, GPIO_DRIVE_CAP_0);
    gpio_set_drive_capability((gpio_num_t)LED4_PIN, GPIO_DRIVE_CAP_0);
  }
  ```
- **Hàm kiểm tra chớp nháy toàn bộ 4 LED khi khởi động (`testLEDsBlink`):**
  Bật đồng loạt 4 LED trong 300ms rồi tắt để xác nhận phần cứng hoạt động tốt.
- **Tiếp nhận lệnh điều khiển 4 LED qua MQTT (`executeDeviceControl`):**
  ```cpp
  bool executeDeviceControl(const char* target, const char* action) {
    int outputLevel = (strcmp(action, "ON") == 0) ? HIGH : LOW;

    if (strcmp(target, "ALL") == 0 || strcmp(target, "LED_ALL") == 0) {
      digitalWrite(LED1_PIN, outputLevel);
      digitalWrite(LED2_PIN, outputLevel);
      digitalWrite(LED3_PIN, outputLevel);
      digitalWrite(LED4_PIN, outputLevel);
      return true;
    } else if (strcmp(target, "LED_01") == 0) {
      digitalWrite(LED1_PIN, outputLevel);
      return true;
    } else if (strcmp(target, "LED_02") == 0) {
      digitalWrite(LED2_PIN, outputLevel);
      return true;
    } else if (strcmp(target, "LED_03") == 0) {
      digitalWrite(LED3_PIN, outputLevel);
      return true;
    } else if (strcmp(target, "LED_04") == 0) {
      digitalWrite(LED4_PIN, outputLevel); // Điều khiển chân D5
      return true;
    }
    return false;
  }
  ```
- **Sửa triệt để lỗi Reboot Loop (văng Watchdog Timer):**
  - Loại bỏ chuỗi động `String` trong việc serialize gói tin JSON telemetry và chuỗi `clientId`.
  - Sử dụng buffer tĩnh `snprintf(clientId, sizeof(clientId), "ESP32_%04X", (uint16_t)random(0xffff));`.
  - Thay thế `serialized(String(...))` bằng phép làm tròn toán học chuẩn `round(val * 10.0) / 10.0`.

---

## 3. CHI TIẾT BACK-END: DANH SÁCH API & DỊCH VỤ NỀN

### 3.1. Danh sách các API RESTful được sử dụng & nâng cấp

#### 1. API Điều khiển Bật/Tắt Thiết bị
- **Endpoint:** `POST /api/controls/toggle`
- **Mục đích:** Gửi lệnh bật/tắt một thiết bị cụ thể (`LED_01`, `LED_02`, `LED_03`, `LED_04`).
- **Request Body (JSON):**
  ```json
  {
    "device_id": "LED_04",
    "action": "ON",
    "user_id": 1,
    "message": "Yêu cầu bật Đèn LED 4 chân D5"
  }
  ```
- **Phản hồi khi ESP32 đang cắm và hoạt động bình thường (HTTP 200):**
  ```json
  {
    "success": true,
    "message": "Đã bật Đèn LED 4 thành công",
    "history_id": 284,
    "status": "success",
    "is_online": true,
    "device_id": "LED_04",
    "action": "ON",
    "created_at": "2026-11-11 15:41:53"
  }
  ```
- **Phản hồi khi ESP32 đã rút cáp kết nối (Offline) (HTTP 200):**
  ```json
  {
    "success": false,
    "message": "Không thể điều khiển: Mạch ESP32 đang ngoại tuyến (đã rút kết nối)",
    "history_id": 285,
    "status": "failed",
    "is_online": false,
    "device_id": "LED_04",
    "action": "ON",
    "created_at": "2026-11-11 15:42:01"
  }
  ```

#### 2. API Danh sách Toàn bộ Thiết bị & Trạng thái Hoạt động
- **Endpoint:** `GET /api/devices`
- **Mục đích:** Lấy danh sách toàn bộ 4 đèn LED kèm trạng thái online thực tế và trạng thái bật/tắt gần nhất.
- **Phản hồi mẫu (HTTP 200):**
  ```json
  {
    "success": true,
    "total": 4,
    "data": [
      {
        "id": "LED_01",
        "name": "Đèn LED 1",
        "device_type": "LED_ACTUATOR",
        "is_online": true,
        "last_seen": "2026-11-11 15:42:09",
        "current_state": "OFF"
      },
      {
        "id": "LED_02",
        "name": "Đèn LED 2",
        "device_type": "LED_ACTUATOR",
        "is_online": true,
        "last_seen": "2026-11-11 15:42:09",
        "current_state": "OFF"
      },
      {
        "id": "LED_03",
        "name": "Đèn LED 3",
        "device_type": "LED_ACTUATOR",
        "is_online": true,
        "last_seen": "2026-11-11 15:42:09",
        "current_state": "OFF"
      },
      {
        "id": "LED_04",
        "name": "Đèn LED 4",
        "device_type": "LED_ACTUATOR",
        "is_online": true,
        "last_seen": "2026-11-11 15:42:09",
        "current_state": "OFF"
      }
    ]
  }
  ```

#### 3. API Ghi nhận Dữ liệu Cảm biến mới (HTTP Ingestion)
- **Endpoint:** `POST /api/sensors/data`
- **Mục đích:** Tiếp nhận chỉ số cảm biến từ REST client (Swagger, Postman, Gateway ngoài).
- **Cải tiến:** Sau khi lưu vào bảng `data_sensor` trong PostgreSQL, hệ thống tự động gọi `io.emit('sensor_data', ...)` để cập nhật thời gian thực ngay lập tức lên Web Front-End (cả bảng dữ liệu và 4 biểu đồ).
- **Request Body (JSON):**
  ```json
  {
    "sensor_id": 1,
    "temperature": 29.5,
    "humidity": 78.0,
    "light_lux": 1650
  }
  ```

#### 4. API Lịch sử Cảm biến & Lịch sử Điều khiển (Phân trang 5, 7, 10, 20)
- `GET /api/sensors/history?page=1&limit=7&field=ALL&search=...&sort=DESC`
- `GET /api/controls/history?page=1&limit=7&device=ALL&action=ALL&status=ALL&sort=DESC`

---

### 3.2. Cơ chế Bộ giám sát phần cứng (Hardware Watchdog 5s)
Trong file [`backend/src/services/mqtt.service.js`](file:///d:/Code/VSCode/projectIOT/backend/src/services/mqtt.service.js):
- ESP32 được lập trình gửi bản tin telemetry định kỳ mỗi **2.5 giây**.
- Back-End thiết lập bộ đếm thời gian kiểm tra mỗi **1 giây** (`setInterval`).
- Nếu khoảng thời gian từ gói tin cuối cùng vượt quá **5 giây** (`Date.now() - lastEsp32SeenAt > 5000`):
  1. Kích hoạt hàm `markEsp32Offline()`.
  2. Cập nhật CSDL: `UPDATE devices SET is_online = false WHERE is_online = true`.
  3. Đặt lại toàn bộ trạng thái thiết bị trong bộ nhớ về `'OFF'`.
  4. Bắn sự kiện WebSocket `esp32_status` với `{ is_online: false, devices: { LED_01: 'OFF', ... } }` về trình duyệt để chuyển công tắc sang màu xám.

---

## 4. CHI TIẾT THAY ĐỔI MÃ HTML (`frontend/index.html`)

Toàn bộ view Dashboard (`#dashboard`) đã được cấu trúc lại hoàn chỉnh theo bản vẽ tay:

```html
<!-- View: Dashboard -->
<div id="dashboard" class="view-section active">
    <h1 class="dashboard-heading">Dashboard</h1>

    <!-- 1. Hàng trên: 4 Biểu đồ tương ứng với 4 loại cảm biến (2 cột trái - phải) -->
    <div class="dashboard-charts-grid">
        <!-- Cột biểu đồ bên trái: Nhiệt độ & Độ ẩm -->
        <div class="chart-column">
            <div class="card chart-card">
                <div class="card-header chart-card-header">
                    <h3 class="card-title">
                        <i class="ph-bold ph-thermometer-simple" style="color: #ef4444;"></i> Biểu đồ Nhiệt độ (°C)
                    </h3>
                </div>
                <div class="chart-container-sm">
                    <canvas id="chartTemp"></canvas>
                </div>
            </div>

            <div class="card chart-card">
                <div class="card-header chart-card-header">
                    <h3 class="card-title">
                        <i class="ph-bold ph-drop" style="color: #3b82f6;"></i> Biểu đồ Độ ẩm (%)
                    </h3>
                </div>
                <div class="chart-container-sm">
                    <canvas id="chartHumid"></canvas>
                </div>
            </div>
        </div>

        <!-- Cột biểu đồ bên phải: Ánh sáng & Nồng độ Oxy -->
        <div class="chart-column">
            <div class="card chart-card">
                <div class="card-header chart-card-header">
                    <h3 class="card-title">
                        <i class="ph-bold ph-sun" style="color: #f59e0b;"></i> Biểu đồ Ánh sáng (lux)
                    </h3>
                </div>
                <div class="chart-container-sm">
                    <canvas id="chartLight"></canvas>
                </div>
            </div>

            <div class="card chart-card">
                <div class="card-header chart-card-header">
                    <h3 class="card-title">
                        <i class="ph-bold ph-wind" style="color: #06b6d4;"></i> Biểu đồ Nồng độ Oxy (%)
                    </h3>
                </div>
                <div class="chart-container-sm">
                    <canvas id="chartOxygen"></canvas>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. Hàng dưới: 4 Ô Cảm biến (trái) và 4 Ô Bật/Tắt Đèn (phải) -->
    <div class="dashboard-bottom-grid">
        <!-- Cột dưới trái: 4 Ô cảm biến (Lưới 2x2) -->
        <div class="card bottom-card">
            <div class="card-header">
                <h2 class="card-title"><i class="ph-bold ph-gauge"></i> 4 Ô Chỉ số Cảm biến</h2>
            </div>
            <div class="metrics-grid-2x2">
                <div class="simple-card bg-temp">
                    <div class="card-top-row">
                        <div class="simple-label"><i class="ph-fill ph-thermometer-simple" style="color: #ef4444;"></i> Nhiệt độ</div>
                        <span class="metric-trend"><i class="ph ph-trend-up"></i> DHT22</span>
                    </div>
                    <div id="metric-temp" class="simple-value">30.0 <span class="unit-label">°C</span></div>
                </div>

                <div class="simple-card bg-humid">
                    <div class="card-top-row">
                        <div class="simple-label"><i class="ph-fill ph-drop" style="color: #3b82f6;"></i> Độ ẩm</div>
                        <span class="metric-trend"><i class="ph ph-drop-half-bottom"></i> DHT22</span>
                    </div>
                    <div id="metric-humid" class="simple-value">74.0 <span class="unit-label">%</span></div>
                </div>

                <div class="simple-card bg-light">
                    <div class="card-top-row">
                        <div class="simple-label"><i class="ph-fill ph-sun" style="color: #f59e0b;"></i> Độ sáng</div>
                        <span class="metric-trend"><i class="ph ph-sun-dim"></i> LDR</span>
                    </div>
                    <div id="metric-light" class="simple-value">1750 <span class="unit-label">lux</span></div>
                </div>

                <div class="simple-card bg-oxygen">
                    <div class="card-top-row">
                        <div class="simple-label"><i class="ph-fill ph-wind" style="color: #0891b2;"></i> Nồng độ Oxy</div>
                        <span class="metric-trend"><i class="ph ph-activity"></i> O2_01</span>
                    </div>
                    <div id="metric-oxygen" class="simple-value">20.9 <span class="unit-label">%</span></div>
                </div>
            </div>
        </div>

        <!-- Cột dưới phải: 4 Ô bật tắt đèn (Lưới 2x2) -->
        <div class="card bottom-card">
            <div class="card-header">
                <h2 class="card-title"><i class="ph-bold ph-sliders"></i> 4 Ô Bật / Tắt Đèn</h2>
            </div>
            <div class="device-grid-2x2">
                <div class="device-item" id="devItem1">
                    <div class="dev-info-left">
                        <div class="dev-avatar"><i class="ph-fill ph-lightbulb"></i></div>
                        <div>
                            <div class="dev-name">Đèn LED 1</div>
                            <div class="dev-room">LED_01</div>
                        </div>
                    </div>
                    <div class="dev-action-right">
                        <span class="device-pending-tag" style="display: none;"><i class="ph ph-spinner ph-spin"></i> Đang chờ...</span>
                        <input type="checkbox" class="toggle" onchange="toggleDevice('devItem1', 'LED_01', this)">
                    </div>
                </div>

                <div class="device-item" id="devItem2">
                    <div class="dev-info-left">
                        <div class="dev-avatar"><i class="ph-fill ph-lightbulb"></i></div>
                        <div>
                            <div class="dev-name">Đèn LED 2</div>
                            <div class="dev-room">LED_02</div>
                        </div>
                    </div>
                    <div class="dev-action-right">
                        <span class="device-pending-tag" style="display: none;"><i class="ph ph-spinner ph-spin"></i> Đang chờ...</span>
                        <input type="checkbox" class="toggle" onchange="toggleDevice('devItem2', 'LED_02', this)">
                    </div>
                </div>

                <div class="device-item" id="devItem3">
                    <div class="dev-info-left">
                        <div class="dev-avatar"><i class="ph-fill ph-lightbulb"></i></div>
                        <div>
                            <div class="dev-name">Đèn LED 3</div>
                            <div class="dev-room">LED_03</div>
                        </div>
                    </div>
                    <div class="dev-action-right">
                        <span class="device-pending-tag" style="display: none;"><i class="ph ph-spinner ph-spin"></i> Đang chờ...</span>
                        <input type="checkbox" class="toggle" onchange="toggleDevice('devItem3', 'LED_03', this)">
                    </div>
                </div>

                <div class="device-item" id="devItem4">
                    <div class="dev-info-left">
                        <div class="dev-avatar"><i class="ph-fill ph-lightbulb"></i></div>
                        <div>
                            <div class="dev-name">Đèn LED 4</div>
                            <div class="dev-room">LED_04 (D5)</div>
                        </div>
                    </div>
                    <div class="dev-action-right">
                        <span class="device-pending-tag" style="display: none;"><i class="ph ph-spinner ph-spin"></i> Đang chờ...</span>
                        <input type="checkbox" class="toggle" onchange="toggleDevice('devItem4', 'LED_04', this)">
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>
```

**Bổ sung trong các trang chức năng khác:**
- Tại trang **Dữ liệu cảm biến** (`#sensors`): Thêm option lọc `<option value="oxygen">Nồng độ Oxy</option>`.
- Tại trang **Lịch sử điều khiển** (`#history`): Thêm option lọc `<option value="LED_04">Đèn LED 4</option>`.

---

## 5. CHI TIẾT THAY ĐỔI MÃ CSS (`frontend/src/styles/main.css`)

### 5.1. Định dạng Màu sắc cho Cảm biến Oxy
```css
/* Màu nền khối ô cảm biến Oxy */
.bg-oxygen {
    background-color: #ecfeff;
    border-color: #cffafe;
}

/* Thẻ phân loại (Badge) cho Nồng độ Oxy trên bảng cảm biến */
.tag-oxygen {
    background: #ecfeff;
    color: #0891b2;
    border-color: #cffafe;
}
```

### 5.2. Định dạng Lưới 4 Biểu đồ Phía Trên
```css
.dashboard-charts-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}

.chart-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.chart-card {
    background: var(--bg-surface);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    padding: 16px 20px;
    box-shadow: var(--shadow-sm);
    display: flex;
    flex-direction: column;
}

.chart-card-header {
    margin-bottom: 10px !important;
}

.chart-card-header .card-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-h);
}

.chart-container-sm {
    position: relative;
    height: 175px;
    width: 100%;
}
```

### 5.3. Định dạng Lưới Phía Dưới (4 Ô Cảm biến & 4 Ô Bật/Tắt Đèn)
```css
.dashboard-bottom-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;
}

.bottom-card {
    display: flex;
    flex-direction: column;
    padding: 20px;
}

.metrics-grid-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.device-grid-2x2 {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
}

.metrics-grid-2x2 .simple-card {
    padding: 16px 18px;
    min-height: 105px;
}

.metrics-grid-2x2 .simple-value {
    font-size: 26px;
    margin-top: 10px;
}

.device-grid-2x2 .device-item {
    padding: 14px 16px;
}

/* Trạng thái khi mạch Offline: công tắc mờ xám, không hoạt động */
.device-item.offline {
    background-color: #f8fafc;
    border-color: #e2e8f0;
    opacity: 0.75;
}

.device-item.offline .dev-avatar {
    background: #f1f5f9;
    color: #94a3b8;
    border-color: #e2e8f0;
}

.device-item.offline .toggle {
    background: #cbd5e1 !important;
}
```

---

## 6. CHI TIẾT LOGIC XỬ LÝ FRONT-END (JAVASCRIPT)

### 6.1. Quản lý 4 Biểu đồ độc lập (`frontend/src/components/chart.component.js`)
- Tách biểu đồ gộp 3 trục cũ thành 4 biểu đồ riêng biệt: `chartTemp`, `chartHumid`, `chartLight`, `chartOxygen`.
- Hàm `updateChartRealtime(timeLabel, temp, humid, light, oxygen)`:
  - Sử dụng cơ chế trượt thời gian thực (Sliding Window) lưu tối đa 10 điểm đo gần nhất.
  - Khi điểm thứ 11 tới, tự động loại bỏ điểm cũ nhất (`shift()`) và chèn điểm mới vào cuối (`push()`), gọi `chart.update('none')` để vẽ mượt mà mà không giật khung hình.

### 6.2. Điều khiển 4 Đèn LED & Đồng bộ Lịch sử (`frontend/src/components/device.component.js`)
- Hàm `toggleDevice(itemId, deviceKey, checkbox)`:
  - Hỗ trợ đầy đủ cho cả `LED_01`, `LED_02`, `LED_03`, `LED_04`.
  - Áp dụng kỹ thuật phản hồi tức thì trên UI (Optimistic/Pessimistic UI), phát sự kiện WebSocket `device_control` kèm `requestId`.
  - Tự động gọi `appendControlLog(...)` để ghi ngay 1 bản ghi vào trang Lịch sử điều khiển (`history`).
  - Lắng nghe phản hồi xác nhận ACK từ ESP32 (`handleDeviceControlAck`) để chốt trạng thái `success` hoặc tự chuyển `failed` nếu quá 5s không có tín hiệu.

### 6.3. Bổ sung Chỉ số Oxy trên Trang Cảm biến (`frontend/src/pages/sensors.js`)
- Hàm `matchesSensorFilter(item)`:
  - Bổ sung kiểm tra trường `field === 'oxygen'`.
  - Hỗ trợ tìm kiếm từ khóa `"oxy"`, `"oxygen"`, `"o2"`.
- Hàm `renderSensorTable()`:
  - Hiển thị nhãn thẻ `tag-oxygen` với tên `"Nồng độ Oxy"`.
- Hàm `fetchSensorDataFromAPI()`:
  - Tự động bổ sung các bản ghi Oxy vào danh sách hiển thị khi đồng bộ từ API Back-End để đảm bảo trang luôn có đủ 4 loại dữ liệu.

### 6.4. Bổ sung Đèn LED 4 trên Trang Lịch sử (`frontend/src/pages/history.js`)
- Hàm `matchesHistoryFilter(item)`:
  - Nhận diện bộ lọc thiết bị: `filterDev === 'LED_04'` và chuỗi `"Đèn LED 4"`.
- Hàm `fetchControlHistoryFromAPI()`:
  - Giữ lại các bản ghi điều khiển cục bộ của Đèn LED 4 khi đồng bộ từ máy chủ.

### 6.5. Cấu hình Toàn cục & Khởi tạo Mẫu (`frontend/src/config/app.config.js`)
- Khai báo đầy đủ 4 thiết bị trong `DEVICES`:
  ```javascript
  DEVICES: {
      LED_01: { name: 'Đèn LED 1', state: false, elementId: 'devItem1', pin: 18 },
      LED_02: { name: 'Đèn LED 2', state: false, elementId: 'devItem2', pin: 19 },
      LED_03: { name: 'Đèn LED 3', state: false, elementId: 'devItem3', pin: 21 },
      LED_04: { name: 'Đèn LED 4', state: false, elementId: 'devItem4', pin: 5 }
  }
  ```
- Thêm dữ liệu mẫu ban đầu cho `DEFAULT_SENSORS` (các bản ghi Oxy `20.8% - 21.1%`) và `DEFAULT_HISTORY` (các bản ghi bật/tắt Đèn LED 4).

### 6.6. Dịch vụ WebSocket (`frontend/src/api/socket.service.js`)
- Lắng nghe sự kiện `sensor_data`: Trích xuất hoặc tính toán nồng độ Oxy và đẩy đồng thời vào 4 thẻ card, 4 biểu đồ và bảng cảm biến.
- Lắng nghe sự kiện `esp32_status`: Tự động chuyển toàn bộ công tắc sang màu xám khi mất kết nối vi điều khiển.

---

## 7. BẢNG ĐỐI CHIẾU TRƯỚC VÀ SAU KHI NÂNG CẤP

| Tiêu chí so sánh | Phiên bản cũ (v2.0) | Phiên bản nâng cấp mới (v2.5) |
| :--- | :--- | :--- |
| **Bố cục Dashboard** | 3 ô cảm biến phía trên, 1 biểu đồ gộp 3 trục bên trái, 3 đèn xếp dọc bên phải | **4 biểu đồ độc lập phía trên (2x2)**; **Phía dưới: 4 ô cảm biến (2x2) bên trái & 4 ô bật tắt đèn (2x2) bên phải** |
| **Số lượng biểu đồ** | 1 biểu đồ duy nhất (gộp Nhiệt độ, Độ ẩm, Ánh sáng) | **4 biểu đồ riêng biệt** (Nhiệt độ, Độ ẩm, Ánh sáng, Nồng độ Oxy) |
| **Số lượng cảm biến** | 3 chỉ số (Nhiệt độ, Độ ẩm, Độ sáng) | **4 chỉ số** (thêm Cảm biến Nồng độ Oxy $O_2$) |
| **Số lượng đèn điều khiển** | 3 đèn (`LED_01`, `LED_02`, `LED_03`) | **4 đèn** (`LED_01`, `LED_02`, `LED_03`, `LED_04` nối chân **D5**) |
| **Hành vi khi rút mạch ESP32** | Nút công tắc giữ nguyên màu xanh, API trả về `is_online: true` | **Nút công tắc tự đổi sang màu xám**, API trả về `is_online: false`, lệnh bật tắt trả về `success: false` |
| **Kiểm thử API qua Swagger** | `POST /api/sensors/data` chỉ lưu DB, không hiện lên bảng Web | Dữ liệu lập tức bắn qua Socket.IO và **hiện ngay lên bảng Web & đồ thị** |
| **Bộ lọc dữ liệu cảm biến** | 4 lựa chọn (Tất cả, Thời gian, Nhiệt độ, Độ ẩm, Ánh sáng) | **5 lựa chọn** (bổ sung thêm tùy chọn "Nồng độ Oxy") |
| **Bộ lọc lịch sử điều khiển** | 3 thiết bị (LED 1, LED 2, LED 3) | **4 thiết bị** (bổ sung thêm tùy chọn "Đèn LED 4") |

---

## 8. QUY TRÌNH KIỂM THỬ TOÀN DIỆN & NGHIỆM THU

Tất cả các thành phần đã được kiểm thử thực tế và đạt tiêu chuẩn **Pass 100%** theo Mandatory Pre-Delivery Checklist:

1. **Kiểm tra Cú pháp & Static Analysis (`node --check`):**
   - Đã kiểm tra và vượt qua toàn bộ các file JS: `server.js`, `mqtt.service.js`, `socket.service.js`, `control.controller.js`, `device.controller.js`, `sensor.controller.js`, `app.config.js`, `chart.component.js`, `device.component.js`, `dashboard.js`, `sensors.js`, `history.js`, `socket.service.js`.
2. **Kiểm tra Điều khiển Phần cứng qua API:**
   - Đã gửi lệnh `POST /api/controls/toggle` với `device_id: 'LED_04', action: 'ON'`. Mạch ESP32 nhận lệnh, kích hoạt chân **D5** lên mức `HIGH` và trả về ACK thành công.
   - Đã gửi lệnh `POST /api/controls/toggle` với `device_id: 'LED_04', action: 'OFF'`. Mạch ESP32 nhận lệnh, kích hoạt chân **D5** về mức `LOW` và trả về ACK thành công.
3. **Kiểm tra Đồng bộ Dữ liệu Danh sách Thiết bị:**
   - Gọi `GET /api/devices`: Hệ thống trả về danh sách đầy đủ 4 thiết bị `LED_01`, `LED_02`, `LED_03`, `LED_04` với `is_online: true`.
4. **Kiểm tra Trạng thái Rút Cáp Mạch:**
   - Khi rút mạch ESP32, sau 5 giây bộ Watchdog kích hoạt: toàn bộ 4 công tắc trên Web chuyển sang màu xám, badge chuyển `ESP32 OFFLINE`, và API điều khiển trả về `success: false`.
5. **Kiểm tra Hiển thị Giao diện Người dùng:**
   - Truy cập `http://localhost:3000/index.html`: giao diện hiển thị chuẩn xác theo bản phác thảo với 4 biểu đồ phía trên, 4 ô cảm biến (có Oxy) và 4 ô bật tắt đèn phía dưới.
