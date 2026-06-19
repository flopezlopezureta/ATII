import { ParkingLoanRequest, ParkingLoanStatus, Invitation } from '../types.ts';
import { addInvitation } from './invitationService.ts';

export const getParkingLoans = async (): Promise<ParkingLoanRequest[]> => {
  try {
    const res = await fetch('/api/parking/loans');
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error fetching parking loans from API:", error);
    return [];
  }
};

export const isSpotCurrentlyLoaned = async (spot: string): Promise<boolean> => {
  const loans = await getParkingLoans();
  return loans.some(l => 
    l.spot === spot && 
    (l.status === ParkingLoanStatus.PENDING || l.status === ParkingLoanStatus.COMPLETED)
  );
};

export const createParkingLoanRequest = async (
  data: Omit<ParkingLoanRequest, 'id' | 'status' | 'createdAt'>
): Promise<ParkingLoanRequest | { error: string }> => {
  if (data.spot && await isSpotCurrentlyLoaned(data.spot)) {
    return { error: `El estacionamiento ${data.spot} ya está prestado o tiene una solicitud en curso.` };
  }

  try {
    const res = await fetch('/api/parking/loans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...data, status: ParkingLoanStatus.PENDING }),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error creating parking loan:", error);
    throw error;
  }
};

export const createPublicBorrowRequest = async (borrowerData: { id: string; name: string; apt: string }): Promise<ParkingLoanRequest> => {
  try {
    const res = await fetch('/api/parking/loans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        borrowerId: borrowerData.id,
        borrowerName: borrowerData.name,
        borrowerApt: borrowerData.apt,
        status: ParkingLoanStatus.OPEN_REQUEST,
      }),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return await res.json();
  } catch (error) {
    console.error("Error creating public borrow request:", error);
    throw error;
  }
};

export const fulfillPublicRequest = async (
  requestId: string,
  lenderData: { id: string; name: string; apt: string; spot: string }
): Promise<{ success: boolean; message: string }> => {
  if (await isSpotCurrentlyLoaned(lenderData.spot)) {
    return { success: false, message: `No puedes prestar el ${lenderData.spot} porque ya está comprometido.` };
  }

  try {
    const res = await fetch(`/api/parking/loans/${requestId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        lenderId: lenderData.id,
        lenderName: lenderData.name,
        lenderApt: lenderData.apt,
        spot: lenderData.spot,
        status: ParkingLoanStatus.PENDING,
      }),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return { success: true, message: "¡Estacionamiento prestado con éxito!" };
  } catch (error) {
    console.error("Error fulfilling public request:", error);
    return { success: false, message: "Error al prestar el estacionamiento." };
  }
};

export const completeParkingLoan = async (
  loanId: string, 
  visitorData: { name: string; plate: string; rut: string; validUntil: string }
): Promise<Invitation | null> => {
  try {
    // We need to fetch the specific loan first
    const loans = await getParkingLoans();
    const loan = loans.find(l => l.id === loanId);
    if (!loan || !loan.spot || !loan.lenderId || !loan.lenderName) return null;

    const newInvitation = await addInvitation({
      createdByUserId: loan.borrowerId,
      createdByUserName: loan.borrowerName,
      validFrom: new Date().toISOString(),
      validUntil: visitorData.validUntil,
      type: 'vehicle',
      apartment: loan.borrowerApt,
      licensePlate: visitorData.plate.toUpperCase(),
      guestName: visitorData.name,
      guestIdDocument: visitorData.rut,
      notes: `Estac. ${loan.spot} prestado por ${loan.lenderName} (${loan.lenderApt})`,
      isParkingLoan: true,
      loanedByUserId: loan.lenderId,
      loanedByUserName: loan.lenderName,
      loanedSpot: loan.spot,
    });

    const res = await fetch(`/api/parking/loans/${loanId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: ParkingLoanStatus.COMPLETED,
        invitationId: newInvitation.id,
        visitorName: visitorData.name,
        visitorPlate: visitorData.plate,
      }),
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
    return newInvitation;
  } catch (error) {
    console.error("Error completing parking loan:", error);
    return null;
  }
};

export const cancelParkingLoan = async (loanId: string): Promise<void> => {
  try {
    const res = await fetch(`/api/parking/loans/${loanId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Error status: ' + res.status);
  } catch (error) {
    console.error("Error cancelling parking loan:", error);
    throw error;
  }
};
