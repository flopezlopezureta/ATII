import { SettingsIcon } from '../components/icons.js';
import { getAppSettings, saveAppSettings } from '../services/settingsService.js';
import { verifyPassword } from '../services/authService.js';
import { showFeedback, parseOcrText } from '../utils.js';
import { showPasswordConfirmModal } from '../components/modals.js';
import { state } from '../state.js';
import { getEntries } from '../services/storageService.js';

function renderScannerTestResults(input, id, name, error) {
    const container = document.getElementById('scanner-test-results');
    if (!container) return;
    if (!input) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = `
        <div class="p-3 bg-slate-50 rounded-md">
            <p class="text-xs text-slate-500 mb-1">Datos Crudos:</p>
            <p class="text-sm text-slate-700 break-all">${input}</p>
        </div>
        ${(id || name || error) ? `
        <div class="p-3 bg-indigo-50 rounded-md border border-indigo-200">
            <p class="text-sm font-medium text-indigo-700">Resultados del Procesamiento:</p>
            ${id ? `<p class="text-sm">RUT Extraído: <span class="font-semibold">${id}</span></p>` : ''}
            ${name ? `<p class="text-sm">Nombre Extraído: <span class="font-semibold">${name}</span></p>` : ''}
            ${error ? `<p class="text-sm text-red-600 mt-1">Error/Aviso: ${error}</p>` : ''}
        </div>` : ''}
    `;
}

export function renderSettingsScreen() {
    const settings = getAppSettings();
    const isSuperuser = state.currentUser?.id === 'superuser-active-id';
    const entryCount = getEntries().length;
    return `
    <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-2xl mx-auto">
        <div class="flex items-center justify-center space-x-2 mb-8">
            ${SettingsIcon('w-8 h-8 text-purple-600 flex-shrink-0')}
            <span class="text-2xl font-bold text-purple-500">AT II</span>
            <h2 class="text-3xl font-bold text-slate-800">Configuración</h2>
        </div>
        <div id="feedback-container"></div>
        ${!isSuperuser ? `
            <div class="mb-6 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700">
                <p class="font-bold">Acceso Limitado</p>
                <p>Algunos ajustes solo pueden ser modificados por el superusuario.</p>
            </div>` : ''}

        <form id="settings-form" class="space-y-6">
            <div>
                <label for="condominiumName" class="block text-sm font-medium text-slate-700 mb-1">Nombre del Condominio ${isSuperuser ? '<span class="text-red-500">*</span>' : ''}</label>
                <input type="text" id="condominiumName" value="${settings.condominiumName || ''}" ${!isSuperuser ? 'disabled' : ''} class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
            </div>
            <fieldset class="border border-slate-300 p-4 rounded-lg">
                <legend class="text-lg font-semibold text-slate-700 px-2">Reportes por Correo</legend>
                <div class="space-y-4 mt-2">
                    <div>
                        <label for="senderEmail" class="block text-sm font-medium text-slate-700 mb-1">Tu Correo Remitente (Opcional)</label>
                        <input type="email" id="senderEmail" value="${settings.senderEmail || ''}" ${!isSuperuser ? 'disabled' : ''} class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
                    </div>
                    <div>
                        <label for="recipientEmail" class="block text-sm font-medium text-slate-700 mb-1">Correo Destinatario</label>
                        <input type="email" id="recipientEmail" value="${settings.recipientEmail || ''}" ${!isSuperuser ? 'disabled' : ''} class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
                    </div>
                    <div>
                        <label for="sendIntervalHours" class="block text-sm font-medium text-slate-700 mb-1">Intervalo Envío Automático (horas)</label>
                        <input type="number" id="sendIntervalHours" value="${settings.sendIntervalHours || 0}" min="0" ${!isSuperuser ? 'disabled' : ''} class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
                        <p class="mt-1 text-xs text-slate-500">Último intento: ${settings.lastSentTimestamp ? new Date(settings.lastSentTimestamp).toLocaleString() : 'Nunca'}.</p>
                    </div>
                </div>
            </fieldset>
            ${isSuperuser ? `<button type="submit" class="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg">Guardar Ajustes</button>` : ''}
        </form>

        <div class="mt-8 border-t border-slate-200 pt-6">
            <h3 class="text-xl font-semibold text-slate-800 mb-4">Probar Escáner</h3>
            <div class="space-y-3">
                <input type="text" id="scannerTestInput" class="w-full px-4 py-3 border border-slate-300 rounded-lg" placeholder="Escanee aquí"/>
                <div id="scanner-test-results" class="space-y-2"></div>
                <button id="clear-test-scanner" class="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg">Limpiar</button>
            </div>
        </div>

        <div class="mt-8 border-t border-slate-200 pt-6">
            <h3 class="text-xl font-semibold text-slate-800 mb-4">Acciones</h3>
            <div class="space-y-4">
                <div>
                    <button id="manual-report-btn" ${entryCount === 0 || !settings.recipientEmail ? 'disabled' : ''} class="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-60">Enviar Reporte CSV Manual (${entryCount})</button>
                    <div id="report-feedback-container" class="mt-2 text-sm"></div>
                </div>
                ${isSuperuser ? `
                <div>
                    <button id="clear-entries-btn" ${entryCount === 0 ? 'disabled' : ''} class="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-60">Borrar Todos los Registros (${entryCount})</button>
                    <p class="mt-1 text-xs text-slate-500">Esta acción es irreversible.</p>
                </div>` : ''}
            </div>
        </div>
    </div>
    `;
}

