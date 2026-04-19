import React from 'react';
import { CondominiumEntry, EntryType, PersonEntry, VehicleEntry, SessionUser, DirectoryUser } from '../types.ts';
import UserIcon from './icons/UserIcon.tsx';
import TruckIcon from './icons/TruckIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';

interface EntryDetailModalProps {
  entry: CondominiumEntry | null;
  onClose: () => void;
  userProfile: (DirectoryUser & { isSuperuser?: boolean }) | null;
  onUpdateStatus?: (entryId: string, status: 'approved' | 'rejected') => void;
}

const EntryDetailModal: React.FC<EntryDetailModalProps> = ({ entry, onClose, userProfile, onUpdateStatus }) => {
  if (!entry) return null;

  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-CL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  const isPersonEntry = (entry: CondominiumEntry): entry is PersonEntry => entry.type === EntryType.PERSON;
  
  const Icon = isPersonEntry(entry) ? UserIcon : TruckIcon;
  const iconColor = isPersonEntry(entry) ? 'text-sky-600' : 'text-teal-600';
  const typeText = isPersonEntry(entry) ? 'Persona' : 'Vehículo';

  const canApproveThisEntry = userProfile && (
    (isPersonEntry(entry) && userProfile.permissions.authorizePeople) ||
    (!isPersonEntry(entry) && userProfile.permissions.authorizeVehicles)
  );


  interface DetailItemProps {
    label: string;
    value?: string | number | null | React.ReactNode;
  }

  const DetailItem: React.FC<DetailItemProps> = ({ label, value }) => (
    <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}:</dt>
      <dd className="mt-1 text-sm text-slate-900 sm:mt-0 sm:col-span-2 break-words">
        {value || <span className="italic text-slate-400">No especificado</span>}
      </dd>
    </div>
  );

  const StatusDisplay = () => {
    if (entry.status === 'pending') {
        return <span className="flex items-center text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full text-xs font-medium"><ClockIcon className="w-3 h-3 mr-1"/>Pendiente de Aprobación</span>
    }
     if (entry.status === 'rejected') {
        return <span className="text-red-600 font-medium">Rechazado</span>
    }
    return <span className="text-green-600 font-medium">Aprobado</span>
  }

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 transition-opacity duration-300 ease-in-out"
        aria-modal="true"
        role="dialog"
        aria-labelledby="entry-detail-title"
        onClick={onClose} // Close on overlay click
    >
      <div 
        className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-lg transform transition-all duration-300 ease-in-out scale-100 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        <div className="flex items-start justify-between mb-4 border-b pb-3 border-slate-200">
          <div className="flex items-center">
            <Icon className={`w-8 h-8 mr-3 ${iconColor}`} />
            <div>
                <h3 id="entry-detail-title" className="text-xl font-semibold text-slate-800">
                    Detalle del Registro
                </h3>
                <p className={`text-sm ${isPersonEntry(entry) ? 'text-sky-700' : 'text-teal-700'}`}>{typeText}</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 text-3xl leading-none transition-colors"
            aria-label="Cerrar modal"
          >
            &times;
          </button>
        </div>

        <dl className="divide-y divide-slate-200">
          {entry.status && <DetailItem label="Estado" value={<StatusDisplay />} />}
          <DetailItem label="ID del Registro" value={entry.id} />
          <DetailItem label="Fecha y Hora" value={formatTimestamp(entry.timestamp)} />

          {isPersonEntry(entry) && (
            <>
              <DetailItem label="Nombre Completo" value={entry.name} />
              <DetailItem label="Documento ID (RUT)" value={entry.idDocument} />
              <DetailItem label="Apartamento/Unidad" value={entry.apartment} />
            </>
          )}

          {!isPersonEntry(entry) && (
            <>
              <DetailItem label="Placa Patente" value={entry.licensePlate} />
              <DetailItem label="Nombre del Conductor" value={entry.driverName} />
              <DetailItem label="Estacionamiento Asignado" value={entry.parkingSpot} />
            </>
          )}
          
          <DetailItem label="Autorizado Por" value={entry.authorizedBy} />
          
          {(isPersonEntry(entry) || !isPersonEntry(entry)) && entry.invitationId && (
            <DetailItem label="ID de Invitación" value={entry.invitationId} />
          )}
        </dl>
        
        <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end items-center space-x-3">
            {canApproveThisEntry && onUpdateStatus && entry.status === 'pending' && (
                <div className="flex-grow flex space-x-2">
                     <button
                        type="button"
                        onClick={() => onUpdateStatus(entry.id, 'approved')}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg shadow-sm"
                    >
                        Aprobar
                    </button>
                     <button
                        type="button"
                        onClick={() => onUpdateStatus(entry.id, 'rejected')}
                        className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm"
                    >
                        Rechazar
                    </button>
                </div>
            )}
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
                Cerrar
            </button>
        </div>
      </div>
    </div>
  );
};

export default EntryDetailModal;