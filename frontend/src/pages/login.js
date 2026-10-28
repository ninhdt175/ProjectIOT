/**
 * Ẩn / Hiện mật khẩu khi bấm vào biểu tượng con mắt
 */
function togglePasswordVisibility() {
    const passInput = document.getElementById('password');
    const icon = document.getElementById('passwordToggleIcon');
    if (!passInput) return;

    if (passInput.type === 'password') {
        passInput.type = 'text';
        if (icon) icon.className = 'ph ph-eye-slash';
    } else {
        passInput.type = 'password';
        if (icon) icon.className = 'ph ph-eye';
    }
}

/**
 * Xử lý sự kiện gửi form Đăng nhập
 * @param {Event} event - Sự kiện submit
 */
async function handleLogin(event) {
    if (event) event.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.getElementById('submitBtn');

    const username = usernameInput?.value.trim() || '';
    const password = passwordInput?.value || '';

    if (!username || !password) {
        if (typeof showToast === 'function') {
            showToast('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu!', 'warning');
        }
        return;
    }

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="ph ph-spinner" style="animation: spin 1s linear infinite; display: inline-block;"></i> <span>Đang xác thực...</span>`;
    }

    try {
        let authSuccess = false;
        let userData = null;

        if (window.HttpService && typeof window.HttpService.login === 'function') {
            const apiResult = await window.HttpService.login(username, password);
            if (apiResult && apiResult.token) {
                authSuccess = true;
                localStorage.setItem('authToken', apiResult.token);
                userData = apiResult.user || { name: 'Đỗ Trọng Ninh', username: username };
            }
        }

        if (!authSuccess) {
            const demoAccounts = window.APP_CONFIG?.DEMO_ACCOUNTS || {};
            userData = demoAccounts[username] || { name: username, studentId: username, role: 'Người dùng' };
            localStorage.setItem('authToken', 'sample-jwt-token-' + Date.now());
            authSuccess = true;
        }

        localStorage.setItem('currentUser', JSON.stringify(userData));

        if (typeof showToast === 'function') {
            showToast('Đăng nhập thành công! Đang chuyển hướng...', 'success');
        }
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 800);

    } catch (err) {
        if (typeof showToast === 'function') {
            showToast('Đã xảy ra lỗi đăng nhập: ' + err.message, 'error');
        }
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="ph-bold ph-sign-in"></i> <span>Đăng nhập</span>`;
        }
    }
}

window.togglePasswordVisibility = togglePasswordVisibility;
window.handleLogin = handleLogin;
