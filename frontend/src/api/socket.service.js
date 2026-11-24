// Dịch vụ kết nối WebSocket thời gian thực (SocketService)
const SocketService = {
    // Cập nhật trạng thái kết nối ESP32 trên Topbar và trạng thái các nút công tắc trong "Thiết bị kết nối"
    setDeviceOnlineStatus(isOnline, deviceStates) {
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

        // Đồng bộ màu sắc trạng thái các nút trong "Thiết bị kết nối"
        const defaultMap = {
            LED_01: { elementId: 'devItem1' },
            LED_02: { elementId: 'devItem2' },
            LED_03: { elementId: 'devItem3' },
            LED_04: { elementId: 'devItem4' }
        };
        const devicesMap = (window.AppState && window.AppState.devices) ? window.AppState.devices : defaultMap;

        Object.keys(devicesMap).forEach((key) => {
            const dev = devicesMap[key];
            const itemId = dev.elementId || (key === 'LED_01' ? 'devItem1' : (key === 'LED_02' ? 'devItem2' : 'devItem3'));
            const item = document.getElementById(itemId);
            const checkbox = item ? item.querySelector('input.toggle') : null;

            if (!isOnline) {
                // Khi rút kết nối với mạch: giải phóng pending và chuyển toàn bộ nút công tắc sang màu xám (OFF)
                if (typeof window.setDevicePendingState === 'function') {
                    window.setDevicePendingState(itemId, key, false);
                }
                if (checkbox) {
                    checkbox.checked = false;
                }
                if (item) {
                    item.classList.remove('active');
                    item.classList.add('offline');
                }
                if (window.AppState?.devices?.[key]) {
                    window.AppState.devices[key].state = false;
                }
            } else {
                if (item) {
                    item.classList.remove('offline');
                }
                if (deviceStates && deviceStates[key] !== undefined) {
                    const isOn = (deviceStates[key] === 'ON' || deviceStates[key] === true);
                    if (checkbox) checkbox.checked = isOn;
                    if (item) item.classList.toggle('active', isOn);
                    if (window.AppState?.devices?.[key]) {
                        window.AppState.devices[key].state = isOn;
                    }
                }
            }
        });
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
                });

                socket.on('disconnect', () => {
                    console.warn('[SocketService] Mất kết nối tới Back-End!');
                    this.setDeviceOnlineStatus(false);
                });

                // Lắng nghe trạng thái kết nối thực tế của mạch ESP32 (ONLINE / OFFLINE khi rút mạch)
                socket.on('esp32_status', (data) => {
                    if (!data) return;
                    this.setDeviceOnlineStatus(Boolean(data.is_online), data.devices);
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
                    const oxygen = (data.oxygen !== null && data.oxygen !== undefined) 
                        ? parseFloat(data.oxygen) 
                        : Number((20.8 + Math.round((Math.sin(Date.now() / 8000) * 0.2 + 0.2) * 10) / 10).toFixed(1));

                    // 1. Cập nhật 4 Thẻ Card trên Dashboard
                    if (typeof updateDashboardMetrics === 'function') {
                        updateDashboardMetrics(temp, humid, light, oxygen);
                    }

                    // 2. Cập nhật 4 Biểu đồ Chart.js
                    if (typeof updateChartRealtime === 'function') {
                        updateChartRealtime(timeLabel, temp, humid, light, oxygen);
                    }

                    // 3. Đẩy 4 chỉ số (Nhiệt độ, Độ ẩm, Ánh sáng, Oxy) vào bảng Dữ liệu cảm biến (Sensors Table)
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

                        if (!isNaN(oxygen)) {
                            appendSensorRecord({
                                id: Date.now() + 4,
                                sensor: 'O2_01',
                                device: devId,
                                type: 'oxygen',
                                value: `${oxygen.toFixed(1)} %`,
                                rawVal: oxygen,
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
        let currentOxygen = 20.9;

        setInterval(() => {
            currentTemp += (Math.random() - 0.48) * 0.4;
            currentHumid += (Math.random() - 0.5) * 0.6;
            currentLight += Math.floor((Math.random() - 0.49) * 40);
            currentOxygen += (Math.random() - 0.5) * 0.08;

            currentTemp = Math.max(22, Math.min(38, currentTemp));
            currentHumid = Math.max(40, Math.min(95, currentHumid));
            currentLight = Math.max(50, Math.min(3500, currentLight));
            currentOxygen = Math.max(20.5, Math.min(21.4, currentOxygen));

            const now = new Date();
            const timeLabel = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

            if (typeof updateDashboardMetrics === 'function') {
                updateDashboardMetrics(currentTemp, currentHumid, currentLight, currentOxygen);
            }

            if (typeof updateChartRealtime === 'function') {
                updateChartRealtime(timeLabel, parseFloat(currentTemp.toFixed(1)), parseFloat(currentHumid.toFixed(1)), currentLight, parseFloat(currentOxygen.toFixed(1)));
            }
        }, 2500);
    }
};

window.SocketService = SocketService;
window.setDeviceOnlineStatus = SocketService.setDeviceOnlineStatus.bind(SocketService);
window.initRealtimeConnection = SocketService.initConnection.bind(SocketService);
