import React, { useState, useRef, useEffect } from 'react';
import { PersonEntry, EntryType, CondominiumEntry, Invitation, SessionUser, AppSettings, DirectoryUser } from '../types.ts';
import { addEntry } from '../services/storageService.ts';
import { validateRUT, formatRUT, cleanRUT } from '../services/validationService.ts'; 
import { findDirectoryUserByRUT } from '../services/directoryService.ts';
import { getInvitationById, markInvitationAsUsed } from '../services/invitationService.ts';
import RutErrorModal from './RutErrorModal.tsx'; // Importar el modal
import UserIcon from './icons/UserIcon.tsx'; // Import UserIcon

interface PersonFormProps {
  onEntryAdded: (newEntries: CondominiumEntry[]) => void;
  currentUser: SessionUser;
  appSettings: AppSettings;
  userProfile: (DirectoryUser & { isSuperuser?: boolean }) | null;
}

// Helper function to parse OCR text (this will need significant refinement for OCR's less structured output)
const parseOcrText = (ocrText: string): { id: string; name: string; error: string } => {
    let parsedId = '';
    let parsedName = '';
    let errorMessage = '';

    if (!ocrText || typeof ocrText !== 'string' || ocrText.trim() === '') {
        return { id: '', name: '', error: 'Texto OCR vacío.' };
    }

    const text = ocrText.toUpperCase(); // Convert to uppercase for easier matching

    const rutRegex = /(\d{1,2}[\.\s]?\d{3}[\.\s]?\d{3}-?[\dkK])/; 
    let potentialRutMatch = text.match(rutRegex);
    
    if (potentialRutMatch && potentialRutMatch[0]) {
        parsedId = formatRUT(potentialRutMatch[0]); // Format extracted RUT
    } else {
        const simpleRutRegex = /(\d{7,9}-?[\dkK])/;
        potentialRutMatch = text.match(simpleRutRegex);
        if (potentialRutMatch && potentialRutMatch[0]) {
            parsedId = formatRUT(potentialRutMatch[0]); // Format extracted RUT
        }
    }
    
    const nameKeywords = ["NOMBRE", "NOMBRES", "APELLIDO", "APELLIDOS", "NAME"];
    const lines = text.split('\n');
    let nameLineFound = false;
    for (const line of lines) {
        for (const keyword of nameKeywords) {
            if (line.includes(keyword)) {
                let potentialName = line.replace(keyword, '').trim();
                potentialName = potentialName.replace(/[^A-Z\sÑÁÉÍÓÚÜ]/gi, '').trim(); 
                if (potentialName.length > 3 && potentialName.split(' ').length >= 2) { 
                    parsedName = potentialName;
                    nameLineFound = true;
                    break;
                }
            }
        }
        if (nameLineFound) break;
    }
    
    if (!parsedName) {
        const apellidoKeywords = ["APELLIDO", "APELLIDOS"];
        for (const line of lines) {
             for (const keyword of apellidoKeywords) {
                if (line.includes(keyword)) {
                    let potentialName = line.replace(keyword, '').trim();
                    potentialName = potentialName.replace(/[^A-Z\sÑÁÉÍÓÚÜ]/gi, '').trim();
                    if (potentialName.length > 3) { 
                        parsedName = potentialName; 
                        nameLineFound = true;
                        break;
                    }
                }
            }
            if (nameLineFound) break;
        }
    }

    if (!parsedId && !parsedName) {
        errorMessage = 'No se pudo extraer RUT ni Nombre del texto introducido. Verifique el texto del escáner.';
    } else if (!parsedId) {
        errorMessage = 'Nombre extraído, pero no se pudo encontrar un RUT válido en el texto.';
    } else if (!parsedName) {
        errorMessage = 'RUT extraído, pero no se pudo encontrar un Nombre en el texto.';
    }

    return { id: parsedId.toUpperCase(), name: parsedName, error: errorMessage };
};


