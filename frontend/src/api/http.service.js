// Dịch vụ giao tiếp với Backend qua giao thức HTTP REST API
const HttpService = {
    // Lấy danh sách lịch sử dữ liệu cảm biến có phân trang (page: trang số, limit: số bản ghi)
    async getSensorHistory(page = 1, limit = 20) {
        try {
            const res = await fetch(`/api/sensors/history?page=${page}&limit=${limit}`);
            if (res.ok) {
                const json = await res.json();
                return json.data || [];
            }
            return null;
        } catch (e) {
            return null; // Trả về null khi chưa chạy backend hoặc lỗi mạng
        }
    },

    // Lấy danh sách nhật ký điều khiển thiết bị có phân trang (page: trang số, limit: số bản ghi)
    async getControlHistory(page = 1, limit = 20) {
        try {
            const res = await fetch(`/api/controls/history?page=${page}&limit=${limit}`);
            if (res.ok) {
                const json = await res.json();
                return json.data || [];
            }
            return null;
        } catch (e) {
            return null; // Trả về null khi chưa chạy backend hoặc lỗi mạng
        }
    }
};

// Xuất dịch vụ HttpService ra phạm vi toàn cục
window.HttpService = HttpService;

