import React, { useState } from 'react';
import { CondominiumEntry, EntryType, AppSettings, SessionUser, DirectoryUser } from '../types.ts';
import EntryItem from './EntryItem.tsx';
import EntryDetailModal from './EntryDetailModal.tsx';
import ListBulletIcon from './icons/ListBulletIcon.tsx';
import { updateEntry } from '../services/storageService.ts';

interface EntryListProps {
  entries: CondominiumEntry[];
  currentUser: SessionUser | null;
  appSettings: AppSettings;
  onEntriesUpdated: () => void;
  userDirectoryProfile: (DirectoryUser & { isSuperuser?: boolean }) | null;
}

enum FilterType {
  ALL = 'all',
  PERSON = 'person',
  VEHICLE = 'vehicle',
  PENDING = 'pending'
}

const EntryListHeader: React.FC = () => (
  <div className="flex items-center py-2 px-2 border-b-2 border-slate-300 bg-slate-100 text-slate-600 text-xs font-semibold sticky top-0 z-10">
    <div className="w-7 flex-shrink-0 mr-2"></div> {/* Icon placeholder */}
    <div className="w-20 flex-shrink-0">Tipo/Estado</div>
    <div className="flex-1 min-w-[120px] px-2">Principal</div> {/* Name / License Plate */}
    <div className="flex-1 min-w-[100px] px-2">Detalle 1</div> {/* ID / Driver */}
    <div className="flex-1 min-w-[100px] px-2">Apto / Estac. Asignado</div> {/* Changed from "Detalle 2" */}
    <div className="flex-1 min-w-[180px] px-2">Autorizado Por</div> {/* Authorized By - Increased min-width */}
    <div className="w-36 flex-shrink-0 text-right">Fecha y Hora</div>
  </div>
);

const EntryList: React.FC<EntryListProps> = ({ entries, currentUser, appSettings, onEntriesUpdated, userDirectoryProfile }) => {
  const [filter, setFilter] = useState<FilterType>(FilterType.ALL);
  const [authorizedBySearchTerm, setAuthorizedBySearchTerm] = useState('');
  const [selectedEntryForDetail, setSelectedEntryForDetail] = useState<CondominiumEntry | null>(null);

  const handleViewEntryDetails = (entry: CondominiumEntry) => {
    setSelectedEntryForDetail(entry);
  };

  const handleCloseDetailModal = () => {
    setSelectedEntryForDetail(null);
  };
  
  const handleUpdateEntryStatus = (entryId: string, status: 'approved' | 'rejected') => {
    updateEntry(entryId, { status });
    onEntriesUpdated();
    handleCloseDetailModal();
  };

  const canApprove = userDirectoryProfile?.permissions?.authorizePeople || userDirectoryProfile?.permissions?.authorizeVehicles;

  const filteredEntries = entries.filter(entry => {
    const searchTermLower = authorizedBySearchTerm.toLowerCase();
    const authMatch = authorizedBySearchTerm.trim() === '' || (entry.authorizedBy?.toLowerCase().includes(searchTermLower) ?? false);
    if (!authMatch) return false;

    if (filter === FilterType.PENDING) {
        return entry.status === 'pending';
    }

    // Default filters show approved entries
    const isApproved = entry.status === 'approved' || entry.status === undefined;
    if (!isApproved) return false;

    if (filter === FilterType.ALL) return true;
    if (filter === FilterType.PERSON) return entry.type === EntryType.PERSON;
    if (filter === FilterType.VEHICLE) return entry.type === EntryType.VEHICLE;
    
    return false;
  });

  const approvedEntries = entries.filter(e => e.status === 'approved' || e.status === undefined);
  const pendingEntries = entries.filter(e => e.status === 'pending');
  
  return (
    <>
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-2xl w-full max-w-5xl mx-auto"> 
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
          <div className="flex items-center space-x-3 mb-3 sm:mb-0">
            <ListBulletIcon className="w-7 h-7 text-slate-700 flex-shrink-0" />
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-800">Registros de Ingreso</h2>
          </div>
        </div>

        <div className="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 items-center">
          <div className="flex gap-2">
            <button 
              onClick={() => setFilter(FilterType.ALL)} 
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${filter === FilterType.ALL ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Aprobados ({approvedEntries.length})
            </button>
            <button 
              onClick={() => setFilter(FilterType.PERSON)} 
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${filter === FilterType.PERSON ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Personas ({approvedEntries.filter(e => e.type === EntryType.PERSON).length})
            </button>
            <button 
              onClick={() => setFilter(FilterType.VEHICLE)} 
              className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${filter === FilterType.VEHICLE ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
            >
              Vehículos ({approvedEntries.filter(e => e.type === EntryType.VEHICLE).length})
            </button>
            {appSettings.conciergeModeEnabled && canApprove && (
               <button 
                onClick={() => setFilter(FilterType.PENDING)} 
                className={`px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors relative ${filter === FilterType.PENDING ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
              >
                Pendientes
                {pendingEntries.length > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-white text-xs">
                        {pendingEntries.length}
                    </span>
                )}
              </button>
            )}
          </div>
          <input
            type="text"
            placeholder="Buscar por Autorización..."
            value={authorizedBySearchTerm}
            onChange={(e) => setAuthorizedBySearchTerm(e.target.value)}
            className="mt-2 sm:mt-0 sm:ml-auto px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-xs sm:text-sm w-full sm:w-auto"
            aria-label="Buscar por quién autorizó"
          />
        </div>
        
        <div className="overflow-x-auto">
          <EntryListHeader />
          {filteredEntries.length === 0 ? (
            <p className="text-center text-slate-500 py-10 text-lg" role="status">
              {entries.length === 0 ? "No hay registros aún." : "No hay registros que coincidan con los filtros aplicados."}
            </p>
          ) : (
            <ul className="min-w-[700px]">
              {filteredEntries.map((entry) => (
                <EntryItem 
                    key={entry.id} 
                    entry={entry} 
                    onViewDetails={handleViewEntryDetails}
                    isSelected={selectedEntryForDetail?.id === entry.id}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
      <EntryDetailModal 
        entry={selectedEntryForDetail} 
        onClose={handleCloseDetailModal}
        userProfile={userDirectoryProfile}
        onUpdateStatus={handleUpdateEntryStatus}
      />
    </>
  );
};

export default EntryList;