const PersonForm: React.FC<PersonFormProps> = ({ onEntryAdded, currentUser, appSettings, userProfile }) => {
  const [name, setName] = useState('');
  const [idDocument, setIdDocument] = useState(''); // Stores formatted RUT
  const [apartment, setApartment] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [error, setError] = useState(''); 
  const [successMessage, setSuccessMessage] = useState('');
  const [idDocumentError, setIdDocumentError] = useState(''); // Inline error
  const [scanInputFeedback, setScanInputFeedback] = useState('');
  const [directoryCheckFeedback, setDirectoryCheckFeedback] = useState('');
  const [isAuthorizedByReadOnly, setIsAuthorizedByReadOnly] = useState(false);
  const [linkedInvitation, setLinkedInvitation] = useState<Invitation | null>(null);

  const [isRutErrorModalOpen, setIsRutErrorModalOpen] = useState(false);
  const [rutModalMessage, setRutModalMessage] = useState('');

  const canAutoApprove = userProfile?.permissions?.authorizePeople ?? false;
  const isPrivilegedUser = canAutoApprove; // A user with authorization permission is privileged
  const isApartmentReadOnlyForUser = !isPrivilegedUser && !!userProfile;


  useEffect(() => {
    // Pre-fill apartment and authorizedBy for non-privileged users
    if (userProfile && !isPrivilegedUser) {
        setApartment(userProfile.apartment || '');
        setAuthorizedBy(userProfile.name);
    }
  }, [userProfile, isPrivilegedUser]);


  const handleInvitationScan = (invitationId: string) => {
    const invitation = getInvitationById(invitationId);
    
    if (!invitation) {
        setScanInputFeedback(`Error: Invitación con ID ${invitationId} no encontrada.`);
        setTimeout(() => setScanInputFeedback(''), 7000);
        return;
    }

    if (invitation.type !== 'person') {
        setScanInputFeedback(`Error: La invitación es para un vehículo, no una persona.`);
        setTimeout(() => setScanInputFeedback(''), 7000);
        return;
    }

    // FIX: Property 'expiresAt' does not exist on type 'Invitation'.
    if (invitation.status !== 'active' || new Date(invitation.validUntil) < new Date()) {
        setScanInputFeedback(`Error: La invitación está ${invitation.status} o ha expirado.`);
        setTimeout(() => setScanInputFeedback(''), 7000);
        return;
    }
    
    setLinkedInvitation(invitation);
    setName(invitation.guestName || '');
    setIdDocument(invitation.guestIdDocument || '');
    setApartment(invitation.apartment || '');
    setAuthorizedBy(`Invitación de ${invitation.createdByUserName}`);
    setIsAuthorizedByReadOnly(true);
    setScanInputFeedback(`Invitación válida encontrada para ${invitation.guestName}.`);
    setTimeout(() => setScanInputFeedback(''), 7000);
  };


  const handleIdDocumentInputChange = (rawValue: string) => {
    const currentName = name; 
    setScanInputFeedback(''); 
    setDirectoryCheckFeedback('');
    setIsAuthorizedByReadOnly(false);
    setLinkedInvitation(null);
    
    // Un-freeze user fields if they overwrite an invitation scan
    if (isApartmentReadOnlyForUser) {
        setApartment(userProfile?.apartment || '');
        setAuthorizedBy(userProfile?.name || '');
    }


    // Check for invitation JSON
    try {
        const potentialJSON = JSON.parse(rawValue);
        if (potentialJSON.type === 'inv' && potentialJSON.id) {
            handleInvitationScan(potentialJSON.id);
            return; // Exit early
        }
    } catch(e) {
        // Not a JSON, proceed with normal parsing
    }

    const formattedRut = formatRUT(rawValue);
    setIdDocument(formattedRut);

    if (rawValue.trim() === '') {
        setIdDocumentError('');
        setDirectoryCheckFeedback('');
        return;
    }

    let extractedRutForDirectoryCheck = '';
    const IS_LIKELY_SCANNER_INPUT_THRESHOLD = 20; 

    if (rawValue.length > IS_LIKELY_SCANNER_INPUT_THRESHOLD && rawValue.includes(' ') && !formattedRut.includes(' ')) { // Basic heuristic for scanner input
        const { id: parsedIdFromScan, name: parsedNameFromScan, error: parseError } = parseOcrText(rawValue);

        if (parsedIdFromScan) {
            const formattedParsedIdFromScan = formatRUT(parsedIdFromScan); // Format the OCR extracted RUT
            setIdDocument(formattedParsedIdFromScan);
            extractedRutForDirectoryCheck = formattedParsedIdFromScan;
            const rutValidation = validateRUT(formattedParsedIdFromScan);
            if (!rutValidation.isValid) {
                setIdDocumentError(rutValidation.message || "RUT extraído del escáner es inválido.");
                setScanInputFeedback(`RUT ${formattedParsedIdFromScan} extraído pero es inválido. ${parsedNameFromScan ? 'Nombre extraído: ' + parsedNameFromScan : ''}`);
            } else {
                setIdDocumentError('');
                setScanInputFeedback(`RUT ${formattedParsedIdFromScan} extraído y válido. ${parsedNameFromScan ? 'Nombre extraído: ' + parsedNameFromScan : ''}`);
            }
        } else {
            setIdDocumentError(parseError || 'No se pudo extraer un RUT del texto escaneado.');
            setScanInputFeedback(parseError || 'No se pudo extraer un RUT válido del texto del escáner.');
        }

        if (parsedNameFromScan) {
            setName(parsedNameFromScan);
        } else if (!parsedIdFromScan) {
             if (!currentName) setName('');
        }
        
        if (parseError && (!parsedIdFromScan || !parsedNameFromScan)) {
             setScanInputFeedback(parseError);
        } else if (!parsedIdFromScan && !parsedNameFromScan) {
            setScanInputFeedback('No se pudo extraer información útil del texto escaneado.');
        }
         setTimeout(() => setScanInputFeedback(''), 7000); 
    } else {
        // Standard manual input validation for RUT
        const validationResult = validateRUT(formattedRut); // Validate the formatted RUT
        if (!validationResult.isValid) {
            setIdDocumentError(validationResult.message || 'El Documento ID no es un RUT válido.');
        } else {
            setIdDocumentError('');
            extractedRutForDirectoryCheck = formattedRut;
        }
    }

    // Directory Check if RUT is valid (or extracted and deemed valid)
    if (extractedRutForDirectoryCheck && !idDocumentError) { // Check against inline error
        const directoryUser = findDirectoryUserByRUT(extractedRutForDirectoryCheck);
        if (directoryUser) {
            let feedback = `Este RUT ya existe en el directorio: ${directoryUser.name}.`;
            if (directoryUser.apartment) feedback += ` Depto: ${directoryUser.apartment}.`;
            if (directoryUser.role) feedback += ` Rol: ${directoryUser.role}.`;
            setDirectoryCheckFeedback(feedback + " Si es un reingreso, considere usar Acceso Rápido.");
            if (!name.trim()) setName(directoryUser.name);
            
            if (!isApartmentReadOnlyForUser) {
                if (!apartment.trim() && directoryUser.apartment) setApartment(directoryUser.apartment);
            }

            if (directoryUser.role === 'Propietario' || directoryUser.role === 'Arrendatario') {
                if(!isApartmentReadOnlyForUser) {
                    setAuthorizedBy(directoryUser.role === 'Propietario' ? 'Acceso Autorizado (Propietario)' : 'Acceso Autorizado (Arrendatario)');
                    setIsAuthorizedByReadOnly(true);
                }
            } else {
                 if(!isApartmentReadOnlyForUser) {
                    setIsAuthorizedByReadOnly(false);
                 }
            }
        } else {
            setDirectoryCheckFeedback('Este RUT no se encontró en el directorio de usuarios.');
            if(!isApartmentReadOnlyForUser) {
                setIsAuthorizedByReadOnly(false); 
            }
        }
        setTimeout(() => setDirectoryCheckFeedback(''), 7000);
    }
  };

  const handleIdDocumentBlur = () => {
    if (idDocument.trim() !== '' && idDocumentError) {
      setRutModalMessage(idDocumentError);
      setIsRutErrorModalOpen(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const trimmedName = name.trim();

    if (!trimmedName || !idDocument.trim()) {
      setError('Nombre y Documento ID son obligatorios.');
      return;
    }

    if (isApartmentReadOnlyForUser && !apartment) {
        setError('Tu perfil no tiene un apartamento asignado. No puedes registrar visitas. Contacta al administrador.');
        return;
    }


    if (!linkedInvitation) {
        const finalRutValidation = validateRUT(idDocument); // Validate the formatted RUT
        if (!finalRutValidation.isValid) {
            setIdDocumentError(finalRutValidation.message || 'El Documento ID no es un RUT válido.');
            setRutModalMessage(finalRutValidation.message || 'El Documento ID no es un RUT válido. No se puede registrar.');
            setIsRutErrorModalOpen(true);
            setError('Corrija los errores en el Documento ID antes de registrar.');
            return;
        }
    }
    setIdDocumentError(''); 
    
    let finalAuthorizedBy = authorizedBy.trim();
    if (!linkedInvitation) {
         // For non-privileged users, force authorizedBy to be their name
        if (userProfile && !isPrivilegedUser) {
            finalAuthorizedBy = userProfile.name;
        } else { // For privileged users, keep existing logic
            const directoryUser = findDirectoryUserByRUT(idDocument);
            if (directoryUser && (directoryUser.role === 'Propietario' || directoryUser.role === 'Arrendatario')) {
                finalAuthorizedBy = directoryUser.role === 'Propietario' ? 'Acceso Autorizado (Propietario)' : 'Acceso Autorizado (Arrendatario)';
            }
        }
    }
    
    const initialStatus = appSettings.conciergeModeEnabled && !canAutoApprove ? 'pending' : 'approved';

    const newPersonEntry: Omit<PersonEntry, 'id' | 'timestamp'> = {
      type: EntryType.PERSON,
      name: trimmedName,
      idDocument: idDocument, // Store formatted RUT
      apartment: apartment.trim() || undefined,
      authorizedBy: finalAuthorizedBy || undefined,
      invitationId: linkedInvitation?.id,
      status: initialStatus,
    };
    
    const updatedEntries = addEntry(newPersonEntry as PersonEntry);
    
    if (linkedInvitation) {
        const newEntryRecord = updatedEntries.find(entry => entry.id === entry.id && (entry as PersonEntry).invitationId === linkedInvitation.id);
        if (newEntryRecord) {
            markInvitationAsUsed(linkedInvitation.id, newEntryRecord.id);
        }
    }

    onEntryAdded(updatedEntries);
    
    const successMsg = initialStatus === 'pending'
      ? 'Registro de visita enviado para aprobación.'
      : 'Persona registrada exitosamente!';

    setSuccessMessage(successMsg);
    setName('');
    setIdDocument('');
    
    // Do not clear apartment/authorizedBy if it's read-only for the user
    if (!isApartmentReadOnlyForUser) {
        setApartment('');
        setAuthorizedBy('');
    }

    setIdDocumentError(''); 
    setScanInputFeedback(''); 
    setDirectoryCheckFeedback('');
    setIsAuthorizedByReadOnly(false);
    setLinkedInvitation(null);

    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  return (
    <>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center space-x-3 text-center mb-8">
            <UserIcon className="w-8 h-8 text-sky-600 flex-shrink-0" />
            <h2 className="text-3xl font-bold text-sky-700">Registrar Persona</h2>
        </div>

        {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm" role="alert">{error}</p>}
        {successMessage && <p className="mb-4 text-green-700 bg-green-100 p-3 rounded-md text-sm" role="status">{successMessage}</p>}
        {scanInputFeedback && <p className="mb-4 text-blue-600 bg-blue-100 p-3 rounded-md text-sm" role="status" id="scan-feedback">{scanInputFeedback}</p>}
        {directoryCheckFeedback && <p className="mb-4 text-indigo-600 bg-indigo-100 p-3 rounded-md text-sm" role="status" id="directory-feedback">{directoryCheckFeedback}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150"
              placeholder="Ej: Juan Pérez González"
              aria-required="true"
              readOnly={!!linkedInvitation}
            />
          </div>
          <div>
            <label htmlFor="idDocument" className="block text-sm font-medium text-slate-700 mb-1">Documento ID (RUT) <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="idDocument"
              value={idDocument}
              onChange={(e) => handleIdDocumentInputChange(e.target.value)}
              onBlur={handleIdDocumentBlur}
              className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ${idDocumentError ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="Ej: 12.345.678-9, escanee o pegue QR"
              aria-required="true"
              aria-describedby={`${idDocumentError ? "idDocument-error " : ""}${scanInputFeedback ? "scan-feedback " : ""}${directoryCheckFeedback ? "directory-feedback" : ""}`.trim() || undefined}
              aria-invalid={!!idDocumentError}
            />
            {idDocumentError && <p id="idDocument-error" className="mt-1 text-xs text-red-600">{idDocumentError}</p>}
          </div>
          <div>
            <label htmlFor="apartment" className="block text-sm font-medium text-slate-700 mb-1">Apartamento/Unidad</label>
            <input
              type="text"
              id="apartment"
              value={apartment}
              onChange={(e) => setApartment(e.target.value)}
              className={`w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ${isApartmentReadOnlyForUser ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              placeholder="Ej: D-201, Casa 15"
              readOnly={isApartmentReadOnlyForUser || !!linkedInvitation}
            />
          </div>
          <div>
            <label htmlFor="authorizedBy" className="block text-sm font-medium text-slate-700 mb-1">Autorizado por</label>
            <input
              type="text"
              id="authorizedBy"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              readOnly={isApartmentReadOnlyForUser || isAuthorizedByReadOnly || !!linkedInvitation}
              className={`w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition duration-150 ${isApartmentReadOnlyForUser || isAuthorizedByReadOnly ? 'bg-slate-100 cursor-not-allowed' : ''}`}
              placeholder="Ej: Residente Apto. 101, Supervisor"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105 disabled:opacity-70"
          >
            {appSettings.conciergeModeEnabled && !isPrivilegedUser ? 'Enviar para Aprobación' : 'Registrar Ingreso Persona'}
          </button>
        </form>
      </div>
      <RutErrorModal
        isOpen={isRutErrorModalOpen}
        onClose={() => setIsRutErrorModalOpen(false)}
        message={rutModalMessage}
      />
    </>
  );
};

export default PersonForm;