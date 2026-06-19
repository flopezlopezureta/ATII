import { Notification, CondominiumEntry, PersonEntry, VehicleEntry, DirectoryUser } from '../types.ts';
import { getAppSettings } from './settingsService.ts';
import { getInvitationById } from './invitationService.ts';
import { findDirectoryUserByAuthId } from './directoryService.ts';

export const getNotifications = async (): Promise<Notification[]> => {
  try {
    const res = await fetch('/api/notifications');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error fetching notifications from API:", error);
    return [];
  }
};

export const addNotification = async (
  notificationData: Omit<Notification, 'id' | 'createdAt' | 'status'>
): Promise<Notification> => {
  try {
    const res = await fetch('/api/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notificationData),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error adding notification to API:", error);
    throw error;
  }
};

export const updateNotification = async (notificationId: string, updates: Partial<Notification>): Promise<Notification[]> => {
  try {
    const res = await fetch(`/api/notifications/${notificationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error updating notification in API:", error);
    throw error;
  }
};

export const sendWhatsappNotificationForEntry = async (entry: CondominiumEntry): Promise<void> => {
  const settings = await getAppSettings();
  if (!settings.whatsappNotificationsEnabled || !entry.invitationId) {
    return;
  }

  const invitation = await getInvitationById(entry.invitationId);
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

export const sendWhatsappAccountApproval = async (user: DirectoryUser): Promise<void> => {
  const settings = await getAppSettings();
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