// Quản lý trang dữ liệu cảm biến (Sensors Controller)

let sensorDataList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_SENSORS)
    ? [...window.APP_CONFIG.DEFAULT_SENSORS]
    : [];

let appliedSensorFilters = {
    search: '',
    field: 'ALL'
};

let sensorSortOrder = 'DESC';
let currentSensorPage = 1;
let sensorPageSize = 7;

// Kiểm tra bản ghi có khớp bộ lọc hay không
function matchesSensorFilter(item) {
    const search = appliedSensorFilters.search ? appliedSensorFilters.search.toLowerCase().trim() : '';
    const field = appliedSensorFilters.field || 'ALL';

    if (field === 'temperature' && item.type !== 'temperature') return false;
    if (field === 'humidity' && item.type !== 'humidity') return false;
    if (field === 'light' && item.type !== 'light') return false;

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

    const typeName = item.type === 'temperature' ? 'nhiệt độ' : (item.type === 'humidity' ? 'độ ẩm' : (item.type === 'light' ? 'ánh sáng' : ''));
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

// Render bảng dữ liệu cảm biến (cố định 7 dòng kèm phân trang)
function renderSensorTable() {
    const tableBody = document.getElementById('sensor-table-body');
    const paginationInfo = document.getElementById('sensor-pagination-info');
    const paginationControls = document.getElementById('sensor-pagination-controls');
    if (!tableBody) return;

    const filtered = sensorDataList.filter(matchesSensorFilter);

    filtered.sort((a, b) => {
        const timeA = new Date(String(a.time).replace(' ', 'T')).getTime() || 0;
        const timeB = new Date(String(b.time).replace(' ', 'T')).getTime() || 0;
        return sensorSortOrder === 'ASC' ? timeA - timeB : timeB - timeA;
    });

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

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / sensorPageSize));
    if (currentSensorPage > totalPages) {
        currentSensorPage = 1;
    }

    if (totalItems === 0) {
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
    const endIndex = Math.min(startIndex + sensorPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    let rowsHtml = pageItems.map(item => {
        let tagClass = 'tag-temp';
        let typeName = 'Nhiệt độ';
        if (item.type === 'humidity') {
            tagClass = 'tag-humid';
            typeName = 'Độ ẩm';
        } else if (item.type === 'light') {
            tagClass = 'tag-light';
            typeName = 'Ánh sáng';
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
        let buttonsHtml = `
            <button class="page-btn" ${currentSensorPage === 1 ? 'disabled' : ''} onclick="goToSensorPage(${currentSensorPage - 1})" title="Trang trước">
                <i class="ph ph-caret-left"></i>
            </button>
        `;

        for (let p = 1; p <= totalPages; p++) {
            buttonsHtml += `
                <button class="page-btn ${p === currentSensorPage ? 'active' : ''}" onclick="goToSensorPage(${p})">${p}</button>
            `;
        }

        buttonsHtml += `
            <button class="page-btn" ${currentSensorPage === totalPages ? 'disabled' : ''} onclick="goToSensorPage(${currentSensorPage + 1})" title="Trang sau">
                <i class="ph ph-caret-right"></i>
            </button>
        `;

        paginationControls.innerHTML = buttonsHtml;
    }
}

// Chuyển trang phân trang
function goToSensorPage(page) {
    const filtered = sensorDataList.filter(matchesSensorFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / sensorPageSize));

    if (page < 1 || page > totalPages) return;

    currentSensorPage = page;
    renderSensorTable();
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
    renderSensorTable();
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

    renderSensorTable();
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
    renderSensorTable();
}

// Xử lý thay đổi chiều sắp xếp qua dropdown
function handleSensorSortChange(order) {
    sensorSortOrder = order;
    currentSensorPage = 1;
    renderSensorTable();
}

// Đảo chiều sắp xếp khi nhấn tiêu đề cột thời gian
function toggleSensorTimeSort() {
    sensorSortOrder = (sensorSortOrder === 'DESC') ? 'ASC' : 'DESC';
    currentSensorPage = 1;
    renderSensorTable();
}

// Thêm bản ghi mới vào đầu bảng
function appendSensorRecord(record) {
    sensorDataList.unshift(record);
    if (sensorDataList.length > 100) {
        sensorDataList.pop();
    }
    renderSensorTable();
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
    } catch (err) {}
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
        const data = await window.HttpService.getSensorHistory(1, 20);
        if (data && Array.isArray(data) && data.length > 0) {
            sensorDataList = data.map(item => ({
                id: item.id,
                sensor: item.sensor_name || 'DHT22_01',
                device: item.device_id || 'ESP32_01',
                type: item.type || 'temperature',
                value: item.formatted_value || `${item.value}`,
                time: item.created_at || item.time
            }));
            renderSensorTable();
        }
    }
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
