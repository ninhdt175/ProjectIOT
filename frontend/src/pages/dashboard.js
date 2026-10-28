// Quản lý trang Dashboard (Dashboard Controller)
// Bao gồm: Cập nhật số đo, Cấu hình 3 ngưỡng cảm biến, Nháy đèn cảnh báo & Đếm số lần nháy đèn

// 1. Cấu hình mặc định cho 3 ngưỡng cảm biến
const DEFAULT_THRESHOLDS = {
    temperature: 30.0, // Ngưỡng Nhiệt độ (°C) -> Đèn LED 1
    humidity: 75.0,    // Ngưỡng Độ ẩm (%)      -> Đèn LED 2
    light: 1800        // Ngưỡng Ánh sáng (lux)  -> Đèn LED 3
};

// 2. Trạng thái ngưỡng hiện tại (Lưu trữ và đồng bộ qua LocalStorage)
let currentThresholds = { ...DEFAULT_THRESHOLDS };

// 3. Bộ đếm số lần nháy đèn tương ứng
let blinkCounters = {
    LED_01: 0,
    LED_02: 0,
    LED_03: 0
};

// 4. Theo dõi cờ nháy để tránh kích hoạt nháy chồng chéo
const blinkIntervals = {};

// Khôi phục ngưỡng và bộ đếm số lần nháy từ LocalStorage
function loadThresholdsAndCounters() {
    try {
        const savedThresh = localStorage.getItem('iot_sensor_thresholds');
        if (savedThresh) {
            currentThresholds = Object.assign({}, DEFAULT_THRESHOLDS, JSON.parse(savedThresh));
        }

        const savedCounters = localStorage.getItem('iot_blink_counters');
        if (savedCounters) {
            blinkCounters = Object.assign({ LED_01: 0, LED_02: 0, LED_03: 0 }, JSON.parse(savedCounters));
        }
    } catch (e) {
        console.warn('[Dashboard] Lỗi tải dữ liệu ngưỡng:', e);
    }

    // Hiển thị ngưỡng lên các ô Input và Thẻ đo
    syncThresholdInputsUI();
    updateBlinkCountersUI();
}

// Đồng bộ giá trị ngưỡng lên giao diện
function syncThresholdInputsUI() {
    const inputTemp = document.getElementById('input-thresh-temp');
    const inputHumid = document.getElementById('input-thresh-humid');
    const inputLight = document.getElementById('input-thresh-light');

    if (inputTemp) inputTemp.value = currentThresholds.temperature;
    if (inputHumid) inputHumid.value = currentThresholds.humidity;
    if (inputLight) inputLight.value = currentThresholds.light;

    const cardTemp = document.getElementById('thresh-val-temp-card');
    const cardHumid = document.getElementById('thresh-val-humid-card');
    const cardLight = document.getElementById('thresh-val-light-card');

    if (cardTemp) cardTemp.textContent = currentThresholds.temperature.toFixed(1);
    if (cardHumid) cardHumid.textContent = currentThresholds.humidity.toFixed(1);
    if (cardLight) cardLight.textContent = Math.round(currentThresholds.light);
}

// Cập nhật số lần nháy đèn lên các Badge hiển thị
function updateBlinkCountersUI() {
    // 1. Cập nhật trên 3 box Thiết bị kết nối
    const b1 = document.getElementById('blink-count-LED_01');
    const b2 = document.getElementById('blink-count-LED_02');
    const b3 = document.getElementById('blink-count-LED_03');

    if (b1) b1.textContent = blinkCounters.LED_01;
    if (b2) b2.textContent = blinkCounters.LED_02;
    if (b3) b3.textContent = blinkCounters.LED_03;

    // 2. Cập nhật trên Card Thống kê ngưỡng
    const s1 = document.getElementById('stat-blink-LED_01');
    const s2 = document.getElementById('stat-blink-LED_02');
    const s3 = document.getElementById('stat-blink-LED_03');

    if (s1) s1.textContent = `${blinkCounters.LED_01} lần`;
    if (s2) s2.textContent = `${blinkCounters.LED_02} lần`;
    if (s3) s3.textContent = `${blinkCounters.LED_03} lần`;

    // Lưu vào LocalStorage
    try {
        localStorage.setItem('iot_blink_counters', JSON.stringify(blinkCounters));
    } catch (e) {}
}

