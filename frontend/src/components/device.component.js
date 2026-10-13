// Điều khiển thiết bị ngoại vi (Device Control Component)

// Theo dõi cờ pending chống spam click
const pendingDevices = {};

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

// Điều khiển bật/tắt thiết bị với cơ chế Pessimistic UI
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

    // Giữ nguyên trạng thái cũ cho đến khi nhận được ACK
    checkbox.checked = originalState;
    setDevicePendingState(itemId, deviceKey, true);

    const action = desiredState ? 'ON' : 'OFF';
    const devName = (window.AppState?.devices?.[deviceKey]?.name) || deviceKey;
    const now = new Date();
    const timeStr = `Hôm nay, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const requestId = `cmd_${Date.now()}_${deviceKey}`;

    // Ghi nhật ký ở trạng thái pending
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

    // Gửi lệnh qua WebSocket
    let hasSentViaSocket = false;
    if (window.AppState?.socket && window.AppState.socket.connected) {
        window.AppState.socket.emit('device_control', {
            target: deviceKey,
            action: action,
            requestId: requestId
        });
        hasSentViaSocket = true;
    }

    // Mock ACK dự phòng sau 800ms nếu chưa kết nối Backend
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

// Xử lý phản hồi xác nhận lệnh (ACK) từ Backend/ESP32
function handleDeviceControlAck(response) {
    if (!response || !response.target) return;

    const { target, action, status, requestId } = response;
    const dev = window.AppState?.devices?.[target];
    const itemId = dev?.elementId || (target === 'LED_01' ? 'devItem1' : (target === 'LED_02' ? 'devItem2' : 'devItem3'));
    const item = document.getElementById(itemId);
    const checkbox = item?.querySelector('input.toggle');

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
