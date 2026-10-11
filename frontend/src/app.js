/**
 * Trạng thái toàn cục (Global State) của ứng dụng Front-End
 */
const AppState = {
    isOnline: true, // Trạng thái kết nối của ESP32 (true: Online, false: Offline)
    socket: null,   // Đối tượng Socket.IO kết nối Backend
    backendUrl: window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : window.location.origin, // URL Backend Server
    devices: window.APP_CONFIG ? JSON.parse(JSON.stringify(window.APP_CONFIG.DEVICES)) : {}  // Bản sao trạng thái các thiết bị
};

window.AppState = AppState;

/**
 * Chuyển đổi màn hình hiển thị (Tab Navigation) và lưu vào sessionStorage
 * @param {string} viewId - ID của màn hình ('dashboard', 'sensors', 'history', 'profile')
 * @param {HTMLElement} [element] - Thẻ điều hướng được click trên Sidebar (tùy chọn)
 */
function switchView(viewId, element) {
    // 1. Xóa trạng thái active cũ khỏi tất cả menu và màn hình
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

    // 2. Kích hoạt menu điều hướng tương ứng trên Sidebar
    const navItem = element || 
                    document.querySelector(`.nav-item[data-view="${viewId}"]`) || 
                    document.querySelector(`.nav-item[onclick*="'${viewId}'"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    // 3. Hiển thị màn hình nội dung tương ứng
    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // 4. Lưu tab hiện tại vào sessionStorage để giữ nguyên khi người dùng F5 tải lại trang
    try {
        sessionStorage.setItem('activeView', viewId);
    } catch (e) {}
}

/**
 * Khôi phục màn hình đang làm việc từ sessionStorage khi người dùng tải lại trang (F5)
 */
function restoreActiveView() {
    let savedView = 'dashboard';
    try {
        savedView = sessionStorage.getItem('activeView') || 'dashboard';
    } catch (e) {}

    // Tìm thẻ menu tương ứng với màn hình đã lưu
    const targetNav = document.querySelector(`.nav-item[data-view="${savedView}"]`) || 
                      document.querySelector(`.nav-item[onclick*="'${savedView}'"]`) || 
                      document.querySelector('.nav-list .nav-item');
    switchView(savedView, targetNav);

    // Xóa thẻ style tạm thời chống nháy giao diện (chèn ở thẻ <head>) sau khi JS đã load xong
    const earlyStyle = document.getElementById('early-view-style');
    if (earlyStyle) {
        earlyStyle.remove();
    }
}

// Khởi chạy khi tài liệu HTML tải xong
document.addEventListener('DOMContentLoaded', () => {
    restoreActiveView(); // Khôi phục tab đang xem
    // Khởi tạo kết nối WebSocket với Backend nếu dịch vụ có sẵn
    if (window.SocketService && typeof window.SocketService.initConnection === 'function') {
        window.SocketService.initConnection();
    }
});

// Xuất các hàm ra phạm vi toàn cục (window)
window.switchView = switchView;
window.restoreActiveView = restoreActiveView;
