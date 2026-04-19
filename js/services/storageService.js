const STORAGE_KEY = 'condominiumEntries';

export const getEntries = () => {
  const entriesJson = localStorage.getItem(STORAGE_KEY);
  if (entriesJson) {
    try {
      const entries = JSON.parse(entriesJson);
      // Sort by timestamp, newest first
      return entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error("Error parsing entries from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const addEntry = (entry) => {
  const entries = getEntries();
  const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
  const entryWithIdAndTimestamp = { 
    ...entry, 
    id: newId, 
    timestamp: new Date().toISOString() 
  };
  const updatedEntries = [entryWithIdAndTimestamp, ...entries];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedEntries));
  return updatedEntries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const clearEntries = () => {
  localStorage.removeItem(STORAGE_KEY);
  return [];
};
