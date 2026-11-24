// Quản lý trang Dashboard (Dashboard Controller)

// Cập nhật số liệu lên 4 thẻ cảm biến (Nhiệt độ, Độ ẩm, Ánh sáng, Oxy)
function updateDashboardMetrics(temp, humid, light, oxygen) {
    const tempEl = document.getElementById('metric-temp');
    const humidEl = document.getElementById('metric-humid');
    const lightEl = document.getElementById('metric-light');
    const oxygenEl = document.getElementById('metric-oxygen');

    if (tempEl && typeof temp === 'number' && !isNaN(temp)) {
        tempEl.innerHTML = `${temp.toFixed(1)} <span class="unit-label">°C</span>`;
    }

    if (humidEl && typeof humid === 'number' && !isNaN(humid)) {
        humidEl.innerHTML = `${humid.toFixed(1)} <span class="unit-label">%</span>`;
    }

    if (lightEl && typeof light === 'number' && !isNaN(light)) {
        lightEl.innerHTML = `${Math.round(light)} <span class="unit-label">lux</span>`;
    }

    if (oxygenEl && typeof oxygen === 'number' && !isNaN(oxygen)) {
        oxygenEl.innerHTML = `${oxygen.toFixed(1)} <span class="unit-label">%</span>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initEnvironmentChart === 'function') {
        initEnvironmentChart();
    }
});

window.updateDashboardMetrics = updateDashboardMetrics;
