// Quản lý trang dữ liệu cảm biến (Sensors Controller)

let sensorDataList = [];

let appliedSensorFilters = {
    search: '',
    field: 'ALL'
};

let sensorSortOrder = 'DESC';
let currentSensorPage = 1;
let sensorPageSize = 7;
let sensorTotalItems = 0;
let sensorTotalPages = 1;

// Kiểm tra bản ghi có khớp bộ lọc hay không
function matchesSensorFilter(item) {
    const search = appliedSensorFilters.search ? appliedSensorFilters.search.toLowerCase().trim() : '';
    const field = appliedSensorFilters.field || 'ALL';

    if (field === 'temperature' && item.type !== 'temperature') return false;
    if (field === 'humidity' && item.type !== 'humidity') return false;
    if (field === 'light' && item.type !== 'light') return false;
    if (field === 'oxygen' && item.type !== 'oxygen') return false;

    if (!search) return true;

    if (field === 'time') {
        return Boolean(item.time && item.time.toLowerCase().includes(search));
    }

    if (field === 'temperature') {
        const valStr = item.value ? String(item.value).toLowerCase() : '';
        const rawStr = (item.rawVal !== undefined && item.rawVal !== null) ? String(item.rawVal).toLowerCase() : '';
        return Boolean(valStr.includes(search) || rawStr.includes(search));
    }

    if (field === 'humidity') {
        const valStr = item.value ? String(item.value).toLowerCase() : '';
        const rawStr = (item.rawVal !== undefined && item.rawVal !== null) ? String(item.rawVal).toLowerCase() : '';
        return Boolean(valStr.includes(search) || rawStr.includes(search));
    }

    if (field === 'light') {
        const valStr = item.value ? String(item.value).toLowerCase() : '';
        const rawStr = (item.rawVal !== undefined && item.rawVal !== null) ? String(item.rawVal).toLowerCase() : '';
        return Boolean(valStr.includes(search) || rawStr.includes(search));
    }

    if (field === 'oxygen') {
        const valStr = item.value ? String(item.value).toLowerCase() : '';
        const rawStr = (item.rawVal !== undefined && item.rawVal !== null) ? String(item.rawVal).toLowerCase() : '';
        return Boolean(valStr.includes(search) || rawStr.includes(search));
    }

    const typeName = item.type === 'temperature' ? 'nhiệt độ' : (item.type === 'humidity' ? 'độ ẩm' : (item.type === 'light' ? 'ánh sáng' : (item.type === 'oxygen' ? 'oxy nồng độ' : '')));
    const valStr = item.value ? String(item.value).toLowerCase() : '';
    const rawStr = (item.rawVal !== undefined && item.rawVal !== null) ? String(item.rawVal).toLowerCase() : '';

    return Boolean(
        (item.time && item.time.toLowerCase().includes(search)) ||
        valStr.includes(search) ||
        rawStr.includes(search) ||
        (item.sensor && item.sensor.toLowerCase().includes(search)) ||
        (item.device && item.device.toLowerCase().includes(search)) ||
        (typeName && typeName.includes(search))
    );
}

// Tạo dãy nút phân trang gọn
function buildSensorPaginationButtons(current, total) {
    let html = `<button class="page-btn" ${current === 1 ? 'disabled' : ''} onclick="goToSensorPage(${current - 1})" title="Trang trước"><i class="ph ph-caret-left"></i></button>`;
    const pages = new Set([1, total, current - 1, current, current + 1].filter(p => p >= 1 && p <= total));
    const sorted = [...pages].sort((a, b) => a - b);
    let prev = 0;
    for (const p of sorted) {
        if (prev && p - prev > 1) {
            html += `<button class="page-btn" disabled>…</button>`;
        }
        html += `<button class="page-btn ${p === current ? 'active' : ''}" onclick="goToSensorPage(${p})">${p}</button>`;
        prev = p;
    }
    html += `<button class="page-btn" ${current === total ? 'disabled' : ''} onclick="goToSensorPage(${current + 1})" title="Trang sau"><i class="ph ph-caret-right"></i></button>`;
    return html;
}

