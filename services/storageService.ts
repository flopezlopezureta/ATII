
import { CondominiumEntry } from '../types.ts';
import { sendWhatsappNotificationForEntry } from './notificationService.ts';

const STORAGE_KEY = 'condominiumEntries';

export const getEntries = (): CondominiumEntry[] => {
  const entriesJson = localStorage.getItem(STORAGE_KEY);
  if (entriesJson) {
    try {
      const entries = JSON.parse(entriesJson) as CondominiumEntry[];
      // Sort by timestamp, newest first
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error("Error parsing entries from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const addEntry = (entry: CondominiumEntry): CondominiumEntry[] => {
  const entries = getEntries();
  const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  const entryWithIdAndTimestamp = { 
    ...entry, 
    id: newId, 
    timestamp: new Date().toISOString() 
  } as CondominiumEntry;
  const updatedEntries = [entryWithIdAndTimestamp, ...entries]; // Add to beginning for default newest first
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));

  if (entryWithIdAndTimestamp.status === 'approved') {
    sendWhatsappNotificationForEntry(entryWithIdAndTimestamp);
  }

  return updatedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const updateEntry = (entryId: string, updates: Partial<CondominiumEntry>): CondominiumEntry[] => {
    let entries = getEntries();
    const entryIndex = entries.findIndex(e => e.id === entryId);
    if (entryIndex > -1) {
        const originalEntry = entries[entryIndex];
        const updatedEntry = { ...entries[entryIndex], ...updates } as CondominiumEntry;
        entries[entryIndex] = updatedEntry;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        
        if (updates.status === 'approved' && originalEntry.status !== 'approved') {
            sendWhatsappNotificationForEntry(updatedEntry);
        }
    }
    return getEntries(); // Return fresh sorted data
};

export const clearEntries = (): CondominiumEntry[] => {
  localStorage.removeItem(STORAGE_KEY);
  return [];
};