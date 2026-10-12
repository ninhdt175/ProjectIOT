// =============================================================================
// TẬP TIN: dashboard.js
// VAI TRÒ: QUẢN LÝ MÀN HÌNH TỔNG QUAN (Dashboard Page Controller)
// MÔ TẢ:
//   Tập tin này chịu trách nhiệm điều khiển trang Dashboard:
//   1. Cập nhật các giá trị số đo cảm biến lên 3 thẻ thống kê nổi bật (Nhiệt độ, Độ ẩm, Ánh sáng).
//   2. Kiểm tra tính hợp lệ của dữ liệu số học (tránh lỗi hiển thị NaN hoặc undefined).
//   3. Định dạng số chữ số thập phân phù hợp với đơn vị đo lường thực tế.
//   4. Lắng nghe sự kiện tải trang để kích hoạt vẽ biểu đồ môi trường.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. HÀM CẬP NHẬT CHỈ SỐ CẢM BIẾN LÊN 3 THẺ TỔNG QUAN TRÊN DASHBOARD
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - temp (number): Giá trị nhiệt độ môi trường (°C).
// - humid (number): Giá trị độ ẩm tương đối của không khí (%).
// - light (number): Cường độ chiếu sáng xung quanh (lux).
function updateDashboardMetrics(temp, humid, light) {
    // 1. Lấy tham chiếu tới các thẻ HTML hiển thị giá trị số trên giao diện
    const tempEl = document.getElementById('metric-temp');   // Thẻ hiển thị nhiệt độ
    const humidEl = document.getElementById('metric-humid'); // Thẻ hiển thị độ ẩm
    const lightEl = document.getElementById('metric-light'); // Thẻ hiển thị ánh sáng

    // 2. CẬP NHẬT THẺ NHIỆT ĐỘ:
    // Kiểm tra điều kiện an toàn: phần tử DOM tồn tại, dữ liệu là kiểu số (number) và không phải là NaN
    if (tempEl && typeof temp === 'number' && !isNaN(temp)) {
        // temp.toFixed(1): Làm tròn số đến đúng 1 chữ số sau dấu phẩy (VD: 30.2)
        // Kèm theo thẻ span bọc đơn vị "°C" để định dạng font chữ nhỏ hơn số đo
        tempEl.innerHTML = `${temp.toFixed(1)} <span class="unit-label">°C</span>`;
    }

    // 3. CẬP NHẬT THẺ ĐỘ ẨM:
    if (humidEl && typeof humid === 'number' && !isNaN(humid)) {
        // humid.toFixed(1): Làm tròn 1 chữ số thập phân (VD: 74.5)
        humidEl.innerHTML = `${humid.toFixed(1)} <span class="unit-label">%</span>`;
    }

    // 4. CẬP NHẬT THẺ ÁNH SÁNG:
    if (lightEl && typeof light === 'number' && !isNaN(light)) {
        // Math.round(light): Làm tròn thành số nguyên vì đơn vị lux biến thiên theo hàng chục (VD: 1750 lux)
        lightEl.innerHTML = `${Math.round(light)} <span class="unit-label">lux</span>`;
    }
}

// -----------------------------------------------------------------------------
// 2. SỰ KIỆN KHỞI CHẠY KHI TÀI LIỆU HTML SẴN SÀNG (DOM CONTENT LOADED)
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Tự động gọi hàm dựng biểu đồ Chart.js (từ file chart.component.js) khi trang web tải xong
    if (typeof initEnvironmentChart === 'function') {
        initEnvironmentChart();
    }
});

// -----------------------------------------------------------------------------
// 3. XUẤT HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Cho phép SocketService hoặc các tập tin khác gọi hàm này để cập nhật thẻ khi có dữ liệu mới
window.updateDashboardMetrics = updateDashboardMetrics;
