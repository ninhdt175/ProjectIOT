// =============================================================================
// TẬP TIN: history.js
// VAI TRÒ: QUẢN LÝ TRANG LỊCH SỬ ĐIỀU KHIỂN THIẾT BỊ (Device Control History Page Controller)
// MÔ TẢ:
//   Tập tin này xử lý toàn bộ logic cho trang "Lịch sử điều khiển":
//   1. Quản lý danh sách nhật ký các lệnh bật/tắt (controlHistoryList).
//   2. Bộ lọc kết hợp 4 tiêu chí đồng thời:
//      - Mốc thời gian (nhập chuỗi tìm kiếm).
//      - Thiết bị (Tất cả, Đèn LED 1, Đèn LED 2, Đèn LED 3).
//      - Hành động (Tất cả, BẬT / ON, TẮT / OFF).
//      - Trạng thái thực thi (Tất cả, Thành công, Đang chờ, Thất bại).
//   3. Phân trang dữ liệu: Cố định 7 dòng mỗi trang kèm cơ chế đệm dòng trống.
//   4. Cập nhật động trạng thái lệnh: Cho phép chuyển trạng thái của một lệnh
//      từ 'pending' (Đang chờ - vàng) sang 'success' (Thành công - xanh) hoặc 'failed' (Thất bại - đỏ)
//      khi nhận được gói tin xác nhận ACK từ Backend hoặc vi điều khiển ESP32.
//   5. Đồng bộ REST API và hỗ trợ sao chép mốc thời gian vào Clipboard.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. CÁC BIẾN TRẠNG THÁI TOÀN CỤC CHO TRANG LỊCH SỬ ĐIỀU KHIỂN
// -----------------------------------------------------------------------------

// controlHistoryList: Mảng lưu trữ toàn bộ danh sách nhật ký điều khiển trong bộ nhớ Front-End.
// Khởi tạo bằng bản sao mảng mẫu trong app.config.js
let controlHistoryList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_HISTORY)
    ? [...window.APP_CONFIG.DEFAULT_HISTORY]
    : [];

// appliedHistoryFilters: Đối tượng lưu trữ 4 tiêu chí lọc hiện tại
let appliedHistoryFilters = {
    time: '',     // Chuỗi tìm kiếm theo mốc thời gian (chuỗi thường)
    device: 'ALL', // Lọc theo thiết bị: 'ALL' | 'LED_01' | 'LED_02' | 'LED_03'
    action: 'ALL', // Lọc theo hành động: 'ALL' | 'ON' | 'OFF'
    status: 'ALL'  // Lọc theo trạng thái: 'ALL' | 'success' | 'pending' | 'failed'
};

// historySortOrder: Chiều sắp xếp theo thời gian nhật ký điều khiển:
// - 'DESC': Mới nhất trước (Giảm dần theo thời gian, mặc định)
// - 'ASC': Cũ nhất trước (Tăng dần theo thời gian)
let historySortOrder = 'DESC';

// currentHistoryPage: Số thứ tự trang người dùng đang xem (bắt đầu từ trang 1)
let currentHistoryPage = 1;

// historyPageSize: Số lượng dòng bản ghi hiển thị trên mỗi trang (7 bản ghi)
const historyPageSize = 7;

// -----------------------------------------------------------------------------
// HÀM CHUYỂN ĐỔI CHUỖI THỜI GIAN NHẬT KÝ THÀNH MỐC MILI-GIÂY (PARSE HISTORY TIMESTAMP)
// -----------------------------------------------------------------------------
// Xử lý linh hoạt các định dạng thời gian trong hệ thống:
// - "Hôm nay, HH:mm:ss" -> timestamp ngày hôm nay
// - "Hôm qua, HH:mm:ss" -> timestamp ngày hôm qua
// - "YYYY-MM-DD HH:mm:ss" hoặc ISO string -> timestamp chuẩn
// Tham số đầu vào:
// - timeStr (string): Chuỗi thời gian cần phân tích.
// Giá trị trả về:
// - number: Mốc thời gian mili-giây (timestamp), dùng để so sánh số học khi sắp xếp.
function parseHistoryTimestamp(timeStr) {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();
    const now = new Date();

    // 1. Trường hợp thời gian bắt đầu bằng "Hôm nay,"
    if (str.startsWith('Hôm nay,')) {
        const timePart = str.replace('Hôm nay,', '').trim();
        const parts = timePart.split(':').map(Number);
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0] || 0, parts[1] || 0, parts[2] || 0);
        return d.getTime();
    }

    // 2. Trường hợp thời gian bắt đầu bằng "Hôm qua,"
    if (str.startsWith('Hôm qua,')) {
        const timePart = str.replace('Hôm qua,', '').trim();
        const parts = timePart.split(':').map(Number);
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, parts[0] || 0, parts[1] || 0, parts[2] || 0);
        return d.getTime();
    }

    // 3. Trường hợp thời gian theo định dạng ISO hoặc "YYYY-MM-DD HH:mm:ss"
    const parsed = new Date(str.replace(' ', 'T')).getTime();
    if (!isNaN(parsed)) return parsed;

    return 0;
}

