const APP_SETTINGS_KEY = 'condominiumAppSettings';

const defaultAppSettings = {
  condominiumName: "ATLÁNTICO II",
  senderEmail: '',
  recipientEmail: '',
  sendIntervalHours: 0, 
  lastSentTimestamp: undefined,
};

export const getAppSettings = () => {
  const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
  if (settingsJson) {
    try {
      const storedSettings = JSON.parse(settingsJson);
      const mergedSettings = {
        ...defaultAppSettings,
        ...storedSettings,
        condominiumName: storedSettings.condominiumName?.trim() ? storedSettings.condominiumName : defaultAppSettings.condominiumName,
        sendIntervalHours: typeof storedSettings.sendIntervalHours === 'number' ? storedSettings.sendIntervalHours : defaultAppSettings.sendIntervalHours,
      };
      return mergedSettings;
    } catch (error) {
      console.error("Error parsing app settings from localStorage, returning defaults:", error);
      return { ...defaultAppSettings };
    }
  }
  return { ...defaultAppSettings };
};

export const saveAppSettings = (settings) => {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("Error saving app settings to localStorage:", error);
  }
};
