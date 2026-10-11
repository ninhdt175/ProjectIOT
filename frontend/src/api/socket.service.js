const SocketService = {
    /**
     * Cập nhật chỉ báo trạng thái kết nối phần cứng ESP32
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

                socket.on('connect', () => {
                    this.setDeviceOnlineStatus(true);
                    if (typeof showToast === 'function') {
                        showToast('Đã kết nối máy chủ thời gian thực', 'success');
                    }
                });

                socket.on('disconnect', () => {
                    this.setDeviceOnlineStatus(false);
                    if (typeof showToast === 'function') {
                        showToast('Mất kết nối máy chủ', 'error');
                    }
                });

                socket.on('sensor_data', (data) => {
                    const now = new Date();
                    const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

                    if (typeof updateDashboardMetrics === 'function') {
                        updateDashboardMetrics(data.temperature, data.humidity, data.light_lux);
                    }

                    if (typeof updateChartRealtime === 'function') {
                        updateChartRealtime(timeLabel, data.temperature, data.humidity, data.light_lux);
                    }

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

                socket.on('device_control_ack', (data) => {
                    if (typeof handleDeviceControlAck === 'function') {
                        handleDeviceControlAck(data);
                    }
                });

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
                console.warn('Backend chưa sẵn sàng, tự động chuyển sang chế độ mô phỏng dữ liệu.');
                this.startSimulatedTelemetry();
            }
        } else {
            this.startSimulatedTelemetry();
        }
    },

    /**
     * Bộ tạo dữ liệu mô phỏng thời gian thực khi chạy độc lập
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