// -----------------------------------------------------------------------------
// 2. HÀM KIỂM TRA BẢN GHI CÓ THỎA MÃN BỘ LỌC (MATCHES HISTORY FILTER)
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - item (Object): Một bản ghi nhật ký điều khiển cần kiểm tra.
// Giá trị trả về:
// - boolean: true nếu thỏa mãn TẤT CẢ 4 tiêu chí, false nếu vi phạm bất kỳ tiêu chí nào.
function matchesHistoryFilter(item) {
    // 1. TIÊU CHÍ THỜI GIAN:
    // Nếu không nhập từ khóa thời gian (!appliedHistoryFilters.time) -> thỏa mãn.
    // Nếu có nhập -> kiểm tra xem chuỗi thời gian của bản ghi có chứa từ khóa không.
    const matchesTime = !appliedHistoryFilters.time || 
                        (item.time && item.time.toLowerCase().includes(appliedHistoryFilters.time));
    
    // 2. TIÊU CHÍ THIẾT BỊ:
    // Thỏa mãn nếu chọn 'ALL', hoặc tên thiết bị chứa mã thiết bị (VD: 'LED_01')
    const matchesDevice = (appliedHistoryFilters.device === 'ALL') || 
                          (item.device && item.device.includes(appliedHistoryFilters.device)) ||
                          (item.deviceId && item.deviceId.includes(appliedHistoryFilters.device));

    // 3. TIÊU CHÍ HÀNH ĐỘNG (BẬT / TẮT):
    // Thỏa mãn nếu chọn 'ALL', hoặc thuộc tính action trùng khớp chính xác ('ON' hoặc 'OFF')
    const matchesAction = (appliedHistoryFilters.action === 'ALL') || 
                          (item.action === appliedHistoryFilters.action);

    // 4. TIÊU CHÍ TRẠNG THÁI THỰC THI (Thành công / Đang chờ / Thất bại):
    // Thỏa mãn nếu chọn 'ALL', hoặc thuộc tính status trùng khớp ('success', 'pending', 'failed')
    const matchesStatus = (appliedHistoryFilters.status === 'ALL') || 
                          (item.status === appliedHistoryFilters.status);

    // Kết hợp cả 4 điều kiện bằng toán tử logic AND (&&)
    return matchesTime && matchesDevice && matchesAction && matchesStatus;
}

