// =============================================================================
// TẬP TIN: sensors.js
// VAI TRÒ: QUẢN LÝ TRANG DỮ LIỆU CẢM BIẾN (Sensor Data Page Controller)
// MÔ TẢ:
//   Tập tin này xử lý toàn bộ logic cho trang "Dữ liệu cảm biến":
//   1. Quản lý danh sách dữ liệu đo đạc (sensorDataList).
//   2. Bộ lọc tìm kiếm đa năng (Filter by Field):
//      - Hỗ trợ lọc theo từng trường cụ thể: Tất cả thông tin ('ALL'), Thời gian ('time'),
//        Nhiệt độ ('temperature'), Độ ẩm ('humidity'), Ánh sáng ('light').
//   3. Phân trang dữ liệu (Pagination): Cố định 7 dòng mỗi trang, giữ nguyên độ cao bảng bằng dòng đệm trống.
//   4. Tính năng tiện ích: Sao chép mốc thời gian vào Clipboard (hỗ trợ cả Clipboard API và Textarea dự phòng).
//   5. Đồng bộ REST API và tự động nhận dữ liệu thời gian thực từ WebSocket.
// =============================================================================

// -----------------------------------------------------------------------------
// 1. CÁC BIẾN TRẠNG THÁI TOÀN CỤC CHO TRANG CẢM BIẾN
// -----------------------------------------------------------------------------

// sensorDataList: Mảng lưu trữ toàn bộ các bản ghi cảm biến hiện có trong bộ nhớ Front-End.
// Khởi tạo bằng cách sao chép nông (Shallow Copy bằng toán tử spread `[...]`) từ mảng mẫu trong app.config.js
let sensorDataList = (window.APP_CONFIG && window.APP_CONFIG.DEFAULT_SENSORS)
    ? [...window.APP_CONFIG.DEFAULT_SENSORS]
    : [];

// appliedSensorFilters: Đối tượng lưu trữ các tiêu chí lọc hiện đang được người dùng áp dụng
let appliedSensorFilters = {
    search: '',   // Chuỗi từ khóa tìm kiếm (nhập từ ô input)
    field: 'ALL'  // Trường lọc đang chọn: 'ALL' | 'time' | 'temperature' | 'humidity' | 'light'
};

// currentSensorPage: Số thứ tự trang người dùng đang xem (bắt đầu từ trang 1)
let currentSensorPage = 1;

// sensorPageSize: Hằng số quy định số lượng dòng bản ghi hiển thị trên mỗi trang (7 bản ghi)
const sensorPageSize = 7;

