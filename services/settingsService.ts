import { AppSettings } from '../types.ts';

const defaultAppSettings: AppSettings = {
  condominiumName: "ATLÁNTICO II",
  senderEmail: '',
  recipientEmail: '',
  sendIntervalHours: 0,
  lastSentTimestamp: undefined,
  conciergeModeEnabled: false,
  totalParkingSpots: 100,
  whatsappNotificationsEnabled: false,
};

export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const data = await res.json();
    return { ...defaultAppSettings, ...data };
  } catch (error) {
    console.error("Error fetching settings from API, using defaults:", error);
    return { ...defaultAppSettings };
  }
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
  } catch (error) {
    console.error("Error saving settings to API:", error);
    throw error;
  }
};