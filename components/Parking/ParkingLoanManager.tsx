
import React, { useState, useEffect, useMemo } from 'react';
import { DirectoryUser, ParkingLoanRequest, ParkingLoanStatus, SessionUser, Invitation } from '../../types.ts';
import { getDirectoryUsers } from '../../services/directoryService.ts';
import { 
    getParkingLoans, 
    createParkingLoanRequest, 
    completeParkingLoan, 
    cancelParkingLoan, 
    createPublicBorrowRequest, 
    fulfillPublicRequest 
} from '../../services/parkingLoanService.ts';
import SearchIcon from '../icons/SearchIcon.tsx';
import ParkingIcon from '../icons/ParkingIcon.tsx';
import UserIcon from '../icons/UserIcon.tsx';
import UsersIcon from '../icons/UsersIcon.tsx';
import CheckCircleIcon from '../icons/CheckCircleIcon.tsx';
import BoltIcon from '../icons/BoltIcon.tsx';
import TrashIcon from '../icons/TrashIcon.tsx';
import WhatsAppIcon from '../icons/WhatsAppIcon.tsx';
import InvitationDisplayModal from '../InvitationDisplayModal.tsx';
import CalendarIcon from '../icons/ClockIcon.tsx'; // Reutilizando ícono de tiempo para calendario

interface ParkingLoanManagerProps {
  currentUser: SessionUser;
  userProfile: DirectoryUser;
}

const getLocalDateTimeString = (date: Date): string => {
  const offset = date.getTimezoneOffset();
  const adjustedDate = new Date(date.getTime() - (offset * 60 * 1000));
  return adjustedDate.toISOString().slice(0, 16);
};

