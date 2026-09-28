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

const char* mqtt_user = "DoTrongNinh";
const char* mqtt_pass = "B23DCCN633";
// WiFi & MQTT settings
const char* ssid        = "Enoinh";
const char* password    = "55555555";
const char* mqtt_server = "172.20.10.2";
const int   mqtt_port   = 1705;

const char* TOPIC_SENSOR_DATA    = "iot/sensors/data";
const char* TOPIC_DEVICE_CONTROL = "iot/device/control";
const char* TOPIC_DEVICE_STATUS  = "iot/device/status";

WiFiClient espClient;
PubSubClient client(espClient);

unsigned long lastSensorReadTime = 0;
const unsigned long SENSOR_INTERVAL = 2500;

float lastValidTemperature = 29.0;
float lastValidHumidity    = 80.0;

void setup_wifi() {
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

void mqttCallback(char* topic, byte* payload, unsigned int length) {
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

  int outputLevel = (strcmp(action, "ON") == 0) ? HIGH : LOW;

  if (strcmp(target, "ALL") == 0 || strcmp(target, "LED_ALL") == 0) {
    digitalWrite(LED1_PIN, outputLevel);
    digitalWrite(LED2_PIN, outputLevel);
    digitalWrite(LED3_PIN, outputLevel);
  } else if (strcmp(target, "LED_01") == 0) {
    digitalWrite(LED1_PIN, outputLevel);
  } else if (strcmp(target, "LED_02") == 0) {
    digitalWrite(LED2_PIN, outputLevel);
  } else if (strcmp(target, "LED_03") == 0) {
    digitalWrite(LED3_PIN, outputLevel);
  } else {
    return;
  }

  // Send ACK status
  StaticJsonDocument<256> ackDoc;
  ackDoc["target"] = target;
  ackDoc["state"]  = action;
  ackDoc["status"] = "success";

  char ackBuffer[256];
  serializeJson(ackDoc, ackBuffer);
  client.publish(TOPIC_DEVICE_STATUS, ackBuffer);
}

void reconnectMQTT() {
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

void handleSensorPublish() {
  unsigned long currentMillis = millis();
  if (currentMillis - lastSensorReadTime >= SENSOR_INTERVAL) {
    lastSensorReadTime = currentMillis;

    // Read DHT22 with retry and cache
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    if (isnan(temperature) || isnan(humidity)) {
      delay(80);
      float retryH = dht.readHumidity();
      float retryT = dht.readTemperature();
      if (!isnan(retryH)) humidity = retryH;
      if (!isnan(retryT)) temperature = retryT;
    }
    if (!isnan(temperature)) lastValidTemperature = temperature;
    if (!isnan(humidity))    lastValidHumidity = humidity;

    // Read LDR (average 8 samples)
    long sumLDR = 0;
    for (int i = 0; i < 8; i++) {
      sumLDR += analogRead(LDR_PIN);
      delay(2);
    }
    int rawLDR = sumLDR / 8;
    int lightLux = rawLDR; 
    if (lightLux < 0) lightLux = 0;

    Serial.printf("[Sensors] Temp: %.1f C | Hum: %.1f %% | Light: %d lux\n", 
                  lastValidTemperature, lastValidHumidity, lightLux);

    if (client.connected()) {
      StaticJsonDocument<256> sensorDoc;
      sensorDoc["device_id"]   = "ESP32_01";
      sensorDoc["sensor_id"]   = 1;
      sensorDoc["temperature"] = serialized(String(lastValidTemperature, 1));
      sensorDoc["humidity"]    = serialized(String(lastValidHumidity, 1));
      sensorDoc["light_lux"]   = lightLux;

      char sensorBuffer[256];
      serializeJson(sensorDoc, sensorBuffer);
      client.publish(TOPIC_SENSOR_DATA, sensorBuffer);
    }
  }
}

void setup() {
  Serial.begin(115200);

  // Setup LEDs
  pinMode(LED1_PIN, OUTPUT);
  pinMode(LED2_PIN, OUTPUT);
  pinMode(LED3_PIN, OUTPUT);
  gpio_set_drive_capability((gpio_num_t)LED1_PIN, GPIO_DRIVE_CAP_0);
  gpio_set_drive_capability((gpio_num_t)LED2_PIN, GPIO_DRIVE_CAP_0);
  gpio_set_drive_capability((gpio_num_t)LED3_PIN, GPIO_DRIVE_CAP_0);

  // Initial test blink
  digitalWrite(LED1_PIN, HIGH);
  digitalWrite(LED2_PIN, HIGH);
  digitalWrite(LED3_PIN, HIGH);
  delay(300);
  digitalWrite(LED1_PIN, LOW);
  digitalWrite(LED2_PIN, LOW);
  digitalWrite(LED3_PIN, LOW);

  // Setup Sensors
  pinMode(DHTPIN, INPUT_PULLUP);
  dht.begin();
  pinMode(LDR_PIN, INPUT_PULLDOWN);

  // Network setup
  setup_wifi();
  client.setServer(mqtt_server, mqtt_port);
  client.setCallback(mqttCallback);
  client.setBufferSize(512);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setup_wifi();
  }

  static unsigned long lastMqttRetry = 0;
  if (!client.connected()) {
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      reconnectMQTT();
    }
  } else {
    client.loop();
  }

  handleSensorPublish();
}
