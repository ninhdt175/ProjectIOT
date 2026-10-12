// =============================================================================
// TẬP TIN: device.component.js
// VAI TRÒ: QUẢN LÝ ĐIỀU KHIỂN THIẾT BỊ NGOẠI VI (Device Control Component)
// MÔ TẢ:
//   Tập tin này xử lý toàn bộ logic tương tác bật/tắt thiết bị (LED 1, LED 2, LED 3):
//   1. Áp dụng cơ chế điều khiển "Bi quan" (Pessimistic UI Toggle):
//      Khi người dùng gạt công tắc, Front-End CHƯA bật ngay mà giữ nguyên trạng thái cũ,
//      hiển thị hiệu ứng "Đang chờ" (Pending) và gửi lệnh tới Backend/ESP32.
//   2. Chống spam click: Vô hiệu hóa nút gạt trong khi lệnh đang chờ xử lý.
//   3. Tự động ghi nhận một bản ghi trạng thái 'pending' vào bảng lịch sử điều khiển.
//   4. Lắng nghe gói tin xác nhận (ACK - Acknowledgement) từ vi điều khiển:
//      - Nếu THÀNH CÔNG: Mới chính thức gạt công tắc sang trạng thái mới và đổi nhãn lịch sử sang 'Thành công'.
//      - Nếu THẤT BẠI: Giữ nguyên trạng thái cũ và đổi nhãn lịch sử sang 'Thất bại'.
//   5. Hỗ trợ cơ chế Mock ACK dự phòng (tự động phản hồi sau 800ms) khi chạy Front-End độc lập.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. BIẾN THEO DÕI TRẠNG THÁI ĐANG XỬ LÝ (PENDING STATE REGISTRY)
// -----------------------------------------------------------------------------
// pendingDevices là đối tượng từ điển (Object Dictionary):
// Lưu trữ cờ boolean đánh dấu thiết bị nào đang trong quá trình gửi lệnh:
// Ví dụ: { LED_01: true, LED_02: false }
// Dùng để ngăn người dùng bấm liên tục gây tràn hàng đợi lệnh trên vi điều khiển.
const pendingDevices = {};

// -----------------------------------------------------------------------------
// 2. HÀM CẬP NHẬT TRẠNG THÁI GIAO DIỆN "ĐANG CHỜ" (SET DEVICE PENDING STATE)
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - itemId (string): ID của thẻ div bao quanh thiết bị trên giao diện HTML (VD: 'devItem1', 'devItem2').
// - deviceKey (string): Khóa định danh của thiết bị trong hệ thống (VD: 'LED_01', 'LED_02').
// - isPending (boolean): true = Bắt đầu chờ phản hồi, false = Đã xử lý xong phản hồi.
function setDevicePendingState(itemId, deviceKey, isPending) {
    // 1. Cập nhật cờ vào từ điển theo dõi
    pendingDevices[deviceKey] = isPending;

    // 2. Tìm thẻ card của thiết bị trong cây DOM
    const item = document.getElementById(itemId);
    if (!item) return;

    // 3. Tìm thẻ input công tắc (checkbox toggle) và nhãn báo "Đang xử lý..."
    const checkbox = item.querySelector('input.toggle');
    const pendingTag = item.querySelector('.device-pending-tag');

    // 4. Cập nhật thuộc tính và class CSS tùy theo trạng thái isPending:
    if (isPending) {
        // KHI BẮT ĐẦU CHỜ:
        item.classList.add('is-pending'); // Thêm hiệu ứng viền sáng/mờ nhẹ cho thẻ card
        if (checkbox) {
            checkbox.disabled = true;           // Khóa không cho người dùng click tiếp
            checkbox.classList.add('pending');  // Thêm class pending cho switch
        }
        if (pendingTag) {
            pendingTag.style.display = 'inline-flex'; // Hiển thị badge icon quay "Đang xử lý..."
        }
    } else {
        // KHI ĐÃ HOÀN TẤT:
        item.classList.remove('is-pending'); // Gỡ bỏ hiệu ứng chờ
        if (checkbox) {
            checkbox.disabled = false;             // Mở khóa cho phép click lần sau
            checkbox.classList.remove('pending');  // Gỡ bỏ class pending
        }
        if (pendingTag) {
            pendingTag.style.display = 'none';     // Ẩn badge "Đang xử lý..."
        }
    }
}

