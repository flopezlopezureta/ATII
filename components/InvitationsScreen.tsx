

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Invitation, SessionUser, AppSettings } from '../types.ts';
import { addInvitation, getInvitations } from '../services/invitationService.ts';
import { findDirectoryUserByAuthId } from '../services/directoryService.ts';
import { getAppSettings } from '../services/settingsService.ts';
import { validateRUT, formatRUT } from '../services/validationService.ts';
import InvitationDisplayModal from './InvitationDisplayModal.tsx';
import TicketIcon from './icons/TicketIcon.tsx';
import CheckCircleIcon from './icons/CheckCircleIcon.tsx';
import ClockIcon from './icons/ClockIcon.tsx';
import XCircleIcon from './icons/XCircleIcon.tsx';
import UserIcon from './icons/UserIcon.tsx';
import TruckIcon from './icons/TruckIcon.tsx';
import QrCodeIcon from './icons/QrCodeIcon.tsx';

interface InvitationsScreenProps {
  currentUser: SessionUser;
}

// Helper to get a date string in 'YYYY-MM-DDTHH:MM' format for datetime-local input
const getLocalDateTimeString = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().slice(0, 16);
};

const InvitationsScreen: React.FC<InvitationsScreenProps> = ({ currentUser }) => {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [type, setType] = useState<'person' | 'vehicle'>('person');
  const [guestName, setGuestName] = useState('');
  const [guestIdDocument, setGuestIdDocument] = useState('');
  const [idDocumentError, setIdDocumentError] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [notes, setNotes] = useState('');

  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const [validFrom, setValidFrom] = useState(getLocalDateTimeString(now));
  const [validUntil, setValidUntil] = useState(getLocalDateTimeString(tomorrow));
  
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [selectedInvitation, setSelectedInvitation] = useState<Invitation | null>(null);

  const loadInvitations = useCallback(() => {
    setInvitations(getInvitations());
  }, []);

  useEffect(() => {
    loadInvitations();
  }, [loadInvitations]);
  
  const userDirectoryProfile = useMemo(() => findDirectoryUserByAuthId(currentUser.id), [currentUser.id]);
  const userApartment = userDirectoryProfile?.apartment || '';

  const userHasParkingSpots = useMemo(() => {
    if (!userDirectoryProfile) return false;
    const hasUnitSpots = userDirectoryProfile.unitParkingSpots && userDirectoryProfile.unitParkingSpots.length > 0;
    const hasVehicleSpots = userDirectoryProfile.vehicles && userDirectoryProfile.vehicles.some(v => v.parkingSpot && v.parkingSpot.trim() !== '');
    return hasUnitSpots || hasVehicleSpots;
  }, [userDirectoryProfile]);

  // If user has no parking spots, force type to 'person' and prevent switching
  useEffect(() => {
    if (!userHasParkingSpots) {
      setType('person');
    }
  }, [userHasParkingSpots]);


  const showFeedback = (type: 'success' | 'error', message: string, duration = 5000) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), duration);
  };

  const handleShareInvitation = (invitation: Invitation) => {
    setSelectedInvitation(invitation);
  };
  
  const handleIdDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formatted = formatRUT(rawValue);
    setGuestIdDocument(formatted);
    const validation = validateRUT(formatted);
    if (rawValue && !validation.isValid) {
        setIdDocumentError(validation.message || 'RUT inválido');
    } else {
        setIdDocumentError('');
    }
  };

  const handleCreateInvitation = (e: React.FormEvent) => {
    e.preventDefault();

    if (new Date(validUntil) <= new Date(validFrom)) {
        showFeedback('error', 'La fecha de fin debe ser posterior a la fecha de inicio.');
        return;
    }

    if (type === 'person') {
        if (!guestName.trim() || !guestIdDocument.trim()) {
            showFeedback('error', 'Nombre y RUT del invitado son obligatorios.');
            return;
        }
        if (idDocumentError) {
            showFeedback('error', `Corrija el error en el RUT: ${idDocumentError}`);
            return;
        }
    } else if (type === 'vehicle') {
        if (!licensePlate.trim() || !guestIdDocument.trim()) {
            showFeedback('error', 'La placa del vehículo y el RUT del conductor son obligatorios.');
            return;
        }
         if (idDocumentError) {
            showFeedback('error', `Corrija el error en el RUT del conductor: ${idDocumentError}`);
            return;
        }
    }

    if (!userApartment) {
        showFeedback('error', 'Tu perfil no tiene un apartamento asignado. No puedes crear invitaciones. Contacta al administrador.');
        return;
    }

    const newInvitationData: Omit<Invitation, 'id' | 'createdAt' | 'status'> = {
      createdByUserId: currentUser.id,
      createdByUserName: currentUser.username,
      validFrom: new Date(validFrom).toISOString(),
      validUntil: new Date(validUntil).toISOString(),
      type: type,
      apartment: userApartment,
      notes: notes.trim() || undefined,
      guestName: guestName.trim() || undefined,
      guestIdDocument: guestIdDocument.trim() || undefined,
      licensePlate: type === 'vehicle' ? licensePlate.trim().toUpperCase() : undefined,
    };

    const newInvitation = addInvitation(newInvitationData);
    
    showFeedback('success', 'Invitación creada exitosamente.');
    handleShareInvitation(newInvitation);
    
    // Reset form
    setGuestName('');
    setGuestIdDocument('');
    setIdDocumentError('');
    setLicensePlate('');
    setNotes('');
    
    const newNow = new Date();
    const newTomorrow = new Date(newNow);
    newTomorrow.setDate(newNow.getDate() + 1);
    setValidFrom(getLocalDateTimeString(newNow));
    setValidUntil(getLocalDateTimeString(newTomorrow));
    
    loadInvitations();
  };
  
  const userInvitations = useMemo(() => {
    return invitations.filter(inv => inv.createdByUserId === currentUser.id);
  }, [invitations, currentUser.id]);

  const getStatus = (inv: Invitation): { text: string; icon: React.ReactNode; color: string } => {
    const now = new Date();
    if (inv.status === 'used') {
      return { text: 'Utilizada', icon: <CheckCircleIcon className="w-4 h-4"/>, color: 'text-green-600' };
    }
    if (now > new Date(inv.validUntil)) {
      return { text: 'Expirada', icon: <XCircleIcon className="w-4 h-4"/>, color: 'text-red-600' };
    }
    if (now < new Date(inv.validFrom)) {
        return { text: 'Programada', icon: <ClockIcon className="w-4 h-4"/>, color: 'text-gray-600' };
    }
    return { text: 'Activa', icon: <ClockIcon className="w-4 h-4"/>, color: 'text-blue-600' };
  };

  return (
    <>
      <div className="space-y-8">
        {/* Form Section */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
          <div className="flex items-center justify-center space-x-2 text-center mb-8">
            <TicketIcon className="w-8 h-8 text-indigo-600 flex-shrink-0" />
            <h2 className="text-3xl font-bold text-slate-800">Crear Invitación</h2>
          </div>
          
          {feedback && (
            <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
              {feedback.message}
            </div>
          )}

          <form onSubmit={handleCreateInvitation} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Tipo de Invitación</label>
                <div className="flex gap-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input type="radio" name="type" value="person" checked={type === 'person'} onChange={() => setType('person')} className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"/>
                        <span className="text-slate-700">Persona</span>
                    </label>
                    <label className={`flex items-center space-x-2 ${userHasParkingSpots ? 'cursor-pointer' : 'cursor-not-allowed'}`} title={!userHasParkingSpots ? 'Debe tener un estacionamiento asignado para invitar vehículos' : undefined}>
                        <input 
                          type="radio" 
                          name="type" 
                          value="vehicle" 
                          checked={type === 'vehicle'} 
                          onChange={() => setType('vehicle')} 
                          className="h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 disabled:opacity-50"
                          disabled={!userHasParkingSpots}
                        />
                        <span className={!userHasParkingSpots ? 'text-slate-400' : 'text-slate-700'}>Vehículo</span>
                    </label>
                </div>
                {!userHasParkingSpots && type === 'vehicle' && (
                    <p className="text-xs text-red-500 mt-1">
                        No puede invitar vehículos si no tiene estacionamientos registrados en su perfil.
                    </p>
                )}
            </div>

            {type === 'person' ? (
              <>
                <div>
                  <label htmlFor="guestName" className="block text-sm font-medium text-slate-700 mb-1">Nombre del Invitado <span className="text-red-500">*</span></label>
                  <input type="text" id="guestName" value={guestName} onChange={(e) => setGuestName(e.target.value)} required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label htmlFor="guestIdDocument" className="block text-sm font-medium text-slate-700 mb-1">RUT del Invitado <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    id="guestIdDocument" 
                    value={guestIdDocument} 
                    onChange={handleIdDocumentChange} 
                    required
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 ${idDocumentError ? 'border-red-500' : 'border-slate-300'}`}/>
                  {idDocumentError && <p className="mt-1 text-xs text-red-600">{idDocumentError}</p>}
                </div>
              </>
            ) : (
              <>
                 <div>
                  <label htmlFor="licensePlate" className="block text-sm font-medium text-slate-700 mb-1">Placa Patente del Vehículo <span className="text-red-500">*</span></label>
                  <input type="text" id="licensePlate" value={licensePlate} onChange={(e) => setLicensePlate(e.target.value.toUpperCase())} required
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label htmlFor="guestNameVehicle" className="block text-sm font-medium text-slate-700 mb-1">Nombre del Conductor (Opcional)</label>
                  <input type="text" id="guestNameVehicle" value={guestName} onChange={(e) => setGuestName(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"/>
                </div>
                <div>
                  <label htmlFor="guestIdDocumentVehicle" className="block text-sm font-medium text-slate-700 mb-1">RUT del Conductor <span className="text-red-500">*</span></label>
                  <input 
                    type="text" 
                    id="guestIdDocumentVehicle" 
                    value={guestIdDocument} 
                    onChange={handleIdDocumentChange} 
                    required
                    className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500 ${idDocumentError ? 'border-red-500' : 'border-slate-300'}`}/>
                  {idDocumentError && <p className="mt-1 text-xs text-red-600">{idDocumentError}</p>}
                </div>
              </>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="validFrom" className="block text-sm font-medium text-slate-700 mb-1">Válido Desde</label>
                <input type="datetime-local" id="validFrom" value={validFrom} onChange={e => setValidFrom(e.target.value)} min={getLocalDateTimeString(new Date())}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"/>
              </div>
              <div>
                <label htmlFor="validUntil" className="block text-sm font-medium text-slate-700 mb-1">Válido Hasta</label>
                <input type="datetime-local" id="validUntil" value={validUntil} onChange={e => setValidUntil(e.target.value)} min={validFrom}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"/>
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
              <textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-500"
                placeholder="Ej: Entrega de paquete, visita familiar..."/>
            </div>

            <button type="submit"
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition transform hover:scale-105 disabled:opacity-70"
              disabled={!userApartment || (type === 'vehicle' && !userHasParkingSpots)}>
              Crear Invitación
            </button>
          </form>
        </div>

        {/* List Section */}
        <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-slate-800 mb-6 text-center">Mis Invitaciones Recientes</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {userInvitations.length > 0 ? userInvitations.map(inv => {
                    const status = getStatus(inv);
                    return (
                        <div key={inv.id} className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-grow">
                                <div className="flex-shrink-0">
                                    {inv.type === 'person' ? <UserIcon className="w-8 h-8 text-sky-600"/> : <TruckIcon className="w-8 h-8 text-teal-600"/>}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800">{inv.guestName || inv.licensePlate}</p>
                                    <p className={`text-xs flex items-center gap-1.5 ${status.color}`}>
                                        {status.icon} {status.text}
                                    </p>
                                    <p className="text-xs text-slate-500">Válida hasta: {new Date(inv.validUntil).toLocaleString('es-CL')}</p>
                                </div>
                            </div>
                            <button onClick={() => setSelectedInvitation(inv)}
                                className="w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2">
                                <QrCodeIcon className="w-5 h-5"/>
                                Ver QR
                            </button>
                        </div>
                    );
                }) : (
                    <p className="text-center text-slate-500 py-6">No has creado ninguna invitación aún.</p>
                )}
            </div>
        </div>

      </div>
      <InvitationDisplayModal invitation={selectedInvitation} onClose={() => setSelectedInvitation(null)} />
    </>
  );
};

export default InvitationsScreen;