import { UserPermissions } from '../types.ts';
import { getAppSettings, saveAppSettings } from './settingsService.ts';

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

export const getRolePermissions = async (): Promise<Record<string, UserPermissions>> => {
  try {
    const settings = await getAppSettings();
    const permissionsJson = (settings as any).rolePermissions;
    if (permissionsJson) {
      const storedPermissions = typeof permissionsJson === 'string' ? JSON.parse(permissionsJson) : permissionsJson;
      return { ...defaultRolePermissions, ...storedPermissions };
    }
  } catch (e) {
    console.error("Error parsing role permissions", e);
  }
  return defaultRolePermissions;
};

export const saveRolePermissions = async (roleName: string, permissions: UserPermissions): Promise<void> => {
  if (!roleName) return;
  try {
    const allPermissions = await getRolePermissions();
    allPermissions[roleName] = permissions;
    const settings = await getAppSettings();
    await saveAppSettings({
      ...settings,
      rolePermissions: JSON.stringify(allPermissions) as any
    });
  } catch (error) {
    console.error("Error saving role permissions:", error);
    throw error;
  }
};

export const getPermissionsForRole = async (roleName: string): Promise<UserPermissions> => {
  const allPermissions = await getRolePermissions();
  return allPermissions[roleName] || {
    authorizePeople: false,
    authorizeVehicles: false,
    sendNotifications: false,
    manageDirectory: false,
    authorizeInvitations: false,
  };
};