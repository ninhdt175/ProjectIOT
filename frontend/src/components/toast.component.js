// Hiển thị thông báo dạng Toast ở góc màn hình (type: 'info' | 'success' | 'warning' | 'error')
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    // 1. Tạo thẻ phần tử Toast và áp dụng CSS class theo loại
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : type === 'success' ? 'toast-success' : ''}`;

    // 2. Chọn icon tương ứng với loại thông báo
    let icon = 'ph-info';
    if (type === 'error') icon = 'ph-warning-circle';
    if (type === 'warning') icon = 'ph-bell-ringing';
    if (type === 'success') icon = 'ph-check-circle';

    // 3. Gắn nội dung và chèn vào khung chứa Toast
    toast.innerHTML = `<i class="ph-bold ${icon}" style="font-size: 18px;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    // 4. Tự động ẩn và xóa khỏi DOM sau 3.5 giây với hiệu ứng mờ dần
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// Xuất hàm ra phạm vi toàn cục
window.showToast = showToast;
