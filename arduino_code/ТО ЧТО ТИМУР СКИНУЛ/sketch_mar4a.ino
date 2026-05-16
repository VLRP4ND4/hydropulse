int trigPin = 9; 
int counter = 0;
String ID = "0001";
int echoPin = 8;
float data[10]; //data[0] data[1] ... data[9] 1.11 0.11 2.00
int def = 0;
unsigned long time;
unsigned long interval = 10800; //3 часа

float result;
String message = "";
void setup() { 
   Serial.begin (9600); 
   pinMode(trigPin, OUTPUT); 
   pinMode(echoPin, INPUT);
   time = millis(); 
   Serial.println("LoRa Sender");

  if (!LoRa.begin(915E6)) {
    Serial.println("Starting LoRa failed!");
    while (1);
  }
}  
void loop(){
    
  //замер 10 сек
  //Serial.println(time);
  if((millis()-time)>=(1000)){
        //Serial.println((millis()-time));
           //запрос на замер (10 измерений)
           Dist_med();
        Serial.println(def);
        // отправка данных через LORA (отправить переменную def)       
        time = millis();
  }    

    
  Serial.print("Sending packet: ");
  Serial.println(counter);

  // send packet
  LoRa.beginPacket();
  LoRa.print(def);
  LoRa.print("*"+ID);
  LoRa.endPacket();

  counter++;

  delay(5000);
}
//среднее значение уровня за один замер
void Dist_med(){
  int sum = 0;

  int max = 0;
  for(int i=0; i<10; i++){
      Distance(trigPin, echoPin);
    data[i] = result;
    if (max < data[i]){
      max = data[i];
    } else {
      if (max - data[i] > 15){
        data[i] = max;
      }
    }
    Serial.println(data[i]);
    delay(2000); 
  }
  for(int i=0; i<10; i++){
    if (max - data[i] > 10){
      data[i] = max;
    }
    //Serial.println(data[i]);
    sum += data[i];
  }
  //10 значений в массиве
  def = sum/10;
  Serial.println("");
}


//запрос уровня воды
void Distance(int trig, int echo){
    digitalWrite(trig, LOW); 
    delayMicroseconds(2); 
    digitalWrite(trig, HIGH);
    delayMicroseconds(10); 
    digitalWrite(trigPin, LOW); 
    float val_duration = pulseIn(echo, HIGH); 
    result = val_duration/58;
} 
