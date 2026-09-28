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
 * @param {string} viewId - ID của màn hình ('dashboard', 'sensors', 'history', 'profile')
 * @param {HTMLElement} element - Nút điều hướng vừa bấm trên Sidebar
 */
function switchView(viewId, element) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-section').forEach(el => el.classList.remove('active'));

    const navItem = element || document.querySelector(`.nav-item[onclick*="'${viewId}'"]`);
    if (navItem) {
        navItem.classList.add('active');
    }

    const targetSection = document.getElementById(viewId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
}

/**
 * Luôn đưa giao diện về màn hình Dashboard đầu tiên khi tải lại (F5 / Reload)
 */
function resetToDashboard() {
    if (window.location.hash) {
        try {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        } catch (e) {}
    }
    const dashboardNav = document.querySelector('.nav-item[onclick*="dashboard"]') || document.querySelector('.nav-list .nav-item');
    switchView('dashboard', dashboardNav);
    window.scrollTo(0, 0);
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
    if (typeof showToast === 'function') {
        showToast('Đang đăng xuất khỏi hệ thống...', 'info');
    }
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 600);
}

// 5. Khởi động toàn bộ ứng dụng khi cây DOM sẵn sàng
document.addEventListener('DOMContentLoaded', () => {
    // Luôn luôn reset về Dashboard khi nạp lại trang
    resetToDashboard();
    checkAuth();
    if (window.SocketService && typeof window.SocketService.initConnection === 'function') {
        window.SocketService.initConnection();
    }
});

// Bắt thêm sự kiện pageshow để xử lý khi người dùng ấn F5 hoặc khôi phục từ bộ nhớ tạm
window.addEventListener('pageshow', () => {
    resetToDashboard();
});

window.switchView = switchView;
window.resetToDashboard = resetToDashboard;
window.checkAuth = checkAuth;
window.logout = logout;
