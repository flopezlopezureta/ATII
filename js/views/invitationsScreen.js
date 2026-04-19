import { getInvitations, addInvitation } from '../services/invitationService.js';
import { findDirectoryUserByAuthId } from '../services/directoryService.js';
import { TicketIcon, UserIcon, TruckIcon, QrCodeIcon, CheckCircleIcon, ClockIcon, XCircleIcon } from '../components/icons.js';
import { showInvitationDisplayModal } from '../components/modals.js';
import { showFeedback } from '../utils.js';
import { state } from '../state.js';

let localState = {
    invitations: [],
    type: 'person',
    expiresInHours: 24,
};

function renderInvitationList(currentUser) {
    const userInvitations = localState.invitations.filter(inv => inv.createdByUserId === currentUser.id);
    const listEl = document.getElementById('invitations-list');
    if (!listEl) return;

    const getStatus = (inv) => {
        if (inv.status === 'used') return { text: 'Utilizada', icon: CheckCircleIcon("w-4 h-4"), color: 'text-green-600' };
        if (new Date(inv.expiresAt) < new Date()) return { text: 'Expirada', icon: XCircleIcon("w-4 h-4"), color: 'text-red-600' };
        return { text: 'Activa', icon: ClockIcon("w-4 h-4"), color: 'text-blue-600' };
    };

    if (userInvitations.length === 0) {
        listEl.innerHTML = '<p class="text-center text-slate-500 py-6">No has creado ninguna invitación aún.</p>';
        return;
    }

    listEl.innerHTML = userInvitations.map(inv => {
        const status = getStatus(inv);
        return `
        <div key="${inv.id}" class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-grow">
                <div class="flex-shrink-0">
                    ${inv.type === 'person' ? UserIcon("w-8 h-8 text-sky-600") : TruckIcon("w-8 h-8 text-teal-600")}
                </div>
                <div>
                    <p class="font-semibold text-slate-800">${inv.guestName || inv.licensePlate}</p>
                    <p class="text-xs flex items-center gap-1.5 ${status.color}">${status.icon} ${status.text}</p>
                    <p class="text-xs text-slate-500">Expira: ${new Date(inv.expiresAt).toLocaleString('es-CL')}</p>
                </div>
            </div>
            <button data-inv-id="${inv.id}" class="view-qr-btn w-full sm:w-auto bg-slate-600 hover:bg-slate-700 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-md transition flex items-center justify-center gap-2">
                ${QrCodeIcon("w-5 h-5")} Ver QR
            </button>
        </div>
        `;
    }).join('');

    listEl.querySelectorAll('.view-qr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const invId = btn.dataset.invId;
            const invitation = localState.invitations.find(i => i.id === invId);
            if(invitation) showInvitationDisplayModal(invitation);
        });
    });
}

