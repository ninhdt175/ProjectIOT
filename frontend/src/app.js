const AppState = {
    isOnline: true,
    socket: null,
    backendUrl: window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : window.location.origin,
    devices: window.APP_CONFIG ? JSON.parse(JSON.stringify(window.APP_CONFIG.DEVICES)) : {}
};

window.AppState = AppState;

/**
 * Chuyển đổi màn hình hiển thị và lưu trạng thái vào sessionStorage
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

    try {
        sessionStorage.setItem('activeView', viewId);
    } catch (e) {}
}

/**
 * Khôi phục màn hình đang làm việc khi tải lại trang (F5)
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

    const earlyStyle = document.getElementById('early-view-style');
    if (earlyStyle) {
        earlyStyle.remove();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    restoreActiveView();
    if (window.SocketService && typeof window.SocketService.initConnection === 'function') {
        window.SocketService.initConnection();
    }
});

window.switchView = switchView;
window.restoreActiveView = restoreActiveView;
