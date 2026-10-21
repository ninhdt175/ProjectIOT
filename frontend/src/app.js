// Trạng thái toàn cục (Global State)
const AppState = {
    isOnline: true,
    socket: null,
    backendUrl: window.APP_CONFIG ? window.APP_CONFIG.BACKEND_URL : window.location.origin,
    devices: window.APP_CONFIG ? JSON.parse(JSON.stringify(window.APP_CONFIG.DEVICES)) : {}
};

window.AppState = AppState;

// Chuyển đổi màn hình hiển thị (Tab Navigation)
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

    // Tự động làm mới và đồng bộ dữ liệu khi chuyển sang tab Cảm biến hoặc Lịch sử
    if (viewId === 'sensors') {
        if (typeof window.fetchSensorDataFromAPI === 'function') {
            window.fetchSensorDataFromAPI();
        } else if (typeof window.renderSensorTable === 'function') {
            window.renderSensorTable();
        }
    } else if (viewId === 'history') {
        if (typeof window.fetchControlHistoryFromAPI === 'function') {
            window.fetchControlHistoryFromAPI();
        } else if (typeof window.renderControlHistoryTable === 'function') {
            window.renderControlHistoryTable();
        }
    }

    try {
        sessionStorage.setItem('activeView', viewId);
    } catch (e) {
        console.warn('Không thể ghi sessionStorage:', e);
    }
}

// Khôi phục màn hình đang làm việc từ sessionStorage khi F5
function restoreActiveView() {
    let savedView = 'dashboard';
    try {
        savedView = sessionStorage.getItem('activeView') || 'dashboard';
    } catch (e) {
        savedView = 'dashboard';
    }

    const targetNav = document.querySelector(`.nav-item[data-view="${savedView}"]`) || 
                      document.querySelector(`.nav-item[onclick*="'${savedView}'"]`) || 
                      document.querySelector('.nav-list .nav-item');
    switchView(savedView, targetNav);

    // Gỡ thẻ style tạm thời chống nháy giao diện
    const earlyStyle = document.getElementById('early-view-style');
    if (earlyStyle) {
        earlyStyle.remove();
    }
}

// Khởi chạy khi tài liệu HTML tải xong
document.addEventListener('DOMContentLoaded', () => {
    restoreActiveView();
    if (window.SocketService && typeof window.SocketService.initConnection === 'function') {
        window.SocketService.initConnection();
    }
});

// Xuất các hàm ra phạm vi toàn cục
window.switchView = switchView;
window.restoreActiveView = restoreActiveView;