// Lưu 3 ngưỡng do người dùng thiết lập
function saveThresholds() {
    const inputTemp = document.getElementById('input-thresh-temp');
    const inputHumid = document.getElementById('input-thresh-humid');
    const inputLight = document.getElementById('input-thresh-light');

    const temp = parseFloat(inputTemp?.value);
    const humid = parseFloat(inputHumid?.value);
    const light = parseFloat(inputLight?.value);

    if (isNaN(temp) || isNaN(humid) || isNaN(light)) {
        if (typeof showToast === 'function') {
            showToast('Vui lòng nhập giá trị số hợp lệ cho cả 3 ngưỡng!', 'error');
        }
        return;
    }

    currentThresholds.temperature = temp;
    currentThresholds.humidity = humid;
    currentThresholds.light = light;

    try {
        localStorage.setItem('iot_sensor_thresholds', JSON.stringify(currentThresholds));
    } catch (e) {}

    syncThresholdInputsUI();

    if (typeof showToast === 'function') {
        showToast(`Đã lưu ngưỡng cảnh báo: Nhiệt độ > ${temp}°C, Độ ẩm > ${humid}%, Ánh sáng > ${light} lux`, 'success');
    }
}

// Đặt lại toàn bộ bộ đếm số lần nháy về 0
function resetBlinkCounters() {
    blinkCounters.LED_01 = 0;
    blinkCounters.LED_02 = 0;
    blinkCounters.LED_03 = 0;

    updateBlinkCountersUI();

    if (typeof showToast === 'function') {
        showToast('Đã đặt lại bộ đếm số lần nháy của cả 3 đèn về 0!', 'info');
    }
}

// Kích hoạt hiệu ứng nháy đèn trên giao diện và tăng bộ đếm
function triggerDeviceBlink(deviceKey, elementId) {
    const item = document.getElementById(elementId);
    if (!item) return;

    // Tăng bộ đếm số lần nháy
    blinkCounters[deviceKey] = (blinkCounters[deviceKey] || 0) + 1;
    updateBlinkCountersUI();

    // Thêm class nháy hiệu ứng
    item.classList.add('is-blinking');

    // Tự động gỡ bỏ sau 1.8 giây nếu không tiếp tục vượt ngưỡng
    if (blinkIntervals[deviceKey]) {
        clearTimeout(blinkIntervals[deviceKey]);
    }

    blinkIntervals[deviceKey] = setTimeout(() => {
        item.classList.remove('is-blinking');
        delete blinkIntervals[deviceKey];
    }, 1800);

    // Bắn sự kiện WebSocket xuống máy chủ & ESP32 nếu có kết nối
    if (window.AppState?.socket && window.AppState.socket.connected) {
        window.AppState.socket.emit('device_blink', {
            target: deviceKey,
            count: blinkCounters[deviceKey]
        });
    }
}

