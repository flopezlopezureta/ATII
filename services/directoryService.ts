import { DirectoryUser, UserPermissions } from '../types.ts';

export const defaultPermissions: UserPermissions = {
  authorizePeople: false,
  authorizeVehicles: false,
  sendNotifications: false,
  manageDirectory: false,
  authorizeInvitations: false,
};

let cachedDirectoryUsers: DirectoryUser[] = [];

export const getDirectoryUsers = async (): Promise<DirectoryUser[]> => {
  try {
    const res = await fetch('/api/directory');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const data = await res.json();
    cachedDirectoryUsers = data;
    return data;
  } catch (error) {
    console.error("Error fetching directory users:", error);
    return [];
  }
};

export const addDirectoryUser = async (user: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt'>): Promise<DirectoryUser[]> => {
  try {
    const res = await fetch('/api/directory', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(user),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const data = await res.json();
    cachedDirectoryUsers = data;
    return data;
  } catch (error) {
    console.error("Error adding directory user:", error);
    throw error;
  }
};

export const updateDirectoryUser = async (userId: string, updates: Partial<Omit<DirectoryUser, 'id' | 'createdAt'>>): Promise<DirectoryUser[]> => {
  try {
    const res = await fetch(`/api/directory/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const data = await res.json();
    cachedDirectoryUsers = data;
    return data;
  } catch (error) {
    console.error("Error updating directory user:", error);
    throw error;
  }
};

export const deleteDirectoryUser = async (userId: string): Promise<DirectoryUser[]> => {
  try {
    const res = await fetch(`/api/directory/${userId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    const data = await res.json();
    cachedDirectoryUsers = data;
    return data;
  } catch (error) {
    console.error("Error deleting directory user:", error);
    throw error;
  }
};

// Synchronous lookups over the in-memory cache to prevent refactoring forms
export const findDirectoryUserByRUT = (rut: string): DirectoryUser | undefined => {
  if (!rut.trim()) return undefined;
  const cleanedSearchRUT = rut.trim().replace(/[^0-9kK]+/g, '').toUpperCase();
  return cachedDirectoryUsers.find(u => u.idDocument && u.idDocument.replace(/[^0-9kK]+/g, '').toUpperCase() === cleanedSearchRUT);
};

export const findDirectoryUserByAuthId = (authUserId: string): DirectoryUser | undefined => {
  if (!authUserId.trim()) return undefined;
  return cachedDirectoryUsers.find(u => u.authUserId === authUserId);
};

export const findDirectoryUserByVehicleLicensePlate = (licensePlate: string): { user: DirectoryUser, vehicle: any } | undefined => {
  if (!licensePlate.trim()) return undefined;
  const cleanedPlate = licensePlate.trim().toUpperCase();
  for (const user of cachedDirectoryUsers) {
    if (user.vehicles && user.vehicles.length > 0) {
      const foundVehicle = user.vehicles.find(v => v.licensePlate.toUpperCase() === cleanedPlate);
      if (foundVehicle) {
        return { user, vehicle: foundVehicle };
      }
    }
  }
  return undefined;
};

export const findDirectoryUserByParkingSpot = (parkingSpot: string): { user: DirectoryUser, vehicle: any } | undefined => {
  if (!parkingSpot.trim()) return undefined;
  const cleanedSpot = parkingSpot.trim().toUpperCase();
  for (const user of cachedDirectoryUsers) {
    if (user.vehicles && user.vehicles.length > 0) {
      const foundVehicle = user.vehicles.find(v => v.parkingSpot?.trim().toUpperCase() === cleanedSpot);
      if (foundVehicle) {
        return { user, vehicle: foundVehicle };
      }
    }
  }
  return undefined;
};
