#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>
#include <ESP8266WebServer.h>

const char* ssid = "TermaToTzampaWifi";
const char* password = "namisenoiazei";
const char* serverAddress = "iotplant-d3cc3321e097.herokuapp.com";
const char* API_KEY = "4974264d336488204288cd2fd81a4834";
const char* device_id = "esp8266";
#include "DHT.h"
DHT dht2(2, DHT11);

const int dry = 595;  // value for dry sensor
const int wet = 239;  // value for wet sensor

// Define a variable to keep track of the device state
bool deviceState = false;
int sampleRate = 120 * 1000;
int sleepInterval = sampleRate - 1000;

const unsigned long RATE_LIMIT_INTERVAL = 60000;  // Interval in milliseconds (e.g., 60 seconds)
const int MAX_REQUESTS_PER_INTERVAL = 5;          // Maximum number of requests allowed per interval

// unsigned long lastRequestTime = 0;  // Time of the last request
// int requestCount = 0;

ESP8266WebServer server(80);  // Declare server globally

WiFiClient client;
HTTPClient http;

void setup() {

  Serial.begin(9600);
  delay(100);

  connectToWifi();
  IPAddress ip = WiFi.localIP();
  sendDeviceInfoToApi(ip, device_id);

  server.on("/turnOn", handleTurnOn);
  server.on("/turnOff", handleTurnOff);
  server.on("/getState", handleGetState);
  server.on("/reprogramDevice", handleReprogramDevice);

  server.begin();
  Serial.println("HTTP server started");
}
void connectToWifi() {
  Serial.println("Connecting to Wi-Fi...");
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}
void loop() {
  sendData();
  delay(sampleRate);

  server.handleClient();
}

float getSensorMoisture() {

  float sensorReading = analogRead(A0);
  Serial.println(sensorReading);

  // Ensure that the dry and wet values are correctly mapped to the desired percentage range
  float percentageHumidity = map(sensorReading, dry, wet, 0, 100);  // Adjusted mapping range
  Serial.print("moisture: ");
  Serial.println(percentageHumidity);

  return percentageHumidity;
}
bool isNaN(float value) {
  return isnan(value);
}

void sendData() {
  if (WiFi.status() == WL_CONNECTED) {

    http.begin(client, "http://" + String(serverAddress) + "/sensorData");
    http.addHeader("Content-Type", "application/json");
    http.addHeader("Authorization", "API_KEY " + String(API_KEY));

    // Serial.print("[HTTP] POST...\n");
    float moisture = getSensorMoisture();
    float temperature = dht2.readTemperature();
    float humidity = dht2.readHumidity();

    StaticJsonDocument<200> doc;

    doc["moisture"] = moisture;
    doc["device_id"] = device_id;

    if (!isNaN(temperature)) {
      doc["temperature"] = temperature;
    }
    if (!isNaN(humidity)) {
      doc["humidity"] = humidity;
    }
    String jsonString;
    serializeJson(doc, jsonString);

    int httpCode = http.POST(jsonString);

    if (httpCode > 0) {
      // Serial.printf("[HTTP] POST... code: %d\n", httpCode);

      if (httpCode == HTTP_CODE_OK) {
        String payload = http.getString();
        Serial.println("Received payload:");
        Serial.println(payload);
      }
    } else {
      Serial.printf("[HTTP] POST... failed, error: %s\n", http.errorToString(httpCode).c_str());
    }

    http.end();
  }
  // Serial.println("Entering deep sleep mode...");
  // ESP.deepSleep(sleepInterval);
}

void handleTurnOn() {
  if (!isAuthenticated()) {
    server.send(401, "text/plain", "Unauthorized");
    return;
  }
  deviceState = true;
  server.send(200, "text/plain", "Device turned on");
}

// Handler function to handle requests to turn the device off
void handleTurnOff() {
  if (!isAuthenticated()) {
    server.send(401, "text/plain", "Unauthorized");
    return;
  }
  deviceState = false;
  server.send(200, "text/plain", "Device turned off");
}

// Handler function to get the current device state
void handleGetState() {
  server.send(200, "text/plain", deviceState ? "ON" : "OFF");
}

// Function to authenticate requests using API key
bool isAuthenticated() {
  String apiKeyHeader = server.header("Authorization");
  return apiKeyHeader.equals("API_KEY " + String(API_KEY));
}
void handleReprogramDevice() {

  if (!isAuthenticated()) {
    server.send(401, "text/plain", "Unauthorized");
    return;
  }
  // if (!checkRateLimit()) {
  //   // Return 429 Too Many Requests status code
  //   server.send(429, "text/plain", "Too Many Requests");
  //   return;
  // }

  String requestBody = server.arg("plain");
  if (requestBody.isEmpty()) {
    server.send(400, "text/plain", "Empty request body");
    return;
  }

  Serial.println("------------- Request Body set sample_rate -------------");
  Serial.println("Request Body:");
  Serial.println(requestBody);

  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, requestBody);

  if (error) {
    server.send(400, "text/plain", "Failed to parse JSON");
    return;
  }

  int newSampleRate = doc["sampleRate"];
  if (newSampleRate > 999) {
    sampleRate = newSampleRate;
    sleepInterval = sampleRate - 1000;

    server.send(200, "text/plain", "Sample rate updated");
  } else {
    server.send(400, "text/plain", "Invalid sample rate");
  }
}


void sendDeviceInfoToApi(IPAddress ip, const char* deviceId) {

  http.begin(client, "http://" + String(serverAddress) + "/api/device/getDeviceInfo");
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", "API_KEY " + String(API_KEY));

  // Serial.println("Connected to API");
  StaticJsonDocument<200> doc;

  doc["ip"] = ip;
  doc["device_id"] = device_id;


  String jsonString;
  Serial.printf("%s\n", jsonString.c_str());

  serializeJson(doc, jsonString);
  Serial.printf("%s\n", jsonString.c_str());

  int httpCode = http.POST(jsonString);

  if (httpCode > 0) {
    // Serial.printf("[HTTP] POST... code: %d\n", httpCode);

    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("Received payload:");
      Serial.println(payload);
    }
  } else {
    Serial.printf("[HTTP] POST... failed, error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  Serial.println("send ip data:");
  Serial.println(jsonString);
}

// bool checkRateLimit() {
//   // Check rate limiting
//   unsigned long currentTime = millis();
//   if (currentTime - lastRequestTime > RATE_LIMIT_INTERVAL) {
//     // Reset request count if the interval has elapsed
//     requestCount = 0;
//   }

//   // Increment request count
//   requestCount++;

//   // Check if the request count exceeds the limit
//   if (requestCount > MAX_REQUESTS_PER_INTERVAL) {
//     return false;  // Rate limit exceeded
//   }

//   // Update last request time
//   lastRequestTime = currentTime;

//   return true;  // Rate limit not exceeded
// }
