

import { DirectoryUser, DirectoryVehicle, TenantDetails, OccupantDetails, UserPermissions } from '../types.ts';
import { getPermissionsForRole } from './roleService.ts';

const DIRECTORY_USERS_STORAGE_KEY = 'condominiumDirectoryUsers';

export const defaultPermissions: UserPermissions = {
  authorizePeople: false,
  authorizeVehicles: false,
  sendNotifications: false,
  manageDirectory: false,
  authorizeInvitations: false,
};

export const getDirectoryUsers = (): DirectoryUser[] => {
  const usersJson = localStorage.getItem(DIRECTORY_USERS_STORAGE_KEY);
  if (usersJson) {
    try {
      const users = JSON.parse(usersJson) as DirectoryUser[];
      // Ensure backward compatibility for users stored before new fields were added
      const usersWithAllFields = users.map(user => ({
        ...user,
        authUserId: user.authUserId || undefined,
        roleNotes: user.roleNotes || undefined,
        vehicles: user.vehicles || [],
        tenant: user.tenant === undefined ? null : user.tenant, 
        occupants: user.occupants || [], 
        petsInfo: user.petsInfo || '', 
        unitParkingSpots: user.unitParkingSpots || [],
        permissions: user.permissions || getPermissionsForRole(user.role), // Fallback for older users
        workShift: user.workShift || undefined,
      }));
      return usersWithAllFields.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error parsing directory users from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const addDirectoryUser = (user: Omit<DirectoryUser, 'id' | 'createdAt' | 'updatedAt'>): DirectoryUser[] => {
  const users = getDirectoryUsers();
  const now = new Date().toISOString();
  
  // Get permissions based on the role, unless specific permissions are already provided (e.g. for staff).
  const permissionsForRole = getPermissionsForRole(user.role);

  const newUser: DirectoryUser = {
    ...user,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    authUserId: user.authUserId || undefined,
    roleNotes: user.roleNotes || undefined,
    vehicles: user.vehicles || [],
    tenant: user.tenant || null,
    occupants: user.occupants || [],
    petsInfo: user.petsInfo || '',
    unitParkingSpots: user.unitParkingSpots || [],
    permissions: user.permissions || permissionsForRole,
    workShift: user.workShift || undefined,
    createdAt: now,
    updatedAt: now,
  };
  const updatedUsers = [...users, newUser];
  localStorage.setItem(DIRECTORY_USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  return updatedUsers.sort((a, b) => a.name.localeCompare(b.name));
};

export const updateDirectoryUser = (userId: string, updates: Partial<Omit<DirectoryUser, 'id' | 'createdAt'>>): DirectoryUser[] => {
  let users = getDirectoryUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex > -1) {
    const originalUser = users[userIndex];

    // Create the updated user object by merging
    const updatedUser: DirectoryUser = {
      ...originalUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // Special handling: if role is changed, and permissions are not part of the update payload,
    // then update permissions to match the new role.
    if (updates.role && updates.role !== originalUser.role && updates.permissions === undefined) {
      updatedUser.permissions = getPermissionsForRole(updates.role);
    }
    
    users[userIndex] = updatedUser;
    localStorage.setItem(DIRECTORY_USERS_STORAGE_KEY, JSON.stringify(users));
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }
  return users; 
};

export const deleteDirectoryUser = (userId: string): DirectoryUser[] => {
  let users = getDirectoryUsers();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem(DIRECTORY_USERS_STORAGE_KEY, JSON.stringify(users));
  return users.sort((a, b) => a.name.localeCompare(b.name));
};

export const findDirectoryUserByRUT = (rut: string): DirectoryUser | undefined => {
  if (!rut.trim()) return undefined;
  const users = getDirectoryUsers();
  const cleanedSearchRUT = rut.trim().replace(/[^0-9kK]+/g, '').toUpperCase();
  return users.find(u => u.idDocument && u.idDocument.replace(/[^0-9kK]+/g, '').toUpperCase() === cleanedSearchRUT);
};

export const findDirectoryUserByAuthId = (authUserId: string): DirectoryUser | undefined => {
  if (!authUserId.trim()) return undefined;
  const users = getDirectoryUsers();
  return users.find(u => u.authUserId === authUserId);
};

export const findDirectoryUserByVehicleLicensePlate = (licensePlate: string): { user: DirectoryUser, vehicle: DirectoryVehicle } | undefined => {
  if (!licensePlate.trim()) return undefined;
  const users = getDirectoryUsers();
  const cleanedPlate = licensePlate.trim().toUpperCase();
  for (const user of users) {
    if (user.vehicles && user.vehicles.length > 0) {
      const foundVehicle = user.vehicles.find(v => v.licensePlate.toUpperCase() === cleanedPlate);
      if (foundVehicle) {
        return { user, vehicle: foundVehicle };
      }
    }
  }
  return undefined;
};

export const findDirectoryUserByParkingSpot = (parkingSpot: string): { user: DirectoryUser, vehicle: DirectoryVehicle } | undefined => {
  if (!parkingSpot.trim()) return undefined;
  const users = getDirectoryUsers();
  const cleanedSpot = parkingSpot.trim().toUpperCase();
  for (const user of users) {
    if (user.vehicles && user.vehicles.length > 0) {
      const foundVehicle = user.vehicles.find(v => v.parkingSpot?.trim().toUpperCase() === cleanedSpot);
      if (foundVehicle) {
        return { user, vehicle: foundVehicle };
      }
    }
  }
  return undefined;
};
