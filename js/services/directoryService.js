const DIRECTORY_USERS_STORAGE_KEY = 'condominiumDirectoryUsers';

export const getDirectoryUsers = () => {
  const usersJson = localStorage.getItem(DIRECTORY_USERS_STORAGE_KEY);
  if (usersJson) {
    try {
      const users = JSON.parse(usersJson);
      const usersWithAllFields = users.map(user => ({
        ...user,
        authUserId: user.authUserId || undefined,
        roleNotes: user.roleNotes || undefined,
        vehicles: user.vehicles || [],
        tenant: user.tenant === undefined ? null : user.tenant, 
        occupants: user.occupants || [], 
        petsInfo: user.petsInfo || '', 
        unitParkingSpots: user.unitParkingSpots || [], 
      }));
      return usersWithAllFields.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error("Error parsing directory users from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const addDirectoryUser = (user) => {
  const users = getDirectoryUsers();
  const now = new Date().toISOString();
  const newUser = {
    ...user,
    id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
    authUserId: user.authUserId || undefined,
    roleNotes: user.roleNotes || undefined,
    vehicles: user.vehicles || [],
    tenant: user.tenant || null,
    occupants: user.occupants || [],
    petsInfo: user.petsInfo || '',
    unitParkingSpots: user.unitParkingSpots || [],
    createdAt: now,
    updatedAt: now,
  };
  const updatedUsers = [...users, newUser];
  localStorage.setItem(DIRECTORY_USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  return updatedUsers.sort((a, b) => a.name.localeCompare(b.name));
};

export const updateDirectoryUser = (userId, updates) => {
  let users = getDirectoryUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  if (userIndex > -1) {
    users[userIndex] = {
      ...users[userIndex],
      ...updates,
      authUserId: updates.authUserId !== undefined ? updates.authUserId : users[userIndex].authUserId,
      roleNotes: updates.roleNotes !== undefined ? updates.roleNotes : users[userIndex].roleNotes,
      vehicles: updates.vehicles || users[userIndex].vehicles || [],
      tenant: updates.tenant === undefined ? users[userIndex].tenant : updates.tenant,
      occupants: updates.occupants || users[userIndex].occupants || [],
      petsInfo: updates.petsInfo === undefined ? users[userIndex].petsInfo : updates.petsInfo,
      unitParkingSpots: updates.unitParkingSpots || users[userIndex].unitParkingSpots || [],
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(DIRECTORY_USERS_STORAGE_KEY, JSON.stringify(users));
    return users.sort((a, b) => a.name.localeCompare(b.name));
  }
  return users; 
};

export const deleteDirectoryUser = (userId) => {
  let users = getDirectoryUsers();
  users = users.filter(u => u.id !== userId);
  localStorage.setItem(DIRECTORY_USERS_STORAGE_KEY, JSON.stringify(users));
  return users.sort((a, b) => a.name.localeCompare(b.name));
};

export const findDirectoryUserByRUT = (rut) => {
  if (!rut.trim()) return undefined;
  const users = getDirectoryUsers();
  const cleanedSearchRUT = rut.trim().replace(/[^0-9kK]+/g, '').toUpperCase();
  return users.find(u => u.idDocument && u.idDocument.replace(/[^0-9kK]+/g, '').toUpperCase() === cleanedSearchRUT);
};

export const findDirectoryUserByAuthId = (authUserId) => {
  if (!authUserId.trim()) return undefined;
  const users = getDirectoryUsers();
  return users.find(u => u.authUserId === authUserId);
};

export const findDirectoryUserByVehicleLicensePlate = (licensePlate) => {
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

export const findDirectoryUserByParkingSpot = (parkingSpot) => {
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
