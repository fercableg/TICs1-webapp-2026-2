//Sensor de Presion 1
#define SENSOR_PRESION 34

// Umbrales provisionales para pruebas
const int UMBRAL_SIN_PRESION = 300;
const int UMBRAL_PRESION_ALTA = 1800;

String clasificarPresion(int lectura) {
  if (lectura <= UMBRAL_SIN_PRESION) {
    return "SIN PRESION";
  }
  else if (lectura <= UMBRAL_PRESION_ALTA) {
    return "PRESION BAJA";
  }
  else {
    return "PRESION ALTA";
  }
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);

  Serial.println("MONITOREO FSR406");
}

void loop() {
  int lectura = analogRead(SENSOR_PRESION);

  Serial.print("Sensor 1: ");
  Serial.print(lectura);
  Serial.print(" | ");
  Serial.println(clasificarPresion(lectura));

  delay(500);
}


