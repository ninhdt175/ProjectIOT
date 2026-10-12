// =============================================================================
// TẬP TIN: socket.service.js
// VAI TRÒ: DỊCH VỤ KẾT NỐI WEBSOCKET THỜI GIAN THỰC (Real-Time Communication Service)
// MÔ TẢ:
//   Tập tin này chịu trách nhiệm quản lý kết nối 2 chiều (Full-Duplex) giữa trình duyệt và Backend:
//   1. Sử dụng thư viện Socket.IO client để duy trì kênh liên lạc liên tục với máy chủ.
//   2. Lắng nghe các sự kiện nhận dữ liệu cảm biến định kỳ ('sensor_data') từ vi điều khiển ESP32 gửi lên qua MQTT.
//   3. Cập nhật tức thời số liệu lên các thẻ Dashboard, vẽ đồ thị Chart.js và chèn bản ghi vào bảng dữ liệu.
//   4. Lắng nghe phản hồi xác nhận lệnh điều khiển ('device_control_ack') và đồng bộ trạng thái ('device_status').
//   5. Tích hợp bộ giả lập dữ liệu (Simulated Telemetry Generator) tự động kích hoạt khi chạy độc lập không có Backend.
// =============================================================================

// Khởi tạo đối tượng quản lý dịch vụ SocketService
const SocketService = {
    // -------------------------------------------------------------------------
    // 1. HÀM CẬP NHẬT TRẠNG THÁI KẾT NỐI CỦA PHẦN CỨNG ESP32 TRÊN HEADER
    // -------------------------------------------------------------------------
    // Tham số đầu vào:
    // - isOnline (boolean): true nếu phần cứng đang kết nối, false nếu bị ngắt kết nối.
    setDeviceOnlineStatus(isOnline) {
        // Cập nhật giá trị vào biến trạng thái toàn cục AppState nếu tồn tại
        if (window.AppState) {
            window.AppState.isOnline = isOnline;
        }

        // Lấy thẻ HTML của huy hiệu trạng thái (badge) và dòng chữ nhãn trên thanh Header
        const badge = document.getElementById('device-status-badge');
        const label = document.getElementById('device-status-text');

        // Nếu cả hai phần tử DOM đều tồn tại trên trang
        if (badge && label) {
            if (isOnline) {
                // TRẠNG THÁI ONLINE:
                // - Gỡ bỏ class CSS 'offline' (huy hiệu sẽ có viền xanh, chấm tròn nhấp nháy xanh)
                badge.classList.remove('offline');
                // - Đặt nội dung chữ hiển thị là "ESP32 ONLINE"
                label.textContent = 'ESP32 ONLINE';
            } else {
                // TRẠNG THÁI OFFLINE:
                // - Thêm class CSS 'offline' (huy hiệu chuyển sang màu xám/đỏ, chấm tròn tắt nhấp nháy)
                badge.classList.add('offline');
                // - Đặt nội dung chữ hiển thị là "ESP32 OFFLINE"
                label.textContent = 'ESP32 OFFLINE';
            }
        }
    },

    // -------------------------------------------------------------------------
    // 2. HÀM KHỞI TẠO KẾT NỐI SOCKET VÀ ĐĂNG KÝ CÁC SỰ KIỆN LẮNG NGHE
    // -------------------------------------------------------------------------
    initConnection() {
        // Kiểm tra xem thư viện Socket.IO (thẻ script socket.io.min.js trong HTML) đã được nạp hay chưa
        if (typeof io !== 'undefined') {
            try {
                // Lấy URL máy chủ từ file app.config.js (nếu có), mặc định lấy origin hiện tại
                const backendUrl = window.APP_CONFIG?.BACKEND_URL || window.location.origin;

                // Khởi tạo kết nối Socket.IO tới Backend Server:
                // - reconnectionAttempts: 5 (nếu mất mạng, tự động thử kết nối lại tối đa 5 lần)
                // - timeout: 3000 (thời gian chờ tối đa 3 giây cho mỗi lần bắt tay kết nối)
                const socket = io(backendUrl, {
                    reconnectionAttempts: 5,
                    timeout: 3000
                });

                // Lưu đối tượng socket vào biến toàn cục để các hàm gửi lệnh (như device.component.js) sử dụng
                if (window.AppState) {
                    window.AppState.socket = socket;
                }

                // SỰ KIỆN 1: 'connect' - Kích hoạt khi bắt tay kết nối thành công với Backend Server
                socket.on('connect', () => {
                    // Chuyển đèn báo ESP32 trên giao diện sang trạng thái ONLINE
                    this.setDeviceOnlineStatus(true);
                });

                // SỰ KIỆN 2: 'disconnect' - Kích hoạt khi mất kết nối mạng hoặc máy chủ Backend tắt
                socket.on('disconnect', () => {
                    // Chuyển đèn báo ESP32 sang trạng thái OFFLINE
                    this.setDeviceOnlineStatus(false);
                });

                // SỰ KIỆN 3: 'sensor_data' - Lắng nghe gói tin số liệu đo đạc gửi định kỳ từ ESP32 qua MQTT
                // Dữ liệu data nhận được thường có cấu trúc:
                // { temperature: 30.2, humidity: 73.5, light_lux: 1800, device_id: 'ESP32_01' }
                socket.on('sensor_data', (data) => {
                    // Lấy thời gian hiện tại của hệ thống để gắn mốc đo
                    const now = new Date();
                    // Định dạng chuỗi giờ:phút:giây (VD: "14:05:09") với số 0 đệm đầu (padStart)
                    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                    // BƯỚC 3.1: Cập nhật giá trị hiển thị trên 3 thẻ tóm tắt của trang Dashboard
                    if (typeof updateDashboardMetrics === 'function') {
                        updateDashboardMetrics(data.temperature, data.humidity, data.light_lux);
                    }

                    // BƯỚC 3.2: Đẩy mốc dữ liệu mới vào biểu đồ đường thời gian thực (Chart.js)
                    if (typeof updateChartRealtime === 'function') {
                        updateChartRealtime(timeLabel, data.temperature, data.humidity, data.light_lux);
                    }

                    // BƯỚC 3.3: Tự động chèn thêm 1 dòng dữ liệu mới vào đầu bảng "Dữ liệu cảm biến"
                    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
                    if (typeof appendSensorRecord === 'function') {
                        appendSensorRecord({
                            id: Date.now(),
                            sensor: 'DHT22_01',
                            device: data.device_id || 'ESP32_01',
                            type: 'temperature',
                            value: `${data.temperature.toFixed(1)} °C`,
                            time: dateStr
                        });
                    }
                });

                // SỰ KIỆN 4: 'device_control_ack' - Phản hồi xác nhận lệnh (Acknowledgement) từ Backend/MQTT
                // Kích hoạt khi Backend đã gửi lệnh xuống ESP32 và nhận phản hồi thực thi phần cứng thành công/thất bại
                socket.on('device_control_ack', (data) => {
                    if (typeof handleDeviceControlAck === 'function') {
                        handleDeviceControlAck(data);
                    }
                });

                // SỰ KIỆN 5: 'device_status' - Đồng bộ trạng thái thiết bị đa người dùng / đa thiết bị
                // Nếu một người dùng khác hoặc công tắc vật lý tại chỗ thay đổi trạng thái đèn,
                // sự kiện này giúp công tắc trên giao diện của tất cả người dùng khác lập tức đồng bộ theo
                socket.on('device_status', (data) => {
                    if (typeof handleDeviceControlAck === 'function') {
                        handleDeviceControlAck({
                            target: data.target,
                            action: data.action || (data.state === 'ON' || data.state === true ? 'ON' : 'OFF'),
                            status: data.status || 'success',
                            requestId: data.requestId
                        });
                    } else if (data.target && window.AppState?.devices?.[data.target]) {
                        // Trường hợp dự phòng nếu không có hàm handleDeviceControlAck:
                        const dev = window.AppState.devices[data.target];
                        const chk = document.querySelector(`#${dev.elementId} input.toggle`);
                        if (chk) {
                            chk.checked = (data.state === 'ON' || data.state === true);
                            const item = document.getElementById(dev.elementId);
                            item?.classList.toggle('active', chk.checked);
                        }
                    }
                });

            } catch (e) {
                // Nếu xảy ra lỗi khởi tạo socket (ví dụ URL sai hoặc Backend chưa bật)
                console.warn('Backend chưa sẵn sàng, tự động chuyển sang chế độ mô phỏng dữ liệu.');
                // Kích hoạt bộ tạo dữ liệu dao động ngẫu nhiên để phục vụ kiểm thử giao diện
                this.startSimulatedTelemetry();
            }
        } else {
            // Trường hợp không nạp được thư viện Socket.IO (chạy offline hoàn toàn)
            this.startSimulatedTelemetry();
        }
    },

    // -------------------------------------------------------------------------
    // 3. BỘ MÔ PHỎNG DỮ LIỆU CẢM BIẾN THỜI GIAN THỰC (SIMULATED TELEMETRY GENERATOR)
    // -------------------------------------------------------------------------
    // Giúp Front-End hoạt động sinh động và hoàn chỉnh ngay cả khi chưa kết nối Backend hoặc ESP32.
    // Dữ liệu mô phỏng dao động mượt mà quanh các mốc thực tế của môi trường.
    startSimulatedTelemetry() {
        // Đặt đèn báo ESP32 sang ONLINE
        this.setDeviceOnlineStatus(true);

        // Khởi tạo các mốc giá trị môi trường ban đầu
        let currentTemp = 30.0;    // Nhiệt độ ban đầu 30.0 °C
        let currentHumid = 74.0;   // Độ ẩm ban đầu 74.0 %
        let currentLight = 1750;   // Ánh sáng ban đầu 1750 lux

        // Sử dụng setInterval để tạo nhịp chu kỳ cập nhật tự động mỗi 2.5 giây (2500 mili-giây)
        setInterval(() => {
            // Tạo mức dao động ngẫu nhiên tự nhiên (Brownian Noise / Random Walk):
            // - Nhiệt độ thay đổi trong khoảng +/- 0.2 °C mỗi nhịp
            currentTemp += (Math.random() - 0.48) * 0.4;
            // - Độ ẩm thay đổi trong khoảng +/- 0.3 % mỗi nhịp
            currentHumid += (Math.random() - 0.5) * 0.6;
            // - Cường độ ánh sáng thay đổi trong khoảng +/- 20 lux mỗi nhịp
            currentLight += Math.floor((Math.random() - 0.49) * 40);

            // Giới hạn biên (Clamping) để giá trị không bao giờ lệch ra ngoài ngưỡng thực tế của phòng thí nghiệm:
            // - Nhiệt độ luôn nằm trong khoảng 22 °C đến 38 °C
            currentTemp = Math.max(22, Math.min(38, currentTemp));
            // - Độ ẩm luôn nằm trong khoảng 40 % đến 95 %
            currentHumid = Math.max(40, Math.min(95, currentHumid));
            // - Cường độ ánh sáng luôn nằm trong khoảng 50 lux đến 3500 lux
            currentLight = Math.max(50, Math.min(3500, currentLight));

            // Lấy thời gian hiện tại của đồng hồ hệ thống
            const now = new Date();
            const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            // Cập nhật số liệu hiển thị trên 3 thẻ Dashboard
            if (typeof updateDashboardMetrics === 'function') {
                updateDashboardMetrics(currentTemp, currentHumid, currentLight);
            }

            // Cập nhật mốc mới lên biểu đồ Chart.js
            if (typeof updateChartRealtime === 'function') {
                updateChartRealtime(timeLabel, parseFloat(currentTemp.toFixed(1)), parseFloat(currentHumid.toFixed(1)), currentLight);
            }
        }, 2500); // 2500 ms = 2.5 giây
    }
};

// -----------------------------------------------------------------------------
// 4. XUẤT CÁC HÀM VÀ DỊCH VỤ RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Gán đối tượng SocketService và các phương thức rút gọn vào window
window.SocketService = SocketService;
window.setDeviceOnlineStatus = SocketService.setDeviceOnlineStatus.bind(SocketService);
window.initRealtimeConnection = SocketService.initConnection.bind(SocketService);
