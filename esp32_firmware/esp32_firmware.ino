#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "driver/gpio.h"

// Pin configuration
#define LED1_PIN    18
#define LED2_PIN    19
#define LED3_PIN    21
#define DHTPIN      23
#define DHTTYPE     DHT22
#define LDR_PIN     32

DHT dht(DHTPIN, DHTTYPE);

// MQTT Credentials & WiFi settings
const char* mqtt_user = "DoTrongNinh";
const char* mqtt_pass = "B23DCCN633";
const char* ssid        = "Enoinh";
const char* password    = "55555555";
const char* mqtt_server = "172.20.10.2";
const int   mqtt_port   = 1705;

// MQTT Topics
const char* TOPIC_SENSOR_DATA    = "iot/sensors/data";
const char* TOPIC_DEVICE_CONTROL = "iot/device/control";
const char* TOPIC_DEVICE_STATUS  = "iot/device/status";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSensorReadTime = 0;
const unsigned long SENSOR_INTERVAL = 2500;

// Bộ nhớ đệm lưu giá trị cảm biến hợp lệ gần nhất (chống lỗi NaN)
float lastValidTemperature = 29.0;
float lastValidHumidity    = 80.0;

// ==========================================
// 1. NHÓM HÀM KHỞI TẠO PHẦN CỨNG (HARDWARE INIT)
// ==========================================

// Khởi tạo các chân GPIO cho đèn LED và cấu hình hạn dòng an toàn 5mA (chống cháy LED không cần điện trở)
void initLEDs() {
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  gpio_set_drive_capability((gpio_num_t)LED1_PIN, GPIO_DRIVE_CAP_0);
  gpio_set_drive_capability((gpio_num_t)LED2_PIN, GPIO_DRIVE_CAP_0);
  gpio_set_drive_capability((gpio_num_t)LED3_PIN, GPIO_DRIVE_CAP_0);
}

// Chớp nháy kiểm tra phần cứng 3 đèn LED lúc bật nguồn (Power-On Self-Test)
void testLEDsBlink() {
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  delay(300);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
}

// Khởi tạo các chân cảm biến nhiệt độ - độ ẩm DHT22 và quang trở LDR với điện trở kéo nội
void initSensors() {
  pinMode(DHTPIN, INPUT_PULLUP);
  dht.begin();
  pinMode(LDR_PIN, INPUT_PULLDOWN);
}

// ==========================================
// 2. NHÓM HÀM GIAO TIẾP MẠNG & MQTT (NETWORK & MQTT)
// ==========================================

// Kết nối hoặc tái kết nối vi điều khiển vào mạng Wi-Fi
void connectWiFi() {
  delay(100);
  Serial.print("\n[WiFi] Đang kết nối tới: ");
  Serial.println(ssid);

  WiFi.disconnect(true);
  delay(200);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  int retryCount = 0;
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    retryCount++;
    if (retryCount % 30 == 0) {
      Serial.println("\n[WiFi] Đang dò sóng... ");
    }
  }

  Serial.println("\n[WiFi] KẾT NỐI WI-FI THÀNH CÔNG!");
  Serial.print("[WiFi] Địa chỉ IP của ESP32: ");
  Serial.println(WiFi.localIP());
}

// Kết nối hoặc tái kết nối tới MQTT Broker và đăng ký theo dõi kênh lệnh điều khiển
void connectMQTT() {
  if (!client.connected()) {
    Serial.print("[MQTT] Connecting to broker... ");
    String clientId = "ESP32_Client_" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str(), mqtt_user, mqtt_pass)) {
      Serial.println("connected.");
      client.subscribe(TOPIC_DEVICE_CONTROL);
    } else {
      Serial.printf("failed, rc=%d\n", client.state());
    }
  }
}

// ==========================================
// 3. NHÓM HÀM ĐIỀU KHIỂN THIẾT BỊ (DEVICE CONTROL)
// ==========================================

// Thực thi bật/tắt các chân GPIO đèn LED theo yêu cầu điều khiển
bool executeDeviceControl(const char* target, const char* action) {
  int outputLevel = (strcmp(action, "ON") == 0) ? HIGH : LOW;

  if (strcmp(target, "ALL") == 0 || strcmp(target, "LED_ALL") == 0) {
    digitalWrite(LED1_PIN, outputLevel);
    digitalWrite(LED2_PIN, outputLevel);
    digitalWrite(LED3_PIN, outputLevel);
    return true;
  } else if (strcmp(target, "LED_01") == 0) {
    digitalWrite(LED1_PIN, outputLevel);
    return true;
  } else if (strcmp(target, "LED_02") == 0) {
    digitalWrite(LED2_PIN, outputLevel);
    return true;
  } else if (strcmp(target, "LED_03") == 0) {
    digitalWrite(LED3_PIN, outputLevel);
    return true;
  }
  return false;
}

