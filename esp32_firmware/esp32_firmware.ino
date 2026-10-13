#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <ArduinoJson.h>
#include "driver/gpio.h"

// Cấu hình chân GPIO
#define LED1_PIN    18
#define LED2_PIN    19
#define LED3_PIN    21
#define DHTPIN      23
#define DHTTYPE     DHT22
#define LDR_PIN     32

DHT dht(DHTPIN, DHTTYPE);

// Cấu hình WiFi & MQTT
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

// Cache giá trị cảm biến hợp lệ gần nhất (chống NaN)
float lastValidTemperature = 29.0;
float lastValidHumidity    = 80.0;

// Cấu hình GPIO LED và giới hạn dòng 5mA (chống cháy LED không cần điện trở)
void initLEDs() {
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  gpio_set_drive_capability((gpio_num_t)LED1_PIN, GPIO_DRIVE_CAP_0);
  gpio_set_drive_capability((gpio_num_t)LED2_PIN, GPIO_DRIVE_CAP_0);
  gpio_set_drive_capability((gpio_num_t)LED3_PIN, GPIO_DRIVE_CAP_0);
}

// Kiểm tra LED khi khởi động
void testLEDsBlink() {
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  delay(300);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);
}

// Khởi tạo cảm biến DHT22 và quang trở LDR
void initSensors() {
  pinMode(DHTPIN, INPUT_PULLUP);
  dht.begin();
  pinMode(LDR_PIN, INPUT_PULLDOWN);
}

// Kết nối WiFi
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

// Kết nối MQTT Broker
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

// Điều khiển GPIO đèn LED
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

// Gửi bản tin ACK xác nhận trạng thái
void sendDeviceStatusAck(const char* target, const char* action) {
  StaticJsonDocument<256> ackDoc;
  ackDoc["target"] = target;
  ackDoc["state"]  = action;
  ackDoc["status"] = "success";

  char ackBuffer[256];
  serializeJson(ackDoc, ackBuffer);
  client.publish(TOPIC_DEVICE_STATUS, ackBuffer);
}

// Tiếp nhận và xử lý lệnh điều khiển từ MQTT
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

// Khởi tạo MQTT client
void initMQTT() {
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(handleDeviceControlCommand);
  client.setBufferSize(512);
}

// Đọc DHT22 kèm cơ chế retry và fallback cache
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

// Đọc cường độ ánh sáng LDR (lấy mẫu trung bình 8 lần lọc nhiễu)
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

// Xuất bản dữ liệu cảm biến lên MQTT broker
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

// Đọc và gửi dữ liệu cảm biến định kỳ (non-blocking)
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

void setup() {
  Serial.begin(115200);

  initLEDs();
  testLEDsBlink();
  initSensors();

  connectWiFi();
  initMQTT();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }

  static unsigned long lastMqttRetry = 0;
  if (!client.connected()) {
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      connectMQTT();
    }
  } else {
    client.loop();
  }

  readAndPublishSensorData();
}