// Kiểm tra các giá trị đo với 3 ngưỡng cài đặt
function checkSensorThresholds(temp, humid, light) {
    // 1. Kiểm tra Nhiệt độ -> Đèn LED 1
    if (typeof temp === 'number' && !isNaN(temp)) {
        const isTempExceeded = temp > currentThresholds.temperature;
        const boxTemp = document.getElementById('thresh-box-temp');
        const statusTemp = document.getElementById('thresh-status-temp');

        if (boxTemp) boxTemp.classList.toggle('is-exceeded', isTempExceeded);
        if (statusTemp) {
            statusTemp.className = `thresh-status-badge ${isTempExceeded ? 'exceeded' : 'normal'}`;
            statusTemp.innerHTML = isTempExceeded 
                ? '<i class="ph-bold ph-warning"></i> VƯỢT NGƯỠNG' 
                : '<i class="ph ph-check-circle"></i> An toàn';
        }

        if (isTempExceeded) {
            triggerDeviceBlink('LED_01', 'devItem1');
        }
    }

    // 2. Kiểm tra Độ ẩm -> Đèn LED 2
    if (typeof humid === 'number' && !isNaN(humid)) {
        const isHumidExceeded = humid > currentThresholds.humidity;
        const boxHumid = document.getElementById('thresh-box-humid');
        const statusHumid = document.getElementById('thresh-status-humid');

        if (boxHumid) boxHumid.classList.toggle('is-exceeded', isHumidExceeded);
        if (statusHumid) {
            statusHumid.className = `thresh-status-badge ${isHumidExceeded ? 'exceeded' : 'normal'}`;
            statusHumid.innerHTML = isHumidExceeded 
                ? '<i class="ph-bold ph-warning"></i> VƯỢT NGƯỠNG' 
                : '<i class="ph ph-check-circle"></i> An toàn';
        }

        if (isHumidExceeded) {
            triggerDeviceBlink('LED_02', 'devItem2');
        }
    }

    // 3. Kiểm tra Ánh sáng -> Đèn LED 3
    if (typeof light === 'number' && !isNaN(light)) {
        const isLightExceeded = light > currentThresholds.light;
        const boxLight = document.getElementById('thresh-box-light');
        const statusLight = document.getElementById('thresh-status-light');

        if (boxLight) boxLight.classList.toggle('is-exceeded', isLightExceeded);
        if (statusLight) {
            statusLight.className = `thresh-status-badge ${isLightExceeded ? 'exceeded' : 'normal'}`;
            statusLight.innerHTML = isLightExceeded 
                ? '<i class="ph-bold ph-warning"></i> VƯỢT NGƯỠNG' 
                : '<i class="ph ph-check-circle"></i> An toàn';
        }

        if (isLightExceeded) {
            triggerDeviceBlink('LED_03', 'devItem3');
        }
    }
}

// Cập nhật số liệu lên 3 thẻ cảm biến & kích hoạt kiểm tra ngưỡng
function updateDashboardMetrics(temp, humid, light) {
    const tempEl = document.getElementById('metric-temp');
    const humidEl = document.getElementById('metric-humid');
    const lightEl = document.getElementById('metric-light');

    if (tempEl && typeof temp === 'number' && !isNaN(temp)) {
        tempEl.innerHTML = `${temp.toFixed(1)} <span class="unit-label">°C</span>`;
    }

    if (humidEl && typeof humid === 'number' && !isNaN(humid)) {
        humidEl.innerHTML = `${humid.toFixed(1)} <span class="unit-label">%</span>`;
    }

    if (lightEl && typeof light === 'number' && !isNaN(light)) {
        lightEl.innerHTML = `${Math.round(light)} <span class="unit-label">lux</span>`;
    }

    // Kiểm tra ngưỡng và kích hoạt nháy đèn + đếm số lần
    checkSensorThresholds(temp, humid, light);
}

document.addEventListener('DOMContentLoaded', () => {
    loadThresholdsAndCounters();
    if (typeof initEnvironmentChart === 'function') {
        initEnvironmentChart();
    }
});

// Đồng bộ số lần nháy đèn ghi nhận từ phần cứng ESP32
function updateHardwareBlinkCounters(b1, b2, b3) {
    let changed = false;
    if (typeof b1 === 'number' && b1 > blinkCounters.LED_01) { blinkCounters.LED_01 = b1; changed = true; }
    if (typeof b2 === 'number' && b2 > blinkCounters.LED_02) { blinkCounters.LED_02 = b2; changed = true; }
    if (typeof b3 === 'number' && b3 > blinkCounters.LED_03) { blinkCounters.LED_03 = b3; changed = true; }
    if (changed) updateBlinkCountersUI();
}

window.updateHardwareBlinkCounters = updateHardwareBlinkCounters;
window.updateDashboardMetrics = updateDashboardMetrics;
window.saveThresholds = saveThresholds;
window.resetBlinkCounters = resetBlinkCounters;
window.triggerDeviceBlink = triggerDeviceBlink;
window.checkSensorThresholds = checkSensorThresholds;
