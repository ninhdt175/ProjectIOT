// Biểu đồ môi trường thời gian thực (4 Biểu đồ riêng biệt theo thiết kế)
let chartTemp = null;
let chartHumid = null;
let chartLight = null;
let chartOxygen = null;

// Hàm tiện ích tạo cấu hình biểu đồ đơn lẻ
function createSingleLineChart(canvasId, label, color, initialData, yUnit, suggestedMin, suggestedMax) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || typeof Chart === 'undefined') return null;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 180);
    gradient.addColorStop(0, color.replace('rgb', 'rgba').replace(')', ', 0.22)'));
    gradient.addColorStop(1, color.replace('rgb', 'rgba').replace(')', ', 0.0)'));

    const initialLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Bây giờ'];

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                {
                    label: label,
                    data: initialData,
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

// Khởi tạo 4 biểu đồ tương ứng với 4 loại cảm biến
function initEnvironmentChart() {
    // 1. Biểu đồ Nhiệt độ (°C)
    chartTemp = createSingleLineChart(
        'chartTemp',
        'Nhiệt độ',
        'rgb(239, 68, 68)',
        [26.0, 25.2, 27.5, 31.0, 32.4, 30.5, 30.0],
        '°C',
        15,
        45
    );

    // 2. Biểu đồ Độ ẩm (%)
    chartHumid = createSingleLineChart(
        'chartHumid',
        'Độ ẩm',
        'rgb(59, 130, 246)',
        [75.0, 78.0, 70.0, 60.0, 62.5, 70.0, 74.0],
        '%',
        30,
        100
    );

    // 3. Biểu đồ Ánh sáng (lux)
    chartLight = createSingleLineChart(
        'chartLight',
        'Ánh sáng',
        'rgb(245, 158, 11)',
        [120, 105, 850, 2400, 2200, 1500, 1750],
        'lux',
        0,
        3500
    );

    // 4. Biểu đồ Nồng độ Oxy (%)
    chartOxygen = createSingleLineChart(
        'chartOxygen',
        'Nồng độ Oxy',
        'rgb(6, 182, 212)',
        [20.9, 20.8, 21.0, 20.9, 21.1, 20.8, 20.9],
        '%',
        18,
        24
    );
}

// Cập nhật dữ liệu thời gian thực cho 4 biểu đồ (Sliding window tối đa 10 điểm)
function updateChartRealtime(timeLabel, temp, humid, light, oxygen) {
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
window.updateChartRealtime = updateChartRealtime;
