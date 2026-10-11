let controlHistoryList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_HISTORY)
    ? [...window.APP_CONFIG.DEFAULT_HISTORY]
    : [];

let appliedHistoryFilters = {
    time: '',
    device: 'ALL',
    action: 'ALL',
    status: 'ALL'
};

let currentHistoryPage = 1;
const historyPageSize = 7;

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

/**
 * Hiển thị danh sách lịch sử điều khiển lên giao diện bảng
 */
function renderControlHistoryTable() {
    const tableBody = document.getElementById('history-table-body');
    const paginationInfo = document.getElementById('history-pagination-info');
    const paginationControls = document.getElementById('history-pagination-controls');
    if (!tableBody) return;

    const filtered = controlHistoryList.filter(matchesHistoryFilter);

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

//Chuyển tới số trang chỉ định cho bảng Lịch sử
function goToHistoryPage(page) {
    const filtered = controlHistoryList.filter(matchesHistoryFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / historyPageSize));
    if (page < 1 || page > totalPages) return;

    currentHistoryPage = page;
    renderControlHistoryTable();
}

//Xử lý khi người dùng bấm nút Lọc hoặc nhấn Enter
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

//Đặt lại toàn bộ ô tìm kiếm và bộ lọc về mặc định
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
 * Đồng bộ dữ liệu từ Backend REST API
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
window.handleManualFilterHistory = handleManualFilterHistory;
window.resetHistoryFilters = resetHistoryFilters;
window.goToHistoryPage = goToHistoryPage;
