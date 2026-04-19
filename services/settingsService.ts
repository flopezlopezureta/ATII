import { AppSettings } from '../types.ts';

const APP_SETTINGS_KEY = 'condominiumAppSettings';

// Define default settings
const defaultAppSettings: AppSettings = {
  condominiumName: "ATLÁNTICO II",
  senderEmail: '',
  recipientEmail: '',
  sendIntervalHours: 0, // Automatic email sending off by default
  lastSentTimestamp: undefined,
  conciergeModeEnabled: false,
  totalParkingSpots: 100,
  whatsappNotificationsEnabled: false,
};

export const getAppSettings = (): AppSettings => { // Ensure it always returns AppSettings
  const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
  if (settingsJson) {
    try {
      const storedSettings = JSON.parse(settingsJson) as Partial<AppSettings>;
      // Merge stored settings with defaults to ensure all keys are present
      // and provide defaults for any missing ones (e.g., if migrating from older version)
      const mergedSettings: AppSettings = {
        ...defaultAppSettings,
        ...storedSettings,
        // Explicitly ensure critical fields from defaults if they might be empty string from storage but should have default
        condominiumName: storedSettings.condominiumName?.trim() ? storedSettings.condominiumName : defaultAppSettings.condominiumName,
        // sendIntervalHours needs to be a number, handle potential string from older storage if necessary
        sendIntervalHours: typeof storedSettings.sendIntervalHours === 'number' ? storedSettings.sendIntervalHours : defaultAppSettings.sendIntervalHours,
        totalParkingSpots: typeof storedSettings.totalParkingSpots === 'number' ? storedSettings.totalParkingSpots : defaultAppSettings.totalParkingSpots,
      };
      return mergedSettings;
    } catch (error) {
      console.error("Error parsing app settings from localStorage, returning defaults:", error);
      return { ...defaultAppSettings }; // Return a copy of defaults on error
    }
  }
  return { ...defaultAppSettings }; // Return a copy of defaults if no settings found
};

export const saveAppSettings = (settings: AppSettings): void => {
  try {
    // Ensure condominiumName is not saved as an empty string if it's required.
    // However, the form validation should primarily handle this.
    // Here, we just save what's given.
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving app settings to localStorage:", error);
  }
};