// Render bảng dữ liệu cảm biến
function renderSensorTable() {
    const tableBody = document.getElementById('sensor-table-body');
    const paginationInfo = document.getElementById('sensor-pagination-info');
    const paginationControls = document.getElementById('sensor-pagination-controls');
    if (!tableBody) return;

    const sortSelect = document.getElementById('sensor-sort-order');
    if (sortSelect && sortSelect.value !== sensorSortOrder) {
        sortSelect.value = sensorSortOrder;
    }
    const sortIcon = document.getElementById('sensor-sort-icon');
    if (sortIcon) {
        sortIcon.className = sensorSortOrder === 'ASC' ? 'ph-bold ph-arrow-up' : 'ph-bold ph-arrow-down';
    }

    const sizeSelect = document.getElementById('sensor-page-size');
    if (sizeSelect && sizeSelect.value !== String(sensorPageSize)) {
        sizeSelect.value = String(sensorPageSize);
    }

    const pageItems = sensorDataList;
    const totalItems = sensorTotalItems;
    const totalPages = sensorTotalPages;

    if (totalItems === 0 || pageItems.length === 0) {
        let emptyHtml = `<tr class="empty-row"><td colspan="4" style="text-align: center; color: var(--text-muted);">Không tìm thấy dữ liệu cảm biến phù hợp</td></tr>`;
        for (let i = 1; i < sensorPageSize; i++) {
            emptyHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
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

    const startIndex = (currentSensorPage - 1) * sensorPageSize;
    const endIndex = Math.min(startIndex + pageItems.length, totalItems);

    let rowsHtml = pageItems.map(item => {
        let tagClass = 'tag-temp';
        let typeName = 'Nhiệt độ';
        if (item.type === 'humidity') {
            tagClass = 'tag-humid';
            typeName = 'Độ ẩm';
        } else if (item.type === 'light') {
            tagClass = 'tag-light';
            typeName = 'Ánh sáng';
        } else if (item.type === 'oxygen') {
            tagClass = 'tag-oxygen';
            typeName = 'Nồng độ Oxy';
        }

        return `
            <tr>
                <td>
                    <div style="font-weight: 600; color: var(--text-h); margin-bottom: 3px;">${item.sensor}</div>
                    <div style="font-size: 12px; color: var(--text-muted);">${item.device}</div>
                </td>
                <td><span class="type-tag ${tagClass}">${typeName}</span></td>
                <td style="font-weight: 600; color: var(--text-h);">${item.value}</td>
                <td>
                    <div class="time-cell">
                        <span class="time-text">${item.time}</span>
                        <button class="btn-copy-time" data-time="${item.time}" onclick="handleCopyTimeClick(this)" title="Sao chép thời gian">
                            <i class="ph ph-copy"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    // Đệm dòng trống giữ nguyên chiều cao bảng 481px
    const emptyRowsCount = sensorPageSize - pageItems.length;
    for (let i = 0; i < emptyRowsCount; i++) {
        rowsHtml += `
            <tr class="empty-row">
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
        paginationControls.innerHTML = buildSensorPaginationButtons(currentSensorPage, totalPages);
    }
}

// Chuyển trang phân trang
function goToSensorPage(page) {
    if (page < 1 || page > sensorTotalPages) return;

    currentSensorPage = page;
    fetchSensorDataFromAPI();
}

// Áp dụng bộ lọc tìm kiếm
function handleManualFilterSensor() {
    const searchVal = document.getElementById('sensor-search-input')?.value.toLowerCase().trim() || '';
    const fieldVal = document.getElementById('sensor-field-filter')?.value || 'ALL';

    appliedSensorFilters = {
        search: searchVal,
        field: fieldVal
    };

    currentSensorPage = 1;
    fetchSensorDataFromAPI();
}

// Cập nhật gợi ý tìm kiếm theo trường được chọn
function updateSensorSearchPlaceholder(field) {
    const searchInput = document.getElementById('sensor-search-input');
    if (!searchInput) return;

    switch (field) {
        case 'time':
            searchInput.placeholder = 'Nhập thời gian tìm kiếm';
            break;
        case 'temperature':
            searchInput.placeholder = 'Nhập giá trị nhiệt độ';
            break;
        case 'humidity':
            searchInput.placeholder = 'Nhập giá trị độ ẩm';
            break;
        case 'light':
            searchInput.placeholder = 'Nhập giá trị ánh sáng';
            break;
        case 'oxygen':
            searchInput.placeholder = 'Nhập nồng độ oxy';
            break;
        default:
            searchInput.placeholder = 'Nhập giá trị / thời gian tìm kiếm';
            break;
    }
}

// Xử lý khi chọn tiêu chí lọc từ dropdown 
function handleSensorFieldChange(field) {
    updateSensorSearchPlaceholder(field);
}

// Xử lý thay đổi số lượng bản ghi hiển thị trên mỗi trang
function handleSensorPageSizeChange(newSize) {
    sensorPageSize = parseInt(newSize, 10) || 7;
    currentSensorPage = 1;

    const sizeSelect = document.getElementById('sensor-page-size');
    if (sizeSelect) sizeSelect.value = String(sensorPageSize);

    fetchSensorDataFromAPI();
}

// Đặt lại toàn bộ bộ lọc
function resetSensorFilters() {
    const searchInput = document.getElementById('sensor-search-input');
    const fieldSelect = document.getElementById('sensor-field-filter');
    const sortSelect = document.getElementById('sensor-sort-order');
    const sortIcon = document.getElementById('sensor-sort-icon');
    const sizeSelect = document.getElementById('sensor-page-size');

    if (searchInput) searchInput.value = '';
    if (fieldSelect) fieldSelect.value = 'ALL';

    appliedSensorFilters = {
        search: '',
        field: 'ALL'
    };

    updateSensorSearchPlaceholder('ALL');

    sensorSortOrder = 'DESC';
    if (sortSelect) sortSelect.value = 'DESC';
    if (sortIcon) sortIcon.className = 'ph-bold ph-arrow-down';

    sensorPageSize = 7;
    if (sizeSelect) sizeSelect.value = '7';

    currentSensorPage = 1;
    fetchSensorDataFromAPI();
}

// Xử lý thay đổi chiều sắp xếp qua dropdown
function handleSensorSortChange(order) {
    sensorSortOrder = order;
    currentSensorPage = 1;
    fetchSensorDataFromAPI();
}

// Đảo chiều sắp xếp khi nhấn tiêu đề cột thời gian
function toggleSensorTimeSort() {
    sensorSortOrder = (sensorSortOrder === 'DESC') ? 'ASC' : 'DESC';
    currentSensorPage = 1;
    fetchSensorDataFromAPI();
}

// Thêm bản ghi mới vào đầu bảng (chỉ cập nhật khi mạch đang Online và đang ở trang 1 DESC)
function appendSensorRecord(record) {
    if (!record) return;
    if (window.AppState && window.AppState.isOnline === false) return;

    if (currentSensorPage === 1 && sensorSortOrder === 'DESC' && matchesSensorFilter(record)) {
        sensorDataList.unshift(record);
        if (sensorDataList.length > sensorPageSize) {
            sensorDataList.pop();
        }
        sensorTotalItems += 1;
        sensorTotalPages = Math.max(1, Math.ceil(sensorTotalItems / sensorPageSize));
        renderSensorTable();
    }
}

// Sao chép thời gian vào clipboard
function handleCopyTimeClick(button) {
    if (!button) return;
    const timeStr = button.getAttribute('data-time') || '';
    copyTimeToClipboard(timeStr, button);
}

function fallbackCopyText(text) {
    try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
    } catch (err) { }
}

function copyTimeToClipboard(timeStr, btn) {
    if (!timeStr) return;

    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(timeStr).catch(() => fallbackCopyText(timeStr));
    } else {
        fallbackCopyText(timeStr);
    }

    if (btn) {
        const icon = btn.querySelector('i');
        if (icon) icon.className = 'ph-bold ph-check';
        btn.classList.add('copied');
        btn.title = 'Đã sao chép!';

        setTimeout(() => {
            if (icon) icon.className = 'ph ph-copy';
            btn.classList.remove('copied');
            btn.title = 'Sao chép thời gian';
        }, 1800);
    }
}

// Đồng bộ dữ liệu lịch sử từ Backend REST API
async function fetchSensorDataFromAPI() {
    if (window.HttpService && typeof window.HttpService.getSensorHistory === 'function') {
        const res = await window.HttpService.getSensorHistory({
            page: currentSensorPage,
            limit: sensorPageSize,
            sort: sensorSortOrder,
            field: appliedSensorFilters.field,
            search: appliedSensorFilters.search
        });

        if (res && res.success && Array.isArray(res.data)) {
            sensorTotalItems = Number(res.total) || 0;
            sensorTotalPages = Math.max(1, Number(res.totalPages) || 1);
            sensorDataList = res.data.map(item => ({
                id: item.id,
                sensor: item.sensor || item.sensor_code || (item.type === 'light' ? 'LDR_01' : (item.type === 'oxygen' ? 'O2_01' : 'DHT22_01')),
                device: item.device || item.device_id || 'ESP32_01',
                type: item.type || 'temperature',
                value: item.value || (item.rawVal !== undefined ? `${item.rawVal}` : ''),
                rawVal: item.rawVal !== undefined ? Number(item.rawVal) : (parseFloat(item.value) || 0),
                time: item.time || item.created_at
            }));
            renderSensorTable();
            return;
        }
    }

    sensorDataList = [];
    sensorTotalItems = 0;
    sensorTotalPages = 1;
    renderSensorTable();
}

document.addEventListener('DOMContentLoaded', () => {
    renderSensorTable();
    fetchSensorDataFromAPI();

    const searchInput = document.getElementById('sensor-search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterSensor();
            }
        });
    }
});

window.renderSensorTable = renderSensorTable;
window.appendSensorRecord = appendSensorRecord;
window.handleCopyTimeClick = handleCopyTimeClick;
window.copyTimeToClipboard = copyTimeToClipboard;
window.handleManualFilterSensor = handleManualFilterSensor;
window.handleSensorSortChange = handleSensorSortChange;
window.toggleSensorTimeSort = toggleSensorTimeSort;
window.resetSensorFilters = resetSensorFilters;
window.goToSensorPage = goToSensorPage;
window.handleSensorFieldChange = handleSensorFieldChange;
window.handleSensorPageSizeChange = handleSensorPageSizeChange;
window.updateSensorSearchPlaceholder = updateSensorSearchPlaceholder;
window.fetchSensorDataFromAPI = fetchSensorDataFromAPI;
