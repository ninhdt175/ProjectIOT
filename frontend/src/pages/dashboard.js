/**
 * Cập nhật số liệu cảm biến lên các thẻ hiển thị trên Dashboard
 * @param {number} temp - Nhiệt độ (°C)
 * @param {number} humid - Độ ẩm (%)
 * @param {number} light - Cường độ ánh sáng (lux)
 */
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
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEnvironmentChart === 'function') {
        initEnvironmentChart();
    }
});

window.updateDashboardMetrics = updateDashboardMetrics;
