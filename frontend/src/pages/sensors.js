/**
 * ==============================================================================
 * SOURCE PAGES: SENSORS VIEW (SENSORS.JS)
 * ==============================================================================
 * Logic nghiệp vụ riêng biệt cho màn hình Dữ liệu cảm biến
 * Tuân thủ yêu cầu: Chỉ thực hiện lọc khi người dùng bấm nút "Lọc" hoặc nhấn Enter
 * ==============================================================================
 */

// Danh sách dữ liệu cảm biến lấy từ cấu hình mặc định
let sensorDataList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_SENSORS)
    ? [...window.APP_CONFIG.DEFAULT_SENSORS]
    : [];

// Trạng thái bộ lọc đang được áp dụng (chỉ thay đổi khi bấm nút "Lọc")
let appliedSensorFilters = {
    time: '',
    name: 'ALL',
    type: 'ALL'
};

// Cấu hình phân trang (9 bản ghi / trang hiển thị full bảng chuẩn thiết kế, không bị thanh cuộn)
let currentSensorPage = 1;
const sensorPageSize = 9;

/**
 * Hiển thị danh sách dữ liệu cảm biến lên giao diện Bảng
 * Sử dụng bộ lọc đã được bấm áp dụng và hỗ trợ phân trang
 */
function renderSensorTable() {
    const tableBody = document.getElementById('sensor-table-body');
    const paginationInfo = document.getElementById('sensor-pagination-info');
    const paginationControls = document.getElementById('sensor-pagination-controls');
    if (!tableBody) return;

    // Lọc theo 3 tiêu chí đã được xác nhận lọc
    const filtered = sensorDataList.filter(item => {
        const matchesTime = !appliedSensorFilters.time || 
                            (item.time && item.time.toLowerCase().includes(appliedSensorFilters.time));
        const matchesName = (appliedSensorFilters.name === 'ALL') || 
                            (item.sensor === appliedSensorFilters.name);
        const matchesType = (appliedSensorFilters.type === 'ALL') || 
                            (item.type === appliedSensorFilters.type);
        return matchesTime && matchesName && matchesType;
    });

    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / sensorPageSize));
    if (currentSensorPage > totalPages) {
        currentSensorPage = 1;
    }

    if (totalItems === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 24px; color: var(--text-muted);">Không tìm thấy dữ liệu cảm biến phù hợp</td></tr>`;
        if (paginationInfo) paginationInfo.textContent = 'Hiển thị 0 trong số 0 bản ghi';
        if (paginationControls) paginationControls.innerHTML = '';
        return;
    }

    // Cắt dữ liệu theo trang hiện tại (9 bản ghi/trang)
    const startIndex = (currentSensorPage - 1) * sensorPageSize;
    const endIndex = Math.min(startIndex + sensorPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    tableBody.innerHTML = pageItems.map(item => {
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

    // Cập nhật thông tin phân trang (VD: Hiển thị 1 - 5 trong số 20 bản ghi)
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

    // Cập nhật các nút phân trang
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

/**
 * Chuyển tới số trang chỉ định cho bảng Cảm biến
 * @param {number} page - Số trang
 */
function goToSensorPage(page) {
    const filtered = sensorDataList.filter(item => {
        const matchesTime = !appliedSensorFilters.time || 
                            (item.time && item.time.toLowerCase().includes(appliedSensorFilters.time));
        const matchesName = (appliedSensorFilters.name === 'ALL') || 
                            (item.sensor === appliedSensorFilters.name);
        const matchesType = (appliedSensorFilters.type === 'ALL') || 
                            (item.type === appliedSensorFilters.type);
        return matchesTime && matchesName && matchesType;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / sensorPageSize));
    if (page < 1 || page > totalPages) return;

    currentSensorPage = page;
    renderSensorTable();
}

/**
 * Xử lý khi người dùng BẤM NÚT "LỌC" hoặc nhấn ENTER
 * Đọc giá trị từ các ô chọn và thực hiện lọc
 */
function handleManualFilterSensor() {
    const timeVal = document.getElementById('sensor-time-search-input')?.value.toLowerCase().trim() || '';
    const nameVal = document.getElementById('sensor-name-filter')?.value || 'ALL';
    const typeVal = document.getElementById('sensor-type-filter')?.value || 'ALL';

    // Cập nhật bộ lọc chính thức và quay về trang 1
    appliedSensorFilters = {
        time: timeVal,
        name: nameVal,
        type: typeVal
    };
    currentSensorPage = 1;

    renderSensorTable();

    if (typeof showToast === 'function') {
        showToast('Đã áp dụng bộ lọc dữ liệu cảm biến', 'info');
    }
}

/**
 * Đặt lại toàn bộ ô tìm kiếm và bộ lọc về mặc định
 */
function resetSensorFilters() {
    const timeInput = document.getElementById('sensor-time-search-input');
    const nameSelect = document.getElementById('sensor-name-filter');
    const typeSelect = document.getElementById('sensor-type-filter');

    if (timeInput) timeInput.value = '';
    if (nameSelect) nameSelect.value = 'ALL';
    if (typeSelect) typeSelect.value = 'ALL';

    // Xóa bộ lọc áp dụng và quay về trang 1
    appliedSensorFilters = {
        time: '',
        name: 'ALL',
        type: 'ALL'
    };
    currentSensorPage = 1;

    renderSensorTable();

    if (typeof showToast === 'function') {
        showToast('Đã đặt lại toàn bộ bộ lọc cảm biến', 'info');
    }
}

/**
 * Thêm bản ghi cảm biến mới vào đầu danh sách (Real-time)
 * @param {Object} record - Bản ghi mới
 */
function appendSensorRecord(record) {
    sensorDataList.unshift(record);
    if (sensorDataList.length > 100) {
        sensorDataList.pop();
    }
    renderSensorTable();
}

/**
 * Xử lý sự kiện nhấn nút sao chép thời gian
 * @param {HTMLElement} button - Nút copy vừa bấm
 */
function handleCopyTimeClick(button) {
    if (!button) return;
    const timeStr = button.getAttribute('data-time') || '';
    copyTimeToClipboard(timeStr, button);
}

/**
 * Sao chép mốc thời gian vào Clipboard với phản hồi thị giác (visual feedback)
 * @param {string} timeStr - Chuỗi thời gian
 * @param {HTMLElement} btn - Nút click
 */
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

    if (typeof showToast === 'function') {
        showToast(`Đã sao chép "${timeStr}" vào bộ nhớ tạm`, 'success');
    }
}

/**
 * Fallback copy cho môi trường không hỗ trợ navigator.clipboard
 */
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
    } catch (err) {
        console.warn('Lỗi sao chép dự phòng: ', err);
    }
}

/**
 * Đồng bộ dữ liệu từ Backend REST API qua HttpService
 */
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

// Khởi chạy khi nạp trang
document.addEventListener('DOMContentLoaded', () => {
    renderSensorTable();
    fetchSensorDataFromAPI();

    // Hỗ trợ phím Enter trên ô tìm kiếm thời gian
    const timeSearchInput = document.getElementById('sensor-time-search-input');
    if (timeSearchInput) {
        timeSearchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterSensor();
            }
        });
    }
});

// Xuất các hàm ra window
window.renderSensorTable = renderSensorTable;
window.appendSensorRecord = appendSensorRecord;
window.handleCopyTimeClick = handleCopyTimeClick;
window.copyTimeToClipboard = copyTimeToClipboard;
window.handleManualFilterSensor = handleManualFilterSensor;
window.resetSensorFilters = resetSensorFilters;
window.goToSensorPage = goToSensorPage;
