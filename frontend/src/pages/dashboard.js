/**
 * Cập nhật số liệu cảm biến lên 3 thẻ thống kê trên Dashboard (Nhiệt độ, Độ ẩm, Ánh sáng)
 * @param {number} temp - Nhiệt độ (°C)
 * @param {number} humid - Độ ẩm (%)
 * @param {number} light - Cường độ ánh sáng (lux)
 */
function updateDashboardMetrics(temp, humid, light) {
    const tempEl = document.getElementById('metric-temp');
    const humidEl = document.getElementById('metric-humid');
    const lightEl = document.getElementById('metric-light');

    // Cập nhật thẻ Nhiệt độ (lấy 1 chữ số thập phân)
    if (tempEl && typeof temp === 'number' && !isNaN(temp)) {
        tempEl.innerHTML = `${temp.toFixed(1)} <span class="unit-label">°C</span>`;
    }

    // Cập nhật thẻ Độ ẩm (lấy 1 chữ số thập phân)
    if (humidEl && typeof humid === 'number' && !isNaN(humid)) {
        humidEl.innerHTML = `${humid.toFixed(1)} <span class="unit-label">%</span>`;
    }

    // Cập nhật thẻ Ánh sáng (làm tròn số nguyên)
    if (lightEl && typeof light === 'number' && !isNaN(light)) {
        lightEl.innerHTML = `${Math.round(light)} <span class="unit-label">lux</span>`;
    }
}

// Khởi tạo đồ thị môi trường khi trang tải xong
document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEnvironmentChart === 'function') {
        initEnvironmentChart();
    }
});

// Xuất hàm cập nhật chỉ số ra phạm vi toàn cục
window.updateDashboardMetrics = updateDashboardMetrics;

