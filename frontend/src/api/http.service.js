const HttpService = {
    /**
     * Gửi yêu cầu đăng nhập tài khoản
     * @param {string} username - Tên đăng nhập
     * @param {string} password - Mật khẩu
     */
    async login(username, password) {
        try {
            const res = await fetch('/api/auth/login', {
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

    /**
     * Lấy danh sách lịch sử dữ liệu cảm biến
     * @param {number} page - Trang số
     * @param {number} limit - Số bản ghi trên 1 trang
     */
    async getSensorHistory(page = 1, limit = 20) {
        try {
            const res = await fetch(`/api/sensors/history?page=${page}&limit=${limit}`);
            if (res.ok) {
                const json = await res.json();
                return json.data || [];
            }
            return null;
        } catch (e) {
            return null;
        }
    },

    /**
     * Lấy danh sách nhật ký điều khiển thiết bị
     * @param {number} page - Trang số
     * @param {number} limit - Số bản ghi trên 1 trang
     */
    async getControlHistory(page = 1, limit = 20) {
        try {
            const res = await fetch(`/api/controls/history?page=${page}&limit=${limit}`);
            if (res.ok) {
                const json = await res.json();
                return json.data || [];
            }
            return null;
        } catch (e) {
            return null;
        }
    }
};

window.HttpService = HttpService;