// -----------------------------------------------------------------------------
// 3. HÀM HIỂN THỊ DỮ LIỆU LÊN GIAO DIỆN BẢNG (RENDER CONTROL HISTORY TABLE)
// -----------------------------------------------------------------------------
function renderControlHistoryTable() {
    // 1. Tìm các phần tử DOM của bảng và phân trang
    const tableBody = document.getElementById('history-table-body');
    const paginationInfo = document.getElementById('history-pagination-info');
    const paginationControls = document.getElementById('history-pagination-controls');
    if (!tableBody) return;

    // 2. LỌC DỮ LIỆU THEO 4 TIÊU CHÍ ĐANG CHỌN:
    const filtered = controlHistoryList.filter(matchesHistoryFilter);

    // 3. SẮP XẾP DỮ LIỆU THEO MỐC THỜI GIAN:
    // Sắp xếp các bản ghi theo chiều giảm dần (DESC - mới nhất trước) hoặc tăng dần (ASC - cũ nhất trước)
    filtered.sort((a, b) => {
        const timeA = parseHistoryTimestamp(a.time);
        const timeB = parseHistoryTimestamp(b.time);
        return historySortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    // Đồng bộ trạng thái thẻ chọn (select) và biểu tượng mũi tên sắp xếp trên tiêu đề cột:
    const sortSelect = document.getElementById('history-sort-order');
    if (sortSelect && sortSelect.value !== historySortOrder) {
        sortSelect.value = historySortOrder;
    }
    const sortIcon = document.getElementById('history-sort-icon');
    if (sortIcon) {
        sortIcon.className = historySortOrder === 'ASC' ? 'ph-bold ph-arrow-up' : 'ph-bold ph-arrow-down';
    }

    // 4. TÍNH TOÁN PHÂN TRANG:
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / historyPageSize));
    if (currentHistoryPage > totalPages) {
        currentHistoryPage = 1;
    }

    // 4. XỬ LÝ TRƯỜNG HỢP KHÔNG TÌM THẤY BẢN GHI NÀO PHÙ HỢP:
    if (totalItems === 0) {
        let emptyHtml = `<tr class="empty-row"><td colspan="5" style="text-align: center; color: var(--text-muted);">Không tìm thấy nhật ký điều khiển phù hợp</td></tr>`;
        for (let i = 1; i < historyPageSize; i++) {
            emptyHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
        }
        tableBody.innerHTML = emptyHtml;

        if (paginationInfo) paginationInfo.textContent = 'Hiển thị 0 trong số 0 bản ghi';
        if (paginationControls) {
            paginationControls.innerHTML = `
                <button class="page-btn" disabled title="Trang trước"><i class="ph ph-caret-left"></i></button>
                <button class="page-btn active" disabled>1</button>
                <button class="page-btn" disabled title="Trang sau"><i class="ph ph-caret-right"></i></button>
            `;
        }
        return;
    }

    // 5. CẮT DỮ LIỆU THEO TRANG HIỆN TẠI (SLICING):
    const startIndex = (currentHistoryPage - 1) * historyPageSize;
    const endIndex = Math.min(startIndex + historyPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // 6. TẠO HTML CHO CÁC DÒNG DỮ LIỆU:
    let rowsHtml = pageItems.map(item => {
        // Xác định class huy hiệu và chữ hiển thị trạng thái
        let badgeClass = 'badge-green';
        let badgeText = 'Thành công';

        if (item.status === 'pending') {
            badgeClass = 'badge-yellow badge-pending'; // Màu vàng kèm icon quay tròn
            badgeText = 'Đang chờ';
        } else if (item.status === 'failed') {
            badgeClass = 'badge-red';                 // Màu đỏ
            badgeText = 'Thất bại';
        }

        // Màu chữ cho hành động: BẬT hiển thị màu xanh lá (var(--status-up)), TẮT hiển thị màu đỏ (var(--status-down))
        const actionColor = item.action === 'ON' ? 'var(--status-up)' : 'var(--status-down)';

        // Trả về chuỗi HTML 5 cột: Thời gian, Thiết bị, Hành động, Người thực hiện, Trạng thái
        return `
            <tr>
                <td style="font-weight: 500;">
                    <div class="time-cell">
                        <span class="time-text">${item.time}</span>
                        <button class="btn-copy-time" data-time="${item.time}" onclick="handleCopyTimeClick(this)" title="Sao chép thời gian">
                            <i class="ph ph-copy"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <div style="color: var(--text-h); font-weight: 600; margin-bottom: 3px;">${item.device}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.deviceId}</div>
                </td>
                <td><span style="font-weight: 700; color: ${actionColor};">${item.action === 'ON' ? 'BẬT (ON)' : 'TẮT (OFF)'}</span></td>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="ph-fill ph-user-circle" style="font-size: 18px; color: var(--text-muted);"></i>
                        ${item.user}
                    </div>
                </td>
                <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
            </tr>
        `;
    }).join('');

    // 7. ĐỆM CÁC DÒNG TRỐNG NẾU THIẾU DÒNG (ĐẢM BẢO ĐỦ 7 DÒNG):
    const emptyRowsCount = historyPageSize - pageItems.length;
    for (let i = 0; i < emptyRowsCount; i++) {
        rowsHtml += `
            <tr class="empty-row">
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
                <td>&nbsp;</td>
            </tr>
        `;
    }

    tableBody.innerHTML = rowsHtml;

    // 8. CẬP NHẬT NHÃN PHÂN TRANG:
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

    // 9. TẠO CÁC NÚT ĐIỀU HƯỚNG CHUYỂN TRANG:
    if (paginationControls) {
        let buttonsHtml = `
            <button class="page-btn" ${currentHistoryPage === 1 ? 'disabled' : ''} onclick="goToHistoryPage(${currentHistoryPage - 1})" title="Trang trước">
                <i class="ph ph-caret-left"></i>
            </button>
        `;

        for (let p = 1; p <= totalPages; p++) {
            buttonsHtml += `
                <button class="page-btn ${p === currentHistoryPage ? 'active' : ''}" onclick="goToHistoryPage(${p})">${p}</button>
            `;
        }

        buttonsHtml += `
            <button class="page-btn" ${currentHistoryPage === totalPages ? 'disabled' : ''} onclick="goToHistoryPage(${currentHistoryPage + 1})" title="Trang sau">
                <i class="ph ph-caret-right"></i>
            </button>
        `;

        paginationControls.innerHTML = buttonsHtml;
    }
}

// -----------------------------------------------------------------------------
// 4. HÀM CHUYỂN TRANG CHO BẢNG LỊCH SỬ (GO TO HISTORY PAGE)
// -----------------------------------------------------------------------------
function goToHistoryPage(page) {
    const filtered = controlHistoryList.filter(matchesHistoryFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / historyPageSize));

    if (page < 1 || page > totalPages) return;

    currentHistoryPage = page;
    renderControlHistoryTable();
}

