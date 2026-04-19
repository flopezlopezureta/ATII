import { BoltIcon, SearchIcon, UserIcon, TruckIcon, TicketIcon } from '../components/icons.js';
import { getDirectoryUsers } from '../services/directoryService.js';
import { getInvitations, getInvitationById, markInvitationAsUsed } from '../services/invitationService.js';
import { addEntry } from '../services/storageService.js';
import { cleanRUT } from '../services/validationService.js';
import { EntryType } from '../constants.js';
import { showFeedback } from '../utils.js';

let searchResults = [];
let timeoutId = null;

function renderResultItem(result) {
    const isInvitation = result.matchType === 'Invitación';
    const isVehicle = result.vehicle;
    const icon = isInvitation ? TicketIcon('w-8 h-8 text-indigo-600') :
                 isVehicle ? TruckIcon('w-8 h-8 text-teal-600') :
                 UserIcon('w-8 h-8 text-sky-600');

    return `
        <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div class="flex items-center gap-3 flex-grow">
                <div class="flex-shrink-0">${icon}</div>
                <div>
                    <p class="font-semibold text-slate-800">${result.user.name} ${result.user.apartment ? `(${result.user.apartment})` : ''}</p>
                    <p class="text-sm text-slate-500">
                        ${result.matchType}: <span class="font-medium">${result.matchValue}</span>
                    </p>
                </div>
            </div>
            <button data-result-index="${searchResults.indexOf(result)}" class="register-btn w-full sm:w-auto bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-2 px-4 rounded-lg">
                Registrar Ingreso
            </button>
        </div>
    `;
}

function renderResults() {
    const resultsContainer = document.getElementById('results-container');
    const searchTerm = document.getElementById('search-term').value;
    if (searchResults.length > 0) {
        resultsContainer.innerHTML = searchResults.map(renderResultItem).join('');
    } else if (searchTerm.length >= 3) {
        resultsContainer.innerHTML = `<p class="text-center text-slate-500 py-4">No se encontraron resultados para "${searchTerm}".</p>`;
    } else {
        resultsContainer.innerHTML = '';
    }
}

function performSearch(term) {
    const resultsContainer = document.getElementById('results-container');
    if (term.trim().length < 3) {
        searchResults = [];
        renderResults();
        return;
    }
    
    resultsContainer.innerHTML = `<p class="text-center text-slate-500">Buscando...</p>`;
    
    const directoryUsers = getDirectoryUsers();
    const allInvitations = getInvitations();
    const lowerTerm = term.toLowerCase();
    const upperTerm = term.toUpperCase();
    const cleanedRutTerm = cleanRUT(term);
    const newResults = [];

    const matchedInvitation = allInvitations.find(inv => inv.id.toUpperCase() === upperTerm && inv.status === 'active' && new Date(inv.expiresAt) > new Date());
    if (matchedInvitation) {
        const creatorUser = directoryUsers.find(u => u.id === matchedInvitation.createdByUserId);
        if (creatorUser) {
            newResults.push({
                user: creatorUser,
                matchType: 'Invitación',
                matchValue: matchedInvitation.id,
                vehicle: matchedInvitation.type === 'vehicle' ? { id: matchedInvitation.id, licensePlate: matchedInvitation.licensePlate || 'N/A' } : undefined
            });
        }
    }

    for (const user of directoryUsers) {
        if (user.name.toLowerCase().includes(lowerTerm)) newResults.push({ user, matchType: 'Nombre', matchValue: user.name });
        if (user.idDocument && cleanRUT(user.idDocument).includes(cleanedRutTerm)) newResults.push({ user, matchType: 'RUT', matchValue: user.idDocument });
        if (user.tenant?.name && user.tenant.name.toLowerCase().includes(lowerTerm)) newResults.push({ user, matchType: 'Nombre', matchValue: `${user.tenant.name} (Arrendatario)` });
        if (user.tenant?.idDocument && cleanRUT(user.tenant.idDocument).includes(cleanedRutTerm)) newResults.push({ user, matchType: 'RUT', matchValue: `${user.tenant.idDocument} (Arrendatario)` });
        user.vehicles.forEach(vehicle => {
            if (vehicle.licensePlate.toLowerCase().includes(lowerTerm)) newResults.push({ user, vehicle, matchType: 'Placa Patente', matchValue: vehicle.licensePlate });
        });
    }

    searchResults = newResults.slice(0, 10);
    renderResults();
}

