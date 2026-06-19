import { CondominiumEntry } from '../types.ts';
import { sendWhatsappNotificationForEntry } from './notificationService.ts';

export const getEntries = async (): Promise<CondominiumEntry[]> => {
  try {
    const res = await fetch('/api/entries');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error fetching entries from API:", error);
    return [];
  }
};

export const addEntry = async (entry: CondominiumEntry): Promise<CondominiumEntry[]> => {
  try {
    const res = await fetch('/api/entries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const updatedEntries = await res.json();

    // Trigger WhatsApp notification for newly approved entries (needs to run on browser client)
    const newEntry = updatedEntries.find((e: any) => e.status === 'approved' && !entry.id); // Newly added entry will not have an ID on input but will in database
    if (newEntry && newEntry.status === 'approved') {
      sendWhatsappNotificationForEntry(newEntry);
    }

    return updatedEntries;
  } catch (error) {
    console.error("Error adding entry to API:", error);
    throw error;
  }
};

export const updateEntry = async (entryId: string, updates: Partial<CondominiumEntry>): Promise<CondominiumEntry[]> => {
  try {
    const res = await fetch(`/api/entries/${entryId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const updatedEntries = await res.json();

    const updatedEntry = updatedEntries.find((e: any) => e.id === entryId);
    if (updates.status === 'approved' && updatedEntry && updatedEntry.status === 'approved') {
      sendWhatsappNotificationForEntry(updatedEntry);
    }

    return updatedEntries;
  } catch (error) {
    console.error("Error updating entry in API:", error);
    throw error;
  }
};

export const clearEntries = async (): Promise<CondominiumEntry[]> => {
  try {
    const res = await fetch('/api/entries', {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error clearing entries in API:", error);
    return [];
  }
};