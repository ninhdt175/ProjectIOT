/**
 * ==============================================================================
 * SOURCE API: REALTIME SOCKET SERVICE (SOCKET.SERVICE.JS)
 * ==============================================================================
 * Tầng truyền thông thời gian thực qua giao thức WebSocket (Socket.IO)
 * ==============================================================================
 */

const SocketService = {
    /**
     * Cập nhật đèn trạng thái kết nối phần cứng ESP32
     * @param {boolean} isOnline - Trạng thái Online / Offline
     */
    setDeviceOnlineStatus(isOnline) {
        if (window.AppState) {
            window.AppState.isOnline = isOnline;
        }

        const badge = document.getElementById('device-status-badge');
        const label = document.getElementById('device-status-text');

        if (badge && label) {
            if (isOnline) {
                badge.classList.remove('offline');
                label.textContent = 'ESP32 ONLINE';
            } else {
                badge.classList.add('offline');
                label.textContent = 'ESP32 OFFLINE';
            }
        }
    },

    /**
     * Khởi tạo kết nối Socket.IO tới Backend Server
     */
    initConnection() {
        if (typeof io !== 'undefined') {
            try {
                const backendUrl = window.APP_CONFIG?.BACKEND_URL || window.location.origin;
                const socket = io(backendUrl, {
                    reconnectionAttempts: 5,
                    timeout: 3000
                });

                if (window.AppState) {
                    window.AppState.socket = socket;
                }

                // Khi kết nối thành công
                socket.on('connect', () => {
                    this.setDeviceOnlineStatus(true);
                    if (typeof showToast === 'function') {
                        showToast('Đã kết nối máy chủ thời gian thực', 'success');
                    }
                });

                // Khi mất kết nối
                socket.on('disconnect', () => {
                    this.setDeviceOnlineStatus(false);
                    if (typeof showToast === 'function') {
                        showToast('Mất kết nối máy chủ', 'error');
                    }
                });

                // Nhận luồng dữ liệu cảm biến mới đẩy từ MQTT Broker
                socket.on('sensor_data', (data) => {
                    const now = new Date();
                    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                    // Cập nhật số liệu các thẻ trên Dashboard
                    if (typeof updateDashboardMetrics === 'function') {
                        updateDashboardMetrics(data.temperature, data.humidity, data.light_lux);
                    }

                    // Cập nhật điểm dữ liệu mới vào Biểu đồ Chart.js
                    if (typeof updateChartRealtime === 'function') {
                        updateChartRealtime(timeLabel, data.temperature, data.humidity, data.light_lux);
                    }

                    // Ghi nhận bản ghi mới vào Bảng dữ liệu Cảm biến
                    const dateStr = now.toISOString().slice(0, 19).replace('T', ' ');
                    if (typeof appendSensorRecord === 'function') {
                        appendSensorRecord({
                            id: Date.now(),
                            sensor: 'DHT22_01',
                            device: data.device_id || 'ESP32_01',
                            type: 'temperature',
                            value: `${data.temperature.toFixed(1)} °C`,
                            time: dateStr
                        });
                    }
                });

                // Nhận cập nhật trạng thái thiết bị thực tế
                socket.on('device_status', (data) => {
                    if (data.target && window.AppState?.devices?.[data.target]) {
                        const dev = window.AppState.devices[data.target];
                        const chk = document.querySelector(`#${dev.elementId} input.toggle`);
                        if (chk) {
                            chk.checked = (data.state === 'ON' || data.state === true);
                            const item = document.getElementById(dev.elementId);
                            item?.classList.toggle('active', chk.checked);
                        }
                    }
                });

            } catch (e) {
                console.warn('Backend chưa sẵn sàng, tự động chuyển sang chế độ mô phỏng dữ liệu.');
                this.startSimulatedTelemetry();
            }
        } else {
            // Chạy chế độ mô phỏng nếu chưa nạp thư viện socket
            this.startSimulatedTelemetry();
        }
    },

    /**
     * Bộ tạo dữ liệu mô phỏng thời gian thực (hỗ trợ kiểm thử khi chưa kết nối phần cứng)
     */
    startSimulatedTelemetry() {
        this.setDeviceOnlineStatus(true);

        let currentTemp = 30.0;
        let currentHumid = 74.0;
        let currentLight = 1750;

        setInterval(() => {
            currentTemp += (Math.random() - 0.48) * 0.4;
            currentHumid += (Math.random() - 0.5) * 0.6;
            currentLight += Math.floor((Math.random() - 0.49) * 40);

            currentTemp = Math.max(22, Math.min(38, currentTemp));
            currentHumid = Math.max(40, Math.min(95, currentHumid));
            currentLight = Math.max(50, Math.min(3500, currentLight));

            const now = new Date();
            const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            if (typeof updateDashboardMetrics === 'function') {
                updateDashboardMetrics(currentTemp, currentHumid, currentLight);
            }

            if (typeof updateChartRealtime === 'function') {
                updateChartRealtime(timeLabel, parseFloat(currentTemp.toFixed(1)), parseFloat(currentHumid.toFixed(1)), currentLight);
            }
        }, 2500);
    }
};

window.SocketService = SocketService;
window.setDeviceOnlineStatus = SocketService.setDeviceOnlineStatus.bind(SocketService);
window.initRealtimeConnection = SocketService.initConnection.bind(SocketService);
