// Dịch vụ giao tiếp dữ liệu REST API (HTTP Service)
const HttpService = {
    // Lấy lịch sử dữ liệu cảm biến từ Backend
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

    // Lấy lịch sử điều khiển thiết bị từ Backend
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
