// Điều khiển thiết bị ngoại vi (Device Control Component)

// Theo dõi cờ pending chống spam click cho từng thiết bị
const pendingDevices = {};

// Quản lý bộ đếm thời gian chờ phản hồi 5s của từng thiết bị
const controlTimeouts = {};

// Cập nhật trạng thái chờ lệnh trên giao diện (isPending: boolean)
function setDevicePendingState(itemId, deviceKey, isPending) {
    pendingDevices[deviceKey] = isPending;

    const item = document.getElementById(itemId);
    if (!item) return;

    const checkbox = item.querySelector('input.toggle');
    const pendingTag = item.querySelector('.device-pending-tag');

    if (isPending) {
        item.classList.add('is-pending');
        if (checkbox) {
            checkbox.disabled = true;
            checkbox.classList.add('pending');
        }
        if (pendingTag) {
            pendingTag.style.display = 'inline-flex';
        }
    } else {
        item.classList.remove('is-pending');
        if (checkbox) {
            checkbox.disabled = false;
            checkbox.classList.remove('pending');
        }
        if (pendingTag) {
            pendingTag.style.display = 'none';
        }
    }
}

// Điều khiển bật/tắt thiết bị với cơ chế Pessimistic UI và Timeout 5s
function toggleDevice(itemId, deviceKey, checkbox) {
    const item = document.getElementById(itemId);
    if (!item || !checkbox) return;

    // Chặn click nếu đang có lệnh chờ phản hồi
    if (pendingDevices[deviceKey]) {
        checkbox.checked = !checkbox.checked;
        return;
    }

    const desiredState = checkbox.checked;
    const originalState = !desiredState;

    // Giữ nguyên trạng thái cũ cho đến khi nhận được ACK xác nhận
    checkbox.checked = originalState;
    setDevicePendingState(itemId, deviceKey, true);

    const action = desiredState ? 'ON' : 'OFF';
    const devName = (window.AppState?.devices?.[deviceKey]?.name) || deviceKey;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const requestId = `cmd_${Date.now()}_${deviceKey}`;

    // Ghi nhật ký lịch sử ở trạng thái pending (Đang chờ)
    if (typeof appendControlLog === 'function') {
        appendControlLog({
            id: requestId,
            time: timeStr,
            device: devName,
            deviceId: 'ESP32_01',
            action: action,
            user: 'Đỗ Trọng Ninh',
            status: 'pending'
        });
    }

    // Thiết lập bộ đếm thời gian 5s: nếu quá 5s không có phản hồi thì tự động chuyển sang Thất bại
    if (controlTimeouts[deviceKey]) {
        clearTimeout(controlTimeouts[deviceKey]);
    }

    controlTimeouts[deviceKey] = setTimeout(() => {
        if (pendingDevices[deviceKey]) {
            console.warn(`[DeviceControl] Thiết bị ${deviceKey} không phản hồi sau 5s, chuyển trạng thái sang Thất bại.`);
            handleDeviceControlAck({
                target: deviceKey,
                action: action,
                status: 'failed',
                requestId: requestId,
                message: 'Hết thời gian chờ phản hồi từ thiết bị (5s)'
            });
        }
        delete controlTimeouts[deviceKey];
    }, 5000);

    // Gửi lệnh qua WebSocket nếu đang kết nối máy chủ
    if (window.AppState?.socket && window.AppState.socket.connected) {
        window.AppState.socket.emit('device_control', {
            target: deviceKey,
            action: action,
            requestId: requestId
        });
    }
}

// Xử lý phản hồi xác nhận lệnh (ACK) từ Backend/ESP32 hoặc do Timeout 5s
function handleDeviceControlAck(response) {
    if (!response || !response.target) return;

    const { target, action, status, requestId } = response;

    // Hủy bỏ bộ hẹn giờ timeout 5s nếu nhận được phản hồi trước thời hạn
    if (controlTimeouts[target]) {
        clearTimeout(controlTimeouts[target]);
        delete controlTimeouts[target];
    }

    const dev = window.AppState?.devices?.[target];
    const itemId = dev?.elementId || (target === 'LED_01' ? 'devItem1' : (target === 'LED_02' ? 'devItem2' : 'devItem3'));
    const item = document.getElementById(itemId);
    const checkbox = item?.querySelector('input.toggle');

    // Giải phóng trạng thái đang chờ
    setDevicePendingState(itemId, target, false);

    const isSuccess = (status === 'success');

    if (isSuccess) {
        const isTurnOn = (action === 'ON');
        if (checkbox) checkbox.checked = isTurnOn;
        if (item) item.classList.toggle('active', isTurnOn);

        if (window.AppState?.devices?.[target]) {
            window.AppState.devices[target].state = isTurnOn;
        }

        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'success');
        }
    } else {
        // Trường hợp thất bại (do lỗi hoặc quá 5s không phản hồi)
        const currentState = window.AppState?.devices?.[target]?.state ?? false;
        if (checkbox) checkbox.checked = currentState;
        if (item) item.classList.toggle('active', currentState);

        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'failed');
        }
    }
}

window.toggleDevice = toggleDevice;
window.handleDeviceControlAck = handleDeviceControlAck;
window.setDevicePendingState = setDevicePendingState;
