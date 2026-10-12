// =============================================================================
// TẬP TIN: chart.component.js
// VAI TRÒ: VẼ & CẬP NHẬT BIỂU ĐỒ MÔI TRƯỜNG THỜI GIAN THỰC (Real-Time Chart Component)
// MÔ TẢ:
//   Tập tin này chịu trách nhiệm hiển thị trực quan các thông số môi trường:
//   1. Tích hợp thư viện đồ họa Chart.js (vẽ trên thẻ HTML5 <canvas>).
//   2. Thiết kế biểu đồ đa trục tung (Dual Y-Axis Chart):
//      - Trục Y bên trái: Đo Nhiệt độ (°C) và Độ ẩm (%) cùng dải 0 - 100.
//      - Trục Y1 bên phải: Đo Cường độ ánh sáng (lux) dải 0 - 4000.
//   3. Tạo dải màu chuyển sắc (Linear Gradient) tạo hiệu ứng bóng đổ đẹp mắt dưới đường biểu diễn.
//   4. Áp dụng thuật toán hàng đợi trượt (Sliding Window Queue):
//      Luôn duy trì tối đa 12 mốc thời gian gần nhất (loại bỏ mốc cũ nhất bằng .shift()
//      và thêm mốc mới vào cuối bằng .push()), cập nhật đồ thị mượt mà với mode 'none'.
// =============================================================================

// Biến toàn cục lưu trữ thể hiện (instance) của đối tượng Chart.js
// Ban đầu là null, sẽ được khởi tạo khi gọi hàm initEnvironmentChart()
let realEnvironmentChart = null;

