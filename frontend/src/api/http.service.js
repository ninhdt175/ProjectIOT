const HttpService = {
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
