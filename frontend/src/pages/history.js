// Quản lý trang lịch sử điều khiển thiết bị (History Controller)

let controlHistoryList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_HISTORY)
    ? [...window.APP_CONFIG.DEFAULT_HISTORY]
    : [];

let appliedHistoryFilters = {
    time: '',
    device: 'ALL',
    action: 'ALL',
    status: 'ALL'
};

let historySortOrder = 'DESC';
let currentHistoryPage = 1;
let historyPageSize = 7;

// Chuẩn hóa định dạng thời gian thực hiện YYYY-MM-DD HH:mm:ss theo chuẩn trang cảm biến
function formatHistoryTime(timeVal, createdAtVal) {
    const raw = timeVal || createdAtVal;
    if (!raw) return '';
    const str = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}$/.test(str)) {
        return str;
    }
    const d = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str);
    if (!isNaN(d.getTime())) {
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
    return str;
}

// Chuyển đổi chuỗi thời gian nhật ký thành timestamp so sánh chuẩn theo trang cảm biến
function parseHistoryTimestamp(timeStr) {
    if (!timeStr) return 0;
    const str = String(timeStr).trim();

    // 1. Chuẩn YYYY-MM-DD HH:mm:ss hoặc ISO timestamp
    const parsed = new Date(str.includes(' ') && !str.includes('T') ? str.replace(' ', 'T') : str).getTime();
    if (!isNaN(parsed)) return parsed;

    // 2. Tương thích ngược với các chuỗi hiển thị tương đối cũ
    const now = new Date();
    if (str.startsWith('Hôm nay,')) {
        const timePart = str.replace('Hôm nay,', '').trim();
        const parts = timePart.split(':').map(Number);
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0] || 0, parts[1] || 0, parts[2] || 0);
        return d.getTime();
    }

    if (str.startsWith('Hôm qua,')) {
        const timePart = str.replace('Hôm qua,', '').trim();
        const parts = timePart.split(':').map(Number);
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, parts[0] || 0, parts[1] || 0, parts[2] || 0);
        return d.getTime();
    }

    return 0;
}

// Kiểm tra bản ghi có thỏa mãn 4 tiêu chí lọc
function matchesHistoryFilter(item) {
    const matchesTime = !appliedHistoryFilters.time || 
                        (item.time && item.time.toLowerCase().includes(appliedHistoryFilters.time));
    
    const matchesDevice = (appliedHistoryFilters.device === 'ALL') || 
                          (item.device && item.device.includes(appliedHistoryFilters.device)) ||
                          (item.deviceId && item.deviceId.includes(appliedHistoryFilters.device));

    const matchesAction = (appliedHistoryFilters.action === 'ALL') || 
                          (item.action === appliedHistoryFilters.action);

    const matchesStatus = (appliedHistoryFilters.status === 'ALL') || 
                          (item.status === appliedHistoryFilters.status);

    return matchesTime && matchesDevice && matchesAction && matchesStatus;
}

