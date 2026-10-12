// =============================================================================
// TẬP TIN: app.js
// VAI TRÒ: ĐIỀU PHỐI TRUNG TÂM & QUẢN LÝ TRẠNG THÁI ỨNG DỤNG (Application Core & Navigation)
// MÔ TẢ:
//   Tập tin này đóng vai trò là "trái tim" điều hành giao diện người dùng:
//   1. Quản lý trạng thái toàn cục (Global State) qua đối tượng AppState.
//   2. Điều khiển chuyển đổi các màn hình (Dashboard, Cảm biến, Lịch sử, Hồ sơ).
//   3. Lưu trữ và khôi phục màn hình hiện tại vào sessionStorage (chống mất vị trí khi F5).
//   4. Kích hoạt kết nối thời gian thực khi trang hoàn tất tải tài liệu HTML.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. KHỞI TẠO ĐỐI TƯỢNG TRẠNG THÁI TOÀN CỤC (GLOBAL STATE)
// -----------------------------------------------------------------------------
// AppState lưu trữ toàn bộ dữ liệu động chia sẻ giữa các trang và thành phần giao diện:
const AppState = {
    // isOnline: Cờ boolean đánh dấu vi điều khiển ESP32 và máy chủ có đang kết nối hay không.
    // true: Đang kết nối trực tuyến (Online - đèn xanh).
    // false: Mất kết nối (Offline - đèn đỏ).
    isOnline: true,

    // socket: Biến lưu trữ đối tượng kết nối WebSocket (Socket.IO client).
    // Ban đầu là null, sẽ được gán khi gọi SocketService.initConnection().
    socket: null,

    // backendUrl: Đường dẫn gốc tới máy chủ Backend API.
    // Lấy từ APP_CONFIG.BACKEND_URL nếu có, nếu không thì lấy origin trình duyệt hiện tại.
    backendUrl: window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : window.location.origin,

    // devices: Bản sao độc lập (Deep Clone) của danh sách thiết bị từ file app.config.js.
    // Sử dụng JSON.parse(JSON.stringify(...)) để tạo vùng nhớ mới, tránh làm thay đổi cấu hình gốc.
    // Dùng để lưu trữ trạng thái bật/tắt (true/false) của từng thiết bị trong phiên làm việc.
    devices: window.APP_CONFIG ? JSON.parse(JSON.stringify(window.APP_CONFIG.DEVICES)) : {}
};

// Gán AppState vào đối tượng window để các module khác (device.component, socket.service) dễ dàng truy cập
window.AppState = AppState;

// -----------------------------------------------------------------------------
// 2. HÀM CHUYỂN ĐỔI MÀN HÌNH NỘI DUNG (TAB NAVIGATION)
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - viewId (string): Chuỗi ID của màn hình cần chuyển tới ('dashboard', 'sensors', 'history', 'profile').
// - element (HTMLElement, tùy chọn): Thẻ liên kết <a> trên Sidebar vừa được người dùng click vào.
function switchView(viewId, element) {
    // BƯỚC 1: Xóa bỏ class 'active' khỏi tất cả các nút menu và tất cả các màn hình nội dung
    // Điều này đảm bảo không có 2 trang nào cùng hiển thị đè lên nhau cùng lúc
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

    // BƯỚC 2: Tìm phần tử menu điều hướng tương ứng trên thanh Sidebar
    // Nếu element được truyền trực tiếp (từ onclick="switchView('sensors', this)") thì dùng ngay.
    // Nếu không truyền, dùng querySelector tìm thẻ có data-view hoặc onclick tương ứng.
    const navItem = element || 
                    document.querySelector(`.nav-item[data-view="${viewId}"]`) || 
                    document.querySelector(`.nav-item[onclick*="'${viewId}'"]`);
    if (navItem) {
        // Thêm class 'active' để nút trên menu đổi màu xanh nổi bật
        navItem.classList.add('active');
    }

    // BƯỚC 3: Tìm khối thẻ nội dung có ID trùng với viewId và kích hoạt hiển thị
    // Trong CSS, các thẻ .view-section mặc định bị ẩn (display: none),
    // chỉ thẻ nào có thêm class .active mới được hiển thị (display: block).
    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // BƯỚC 4: Lưu ID màn hình hiện tại vào sessionStorage của trình duyệt
    // sessionStorage lưu trữ dữ liệu theo từng tab của trình duyệt:
    // Khi người dùng bấm F5 (Reload trang), dữ liệu này vẫn tồn tại.
    // Dùng try-catch để phòng ngừa trường hợp trình duyệt chặn lưu trữ cookie/storage (chế độ ẩn danh nghiêm ngặt).
    try {
        sessionStorage.setItem('activeView', viewId);
    } catch (e) {
        console.warn('Không thể ghi sessionStorage:', e);
    }
}

// -----------------------------------------------------------------------------
// 3. HÀM KHÔI PHỤC MÀN HÌNH ĐANG LÀM VIỆC KHI TẢI LẠI TRANG (F5)
// -----------------------------------------------------------------------------
// Hàm này được gọi tự động mỗi khi mở trang hoặc tải lại trang:
function restoreActiveView() {
    let savedView = 'dashboard'; // Mặc định mở trang Dashboard nếu chưa có dữ liệu lưu

    // Đọc tên màn hình đã lưu trong phiên làm việc trước đó
    try {
        savedView = sessionStorage.getItem('activeView') || 'dashboard';
    } catch (e) {
        savedView = 'dashboard';
    }

    // Tìm thẻ nút tương ứng trên Sidebar với màn hình đã lưu
    const targetNav = document.querySelector(`.nav-item[data-view="${savedView}"]`) || 
                      document.querySelector(`.nav-item[onclick*="'${savedView}'"]`) || 
                      document.querySelector('.nav-list .nav-item');

    // Chuyển tới màn hình đã lưu
    switchView(savedView, targetNav);

    // XÓA THẺ STYLE CHỐNG NHÁY MÀN HÌNH:
    // Trong thẻ <head> của file index.html có 1 đoạn script nhỏ chèn tạm thẻ <style id="early-view-style">
    // để ẩn Dashboard và hiện đúng trang ngay trước khi CSS/JS tải xong, giúp người dùng không bị "nháy" giao diện.
    // Khi hàm này đã chạy xong, ta gỡ bỏ thẻ style tạm đó đi để nhường quyền điều khiển cho class .active chuẩn.
    const earlyStyle = document.getElementById('early-view-style');
    if (earlyStyle) {
        earlyStyle.remove();
    }
}

// -----------------------------------------------------------------------------
// 4. SỰ KIỆN KHỞI CHẠY KHI TÀI LIỆU HTML TẢI XONG (DOM CONTENT LOADED)
// -----------------------------------------------------------------------------
// Trình duyệt sẽ phát sự kiện 'DOMContentLoaded' khi toàn bộ cây phân cấp HTML đã được dựng xong:
document.addEventListener('DOMContentLoaded', () => {
    // 1. Khôi phục tab đang làm việc của người dùng
    restoreActiveView();

    // 2. Khởi tạo kết nối WebSocket với máy chủ nếu dịch vụ SocketService đã được nạp
    if (window.SocketService && typeof window.SocketService.initConnection === 'function') {
        window.SocketService.initConnection();
    }
});

// -----------------------------------------------------------------------------
// 5. XUẤT CÁC HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Cho phép gọi trực tiếp các hàm này từ thuộc tính onclick của các thẻ HTML trong index.html
window.switchView = switchView;
window.restoreActiveView = restoreActiveView;