// -----------------------------------------------------------------------------
// 2. HÀM KIỂM TRA BẢN GHI CÓ KHỚP VỚI BỘ LỌC (MATCHES SENSOR FILTER)
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - item (Object): Một bản ghi cảm biến cần kiểm tra.
// Giá trị trả về:
// - boolean: true nếu bản ghi thỏa mãn điều kiện lọc, false nếu không thỏa mãn.
function matchesSensorFilter(item) {
    // 1. Chuẩn hóa từ khóa tìm kiếm: chuyển về chữ thường và cắt bỏ khoảng trắng thừa 2 đầu
    const search = appliedSensorFilters.search ? appliedSensorFilters.search.toLowerCase().trim() : '';
    // Lấy trường lọc đang chọn (mặc định là 'ALL')
    const field = appliedSensorFilters.field || 'ALL';

    // 2. KIỂM TRA LOẠI CẢM BIẾN NẾU NGƯỜI DÙNG CHỌN RIÊNG 1 LOẠI:
    // Nếu chọn lọc "Nhiệt độ", bản ghi không phải type 'temperature' sẽ bị loại ngay
    if (field === 'temperature' && item.type !== 'temperature') return false;
    // Nếu chọn lọc "Độ ẩm", bản ghi không phải 'humidity' sẽ bị loại
    if (field === 'humidity' && item.type !== 'humidity') return false;
    // Nếu chọn lọc "Ánh sáng", bản ghi không phải 'light' sẽ bị loại
    if (field === 'light' && item.type !== 'light') return false;

    // 3. NẾU KHÔNG NHẬP TỪ KHÓA TÌM KIẾM:
    // Chấp nhận bản ghi ngay (vì đã vượt qua bước kiểm tra loại cảm biến ở trên)
    if (!search) return true;

    // 4. TRƯỜNG HỢP LỌC THEO TRƯỜNG "THỜI GIAN" (field === 'time'):
    // Chỉ so sánh từ khóa tìm kiếm với chuỗi thời gian của bản ghi
    if (field === 'time') {
        return Boolean(item.time && item.time.toLowerCase().includes(search));
    }

    // 5. TRƯỜNG HỢP LỌC THEO TỪNG LOẠI CỤ THỂ (Nhiệt độ / Độ ẩm / Ánh sáng):
    // Tìm kiếm từ khóa xuất hiện trong giá trị đo (value), thời gian (time) hoặc tên cảm biến (sensor)
    if (field === 'temperature' || field === 'humidity' || field === 'light') {
        const valMatch = item.value && String(item.value).toLowerCase().includes(search);
        const timeMatch = item.time && item.time.toLowerCase().includes(search);
        const sensorMatch = item.sensor && item.sensor.toLowerCase().includes(search);
        return Boolean(valMatch || timeMatch || sensorMatch);
    }

    // 6. TRƯỜNG HỢP LỌC "TẤT CẢ THÔNG TIN" (field === 'ALL'):
    // Tìm kiếm từ khóa xuất hiện ở bất kỳ trường nào: thời gian, giá trị, tên cảm biến, thiết bị hoặc tên tiếng Việt
    const typeName = item.type === 'temperature' ? 'nhiệt độ' : (item.type === 'humidity' ? 'độ ẩm' : (item.type === 'light' ? 'ánh sáng' : ''));
    return Boolean(
        (item.time && item.time.toLowerCase().includes(search)) ||
        (item.value && String(item.value).toLowerCase().includes(search)) ||
        (item.sensor && item.sensor.toLowerCase().includes(search)) ||
        (item.device && item.device.toLowerCase().includes(search)) ||
        (typeName && typeName.includes(search))
    );
}