const ParkingLoanManager: React.FC<ParkingLoanManagerProps> = ({ currentUser, userProfile }) => {
  const [loans, setLoans] = useState<ParkingLoanRequest[]>([]);
  const [neighborSearch, setNeighborSearch] = useState('');
  const [selectedNeighbor, setSelectedNeighbor] = useState<DirectoryUser | null>(null);
  const [selectedSpot, setSelectedSpot] = useState('');
  const [activeTab, setActiveTab] = useState<'community' | 'send' | 'received'>('community');

  // Modal para propietarios al prestar desde el buzón público
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);

  // Form para completar préstamo recibido
  const [completingLoan, setCompletingLoan] = useState<ParkingLoanRequest | null>(null);
  const [visitorName, setVisitorName] = useState('');
  const [visitorPlate, setVisitorPlate] = useState('');
  const [visitorRut, setVisitorRut] = useState('');
  
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 12);
  const [validUntil, setValidUntil] = useState(getLocalDateTimeString(tomorrow));

  // Invitación generada para mostrar modal de compartir
  const [generatedInvitation, setGeneratedInvitation] = useState<Invitation | null>(null);

  const allDirectoryUsers = useMemo(() => getDirectoryUsers().filter(u => u.id !== userProfile.id), [userProfile.id]);
  
  const mySpots = useMemo(() => [
    ...(userProfile.unitParkingSpots || []),
    ...(userProfile.vehicles || []).map(v => v.parkingSpot).filter((s): s is string => !!s)
  ], [userProfile]);

  const loadAllLoans = () => setLoans(getParkingLoans());

  useEffect(() => {
    loadAllLoans();
  }, []);

  const neighbors = useMemo(() => {
    if (neighborSearch.length < 2) return [];
    return allDirectoryUsers.filter(u => 
        u.name.toLowerCase().includes(neighborSearch.toLowerCase()) || 
        u.apartment?.toLowerCase().includes(neighborSearch.toLowerCase())
    ).slice(0, 5);
  }, [neighborSearch, allDirectoryUsers]);

  const handleSendLoan = () => {
    if (!selectedNeighbor || !selectedSpot) return;
    
    const result = createParkingLoanRequest({
        lenderId: currentUser.id,
        lenderName: userProfile.name,
        lenderApt: userProfile.apartment || 'N/A',
        borrowerId: selectedNeighbor.authUserId || selectedNeighbor.id,
        borrowerName: selectedNeighbor.name,
        borrowerApt: selectedNeighbor.apartment || 'N/A',
        spot: selectedSpot,
    });
    
    if ('error' in result) {
        alert(result.error);
        return;
    }
    
    loadAllLoans();
    setSelectedNeighbor(null);
    setNeighborSearch('');
    setSelectedSpot('');
    alert(`Solicitud enviada a ${selectedNeighbor.name}`);
  };

  const handleRequestParking = () => {
    createPublicBorrowRequest({
        id: currentUser.id,
        name: userProfile.name,
        apt: userProfile.apartment || 'N/A'
    });
    loadAllLoans();
    alert("Tu solicitud ha sido publicada en el buzón comunitario.");
  };

  const handleFulfillRequest = (requestId: string) => {
    if (!selectedSpot) {
        alert("Por favor selecciona cuál de tus estacionamientos deseas prestar.");
        return;
    }
    const result = fulfillPublicRequest(requestId, {
        id: currentUser.id,
        name: userProfile.name,
        apt: userProfile.apartment || 'N/A',
        spot: selectedSpot
    });
    
    if (result.success) {
        alert(result.message);
        setFulfillingRequestId(null);
        setSelectedSpot('');
        loadAllLoans();
    } else {
        alert(result.message);
    }
  };

  const handleCompleteReceived = (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingLoan) return;

    const invitation = completeParkingLoan(completingLoan.id, {
        name: visitorName,
        plate: visitorPlate,
        rut: visitorRut,
        validUntil: new Date(validUntil).toISOString(),
    });

    if (invitation) {
        setGeneratedInvitation(invitation);
        setCompletingLoan(null);
        loadAllLoans();
        // Limpiar campos
        setVisitorName('');
        setVisitorPlate('');
        setVisitorRut('');
    } else {
        alert("Hubo un error al generar la invitación.");
    }
  };

  const communityRequests = loans.filter(l => l.status === ParkingLoanStatus.OPEN_REQUEST && l.borrowerId !== currentUser.id);
  const mySentLoans = loans.filter(l => l.lenderId === currentUser.id);
  const myReceivedLoans = loans.filter(l => l.borrowerId === currentUser.id);

  return (
    <div className="space-y-6">
      <div className="flex border-b overflow-x-auto">
        <button onClick={() => setActiveTab('community')} className={`flex-none px-4 py-2 text-sm font-medium ${activeTab === 'community' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-slate-500'}`}>Buzón Comunidad ({communityRequests.length})</button>
        <button onClick={() => setActiveTab('send')} className={`flex-none px-4 py-2 text-sm font-medium ${activeTab === 'send' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-slate-500'}`}>Prestar Lugar</button>
        <button onClick={() => setActiveTab('received')} className={`flex-none px-4 py-2 text-sm font-medium ${activeTab === 'received' ? 'border-b-2 border-sky-600 text-sky-600' : 'text-slate-500'}`}>Mis Solicitudes</button>
      </div>

      {activeTab === 'community' && (
        <div className="space-y-4">
            <div className="bg-sky-50 p-4 rounded-lg border border-sky-100 flex justify-between items-center">
                <div>
                    <h4 className="font-bold text-sky-800">¿Necesitas un estacionamiento?</h4>
                    <p className="text-xs text-sky-600">Publica una solicitud para que otros propietarios la vean.</p>
                </div>
                <button onClick={handleRequestParking} className="bg-sky-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-sky-700">Solicitar Ayuda</button>
            </div>

            <div className="space-y-3">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vecinos buscando estacionamiento</h5>
                {communityRequests.length === 0 && <p className="text-center text-slate-400 py-8 text-sm italic">No hay solicitudes abiertas en este momento.</p>}
                {communityRequests.map(req => (
                    <div key={req.id} className="bg-white border rounded-lg p-3 shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="bg-orange-100 p-2 rounded-full"><UsersIcon className="w-5 h-5 text-orange-600"/></div>
                            <div>
                                <p className="font-bold text-slate-800">{req.borrowerName}</p>
                                <p className="text-xs text-slate-500">Depto: {req.borrowerApt}</p>
                            </div>
                        </div>
                        {fulfillingRequestId === req.id ? (
                            <div className="flex flex-col gap-2 animate-in fade-in slide-in-from-right-4">
                                <select value={selectedSpot} onChange={e => setSelectedSpot(e.target.value)} className="p-1.5 text-xs border rounded bg-slate-50">
                                    <option value="">¿Cuál prestas?</option>
                                    {mySpots.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <div className="flex gap-1">
                                    <button onClick={() => handleFulfillRequest(req.id)} className="flex-1 bg-green-600 text-white text-[10px] py-1 rounded font-bold">Confirmar</button>
                                    <button onClick={() => setFulfillingRequestId(null)} className="flex-1 bg-slate-200 text-slate-600 text-[10px] py-1 rounded">No</button>
                                </div>
                            </div>
                        ) : (
                            <button onClick={() => {setFulfillingRequestId(req.id); setSelectedSpot('');}} className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors">
                                Prestar mi lugar
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
      )}

      {activeTab === 'send' && (
        <div className="space-y-4 bg-slate-50 p-4 rounded-lg">
          <h4 className="font-semibold text-slate-800 flex items-center gap-2"><ParkingIcon className="w-5 h-5"/> Préstamo Directo</h4>
          <div>
            <label className="block text-xs font-medium text-slate-600">1. Selecciona tu Estacionamiento</label>
            <select value={selectedSpot} onChange={e => setSelectedSpot(e.target.value)} className="w-full mt-1 p-2 border rounded-md text-sm bg-white">
                <option value="">-- Elige uno --</option>
                {mySpots.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="relative">
            <label className="block text-xs font-medium text-slate-600">2. Busca al Vecino Beneficiario</label>
            <div className="relative mt-1">
                <input type="text" value={neighborSearch} onChange={e => {setNeighborSearch(e.target.value); setSelectedNeighbor(null);}} placeholder="Nombre o Apto..." className="w-full pl-8 pr-4 py-2 border rounded-md text-sm"/>
                <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            </div>
            {neighborSearch && !selectedNeighbor && (
                <ul className="absolute z-10 w-full bg-white border rounded-md shadow-lg mt-1 max-h-40 overflow-y-auto">
                    {neighbors.map(n => (
                        <li key={n.id} onClick={() => {setSelectedNeighbor(n); setNeighborSearch(`${n.name} (${n.apartment})`);}} className="p-2 hover:bg-sky-50 cursor-pointer text-sm">
                            {n.name} - {n.apartment}
                        </li>
                    ))}
                </ul>
            )}
          </div>
          <button disabled={!selectedNeighbor || !selectedSpot} onClick={handleSendLoan} className="w-full py-2 bg-sky-600 text-white rounded-md font-semibold disabled:opacity-50">Enviar Autorización</button>

          <div className="mt-6 pt-4 border-t">
              <h5 className="text-xs font-bold text-slate-500 uppercase mb-2">Mis Préstamos Otorgados</h5>
              <div className="space-y-2">
                {mySentLoans.map(l => (
                    <div key={l.id} className="text-xs p-2 bg-white border rounded flex justify-between items-center shadow-sm">
                        <div>
                            <p className="font-medium text-slate-700">Para: {l.borrowerName} ({l.borrowerApt})</p>
                            <p className="text-slate-500 font-mono">Estac: {l.spot} | {l.status === 'pending' ? '⏳ Esperando visita' : `✅ Placa: ${l.visitorPlate}`}</p>
                        </div>
                        {l.status === 'pending' && <button onClick={() => {cancelParkingLoan(l.id); loadAllLoans();}} className="text-red-500 font-bold px-2 py-1">X</button>}
                    </div>
                ))}
                {mySentLoans.length === 0 && <p className="text-center text-slate-400 py-4 text-xs italic">No has realizado préstamos directos.</p>}
              </div>
          </div>
        </div>
      )}

      {activeTab === 'received' && (
        <div className="space-y-4">
            {completingLoan ? (
                <form onSubmit={handleCompleteReceived} className="bg-indigo-50 p-4 rounded-lg border border-indigo-200 space-y-4 animate-in zoom-in-95 duration-200">
                    <h4 className="font-bold text-indigo-800 flex items-center gap-2">
                        <UsersIcon className="w-5 h-5"/> Completar Datos de Visita
                    </h4>
                    <p className="text-xs text-indigo-600 italic">Usarás el estacionamiento {completingLoan.spot} cedido por {completingLoan.lenderName}.</p>
                    
                    <div className="space-y-3">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Nombre Visitante</label>
                            <input type="text" value={visitorName} onChange={e => setVisitorName(e.target.value)} required className="w-full p-2 border rounded text-sm"/>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">Patente</label>
                                <input type="text" value={visitorPlate} onChange={e => setVisitorPlate(e.target.value.toUpperCase())} required className="w-full p-2 border rounded text-sm"/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase">RUT Visitante</label>
                                <input type="text" value={visitorRut} onChange={e => setVisitorRut(e.target.value)} required className="w-full p-2 border rounded text-sm"/>
                            </div>
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Fecha y Hora de Salida (Fin Estadía)</label>
                            <div className="relative">
                                <input 
                                    type="datetime-local" 
                                    value={validUntil} 
                                    onChange={e => setValidUntil(e.target.value)} 
                                    min={getLocalDateTimeString(new Date())}
                                    required 
                                    className="w-full p-2 border rounded text-sm pl-8"
                                />
                                <CalendarIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 italic">La invitación QR será válida solo hasta este momento.</p>
                        </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                        <button type="submit" className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 flex items-center justify-center gap-2">
                            Generar Invitación
                        </button>
                        <button type="button" onClick={() => setCompletingLoan(null)} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">Volver</button>
                    </div>
                </form>
            ) : (
                <div className="space-y-3">
                    <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mis Solicitudes y Beneficios</h5>
                    {myReceivedLoans.length === 0 && <p className="text-center text-slate-400 py-10 text-sm italic">No tienes solicitudes activas ni recibidas.</p>}
                    {myReceivedLoans.map(l => (
                        <div key={l.id} className={`p-3 rounded-lg border-2 flex justify-between items-center transition-all ${l.status === ParkingLoanStatus.PENDING ? 'bg-indigo-50 border-indigo-200' : l.status === ParkingLoanStatus.OPEN_REQUEST ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 opacity-60'}`}>
                            <div>
                                <p className="font-bold text-slate-800">
                                    {l.status === ParkingLoanStatus.OPEN_REQUEST ? '📢 Solicitud Pública' : `🤝 ${l.lenderName} te prestó lugar`}
                                </p>
                                <p className="text-xs text-slate-600">
                                    {l.status === ParkingLoanStatus.OPEN_REQUEST ? 'Esperando a que un vecino responda...' : `Estacionamiento: ${l.spot}`}
                                </p>
                                {l.status === ParkingLoanStatus.COMPLETED && (
                                    <div className="mt-2 flex gap-2">
                                        <p className="text-[10px] text-green-600 font-bold uppercase">✓ Invitación Generada</p>
                                        <button 
                                            onClick={() => {
                                                const invId = l.invitationId;
                                                const invitations = JSON.parse(localStorage.getItem('condominiumInvitations') || '[]');
                                                const inv = invitations.find((i: any) => i.id === invId);
                                                if (inv) setGeneratedInvitation(inv);
                                            }}
                                            className="text-[10px] text-sky-600 font-bold underline uppercase"
                                        >
                                            Compartir QR
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {l.status === ParkingLoanStatus.PENDING && (
                                    <button onClick={() => setCompletingLoan(l)} className="px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg shadow-sm hover:bg-indigo-700">
                                        Cargar Visita
                                    </button>
                                )}
                                <button onClick={() => {cancelParkingLoan(l.id); loadAllLoans();}} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                                    <TrashIcon className="w-4 h-4"/>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      )}
      
      {generatedInvitation && (
          <InvitationDisplayModal 
            invitation={generatedInvitation} 
            onClose={() => setGeneratedInvitation(null)} 
          />
      )}
    </div>
  );
};

export default ParkingLoanManager;
