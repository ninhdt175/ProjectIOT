// Dịch vụ giao tiếp dữ liệu REST API (HTTP Service)
const HttpService = {
    getBaseUrl() {
        return window.APP_CONFIG?.BACKEND_URL || (window.location.port === '3000' ? window.location.origin : 'http://localhost:3000');
    },

    // Lấy lịch sử dữ liệu cảm biến từ Backend
    async getSensorHistory(page = 1, limit = 100) {
        try {
            const baseUrl = this.getBaseUrl();
            const res = await fetch(`${baseUrl}/api/sensors/history?page=${page}&limit=${limit}`);
            if (res.ok) {
                const json = await res.json();
                return json.data || [];
            }
            return null;
        } catch (e) {
            console.warn('[HttpService] Không thể kết nối API cảm biến:', e.message);
            return null;
        }
    },

    // Lấy lịch sử điều khiển thiết bị từ Backend
    async getControlHistory(page = 1, limit = 50) {
        try {
            const baseUrl = this.getBaseUrl();
            const res = await fetch(`${baseUrl}/api/controls/history?page=${page}&limit=${limit}`);
            if (res.ok) {
                const json = await res.json();
                return json.data || [];
            }
            return null;
        } catch (e) {
            console.warn('[HttpService] Không thể kết nối API lịch sử:', e.message);
            return null;
        }
    }
};

window.HttpService = HttpService;