export function renderQuickAccessForm() {
    searchResults = [];
    return `
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
        <div class="flex items-center justify-center space-x-3 text-center mb-8">
            ${BoltIcon('w-8 h-8 text-yellow-500 flex-shrink-0')}
            <h2 class="text-3xl font-bold text-slate-800">Acceso Rápido</h2>
        </div>
        <p class="text-center text-slate-600 mb-6">Busque por nombre, RUT, placa o ID de invitación.</p>
        <div id="feedback-container"></div>
        <div class="relative mb-4">
            <input type="text" id="search-term" placeholder="Buscar..." class="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg text-lg"/>
            ${SearchIcon('absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6')}
        </div>
        <div id="results-container" class="mt-4 space-y-2 max-h-96 overflow-y-auto"></div>
    </div>
    `;
}

export function attachQuickAccessFormListeners(onEntryAdded) {
    const searchInput = document.getElementById('search-term');
    const resultsContainer = document.getElementById('results-container');

    searchInput.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => performSearch(e.target.value), 300);
    });

    resultsContainer.addEventListener('click', (e) => {
        const button = e.target.closest('.register-btn');
        if (!button) return;

        const resultIndex = button.dataset.resultIndex;
        const result = searchResults[resultIndex];
        if (!result) return;
        
        let newEntry;
        if (result.matchType === 'Invitación') {
            const invitation = getInvitationById(result.matchValue);
            if (!invitation || invitation.status !== 'active' || new Date(invitation.expiresAt) < new Date()) {
                showFeedback('feedback-container', 'error', 'La invitación ya no es válida.');
                return;
            }
            if (invitation.type === 'vehicle') {
                newEntry = { type: EntryType.VEHICLE, licensePlate: invitation.licensePlate, driverName: invitation.guestName, authorizedBy: `Invitación de ${result.user.name}`, invitationId: invitation.id };
            } else {
                newEntry = { type: EntryType.PERSON, name: invitation.guestName, idDocument: invitation.guestIdDocument, apartment: invitation.apartment, authorizedBy: `Invitación de ${result.user.name}`, invitationId: invitation.id };
            }
            const updatedEntries = addEntry(newEntry);
            const newEntryRecord = updatedEntries.find(e => e.invitationId === invitation.id);
            if(newEntryRecord) markInvitationAsUsed(invitation.id, newEntryRecord.id);
            onEntryAdded(updatedEntries);
            showFeedback('feedback-container', 'success', `Ingreso con invitación ${invitation.id} registrado.`);
        } else if (result.vehicle) {
            newEntry = { type: EntryType.VEHICLE, licensePlate: result.vehicle.licensePlate, driverName: result.user.name, parkingSpot: result.vehicle.parkingSpot, authorizedBy: `Re-ingreso: ${result.user.role}` };
            onEntryAdded(addEntry(newEntry));
            showFeedback('feedback-container', 'success', `Ingreso de ${result.vehicle.licensePlate} registrado.`);
        } else {
            newEntry = { type: EntryType.PERSON, name: result.user.name, idDocument: result.user.idDocument || 'N/A', apartment: result.user.apartment, authorizedBy: `Re-ingreso: ${result.user.role}` };
            onEntryAdded(addEntry(newEntry));
            showFeedback('feedback-container', 'success', `Ingreso de ${result.user.name} registrado.`);
        }
        
        searchInput.value = '';
        searchResults = [];
        renderResults();
    });
}