// -----------------------------------------------------------------------------
// 5. HÀM XỬ LÝ KHI NGƯỜI DÙNG BẤM NÚT "LỌC" HOẶC NHẤN ENTER (HANDLE MANUAL FILTER HISTORY)
// -----------------------------------------------------------------------------
function handleManualFilterHistory() {
    // Đọc giá trị từ cả 4 ô điều khiển lọc trên giao diện
    const timeVal = document.getElementById('history-time-search-input')?.value.toLowerCase().trim() || '';
    const deviceVal = document.getElementById('history-device-filter')?.value || 'ALL';
    const actionVal = document.getElementById('history-action-filter')?.value || 'ALL';
    const statusVal = document.getElementById('history-status-filter')?.value || 'ALL';

    // Cập nhật đối tượng bộ lọc
    appliedHistoryFilters = {
        time: timeVal,
        device: deviceVal,
        action: actionVal,
        status: statusVal
    };

    // Đưa về trang đầu tiên
    currentHistoryPage = 1;

    // Vẽ lại bảng
    renderControlHistoryTable();
}

// -----------------------------------------------------------------------------
// 6. HÀM ĐẶT LẠI TOÀN BỘ BỘ LỌC VỀ MẶC ĐỊNH (RESET HISTORY FILTERS)
// -----------------------------------------------------------------------------
function resetHistoryFilters() {
    const timeInput = document.getElementById('history-time-search-input');
    const deviceSelect = document.getElementById('history-device-filter');
    const actionSelect = document.getElementById('history-action-filter');
    const statusSelect = document.getElementById('history-status-filter');
    const sortSelect = document.getElementById('history-sort-order');
    const sortIcon = document.getElementById('history-sort-icon');

    // Reset giá trị trên các thẻ HTML
    if (timeInput) timeInput.value = '';
    if (deviceSelect) deviceSelect.value = 'ALL';
    if (actionSelect) actionSelect.value = 'ALL';
    if (statusSelect) statusSelect.value = 'ALL';

    // Đặt lại chiều sắp xếp về mặc định 'DESC' (Mới nhất trước)
    historySortOrder = 'DESC';
    if (sortSelect) sortSelect.value = 'DESC';
    if (sortIcon) sortIcon.className = 'ph-bold ph-arrow-down';

    // Reset biến trạng thái
    appliedHistoryFilters = {
        time: '',
        device: 'ALL',
        action: 'ALL',
        status: 'ALL'
    };

    // Về trang 1 và vẽ lại bảng
    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// -----------------------------------------------------------------------------
// 7. HÀM XỬ LÝ KHI THAY ĐỔI SELECT SẮP XẾP THỜI GIAN (HANDLE HISTORY SORT CHANGE)
// -----------------------------------------------------------------------------
// Kích hoạt khi người dùng thay đổi giá trị trong thẻ <select id="history-sort-order">:
// Tham số đầu vào:
// - order (string): Chiều sắp xếp được chọn ('DESC' | 'ASC').
function handleHistorySortChange(order) {
    historySortOrder = order;
    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// -----------------------------------------------------------------------------
// 8. HÀM ĐẢO CHIỀU SẮP XẾP THỜI GIAN KHI BẤM TIÊU ĐỀ CỘT (TOGGLE HISTORY TIME SORT)
// -----------------------------------------------------------------------------
// Kích hoạt khi người dùng click trực tiếp vào cột "THỜI GIAN THỰC HIỆN" trên bảng:
// Tự động đảo chiều giữa DESC (mới nhất trước) và ASC (cũ nhất trước), đồng thời cập nhật icon mũi tên
function toggleHistoryTimeSort() {
    historySortOrder = (historySortOrder === 'DESC') ? 'ASC' : 'DESC';
    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// -----------------------------------------------------------------------------
// 9. HÀM CHÈN BẢN GHI ĐIỀU KHIỂN MỚI VÀO ĐẦU DANH SÁCH (APPEND CONTROL LOG)
// -----------------------------------------------------------------------------
// Được gọi từ device.component.js ngay khi người dùng gạt công tắc:
// Tham số đầu vào:
// - log (Object): Bản ghi điều khiển mới (thường ở trạng thái status: 'pending').
function appendControlLog(log) {
    // Chèn bản ghi mới vào vị trí đầu tiên
    controlHistoryList.unshift(log);

    // Giới hạn danh sách tối đa 50 bản ghi gần nhất để tránh tốn RAM
    if (controlHistoryList.length > 50) {
        controlHistoryList.pop();
    }

    // Vẽ lại bảng ngay để người dùng thấy dòng "Đang chờ" xuất hiện
    renderControlHistoryTable();
}

// -----------------------------------------------------------------------------
// 10. HÀM CẬP NHẬT TRẠNG THÁI LỆNH ĐIỀU KHIỂN (UPDATE CONTROL LOG STATUS)
// -----------------------------------------------------------------------------
// Được gọi khi nhận được phản hồi xác nhận ACK từ Backend hoặc ESP32:
// Tham số đầu vào:
// - logId (string|number): Mã định danh requestId của lệnh cần cập nhật.
// - newStatus ('success' | 'failed' | 'pending'): Trạng thái mới cần chuyển sang.
function updateControlLogStatus(logId, newStatus) {
    if (!logId) return;

    // Tìm kiếm phần tử có id trùng khớp trong mảng bằng phương thức .find()
    const item = controlHistoryList.find(log => log.id === logId);

    // Nếu tìm thấy, đổi trạng thái và vẽ lại bảng
    if (item) {
        item.status = newStatus;
        renderControlHistoryTable();
    }
}

// -----------------------------------------------------------------------------
// 11. HÀM ĐỒNG BỘ DỮ LIỆU LỊCH SỬ TỪ BACKEND REST API (FETCH CONTROL HISTORY FROM API)
// -----------------------------------------------------------------------------
async function fetchControlHistoryFromAPI() {
    if (window.HttpService && typeof window.HttpService.getControlHistory === 'function') {
        const data = await window.HttpService.getControlHistory(1, 20);
        if (data && Array.isArray(data) && data.length > 0) {
            controlHistoryList = data.map(item => ({
                id: item.id,
                time: item.created_at || item.time,
                device: item.device_name || item.device,
                deviceId: item.device_id || 'ESP32_01',
                action: item.action,
                user: item.user_name || 'Đỗ Trọng Ninh',
                status: item.status || 'success'
            }));
            renderControlHistoryTable();
        }
    }
}

// -----------------------------------------------------------------------------
// 12. SỰ KIỆN KHỞI CHẠY KHI TẢI XONG TRANG (DOM CONTENT LOADED)
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hiển thị bảng ban đầu
    renderControlHistoryTable();
    // 2. Thử lấy dữ liệu từ API nếu có
    fetchControlHistoryFromAPI();

    // 3. Bắt sự kiện phím Enter trên ô tìm kiếm thời gian lịch sử
    const timeSearchInput = document.getElementById('history-time-search-input');
    if (timeSearchInput) {
        timeSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterHistory();
            }
        });
    }
});

// -----------------------------------------------------------------------------
// 13. XUẤT CÁC HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
window.renderControlHistoryTable = renderControlHistoryTable;
window.appendControlLog = appendControlLog;
window.updateControlLogStatus = updateControlLogStatus;
window.handleManualFilterHistory = handleManualFilterHistory;
window.handleHistorySortChange = handleHistorySortChange;
window.toggleHistoryTimeSort = toggleHistoryTimeSort;
window.resetHistoryFilters = resetHistoryFilters;
window.goToHistoryPage = goToHistoryPage;
