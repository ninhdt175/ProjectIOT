// Biểu đồ môi trường thời gian thực (4 Biểu đồ riêng biệt theo thiết kế)
let chartTemp = null;
let chartHumid = null;
let chartLight = null;
let chartOxygen = null;

const OFFLINE_CHART_LABELS = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Bây giờ'];
const OFFLINE_CHART_DATA = {
    temp: [26.0, 25.2, 27.5, 31.0, 32.4, 30.5, 30.0],
    humid: [75.0, 78.0, 70.0, 60.0, 62.5, 70.0, 74.0],
    light: [120, 105, 850, 2400, 2200, 1500, 1750],
    oxygen: [20.9, 20.8, 21.0, 20.9, 21.1, 20.8, 20.9]
};

// Hàm tiện ích tạo cấu hình biểu đồ đơn lẻ
function createSingleLineChart(canvasId, label, color, initialData, yUnit, suggestedMin, suggestedMax) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.22)'));
    gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.0)'));

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [...OFFLINE_CHART_LABELS],
            datasets: [
                {
                    label: label,
                    data: [...initialData],
                    borderColor: color,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: color,
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 300 },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.92)',
                    titleColor: '#ffffff',
                    bodyColor: '#f1f5f9',
                    titleFont: { family: 'Inter', size: 11, weight: '600' },
                    bodyFont: { family: 'Inter', size: 11 },
                    padding: 8,
                    cornerRadius: 6,
                    callbacks: {
                        label: function (context) {
                            return ` ${label}: ${context.parsed.y} ${yUnit}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 10, weight: '500' },
                        color: '#64748b',
                        maxRotation: 0
                    }
                },
                y: {
                    display: true,
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: {
                        font: { family: 'Inter', size: 10, weight: '500' },
                        color: '#64748b'
                    },
                    suggestedMin: suggestedMin,
                    suggestedMax: suggestedMax
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// Khởi tạo 4 biểu đồ với giá trị mặc định khi mạch offline; chỉ nạp dữ liệu DB khi mạch online
function initEnvironmentChart() {
    chartTemp = createSingleLineChart('chartTemp', 'Nhiệt độ', 'rgb(239, 68, 68)', OFFLINE_CHART_DATA.temp, '°C', 15, 45);
    chartHumid = createSingleLineChart('chartHumid', 'Độ ẩm', 'rgb(59, 130, 246)', OFFLINE_CHART_DATA.humid, '%', 30, 100);
    chartLight = createSingleLineChart('chartLight', 'Ánh sáng', 'rgb(245, 158, 11)', OFFLINE_CHART_DATA.light, 'lux', 0, 3500);
    chartOxygen = createSingleLineChart('chartOxygen', 'Nồng độ Oxy', 'rgb(6, 182, 212)', OFFLINE_CHART_DATA.oxygen, '%', 18, 24);
}

// Đưa 4 biểu đồ về giá trị mẫu mặc định khi mạch ngoại tuyến (Offline)
function resetChartsToOffline() {
    const applyOffline = (chart, data) => {
        if (!chart) return;
        chart.data.labels = [...OFFLINE_CHART_LABELS];
        chart.data.datasets[0].data = [...data];
        chart.update('none');
    };
    applyOffline(chartTemp, OFFLINE_CHART_DATA.temp);
    applyOffline(chartHumid, OFFLINE_CHART_DATA.humid);
    applyOffline(chartLight, OFFLINE_CHART_DATA.light);
    applyOffline(chartOxygen, OFFLINE_CHART_DATA.oxygen);
}

// Nạp chuỗi dữ liệu thật gần nhất từ API /api/sensors/chart-data khi mạch Online
async function loadInitialChartData() {
    if (window.AppState && window.AppState.isOnline === false) return;
    try {
        const baseUrl = window.APP_CONFIG?.BACKEND_URL || (window.location.port === '3000' ? window.location.origin : 'http://localhost:3000');
        const res = await fetch(`${baseUrl}/api/sensors/chart-data?points=10`);
        if (!res.ok) return;
        const json = await res.json();
        if (!json.success || !Array.isArray(json.labels) || json.labels.length === 0) return;

        const applySeries = (chart, values) => {
            if (!chart || !Array.isArray(values)) return;
            chart.data.labels = [...json.labels];
            chart.data.datasets[0].data = [...values];
            chart.update('none');
        };

        applySeries(chartTemp, json.temperature);
        applySeries(chartHumid, json.humidity);
        applySeries(chartLight, json.light_lux);
        applySeries(chartOxygen, json.oxygen);
    } catch (e) {
        console.warn('[Chart] Không thể tải dữ liệu biểu đồ ban đầu:', e.message);
    }
}

// Cập nhật dữ liệu thời gian thực cho 4 biểu đồ (chỉ cập nhật khi mạch Online)
function updateChartRealtime(timeLabel, temp, humid, light, oxygen) {
    if (window.AppState && window.AppState.isOnline === false) return;
    const maxDataPoints = 10;

    const pushData = (chart, value) => {
        if (!chart || typeof value !== 'number' || isNaN(value)) return;
        if (chart.data.labels.length >= maxDataPoints) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.data.labels.push(timeLabel);
        chart.data.datasets[0].data.push(value);
        chart.update('none');
    };

    pushData(chartTemp, temp);
    pushData(chartHumid, humid);
    pushData(chartLight, light);
    pushData(chartOxygen, (oxygen !== undefined && oxygen !== null && !isNaN(oxygen)) ? oxygen : 20.9);
}

window.initEnvironmentChart = initEnvironmentChart;
window.resetChartsToOffline = resetChartsToOffline;
window.loadInitialChartData = loadInitialChartData;
window.updateChartRealtime = updateChartRealtime;
