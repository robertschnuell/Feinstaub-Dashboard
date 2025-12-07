import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Login
      "login.title": "{{title}}",
      "login.subtitle": "{{subtitle}}",
      "login.placeholder": "Enter password",
      "login.error": "Invalid password",
      "login.button": "Login",
      
      // Navigation
      "nav.logout": "Logout",
      "nav.live": "Live",
      "nav.offline": "Offline",
      
      // Loading
      "loading": "Loading data...",
      
      // Current values
      "current.temperature": "Temperature",
      "current.humidity": "Humidity",
      
      // Time ranges
      "range.1h": "1h",
      "range.6h": "6h",
      "range.24h": "24h",
      "range.7d": "7d",
      "range.30d": "30d",
      "range.all": "All",
      
      // Charts
      "chart.particleMass.title": "Particle Mass Concentration",
      "chart.particleMass.description": "PM1.0, PM2.5, PM4.0, PM10 ({{range}}) • ~{{points}} measurements • 10-min interval",
      "chart.particleMass.descriptionAll": "PM1.0, PM2.5, PM4.0, PM10 ({{range}}) • All data • 10-min interval",
      "chart.particleCount.title": "Particle Count",
      "chart.particleCount.description": "Particles per cm³ ({{range}}) • 10-min interval",
      "chart.particleSize.title": "Typical Particle Size",
      "chart.particleSize.description": "Average size ({{range}}) • 10-min interval",
      "chart.temperature.title": "Temperature",
      "chart.temperature.description": "History ({{range}}) • 10-min interval",
      "chart.humidity.title": "Humidity",
      "chart.humidity.description": "History ({{range}}) • 10-min interval",
      
      // Chart labels
      "chart.label.massConcentration": "μg/m³",
      "chart.label.particleCount": "Particles/cm³",
      "chart.label.size": "μm",
      "chart.label.temperature": "°C",
      "chart.label.humidity": "%",
      "chart.label.pm1": "PM1.0",
      "chart.label.pm25": "PM2.5",
      "chart.label.pm4": "PM4.0",
      "chart.label.pm10": "PM10",
      "chart.label.pm1Count": "PM1.0 Count",
      "chart.label.pm25Count": "PM2.5 Count",
      "chart.label.pm10Count": "PM10 Count",
      "chart.label.particleSize": "Particle Size",
      
      // Footer
      "footer.lastUpdate": "Last update",
      "footer.dashboard": "Dashboard for monitoring the",
      "footer.sensor": "ELV-LW-SPM LoRaWAN® Particle Sensor",
      "footer.with": "with SPS30 sensor",
      "footer.madeBy": "Made by",
      "footer.license": "MIT License"
    }
  },
  de: {
    translation: {
      // Login
      "login.title": "{{title}}",
      "login.subtitle": "{{subtitle}}",
      "login.placeholder": "Passwort eingeben",
      "login.error": "Falsches Passwort",
      "login.button": "Anmelden",
      
      // Navigation
      "nav.logout": "Abmelden",
      "nav.live": "Live",
      "nav.offline": "Offline",
      
      // Loading
      "loading": "Lade Daten...",
      
      // Current values
      "current.temperature": "Temperatur",
      "current.humidity": "Luftfeuchtigkeit",
      
      // Time ranges
      "range.1h": "1h",
      "range.6h": "6h",
      "range.24h": "24h",
      "range.7d": "7d",
      "range.30d": "30d",
      "range.all": "Alle",
      
      // Charts
      "chart.particleMass.title": "Partikelmasse Konzentration",
      "chart.particleMass.description": "PM1.0, PM2.5, PM4.0, PM10 ({{range}}) • ~{{points}} Messwerte • 10-Min-Intervall",
      "chart.particleMass.descriptionAll": "PM1.0, PM2.5, PM4.0, PM10 ({{range}}) • Alle Daten • 10-Min-Intervall",
      "chart.particleCount.title": "Partikelanzahl",
      "chart.particleCount.description": "Partikel pro cm³ ({{range}}) • 10-Min-Intervall",
      "chart.particleSize.title": "Typische Partikelgröße",
      "chart.particleSize.description": "Durchschnittliche Größe ({{range}}) • 10-Min-Intervall",
      "chart.temperature.title": "Temperatur",
      "chart.temperature.description": "Verlauf ({{range}}) • 10-Min-Intervall",
      "chart.humidity.title": "Luftfeuchtigkeit",
      "chart.humidity.description": "Verlauf ({{range}}) • 10-Min-Intervall",
      
      // Chart labels
      "chart.label.massConcentration": "μg/m³",
      "chart.label.particleCount": "Partikel/cm³",
      "chart.label.size": "μm",
      "chart.label.temperature": "°C",
      "chart.label.humidity": "%",
      "chart.label.pm1": "PM1.0",
      "chart.label.pm25": "PM2.5",
      "chart.label.pm4": "PM4.0",
      "chart.label.pm10": "PM10",
      "chart.label.pm1Count": "PM1.0 Anzahl",
      "chart.label.pm25Count": "PM2.5 Anzahl",
      "chart.label.pm10Count": "PM10 Anzahl",
      "chart.label.particleSize": "Partikelgröße",
      
      // Footer
      "footer.lastUpdate": "Letzte Aktualisierung",
      "footer.dashboard": "Dashboard zur Überwachung des",
      "footer.sensor": "ELV-LW-SPM LoRaWAN® Feinstaubsensors",
      "footer.with": "mit SPS30 Sensor",
      "footer.madeBy": "Erstellt von",
      "footer.license": "MIT Lizenz"
    }
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
