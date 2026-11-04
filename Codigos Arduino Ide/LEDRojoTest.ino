//Led Rojo

const int LED_ROJO = 26;

void setup() {
  pinMode(LED_ROJO, OUTPUT);
}

void loop() {
  digitalWrite(LED_ROJO, HIGH);
  delay(1000);

  digitalWrite(LED_ROJO, LOW);
  delay(1000);
}
