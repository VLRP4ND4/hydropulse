//
// Copyright 2015 Google Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

// FirebaseDemo_ESP8266 is a sample that demo the different functions
// of the FirebaseArduino API.

#include <ESP8266WiFi.h>
#include <FirebaseArduino.h>

// Set these to run example.
#define FIREBASE_HOST "level-water-b7b74-default-rtdb.firebaseio.com"
#define FIREBASE_AUTH "Lk2qaeBYwggWBDSTafB71n708EeRTrsuIef7gfsN"
#define WIFI_SSID "Galaxy A3247FF"
#define WIFI_PASSWORD "ksssm2006"

void setup() {
  Serial.begin(9600);

  // connect to wifi.
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.print("connecting");
  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.println();
  Serial.print("connected: ");
  Serial.println(WiFi.localIP());
  
  Firebase.begin(FIREBASE_HOST, FIREBASE_AUTH);
}

int n = 0;

void loop() {
  // set value
  Firebase.setFloat("id/001/levelwater", 142);
  Firebase.setFloat("id/002/levelwater", 147);
  Firebase.setFloat("id/003/levelwater", 146);
  Firebase.setFloat("id/004/levelwater", 148);
  Firebase.setFloat("id/005/levelwater", 145);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);
  
  Firebase.setFloat("id/001/levelwater", 146);
  Firebase.setFloat("id/001/levelwater", 145);
  Firebase.setFloat("id/002/levelwater", 145);
  Firebase.setFloat("id/003/levelwater", 147);
  Firebase.setFloat("id/004/levelwater", 142);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 147);
  Firebase.setFloat("id/001/levelwater", 142);
  Firebase.setFloat("id/002/levelwater", 144);
  Firebase.setFloat("id/003/levelwater", 152);
  Firebase.setFloat("id/004/levelwater", 153);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 145);
  Firebase.setFloat("id/001/levelwater", 144);
  Firebase.setFloat("id/002/levelwater", 147);
  Firebase.setFloat("id/003/levelwater", 149);
  Firebase.setFloat("id/004/levelwater", 147);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 142);
  Firebase.setFloat("id/002/levelwater", 147);
  Firebase.setFloat("id/003/levelwater", 146);
  Firebase.setFloat("id/004/levelwater", 148);
  Firebase.setFloat("id/005/levelwater", 145);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);
  
  Firebase.setFloat("id/001/levelwater", 146);
  Firebase.setFloat("id/001/levelwater", 147);
  Firebase.setFloat("id/002/levelwater", 145);
  Firebase.setFloat("id/003/levelwater", 150);
  Firebase.setFloat("id/004/levelwater", 144);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 147);
  Firebase.setFloat("id/001/levelwater", 142);
  Firebase.setFloat("id/002/levelwater", 144);
  Firebase.setFloat("id/003/levelwater", 152);
  Firebase.setFloat("id/004/levelwater", 153);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 145);
  Firebase.setFloat("id/001/levelwater", 147);
  Firebase.setFloat("id/002/levelwater", 147);
  Firebase.setFloat("id/003/levelwater", 148);
  Firebase.setFloat("id/004/levelwater", 147);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 142);
  Firebase.setFloat("id/002/levelwater", 147);
  Firebase.setFloat("id/003/levelwater", 146);
  Firebase.setFloat("id/004/levelwater", 148);
  Firebase.setFloat("id/005/levelwater", 145);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);
  
  Firebase.setFloat("id/001/levelwater", 146);
  Firebase.setFloat("id/001/levelwater", 145);
  Firebase.setFloat("id/002/levelwater", 144);
  Firebase.setFloat("id/003/levelwater", 147);
  Firebase.setFloat("id/004/levelwater", 142);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 147);
  Firebase.setFloat("id/001/levelwater", 142);
  Firebase.setFloat("id/002/levelwater", 143);
  Firebase.setFloat("id/003/levelwater", 152);
  Firebase.setFloat("id/004/levelwater", 153);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);

  Firebase.setFloat("id/001/levelwater", 145);
  Firebase.setFloat("id/001/levelwater", 144);
  Firebase.setFloat("id/002/levelwater", 147);
  Firebase.setFloat("id/003/levelwater", 161);
  Firebase.setFloat("id/004/levelwater", 159);
  // handle error
  if (Firebase.failed()) {
      Serial.print("setting /number failed:");
      Serial.println(Firebase.error());  
      return;
  }
  delay(5000);
}
