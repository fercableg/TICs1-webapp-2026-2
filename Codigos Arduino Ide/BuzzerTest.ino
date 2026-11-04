//Buzzer
const int BUZZER = 25;

void setup() {
  pinMode(BUZZER, OUTPUT);
}

void loop() {
  digitalWrite(BUZZER, HIGH); // Enciende el buzzer
  delay(1000);

  digitalWrite(BUZZER, LOW);  // Apaga el buzzer
  delay(1000);
}