// -----------------------------------------------------------------------------
// 1. HÀM KHỞI TẠO BIỂU ĐỒ ĐA TRỤC (INIT ENVIRONMENT CHART)
// -----------------------------------------------------------------------------
function initEnvironmentChart() {
    // 1. Lấy phần tử thẻ canvas đồ họa từ cây DOM
    const canvas = document.getElementById('realChart');
    // Kiểm tra an toàn: nếu không có canvas hoặc thư viện Chart.js chưa được nạp thì dừng
    if (!canvas || typeof Chart === 'undefined') return;

    // 2. Lấy ngữ cảnh vẽ 2D (2D Rendering Context) của thẻ Canvas
    const ctx = canvas.getContext('2d');

    // 3. TẠO CÁC HIỆU ỨNG CHUYỂN SẮC MÀU (LINEAR GRADIENT)
    // createLinearGradient(x0, y0, x1, y1): Tạo dải màu từ đỉnh (y=0) xuống đáy đồ thị (y=320)

    // Gradient màu đỏ cho Nhiệt độ: từ màu đỏ bán trong suốt (25% opacity) sang trong suốt hoàn toàn (0% opacity)
    const gradientTemp = ctx.createLinearGradient(0, 0, 0, 320);
    gradientTemp.addColorStop(0, 'rgba(239, 68, 68, 0.25)'); // Đỉnh: đỏ nhạt
    gradientTemp.addColorStop(1, 'rgba(239, 68, 68, 0.0)');   // Đáy: trong suốt

    // Gradient màu xanh dương cho Độ ẩm
    const gradientHumid = ctx.createLinearGradient(0, 0, 0, 320);
    gradientHumid.addColorStop(0, 'rgba(59, 130, 246, 0.25)'); // Đỉnh: xanh nhạt
    gradientHumid.addColorStop(1, 'rgba(59, 130, 246, 0.0)');   // Đáy: trong suốt

    // Gradient màu vàng hổ phách cho Cường độ ánh sáng
    const gradientLight = ctx.createLinearGradient(0, 0, 0, 320);
    gradientLight.addColorStop(0, 'rgba(245, 158, 11, 0.25)'); // Đỉnh: vàng cam nhạt
    gradientLight.addColorStop(1, 'rgba(245, 158, 11, 0.0)');   // Đáy: trong suốt

    // 4. KHỞI TẠO CÁC MỐC DỮ LIỆU BAN ĐẦU (INITIAL DATA POINTS)
    // Cung cấp 7 mốc đo ban đầu để đồ thị không bị trống rỗng khi người dùng vừa mở trang web
    const initialLabels = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Bây giờ'];
    const initialTemp = [26.0, 25.2, 27.5, 31.0, 32.4, 30.5, 30.0];
    const initialHumid = [75.0, 78.0, 70.0, 60.0, 62.5, 70.0, 74.0];
    const initialLight = [120, 105, 850, 2400, 2200, 1500, 1750];

    // 5. KHỞI TẠO ĐỐI TƯỢNG CHART.JS
    realEnvironmentChart = new Chart(ctx, {
        type: 'line', // Loại biểu đồ đường cong (Line Chart)
        data: {
            labels: initialLabels, // Trục hoành X: Các mốc thời gian
            datasets: [
                // TẬP DỮ LIỆU 1: NHIỆT ĐỘ (°C)
                {
                    label: 'Nhiệt độ (°C)',
                    data: initialTemp,
                    borderColor: '#ef4444',            // Màu viền đường nét: Đỏ
                    backgroundColor: gradientTemp,     // Màu nền đổ bóng phía dưới đường nét
                    borderWidth: 2.5,                  // Độ dày đường nét: 2.5px
                    tension: 0.35,                     // Độ uốn cong mềm mại của đường nối (Bezier Spline)
                    fill: true,                        // Cho phép đổ bóng màu nền
                    pointBackgroundColor: '#ffffff',   // Màu nền điểm tròn: Trắng
                    pointBorderColor: '#ef4444',       // Viền điểm tròn: Đỏ
                    pointBorderWidth: 2,               // Độ dày viền điểm: 2px
                    pointRadius: 4,                    // Bán kính điểm bình thường: 4px
                    pointHoverRadius: 6,               // Bán kính điểm khi di chuột vào: 6px
                    yAxisID: 'y'                       // Gắn vào trục Y bên trái (0 - 100)
                },
                // TẬP DỮ LIỆU 2: ĐỘ ẨM (%)
                {
                    label: 'Độ ẩm (%)',
                    data: initialHumid,
                    borderColor: '#3b82f6',            // Màu viền đường nét: Xanh dương
                    backgroundColor: gradientHumid,    // Màu nền đổ bóng
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#3b82f6',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y'                       // Gắn vào trục Y bên trái (0 - 100)
                },
                // TẬP DỮ LIỆU 3: ÁNH SÁNG (LUX)
                {
                    label: 'Ánh sáng (lux)',
                    data: initialLight,
                    borderColor: '#f59e0b',            // Màu viền đường nét: Vàng hổ phách
                    backgroundColor: gradientLight,    // Nền đổ bóng vàng cam
                    borderWidth: 2.5,
                    tension: 0.35,
                    fill: true,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#f59e0b',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    yAxisID: 'y1'                      // Gắn vào trục Y1 riêng bên phải (0 - 4000)
                }
            ]
        },
        options: {
            responsive: true,            // Tự động co giãn theo kích thước khung chứa
            maintainAspectRatio: false,  // Cho phép tự do điều chỉnh chiều cao mà không bị cố định tỉ lệ
            animation: { duration: 400 }, // Thời lượng hiệu ứng chuyển động ban đầu là 400ms
            plugins: {
                // CẤU HÌNH CHÚ THÍCH (LEGEND):
                legend: {
                    position: 'top', // Vị trí nằm phía trên biểu đồ
                    align: 'end',    // Căn lệch sang bên phải
                    labels: {
                        usePointStyle: true, // Dùng hình tròn thay vì hình chữ nhật
                        boxWidth: 8,
                        boxHeight: 8,
                        padding: 16,
                        color: '#0f172a',
                        font: { family: 'Inter', size: 12, weight: '600' }
                    }
                },
                // CẤU HÌNH HỘP THÔNG TIN KHI RÊ CHUỘT (TOOLTIP):
                tooltip: {
                    mode: 'index',         // Hiển thị đồng thời cả 3 giá trị tại cùng 1 mốc thời gian
                    intersect: false,      // Chỉ cần rê chuột dọc theo trục X là hiện tooltip
                    backgroundColor: 'rgba(15, 23, 42, 0.95)', // Nền tối sang trọng
                    titleColor: '#ffffff',
                    bodyColor: '#f1f5f9',
                    titleFont: { family: 'Inter', size: 12, weight: '600' },
                    bodyFont: { family: 'Inter', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    boxPadding: 4
                }
            },
            // CẤU HÌNH CÁC TRỤC TỌA ĐỘ (SCALES):
            scales: {
                // TRỤC HOÀNH (X - THỜI GIAN):
                x: {
                    grid: { display: false }, // Ẩn các đường lưới dọc cho biểu đồ thoáng đãng
                    ticks: {
                        font: { family: 'Inter', size: 11, weight: '500' },
                        color: '#334155'
                    }
                },
                // TRỤC TUNG TRÁI (Y - NHIỆT ĐỘ & ĐỘ ẨM):
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left', // Nằm bên trái
                    grid: { color: '#f1f5f9', drawBorder: false }, // Đường kẻ ngang nhạt
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
                    suggestedMax: 100 // Thang đo tối đa 100 (phù hợp với % độ ẩm và ngưỡng nhiệt độ phòng)
                },
                // TRỤC TUNG PHẢI (Y1 - ÁNH SÁNG LUX):
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right', // Nằm bên phải
                    grid: { drawOnChartArea: false }, // Không vẽ đường lưới ngang đè lên trục Y trái
                    ticks: {
                        font: { family: 'Inter', size: 11, weight: '600' },
                        color: '#b45309' // Số đo ánh sáng hiển thị màu nâu vàng
                    },
                    title: {
                        display: true,
                        text: 'Ánh sáng (lux)',
                        color: '#b45309',
                        font: { family: 'Inter', size: 12, weight: '600' }
                    },
                    suggestedMin: 0,
                    suggestedMax: 4000 // Thang đo tối đa 4000 lux (phù hợp với quang trở LDR)
                }
            },
            interaction: { mode: 'nearest', axis: 'x', intersect: false }
        }
    });
}