// Gửi bản tin JSON xác nhận trạng thái (ACK) ngược lại cho Broker sau khi điều khiển
void sendDeviceStatusAck(const char* target, const char* action) {
  StaticJsonDocument<256> ackDoc;
  ackDoc["target"] = target;
  ackDoc["state"]  = action;
  ackDoc["status"] = "success";

  char ackBuffer[256];
  serializeJson(ackDoc, ackBuffer);
  client.publish(TOPIC_DEVICE_STATUS, ackBuffer);
}

// Tiếp nhận, giải mã bản tin MQTT và điều phối xử lý lệnh điều khiển thiết bị
void handleDeviceControlCommand(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.printf("[MQTT] %s -> %s\n", topic, message.c_str());

  StaticJsonDocument<256> doc;
  if (deserializeJson(doc, message)) return;

  const char* target = doc["target"];
  const char* action = doc["action"];
  if (!target || !action) return;

  if (executeDeviceControl(target, action)) {
    sendDeviceStatusAck(target, action);
  }
}

// Khởi tạo cấu hình kết nối MQTT Broker và gán hàm callback xử lý lệnh điều khiển
void initMQTT() {
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(handleDeviceControlCommand);
  client.setBufferSize(512);
}

// ==========================================
// 4. NHÓM HÀM THU THẬP & XUẤT BẢN DỮ LIỆU CẢM BIẾN (SENSORS)
// ==========================================

// Đọc giá trị nhiệt độ và độ ẩm từ cảm biến DHT22 với cơ chế thử lại (retry) và bộ nhớ đệm (cache)
void readDHTSensor(float &temperature, float &humidity) {
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  if (isnan(t) || isnan(h)) {
    delay(80);
    float retryH = dht.readHumidity();
    float retryT = dht.readTemperature();
    if (!isnan(retryH)) h = retryH;
    if (!isnan(retryT)) t = retryT;
  }
  if (!isnan(t)) lastValidTemperature = t;
  if (!isnan(h)) lastValidHumidity = h;

  temperature = lastValidTemperature;
  humidity = lastValidHumidity;
}

// Đọc cường độ ánh sáng từ quang trở LDR với thuật toán lấy mẫu trung bình 8 lần lọc nhiễu
int readLightSensor() {
  long sumLDR = 0;
  for (int i = 0; i < 8; i++) {
    sumLDR += analogRead(LDR_PIN);
    delay(2);
  }
  int rawLDR = sumLDR / 8;
  int lightLux = rawLDR;
  if (lightLux < 0) lightLux = 0;
  return lightLux;
}

// Đóng gói dữ liệu cảm biến thành định dạng JSON và publish lên MQTT Broker
void publishSensorData(float temperature, float humidity, int lightLux) {
  if (!client.connected()) return;

  StaticJsonDocument<256> sensorDoc;
  sensorDoc["device_id"]   = "ESP32_01";
  sensorDoc["sensor_id"]   = 1;
  sensorDoc["temperature"] = serialized(String(temperature, 1));
  sensorDoc["humidity"]    = serialized(String(humidity, 1));
  sensorDoc["light_lux"]   = lightLux;

  char sensorBuffer[256];
  serializeJson(sensorDoc, sensorBuffer);
  client.publish(TOPIC_SENSOR_DATA, sensorBuffer);
}

// Điều phối chu kỳ đọc cảm biến định kỳ và gửi dữ liệu lên Broker (Non-blocking)
void readAndPublishSensorData() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorReadTime >= SENSOR_INTERVAL) {
    lastSensorReadTime = currentMillis;

    float temperature, humidity;
    readDHTSensor(temperature, humidity);
    int lightLux = readLightSensor();

    Serial.printf("[Sensors] Temp: %.1f C | Hum: %.1f %% | Light: %d lux\n", 
                  temperature, humidity, lightLux);

    publishSensorData(temperature, humidity, lightLux);
  }
}

// ==========================================
// 5. CÁC HÀM TIÊU CHUẨN ARDUINO (SETUP & LOOP)
// ==========================================

void setup() {
  Serial.begin(115200);

  // Khởi tạo phần cứng thiết bị
  initLEDs();
  testLEDsBlink();
  initSensors();

  // Khởi tạo kết nối mạng và MQTT
  connectWiFi();
  initMQTT();
}

void loop() {
  // Tự động phục hồi kết nối Wi-Fi nếu bị ngắt quãng
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  // Duy trì kết nối MQTT Broker và thử kết nối lại định kỳ mỗi 5 giây
  static unsigned long lastMqttRetry = 0;
  if (!client.connected()) {
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      connectMQTT();
    }
  } else {
    client.loop();
  }

  // Thu thập và xuất bản dữ liệu cảm biến định kỳ (Non-blocking)
  readAndPublishSensorData();
}
