import React, { useState, useEffect, useCallback } from 'react';
import { VehicleEntry, EntryType, CondominiumEntry, DirectoryUser, TenantDetails, DirectoryVehicle, Invitation, SessionUser, AppSettings } from '../types.ts';
import { addEntry } from '../services/storageService.ts';
import { findDirectoryUserByVehicleLicensePlate, getDirectoryUsers, findDirectoryUserByParkingSpot } from '../services/directoryService.ts';
import { getInvitationById, markInvitationAsUsed } from '../services/invitationService.ts';
import TruckIcon from './icons/TruckIcon.tsx'; // Import TruckIcon

interface VehicleFormProps {
  entries: CondominiumEntry[];
  onEntryAdded: (newEntries: VehicleEntry[]) => void;
  currentUser: SessionUser;
  appSettings: AppSettings;
  userProfile: (DirectoryUser & { isSuperuser?: boolean }) | null;
  invitationIdToProcess?: string | null;
  onInvitationProcessed?: () => void;
}

// Unified PotentialChoice interface
interface PotentialChoice {
    source: 'apartmentSearchFullUsers' | 'apartmentSearchOwnerWithEmbeddedTenant';
    owner: DirectoryUser;
    // For 'apartmentSearchFullUsers', tenantUser is a DirectoryUser (separate entry)
    // For 'apartmentSearchOwnerWithEmbeddedTenant', embeddedTenant is TenantDetails (embedded in owner)
    tenantUser?: DirectoryUser; 
    embeddedTenant?: TenantDetails; 
}


