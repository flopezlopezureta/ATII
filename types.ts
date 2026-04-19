
export enum EntryType {
  PERSON = 'persona',
  VEHICLE = 'vehiculo',
}

export enum View {
  REGISTER_VISIT = 'register_visit',
  QUICK_ACCESS = 'quick_access',
  VIEW_ENTRIES = 'view_entries',
  SETTINGS = 'settings',
  USER_DIRECTORY = 'user_directory',
  INVITATIONS = 'invitations',
  NOTIFICATIONS = 'notifications',
  PROFILES = 'profiles',
  VISITOR_AUTHORIZATION = 'visitor_authorization',
  PARKING = 'parking',
}

export interface BaseEntry {
  id: string;
  timestamp: string;
  type: EntryType;
  status?: 'pending' | 'approved' | 'rejected';
}

export interface PersonEntry extends BaseEntry {
  type: EntryType.PERSON;
  name: string;
  idDocument: string;
  apartment?: string;
  authorizedBy?: string; 
  invitationId?: string;
}

export interface VehicleEntry extends BaseEntry {
  type: EntryType.VEHICLE;
  licensePlate: string;
  driverName?: string;
  parkingSpot?: string;
  authorizedBy?: string;
  invitationId?: string;
}

export type CondominiumEntry = PersonEntry | VehicleEntry;

export interface User { 
  id: string;
  username: string;
  passwordHash: string; 
  email: string;
  isApprovedByAdmin: boolean;
  passwordResetToken?: string; 
  passwordResetTokenExpires?: number;
}

export interface SessionUser {
  id: string;
  username: string;
  isApprovedByAdmin: boolean; 
  role?: string; 
}

export enum AuthView {
  LOGIN = 'login',
  REGISTER = 'register',
  FORGOT_PASSWORD = 'forgot_password',
  RESET_PASSWORD = 'reset_password',
}

export interface AppSettings {
  condominiumName: string;
  senderEmail?: string; 
  recipientEmail: string;
  sendIntervalHours: number;
  lastSentTimestamp?: number; 
  conciergeModeEnabled?: boolean;
  totalParkingSpots?: number;
  whatsappNotificationsEnabled?: boolean;
}

export interface DirectoryVehicle {
  id: string; 
  licensePlate: string;
  parkingSpot?: string;
  notes?: string;
}

export interface TenantDetails {
  name: string;
  idDocument?: string;
  phone?: string;
  email?: string;
}

export interface OccupantDetails {
  id: string; 
  name: string;
  relationship?: string; 
  idDocument?: string; 
}

export interface UserPermissions {
  authorizePeople: boolean;
  authorizeVehicles: boolean;
  sendNotifications: boolean;
  manageDirectory: boolean;
  authorizeInvitations: boolean;
}

export interface DirectoryUser {
  id: string;
  authUserId?: string; 
  name: string; 
  idDocument?: string; 
  apartment?: string;
  phone?: string;
  email?: string; 
  role: string; 
  roleNotes?: string;
  notes?: string; 
  vehicles: DirectoryVehicle[]; 
  tenant?: TenantDetails | null; 
  occupants: OccupantDetails[]; 
  petsInfo?: string; 
  unitParkingSpots?: string[]; 
  permissions: UserPermissions; 
  workShift?: string; 
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string; 
  createdByUserId: string;
  createdByUserName: string;
  createdAt: string;
  validFrom: string;
  validUntil: string;
  type: 'person' | 'vehicle';
  status: 'active' | 'used' | 'expired';
  guestName?: string; 
  guestIdDocument?: string; 
  licensePlate?: string; 
  apartment: string; 
  notes?: string; 
  usedAt?: string;
  usedByEntryId?: string;
  // Préstamo de estacionamiento
  isParkingLoan?: boolean;
  loanedByUserId?: string;
  loanedByUserName?: string;
  loanedSpot?: string;
}

export enum ParkingLoanStatus {
  OPEN_REQUEST = 'open_request', // Petición de un vecino a la comunidad
  PENDING = 'pending', // Alguien prestó el sitio, vecino debe completar datos
  COMPLETED = 'completed', // Datos completados, invitación generada
  CANCELLED = 'cancelled',
}

export interface ParkingLoanRequest {
  id: string;
  lenderId?: string; // Propietario del espacio (opcional si es solicitud abierta)
  lenderName?: string;
  lenderApt?: string;
  borrowerId: string; // Vecino que recibe o solicita el préstamo
  borrowerName: string;
  borrowerApt: string;
  spot?: string; // Opcional hasta que sea asignado
  status: ParkingLoanStatus;
  createdAt: string;
  invitationId?: string; 
  visitorName?: string;
  visitorPlate?: string;
}

export enum NotificationType {
  PACKAGE = 'package',
  FOOD = 'food',
}

export enum NotificationStatus {
  PENDING = 'pending', 
  ACKNOWLEDGED = 'acknowledged', 
  DELIVERED = 'delivered', 
}

export interface Notification {
  id: string;
  recipientDirUserId: string; 
  recipientName: string;
  recipientApt: string;
  type: NotificationType;
  notes?: string;
  createdAt: string;
  createdByUsername: string; 
  status: NotificationStatus;
  acknowledgedAt?: string;
  deliveredAt?: string;
}