// -----------------------------------------------------------------------------
// 3. HÀM HIỂN THỊ DỮ LIỆU LÊN GIAO DIỆN BẢNG (RENDER SENSOR TABLE)
// -----------------------------------------------------------------------------
function renderSensorTable() {
    // 1. Lấy các phần tử DOM liên quan đến bảng và thanh phân trang
    const tableBody = document.getElementById('sensor-table-body');
    const paginationInfo = document.getElementById('sensor-pagination-info');
    const paginationControls = document.getElementById('sensor-pagination-controls');
    if (!tableBody) return;

    // 2. LỌC DỮ LIỆU:
    // Sử dụng phương thức .filter() của mảng để lấy ra các bản ghi khớp với điều kiện tìm kiếm
    const filtered = sensorDataList.filter(matchesSensorFilter);

    // 3. TÍNH TOÁN PHÂN TRANG:
    const totalItems = filtered.length; // Tổng số bản ghi tìm thấy
    // Math.ceil(): Làm tròn lên để tính tổng số trang (VD: 15 bản ghi / 7 = 3 trang). Tối thiểu là 1 trang.
    const totalPages = Math.max(1, Math.ceil(totalItems / sensorPageSize));
    // Nếu trang hiện tại lớn hơn tổng số trang (do vừa lọc bớt dữ liệu), quay về trang 1
    if (currentSensorPage > totalPages) {
        currentSensorPage = 1;
    }

    // 4. XỬ LÝ TRƯỜNG HỢP KHÔNG TÌM THẤY BẢN GHI NÀO (EMPTY STATE):
    if (totalItems === 0) {
        // Dòng 1: Thông báo không tìm thấy kết quả
        let emptyHtml = `<tr class="empty-row"><td colspan="4" style="text-align: center; color: var(--text-muted);">Không tìm thấy dữ liệu cảm biến phù hợp</td></tr>`;
        // Đệm thêm 6 dòng trống bên dưới để bảng luôn giữ đúng chiều cao 7 dòng
        for (let i = 1; i < sensorPageSize; i++) {
            emptyHtml += `<tr class="empty-row"><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td><td>&nbsp;</td></tr>`;
        }
        tableBody.innerHTML = emptyHtml;

        // Cập nhật nhãn phân trang
        if (paginationInfo) paginationInfo.textContent = 'Hiển thị 0 trong số 0 bản ghi';
        // Hiển thị nút phân trang ở trạng thái bị vô hiệu hóa (disabled)
        if (paginationControls) {
            paginationControls.innerHTML = `
                <button class="page-btn" disabled title="Trang trước"><i class="ph ph-caret-left"></i></button>
                <button class="page-btn active" disabled>1</button>
                <button class="page-btn" disabled title="Trang sau"><i class="ph ph-caret-right"></i></button>
            `;
        }
        return;
    }

    // 5. CẮT DỮ LIỆU THEO TRANG HIỆN TẠI (PAGINATION SLICING):
    // startIndex: Vị trí bắt đầu của trang (VD: trang 1 bắt đầu từ 0, trang 2 từ 7)
    const startIndex = (currentSensorPage - 1) * sensorPageSize;
    // endIndex: Vị trí kết thúc (không vượt quá tổng số bản ghi)
    const endIndex = Math.min(startIndex + sensorPageSize, totalItems);
    // .slice(start, end): Cắt lấy mảng con chứa các phần tử của trang hiện tại
    const pageItems = filtered.slice(startIndex, endIndex);

    // 6. TẠO CHUỖI HTML CHO CÁC DÒNG DỮ LIỆU BẰNG PHƯƠNG THỨC .map():
    let rowsHtml = pageItems.map(item => {
        // Phân loại thẻ màu (tag) và tên hiển thị tiếng Việt
        let tagClass = 'tag-temp';
        let typeName = 'Nhiệt độ';
        if (item.type === 'humidity') {
            tagClass = 'tag-humid';
            typeName = 'Độ ẩm';
        } else if (item.type === 'light') {
            tagClass = 'tag-light';
            typeName = 'Ánh sáng';
        }

        // Tạo cấu trúc 4 cột dữ liệu cho mỗi dòng: Cảm biến, Loại, Giá trị, Thời gian
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

    // 7. ĐỆM THÊM CÁC DÒNG TRỐNG NẾU TRANG CUỐI KHÔNG ĐỦ 7 DÒNG:
    // Đảm bảo chiều cao khung bảng luôn cố định, không bị co rút giao diện
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

    // Gán chuỗi HTML vừa tạo vào thẻ tbody của bảng
    tableBody.innerHTML = rowsHtml;

    // 8. CẬP NHẬT NHÃN THÔNG TIN PHÂN TRANG (VD: "Hiển thị 1 - 7 trong số 20 bản ghi")
    if (paginationInfo) {
        paginationInfo.textContent = `Hiển thị ${startIndex + 1} - ${endIndex} trong số ${totalItems} bản ghi`;
    }

    // 9. TẠO CÁC NÚT ĐIỀU HƯỚNG CHUYỂN TRANG:
    if (paginationControls) {
        // Nút mũi tên quay lại trang trước (<)
        let buttonsHtml = `
            <button class="page-btn" ${currentSensorPage === 1 ? 'disabled' : ''} onclick="goToSensorPage(${currentSensorPage - 1})" title="Trang trước">
                <i class="ph ph-caret-left"></i>
            </button>
        `;

        // Các nút bấm số trang (1, 2, 3...)
        for (let p = 1; p <= totalPages; p++) {
            buttonsHtml += `
                <button class="page-btn ${p === currentSensorPage ? 'active' : ''}" onclick="goToSensorPage(${p})">${p}</button>
            `;
        }

        // Nút mũi tên tiến tới trang sau (>)
        buttonsHtml += `
            <button class="page-btn" ${currentSensorPage === totalPages ? 'disabled' : ''} onclick="goToSensorPage(${currentSensorPage + 1})" title="Trang sau">
                <i class="ph ph-caret-right"></i>
            </button>
        `;

        paginationControls.innerHTML = buttonsHtml;
    }
}

// -----------------------------------------------------------------------------
// 4. HÀM CHUYỂN TỚI SỐ TRANG CHỈ ĐỊNH (GO TO SENSOR PAGE)
// -----------------------------------------------------------------------------
// Tham số đầu vào:
// - page (number): Số trang muốn chuyển đến.
function goToSensorPage(page) {
    const filtered = sensorDataList.filter(matchesSensorFilter);
    const totalPages = Math.max(1, Math.ceil(filtered.length / sensorPageSize));

    // Nếu số trang yêu cầu nhỏ hơn 1 hoặc vượt quá tổng số trang thì bỏ qua
    if (page < 1 || page > totalPages) return;

    // Cập nhật số trang hiện tại và vẽ lại bảng
    currentSensorPage = page;
    renderSensorTable();
}

// -----------------------------------------------------------------------------
// 5. HÀM XỬ LÝ KHI NGƯỜI DÙNG BẤM NÚT "LỌC" HOẶC NHẤN ENTER (HANDLE MANUAL FILTER SENSOR)
// -----------------------------------------------------------------------------
function handleManualFilterSensor() {
    // Đọc giá trị người dùng vừa nhập vào ô tìm kiếm và thẻ select chọn trường lọc
    const searchVal = document.getElementById('sensor-search-input')?.value.toLowerCase().trim() || '';
    const fieldVal = document.getElementById('sensor-field-filter')?.value || 'ALL';

    // Cập nhật đối tượng bộ lọc
    appliedSensorFilters = {
        search: searchVal,
        field: fieldVal
    };

    // Đưa về trang đầu tiên (trang 1) để xem kết quả mới nhất
    currentSensorPage = 1;

    // Vẽ lại bảng với bộ lọc mới
    renderSensorTable();
}

// -----------------------------------------------------------------------------
// 6. HÀM ĐẶT LẠI TOÀN BỘ BỘ LỌC VỀ MẶC ĐỊNH (RESET SENSOR FILTERS)
// -----------------------------------------------------------------------------
function resetSensorFilters() {
    // Tìm 2 thẻ input trên giao diện
    const searchInput = document.getElementById('sensor-search-input');
    const fieldSelect = document.getElementById('sensor-field-filter');

    // Xóa trắng ô tìm kiếm và đưa select về 'ALL'
    if (searchInput) searchInput.value = '';
    if (fieldSelect) fieldSelect.value = 'ALL';

    // Đặt lại biến trạng thái bộ lọc
    appliedSensorFilters = {
        search: '',
        field: 'ALL'
    };

    // Về trang 1 và vẽ lại bảng
    currentSensorPage = 1;
    renderSensorTable();
}

// -----------------------------------------------------------------------------
// 7. HÀM CHÈN BẢN GHI CẢM BIẾN MỚI VÀO ĐẦU DANH SÁCH (APPEND SENSOR RECORD)
// -----------------------------------------------------------------------------
// Hàm này được gọi tự động khi WebSocket nhận được gói tin dữ liệu cảm biến mới:
// Tham số đầu vào:
// - record (Object): Bản ghi dữ liệu cảm biến mới.
function appendSensorRecord(record) {
    // .unshift() chèn bản ghi mới vào vị trí đầu tiên (index 0) của mảng
    sensorDataList.unshift(record);

    // Giới hạn bộ nhớ: nếu danh sách vượt quá 100 bản ghi, xóa bản ghi cũ nhất ở cuối mảng (.pop())
    if (sensorDataList.length > 100) {
        sensorDataList.pop();
    }

    // Vẽ lại bảng dữ liệu
    renderSensorTable();
}

// -----------------------------------------------------------------------------
// 8. CÁC HÀM TIỆN ÍCH SAO CHÉP THỜI GIAN VÀO CLIPBOARD (COPY TIME TO CLIPBOARD)
// -----------------------------------------------------------------------------

// Xử lý sự kiện click trên nút icon sao chép thời gian
function handleCopyTimeClick(button) {
    if (!button) return;
    // Lấy chuỗi thời gian được gắn trong thuộc tính data-time của thẻ button
    const timeStr = button.getAttribute('data-time') || '';
    copyTimeToClipboard(timeStr, button);
}

// Thực hiện sao chép chuỗi vào Clipboard của hệ điều hành
function copyTimeToClipboard(timeStr, btn) {
    if (!timeStr) return;

    // ƯU TIÊN 1: Dùng Clipboard API hiện đại của trình duyệt (chỉ chạy trên HTTPS hoặc localhost)
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(timeStr).catch(() => fallbackCopyText(timeStr));
    } else {
        // ƯU TIÊN 2: Dùng phương pháp dự phòng bằng thẻ textarea ẩn
        fallbackCopyText(timeStr);
    }

    // HIỆU ỨNG PHẢN HỒI TRỰC QUAN TRÊN NÚT BẤM (VISUAL FEEDBACK):
    if (btn) {
        const icon = btn.querySelector('i');
        // Đổi icon từ hình chiếc kẹp giấy (ph-copy) sang hình dấu tích (ph-check)
        if (icon) icon.className = 'ph-bold ph-check';
        btn.classList.add('copied');
        btn.title = 'Đã sao chép!';

        // Sau 1.8 giây, tự động khôi phục lại icon và tooltip ban đầu
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

// Phương thức sao chép dự phòng (Fallback Copy) dành cho môi trường HTTP hoặc trình duyệt đời cũ:
function fallbackCopyText(text) {
    try {
        // Tạo một thẻ <textarea> ẩn trong bộ nhớ
        const textArea = document.createElement('textarea');
        textArea.value = text;
        // Đặt tọa độ ngoài màn hình để người dùng không nhìn thấy
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '-9999px';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        // Chọn toàn bộ văn bản và thực thi lệnh copy của trình duyệt
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        // Xóa thẻ textarea khỏi DOM sau khi sao chép xong
        document.body.removeChild(textArea);
    } catch (err) {
        console.warn('Lỗi sao chép dự phòng: ', err);
    }
}

// -----------------------------------------------------------------------------
// 9. HÀM ĐỒNG BỘ DỮ LIỆU TỪ BACKEND REST API (FETCH SENSOR DATA FROM API)
// -----------------------------------------------------------------------------
async function fetchSensorDataFromAPI() {
    // Kiểm tra xem dịch vụ HttpService có sẵn không
    if (window.HttpService && typeof window.HttpService.getSensorHistory === 'function') {
        // Gửi yêu cầu lấy 20 bản ghi cảm biến mới nhất
        const data = await window.HttpService.getSensorHistory(1, 20);

        // Nếu nhận được dữ liệu mảng hợp lệ từ máy chủ
        if (data && Array.isArray(data) && data.length > 0) {
            // Chuyển đổi định dạng dữ liệu API về định dạng chuẩn của giao diện Front-End
            sensorDataList = data.map(item => ({
                id: item.id,
                sensor: item.sensor_name || 'DHT22_01',
                device: item.device_id || 'ESP32_01',
                type: item.type || 'temperature',
                value: item.formatted_value || `${item.value}`,
                time: item.created_at || item.time
            }));
            // Vẽ lại bảng dữ liệu
            renderSensorTable();
        }
    }
}

// -----------------------------------------------------------------------------
// 10. SỰ KIỆN KHỞI CHẠY KHI TẢI XONG TRANG (DOM CONTENT LOADED)
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // 1. Hiển thị bảng ban đầu với dữ liệu mẫu
    renderSensorTable();
    // 2. Thử kết nối Backend để lấy dữ liệu thực tế
    fetchSensorDataFromAPI();

    // 3. Lắng nghe phím Enter trên ô tìm kiếm: Người dùng gõ xong nhấn Enter là tự động lọc ngay
    const searchInput = document.getElementById('sensor-search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                handleManualFilterSensor();
            }
        });
    }
});

// -----------------------------------------------------------------------------
// 11. XUẤT CÁC HÀM RA PHẠM VI TOÀN CỤC (WINDOW)
// -----------------------------------------------------------------------------
// Giúp các sự kiện onclick trên HTML có thể gọi trực tiếp
window.renderSensorTable = renderSensorTable;
window.appendSensorRecord = appendSensorRecord;
window.handleCopyTimeClick = handleCopyTimeClick;
window.copyTimeToClipboard = copyTimeToClipboard;
window.handleManualFilterSensor = handleManualFilterSensor;
window.resetSensorFilters = resetSensorFilters;
window.goToSensorPage = goToSensorPage;