export function renderInvitationsScreen(currentUser) {
    localState.invitations = getInvitations();
    
    return `
    <div class="space-y-8">
        <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
            <div class="flex items-center justify-center space-x-2 text-center mb-8">
                ${TicketIcon('w-8 h-8 text-indigo-600 flex-shrink-0')}
                <h2 class="text-3xl font-bold text-slate-800">Crear Invitación</h2>
            </div>
            
            <div id="feedback-container"></div>

            <form id="invitation-form" class="space-y-6">
                <div>
                    <label class="block text-sm font-medium text-slate-700 mb-2">Tipo de Invitación</label>
                    <div class="flex gap-4">
                        <label class="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="type" value="person" ${localState.type === 'person' ? 'checked' : ''} class="h-4 w-4 text-indigo-600"/>
                            <span class="text-slate-700">Persona</span>
                        </label>
                        <label class="flex items-center space-x-2 cursor-pointer">
                            <input type="radio" name="type" value="vehicle" ${localState.type === 'vehicle' ? 'checked' : ''} class="h-4 w-4 text-indigo-600"/>
                            <span class="text-slate-700">Vehículo</span>
                        </label>
                    </div>
                </div>

                <div id="guest-details-container">
                    ${localState.type === 'person' ? `
                    <div>
                        <label for="guestName" class="block text-sm font-medium text-slate-700 mb-1">Nombre del Invitado <span class="text-red-500">*</span></label>
                        <input type="text" id="guestName" required class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
                    </div>
                    ` : `
                    <div>
                        <label for="licensePlate" class="block text-sm font-medium text-slate-700 mb-1">Placa Patente <span class="text-red-500">*</span></label>
                        <input type="text" id="licensePlate" required class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
                    </div>
                    `}
                </div>
                
                <div>
                    <label for="expiresInHours" class="block text-sm font-medium text-slate-700 mb-1">Validez</label>
                    <select id="expiresInHours" class="w-full px-4 py-3 border border-slate-300 rounded-lg bg-white">
                        <option value="1" ${localState.expiresInHours === 1 ? 'selected' : ''}>1 Hora</option>
                        <option value="4" ${localState.expiresInHours === 4 ? 'selected' : ''}>4 Horas</option>
                        <option value="12" ${localState.expiresInHours === 12 ? 'selected' : ''}>12 Horas</option>
                        <option value="24" ${localState.expiresInHours === 24 ? 'selected' : ''}>1 Día</option>
                        <option value="48" ${localState.expiresInHours === 48 ? 'selected' : ''}>2 Días</option>
                        <option value="168" ${localState.expiresInHours === 168 ? 'selected' : ''}>1 Semana</option>
                    </select>
                </div>

                <div>
                    <label for="notes" class="block text-sm font-medium text-slate-700 mb-1">Notas (Opcional)</label>
                    <textarea id="notes" rows="2" class="w-full px-4 py-3 border border-slate-300 rounded-lg"></textarea>
                </div>

                <button type="submit" id="submit-btn" class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg">
                    Generar Invitación
                </button>
            </form>
        </div>

        <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
            <h3 class="text-2xl font-bold text-slate-800 mb-6 text-center">Mis Invitaciones Recientes</h3>
            <div id="invitations-list" class="space-y-3 max-h-96 overflow-y-auto pr-2">
                <!-- List will be rendered here by JS -->
            </div>
        </div>
    </div>
    `;
}

function renderGuestDetails(type) {
    const container = document.getElementById('guest-details-container');
    if (!container) return;
    if (type === 'person') {
        container.innerHTML = `
            <div>
                <label for="guestName" class="block text-sm font-medium text-slate-700 mb-1">Nombre del Invitado <span class="text-red-500">*</span></label>
                <input type="text" id="guestName" required class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
            </div>`;
    } else {
        container.innerHTML = `
            <div>
                <label for="licensePlate" class="block text-sm font-medium text-slate-700 mb-1">Placa Patente <span class="text-red-500">*</span></label>
                <input type="text" id="licensePlate" required class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
            </div>`;
        document.getElementById('licensePlate').addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });
    }
}

export function attachInvitationsScreenListeners(currentUser) {
    const form = document.getElementById('invitation-form');
    const userDirectoryProfile = findDirectoryUserByAuthId(currentUser.id);
    const userApartment = userDirectoryProfile?.apartment || '';

    if (!userApartment) {
        document.getElementById('submit-btn').disabled = true;
        showFeedback('feedback-container', 'error', 'Tu perfil no tiene un apartamento asignado. No puedes crear invitaciones.');
    }

    renderInvitationList(currentUser);

    form.querySelectorAll('input[name="type"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            localState.type = e.target.value;
            renderGuestDetails(localState.type);
        });
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const type = form.querySelector('input[name="type"]:checked').value;
        const guestName = form.querySelector('#guestName')?.value || '';
        const licensePlate = form.querySelector('#licensePlate')?.value || '';
        const expiresInHours = Number(document.getElementById('expiresInHours').value);
        const notes = document.getElementById('notes').value;
        
        if ((type === 'person' && !guestName.trim()) || (type === 'vehicle' && !licensePlate.trim())) {
            showFeedback('feedback-container', 'error', 'Por favor, complete el campo requerido.');
            return;
        }

        const expirationDate = new Date();
        expirationDate.setHours(expirationDate.getHours() + expiresInHours);

        const newInvitationData = {
            createdByUserId: currentUser.id,
            createdByUserName: currentUser.username,
            expiresAt: expirationDate.toISOString(),
            type,
            apartment: userApartment,
            notes: notes.trim() || undefined,
            guestName: type === 'person' ? guestName.trim() : undefined,
            licensePlate: type === 'vehicle' ? licensePlate.trim().toUpperCase() : undefined,
        };
        
        const newInvitation = addInvitation(newInvitationData);
        showFeedback('feedback-container', 'success', 'Invitación creada exitosamente.');
        form.reset();
        
        localState.invitations = getInvitations();
        renderInvitationList(currentUser);
        showInvitationDisplayModal(newInvitation);
    });
}
