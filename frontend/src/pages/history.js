// Danh sách dữ liệu nhật ký điều khiển thiết bị
let controlHistoryList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_HISTORY)
    ? [...window.APP_CONFIG.DEFAULT_HISTORY]
    : [];

// Trạng thái bộ lọc tìm kiếm nhật ký điều khiển
let appliedHistoryFilters = {
    time: '',     // Từ khóa tìm kiếm theo mốc thời gian
    device: 'ALL', // Lọc theo thiết bị ('ALL' | 'LED_01' | 'LED_02' | 'LED_03')
    action: 'ALL', // Lọc theo hành động ('ALL' | 'ON' | 'OFF')
    status: 'ALL'  // Lọc theo trạng thái ('ALL' | 'success' | 'pending' | 'failed')
};

// Quản lý phân trang cho bảng lịch sử điều khiển
let currentHistoryPage = 1;
const historyPageSize = 7; // Số bản ghi hiển thị trên mỗi trang

// Kiểm tra một bản ghi điều khiển có khớp với các tiêu chí lọc hay không (item: bản ghi lịch sử)
function matchesHistoryFilter(item) {
    // 1. Khớp thời gian
    const matchesTime = !appliedHistoryFilters.time || 
                        (item.time && item.time.toLowerCase().includes(appliedHistoryFilters.time));
    
    // 2. Khớp thiết bị
    const matchesDevice = (appliedHistoryFilters.device === 'ALL') || 
                          (item.device && item.device.includes(appliedHistoryFilters.device)) ||
                          (item.deviceId && item.deviceId.includes(appliedHistoryFilters.device));

    // 3. Khớp hành động (BẬT / TẮT)
    const matchesAction = (appliedHistoryFilters.action === 'ALL') || 
                          (item.action === appliedHistoryFilters.action);

    // 4. Khớp trạng thái thực thi (Thành công / Đang chờ / Thất bại)
    const matchesStatus = (appliedHistoryFilters.status === 'ALL') || 
                          (item.status === appliedHistoryFilters.status);

    return matchesTime && matchesDevice && matchesAction && matchesStatus;
}

// Hiển thị danh sách lịch sử điều khiển lên giao diện bảng
function renderControlHistoryTable() {
    const tableBody = document.getElementById('history-table-body');
    const paginationInfo = document.getElementById('history-pagination-info');
    const paginationControls = document.getElementById('history-pagination-controls');
    if (!tableBody) return;

    // 1. Áp dụng các bộ lọc đang chọn
    const filtered = controlHistoryList.filter(matchesHistoryFilter);

    // 2. Tính toán tổng số trang
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / historyPageSize));
    if (currentHistoryPage > totalPages) {
        currentHistoryPage = 1;
    }

    // 3. Xử lý trường hợp không tìm thấy bản ghi nào phù hợp
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

    // 4. Cắt danh sách bản ghi hiển thị trên trang hiện tại
    const startIndex = (currentHistoryPage - 1) * historyPageSize;
    const endIndex = Math.min(startIndex + historyPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // 5. Tạo HTML cho các dòng dữ liệu
    let rowsHtml = pageItems.map(item => {
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

    // 6. Đệm thêm các dòng trống để chiều cao bảng luôn cố định 7 dòng
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

    // 7. Cập nhật nhãn thông tin phân trang
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

    // 8. Tạo các nút bấm chuyển trang
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


// Chuyển tới số trang chỉ định cho bảng Lịch sử điều khiển (page: số trang cần chuyển đến)
function goToHistoryPage(page) {
    const filtered = controlHistoryList.filter(matchesHistoryFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / historyPageSize));
    if (page < 1 || page > totalPages) return;

    currentHistoryPage = page;
    renderControlHistoryTable();
}

// Xử lý khi người dùng bấm nút "Lọc" hoặc nhấn phím Enter tại ô tìm kiếm thời gian
function handleManualFilterHistory() {
    const timeVal = document.getElementById('history-time-search-input')?.value.toLowerCase().trim() || '';
    const deviceVal = document.getElementById('history-device-filter')?.value || 'ALL';
    const actionVal = document.getElementById('history-action-filter')?.value || 'ALL';
    const statusVal = document.getElementById('history-status-filter')?.value || 'ALL';

    // Cập nhật các bộ lọc và đưa về trang đầu tiên
    appliedHistoryFilters = {
        time: timeVal,
        device: deviceVal,
        action: actionVal,
        status: statusVal
    };
    currentHistoryPage = 1;

    renderControlHistoryTable();
}

// Đặt lại toàn bộ ô tìm kiếm và các bộ lọc lựa chọn về trạng thái mặc định
function resetHistoryFilters() {
    const timeInput = document.getElementById('history-time-search-input');
    const deviceSelect = document.getElementById('history-device-filter');
    const actionSelect = document.getElementById('history-action-filter');
    const statusSelect = document.getElementById('history-status-filter');

    if (timeInput) timeInput.value = '';
    if (deviceSelect) deviceSelect.value = 'ALL';
    if (actionSelect) actionSelect.value = 'ALL';
    if (statusSelect) statusSelect.value = 'ALL';

    appliedHistoryFilters = {
        time: '',
        device: 'ALL',
        action: 'ALL',
        status: 'ALL'
    };
    currentHistoryPage = 1;

    renderControlHistoryTable();
}

// Thêm bản ghi điều khiển mới vào đầu danh sách (giới hạn tối đa 50 bản ghi)
function appendControlLog(log) {
    controlHistoryList.unshift(log);
    if (controlHistoryList.length > 50) {
        controlHistoryList.pop();
    }
    renderControlHistoryTable();
}

// Cập nhật trạng thái của bản ghi điều khiển (VD: từ 'pending' sang 'success' hoặc 'failed')
function updateControlLogStatus(logId, newStatus) {
    if (!logId) return;
    const item = controlHistoryList.find(log => log.id === logId);
    if (item) {
        item.status = newStatus;
        renderControlHistoryTable();
    }
}

// Đồng bộ dữ liệu lịch sử điều khiển từ Backend REST API
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

// Lắng nghe sự kiện khi tài liệu HTML tải xong
document.addEventListener('DOMContentLoaded', () => {
    renderControlHistoryTable();
    fetchControlHistoryFromAPI();

    // Bắt sự kiện phím Enter trên ô tìm kiếm thời gian lịch sử
    const timeSearchInput = document.getElementById('history-time-search-input');
    if (timeSearchInput) {
        timeSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterHistory();
            }
        });
    }
});

// Xuất các hàm ra phạm vi toàn cục để dùng từ HTML inline event
window.renderControlHistoryTable = renderControlHistoryTable;
window.appendControlLog = appendControlLog;
window.updateControlLogStatus = updateControlLogStatus;
window.handleManualFilterHistory = handleManualFilterHistory;
window.resetHistoryFilters = resetHistoryFilters;
window.goToHistoryPage = goToHistoryPage;

