import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      hotelName: "Panchavati Grand",
      tagline: "Where Sacred Nashik Meets Luxury",
      searchRooms: "Search Rooms",
      myTrips: "My Trips",
    },
  },
  hi: {
    translation: {
      hotelName: "पंचवटी ग्रैंड",
      tagline: "जहां पवित्र नासिक मिलती है शानदार आतिथ्य से",
      searchRooms: "कमरे खोजें",
      myTrips: "मेरी यात्राएं",
    },
  },
  mr: {
    translation: {
      hotelName: "पंचवटी ग्रँड",
      tagline: "जिथे पवित्र नाशिक भेटते आलिशान पाहुणचाराला",
      searchRooms: "रूम शोधा",
      myTrips: "माझे प्रवास",
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