export function attachSettingsScreenListeners({ onSettingsSaved, onSendManualReport, onClearEntries }) {
    const isSuperuser = state.currentUser?.id === 'superuser-active-id';

    if (isSuperuser) {
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const newSettings = {
                condominiumName: document.getElementById('condominiumName').value.trim(),
                senderEmail: document.getElementById('senderEmail').value.trim(),
                recipientEmail: document.getElementById('recipientEmail').value.trim(),
                sendIntervalHours: Number(document.getElementById('sendIntervalHours').value),
                lastSentTimestamp: getAppSettings().lastSentTimestamp,
            };

            if (!newSettings.condominiumName) {
                showFeedback('feedback-container', 'error', 'El Nombre del Condominio es obligatorio.');
                return;
            }
            saveAppSettings(newSettings);
            onSettingsSaved(newSettings);
            showFeedback('feedback-container', 'success', 'Ajustes guardados.');
        });
        
        const clearEntriesBtn = document.getElementById('clear-entries-btn');
        if (clearEntriesBtn) {
            clearEntriesBtn.addEventListener('click', () => {
                showPasswordConfirmModal({
                    onConfirm: (password, closeModal) => {
                        const isValid = verifyPassword(state.currentUser.username, password);
                        if (isValid) {
                            onClearEntries();
                            closeModal();
                            showFeedback('feedback-container', 'success', 'Todos los registros han sido borrados.');
                            document.getElementById('clear-entries-btn').textContent = `Borrar Todos los Registros (0)`;
                            document.getElementById('clear-entries-btn').disabled = true;
                            document.getElementById('manual-report-btn').textContent = `Enviar Reporte CSV Manual (0)`;
                            document.getElementById('manual-report-btn').disabled = true;

                        } else {
                           // This requires re-rendering the modal, which is complex.
                           // For simplicity, we just alert. A better implementation would
                           // re-render the modal with an error message.
                           alert('Contraseña incorrecta.');
                        }
                    }
                });
            });
        }
    }

    document.getElementById('manual-report-btn').addEventListener('click', () => {
        const result = onSendManualReport();
        const container = document.getElementById('report-feedback-container');
        container.textContent = result.message;
        container.className = `mt-2 text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`;
        setTimeout(() => container.textContent = '', 5000);
    });
    
    document.getElementById('scannerTestInput').addEventListener('input', (e) => {
        const value = e.target.value;
        if (!value.trim()) {
            renderScannerTestResults('', '', '', '');
            return;
        }
        const { id, name, error } = parseOcrText(value);
        renderScannerTestResults(value, id, name, error);
    });

    document.getElementById('clear-test-scanner').addEventListener('click', () => {
        document.getElementById('scannerTestInput').value = '';
        renderScannerTestResults('', '', '', '');
    });
}