const VehicleForm: React.FC<VehicleFormProps> = ({ entries, onEntryAdded, currentUser, appSettings, userProfile, invitationIdToProcess, onInvitationProcessed }) => {
  const [licensePlate, setLicensePlate] = useState('');
  const [driverName, setDriverName] = useState('');
  const [authorizedBy, setAuthorizedBy] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [directoryCheckFeedback, setDirectoryCheckFeedback] = useState('');
  const [licensePlateError, setLicensePlateError] = useState('');
  const [linkedInvitation, setLinkedInvitation] = useState<Invitation | null>(null);

  const [authorizingResidentSearchTerm, setAuthorizingResidentSearchTerm] = useState('');
  const [authorizingResidentSuggestions, setAuthorizingResidentSuggestions] = useState<DirectoryUser[]>([]);
  const [selectedAuthorizingResident, setSelectedAuthorizingResident] = useState<DirectoryUser | null>(null);
  const [isEmbeddedTenantAuthorizing, setIsEmbeddedTenantAuthorizing] = useState(false);

  const [authorizerChoiceRequired, setAuthorizerChoiceRequired] = useState(false);
  const [potentialChoiceDetails, setPotentialChoiceDetails] = useState<PotentialChoice | null>(null);
  const [chosenAuthorizerType, setChosenAuthorizerType] = useState<'owner' | 'tenant' | null>(null);

  const [residentVehicles, setResidentVehicles] = useState<DirectoryVehicle[]>([]);
  const [selectedResidentVehicleLicensePlate, setSelectedResidentVehicleLicensePlate] = useState<string>('');
  
  // New states for unit parking spots
  const [vehicleParkingSpot, setVehicleParkingSpot] = useState('');
  const [selectedUnitParkingSpot, setSelectedUnitParkingSpot] = useState<string>('');
  const [availableUnitParkingSpots, setAvailableUnitParkingSpots] = useState<string[]>([]);
  const [parkingSpotError, setParkingSpotError] = useState('');


  const MIN_PLATE_LENGTH_FOR_CHECK = 4;
  const allDirectoryUsers = getDirectoryUsers(); 

  const canAutoApprove = userProfile?.permissions?.authorizeVehicles ?? false;

  const handleInvitationScan = (invitationId: string) => {
    const invitation = getInvitationById(invitationId);
    
    if (!invitation) {
        setDirectoryCheckFeedback(`Error: Invitación con ID ${invitationId} no encontrada.`);
        setTimeout(() => setDirectoryCheckFeedback(''), 7000);
        return;
    }

    if (invitation.type !== 'vehicle') {
        setDirectoryCheckFeedback(`Error: La invitación es para una persona, no un vehículo.`);
        setTimeout(() => setDirectoryCheckFeedback(''), 7000);
        return;
    }

    // FIX: Property 'expiresAt' does not exist on type 'Invitation'.
    if (invitation.status !== 'active' || new Date(invitation.validUntil) < new Date()) {
        setDirectoryCheckFeedback(`Error: La invitación está ${invitation.status} o ha expirado.`);
        setTimeout(() => setDirectoryCheckFeedback(''), 7000);
        return;
    }
    
    setLinkedInvitation(invitation);
    setLicensePlate(invitation.licensePlate || '');
    setDriverName(invitation.guestName || '');
    setVehicleParkingSpot(''); // Parking spot is for the VISIT, not from invitation itself
    setAuthorizedBy(`Invitación de ${invitation.createdByUserName} (Apto ${invitation.apartment})`);
    setDirectoryCheckFeedback(`Invitación válida encontrada para vehículo ${invitation.licensePlate}.`);
    setTimeout(() => setDirectoryCheckFeedback(''), 7000);
  };
  
  useEffect(() => {
    if (invitationIdToProcess && onInvitationProcessed) {
      handleInvitationScan(invitationIdToProcess);
      onInvitationProcessed();
    }
  }, [invitationIdToProcess, onInvitationProcessed]);

  const updateAuthorizedByText = useCallback(() => {
    let baseAuthText = '';
    let parkingSuffix = '';

    if (linkedInvitation) {
        setAuthorizedBy(`Invitación de ${linkedInvitation.createdByUserName} (Apto ${linkedInvitation.apartment})`);
        return;
    }

    if (selectedAuthorizingResident) {
        if (isEmbeddedTenantAuthorizing && potentialChoiceDetails?.source === 'apartmentSearchOwnerWithEmbeddedTenant' && potentialChoiceDetails.embeddedTenant) {
            baseAuthText = `Visita Autorizada por Arrendatario (reg. Prop.): ${potentialChoiceDetails.embeddedTenant.name} (Apto. ${selectedAuthorizingResident.apartment || 'N/A'})`;
        } else {
            baseAuthText = `Visita para: ${selectedAuthorizingResident.name} (Apto: ${selectedAuthorizingResident.apartment || 'N/A'})`;
        }
    } else if (chosenAuthorizerType && potentialChoiceDetails) {
        // This case is largely handled by selectedAuthorizingResident being set after choice. Included for robustness.
        const { source, owner, tenantUser, embeddedTenant } = potentialChoiceDetails;
        if (source === 'apartmentSearchOwnerWithEmbeddedTenant') {
            if (chosenAuthorizerType === 'owner') {
                baseAuthText = `Visita Autorizada por Propietario: ${owner.name} (Apto. ${owner.apartment || 'N/A'})`;
            } else if (chosenAuthorizerType === 'tenant' && embeddedTenant) {
                 baseAuthText = `Visita Autorizada por Arrendatario (reg. Prop.): ${embeddedTenant.name} (Apto. ${owner.apartment || 'N/A'})`;
            }
        } else if (source === 'apartmentSearchFullUsers') {
             if (chosenAuthorizerType === 'owner') {
                baseAuthText = `Visita Autorizada por Propietario: ${owner.name} (Apto. ${owner.apartment || 'N/A'})`;
            } else if (chosenAuthorizerType === 'tenant' && tenantUser) {
                baseAuthText = `Visita Autorizada por Arrendatario: ${tenantUser.name} (Apto. ${tenantUser.apartment || 'N/A'})`;
            }
        }
    } else {
        // Fallback or plate-based authorization (handled in licensePlate useEffect)
        // Keep existing authorizedBy if none of the above conditions are met and it was set by plate logic
        if (authorizedBy.startsWith("Vehículo en directorio:") || authorizedBy.startsWith("Autorizado por Arrendatario:")) {
             baseAuthText = authorizedBy; // Keep this specific type of auth text
        }
    }

    if (selectedUnitParkingSpot && vehicleParkingSpot === selectedUnitParkingSpot && !parkingSpotError) {
        parkingSuffix = `, usando Est. Unidad: ${selectedUnitParkingSpot}`;
    }
    
    // Only update if baseAuthText is not empty or if parkingSuffix needs to be appended to an existing plate-based auth
    if (baseAuthText && !baseAuthText.startsWith("Vehículo en directorio:") && !baseAuthText.startsWith("Autorizado por Arrendatario:")) {
        setAuthorizedBy(baseAuthText + parkingSuffix);
    } else if ((baseAuthText.startsWith("Vehículo en directorio:") || baseAuthText.startsWith("Autorizado por Arrendatario:")) && parkingSuffix) {
        // If it's a plate-based auth, we might want to append parking info if resident matches
        // This can get complex. For now, if a resident is selected, resident-based auth text takes precedence.
        // If no resident is selected, but plate match gave auth text, and THEN somehow a unit spot is picked (not current flow),
        // it would append. This is unlikely. The primary flow is select resident THEN select their spot.
    } else if (!selectedAuthorizingResident && !chosenAuthorizerType && !parkingSuffix && !authorizedBy.startsWith("Vehículo en directorio:") && !authorizedBy.startsWith("Autorizado por Arrendatario:")) {
        // If everything is cleared, clear authorizedBy unless it's a plate-specific message
        setAuthorizedBy('');
    }

  }, [selectedAuthorizingResident, selectedUnitParkingSpot, vehicleParkingSpot, parkingSpotError, isEmbeddedTenantAuthorizing, potentialChoiceDetails, chosenAuthorizerType, authorizedBy, linkedInvitation]);


  useEffect(() => {
    updateAuthorizedByText();
  }, [selectedUnitParkingSpot, vehicleParkingSpot, parkingSpotError, updateAuthorizedByText]);

  useEffect(() => {
    // Check for invitation JSON
    try {
        const potentialJSON = JSON.parse(licensePlate);
        if (potentialJSON.type === 'inv' && potentialJSON.id) {
            handleInvitationScan(potentialJSON.id);
            return; // Exit early
        }
    } catch(e) {
        // Not a JSON, proceed
    }

    const minLengthMet = licensePlate.trim().length >= MIN_PLATE_LENGTH_FOR_CHECK;

    if (selectedAuthorizingResident && !isEmbeddedTenantAuthorizing && !selectedResidentVehicleLicensePlate) { 
      if (potentialChoiceDetails?.source !== 'apartmentSearchOwnerWithEmbeddedTenant' && potentialChoiceDetails?.source !== 'apartmentSearchFullUsers') {
        setAuthorizerChoiceRequired(false);
        setPotentialChoiceDetails(null);
        setChosenAuthorizerType(null);
      }
      const cleanedPlateInfo = licensePlate.trim().toUpperCase();
      if(minLengthMet) {
          const directoryMatchInfo = findDirectoryUserByVehicleLicensePlate(cleanedPlateInfo);
          if (directoryMatchInfo) {
              setDirectoryCheckFeedback(`Placa ${cleanedPlateInfo} pertenece a ${directoryMatchInfo.user.name}. Autorización manual por ${selectedAuthorizingResident.name} tiene prioridad.`);
          } else {
              setDirectoryCheckFeedback(`Placa ${cleanedPlateInfo} no encontrada en directorio. Autorización manual por ${selectedAuthorizingResident.name}.`);
          }
           setTimeout(() => setDirectoryCheckFeedback(''), 7000);
      } else {
         if (!selectedResidentVehicleLicensePlate) setDirectoryCheckFeedback(''); 
      }
      return;
    }


    if (!minLengthMet) {
      if (!selectedResidentVehicleLicensePlate) { 
        setDirectoryCheckFeedback('');
      }
      if (!isEmbeddedTenantAuthorizing && !selectedAuthorizingResident && !selectedResidentVehicleLicensePlate && !selectedUnitParkingSpot && !linkedInvitation) { 
          setAuthorizedBy('');
      }
      if (potentialChoiceDetails?.source !== 'apartmentSearchOwnerWithEmbeddedTenant' && potentialChoiceDetails?.source !== 'apartmentSearchFullUsers') {
        setAuthorizerChoiceRequired(false);
        setPotentialChoiceDetails(null);
        setChosenAuthorizerType(null);
      }
      return;
    }

    const cleanedPlate = licensePlate.trim().toUpperCase();
    const directoryMatch = findDirectoryUserByVehicleLicensePlate(cleanedPlate);

    if (potentialChoiceDetails?.source !== 'apartmentSearchOwnerWithEmbeddedTenant' && potentialChoiceDetails?.source !== 'apartmentSearchFullUsers') {
        setAuthorizerChoiceRequired(false);
        setPotentialChoiceDetails(null);
        setChosenAuthorizerType(null);
    }


    if (directoryMatch) {
      const directoryOwner = directoryMatch.user;
      const ownerEmbeddedTenant = directoryOwner.tenant;

      if (!selectedAuthorizingResident && !isEmbeddedTenantAuthorizing && !selectedResidentVehicleLicensePlate && !selectedUnitParkingSpot) {
        if (directoryOwner.role === 'Propietario' && ownerEmbeddedTenant?.name) {
          setAuthorizedBy(`Autorizado por Arrendatario: ${ownerEmbeddedTenant.name} (Unidad ${directoryOwner.apartment || 'N/A'}, Prop. ${directoryOwner.name})`);
          if (!driverName.trim()) {
            setDriverName(ownerEmbeddedTenant.name); 
          }
          setDirectoryCheckFeedback(`Placa encontrada. Autorización por defecto: Arrendatario ${ownerEmbeddedTenant.name}.`);
        } else {
          setAuthorizedBy(
            `Vehículo en directorio: ${directoryOwner.name}${directoryOwner.apartment ? `, Apto: ${directoryOwner.apartment}` : ''} (Placa: ${directoryMatch.vehicle.licensePlate})`
          );
          if (!driverName.trim()) {
            setDriverName(directoryOwner.name);
          }
          let feedback = `Esta placa ya existe en el directorio (Vehículo de: ${directoryOwner.name}).`;
          if (directoryMatch.vehicle.parkingSpot) {
            feedback += ` Estacionamiento asignado en directorio (del vehículo): ${directoryMatch.vehicle.parkingSpot}.`;
          }
          feedback += " Si es un reingreso, considere usar Acceso Rápido.";
          setDirectoryCheckFeedback(feedback);
        }
      } else if (selectedResidentVehicleLicensePlate && selectedAuthorizingResident) {
         setDirectoryCheckFeedback(`Vehículo ${cleanedPlate} seleccionado de ${selectedAuthorizingResident.name}.`);
      }
    } else { 
      if (!selectedAuthorizingResident && !isEmbeddedTenantAuthorizing && !selectedResidentVehicleLicensePlate && !selectedUnitParkingSpot) { 
          setDirectoryCheckFeedback('Esta placa no se encontró en el directorio.');
          if (!linkedInvitation) setAuthorizedBy(''); 
      } else if (selectedResidentVehicleLicensePlate) {
          setDirectoryCheckFeedback(`Placa ${cleanedPlate} (de vehículo de residente) no encontrada globalmente. OK para registrar.`);
      }
    }
     setTimeout(() => {
        if (!authorizerChoiceRequired || (authorizerChoiceRequired && chosenAuthorizerType) || selectedResidentVehicleLicensePlate || selectedUnitParkingSpot) {
             setDirectoryCheckFeedback('');
        }
    }, 7000);

  }, [licensePlate, driverName, selectedAuthorizingResident, isEmbeddedTenantAuthorizing, selectedResidentVehicleLicensePlate, selectedUnitParkingSpot, linkedInvitation]); 


  useEffect(() => {
    if (isEmbeddedTenantAuthorizing && potentialChoiceDetails?.source === 'apartmentSearchOwnerWithEmbeddedTenant' && chosenAuthorizerType === 'tenant') {
        // Handled by chosenAuthorizerType useEffect
    } else {
        setIsEmbeddedTenantAuthorizing(false); 
    }

    if (selectedAuthorizingResident) {
      setResidentVehicles(selectedAuthorizingResident.vehicles || []);
      setAvailableUnitParkingSpots(selectedAuthorizingResident.unitParkingSpots || []);
      
      if (potentialChoiceDetails?.source !== 'apartmentSearchOwnerWithEmbeddedTenant' && potentialChoiceDetails?.source !== 'apartmentSearchFullUsers' ) {
           setAuthorizerChoiceRequired(false); 
      }
      
      // Pre-fill driver name if not already filled or if it was based on a generic plate match
      if (!driverName.trim() || authorizedBy.startsWith("Vehículo en directorio:") || authorizedBy.startsWith("Autorizado por Arrendatario:")) {
         if (!selectedResidentVehicleLicensePlate && !isEmbeddedTenantAuthorizing) { 
            setDriverName(selectedAuthorizingResident.name);
        }
      }
      // AuthorizedBy text is now handled by updateAuthorizedByText or chosenAuthorizerType effect
      updateAuthorizedByText();

    } else {
      setResidentVehicles([]);
      setAvailableUnitParkingSpots([]);
      // If selectedAuthorizingResident is cleared, also clear unit parking spot selections
      setSelectedUnitParkingSpot('');
      setVehicleParkingSpot('');
      setParkingSpotError('');
    }
  }, [selectedAuthorizingResident, driverName, updateAuthorizedByText]); 


  useEffect(() => {
    if (authorizerChoiceRequired && chosenAuthorizerType && potentialChoiceDetails) {
        const { source, owner, tenantUser, embeddedTenant } = potentialChoiceDetails;
        let chosenActualResident: DirectoryUser | null = null;
        let dName = '';

        if (source === 'apartmentSearchOwnerWithEmbeddedTenant') {
            chosenActualResident = owner; 
            if (chosenAuthorizerType === 'owner') {
                dName = owner.name;
                setIsEmbeddedTenantAuthorizing(false);
            } else if (chosenAuthorizerType === 'tenant' && embeddedTenant) {
                dName = embeddedTenant.name;
                setIsEmbeddedTenantAuthorizing(true);
            }
        } else if (source === 'apartmentSearchFullUsers') {
            if (chosenAuthorizerType === 'owner') {
                chosenActualResident = owner;
            } else if (chosenAuthorizerType === 'tenant' && tenantUser) {
                chosenActualResident = tenantUser;
            }
            setIsEmbeddedTenantAuthorizing(false); 
        }
        
        if (chosenActualResident) {
            setSelectedAuthorizingResident(chosenActualResident); 
            // updateAuthorizedByText will be called by selectedAuthorizingResident's useEffect
            if (dName) setDriverName(dName);       
        }
    }
  }, [chosenAuthorizerType, potentialChoiceDetails, authorizerChoiceRequired]);


  const handleAuthorizingResidentSearch = (term: string) => {
    setAuthorizingResidentSearchTerm(term);
    setSelectedAuthorizingResident(null); 
    setAuthorizerChoiceRequired(false);   
    setPotentialChoiceDetails(null);
    setChosenAuthorizerType(null);
    setIsEmbeddedTenantAuthorizing(false);
    setResidentVehicles([]); 
    setSelectedResidentVehicleLicensePlate(''); 
    setAvailableUnitParkingSpots([]);
    setSelectedUnitParkingSpot('');
    setVehicleParkingSpot('');
    setParkingSpotError('');


    if (term.trim().length > 1) {
      const lowerTerm = term.toLowerCase();
      const targetApt = term.trim().toUpperCase(); 
      
      const ownerForApt = allDirectoryUsers.find(u => u.role === 'Propietario' && u.apartment?.toUpperCase() === targetApt);
      const tenantUserForApt = allDirectoryUsers.find(u => u.role === 'Arrendatario' && u.apartment?.toUpperCase() === targetApt);

      if (ownerForApt && ownerForApt.tenant?.name) { 
          setAuthorizerChoiceRequired(true);
          setPotentialChoiceDetails({ 
              source: 'apartmentSearchOwnerWithEmbeddedTenant', 
              owner: ownerForApt, 
              embeddedTenant: ownerForApt.tenant 
          });
          setChosenAuthorizerType(null);
          setAuthorizingResidentSuggestions([]);
          setAuthorizedBy(''); 
          setDirectoryCheckFeedback(`Apto ${targetApt}. Propietario (${ownerForApt.name}) tiene Arrendatario reg. (${ownerForApt.tenant.name}). Elija autorizador.`);
          return;
      }
      if (ownerForApt && tenantUserForApt) { 
        setAuthorizerChoiceRequired(true);
        setPotentialChoiceDetails({ source: 'apartmentSearchFullUsers', owner: ownerForApt, tenantUser: tenantUserForApt });
        setChosenAuthorizerType(null);
        setAuthorizingResidentSuggestions([]);
        setAuthorizedBy('');
        setDirectoryCheckFeedback(`Apartamento ${targetApt} tiene Propietario y Arrendatario (separados). Elija quién autoriza.`);
        return; 
      }
      
      const filteredUsers = allDirectoryUsers.filter(user =>
        (user.role === 'Propietario' || user.role === 'Arrendatario') && 
        (user.name.toLowerCase().includes(lowerTerm) || 
         (user.apartment && user.apartment.toLowerCase().includes(lowerTerm)))
      );
      setAuthorizingResidentSuggestions(filteredUsers.slice(0, 5));

      if (filteredUsers.length === 0 && term.trim().length > 2) {
         setDirectoryCheckFeedback('Ningún Propietario o Arrendatario coincide con la búsqueda.');
      } else if (filteredUsers.length > 0) {
         setDirectoryCheckFeedback(`${filteredUsers.length} residente(s) encontrado(s). Seleccione uno si aplica.`);
      } else {
         setDirectoryCheckFeedback('');
      }

    } else {
      setAuthorizingResidentSuggestions([]);
      setDirectoryCheckFeedback('');
      if (term.trim() === '') { 
        setSelectedAuthorizingResident(null); 
        setIsEmbeddedTenantAuthorizing(false);
        setResidentVehicles([]);
        setSelectedResidentVehicleLicensePlate('');
        setAvailableUnitParkingSpots([]);
        setSelectedUnitParkingSpot('');
        setVehicleParkingSpot('');
        setParkingSpotError('');
      }
    }
  };

  const handleSelectAuthorizingResident = (resident: DirectoryUser) => {
    setSelectedAuthorizingResident(resident); 
    setAuthorizingResidentSearchTerm(`${resident.name} (${resident.apartment || 'N/A'})`);
    setAuthorizingResidentSuggestions([]);
    
    setAuthorizerChoiceRequired(false);
    setPotentialChoiceDetails(null);
    setChosenAuthorizerType(null);
    setIsEmbeddedTenantAuthorizing(false); 
    
    setLicensePlate(''); 
    setSelectedResidentVehicleLicensePlate('');
    setSelectedUnitParkingSpot('');
    setVehicleParkingSpot('');
    setParkingSpotError('');
    setLinkedInvitation(null);
    
    setDirectoryCheckFeedback('');
  };
  
  const handleSelectResidentVehicle = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const plate = e.target.value;
    setSelectedResidentVehicleLicensePlate(plate);
    if (plate) {
      setLicensePlate(plate);
      if (!driverName.trim() && selectedAuthorizingResident && !isEmbeddedTenantAuthorizing) {
        setDriverName(selectedAuthorizingResident.name);
      }
    } else {
      setLicensePlate('');
    }
  };

  const handleSelectUnitParkingSpot = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const spot = e.target.value;
    setSelectedUnitParkingSpot(spot); // Updates the dropdown's controlled value
    setParkingSpotError(''); 

    if (spot) {
      setVehicleParkingSpot(spot); // Sets the spot to be saved
      // Availability check
      const isOccupied = entries.some(entry => 
        entry.type === EntryType.VEHICLE && 
        (entry as VehicleEntry).parkingSpot?.trim().toUpperCase() === spot.toUpperCase()
      );
      if (isOccupied) {
        setParkingSpotError(`El estacionamiento de unidad '${spot}' ya está ocupado.`);
      }
    } else {
      setVehicleParkingSpot(''); // Clears the spot to be saved
    }
    // updateAuthorizedByText will be called by its own useEffect due to selectedUnitParkingSpot change
  };


  const handleChooseAuthorizerType = (type: 'owner' | 'tenant') => {
    setChosenAuthorizerType(type); 
    setAuthorizingResidentSuggestions([]); 
    setAuthorizingResidentSearchTerm(''); 
    setSelectedResidentVehicleLicensePlate('');
    setLicensePlate('');
    setSelectedUnitParkingSpot('');
    setVehicleParkingSpot('');
    setParkingSpotError('');
    setLinkedInvitation(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const currentDirectoryFeedback = directoryCheckFeedback; 
    const isChoiceStillPending = authorizerChoiceRequired && !chosenAuthorizerType && potentialChoiceDetails;

    setError('');
    setSuccessMessage('');
    if (!isChoiceStillPending && !selectedResidentVehicleLicensePlate && !selectedUnitParkingSpot) setDirectoryCheckFeedback(''); 
    setLicensePlateError('');
    // Keep parkingSpotError if it exists unless form is fully reset

    const trimmedLicensePlate = licensePlate.trim().toUpperCase();

    if (!trimmedLicensePlate) {
      setLicensePlateError('La Placa Patente es obligatoria.');
      setError('Por favor, ingrese la placa patente.');
      if(isChoiceStillPending) setDirectoryCheckFeedback(currentDirectoryFeedback);
      if(selectedResidentVehicleLicensePlate && !trimmedLicensePlate) setDirectoryCheckFeedback(`Vehículo ${selectedResidentVehicleLicensePlate} seleccionado, pero placa está vacía.`);
      return;
    }
    if (isChoiceStillPending) { 
        setError('Por favor, elija quién autoriza el ingreso.');
        setDirectoryCheckFeedback(currentDirectoryFeedback); 
        return;
    }
    if (parkingSpotError) {
        setError(`Error de Estacionamiento: ${parkingSpotError}`);
        return;
    }
    
    let finalAuthorizedBy = authorizedBy.trim() || undefined;
    const initialStatus = appSettings.conciergeModeEnabled && !canAutoApprove ? 'pending' : 'approved';


    const newVehicleEntry: Omit<VehicleEntry, 'id' | 'timestamp'> = {
      type: EntryType.VEHICLE,
      licensePlate: trimmedLicensePlate,
      driverName: driverName.trim() || undefined,
      parkingSpot: vehicleParkingSpot.trim() || undefined,
      authorizedBy: finalAuthorizedBy,
      invitationId: linkedInvitation?.id,
      status: initialStatus,
    };
    
    const updatedEntries = addEntry(newVehicleEntry as VehicleEntry);

    if (linkedInvitation) {
        const newEntryRecord = updatedEntries.find(entry => entry.id === entry.id && (entry as VehicleEntry).invitationId === linkedInvitation.id);
        if (newEntryRecord) {
            markInvitationAsUsed(linkedInvitation.id, newEntryRecord.id);
        }
    }

    onEntryAdded(updatedEntries as VehicleEntry[]);
    
    const successMsg = initialStatus === 'pending'
      ? 'Registro de vehículo enviado para aprobación.'
      : 'Vehículo registrado exitosamente!';

    setSuccessMessage(successMsg);
    setLicensePlate('');
    setDriverName('');
    setAuthorizedBy('');
    setLicensePlateError('');
    setSelectedAuthorizingResident(null);
    setAuthorizingResidentSearchTerm('');
    setAuthorizerChoiceRequired(false);
    setPotentialChoiceDetails(null);
    setChosenAuthorizerType(null);
    setDirectoryCheckFeedback(''); 
    setIsEmbeddedTenantAuthorizing(false);
    setResidentVehicles([]);
    setSelectedResidentVehicleLicensePlate('');
    setVehicleParkingSpot('');
    setSelectedUnitParkingSpot('');
    setAvailableUnitParkingSpots([]);
    setParkingSpotError('');
    setLinkedInvitation(null);


    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  const getChoiceLabel = (type: 'owner' | 'tenant'): string => {
    if (!potentialChoiceDetails) return '';
    const { source, owner, tenantUser, embeddedTenant } = potentialChoiceDetails;

    if (type === 'owner') {
        return `Propietario: ${owner.name} (${owner.apartment || 'N/A'})`;
    }
    if (type === 'tenant') {
        if (source === 'apartmentSearchOwnerWithEmbeddedTenant' && embeddedTenant) {
            return `Arrendatario (reg. con Prop.): ${embeddedTenant.name}`;
        }
        if (source === 'apartmentSearchFullUsers' && tenantUser) {
            return `Arrendatario: ${tenantUser.name} (${tenantUser.apartment || 'N/A'})`;
        }
    }
    return 'Opción inválida';
  };


  return (
    <>
      <div className="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto">
        <div className="flex items-center justify-center space-x-3 text-center mb-8">
            <TruckIcon className="w-8 h-8 text-teal-600 flex-shrink-0" />
            <h2 className="text-3xl font-bold text-teal-700">Registrar Vehículo Visita</h2>
        </div>

        {error && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm" role="alert">{error}</p>}
        {successMessage && <p className="mb-4 text-green-700 bg-green-100 p-3 rounded-md text-sm" role="status">{successMessage}</p>}
        {directoryCheckFeedback && !successMessage && (
            <p className="mb-4 text-indigo-600 bg-indigo-100 p-3 rounded-md text-sm" role="status">{directoryCheckFeedback}</p>
        )}
         {parkingSpotError && <p className="mb-4 text-red-600 bg-red-100 p-3 rounded-md text-sm" role="alert">{parkingSpotError}</p>}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="authorizingResidentSearch" className="block text-sm font-medium text-slate-700 mb-1">
              Residente que Autoriza (Nombre/Unidad - Opcional)
            </label>
            <input
              type="text"
              id="authorizingResidentSearch"
              value={authorizingResidentSearchTerm}
              onChange={(e) => handleAuthorizingResidentSearch(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
              placeholder="Buscar Propietario/Arrendatario por Nombre o Unidad"
              autoComplete="off"
              disabled={(authorizerChoiceRequired && potentialChoiceDetails !== null) || !!linkedInvitation}
            />
            {authorizingResidentSuggestions.length > 0 && !authorizerChoiceRequired && (
              <ul className="border border-slate-300 rounded-md mt-1 max-h-40 overflow-y-auto bg-white shadow-lg z-10">
                {authorizingResidentSuggestions.map(user => (
                  <li key={user.id} 
                      onClick={() => handleSelectAuthorizingResident(user)}
                      className="p-2 hover:bg-teal-50 cursor-pointer text-sm">
                    {user.name} ({user.apartment || 'N/A'}) - {user.role}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {authorizerChoiceRequired && potentialChoiceDetails && (
            <div className="p-3 my-2 rounded-md border border-indigo-200 bg-indigo-50">
              <p className="text-sm font-medium text-indigo-700 mb-2">
                {`Apartamento ${potentialChoiceDetails.owner.apartment || 'N/A'} tiene múltiples opciones. Elija quién autoriza:`}
              </p>
              <div className="space-y-1.5">
                <div>
                  <input 
                    type="radio" 
                    id="chooseOwner" 
                    name="authorizerChoice" 
                    value="owner"
                    checked={chosenAuthorizerType === 'owner'}
                    onChange={() => handleChooseAuthorizerType('owner')}
                    className="mr-2 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                  />
                  <label htmlFor="chooseOwner" className="text-sm text-slate-700">
                     {getChoiceLabel('owner')}
                  </label>
                </div>
                {(potentialChoiceDetails.source === 'apartmentSearchFullUsers' || potentialChoiceDetails.source === 'apartmentSearchOwnerWithEmbeddedTenant') && ( 
                    <div>
                    <input 
                        type="radio" 
                        id="chooseTenant" 
                        name="authorizerChoice" 
                        value="tenant"
                        checked={chosenAuthorizerType === 'tenant'}
                        onChange={() => handleChooseAuthorizerType('tenant')}
                        className="mr-2 h-4 w-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                    />
                    <label htmlFor="chooseTenant" className="text-sm text-slate-700">
                        {getChoiceLabel('tenant')}
                    </label>
                    </div>
                )}
              </div>
            </div>
          )}
          
          {selectedAuthorizingResident && residentVehicles.length > 0 && (
            <div>
              <label htmlFor="residentVehicleSelect" className="block text-sm font-medium text-slate-700 mb-1">
                Usar vehículo del residente (Opcional):
              </label>
              <select
                id="residentVehicleSelect"
                value={selectedResidentVehicleLicensePlate}
                onChange={handleSelectResidentVehicle}
                className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              >
                <option value="">-- Seleccione un vehículo --</option>
                {residentVehicles.map(vehicle => (
                  <option key={vehicle.id} value={vehicle.licensePlate}>
                    {vehicle.licensePlate} {vehicle.parkingSpot ? `(Est.Veh: ${vehicle.parkingSpot})` : ''} {vehicle.notes ? `- ${vehicle.notes}`: ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedAuthorizingResident && availableUnitParkingSpots.length > 0 && (
            <div>
              <label htmlFor="unitParkingSpotSelect" className="block text-sm font-medium text-slate-700 mb-1">
                Asignar Estacionamiento de la Unidad (Opcional):
              </label>
              <select
                id="unitParkingSpotSelect"
                value={selectedUnitParkingSpot}
                onChange={handleSelectUnitParkingSpot}
                className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 bg-white 
                           ${parkingSpotError ? 'border-red-500' : 'border-slate-300'}`}
                aria-invalid={!!parkingSpotError}
                aria-describedby={parkingSpotError ? "unitParkingSpot-error-desc" : undefined}
              >
                <option value="">-- Seleccione estacionamiento --</option>
                {availableUnitParkingSpots.map(spot => (
                  <option key={spot} value={spot}>
                    {spot}
                  </option>
                ))}
              </select>
              {parkingSpotError && <p id="unitParkingSpot-error-desc" className="mt-1 text-xs text-red-600">{parkingSpotError}</p>}
            </div>
          )}
          
          {/* Display for confirmed unit parking spot */}
          {selectedAuthorizingResident && selectedUnitParkingSpot && vehicleParkingSpot && !parkingSpotError && (
            <div className="mt-2 p-3 bg-teal-50 border border-teal-200 rounded-md">
              <p className="text-sm font-medium text-teal-700">
                <span className="font-semibold">Estacionamiento a ocupar:</span> {vehicleParkingSpot}
              </p>
              <p className="text-xs text-teal-600">Este estacionamiento pertenece a la unidad del residente que autoriza.</p>
            </div>
          )}


          <div>
            <label htmlFor="licensePlate" className="block text-sm font-medium text-slate-700 mb-1">Placa Patente <span className="text-red-500">*</span></label>
            <input
              type="text"
              id="licensePlate"
              value={licensePlate}
              onChange={(e) => {
                setLinkedInvitation(null);
                setLicensePlate(e.target.value);
                if (e.target.value.trim()) setLicensePlateError('');
                if (selectedResidentVehicleLicensePlate) setSelectedResidentVehicleLicensePlate('');
                if ((potentialChoiceDetails?.source === 'apartmentSearchOwnerWithEmbeddedTenant' || potentialChoiceDetails?.source === 'apartmentSearchFullUsers') && authorizerChoiceRequired) {
                    setAuthorizingResidentSearchTerm(''); 
                    setSelectedAuthorizingResident(null); 
                    setAuthorizerChoiceRequired(false);
                    setPotentialChoiceDetails(null);
                    setChosenAuthorizerType(null);
                    setIsEmbeddedTenantAuthorizing(false);
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150 ${licensePlateError ? 'border-red-500' : 'border-slate-300'}`}
              placeholder="Ej: ABCD12 o pegue QR"
              aria-required="true"
              aria-invalid={!!licensePlateError}
              aria-describedby={licensePlateError ? "licensePlate-error-desc" : undefined}
              readOnly={!!linkedInvitation}
            />
            {licensePlateError && <p id="licensePlate-error-desc" className="mt-1 text-xs text-red-600">{licensePlateError}</p>}
          </div>

          <div>
            <label htmlFor="driverName" className="block text-sm font-medium text-slate-700 mb-1">Nombre del Conductor (Opcional)</label>
            <input
              type="text"
              id="driverName"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition duration-150"
              placeholder="Ej: Ana Rodríguez"
              readOnly={!!linkedInvitation}
            />
          </div>
          
          <div>
            <label htmlFor="authorizedBy" className="block text-sm font-medium text-slate-700 mb-1">Autorizado por</label>
            <input
              type="text"
              id="authorizedBy"
              value={authorizedBy}
              onChange={(e) => setAuthorizedBy(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-slate-50"
              placeholder="Automático o manual"
              readOnly={!!linkedInvitation}
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-opacity-50 transition duration-150 transform hover:scale-105 disabled:opacity-70"
            disabled={!!parkingSpotError}
          >
            {appSettings.conciergeModeEnabled && !canAutoApprove ? 'Enviar para Aprobación' : 'Registrar Ingreso Vehículo'}
          </button>
        </form>
      </div>
    </>
  );
};

export default VehicleForm;