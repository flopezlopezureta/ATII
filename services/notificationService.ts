import { Notification, NotificationStatus, CondominiumEntry, PersonEntry, VehicleEntry, DirectoryUser } from '../types.ts';
import { getAppSettings } from './settingsService.ts';
import { getInvitationById } from './invitationService.ts';
import { findDirectoryUserByAuthId } from './directoryService.ts';

const NOTIFICATIONS_STORAGE_KEY = 'condominiumNotifications';

export const getNotifications = (): Notification[] => {
  const notificationsJson = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
  if (notificationsJson) {
    try {
      const notifications = JSON.parse(notificationsJson) as Notification[];
      return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error parsing notifications from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const addNotification = (
  notificationData: Omit<Notification, 'id' | 'createdAt' | 'status'>
): Notification => {
  const notifications = getNotifications();
  const newNotification: Notification = {
    ...notificationData,
    id: `NOTIF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: NotificationStatus.PENDING,
  };
  const updatedNotifications = [newNotification, ...notifications];
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(updatedNotifications));
  return newNotification;
};

export const updateNotification = (notificationId: string, updates: Partial<Notification>): Notification[] => {
    const notifications = getNotifications();
    const index = notifications.findIndex(n => n.id === notificationId);
    if (index > -1) {
        notifications[index] = { ...notifications[index], ...updates };
        localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    }
    return getNotifications(); // Return fresh, sorted data
};

export const sendWhatsappNotificationForEntry = (entry: CondominiumEntry): void => {
    const settings = getAppSettings();
    if (!settings.whatsappNotificationsEnabled || !entry.invitationId) {
        return;
    }

    const invitation = getInvitationById(entry.invitationId);
    if (!invitation) {
        return;
    }

    const creatorProfile = findDirectoryUserByAuthId(invitation.createdByUserId);
    if (!creatorProfile || !creatorProfile.phone) {
        return;
    }
    
    const phoneNumber = creatorProfile.phone.replace(/\D/g, '');
    if (!phoneNumber) {
        console.warn(`Could not format phone number for WhatsApp: ${creatorProfile.phone}`);
        return;
    }

    let visitorDetails: string;
    if (entry.type === 'persona') {
        visitorDetails = `la persona "${(entry as PersonEntry).name}"`;
    } else {
        visitorDetails = `el vehículo con patente "${(entry as VehicleEntry).licensePlate}"`;
    }
    
    const message = `Hola ${creatorProfile.name}. Te informamos que ha llegado tu visita: ${visitorDetails}.`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};

export const sendWhatsappAccountApproval = (user: DirectoryUser): void => {
    const settings = getAppSettings();
    if (!settings.whatsappNotificationsEnabled || !user.phone) {
        return;
    }

    const phoneNumber = user.phone.replace(/\D/g, '');
    if (!phoneNumber) {
        console.warn(`Could not format phone number for WhatsApp: ${user.phone}`);
        return;
    }

    const message = `Hola ${user.name}. Tu cuenta en "${settings.condominiumName}" ha sido aprobada. ¡Ya puedes iniciar sesión!`;
    
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};