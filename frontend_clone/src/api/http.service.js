// =============================================================================
// TẬP TIN: http.service.js
// VAI TRÒ: DỊCH VỤ GIAO TIẾP DỮ LIỆU QUA GIAO THỨC HTTP (REST API Service)
// MÔ TẢ:
//   Tập tin này đóng vai trò là tầng dịch vụ mạng (Network Service Layer) phụ trách:
//   1. Gửi các yêu cầu HTTP GET bất đồng bộ (Asynchronous HTTP Request) tới máy chủ Backend.
//   2. Sử dụng Fetch API tiêu chuẩn của trình duyệt (hỗ trợ Promise và cú pháp async/await).
//   3. Hỗ trợ truyền tham số phân trang qua chuỗi truy vấn (Query String: ?page=...&limit=...).
//   4. Xử lý lỗi ngoại lệ an toàn (Graceful Fallback) khi Backend chưa khởi động hoặc mất mạng,
//      giúp giao diện không bị treo hay văng lỗi Javascript ra màn hình người dùng.
// =============================================================================

// Khởi tạo đối tượng dịch vụ HttpService
const HttpService = {
    // -------------------------------------------------------------------------
    // 1. HÀM LẤY DANH SÁCH LỊCH SỬ DỮ LIỆU CẢM BIẾN TỪ BACKEND
    // -------------------------------------------------------------------------
    // Định nghĩa hàm bất đồng bộ (async function) trả về một Promise:
    // Tham số đầu vào:
    // - page (number): Số thứ tự trang cần lấy dữ liệu (mặc định là trang 1 nếu không truyền).
    // - limit (number): Số lượng bản ghi tối đa muốn lấy trong mỗi trang (mặc định 20 bản ghi).
    // Giá trị trả về (return):
    // - Promise<Array>: Mảng các đối tượng dữ liệu cảm biến nhận từ máy chủ.
    // - null: Nếu xảy ra lỗi kết nối, đường dẫn sai hoặc máy chủ trả về mã lỗi HTTP.
    async getSensorHistory(page = 1, limit = 20) {
        try {
            // Sử dụng hàm fetch() tích hợp sẵn của trình duyệt để gửi yêu cầu HTTP GET:
            // Cú pháp template literal (`...`) chèn biến page và limit vào query parameters:
            const res = await fetch(`/api/sensors/history?page=${page}&limit=${limit}`);

            // res.ok là một thuộc tính boolean:
            // - true nếu mã phản hồi HTTP nằm trong dải thành công (200 - 299).
            // - false nếu gặp lỗi phía client (4xx như 404 Not Found) hoặc phía server (5xx như 500 Internal Server Error).
            if (res.ok) {
                // Đọc và chuyển đổi nội dung phản hồi từ dạng chuỗi văn bản JSON sang đối tượng Javascript
                const json = await res.json();

                // Trả về mảng dữ liệu nằm trong thuộc tính 'data' của đối tượng JSON (hoặc mảng rỗng nếu không có)
                return json.data || [];
            }

            // Nếu res.ok là false (máy chủ báo lỗi), trả về null
            return null;
        } catch (e) {
            // Khối catch được kích hoạt khi:
            // - Backend chưa được bật (lỗi ERR_CONNECTION_REFUSED).
            // - Thiết bị mất kết nối mạng Internet / mạng nội bộ.
            // Trả về null an toàn để phía gọi hàm tự động chuyển sang sử dụng dữ liệu mẫu (mock data).
            return null;
        }
    },

    // -------------------------------------------------------------------------
    // 2. HÀM LẤY DANH SÁCH LỊCH SỬ ĐIỀU KHIỂN THIẾT BỊ TỪ BACKEND
    // -------------------------------------------------------------------------
    // Tham số đầu vào:
    // - page (number): Số thứ tự trang cần lấy dữ liệu (mặc định là trang 1).
    // - limit (number): Số lượng bản ghi tối đa trên một trang (mặc định 20 bản ghi).
    // Giá trị trả về:
    // - Promise<Array>: Mảng các bản ghi nhật ký bật/tắt thiết bị nhận từ máy chủ.
    // - null: Khi xảy ra lỗi mạng hoặc máy chủ không phản hồi.
    async getControlHistory(page = 1, limit = 20) {
        try {
            // Gửi yêu cầu HTTP GET tới endpoint /api/controls/history của máy chủ Backend
            const res = await fetch(`/api/controls/history?page=${page}&limit=${limit}`);

            // Kiểm tra trạng thái phản hồi HTTP có thành công không
            if (res.ok) {
                // Giải mã dữ liệu JSON từ body phản hồi
                const json = await res.json();

                // Trả về danh sách bản ghi điều khiển
                return json.data || [];
            }

            // Trả về null nếu mã trạng thái HTTP không hợp lệ
            return null;
        } catch (e) {
            // Bắt lỗi khi không thể thiết lập kết nối tới Backend
            return null;
        }
    }
};

// -----------------------------------------------------------------------------
// 3. XUẤT ĐỐI TƯỢNG DỊCH VỤ RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Gán HttpService vào đối tượng window để các module khác (như sensors.js, history.js)
// có thể gọi trực tiếp: window.HttpService.getSensorHistory(...)
window.HttpService = HttpService;