// Render bảng lịch sử điều khiển (cố định 7 dòng kèm phân trang)
function renderControlHistoryTable() {
    const tableBody = document.getElementById('history-table-body');
    const paginationInfo = document.getElementById('history-pagination-info');
    const paginationControls = document.getElementById('history-pagination-controls');
    if (!tableBody) return;

    const filtered = controlHistoryList.filter(matchesHistoryFilter);

    filtered.sort((a, b) => {
        const timeA = parseHistoryTimestamp(a.time);
        const timeB = parseHistoryTimestamp(b.time);
        return historySortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });

    const sortSelect = document.getElementById('history-sort-order');
    if (sortSelect && sortSelect.value !== historySortOrder) {
        sortSelect.value = historySortOrder;
    }
    const sortIcon = document.getElementById('history-sort-icon');
    if (sortIcon) {
        sortIcon.className = historySortOrder === 'ASC' ? 'ph-bold ph-arrow-up' : 'ph-bold ph-arrow-down';
    }

    const sizeSelect = document.getElementById('history-page-size');
    if (sizeSelect && sizeSelect.value !== String(historyPageSize)) {
        sizeSelect.value = String(historyPageSize);
    }

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

    const startIndex = (currentHistoryPage - 1) * historyPageSize;
    const endIndex = Math.min(startIndex + historyPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

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

    // Đệm dòng trống giữ nguyên chiều cao bảng 481px
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

    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

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

// Chuyển trang phân trang
function goToHistoryPage(page) {
    const filtered = controlHistoryList.filter(matchesHistoryFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / historyPageSize));

    if (page < 1 || page > totalPages) return;

    currentHistoryPage = page;
    renderControlHistoryTable();
}

// Áp dụng bộ lọc tìm kiếm
function handleManualFilterHistory() {
    const timeVal = document.getElementById('history-time-search-input')?.value.toLowerCase().trim() || '';
    const deviceVal = document.getElementById('history-device-filter')?.value || 'ALL';
    const actionVal = document.getElementById('history-action-filter')?.value || 'ALL';
    const statusVal = document.getElementById('history-status-filter')?.value || 'ALL';

    appliedHistoryFilters = {
        time: timeVal,
        device: deviceVal,
        action: actionVal,
        status: statusVal
    };

    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// Xử lý thay đổi số lượng bản ghi hiển thị trên mỗi trang
function handleHistoryPageSizeChange(newSize) {
    historyPageSize = parseInt(newSize, 10) || 7;
    currentHistoryPage = 1;

    const sizeSelect = document.getElementById('history-page-size');
    if (sizeSelect) sizeSelect.value = String(historyPageSize);

    renderControlHistoryTable();
}

// Đặt lại toàn bộ bộ lọc
function resetHistoryFilters() {
    const timeInput = document.getElementById('history-time-search-input');
    const deviceSelect = document.getElementById('history-device-filter');
    const actionSelect = document.getElementById('history-action-filter');
    const statusSelect = document.getElementById('history-status-filter');
    const sortSelect = document.getElementById('history-sort-order');
    const sortIcon = document.getElementById('history-sort-icon');
    const sizeSelect = document.getElementById('history-page-size');

    if (timeInput) timeInput.value = '';
    if (deviceSelect) deviceSelect.value = 'ALL';
    if (actionSelect) actionSelect.value = 'ALL';
    if (statusSelect) statusSelect.value = 'ALL';

    historySortOrder = 'DESC';
    if (sortSelect) sortSelect.value = 'DESC';
    if (sortIcon) sortIcon.className = 'ph-bold ph-arrow-down';

    historyPageSize = 7;
    if (sizeSelect) sizeSelect.value = '7';

    appliedHistoryFilters = {
        time: '',
        device: 'ALL',
        action: 'ALL',
        status: 'ALL'
    };

    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// Xử lý thay đổi chiều sắp xếp qua dropdown
function handleHistorySortChange(order) {
    historySortOrder = order;
    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// Đảo chiều sắp xếp khi nhấn tiêu đề cột thời gian
function toggleHistoryTimeSort() {
    historySortOrder = (historySortOrder === 'DESC') ? 'ASC' : 'DESC';
    currentHistoryPage = 1;
    renderControlHistoryTable();
}

// Chèn bản ghi điều khiển mới vào đầu danh sách (chuẩn hóa thời gian theo trang sensor)
function appendControlLog(log) {
    if (log) {
        log.time = formatHistoryTime(log.time, log.created_at);
    }
    controlHistoryList.unshift(log);
    if (controlHistoryList.length > 100) {
        controlHistoryList.pop();
    }
    renderControlHistoryTable();
}

// Cập nhật trạng thái lệnh (ACK)
function updateControlLogStatus(logId, newStatus) {
    if (!logId) return;
    const item = controlHistoryList.find(log => log.id === logId);
    if (item) {
        item.status = newStatus;
        renderControlHistoryTable();
    }
}

// Đồng bộ dữ liệu lịch sử từ Backend REST API (chuẩn hóa thời gian thực hiện theo trang sensor)
async function fetchControlHistoryFromAPI() {
    if (window.HttpService && typeof window.HttpService.getControlHistory === 'function') {
        const data = await window.HttpService.getControlHistory(1, 100);
        if (data && Array.isArray(data) && data.length > 0) {
            controlHistoryList = data.map(item => ({
                id: item.id,
                time: formatHistoryTime(item.time, item.created_at),
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

document.addEventListener('DOMContentLoaded', () => {
    renderControlHistoryTable();
    fetchControlHistoryFromAPI();

    const timeSearchInput = document.getElementById('history-time-search-input');
    if (timeSearchInput) {
        timeSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterHistory();
            }
        });
    }
});

window.renderControlHistoryTable = renderControlHistoryTable;
window.appendControlLog = appendControlLog;
window.updateControlLogStatus = updateControlLogStatus;
window.handleManualFilterHistory = handleManualFilterHistory;
window.handleHistorySortChange = handleHistorySortChange;
window.toggleHistoryTimeSort = toggleHistoryTimeSort;
window.resetHistoryFilters = resetHistoryFilters;
window.goToHistoryPage = goToHistoryPage;
window.handleHistoryPageSizeChange = handleHistoryPageSizeChange;
window.fetchControlHistoryFromAPI = fetchControlHistoryFromAPI;
