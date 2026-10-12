// =============================================================================
// TẬP TIN: toast.component.js
// VAI TRÒ: THÔNG BÁO DẠNG TOAST GÓC MÀN HÌNH (Toast Notification Component)
// MÔ TẢ:
//   Tập tin này cung cấp hàm tiện ích hiển thị các mẩu thông báo nổi (Toast):
//   1. Tự động sinh thẻ HTML thông báo và chèn vào khung chứa #toast-container.
//   2. Phân loại màu sắc và biểu tượng theo ngữ cảnh: thành công ('success'), lỗi ('error'),
//      cảnh báo ('warning'), thông tin chung ('info').
//   3. Áp dụng cơ chế tự hủy (Self-Destruct) sau 3.5 giây kèm hiệu ứng chuyển động mờ dần (Fade Out).
// =============================================================================

// -----------------------------------------------------------------------------
// 1. HÀM HIỂN THỊ THÔNG BÁO TOAST
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - message (string): Chuỗi nội dung thông báo hiển thị cho người dùng đọc.
// - type (string, tùy chọn): Kiểu thông báo ('info' | 'success' | 'warning' | 'error'). Mặc định là 'info'.
function showToast(message, type = 'info') {
    // 1. Tìm thẻ div bao chứa toàn bộ các thông báo toast ở góc màn hình (trong index.html)
    const container = document.getElementById('toast-container');
    // Nếu không tìm thấy khung chứa trong DOM thì kết thúc hàm
    if (!container) return;

    // 2. TẠO THẺ DIV THÔNG BÁO MỚI TRONG BỘ NHỚ DOM
    const toast = document.createElement('div');

    // 3. GÁN CLASS CSS THEO LOẠI THÔNG BÁO:
    // Dùng toán tử 3 ngôi (Ternary Operator) lồng nhau để chọn class CSS phù hợp:
    // - error: .toast-error (màu đỏ)
    // - warning: .toast-warning (màu vàng cam)
    // - success: .toast-success (màu xanh lá)
    // - info: class .toast mặc định (màu xanh dương hoặc trung tính)
    toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : type === 'success' ? 'toast-success' : ''}`;

    // 4. CHỌN BIỂU TƯỢNG (ICON PHOSPHOR) TƯƠNG ỨNG:
    let icon = 'ph-info'; // Icon mặc định cho thông tin chung
    if (type === 'error') icon = 'ph-warning-circle'; // Icon hình tròn dấu chấm than cho lỗi
    if (type === 'warning') icon = 'ph-bell-ringing';   // Icon chuông reo cho cảnh báo
    if (type === 'success') icon = 'ph-check-circle';   // Icon dấu tích xanh cho thành công

    // 5. CHÈN NỘI DUNG VĂN BẢN VÀ BIỂU TƯỢNG VÀO THẺ TOAST:
    // Sử dụng template literal để tạo cấu trúc gồm icon và thẻ <span> bọc chữ
    toast.innerHTML = `<i class="ph-bold ${icon}" style="font-size: 18px;"></i> <span>${message}</span>`;

    // 6. THÊM THẺ TOAST VÀO KHUNG CHỨA TRÊN GIAO DIỆN
    container.appendChild(toast);

    // 7. CƠ CHẾ TỰ ĐỘNG BIẾN MẤT VÀ XÓA BỎ KHỎI DOM (AUTO-DISMISS):
    // Đặt bộ đếm thời gian 3500 mili-giây (3.5 giây):
    setTimeout(() => {
        // Giai đoạn 7.1: Kích hoạt hiệu ứng chuyển động biến mất (CSS Transition)
        toast.style.opacity = '0';                 // Làm mờ dần đến trong suốt hoàn toàn
        toast.style.transform = 'translateY(10px)'; // Trượt nhẹ xuống dưới 10px
        toast.style.transition = 'all 0.3s';       // Quá trình chuyển đổi diễn ra trong 0.3 giây

        // Giai đoạn 7.2: Sau khi hiệu ứng làm mờ 0.3 giây kết thúc, chính thức xóa thẻ khỏi DOM
        // Giúp giải phóng bộ nhớ của trình duyệt, tránh việc sinh ra hàng trăm thẻ rác nếu mở web lâu
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// -----------------------------------------------------------------------------
// 2. XUẤT HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Cho phép tất cả các file mã nguồn khác gọi hàm showToast('Tin nhắn', 'success')
window.showToast = showToast;
