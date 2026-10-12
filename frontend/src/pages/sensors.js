// Danh sách dữ liệu cảm biến hiển thị trên bảng
let sensorDataList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_SENSORS)
    ? [...window.APP_CONFIG.DEFAULT_SENSORS]
    : [];

// Trạng thái bộ lọc tìm kiếm hiện tại
let appliedSensorFilters = {
    search: '',   // Từ khóa tìm kiếm (chuỗi nhập vào)
    field: 'ALL'  // Trường lọc: 'ALL' | 'time' | 'temperature' | 'humidity' | 'light'
};

// Quản lý phân trang cho bảng dữ liệu cảm biến
let currentSensorPage = 1;
const sensorPageSize = 7; // Số bản ghi hiển thị trên mỗi trang

// Kiểm tra một bản ghi cảm biến có khớp với bộ lọc hay không
function matchesSensorFilter(item) {
    const search = appliedSensorFilters.search ? appliedSensorFilters.search.toLowerCase().trim() : '';
    const field = appliedSensorFilters.field || 'ALL';

    // 1. Kiểm tra loại cảm biến nếu đã chọn cụ thể
    if (field === 'temperature' && item.type !== 'temperature') return false;
    if (field === 'humidity' && item.type !== 'humidity') return false;
    if (field === 'light' && item.type !== 'light') return false;

    // Không nhập từ khóa tìm kiếm thì chấp nhận bản ghi
    if (!search) return true;

    // 2. Lọc theo trường Thời gian
    if (field === 'time') {
        return Boolean(item.time && item.time.toLowerCase().includes(search));
    }

    // 3. Lọc theo từng loại cảm biến cụ thể
    if (field === 'temperature' || field === 'humidity' || field === 'light') {
        const valMatch = item.value && String(item.value).toLowerCase().includes(search);
        const timeMatch = item.time && item.time.toLowerCase().includes(search);
        const sensorMatch = item.sensor && item.sensor.toLowerCase().includes(search);
        return Boolean(valMatch || timeMatch || sensorMatch);
    }

    // 4. Lọc Tất cả thông tin (tìm trong tên cảm biến, thiết bị, giá trị, thời gian, tên loại)
    const typeName = item.type === 'temperature' ? 'nhiệt độ' : (item.type === 'humidity' ? 'độ ẩm' : (item.type === 'light' ? 'ánh sáng' : ''));
    return Boolean(
        (item.time && item.time.toLowerCase().includes(search)) ||
        (item.value && String(item.value).toLowerCase().includes(search)) ||
        (item.sensor && item.sensor.toLowerCase().includes(search)) ||
        (item.device && item.device.toLowerCase().includes(search)) ||
        (typeName && typeName.includes(search))
    );
}

// Hiển thị danh sách dữ liệu cảm biến lên giao diện bảng
function renderSensorTable() {
    const tableBody = document.getElementById('sensor-table-body');
    const paginationInfo = document.getElementById('sensor-pagination-info');
    const paginationControls = document.getElementById('sensor-pagination-controls');
    if (!tableBody) return;

    // 1. Áp dụng bộ lọc tìm kiếm
    const filtered = sensorDataList.filter(matchesSensorFilter);

    // 2. Tính toán tổng số trang
    const totalItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / sensorPageSize));
    if (currentSensorPage > totalPages) {
        currentSensorPage = 1;
    }

    // 3. Xử lý trường hợp không tìm thấy bản ghi nào phù hợp
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

    // 4. Cắt dữ liệu hiển thị cho trang hiện tại
    const startIndex = (currentSensorPage - 1) * sensorPageSize;
    const endIndex = Math.min(startIndex + sensorPageSize, totalItems);
    const pageItems = filtered.slice(startIndex, endIndex);

    // 5. Tạo HTML cho các dòng dữ liệu
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

    // 6. Đệm thêm các dòng trống để chiều cao bảng luôn cố định 7 dòng
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

    // 7. Cập nhật nhãn thông tin phân trang
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

    // 8. Tạo các nút bấm chuyển trang
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


