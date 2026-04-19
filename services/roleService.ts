

import { UserPermissions } from '../types.ts';

const ROLE_PERMISSIONS_STORAGE_KEY = 'condominiumRolePermissions';

// Default permissions for resident roles. By default, they are restrictive.
// The superuser can grant more permissions via the "Gestión de Perfiles" screen.
const defaultRolePermissions: Record<string, UserPermissions> = {
  Propietario: {
    authorizePeople: false,
    authorizeVehicles: false,
    sendNotifications: false,
    manageDirectory: false,
    authorizeInvitations: false,
  },
  Arrendatario: {
    authorizePeople: false,
    authorizeVehicles: false,
    sendNotifications: false,
    manageDirectory: false,
    authorizeInvitations: false,
  },
  Habitante: {
    authorizePeople: false,
    authorizeVehicles: false,
    sendNotifications: false,
    manageDirectory: false,
    authorizeInvitations: false,
  },
  Familiar: {
    authorizePeople: false,
    authorizeVehicles: false,
    sendNotifications: false,
    manageDirectory: false,
    authorizeInvitations: false,
  },
  Comité: {
    authorizePeople: false,
    authorizeVehicles: false,
    sendNotifications: false,
    manageDirectory: false,
    authorizeInvitations: false,
  },
};

export const getRolePermissions = (): Record<string, UserPermissions> => {
  const permissionsJson = localStorage.getItem(ROLE_PERMISSIONS_STORAGE_KEY);
  if (permissionsJson) {
    try {
      const storedPermissions = JSON.parse(permissionsJson);
      // Merge with defaults to ensure all default roles are present
      return { ...defaultRolePermissions, ...storedPermissions };
    } catch (e) {
      console.error("Error parsing role permissions", e);
      return defaultRolePermissions;
    }
  }
  return defaultRolePermissions;
};

export const saveRolePermissions = (roleName: string, permissions: UserPermissions): void => {
  if (!roleName) return;
  const allPermissions = getRolePermissions();
  allPermissions[roleName] = permissions;
  localStorage.setItem(ROLE_PERMISSIONS_STORAGE_KEY, JSON.stringify(allPermissions));
};

export const getPermissionsForRole = (roleName: string): UserPermissions => {
    const allPermissions = getRolePermissions();
    return allPermissions[roleName] || {
        authorizePeople: false,
        authorizeVehicles: false,
        sendNotifications: false,
        manageDirectory: false,
        authorizeInvitations: false,
    };
};