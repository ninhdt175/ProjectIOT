/**
 * ==============================================================================
 * SOURCE PAGES: CONTROL HISTORY VIEW (HISTORY.JS)
 * ==============================================================================
 * Logic nghiệp vụ riêng biệt cho màn hình Lịch sử điều khiển thiết bị
 * Hỗ trợ trạng thái: Thành công (success), Đang chờ (pending), Thất bại (failed)
 * Tuân thủ yêu cầu: Chỉ thực hiện lọc khi người dùng bấm nút "Lọc" hoặc nhấn Enter
 * ==============================================================================
 */

// Danh sách lịch sử điều khiển lấy từ cấu hình mặc định
let controlHistoryList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_HISTORY)
    ? [...window.APP_CONFIG.DEFAULT_HISTORY]
    : [];

// Trạng thái bộ lọc đang được áp dụng (chỉ thay đổi khi bấm nút "Lọc")
let appliedHistoryFilters = {
    time: '',
    device: 'ALL',
    status: 'ALL'
};

// Cấu hình phân trang (7 bản ghi / trang chia đều 14 bản ghi thành 2 trang đầy đủ, không bị thanh cuộn)
let currentHistoryPage = 1;
const historyPageSize = 7;

/**
 * Hiển thị danh sách lịch sử điều khiển lên giao diện Bảng
 * Sử dụng bộ lọc đã được bấm áp dụng và hỗ trợ phân trang
 */
function renderControlHistoryTable() {
    const tableBody = document.getElementById('history-table-body');
    const paginationInfo = document.getElementById('history-pagination-info');
    const paginationControls = document.getElementById('history-pagination-controls');
    if (!tableBody) return;

    // Lọc theo 3 tiêu chí đã được xác nhận lọc
    const filtered = controlHistoryList.filter(item => {
        const matchesTime = !appliedHistoryFilters.time || 
                            (item.time && item.time.toLowerCase().includes(appliedHistoryFilters.time));
        
        const matchesDevice = (appliedHistoryFilters.device === 'ALL') || 
                              (item.device && item.device.includes(appliedHistoryFilters.device)) ||
                              (item.deviceId && item.deviceId.includes(appliedHistoryFilters.device));

        const matchesStatus = (appliedHistoryFilters.status === 'ALL') || 
                              (item.status === appliedHistoryFilters.status);

        return matchesTime && matchesDevice && matchesStatus;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / historyPageSize));
    if (currentHistoryPage > totalPages) {
        currentHistoryPage = 1;
    }

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

    // Cắt dữ liệu theo trang hiện tại
    const startIndex = (currentHistoryPage - 1) * historyPageSize;
    const endIndex = Math.min(startIndex + historyPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    let rowsHtml = pageItems.map(item => {
        // Xử lý 3 trạng thái: Thành công, Đang chờ (Pending), Thất bại
        let badgeClass = 'badge-green';
        let badgeText = 'Thành công';

        if (item.status === 'pending') {
            badgeClass = 'badge-yellow badge-pending';
            badgeText = 'Đang chờ';
        } else if (item.status === 'failed') {
            badgeClass = 'badge-red';
            badgeText = 'Thất bại';
        }

        const actionColor = item.action === 'ON' ? 'var(--status-up)' : 'var(--status-down)';

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

    // Bổ sung các hàng trống nếu số lượng bản ghi chưa đủ 7 để giữ nguyên 100% vị trí phần chọn trang
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

    // Cập nhật thông tin số lượng bản ghi hiển thị (VD: Hiển thị 1 - 5 trong số 14 bản ghi)
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

    // Cập nhật các nút phân trang
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

/**
 * Chuyển tới số trang chỉ định cho bảng Lịch sử
 * @param {number} page - Số trang
 */
function goToHistoryPage(page) {
    const filtered = controlHistoryList.filter(item => {
        const matchesTime = !appliedHistoryFilters.time || 
                            (item.time && item.time.toLowerCase().includes(appliedHistoryFilters.time));
        const matchesDevice = (appliedHistoryFilters.device === 'ALL') || 
                              (item.device && item.device.includes(appliedHistoryFilters.device)) ||
                              (item.deviceId && item.deviceId.includes(appliedHistoryFilters.device));
        const matchesStatus = (appliedHistoryFilters.status === 'ALL') || 
                              (item.status === appliedHistoryFilters.status);
        return matchesTime && matchesDevice && matchesStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / historyPageSize));
    if (page < 1 || page > totalPages) return;

    currentHistoryPage = page;
    renderControlHistoryTable();
}

/**
 * Xử lý khi người dùng BẤM NÚT "LỌC" hoặc nhấn ENTER
 * Đọc giá trị từ các ô chọn và thực hiện lọc
 */
function handleManualFilterHistory() {
    const timeVal = document.getElementById('history-time-search-input')?.value.toLowerCase().trim() || '';
    const deviceVal = document.getElementById('history-device-filter')?.value || 'ALL';
    const statusVal = document.getElementById('history-status-filter')?.value || 'ALL';

    // Cập nhật bộ lọc chính thức và quay về trang 1
    appliedHistoryFilters = {
        time: timeVal,
        device: deviceVal,
        status: statusVal
    };
    currentHistoryPage = 1;

    renderControlHistoryTable();

    if (typeof showToast === 'function') {
        showToast('Đã áp dụng bộ lọc lịch sử điều khiển', 'info');
    }
}

/**
 * Đặt lại toàn bộ ô tìm kiếm và bộ lọc về mặc định
 */
function resetHistoryFilters() {
    const timeInput = document.getElementById('history-time-search-input');
    const deviceSelect = document.getElementById('history-device-filter');
    const statusSelect = document.getElementById('history-status-filter');

    if (timeInput) timeInput.value = '';
    if (deviceSelect) deviceSelect.value = 'ALL';
    if (statusSelect) statusSelect.value = 'ALL';

    // Xóa bộ lọc áp dụng và quay về trang 1
    appliedHistoryFilters = {
        time: '',
        device: 'ALL',
        status: 'ALL'
    };
    currentHistoryPage = 1;

    renderControlHistoryTable();

    if (typeof showToast === 'function') {
        showToast('Đã đặt lại toàn bộ bộ lọc lịch sử', 'info');
    }
}

/**
 * Thêm bản ghi điều khiển mới vào đầu danh sách
 * @param {Object} log - Bản ghi mới
 */
function appendControlLog(log) {
    controlHistoryList.unshift(log);
    if (controlHistoryList.length > 50) {
        controlHistoryList.pop();
    }
    renderControlHistoryTable();
}

/**
 * Đồng bộ dữ liệu từ Backend REST API qua HttpService
 */
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

// Khởi chạy khi nạp trang
document.addEventListener('DOMContentLoaded', () => {
    renderControlHistoryTable();
    fetchControlHistoryFromAPI();

    // Hỗ trợ phím Enter trên ô tìm kiếm thời gian
    const timeSearchInput = document.getElementById('history-time-search-input');
    if (timeSearchInput) {
        timeSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterHistory();
            }
        });
    }
});

// Xuất các hàm ra window
window.renderControlHistoryTable = renderControlHistoryTable;
window.appendControlLog = appendControlLog;
window.handleManualFilterHistory = handleManualFilterHistory;
window.resetHistoryFilters = resetHistoryFilters;
window.goToHistoryPage = goToHistoryPage;
