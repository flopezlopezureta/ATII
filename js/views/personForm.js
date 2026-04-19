import { UserIcon } from '../components/icons.js';
import { addEntry } from '../services/storageService.js';
import { validateRUT, formatRUT } from '../services/validationService.js';
import { findDirectoryUserByRUT } from '../services/directoryService.js';
import { getInvitationById, markInvitationAsUsed } from '../services/invitationService.js';
import { EntryType } from '../constants.js';
import { showRutErrorModal } from '../components/modals.js';
import { showFeedback, parseOcrText } from '../utils.js';

let formState = {
    name: '',
    idDocument: '',
    apartment: '',
    authorizedBy: '',
    isAuthorizedByReadOnly: false,
    linkedInvitation: null,
};

function updateFeedback(id, text, type = 'info') {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = text ? `<p class="mb-4 p-3 rounded-md text-sm ${type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}">${text}</p>` : '';
}

function resetForm() {
    formState = { name: '', idDocument: '', apartment: '', authorizedBy: '', isAuthorizedByReadOnly: false, linkedInvitation: null };
    document.getElementById('person-form').reset();
    document.getElementById('idDocument').classList.remove('border-red-500');
    document.getElementById('idDocument-error').textContent = '';
    updateFeedback('scan-feedback', '');
    updateFeedback('directory-feedback', '');
}

function handleInvitationScan(invitationId) {
    const invitation = getInvitationById(invitationId);
    if (!invitation || invitation.type !== 'person' || invitation.status !== 'active' || new Date(invitation.expiresAt) < new Date()) {
        const errorMsg = !invitation ? `Invitación ${invitationId} no encontrada.` :
            invitation.type !== 'person' ? 'Invitación es para un vehículo.' :
            `Invitación está ${invitation.status} o expirada.`;
        updateFeedback('scan-feedback', `Error: ${errorMsg}`);
        return;
    }
    
    formState.linkedInvitation = invitation;
    document.getElementById('name').value = invitation.guestName || '';
    document.getElementById('idDocument').value = invitation.guestIdDocument || '';
    document.getElementById('apartment').value = invitation.apartment || '';
    document.getElementById('authorizedBy').value = `Invitación de ${invitation.createdByUserName}`;
    
    ['name', 'idDocument', 'apartment', 'authorizedBy'].forEach(id => {
        document.getElementById(id).readOnly = true;
    });
    
    updateFeedback('scan-feedback', `Invitación válida encontrada para ${invitation.guestName}.`);
}

function handleIdDocumentInput(e) {
    const rawValue = e.target.value;
    const nameInput = document.getElementById('name');
    const idInput = document.getElementById('idDocument');
    const idError = document.getElementById('idDocument-error');
    
    // Reset fields
    updateFeedback('scan-feedback', '');
    updateFeedback('directory-feedback', '');
    ['name', 'idDocument', 'apartment', 'authorizedBy'].forEach(id => document.getElementById(id).readOnly = false);
    formState.linkedInvitation = null;

    try {
        const potentialJSON = JSON.parse(rawValue);
        if (potentialJSON.type === 'inv' && potentialJSON.id) {
            handleInvitationScan(potentialJSON.id);
            return;
        }
    } catch(err) { /* Not JSON, proceed */ }

    const formattedRut = formatRUT(rawValue);
    idInput.value = formattedRut;

    if (rawValue.trim() === '') {
        idError.textContent = '';
        return;
    }
    
    let extractedRutForCheck = '';
    if (rawValue.length > 20 && rawValue.includes(' ')) { // Scanner input heuristic
        const { id, name, error } = parseOcrText(rawValue);
        if (id) {
            const formattedOcrRut = formatRUT(id);
            idInput.value = formattedOcrRut;
            extractedRutForCheck = formattedOcrRut;
            const validation = validateRUT(formattedOcrRut);
            idError.textContent = !validation.isValid ? (validation.message || 'RUT extraído inválido') : '';
        } else {
            idError.textContent = error || 'No se pudo extraer RUT del escáner.';
        }
        if (name) nameInput.value = name;
        updateFeedback('scan-feedback', error || `RUT ${idInput.value} y Nombre ${nameInput.value} extraídos.`);
    } else {
        const validation = validateRUT(formattedRut);
        idError.textContent = !validation.isValid ? (validation.message || 'RUT inválido') : '';
        extractedRutForCheck = formattedRut;
    }

    if (extractedRutForCheck && !idError.textContent) {
        idInput.classList.remove('border-red-500');
        const directoryUser = findDirectoryUserByRUT(extractedRutForCheck);
        if (directoryUser) {
            updateFeedback('directory-feedback', `Este RUT ya existe en el directorio: ${directoryUser.name}.`, 'warning');
        } else {
            updateFeedback('directory-feedback', '');
        }
    } else {
        idInput.classList.add('border-red-500');
    }
}

