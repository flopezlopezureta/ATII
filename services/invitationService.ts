import { Invitation } from '../types.ts';

export const getInvitations = async (): Promise<Invitation[]> => {
  try {
    const res = await fetch('/api/invitations');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error fetching invitations from API:", error);
    return [];
  }
};

export const getInvitationById = async (id: string): Promise<Invitation | undefined> => {
  try {
    const res = await fetch(`/api/invitations/${id}`);
    if (!res.ok) return undefined;
    return await res.json();
  } catch (error) {
    console.error("Error fetching invitation by ID:", error);
    return undefined;
  }
};

export const addInvitation = async (
  invitationData: Omit<Invitation, 'id' | 'createdAt' | 'status'>
): Promise<Invitation> => {
  try {
    const res = await fetch('/api/invitations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invitationData),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error adding invitation to API:", error);
    throw error;
  }
};

export const updateInvitation = async (invitationId: string, updates: Partial<Invitation>): Promise<Invitation[]> => {
  try {
    const res = await fetch(`/api/invitations/${invitationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    // Returns full updated invitations list or we can fetch them
    await res.json();
    return await getInvitations();
  } catch (error) {
    console.error("Error updating invitation in API:", error);
    throw error;
  }
};

export const markInvitationAsUsed = async (invitationId: string, entryId: string): Promise<Invitation[]> => {
  return await updateInvitation(invitationId, {
    status: 'used',
    usedAt: new Date().toISOString(),
    usedByEntryId: entryId,
  });
};