// -----------------------------------------------------------------------------
// 3. HÀM ĐIỀU KHIỂN BẬT / TẮT THIẾT BỊ KÈM TRẠNG THÁI ĐANG CHỜ (TOGGLE DEVICE)
// -----------------------------------------------------------------------------
// Hàm này được gắn trực tiếp vào sự kiện onclick / onchange của thẻ <input type="checkbox" class="toggle">
// Tham số đầu vào:
// - itemId (string): ID của khối HTML card chứa thiết bị (VD: 'devItem1').
// - deviceKey (string): Mã thiết bị cần điều khiển (VD: 'LED_01').
// - checkbox (HTMLInputElement): Thẻ input switch người dùng vừa click vào.
function toggleDevice(itemId, deviceKey, checkbox) {
    const item = document.getElementById(itemId);
    // Kiểm tra an toàn: nếu không tìm thấy phần tử DOM thì dừng lại
    if (!item || !checkbox) return;

    // KIỂM TRA CHỐNG SPAM:
    // Nếu thiết bị này đang có một lệnh trước đó đang chờ phản hồi (pending = true),
    // ta lập tức đảo ngược lại trạng thái checkbox và dừng lại, không xử lý tiếp.
    if (pendingDevices[deviceKey]) {
        checkbox.checked = !checkbox.checked;
        return;
    }

    // XÁC ĐỊNH TRẠNG THÁI MONG MUỐN VÀ TRẠNG THÁI CŨ:
    // desiredState: Trạng thái người dùng mong muốn đạt tới (true nếu muốn BẬT, false nếu muốn TẮT)
    const desiredState = checkbox.checked;
    // originalState: Trạng thái ban đầu trước khi người dùng click
    const originalState = !desiredState;

    // BƯỚC 1: CƠ CHẾ GIAO DIỆN BI QUAN (PESSIMISTIC TOGGLE)
    // Ngay lập tức đặt lại giá trị checkbox về trạng thái cũ (originalState).
    // Nghĩa là nút gạt chưa hề đổi màu hay di chuyển, đảm bảo trung thực với trạng thái thực tế của phần cứng.
    checkbox.checked = originalState;

    // BƯỚC 2: KÍCH HOẠT TRẠNG THÁI "ĐANG CHỜ" TRÊN GIAO DIỆN
    // Khóa nút switch và hiện badge icon quay tròn "Đang xử lý..."
    setDevicePendingState(itemId, deviceKey, true);

    // BƯỚC 3: CHUẨN BỊ THÔNG TIN GÓI TIN ĐIỀU KHIỂN
    // action: Chuỗi hành động ('ON' hoặc 'OFF')
    const action = desiredState ? 'ON' : 'OFF';
    // devName: Tên tiếng Việt thân thiện của thiết bị lấy từ AppState (VD: "Đèn LED 1")
    const devName = (window.AppState?.devices?.[deviceKey]?.name) || deviceKey;
    // Lấy thời gian thực hiện thao tác
    const now = new Date();
    const timeStr = `Hôm nay, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    // requestId: Mã định danh duy nhất của lượt điều khiển (kết hợp timestamp và mã thiết bị)
    // Giúp phân biệt chính xác gói tin phản hồi ACK từ máy chủ thuộc về yêu cầu nào
    const requestId = `cmd_${Date.now()}_${deviceKey}`;

    // BƯỚC 4: GHI BẢN GHI VÀO TRANG "LỊCH SỬ ĐIỀU KHIỂN" Ở TRẠNG THÁI 'PENDING'
    // Giúp người dùng theo dõi được ngay lập tức lệnh vừa bấm đang được hệ thống tiếp nhận
    if (typeof appendControlLog === 'function') {
        appendControlLog({
            id: requestId,
            time: timeStr,
            device: `${devName} (${deviceKey})`,
            deviceId: 'ESP32_01',
            action: action,
            user: 'Đỗ Trọng Ninh',
            status: 'pending' // Ban đầu đặt là 'pending' (Đang chờ)
        });
    }

    // BƯỚC 5: PHÁT GÓI TIN ĐIỀU KHIỂN TỚI BACKEND QUA KÊNH WEBSOCKET
    let hasSentViaSocket = false;
    // Kiểm tra xem socket đã kết nối với máy chủ Backend chưa
    if (window.AppState?.socket && window.AppState.socket.connected) {
        // Gửi sự kiện 'device_control' kèm thông tin thiết bị đích, hành động và mã requestId
        window.AppState.socket.emit('device_control', {
            target: deviceKey,
            action: action,
            requestId: requestId
        });
        hasSentViaSocket = true;
    }

    // BƯỚC 6: CƠ CHẾ MOCK ACK DỰ PHÒNG KHI CHƯA CHẠY BACKEND
    // Nếu chưa có kết nối socket thực tế, sau 800 mili-giây ta tự động gọi hàm phản hồi thành công
    // để người dùng dễ dàng kiểm tra hoạt ảnh (animation) và giao diện trực quan
    if (!hasSentViaSocket) {
        setTimeout(() => {
            handleDeviceControlAck({
                target: deviceKey,
                action: action,
                status: 'success',
                requestId: requestId
            });
        }, 800);
    }
}

// -----------------------------------------------------------------------------
// 4. HÀM XỬ LÝ PHẢN HỒI XÁC NHẬN LỆNH (HANDLE DEVICE CONTROL ACK)
// -----------------------------------------------------------------------------
// Hàm này được kích hoạt khi Backend hoặc MQTT Broker gửi phản hồi xác nhận:
// Cấu trúc đối tượng response:
// {
//     target: 'LED_01',             // Khóa thiết bị
//     action: 'ON' | 'OFF',         // Hành động thực hiện
//     status: 'success' | 'failed', // Trạng thái thực thi phần cứng
//     requestId: 'cmd_172450...'    // Mã định danh tương ứng của lệnh gửi
// }
function handleDeviceControlAck(response) {
    // Kiểm tra tính hợp lệ của gói tin phản hồi
    if (!response || !response.target) return;

    // Trích xuất các trường dữ liệu từ response
    const { target, action, status, requestId } = response;
    // Lấy thông tin thiết bị trong bộ nhớ AppState
    const dev = window.AppState?.devices?.[target];
    // Xác định ID thẻ HTML tương ứng
    const itemId = dev?.elementId || (target === 'LED_01' ? 'devItem1' : (target === 'LED_02' ? 'devItem2' : 'devItem3'));
    const item = document.getElementById(itemId);
    const checkbox = item?.querySelector('input.toggle');

    // BƯỚC 1: TẮT TRẠNG THÁI "ĐANG CHỜ" TRÊN GIAO DIỆN
    // Mở khóa lại nút bấm và ẩn badge "Đang xử lý..."
    setDevicePendingState(itemId, target, false);

    // Kiểm tra xem phần cứng thực thi lệnh có thành công không
    const isSuccess = (status === 'success');

    if (isSuccess) {
        // TRƯỜNG HỢP 1: ĐIỀU KHIỂN THÀNH CÔNG
        const isTurnOn = (action === 'ON');

        // 1.1. Chuyển nút gạt checkbox sang trạng thái mới (true nếu ON, false nếu OFF)
        if (checkbox) checkbox.checked = isTurnOn;

        // 1.2. Thêm hoặc bỏ class 'active' trên thẻ card để đổi màu sắc/đèn sáng
        if (item) item.classList.toggle('active', isTurnOn);

        // 1.3. Lưu trạng thái mới vào bộ nhớ trạng thái toàn cục AppState
        if (window.AppState?.devices?.[target]) {
            window.AppState.devices[target].state = isTurnOn;
        }

        // 1.4. Tìm dòng lệnh tương ứng trong bảng "Lịch sử điều khiển" và đổi nhãn sang "Thành công" (xanh lá)
        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'success');
        }
    } else {
        // TRƯỜNG HỢP 2: ĐIỀU KHIỂN THẤT BẠI (Do vi điều khiển bị treo, mất nguồn hoặc lỗi GPIO)
        // 2.1. Lấy trạng thái lưu trữ cũ trước đó
        const currentState = window.AppState?.devices?.[target]?.state ?? false;

        // 2.2. Giữ nguyên công tắc và thẻ card ở trạng thái cũ, KHÔNG bật/tắt
        if (checkbox) checkbox.checked = currentState;
        if (item) item.classList.toggle('active', currentState);

        // 2.3. Cập nhật nhãn dòng lệnh trong bảng "Lịch sử điều khiển" sang "Thất bại" (màu đỏ)
        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'failed');
        }
    }
}

// -----------------------------------------------------------------------------
// 5. XUẤT CÁC HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Cho phép file HTML và các module khác gọi trực tiếp
window.toggleDevice = toggleDevice;
window.handleDeviceControlAck = handleDeviceControlAck;
window.setDevicePendingState = setDevicePendingState;
