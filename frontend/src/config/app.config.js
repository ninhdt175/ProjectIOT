// =============================================================================
// TẬP TIN: app.config.js
// VAI TRÒ: CẤU HÌNH TOÀN CỤC CHO ỨNG DỤNG FRONT-END IOT
// MÔ TẢ:
//   Tập tin này định nghĩa đối tượng cấu hình trung tâm APP_CONFIG.
//   Mục đích:
//   1. Tập trung toàn bộ thông số kỹ thuật (địa chỉ máy chủ, danh sách thiết bị, GPIO pin) tại một nơi.
//   2. Cung cấp dữ liệu mẫu ban đầu (Mock Data) cho cảm biến và lịch sử điều khiển,
//      giúp giao diện hiển thị ngay lập tức khi mở trình duyệt độc lập hoặc khi backend chưa phản hồi.
//   3. Được gán vào phạm vi toàn cục (window.APP_CONFIG) để các file JavaScript khác truy cập dễ dàng.
// =============================================================================

// Khởi tạo đối tượng hằng số APP_CONFIG (không thể gán lại bằng biến khác)
const APP_CONFIG = {
    // -------------------------------------------------------------------------
    // 1. ĐỊA CHỈ BACKEND SERVER (API & WebSocket Gateway)
    // -------------------------------------------------------------------------
    // window.location.origin: Trả về giao thức + tên miền + cổng hiện tại của trình duyệt.
    // Ví dụ: "http://localhost:3000" hoặc "http://192.168.1.100:3000".
    // Giúp Front-End tự động thích ứng dù đang chạy trên máy cục bộ hay máy chủ thật.
    BACKEND_URL: window.location.origin,

    // -------------------------------------------------------------------------
    // 2. DANH SÁCH THIẾT BỊ ĐIỀU KHIỂN VÀ MAPPING PHẦN CỨNG ESP32
    // -------------------------------------------------------------------------
    // Định nghĩa các thiết bị ngoại vi kết nối với ESP32:
    // - name: Tên thân thiện hiển thị cho người dùng trên giao diện.
    // - state: Trạng thái ban đầu (true = BẬT / ON, false = TẮT / OFF).
    // - elementId: ID của phần tử thẻ card tương ứng trong HTML (để Javascript tìm và cập nhật DOM).
    // - pin: Số chân GPIO vật lý trên vi điều khiển ESP32 đang nối với thiết bị này.
    DEVICES: {
        LED_01: { 
            name: 'Đèn LED 1',   // Tên thiết bị
            state: true,         // Đèn 1 mặc định BẬT khi mới vào hệ thống
            elementId: 'devItem1', // Thẻ <div id="devItem1"> trong file index.html
            pin: 2               // Chân GPIO 2 trên bo mạch ESP32 (thường nối với LED tích hợp hoặc Relay 1)
        },
        LED_02: { 
            name: 'Đèn LED 2',   // Tên thiết bị
            state: false,        // Đèn 2 mặc định TẮT
            elementId: 'devItem2', // Thẻ <div id="devItem2"> trong file index.html
            pin: 4               // Chân GPIO 4 trên bo mạch ESP32 (nối với Relay 2 / LED ngoài)
        },
        LED_03: { 
            name: 'Đèn LED 3',   // Tên thiết bị
            state: false,        // Đèn 3 mặc định TẮT
            elementId: 'devItem3', // Thẻ <div id="devItem3"> trong file index.html
            pin: 5               // Chân GPIO 5 trên bo mạch ESP32 (nối với Relay 3 / LED ngoài)
        }
    },

    // -------------------------------------------------------------------------
    // 3. DỮ LIỆU CẢM BIẾN MẪU (Mock Data)
    // -------------------------------------------------------------------------
    // Cung cấp 20 bản ghi cảm biến mẫu ban đầu cho bảng tra cứu tại trang "Dữ liệu cảm biến".
    // Mỗi bản ghi (record) đại diện cho 1 lần đo đạc gửi từ cảm biến:
    // - id: Mã định danh duy nhất (Unique ID) của bản ghi trong cơ sở dữ liệu.
    // - sensor: Tên/mã của cảm biến đo (VD: DHT22_01 đo nhiệt/ẩm, LDR_01 đo quang trở/ánh sáng).
    // - device: Mã thiết bị trạm thu thập (ESP32_01).
    // - type: Loại dữ liệu ('temperature' = nhiệt độ, 'humidity' = độ ẩm, 'light' = ánh sáng).
    // - value: Chuỗi giá trị có kèm theo đơn vị đo lường (°C, %, lux) dùng hiển thị trực quan.
    // - rawVal: Giá trị số học nguyên bản (kiểu số float/integer) dùng khi tính toán hoặc vẽ đồ thị.
    // - time: Mốc thời gian bản ghi được ghi nhận (định dạng YYYY-MM-DD HH:mm:ss).
    DEFAULT_SENSORS: [
        { id: 1, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '30.0 °C', rawVal: 30.0, time: '2026-08-24 13:45:33' },
        { id: 2, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '74.0 %', rawVal: 74.0, time: '2026-08-24 13:45:33' },
        { id: 3, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1750 lux', rawVal: 1750, time: '2026-08-24 13:45:30' },
        { id: 4, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '29.8 °C', rawVal: 29.8, time: '2026-08-24 13:40:15' },
        { id: 5, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '75.2 %', rawVal: 75.2, time: '2026-08-24 13:40:15' },
        { id: 6, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1820 lux', rawVal: 1820, time: '2026-08-24 13:40:12' },
        { id: 7, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '29.5 °C', rawVal: 29.5, time: '2026-08-24 13:35:00' },
        { id: 8, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '76.0 %', rawVal: 76.0, time: '2026-08-24 13:35:00' },
        { id: 9, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1680 lux', rawVal: 1680, time: '2026-08-24 13:34:55' },
        { id: 10, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '29.2 °C', rawVal: 29.2, time: '2026-08-24 13:30:10' },
        { id: 11, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '77.1 %', rawVal: 77.1, time: '2026-08-24 13:30:10' },
        { id: 12, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1590 lux', rawVal: 1590, time: '2026-08-24 13:30:05' },
        { id: 13, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '28.9 °C', rawVal: 28.9, time: '2026-08-24 13:25:00' },
        { id: 14, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '78.0 %', rawVal: 78.0, time: '2026-08-24 13:25:00' },
        { id: 15, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1450 lux', rawVal: 1450, time: '2026-08-24 13:24:50' },
        { id: 16, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '28.5 °C', rawVal: 28.5, time: '2026-08-24 13:20:10' },
        { id: 17, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '79.2 %', rawVal: 79.2, time: '2026-08-24 13:20:10' },
        { id: 18, sensor: 'LDR_01', device: 'ESP32_01', type: 'light', value: '1380 lux', rawVal: 1380, time: '2026-08-24 13:20:00' },
        { id: 19, sensor: 'DHT22_01', device: 'ESP32_01', type: 'temperature', value: '28.1 °C', rawVal: 28.1, time: '2026-08-24 13:15:30' },
        { id: 20, sensor: 'DHT22_01', device: 'ESP32_01', type: 'humidity', value: '80.0 %', rawVal: 80.0, time: '2026-08-24 13:15:30' }
    ],

    // -------------------------------------------------------------------------
    // 4. DỮ LIỆU LỊCH SỬ ĐIỀU KHIỂN MẪU (Mock Data)
    // -------------------------------------------------------------------------
    // Cung cấp các dòng nhật ký thao tác điều khiển thiết bị ban đầu:
    // - id: Mã lệnh điều khiển hoặc ID dòng trong cơ sở dữ liệu.
    // - time: Thời gian người dùng gửi lệnh bật/tắt thiết bị.
    // - device: Tên thiết bị hiển thị kèm mã nhận diện.
    // - deviceId: Mã trạm phần cứng chịu trách nhiệm thực thi (ESP32_01).
    // - action: Hành động thực hiện ('ON' = Bật, 'OFF' = Tắt).
    // - user: Tên tài khoản người thực hiện thao tác.
    // - status: Trạng thái thực thi lệnh ('success' = Thành công, 'pending' = Đang chờ xử lý, 'failed' = Thất bại).
    DEFAULT_HISTORY: [
        { id: 1, time: 'Hôm nay, 13:40:05', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 2, time: 'Hôm nay, 13:15:20', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 3, time: 'Hôm nay, 12:45:11', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'pending' },
        { id: 4, time: 'Hôm qua, 22:30:00', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 5, time: 'Hôm qua, 18:00:15', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 6, time: 'Hôm qua, 15:10:20', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'pending' },
        { id: 7, time: 'Hôm qua, 09:20:00', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'failed' },
        { id: 8, time: '2026-08-22 21:10:00', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 9, time: '2026-08-22 18:05:40', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 10, time: '2026-08-22 14:30:15', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'pending' },
        { id: 11, time: '2026-08-21 23:00:10', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 12, time: '2026-08-21 19:45:00', device: 'Đèn LED 2 (LED_02)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' },
        { id: 13, time: '2026-08-21 11:20:30', device: 'Đèn LED 3 (LED_03)', deviceId: 'ESP32_01', action: 'OFF', user: 'Đỗ Trọng Ninh', status: 'failed' },
        { id: 14, time: '2026-08-20 20:00:00', device: 'Đèn LED 1 (LED_01)', deviceId: 'ESP32_01', action: 'ON', user: 'Đỗ Trọng Ninh', status: 'success' }
    ]
};

// -----------------------------------------------------------------------------
// 5. XUẤT CẤU HÌNH RA PHẠM VI TOÀN CỤC (GLOBAL SCOPE)
// -----------------------------------------------------------------------------
// Gán đối tượng cấu hình vào đối tượng window của trình duyệt.
// Nhờ đó, bất kỳ tập tin JavaScript nào được nạp sau file này trong file index.html
// đều có thể đọc dữ liệu trực tiếp thông qua window.APP_CONFIG hoặc window.CONFIG.
window.APP_CONFIG = APP_CONFIG;
window.CONFIG = APP_CONFIG;