// -----------------------------------------------------------------------------
// 2. HÀM ĐẨY DỮ LIỆU MỚI VÀO BIỂU ĐỒ THEO THỜI GIAN THỰC (UPDATE CHART REALTIME)
// -----------------------------------------------------------------------------
// Hàm này được gọi liên tục mỗi khi nhận được gói tin cảm biến mới từ Socket.IO hoặc mô phỏng:
// Tham số đầu vào:
// - timeLabel (string): Chuỗi giờ:phút:giây hiển thị trên trục X (VD: "14:15:20").
// - temp (number): Giá trị nhiệt độ (°C).
// - humid (number): Giá trị độ ẩm (%).
// - light (number): Cường độ ánh sáng (lux).
function updateChartRealtime(timeLabel, temp, humid, light) {
    // Nếu biểu đồ chưa được khởi tạo thì thoát ngay
    if (!realEnvironmentChart) return;

    // Giới hạn số lượng điểm tối đa hiển thị cùng một lúc trên màn hình (12 điểm)
    const maxDataPoints = 12;

    // THUẬT TOÁN HÀNG ĐỢI TRƯỢT (SLIDING WINDOW QUEUE):
    // Nếu số lượng mốc thời gian hiện có đã đạt hoặc vượt ngưỡng 12:
    if (realEnvironmentChart.data.labels.length >= maxDataPoints) {
        // .shift() sẽ xóa phần tử cũ nhất ở vị trí đầu tiên (index 0) của mảng
        realEnvironmentChart.data.labels.shift();            // Xóa mốc thời gian cũ nhất
        realEnvironmentChart.data.datasets[0].data.shift();  // Xóa nhiệt độ cũ nhất
        realEnvironmentChart.data.datasets[1].data.shift();  // Xóa độ ẩm cũ nhất
        realEnvironmentChart.data.datasets[2].data.shift();  // Xóa ánh sáng cũ nhất
    }

    // THÊM ĐIỂM DỮ LIỆU MỚI VÀO CUỐI MẢNG:
    // .push() chèn phần tử mới vào vị trí cuối cùng của mảng
    realEnvironmentChart.data.labels.push(timeLabel); // Thêm mốc thời gian mới
    realEnvironmentChart.data.datasets[0].data.push(temp); // Thêm nhiệt độ mới
    realEnvironmentChart.data.datasets[1].data.push(humid); // Thêm độ ẩm mới
    realEnvironmentChart.data.datasets[2].data.push(light); // Thêm ánh sáng mới

    // CẬP NHẬT BIỂU ĐỒ LÊN MÀN HÌNH:
    // Truyền tham số 'none' để Chart.js cập nhật trực tiếp mà KHÔNG phát lại toàn bộ hoạt ảnh (animation),
    // giúp đồ thị di chuyển mượt mà liên tục, không gây giật lag cho trình duyệt.
    realEnvironmentChart.update('none');
}

// -----------------------------------------------------------------------------
// 3. XUẤT CÁC HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
window.initEnvironmentChart = initEnvironmentChart;
window.updateChartRealtime = updateChartRealtime;