export function renderPersonForm() {
    return `
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto">
      <div class="flex items-center justify-center space-x-3 text-center mb-8">
        ${UserIcon('w-8 h-8 text-sky-600 flex-shrink-0')}
        <h2 class="text-3xl font-bold text-sky-700">Registrar Persona</h2>
      </div>
      <div id="form-feedback"></div>
      <div id="scan-feedback"></div>
      <div id="directory-feedback"></div>
      <form id="person-form" class="space-y-6">
        <div>
          <label for="name" class="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span class="text-red-500">*</span></label>
          <input type="text" id="name" required class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
        </div>
        <div>
          <label for="idDocument" class="block text-sm font-medium text-slate-700 mb-1">Documento ID (RUT) <span class="text-red-500">*</span></label>
          <input type="text" id="idDocument" required class="w-full px-4 py-3 border border-slate-300 rounded-lg" placeholder="Ej: 12.345.678-9, escanee o pegue QR"/>
          <p id="idDocument-error" class="mt-1 text-xs text-red-600"></p>
        </div>
        <div>
          <label for="apartment" class="block text-sm font-medium text-slate-700 mb-1">Apartamento (Opcional)</label>
          <input type="text" id="apartment" class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
        </div>
        <div>
          <label for="authorizedBy" class="block text-sm font-medium text-slate-700 mb-1">Autorizado por (Opcional)</label>
          <input type="text" id="authorizedBy" class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
        </div>
        <button type="submit" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg">
          Registrar Ingreso Persona
        </button>
      </form>
    </div>
    `;
}

export function attachPersonFormListeners(onEntryAdded) {
    const form = document.getElementById('person-form');
    const idInput = document.getElementById('idDocument');
    const idError = document.getElementById('idDocument-error');

    idInput.addEventListener('input', handleIdDocumentInput);
    idInput.addEventListener('blur', () => {
        if (idInput.value && idError.textContent) {
            showRutErrorModal(idError.textContent);
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('name').value;
        const idDocument = idInput.value;
        
        if (!name.trim() || !idDocument.trim()) {
            showFeedback('form-feedback', 'error', 'Nombre y Documento ID son obligatorios.');
            return;
        }

        if (!formState.linkedInvitation) {
            const validation = validateRUT(idDocument);
            if (!validation.isValid) {
                idError.textContent = validation.message || 'RUT inválido.';
                showRutErrorModal(idError.textContent);
                return;
            }
        }
        idError.textContent = '';
        idInput.classList.remove('border-red-500');

        const newPersonEntry = {
            type: EntryType.PERSON,
            name: name.trim(),
            idDocument: idDocument,
            apartment: document.getElementById('apartment').value.trim() || undefined,
            authorizedBy: document.getElementById('authorizedBy').value.trim() || undefined,
            invitationId: formState.linkedInvitation?.id,
        };

        const updatedEntries = addEntry(newPersonEntry);
        
        if (formState.linkedInvitation) {
            const newEntryRecord = updatedEntries.find(entry => entry.invitationId === formState.linkedInvitation.id);
            if (newEntryRecord) {
                markInvitationAsUsed(formState.linkedInvitation.id, newEntryRecord.id);
            }
        }
        
        onEntryAdded(updatedEntries);
        showFeedback('form-feedback', 'success', 'Persona registrada exitosamente!');
        resetForm();
    });
}
