
import React from 'react';
import { CondominiumEntry, EntryType, PersonEntry, VehicleEntry } from '../types.ts';
import UserIcon from './icons/UserIcon.tsx';
import TruckIcon from './icons/TruckIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';


interface EntryItemProps {
  entry: CondominiumEntry;
  onViewDetails: (entry: CondominiumEntry) => void;
  isSelected: boolean;
}

const EntryItem: React.FC<EntryItemProps> = ({ entry, onViewDetails, isSelected }) => {
  const formatTimestamp = (isoString: string) => {
    return new Date(isoString).toLocaleString('es-CL', {
      year: '2-digit',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const isPersonEntry = (entry: CondominiumEntry): entry is PersonEntry => {
    return entry.type === EntryType.PERSON;
  };

  const isVehicleEntry = (entry: CondominiumEntry): entry is VehicleEntry => {
    return entry.type === EntryType.VEHICLE;
  };

  const Icon = isPersonEntry(entry) ? UserIcon : TruckIcon;
  const iconColor = isPersonEntry(entry) ? 'text-sky-600' : 'text-teal-600';
  const typeText = isPersonEntry(entry) ? 'Persona' : 'Vehículo';
  const typeTextColor = isPersonEntry(entry) ? 'text-sky-700 font-medium' : 'text-teal-700 font-medium';

// FIX: Cannot find namespace 'JSX'. Changed JSX.Element to React.ReactNode
  let authorizedByDisplay: string | React.ReactNode = <span className="text-slate-400">-</span>;
  if (entry.authorizedBy && entry.authorizedBy.trim() !== '') {
    authorizedByDisplay = entry.authorizedBy;
  }

  const baseClasses = "flex items-start sm:items-center py-3 px-2 border-b border-slate-200 transition-colors duration-150 text-sm cursor-pointer";
  const selectedClasses = isSelected ? "bg-indigo-50 hover:bg-indigo-100" : "hover:bg-slate-50";
  const pendingClasses = entry.status === 'pending' ? 'bg-yellow-50 hover:bg-yellow-100' : '';


  return (
    <li 
        className={`${baseClasses} ${selectedClasses} ${pendingClasses}`}
        onClick={() => onViewDetails(entry)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onViewDetails(entry);}}
        aria-label={`Ver detalles del registro de ${isPersonEntry(entry) ? entry.name : entry.licensePlate}`}
        title="Clic para ver detalles"
    >
      <div className="w-7 flex-shrink-0 mr-2 flex justify-center pt-0.5 sm:pt-0">
        <Icon className={`w-5 h-5 ${iconColor}`} />
      </div>
      <div className={`w-20 flex-shrink-0 truncate ${typeTextColor}`}>
        {entry.status === 'pending' 
            ? <span className="flex items-center text-amber-600" title="Pendiente de Aprobación"><ClockIcon className="w-4 h-4 mr-1"/>Pend...</span> 
            : typeText
        }
      </div>
      <div className="flex-1 min-w-[120px] px-2 truncate font-semibold text-slate-700">
        {isPersonEntry(entry) ? entry.name : entry.licensePlate}
      </div>
      <div className="flex-1 min-w-[100px] px-2 truncate text-slate-600">
        {isPersonEntry(entry) ? entry.idDocument : (entry.driverName || <span className="text-slate-400">N/A</span>)}
      </div>
      <div className="flex-1 min-w-[100px] px-2 truncate text-slate-500">
        {isPersonEntry(entry) ? (entry.apartment || <span className="text-slate-400">N/A</span>) : (entry.parkingSpot || <span className="text-slate-400">N/A</span>)}
      </div>
      <div 
        className="flex-1 min-w-[180px] px-2 text-slate-500 break-words" 
        title={entry.authorizedBy || "No especificado"} 
      >
        {authorizedByDisplay}
      </div>
      <div className="w-36 flex-shrink-0 text-right text-xs text-slate-500 pt-0.5 sm:pt-0">
        {formatTimestamp(entry.timestamp)}
      </div>
    </li>
  );
};

export default EntryItem;