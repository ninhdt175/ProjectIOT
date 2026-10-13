// Biểu đồ môi trường thời gian thực (Chart.js Component)
let realEnvironmentChart = null;

// Khởi tạo biểu đồ đa trục (Nhiệt độ, Độ ẩm, Ánh sáng)
function initEnvironmentChart() {
    const canvas = document.getElementById('realChart');
    if (!canvas || typeof Chart === 'undefined') return;

    const ctx = canvas.getContext('2d');

    // Gradient màu nền cho các đường biểu diễn
    const gradientTemp = ctx.createLinearGradient(0, 0, 0, 320);
    gradientTemp.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    gradientTemp.addColorStop(1, 'rgba(239, 68, 68, 0.0)');

    const gradientHumid = ctx.createLinearGradient(0, 0, 0, 320);
    gradientHumid.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    gradientHumid.addColorStop(1, 'rgba(59, 130, 246, 0.0)');

    const gradientLight = ctx.createLinearGradient(0, 0, 0, 320);
    gradientLight.addColorStop(0, 'rgba(245, 158, 11, 0.25)');
    gradientLight.addColorStop(1, 'rgba(245, 158, 11, 0.0)');

    const initialLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Bây giờ'];
    const initialTemp = [26.0, 25.2, 27.5, 31.0, 32.4, 30.5, 30.0];
    const initialHumid = [75.0, 78.0, 70.0, 60.0, 62.5, 70.0, 74.0];
    const initialLight = [120, 105, 850, 2400, 2200, 1500, 1750];

    realEnvironmentChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: initialLabels,
            datasets: [
                {
                    label: 'Nhiệt độ (°C)',
                    data: initialTemp,
                    borderColor: '#ef4444',
                    backgroundColor: gradientTemp,
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#ef4444',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Độ ẩm (%)',
                    data: initialHumid,
                    borderColor: '#3b82f6',
                    backgroundColor: gradientHumid,
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'
                },
                {
                    label: 'Ánh sáng (lux)',
                    data: initialLight,
                    borderColor: '#f59e0b',
                    backgroundColor: gradientLight,
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#f59e0b',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 400 },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 16,
                        color: '#0f172a',
                        font: { family: 'Inter', size: 12, weight: '600' }
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    titleColor: '#ffffff',
                    bodyColor: '#f1f5f9',
                    titleFont: { family: 'Inter', size: 12, weight: '600' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    boxPadding: 4
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        font: { family: 'Inter', size: 11, weight: '500' },
                        color: '#334155'
                    }
                },
                // Trục Y trái: Nhiệt độ & Độ ẩm (0 - 100)
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    grid: { color: '#f1f5f9', drawBorder: false },
                    ticks: {
                        font: { family: 'Inter', size: 11, weight: '500' },
                        color: '#334155'
                    },
                    title: {
                        display: true,
                        text: 'Nhiệt độ (°C) / Độ ẩm (%)',
                        color: '#0f172a',
                        font: { family: 'Inter', size: 12, weight: '600' }
                    },
                    suggestedMin: 0,
                    suggestedMax: 100
                },
                // Trục Y1 phải: Ánh sáng (0 - 4000 lux)
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    grid: { drawOnChartArea: false },
                    ticks: {
                        font: { family: 'Inter', size: 11, weight: '600' },
                        color: '#b45309'
                    },
                    title: {
                        display: true,
                        text: 'Ánh sáng (lux)',
                        color: '#b45309',
                        font: { family: 'Inter', size: 12, weight: '600' }
                    },
                    suggestedMin: 0,
                    suggestedMax: 4000
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// Cập nhật dữ liệu thời gian thực (Sliding window tối đa 12 điểm)
function updateChartRealtime(timeLabel, temp, humid, light) {
    if (!realEnvironmentChart) return;

    const maxDataPoints = 12;

    if (realEnvironmentChart.data.labels.length >= maxDataPoints) {
        realEnvironmentChart.data.labels.shift();
        realEnvironmentChart.data.datasets[0].data.shift();
        realEnvironmentChart.data.datasets[1].data.shift();
        realEnvironmentChart.data.datasets[2].data.shift();
    }

    realEnvironmentChart.data.labels.push(timeLabel);
    realEnvironmentChart.data.datasets[0].data.push(temp);
    realEnvironmentChart.data.datasets[1].data.push(humid);
    realEnvironmentChart.data.datasets[2].data.push(light);

    realEnvironmentChart.update('none');
}

window.initEnvironmentChart = initEnvironmentChart;
window.updateChartRealtime = updateChartRealtime;
