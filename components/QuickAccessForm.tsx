

import React, { useState, useEffect, useCallback } from 'react';
import { DirectoryUser, DirectoryVehicle, PersonEntry, VehicleEntry, EntryType, CondominiumEntry } from '../types.ts';
import { getDirectoryUsers } from '../services/directoryService.ts';
import { addEntry } from '../services/storageService.ts';
import { getInvitations, getInvitationById, markInvitationAsUsed } from '../services/invitationService.ts';
import { cleanRUT } from '../services/validationService.ts';
import BoltIcon from './icons/BoltIcon.tsx';
import SearchIcon from './icons/SearchIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';
import TruckIcon from './icons/TruckIcon.tsx';
import TicketIcon from './icons/TicketIcon.tsx';

interface QuickAccessFormProps {
  onEntryAdded: (newEntries: CondominiumEntry[]) => void;
}

type SearchResult = {
  user: DirectoryUser;
  matchType: 'Nombre' | 'RUT' | 'Placa Patente' | 'Invitación';
  matchValue: string;
  vehicle?: DirectoryVehicle; // Included if the match was on a vehicle
};

const QuickAccessForm: React.FC<QuickAccessFormProps> = ({ onEntryAdded }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const performSearch = useCallback((term: string) => {
    if (term.trim().length < 3) {
      setResults([]);
      return;
    }

    setLoading(true);
    const directoryUsers = getDirectoryUsers();
    const lowerTerm = term.toLowerCase();
    const upperTerm = term.toUpperCase();
    const cleanedRutTerm = cleanRUT(term);
    const searchResults: SearchResult[] = [];
    const now = new Date();

    // Search Invitations first
    const allInvitations = getInvitations();
    const matchedInvitation = allInvitations.find(inv => 
        inv.id.toUpperCase() === upperTerm && 
        inv.status === 'active' && 
        now >= new Date(inv.validFrom) && 
        now <= new Date(inv.validUntil)
    );
    if (matchedInvitation) {
        const creatorUser = directoryUsers.find(u => u.id === matchedInvitation.createdByUserId);
        if (creatorUser) {
            searchResults.push({
                user: creatorUser,
                matchType: 'Invitación',
                matchValue: matchedInvitation.id,
                vehicle: matchedInvitation.type === 'vehicle' ? { id: matchedInvitation.id, licensePlate: matchedInvitation.licensePlate || 'N/A' } : undefined
            });
        }
    }


    for (const user of directoryUsers) {
      // Check user's name
      if (user.name.toLowerCase().includes(lowerTerm)) {
        searchResults.push({ user, matchType: 'Nombre', matchValue: user.name });
      }
      // Check user's RUT
      if (user.idDocument && cleanRUT(user.idDocument).includes(cleanedRutTerm)) {
        searchResults.push({ user, matchType: 'RUT', matchValue: user.idDocument });
      }
      // Check tenant's name
      if (user.tenant && user.tenant.name.toLowerCase().includes(lowerTerm)) {
        searchResults.push({ user, matchType: 'Nombre', matchValue: `${user.tenant.name} (Arrendatario)` });
      }
      // Check tenant's RUT
      if (user.tenant?.idDocument && cleanRUT(user.tenant.idDocument).includes(cleanedRutTerm)) {
        searchResults.push({ user, matchType: 'RUT', matchValue: `${user.tenant.idDocument} (Arrendatario)` });
      }
      // Check vehicles
      user.vehicles.forEach(vehicle => {
        if (vehicle.licensePlate.toLowerCase().includes(lowerTerm)) {
          searchResults.push({ user, vehicle, matchType: 'Placa Patente', matchValue: vehicle.licensePlate });
        }
      });
    }

    setResults(searchResults.slice(0, 10)); // Limit results to avoid long lists
    setLoading(false);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(searchTerm);
    }, 300); // Debounce search

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, performSearch]);

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };
  
  const handleRegisterEntry = (result: SearchResult) => {
    let newEntry: CondominiumEntry;
    const now = new Date();

    if (result.matchType === 'Invitación') {
        const invitation = getInvitationById(result.matchValue);
        if (!invitation || invitation.status !== 'active' || now < new Date(invitation.validFrom) || now > new Date(invitation.validUntil)) {
            showFeedback('error', 'La invitación ya no es válida o no fue encontrada.');
            return;
        }

        if (invitation.type === 'vehicle') {
             const vehicleEntry: Omit<VehicleEntry, 'id' | 'timestamp'> = {
                type: EntryType.VEHICLE,
                licensePlate: invitation.licensePlate || 'N/A',
                driverName: invitation.guestName || result.user.name,
                authorizedBy: `Invitación de ${result.user.name}`,
                invitationId: invitation.id,
            };
            newEntry = vehicleEntry as VehicleEntry;
        } else { // person
             const personEntry: Omit<PersonEntry, 'id' | 'timestamp'> = {
                type: EntryType.PERSON,
                name: invitation.guestName || 'Invitado',
                idDocument: invitation.guestIdDocument || 'N/A',
                apartment: invitation.apartment,
                authorizedBy: `Invitación de ${result.user.name}`,
                invitationId: invitation.id,
            };
            newEntry = personEntry as PersonEntry;
        }

        const updatedEntries = addEntry(newEntry);
        const newEntryRecord = updatedEntries.find(e => {
            if (e.type === EntryType.PERSON) return (e as PersonEntry).invitationId === invitation.id;
            if (e.type === EntryType.VEHICLE) return (e as VehicleEntry).invitationId === invitation.id;
            return false;
        });

        if (newEntryRecord) {
            markInvitationAsUsed(invitation.id, newEntryRecord.id);
        }
        onEntryAdded(updatedEntries);
        showFeedback('success', `Ingreso con invitación ${invitation.id} registrado.`);
    
    } else if (result.vehicle) {
      // It's a vehicle entry
      const vehicleEntry: Omit<VehicleEntry, 'id' | 'timestamp'> = {
        type: EntryType.VEHICLE,
        licensePlate: result.vehicle.licensePlate,
        driverName: result.user.name,
        parkingSpot: result.vehicle.parkingSpot,
        authorizedBy: `Re-ingreso: ${result.user.role} - ${result.user.name}`
      };
      newEntry = vehicleEntry as VehicleEntry;
      const updatedEntries = addEntry(newEntry);
      onEntryAdded(updatedEntries);
      showFeedback('success', `Ingreso de ${result.vehicle.licensePlate} registrado exitosamente.`);
    } else {
      // It's a person entry
      const personEntry: Omit<PersonEntry, 'id' | 'timestamp'> = {
        type: EntryType.PERSON,
        name: result.user.name,
        idDocument: result.user.idDocument || 'N/A',
        apartment: result.user.apartment,
        authorizedBy: `Re-ingreso: ${result.user.role} - ${result.user.name}`
      };
      newEntry = personEntry as PersonEntry;
      const updatedEntries = addEntry(newEntry);
      onEntryAdded(updatedEntries);
      showFeedback('success', `Ingreso de ${result.user.name} registrado exitosamente.`);
    }

    setSearchTerm(''); // Clear search after successful registration
    setResults([]);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
      <div className="flex items-center justify-center space-x-3 text-center mb-8">
        <BoltIcon className="w-8 h-8 text-yellow-500 flex-shrink-0" />
        <h2 className="text-3xl font-bold text-slate-800">Acceso Rápido</h2>
      </div>

      <p className="text-center text-slate-600 mb-6">Busque por nombre, RUT, placa o ID de invitación para registrar rápidamente un ingreso.</p>

      {feedback && (
        <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
          {feedback.message}
        </div>
      )}

      <div className="relative mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar persona, vehículo o ID de invitación..."
          className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition duration-150 text-lg"
          aria-label="Buscar para acceso rápido"
        />
        <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" />
      </div>

      <div className="mt-4 space-y-2 max-h-96 overflow-y-auto">
        {loading && <p className="text-center text-slate-500">Buscando...</p>}
        {!loading && results.length === 0 && searchTerm.length >= 3 && (
            <p className="text-center text-slate-500 py-4">No se encontraron resultados para "{searchTerm}".</p>
        )}
        {results.map((result, index) => (
          <div key={`${result.user.id}-${result.matchValue}-${index}`} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-grow">
              <div className="flex-shrink-0">
                {result.matchType === 'Invitación' ? <TicketIcon className="w-8 h-8 text-indigo-600"/> :
                 result.vehicle ? <TruckIcon className="w-8 h-8 text-teal-600" /> : <UserIcon className="w-8 h-8 text-sky-600" />}
              </div>
              <div>
                <p className="font-semibold text-slate-800">{result.user.name} {result.user.apartment ? `(${result.user.apartment})` : ''}</p>
                <p className="text-sm text-slate-500">
                  {result.matchType}: <span className="font-medium">{result.matchValue}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => handleRegisterEntry(result)}
              className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-colors transform hover:scale-105"
            >
              Registrar Ingreso
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default QuickAccessForm;