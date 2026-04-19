
import { ParkingLoanRequest, ParkingLoanStatus, Invitation } from '../types.ts';
import { addInvitation } from './invitationService.ts';

const LOANS_STORAGE_KEY = 'condominiumParkingLoans';

export const getParkingLoans = (): ParkingLoanRequest[] => {
  const loansJson = localStorage.getItem(LOANS_STORAGE_KEY);
  return loansJson ? JSON.parse(loansJson) : [];
};

export const saveLoans = (loans: ParkingLoanRequest[]) => {
  localStorage.setItem(LOANS_STORAGE_KEY, JSON.stringify(loans));
};

/**
 * Verifica si un estacionamiento específico ya está comprometido en un préstamo activo.
 */
export const isSpotCurrentlyLoaned = (spot: string): boolean => {
    const loans = getParkingLoans();
    return loans.some(l => 
        l.spot === spot && 
        (l.status === ParkingLoanStatus.PENDING || l.status === ParkingLoanStatus.COMPLETED)
    );
};

export const createParkingLoanRequest = (data: Omit<ParkingLoanRequest, 'id' | 'status' | 'createdAt'>): ParkingLoanRequest | { error: string } => {
  if (data.spot && isSpotCurrentlyLoaned(data.spot)) {
      return { error: `El estacionamiento ${data.spot} ya está prestado o tiene una solicitud en curso.` };
  }

  const loans = getParkingLoans();
  const newLoan: ParkingLoanRequest = {
    ...data,
    id: `LOAN-${Date.now()}`,
    status: ParkingLoanStatus.PENDING,
    createdAt: new Date().toISOString(),
  };
  saveLoans([newLoan, ...loans]);
  return newLoan;
};

/**
 * Permite a un vecino solicitar un estacionamiento a la comunidad.
 */
export const createPublicBorrowRequest = (borrowerData: { id: string; name: string; apt: string }): ParkingLoanRequest => {
    const loans = getParkingLoans();
    const newRequest: ParkingLoanRequest = {
        id: `REQ-${Date.now()}`,
        borrowerId: borrowerData.id,
        borrowerName: borrowerData.name,
        borrowerApt: borrowerData.apt,
        status: ParkingLoanStatus.OPEN_REQUEST,
        createdAt: new Date().toISOString(),
    };
    saveLoans([newRequest, ...loans]);
    return newRequest;
};

/**
 * Permite a un propietario cumplir una solicitud abierta con su estacionamiento.
 */
export const fulfillPublicRequest = (requestId: string, lenderData: { id: string; name: string; apt: string; spot: string }): { success: boolean; message: string } => {
    if (isSpotCurrentlyLoaned(lenderData.spot)) {
        return { success: false, message: `No puedes prestar el ${lenderData.spot} porque ya está comprometido.` };
    }

    const loans = getParkingLoans();
    const index = loans.findIndex(l => l.id === requestId);
    if (index === -1) return { success: false, message: "La solicitud ya no está disponible." };

    loans[index] = {
        ...loans[index],
        lenderId: lenderData.id,
        lenderName: lenderData.name,
        lenderApt: lenderData.apt,
        spot: lenderData.spot,
        status: ParkingLoanStatus.PENDING,
    };

    saveLoans(loans);
    return { success: true, message: "¡Estacionamiento prestado con éxito!" };
};

export const completeParkingLoan = (
    loanId: string, 
    visitorData: { name: string; plate: string; rut: string; validUntil: string }
): Invitation | null => {
  const loans = getParkingLoans();
  const loanIndex = loans.findIndex(l => l.id === loanId);
  
  if (loanIndex === -1) return null;
  const loan = loans[loanIndex];

  if (!loan.spot || !loan.lenderId || !loan.lenderName) return null;

  const newInvitation = addInvitation({
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

  loans[loanIndex] = {
    ...loan,
    status: ParkingLoanStatus.COMPLETED,
    invitationId: newInvitation.id,
    visitorName: visitorData.name,
    visitorPlate: visitorData.plate,
  };
  
  saveLoans(loans);
  return newInvitation;
};

export const cancelParkingLoan = (loanId: string) => {
    const loans = getParkingLoans();
    const updated = loans.filter(l => l.id !== loanId);
    saveLoans(updated);
};
