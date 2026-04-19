
import React, { useState, useMemo } from 'react';
import { Invitation } from '../types.ts';
import { getInvitations } from '../services/invitationService.ts';
import UserIcon from './icons/UserIcon.tsx';
import TruckIcon from './icons/TruckIcon.tsx';
import ClipboardDocumentCheckIcon from './icons/ClipboardDocumentCheckIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';
import SearchIcon from './icons/SearchIcon.tsx';
import ParkingIcon from './icons/ParkingIcon.tsx';

interface VisitorAuthorizationScreenProps {
  onProcessInvitation: (invitationId: string, type: 'person' | 'vehicle') => void;
}

const VisitorAuthorizationScreen: React.FC<VisitorAuthorizationScreenProps> = ({ onProcessInvitation }) => {
  const [allInvitations] = useState<Invitation[]>(getInvitations());
  const [searchTerm, setSearchTerm] = useState('');

  const activeInvitations = useMemo(() => {
    return allInvitations.filter(inv => {
        const now = new Date();
        return inv.status === 'active' && now >= new Date(inv.validFrom) && now <= new Date(inv.validUntil);
    }).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); 
  }, [allInvitations]);

  const filteredInvitations = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase();
    if (!lowerTerm) return activeInvitations;
    return activeInvitations.filter(inv =>
      inv.guestName?.toLowerCase().includes(lowerTerm) ||
      inv.guestIdDocument?.replace(/[^0-9kK]/gi, '').includes(lowerTerm) ||
      inv.licensePlate?.toLowerCase().includes(lowerTerm) ||
      inv.createdByUserName.toLowerCase().includes(lowerTerm) ||
      inv.apartment.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm, activeInvitations]);

  return (
    <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-center space-x-3 text-center mb-6">
        <ClipboardDocumentCheckIcon className="w-8 h-8 text-green-600" />
        <h2 className="text-3xl font-bold text-slate-800">Autorizar Visitas Programadas</h2>
      </div>
      <p className="text-center text-slate-600 mb-6">Lista de invitaciones activas. Las de estacionamiento prestado se marcan en púrpura.</p>
      
      <div className="relative mb-4">
          <input 
            type="text" 
            placeholder="Buscar visitante, RUT, placa, residente o depto..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-green-500"
          />
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5"/>
      </div>


      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
        {filteredInvitations.length > 0 ? filteredInvitations.map(inv => (
          <div key={inv.id} className={`p-3 rounded-lg border-2 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all ${inv.isParkingLoan ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-3 flex-grow w-full">
              <div className="flex-shrink-0">
                {inv.isParkingLoan ? <ParkingIcon className="w-8 h-8 text-purple-600"/> : (inv.type === 'person' ? <UserIcon className="w-8 h-8 text-sky-600"/> : <TruckIcon className="w-8 h-8 text-teal-600"/>)}
              </div>
              <div className="flex-grow">
                <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800">{inv.guestName || inv.licensePlate}</p>
                    {inv.isParkingLoan && <span className="bg-purple-600 text-white text-[10px] px-1.5 py-0.5 rounded uppercase font-bold">Estac. Prestado</span>}
                </div>
                <p className="text-sm text-slate-600">
                  Visita a {inv.apartment} (Cortesía de: {inv.createdByUserName})
                </p>
                {inv.isParkingLoan && (
                    <p className="text-xs text-purple-700 font-medium">
                        Espacio cedido por {inv.loanedByUserName} (Lugar: {inv.loanedSpot})
                    </p>
                )}
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <ClockIcon className="w-3 h-3"/> Expira: {new Date(inv.validUntil).toLocaleString('es-CL')}
                </p>
              </div>
            </div>
            <button 
              onClick={() => onProcessInvitation(inv.id, inv.type)}
              className={`w-full sm:w-auto flex-shrink-0 text-white font-bold py-2.5 px-6 rounded-lg shadow-md transition transform hover:scale-105 ${inv.isParkingLoan ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              Registrar Ingreso
            </button>
          </div>
        )) : (
          <div className="text-center text-slate-500 py-8">
            <ClipboardDocumentCheckIcon className="w-12 h-12 mx-auto text-slate-300 mb-2"/>
            <p>No hay invitaciones activas que coincidan con la búsqueda.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisitorAuthorizationScreen;
