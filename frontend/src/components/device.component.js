/**
 * Điều khiển Bật / Tắt thiết bị (Toggle Switch)
 * @param {string} itemId - ID phần tử thẻ giao diện (VD: 'devItem1')
 * @param {string} deviceKey - Khóa thiết bị (VD: 'LED_01')
 * @param {HTMLInputElement} checkbox - Thẻ input switch vừa được click
 */
function toggleDevice(itemId, deviceKey, checkbox) {
    const item = document.getElementById(itemId);
    const isChecked = checkbox ? checkbox.checked : false;

    if (isChecked) {
        item?.classList.add('active');
    } else {
        item?.classList.remove('active');
    }

    if (window.AppState && window.AppState.devices && window.AppState.devices[deviceKey]) {
        window.AppState.devices[deviceKey].state = isChecked;
    }

    const action = isChecked ? 'ON' : 'OFF';
    const devName = (window.AppState?.devices?.[deviceKey]?.name) || deviceKey;

    if (typeof showToast === 'function') {
        showToast(`Đã gửi lệnh ${action} tới ${devName}`, 'info');
    }

    if (window.AppState?.socket && window.AppState.socket.connected) {
        window.AppState.socket.emit('device_control', {
            target: deviceKey,
            action: action
        });
    }

    const now = new Date();
    const timeStr = `Hôm nay, ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    if (typeof appendControlLog === 'function') {
        appendControlLog({
            id: Date.now(),
            time: timeStr,
            device: `${devName} (${deviceKey})`,
            deviceId: 'ESP32_01',
            action: action,
            user: 'Đỗ Trọng Ninh',
            status: 'success'
        });
    }
}

window.toggleDevice = toggleDevice;
