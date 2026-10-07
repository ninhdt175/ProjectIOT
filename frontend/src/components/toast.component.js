/**
 * Hiển thị thông báo Toast
 * @param {string} message - Nội dung thông báo
 * @param {'info' | 'success' | 'warning' | 'error'} type - Kiểu thông báo
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'toast-error' : type === 'warning' ? 'toast-warning' : type === 'success' ? 'toast-success' : ''}`;

    let icon = 'ph-info';
    if (type === 'error') icon = 'ph-warning-circle';
    if (type === 'warning') icon = 'ph-bell-ringing';
    if (type === 'success') icon = 'ph-check-circle';

    toast.innerHTML = `<i class="ph-bold ${icon}" style="font-size: 18px;"></i> <span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

window.showToast = showToast;
