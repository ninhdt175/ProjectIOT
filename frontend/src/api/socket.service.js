// Dịch vụ kết nối WebSocket thời gian thực (SocketService)
const SocketService = {
    // Cập nhật trạng thái kết nối ESP32 trên Topbar
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

    // Khởi tạo kết nối Socket.IO và lắng nghe sự kiện
    initConnection() {
        if (typeof io !== 'undefined') {
            try {
                const backendUrl = window.APP_CONFIG?.BACKEND_URL || (window.location.port === '3000' ? window.location.origin : 'http://localhost:3000');
                const socket = io(backendUrl, {
                    reconnectionAttempts: 10,
                    reconnectionDelay: 2000,
                    timeout: 5000
                });

                if (window.AppState) {
                    window.AppState.socket = socket;
                }

                socket.on('connect', () => {
                    console.log('[SocketService] Đã kết nối thành công tới Back-End:', backendUrl);
                    this.setDeviceOnlineStatus(true);
                });

                socket.on('disconnect', () => {
                    console.warn('[SocketService] Mất kết nối tới Back-End!');
                    this.setDeviceOnlineStatus(false);
                });

                // Nhận dữ liệu cảm biến định kỳ từ ESP32 qua Back-End
                socket.on('sensor_data', (data) => {
                    if (!data) return;

                    const now = new Date();
                    const pad = (n) => String(n).padStart(2, '0');
                    const timeLabel = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
                    const timeFull = data.time || `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${timeLabel}`;

                    const temp = (data.temperature !== null && data.temperature !== undefined) ? parseFloat(data.temperature) : NaN;
                    const humid = (data.humidity !== null && data.humidity !== undefined) ? parseFloat(data.humidity) : NaN;
                    const light = (data.light_lux !== null && data.light_lux !== undefined) ? parseInt(data.light_lux, 10) : NaN;

                    // 1. Cập nhật 3 Thẻ Card trên Dashboard
                    if (typeof updateDashboardMetrics === 'function') {
                        updateDashboardMetrics(temp, humid, light);
                    }

                    // 2. Cập nhật Biểu đồ Chart.js
                    if (typeof updateChartRealtime === 'function') {
                        updateChartRealtime(timeLabel, temp, humid, light);
                    }

                    // 3. Đẩy 3 chỉ số (Nhiệt độ, Độ ẩm, Ánh sáng) vào bảng Dữ liệu cảm biến (Sensors Table)
                    if (typeof appendSensorRecord === 'function') {
                        const devId = data.device_id || 'ESP32_01';

                        if (!isNaN(temp)) {
                            appendSensorRecord({
                                id: Date.now() + 1,
                                sensor: 'DHT22_01',
                                device: devId,
                                type: 'temperature',
                                value: `${temp.toFixed(1)} °C`,
                                rawVal: temp,
                                time: timeFull
                            });
                        }

                        if (!isNaN(humid)) {
                            appendSensorRecord({
                                id: Date.now() + 2,
                                sensor: 'DHT22_01',
                                device: devId,
                                type: 'humidity',
                                value: `${humid.toFixed(1)} %`,
                                rawVal: humid,
                                time: timeFull
                            });
                        }

                        if (!isNaN(light)) {
                            appendSensorRecord({
                                id: Date.now() + 3,
                                sensor: 'LDR_01',
                                device: devId,
                                type: 'light',
                                value: `${light} lux`,
                                rawVal: light,
                                time: timeFull
                            });
                        }
                    }
                });

                // Xác nhận lệnh điều khiển (ACK)
                socket.on('device_control_ack', (data) => {
                    if (typeof handleDeviceControlAck === 'function') {
                        handleDeviceControlAck(data);
                    }
                });

                // Đồng bộ trạng thái thiết bị đa người dùng
                socket.on('device_status', (data) => {
                    if (typeof handleDeviceControlAck === 'function') {
                        handleDeviceControlAck({
                            target: data.target,
                            action: data.action || (data.state === 'ON' || data.state === true ? 'ON' : 'OFF'),
                            status: data.status || 'success',
                            requestId: data.requestId
                        });
                    } else if (data.target && window.AppState?.devices?.[data.target]) {
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
                console.warn('[SocketService] Lỗi kết nối Socket, chuyển sang mô phỏng:', e.message);
                this.startSimulatedTelemetry();
            }
        } else {
            this.startSimulatedTelemetry();
        }
    },

    // Mô phỏng dữ liệu cảm biến ngẫu nhiên khi chạy độc lập hoàn toàn không có mạng
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
