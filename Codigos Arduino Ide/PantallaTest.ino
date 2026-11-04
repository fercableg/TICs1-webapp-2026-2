//Pantalla
#include <SPI.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ILI9341.h>

#define TFT_CS   5
#define TFT_DC   2
#define TFT_RST  4

Adafruit_ILI9341 tft(TFT_CS, TFT_DC, TFT_RST);

void setup() {
  SPI.begin(18, 19, 23, 5);

  tft.begin();
  tft.setRotation(1);

  tft.fillScreen(ILI9341_BLACK);

  tft.setTextColor(ILI9341_WHITE);
  tft.setTextSize(3);
  tft.setCursor(45, 35);
  tft.println("NOVA CARE");

  tft.setTextSize(2);
  tft.setCursor(35, 100);
  tft.println("Sistema activo");

  tft.setCursor(35, 145);
  tft.println("ESP32 conectado");

  delay(2000);

  tft.fillScreen(ILI9341_BLUE);
  delay(1000);

  tft.fillScreen(ILI9341_RED);
  delay(1000);

  tft.fillScreen(ILI9341_GREEN);
  delay(1000);

  tft.fillScreen(ILI9341_BLACK);

  tft.setCursor(40, 100);
  tft.setTextColor(ILI9341_GREEN);
  tft.println("PRUEBA OK");
}

void loop() {
}