// Dịch vụ giao tiếp dữ liệu REST API
const HttpService = {
    getBaseUrl() {
        return window.APP_CONFIG?.BACKEND_URL || (window.location.port === '3000' ? window.location.origin : 'http://localhost:3000');
    },

    // Gửi yêu cầu đăng nhập tài khoản
    async login(username, password) {
        try {
            const baseUrl = this.getBaseUrl();
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    // Lấy lịch sử dữ liệu cảm biến từ Backend (hỗ trợ phân trang, lọc, sắp xếp server-side)
    async getSensorHistory(params = {}) {
        try {
            const baseUrl = this.getBaseUrl();
            const query = new URLSearchParams();
            if (params.page) query.set('page', params.page);
            if (params.limit) query.set('limit', params.limit);
            if (params.sort) query.set('sort', params.sort);
            if (params.field && params.field !== 'ALL') query.set('field', params.field);
            if (params.search) query.set('search', params.search);

            const res = await fetch(`${baseUrl}/api/sensors/history?${query.toString()}`);
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (e) {
            console.warn('[HttpService] Không thể kết nối API cảm biến:', e.message);
            return null;
        }
    },

    // Lấy lịch sử điều khiển thiết bị từ Backend 
    async getControlHistory(params = {}) {
        try {
            const baseUrl = this.getBaseUrl();
            const query = new URLSearchParams();
            if (params.page) query.set('page', params.page);
            if (params.limit) query.set('limit', params.limit);
            if (params.sort) query.set('sort', params.sort);
            if (params.time) query.set('time', params.time);
            if (params.device && params.device !== 'ALL') query.set('device', params.device);
            if (params.action && params.action !== 'ALL') query.set('action', params.action);
            if (params.status && params.status !== 'ALL') query.set('status', params.status);

            const res = await fetch(`${baseUrl}/api/controls/history?${query.toString()}`);
            if (res.ok) {
                return await res.json();
            }
            return null;
        } catch (e) {
            console.warn('[HttpService] Không thể kết nối API lịch sử:', e.message);
            return null;
        }
    }
};

window.HttpService = HttpService;
