import { Invitation } from '../types.ts';

const INVITATIONS_STORAGE_KEY = 'condominiumInvitations';

export const getInvitations = (): Invitation[] => {
  const invitesJson = localStorage.getItem(INVITATIONS_STORAGE_KEY);
  if (invitesJson) {
    try {
      const invites = JSON.parse(invitesJson) as Invitation[];
      return invites.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (error) {
      console.error("Error parsing invitations from localStorage:", error);
      return [];
    }
  }
  return [];
};

export const getInvitationById = (id: string): Invitation | undefined => {
  const invitations = getInvitations();
  return invitations.find(inv => inv.id === id);
};

export const addInvitation = (
  invitationData: Omit<Invitation, 'id' | 'createdAt' | 'status'>
): Invitation => {
  const invitations = getInvitations();
  const newInvitation: Invitation = {
    ...invitationData,
    id: `INV-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  const updatedInvitations = [newInvitation, ...invitations];
  localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(updatedInvitations));
  return newInvitation;
};

export const updateInvitation = (invitationId: string, updates: Partial<Invitation>): Invitation[] => {
    const invitations = getInvitations();
    const index = invitations.findIndex(inv => inv.id === invitationId);
    if (index > -1) {
        invitations[index] = { ...invitations[index], ...updates };
        localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invitations));
    }
    return getInvitations(); // Return fresh, sorted data
};

export const markInvitationAsUsed = (invitationId: string, entryId: string): Invitation[] => {
    const invitations = getInvitations();
    const index = invitations.findIndex(inv => inv.id === invitationId);
    if (index > -1) {
        invitations[index].status = 'used';
        invitations[index].usedAt = new Date().toISOString();
        invitations[index].usedByEntryId = entryId;
        localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invitations));
    }
    return getInvitations(); // Return fresh, sorted data
};
