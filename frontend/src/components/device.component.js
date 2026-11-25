// Điều khiển thiết bị ngoại vi 

// Theo dõi cờ pending chống spam click cho từng thiết bị
const pendingDevices = {};

// Quản lý bộ đếm thời gian chờ phản hồi 5s của từng thiết bị
const controlTimeouts = {};

// Cập nhật trạng thái chờ lệnh trên giao diện
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

// Điều khiển bật/tắt thiết bị
function toggleDevice(itemId, deviceKey, checkbox) {
    const item = document.getElementById(itemId);
    if (!item || !checkbox) return;

    // Chặn click nếu đang có lệnh chờ phản hồi
    if (pendingDevices[deviceKey]) {
        checkbox.checked = !checkbox.checked;
        return;
    }

    const desiredState = checkbox.checked;
    const action = desiredState ? 'ON' : 'OFF';
    const devName = (window.AppState?.devices?.[deviceKey]?.name) || deviceKey;
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const requestId = `cmd_${Date.now()}_${deviceKey}`;


    checkbox.checked = !desiredState;
    setDevicePendingState(itemId, deviceKey, true);

    if (typeof appendControlLog === 'function') {
        appendControlLog({
            id: requestId,
            time: timeStr,
            device: devName,
            deviceId: deviceKey,
            action: action,
            user: 'Đỗ Trọng Ninh',
            status: 'pending'
        });
    }

    if (window.AppState?.socket && window.AppState.socket.connected) {
        window.AppState.socket.emit('device_control', {
            target: deviceKey,
            action: action,
            requestId: requestId
        });

        // Dự phòng timeout 5.5s nếu mất phản hồi từ Server/ESP32
        controlTimeouts[deviceKey] = setTimeout(() => {
            handleDeviceControlAck({
                target: deviceKey,
                action: action,
                status: 'failed',
                requestId: requestId
            });
        }, 5000);
    } else {
        // Chưa kết nối được Socket tới Back-end: báo thất bại ngay
        handleDeviceControlAck({
            target: deviceKey,
            action: action,
            status: 'failed',
            requestId: requestId
        });
    }
}

// Xử lý phản hồi xác nhận lệnh (ACK) từ Backend/ESP32 hoặc do Timeout
function handleDeviceControlAck(response) {
    if (!response || !response.target) return;

    const { target, action, status, requestId } = response;

    if (controlTimeouts[target]) {
        clearTimeout(controlTimeouts[target]);
        delete controlTimeouts[target];
    }

    const dev = window.AppState?.devices?.[target];
    const itemId = dev?.elementId || (target === 'LED_01' ? 'devItem1' : (target === 'LED_02' ? 'devItem2' : (target === 'LED_03' ? 'devItem3' : 'devItem4')));
    const item = document.getElementById(itemId);
    const checkbox = item?.querySelector('input.toggle');

    setDevicePendingState(itemId, target, false);

    const isSuccess = (status === 'success');

    if (isSuccess) {
        const isTurnOn = (action === 'ON');
        if (checkbox) checkbox.checked = isTurnOn;
        if (item) {
            item.classList.remove('offline');
            item.classList.toggle('active', isTurnOn);
        }

        if (window.AppState?.devices?.[target]) {
            window.AppState.devices[target].state = isTurnOn;
        }

        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'success');
        }
    } else {
        // Nếu thất bại do rút kết nối mạch: đưa về màu xám
        if (checkbox) checkbox.checked = false;
        if (item) {
            item.classList.remove('active');
            item.classList.add('offline');
        }

        if (window.AppState?.devices?.[target]) {
            window.AppState.devices[target].state = false;
        }

        if (typeof updateControlLogStatus === 'function') {
            updateControlLogStatus(requestId, 'failed');
        }
    }
}

window.toggleDevice = toggleDevice;
window.handleDeviceControlAck = handleDeviceControlAck;
window.setDevicePendingState = setDevicePendingState;
