// Bảng lưu trữ trạng thái đang xử lý (pending) của các thiết bị để chống spam click
const pendingDevices = {};

/**
 * Đặt trạng thái visual Đang chờ (Pending State) cho thiết bị
 * @param {string} itemId - ID của phần tử thiết bị (VD: 'devItem1')
 * @param {string} deviceKey - Khóa thiết bị (VD: 'LED_01')
 * @param {boolean} isPending - true nếu đang chờ phản hồi, false nếu đã xong
 */
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

/**
 * Điều khiển Bật / Tắt thiết bị (Toggle Switch) kèm trạng thái Đang chờ (Pending)
 * Cơ chế: Giữ nguyên trạng thái cũ cho đến khi Backend xác nhận thành công mới bật/tắt
 * @param {string} itemId - ID phần tử thẻ giao diện (VD: 'devItem1')
 * @param {string} deviceKey - Khóa thiết bị (VD: 'LED_01')
 * @param {HTMLInputElement} checkbox - Thẻ input switch vừa được click
 */
function toggleDevice(itemId, deviceKey, checkbox) {
    const item = document.getElementById(itemId);
    if (!item || !checkbox) return;

    // Chặn người dùng click liên tục khi thiết bị đang xử lý lệnh
    if (pendingDevices[deviceKey]) {
        checkbox.checked = !checkbox.checked;
        return;
    }

    // Trạng thái người dùng mong muốn chuyển tới (true: BẬT, false: TẮT)
    const desiredState = checkbox.checked;
    // Trạng thái hiện tại trước khi click
    const originalState = !desiredState;

    // 1. Giữ nguyên trạng thái hiện tại trên switch (chưa bật/tắt vội)
    checkbox.checked = originalState;

    // 2. Kích hoạt giao diện trạng thái "Đang chờ" (Pending)
    setDevicePendingState(itemId, deviceKey, true);

    const action = desiredState ? 'ON' : 'OFF';
    const devName = (window.AppState?.devices?.[deviceKey]?.name) || deviceKey;
    const now = new Date();
    const timeStr = `Hôm nay, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const requestId = `cmd_${Date.now()}_${deviceKey}`;

    // 3. Ghi một bản ghi nhật ký điều khiển ở trạng thái 'pending' (Đang chờ)
    if (typeof appendControlLog === 'function') {
        appendControlLog({
            id: requestId,
            time: timeStr,
            device: `${devName} (${deviceKey})`,
            deviceId: 'ESP32_01',
            action: action,
            user: 'Đỗ Trọng Ninh',
            status: 'pending'
        });
    }

    // 4. Phát lệnh điều khiển tới Backend qua WebSocket
    let hasSentViaSocket = false;
    if (window.AppState?.socket && window.AppState.socket.connected) {
        window.AppState.socket.emit('device_control', {
            target: deviceKey,
            action: action,
            requestId: requestId
        });
        hasSentViaSocket = true;
    }

    // 5. Cơ chế Mock ACK dự phòng khi chưa kết nối Backend:
    // Tự động phản hồi thành công sau 800ms để kiểm thử trực quan trên giao diện
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

/**
 * Xử lý phản hồi xác nhận lệnh (ACK) từ Backend Server hoặc MQTT Broker
 * @param {Object} response - { target: 'LED_01', action: 'ON'|'OFF', status: 'success'|'failed', requestId: string }
 */
function handleDeviceControlAck(response) {
    if (!response || !response.target) return;
    const { target, action, status, requestId } = response;
    const dev = window.AppState?.devices?.[target];
    const itemId = dev?.elementId || (target === 'LED_01' ? 'devItem1' : (target === 'LED_02' ? 'devItem2' : 'devItem3'));
    const item = document.getElementById(itemId);
    const checkbox = item?.querySelector('input.toggle');

    // 1. Tắt trạng thái visual "Đang chờ"
    setDevicePendingState(itemId, target, false);

    const isSuccess = (status === 'success');

    if (isSuccess) {
        // NẾU THÀNH CÔNG: Chuyển công tắc và giao diện sang trạng thái mới
        const isTurnOn = (action === 'ON');
        if (checkbox) checkbox.checked = isTurnOn;
        if (item) item.classList.toggle('active', isTurnOn);

        if (window.AppState?.devices?.[target]) {
            window.AppState.devices[target].state = isTurnOn;
        }

        // Cập nhật trạng thái trong bảng lịch sử sang 'success'
        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'success');
        }
    } else {
        // NẾU THẤT BẠI: Giữ nguyên trạng thái cũ, không bật/tắt
        const currentState = window.AppState?.devices?.[target]?.state ?? false;
        if (checkbox) checkbox.checked = currentState;
        if (item) item.classList.toggle('active', currentState);

        // Cập nhật trạng thái trong bảng lịch sử sang 'failed'
        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'failed');
        }
    }
}

// Xuất các hàm điều khiển thiết bị ra phạm vi toàn cục
window.toggleDevice = toggleDevice;
window.handleDeviceControlAck = handleDeviceControlAck;
window.setDevicePendingState = setDevicePendingState;

