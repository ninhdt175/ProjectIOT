/**
 * Dịch vụ giao tiếp với Backend qua giao thức HTTP REST API
 */
const HttpService = {
    /**
     * Lấy danh sách lịch sử dữ liệu cảm biến có phân trang
     * @param {number} page - Số thứ tự trang (mặc định 1)
     * @param {number} limit - Số bản ghi trên mỗi trang (mặc định 20)
     * @returns {Promise<Array|null>} Mảng bản ghi cảm biến hoặc null nếu lỗi
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
            return null; // Trả về null khi chưa chạy backend hoặc lỗi mạng
        }
    },

    /**
     * Lấy danh sách nhật ký điều khiển thiết bị có phân trang
     * @param {number} page - Số thứ tự trang (mặc định 1)
     * @param {number} limit - Số bản ghi trên mỗi trang (mặc định 20)
     * @returns {Promise<Array|null>} Mảng bản ghi điều khiển hoặc null nếu lỗi
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
            return null; // Trả về null khi chưa chạy backend hoặc lỗi mạng
        }
    }
};

// Xuất dịch vụ HttpService ra phạm vi toàn cục
window.HttpService = HttpService;

