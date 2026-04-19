import { TruckIcon } from '../components/icons.js';
import { addEntry } from '../services/storageService.js';
import { findDirectoryUserByVehicleLicensePlate, getDirectoryUsers } from '../services/directoryService.js';
import { getInvitationById, markInvitationAsUsed } from '../services/invitationService.js';
import { EntryType } from '../constants.js';
import { showFeedback } from '../utils.js';
import { state } from '../state.js';

let localState = {
    licensePlate: '',
    driverName: '',
    authorizedBy: '',
    vehicleParkingSpot: '',
    directoryCheckFeedback: '',
    authorizingResidentSearchTerm: '',
    authorizingResidentSuggestions: [],
    selectedAuthorizingResident: null,
    authorizerChoiceRequired: false,
    potentialChoiceDetails: null,
    residentVehicles: [],
    availableUnitParkingSpots: [],
    linkedInvitation: null,
};

function resetForm() {
    document.getElementById('vehicle-form').reset();
    localState = {
        licensePlate: '', driverName: '', authorizedBy: '', vehicleParkingSpot: '',
        directoryCheckFeedback: '', authorizingResidentSearchTerm: '',
        authorizingResidentSuggestions: [], selectedAuthorizingResident: null,
        authorizerChoiceRequired: false, potentialChoiceDetails: null, residentVehicles: [],
        availableUnitParkingSpots: [], linkedInvitation: null,
    };
    updateUI();
}

function updateUI() {
    const feedbackEl = document.getElementById('directory-feedback');
    feedbackEl.innerHTML = localState.directoryCheckFeedback ? `<p class="mb-4 text-indigo-600 bg-indigo-100 p-3 rounded-md text-sm">${localState.directoryCheckFeedback}</p>` : '';
    
    // This function would need to be very complex to update the entire UI statefully.
    // A full re-render is simpler in vanilla JS without a framework.
    // For this conversion, key elements will be updated manually.
    document.getElementById('licensePlate').value = localState.licensePlate;
    document.getElementById('driverName').value = localState.driverName;
    document.getElementById('authorizedBy').value = localState.authorizedBy;
}

function handleInvitationScan(invitationId) {
    const invitation = getInvitationById(invitationId);
    if (!invitation || invitation.type !== 'vehicle' || invitation.status !== 'active' || new Date(invitation.expiresAt) < new Date()) {
        localState.directoryCheckFeedback = `Error: Invitación no válida.`;
        updateUI();
        return;
    }
    
    localState.linkedInvitation = invitation;
    localState.licensePlate = invitation.licensePlate || '';
    localState.driverName = invitation.guestName || '';
    localState.authorizedBy = `Invitación de ${invitation.createdByUserName}`;
    localState.directoryCheckFeedback = `Invitación válida encontrada para ${invitation.licensePlate}.`;
    updateUI();
}

function handleLicensePlateInput(e) {
    localState.licensePlate = e.target.value.toUpperCase();
    
    try {
        const potentialJSON = JSON.parse(localState.licensePlate);
        if (potentialJSON.type === 'inv' && potentialJSON.id) {
            handleInvitationScan(potentialJSON.id);
            return;
        }
    } catch(err) { /* Not JSON */ }

    if (localState.licensePlate.length >= 4) {
        const match = findDirectoryUserByVehicleLicensePlate(localState.licensePlate);
        if (match) {
            localState.directoryCheckFeedback = `Placa encontrada en directorio (Vehículo de: ${match.user.name}).`;
            localState.authorizedBy = `Vehículo en directorio: ${match.user.name}`;
            if(!localState.driverName) localState.driverName = match.user.name;
        } else {
            localState.directoryCheckFeedback = 'Esta placa no se encontró en el directorio.';
            localState.authorizedBy = '';
        }
    } else {
        localState.directoryCheckFeedback = '';
        localState.authorizedBy = '';
    }
    updateUI();
}

export function renderVehicleForm() {
    return `
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto">
        <div class="flex items-center justify-center space-x-3 text-center mb-8">
            ${TruckIcon('w-8 h-8 text-teal-600')}
            <h2 class="text-3xl font-bold text-teal-700">Registrar Vehículo Visita</h2>
        </div>
        <div id="form-feedback"></div>
        <div id="directory-feedback"></div>
        <form id="vehicle-form" class="space-y-6">
            <div>
                <label for="licensePlate" class="block text-sm font-medium text-slate-700 mb-1">Placa Patente <span class="text-red-500">*</span></label>
                <input type="text" id="licensePlate" required class="w-full px-4 py-3 border border-slate-300 rounded-lg uppercase" placeholder="Ej: ABCD12 o pegue QR"/>
                <p id="licensePlate-error" class="text-xs text-red-600 mt-1"></p>
            </div>
            <div>
                <label for="driverName" class="block text-sm font-medium text-slate-700 mb-1">Nombre Conductor (Opcional)</label>
                <input type="text" id="driverName" class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
            </div>
            <div>
                <label for="parkingSpot" class="block text-sm font-medium text-slate-700 mb-1">Estacionamiento (Opcional)</p>
                <input type="text" id="parkingSpot" class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
            </div>
            <div>
                <label for="authorizedBy" class="block text-sm font-medium text-slate-700 mb-1">Autorizado por</label>
                <input type="text" id="authorizedBy" class="w-full px-4 py-3 border border-slate-300 rounded-lg bg-slate-50"/>
            </div>
            <button type="submit" class="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 px-6 rounded-lg">
                Registrar Ingreso Vehículo
            </button>
        </form>
    </div>
    `;
}

export function attachVehicleFormListeners(onEntryAdded) {
    const form = document.getElementById('vehicle-form');
    const plateInput = document.getElementById('licensePlate');

    plateInput.addEventListener('input', handleLicensePlateInput);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const licensePlate = document.getElementById('licensePlate').value;
        if (!licensePlate.trim()) {
            document.getElementById('licensePlate-error').textContent = 'La placa es obligatoria.';
            return;
        }
        document.getElementById('licensePlate-error').textContent = '';
        
        const newVehicleEntry = {
            type: EntryType.VEHICLE,
            licensePlate: licensePlate.trim(),
            driverName: document.getElementById('driverName').value.trim() || undefined,
            parkingSpot: document.getElementById('parkingSpot').value.trim() || undefined,
            authorizedBy: localState.authorizedBy || document.getElementById('authorizedBy').value.trim() || undefined,
            invitationId: localState.linkedInvitation?.id,
        };

        const updatedEntries = addEntry(newVehicleEntry);

        if (localState.linkedInvitation) {
            const newEntryRecord = updatedEntries.find(entry => entry.invitationId === localState.linkedInvitation.id);
            if (newEntryRecord) {
                markInvitationAsUsed(localState.linkedInvitation.id, newEntryRecord.id);
            }
        }
        
        onEntryAdded(updatedEntries);
        showFeedback('form-feedback', 'success', 'Vehículo registrado exitosamente!');
        resetForm();
    });
}