// Chuyển tới số trang chỉ định cho bảng Cảm biến (page: số trang cần chuyển đến)
function goToSensorPage(page) {
    const filtered = sensorDataList.filter(matchesSensorFilter);

    const totalPages = Math.max(1, Math.ceil(filtered.length / sensorPageSize));
    if (page < 1 || page > totalPages) return;

    currentSensorPage = page;
    renderSensorTable();
}

// Xử lý khi người dùng bấm nút "Lọc" hoặc nhấn phím Enter tại ô tìm kiếm
function handleManualFilterSensor() {
    const searchVal = document.getElementById('sensor-search-input')?.value.toLowerCase().trim() || '';
    const fieldVal = document.getElementById('sensor-field-filter')?.value || 'ALL';

    // Cập nhật bộ lọc và đưa về trang đầu tiên
    appliedSensorFilters = {
        search: searchVal,
        field: fieldVal
    };
    currentSensorPage = 1;

    renderSensorTable();
}

// Đặt lại toàn bộ ô tìm kiếm và trường lọc về trạng thái mặc định
function resetSensorFilters() {
    const searchInput = document.getElementById('sensor-search-input');
    const fieldSelect = document.getElementById('sensor-field-filter');

    if (searchInput) searchInput.value = '';
    if (fieldSelect) fieldSelect.value = 'ALL';

    appliedSensorFilters = {
        search: '',
        field: 'ALL'
    };
    currentSensorPage = 1;

    renderSensorTable();
}

// Thêm bản ghi cảm biến mới vào đầu danh sách (giới hạn tối đa 100 bản ghi)
function appendSensorRecord(record) {
    sensorDataList.unshift(record);
    if (sensorDataList.length > 100) {
        sensorDataList.pop();
    }
    renderSensorTable();
}

// Xử lý sự kiện khi người dùng bấm nút sao chép mốc thời gian
function handleCopyTimeClick(button) {
    if (!button) return;
    const timeStr = button.getAttribute('data-time') || '';
    copyTimeToClipboard(timeStr, button);
}

// Sao chép chuỗi mốc thời gian vào Clipboard và hiển thị hiệu ứng phản hồi
function copyTimeToClipboard(timeStr, btn) {
    if (!timeStr) return;

    // Ưu tiên sử dụng Clipboard API hiện đại nếu môi trường an toàn (HTTPS/localhost)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(timeStr).catch(() => fallbackCopyText(timeStr));
    } else {
        fallbackCopyText(timeStr);
    }

    // Hiển thị icon tích xanh thành công trên nút trong 1.8 giây
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

    // Hiển thị thông báo Toast xác nhận
    if (typeof showToast === 'function') {
        showToast(`Đã sao chép "${timeStr}" vào bộ nhớ tạm`, 'success');
    }
}

// Phương thức sao chép dự phòng bằng thẻ textarea ẩn (dành cho HTTP thường hoặc trình duyệt cũ)
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

// Đồng bộ dữ liệu lịch sử cảm biến từ Backend REST API
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

// Lắng nghe sự kiện khi tài liệu HTML tải xong
document.addEventListener('DOMContentLoaded', () => {
    renderSensorTable();
    fetchSensorDataFromAPI();

    // Bắt sự kiện phím Enter trên ô tìm kiếm dữ liệu cảm biến
    const searchInput = document.getElementById('sensor-search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterSensor();
            }
        });
    }
});

// Xuất các hàm ra phạm vi toàn cục để dùng từ HTML inline event
window.renderSensorTable = renderSensorTable;
window.appendSensorRecord = appendSensorRecord;
window.handleCopyTimeClick = handleCopyTimeClick;
window.copyTimeToClipboard = copyTimeToClipboard;
window.handleManualFilterSensor = handleManualFilterSensor;
window.resetSensorFilters = resetSensorFilters;
window.goToSensorPage = goToSensorPage;

