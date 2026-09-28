# Project IoT - Hệ Thống Giám Sát Môi Trường & Điều Khiển Thiết Bị Thời Gian Thực

Hệ thống IoT hoàn chỉnh bao gồm mạch phần cứng vi điều khiển ESP32, các cảm biến môi trường (DHT22, Quang trở LDR), giao thức truyền thông MQTT (Mosquitto) và giao diện Web Application trực quan hóa dữ liệu theo thời gian thực.

---

## 📂 Cấu trúc Repository

* **[`frontend/`](frontend/)**: Giao diện Web Application (HTML5, CSS3, JavaScript Vanilla, Chart.js, Socket.IO)
  * **Dashboard:** Giám sát thời gian thực các chỉ số Nhiệt độ, Độ ẩm, Ánh sáng và công tắc điều khiển 3 đèn LED.
  * **Dữ liệu cảm biến (`sensors`):** Bảng dữ liệu thời gian thực, hỗ trợ lọc theo thời gian, loại cảm biến, loại chỉ số (chỉ lọc khi bấm nút) và phân trang động.
  * **Lịch sử điều khiển (`history`):** Nhật ký bật/tắt thiết bị, hỗ trợ lọc theo thiết bị, thời gian, trạng thái (`Thành công`, `Đang chờ (Pending)`, `Thất bại`) và phân trang động.
  * **Hồ sơ sinh viên (`profile`):** Thông tin sinh viên thực hiện đề tài.

* **[`esp32_firmware/`](esp32_firmware/)**: Mã nguồn nhúng nạp vào mạch ESP32 viết trên **Arduino IDE (C/C++)**
  * Đọc dữ liệu nhiệt độ & độ ẩm từ cảm biến **DHT22** (GPIO 23).
  * Đọc cường độ ánh sáng từ cảm biến **Quang trở LDR** (GPIO 32).
  * Điều khiển 3 **Đèn LED** đầu ra (GPIO 18, 19, 21).
  * Kết nối Wi-Fi và giao tiếp hai chiều với MQTT Broker qua thư viện `PubSubClient` và `ArduinoJson`.

---

## 🛠️ Công nghệ sử dụng

* **Phần cứng:** ESP32 NodeMCU-32S, DHT22, Quang trở LDR, LED & Điện trở.
* **Firmware:** Arduino IDE, C/C++, PubSubClient, ArduinoJson.
* **Giao thức:** MQTT (Mosquitto Broker), WebSocket (Socket.IO).
* **Frontend:** HTML5, CSS3 Clean Minimal UI, JavaScript Vanilla, Chart.js, Phosphor Icons.