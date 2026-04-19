import { UserIcon, TruckIcon, ListBulletIcon } from '../components/icons.js';
import { EntryType } from '../constants.js';
import { formatTimestamp } from '../utils.js';
import { showEntryDetailModal } from '../components/modals.js';
import { state } from '../state.js';

function renderEntryItem(entry, isSelected) {
    const isPerson = entry.type === EntryType.PERSON;
    const icon = isPerson ? UserIcon('w-5 h-5 text-sky-600') : TruckIcon('w-5 h-5 text-teal-600');
    const typeText = isPerson ? 'Persona' : 'Vehículo';
    const typeTextColor = isPerson ? 'text-sky-700' : 'text-teal-700';

    return `
        <li data-entry-id="${entry.id}" class="entry-item flex items-start sm:items-center py-3 px-2 border-b border-slate-200 transition-colors duration-150 text-sm cursor-pointer ${isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'}">
            <div class="w-7 flex-shrink-0 mr-2 flex justify-center pt-0.5 sm:pt-0">${icon}</div>
            <div class="w-20 flex-shrink-0 truncate ${typeTextColor} font-medium">${typeText}</div>
            <div class="flex-1 min-w-[120px] px-2 truncate font-semibold text-slate-700">${isPerson ? entry.name : entry.licensePlate}</div>
            <div class="flex-1 min-w-[100px] px-2 truncate text-slate-600">${isPerson ? entry.idDocument : (entry.driverName || '<span class="text-slate-400">N/A</span>')}</div>
            <div class="flex-1 min-w-[100px] px-2 truncate text-slate-500">${isPerson ? (entry.apartment || '<span class="text-slate-400">N/A</span>') : (entry.parkingSpot || '<span class="text-slate-400">N/A</span>')}</div>
            <div class="flex-1 min-w-[180px] px-2 text-slate-500 break-words" title="${entry.authorizedBy || ''}">${entry.authorizedBy || '<span class="text-slate-400">-</span>'}</div>
            <div class="w-36 flex-shrink-0 text-right text-xs text-slate-500 pt-0.5 sm:pt-0">${formatTimestamp(entry.timestamp)}</div>
        </li>
    `;
}

export function renderEntryList(entries, filter = 'all', authSearch = '', selectedEntryId = null) {
    const filteredEntries = entries.filter(entry => {
        const typeMatch = filter === 'all' || entry.type === filter;
        const authMatch = !authSearch || (entry.authorizedBy && entry.authorizedBy.toLowerCase().includes(authSearch.toLowerCase()));
        return typeMatch && authMatch;
    });

    return `
        <div class="bg-white p-4 md:p-6 rounded-xl shadow-2xl w-full max-w-4xl mx-auto">
            <div class="flex flex-col sm:flex-row justify-between items-center mb-6">
                <div class="flex items-center space-x-3 mb-3 sm:mb-0">
                    ${ListBulletIcon('w-7 h-7 text-slate-700 flex-shrink-0')}
                    <h2 class="text-2xl sm:text-3xl font-bold text-slate-800">Registros de Ingreso</h2>
                </div>
            </div>
            <div class="mb-4 flex flex-col sm:flex-row flex-wrap gap-2 items-center">
                <div class="flex gap-2">
                    <button data-filter="all" class="filter-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${filter === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">Todos (${entries.length})</button>
                    <button data-filter="persona" class="filter-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${filter === 'persona' ? 'bg-sky-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">Personas (${entries.filter(e => e.type === EntryType.PERSON).length})</button>
                    <button data-filter="vehiculo" class="filter-btn px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors ${filter === 'vehiculo' ? 'bg-teal-600 text-white shadow-md' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}">Vehículos (${entries.filter(e => e.type === EntryType.VEHICLE).length})</button>
                </div>
                <input type="text" id="auth-search" placeholder="Buscar por Autorización..." value="${authSearch}" class="mt-2 sm:mt-0 sm:ml-auto px-3 py-1.5 sm:px-4 sm:py-2 border border-slate-300 rounded-lg shadow-sm text-xs sm:text-sm w-full sm:w-auto"/>
            </div>
            <div class="overflow-x-auto">
                <div class="flex items-center py-2 px-2 border-b-2 border-slate-300 bg-slate-100 text-slate-600 text-xs font-semibold sticky top-0 z-10">
                    <div class="w-7 flex-shrink-0 mr-2"></div>
                    <div class="w-20 flex-shrink-0">Tipo</div>
                    <div class="flex-1 min-w-[120px] px-2">Principal</div>
                    <div class="flex-1 min-w-[100px] px-2">Detalle 1</div>
                    <div class="flex-1 min-w-[100px] px-2">Apto / Estac.</div>
                    <div class="flex-1 min-w-[180px] px-2">Autorizado Por</div>
                    <div class="w-36 flex-shrink-0 text-right">Fecha y Hora</div>
                </div>
                <ul id="entry-list-ul" class="min-w-[700px]">
                    ${filteredEntries.length > 0 ? filteredEntries.map(entry => renderEntryItem(entry, selectedEntryId === entry.id)).join('') : '<p class="text-center text-slate-500 py-10 text-lg">No hay registros que coincidan.</p>'}
                </ul>
            </div>
        </div>
    `;
}

export function attachEntryListListeners(entries) {
    let currentFilter = 'all';
    let authSearch = '';
    let selectedEntryId = null;

    const listContainer = document.querySelector('.max-w-4xl');

    const updateList = () => {
        const listContent = renderEntryList(entries, currentFilter, authSearch, selectedEntryId);
        // This is tricky. Re-rendering the whole component will lose focus on the input.
        // A more robust solution would be to only re-render the list part.
        document.getElementById('entry-list-ul').innerHTML = (
            (entries.filter(entry => {
                const typeMatch = currentFilter === 'all' || entry.type === currentFilter;
                const authMatch = !authSearch || (entry.authorizedBy && entry.authorizedBy.toLowerCase().includes(authSearch.toLowerCase()));
                return typeMatch && authMatch;
            })).map(entry => renderEntryItem(entry, selectedEntryId === entry.id)).join('') || '<p class="text-center text-slate-500 py-10 text-lg">No hay registros.</p>'
        );
        // Re-attach listeners for the new list items
        attachListItemsListeners();
    };
    
    listContainer.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            currentFilter = e.currentTarget.dataset.filter;
             // Update button styles
            listContainer.querySelectorAll('.filter-btn').forEach(b => {
                b.classList.remove('bg-indigo-600', 'bg-sky-600', 'bg-teal-600', 'text-white', 'shadow-md');
                b.classList.add('bg-slate-200', 'text-slate-700', 'hover:bg-slate-300');
            });
            const selectedBtn = e.currentTarget;
            if (currentFilter === 'all') selectedBtn.classList.add('bg-indigo-600');
            if (currentFilter === 'persona') selectedBtn.classList.add('bg-sky-600');
            if (currentFilter === 'vehiculo') selectedBtn.classList.add('bg-teal-600');
            selectedBtn.classList.add('text-white', 'shadow-md');
            updateList();
        });
    });

    document.getElementById('auth-search').addEventListener('input', (e) => {
        authSearch = e.target.value;
        updateList();
    });

    function attachListItemsListeners() {
        document.querySelectorAll('.entry-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const entryId = e.currentTarget.dataset.entryId;
                const entry = entries.find(en => en.id === entryId);
                if (entry) {
                    selectedEntryId = entryId;
                    showEntryDetailModal(entry);
                    updateList(); // Re-render to show selection
                }
            });
        });
    }

    attachListItemsListeners();
}
