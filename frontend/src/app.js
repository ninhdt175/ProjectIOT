/**
 * ==============================================================================
 * SOURCE APP: APPLICATION ORCHESTRATOR (APP.JS)
 * ==============================================================================
 * Điểm khởi động chính của ứng dụng:
 * 1. Quản lý trạng thái ứng dụng toàn cục (AppState)
 * 2. Điều hướng chuyển đổi các màn hình (View Navigation)
 * 3. Kiểm tra phiên đăng nhập và cập nhật thông tin người dùng
 * 4. Kích hoạt kết nối thời gian thực qua SocketService
 * ==============================================================================
 */

// 1. Trạng thái toàn cục duy nhất của ứng dụng (Single Source of Truth)
const AppState = {
    isOnline: true,
    socket: null,
    backendUrl: window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : window.location.origin,
    devices: window.APP_CONFIG ? JSON.parse(JSON.stringify(window.APP_CONFIG.DEVICES)) : {}
};

window.AppState = AppState;

/**
 * 2. Chuyển đổi màn hình hiển thị (View Navigation)
 * Lưu trạng thái vào sessionStorage để giữ nguyên trang hiện tại khi reload / F5
 * @param {string} viewId - ID của màn hình ('dashboard', 'sensors', 'history', 'profile')
 * @param {HTMLElement} element - Nút điều hướng vừa bấm trên Sidebar
 */
function switchView(viewId, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

    const navItem = element || 
                    document.querySelector(`.nav-item[data-view="${viewId}"]`) || 
                    document.querySelector(`.nav-item[onclick*="'${viewId}'"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
    }

    // Ghi nhớ trang đang mở để khi F5 / Reload sẽ ở lại đúng trang này
    try {
        sessionStorage.setItem('activeView', viewId);
    } catch (e) {}
}

/**
 * Khôi phục màn hình đang làm việc khi tải lại trang (F5 / Reload)
 */
function restoreActiveView() {
    let savedView = 'dashboard';
    try {
        savedView = sessionStorage.getItem('activeView') || 'dashboard';
    } catch (e) {}

    const targetNav = document.querySelector(`.nav-item[data-view="${savedView}"]`) || 
                      document.querySelector(`.nav-item[onclick*="'${savedView}'"]`) || 
                      document.querySelector('.nav-list .nav-item');
    switchView(savedView, targetNav);

    // Gỡ bỏ style chống chớp màn hình (early-view-style) khi DOM đã đồng bộ xong
    const earlyStyle = document.getElementById('early-view-style');
    if (earlyStyle) {
        earlyStyle.remove();
    }
}

/**
 * 3. Kiểm tra phiên đăng nhập người dùng từ LocalStorage
 */
function checkAuth() {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const nameElements = document.querySelectorAll('.user-pill .name, .profile-header-clean h2');
            nameElements.forEach(el => {
                if (user.name) el.textContent = user.name;
            });
        } catch (e) {
            console.error('Lỗi phân tích dữ liệu người dùng:', e);
        }
    }
}

/**
 * 4. Xử lý Đăng xuất người dùng
 */
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    try {
        sessionStorage.removeItem('activeView');
    } catch (e) {}

    if (typeof showToast === 'function') {
        showToast('Đang đăng xuất khỏi hệ thống...', 'info');
    }
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 600);
}

// 5. Khởi động toàn bộ ứng dụng khi cây DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Khôi phục màn hình hiện tại (ở lại đúng trang khi reload / F5)
    restoreActiveView();
    checkAuth();
    if (window.SocketService && typeof window.SocketService.initConnection === 'function') {
        window.SocketService.initConnection();
    }
});

window.switchView = switchView;
window.restoreActiveView = restoreActiveView;
window.checkAuth = checkAuth;
window.logout = logout;
