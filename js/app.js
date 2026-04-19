import { state, AppState } from './state.js';
import { renderAppShell, attachShellListeners } from './views/shell.js';
import { renderLoginScreen, attachLoginScreenListeners } from './views/auth/loginScreen.js';
import { renderRegisterScreen, attachRegisterScreenListeners } from './views/auth/registerScreen.js';
import { renderSuperuserSetupScreen, attachSuperuserSetupScreenListeners } from './views/auth/superuserSetupScreen.js';
import { renderPersonForm, attachPersonFormListeners } from './views/personForm.js';
import { renderVehicleForm, attachVehicleFormListeners } from './views/vehicleForm.js';
import { renderEntryList, attachEntryListListeners } from './views/entryList.js';
import { renderQuickAccessForm, attachQuickAccessFormListeners } from './views/quickAccessForm.js';
import { renderSettingsScreen, attachSettingsScreenListeners } from './views/settingsScreen.js';
import { renderUserDirectoryScreen, attachUserDirectoryScreenListeners } from './views/userDirectoryScreen.js';
import { renderInvitationsScreen, attachInvitationsScreenListeners } from './views/invitationsScreen.js';
import { View, AuthView } from './constants.js';
import { isSuperuserConfigured, logoutUser, SUPERUSER_ID_FOR_SESSION } from './services/authService.js';
import { formatEntriesForEmail } from './utils.js';
import { saveAppSettings } from './services/settingsService.js';

const root = document.getElementById('root');

function renderCurrentView(view) {
    const mainContent = document.getElementById('main-content-area');
    if (!mainContent) return;

    const condominiumNameIsEffectivelySet = state.appSettings.condominiumName && state.appSettings.condominiumName !== "ATLÁNTICO II";
    const isCurrentUserSuperuser = state.currentUser?.id === SUPERUSER_ID_FOR_SESSION;

    if (!condominiumNameIsEffectivelySet && !isCurrentUserSuperuser) {
         mainContent.innerHTML = `
             <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto text-center">
                <h2 class="text-2xl font-bold text-orange-600 mb-4">Configuración Pendiente</h2>
                <p class="text-slate-600">
                    El nombre del condominio ("ATLÁNTICO II") es el valor por defecto.
                    El superusuario debe revisar y confirmar/modificar este nombre en "Ajustes" para habilitar completamente la aplicación.
                </p>
                 <button
                    data-view="${View.VIEW_ENTRIES}"
                    class="mt-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md nav-button"
                >
                    Volver a Registros (Solo Superusuario puede configurar)
                </button>
            </div>`;
        return;
    }

    if (!isCurrentUserSuperuser && !state.currentUser?.isApprovedByAdmin && 
        (view === View.REGISTER_PERSON || view === View.REGISTER_VEHICLE || view === View.QUICK_ACCESS || view === View.INVITATIONS)) {
        mainContent.innerHTML = `
            <div class="bg-white p-6 md:p-8 rounded-xl shadow-2xl w-full max-w-lg mx-auto text-center">
                <h2 class="text-2xl font-bold text-orange-600 mb-4">Acceso Restringido</h2>
                <p class="text-slate-600 mb-2">
                    Tu cuenta está pendiente de aprobación por la administración.
                </p>
                <p class="text-slate-600">
                    No puedes autorizar ingresos hasta que tu cuenta sea aprobada.
                </p>
                <button
                    data-view="${View.VIEW_ENTRIES}"
                    class="mt-6 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md nav-button"
                >
                    Ver Registros de Ingreso
                </button>
            </div>`;
        return;
    }

    switch (view) {
        case View.REGISTER_PERSON:
            mainContent.innerHTML = renderPersonForm();
            attachPersonFormListeners(onEntryAdded);
            break;
        case View.REGISTER_VEHICLE:
            mainContent.innerHTML = renderVehicleForm();
            attachVehicleFormListeners(onEntryAdded);
            break;
        case View.VIEW_ENTRIES:
            mainContent.innerHTML = renderEntryList(state.entries);
            attachEntryListListeners(state.entries);
            break;
        case View.QUICK_ACCESS:
            mainContent.innerHTML = renderQuickAccessForm();
            attachQuickAccessFormListeners(onEntryAdded);
            break;
        case View.USER_DIRECTORY:
            mainContent.innerHTML = renderUserDirectoryScreen();
            attachUserDirectoryScreenListeners();
            break;
        case View.INVITATIONS:
            mainContent.innerHTML = renderInvitationsScreen(state.currentUser);
            attachInvitationsScreenListeners(state.currentUser);
            break;
        case View.SETTINGS:
            mainContent.innerHTML = renderSettingsScreen();
            attachSettingsScreenListeners({
                onSettingsSaved: handleSettingsSaved,
                onSendManualReport: handleSendManualEmailReport,
                onClearEntries: handleClearAllEntries,
            });
            break;
        default:
            mainContent.innerHTML = renderEntryList(state.entries);
            attachEntryListListeners(state.entries);
    }
}

function render() {
    if (!root) return;
    root.innerHTML = '<div class="flex items-center justify-center min-h-screen bg-slate-100"><p class="text-xl text-slate-700">Cargando aplicación...</p></div>';

    if (state.needsSuperuserSetup) {
        root.innerHTML = renderSuperuserSetupScreen();
        attachSuperuserSetupScreenListeners(handleSuperuserSetupComplete);
        return;
    }

    if (!state.currentUser) {
        if (state.authView === AuthView.LOGIN) {
            root.innerHTML = renderLoginScreen();
            attachLoginScreenListeners(handleLoginSuccess, () => navigateToAuth(AuthView.REGISTER));
        } else {
            root.innerHTML = renderRegisterScreen();
            attachRegisterScreenListeners(() => navigateToAuth(AuthView.LOGIN));
        }
        return;
    }

    root.innerHTML = renderAppShell(state);
    renderCurrentView(state.currentView);
    attachShellListeners(navigateTo, handleLogout);
}

function handleSuperuserSetupComplete() {
    AppState.setNeedsSuperuserSetup(false);
    AppState.setAuthView(AuthView.LOGIN);
    render();
}

function handleLoginSuccess() {
    AppState.initialize();
    render();
}

function handleLogout() {
    logoutUser();
    AppState.initialize();
    render();
}

function onEntryAdded(newEntries) {
    AppState.setEntries(newEntries);
    // Re-render only the list if the view is entry list, otherwise just update state
    if (state.currentView === View.VIEW_ENTRIES) {
        renderCurrentView(View.VIEW_ENTRIES);
    }
}

function handleClearAllEntries() {
    AppState.setEntries([]);
    renderCurrentView(state.currentView);
}

function handleSettingsSaved(newSettings) {
    AppState.setAppSettings(newSettings);
    // Force a re-render of the shell to update condo name
    render();
}

const triggerEmailClient = (recipient, sender, subject, body, isAutoSend) => {
    const mailtoRecipient = recipient ? encodeURIComponent(recipient) : '';
    let mailtoLink = `mailto:${mailtoRecipient}?subject=${encodeURIComponent(subject)}`;
    if (sender) mailtoLink += `&from=${encodeURIComponent(sender)}`; 
    mailtoLink += `&body=${encodeURIComponent(body)}`;
    
    const mailWindow = window.open(mailtoLink, '_blank');
    
    if (!mailWindow && isAutoSend) {
        console.warn("Envío automático: No se pudo abrir la ventana de correo.");
    } else if (!mailWindow && !isAutoSend) {
        alert("No se pudo abrir su cliente de correo. Como alternativa, puedes copiar los siguientes datos CSV, pegarlos en un editor de texto, guardarlo como un archivo '.csv' y adjuntarlo a un correo manualmente:\n\n" + body);
    }
    return !!mailWindow;
  };

function handleSendManualEmailReport() {
    const { appSettings, entries } = state;
    if (!appSettings.condominiumName) return { success: false, message: "Configure el Nombre del Condominio en los ajustes." };
    if (!appSettings.recipientEmail) return { success: false, message: "Configure un correo electrónico destinatario en los ajustes." };
    if (entries.length === 0) return { success: false, message: "No hay registros para enviar." };
    
    const emailBody = formatEntriesForEmail(entries);
    const subjectDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' });
    const subject = `Reporte CSV de Ingresos ${appSettings.condominiumName} - ${subjectDate}`;
    
    const emailOpened = triggerEmailClient(appSettings.recipientEmail, appSettings.senderEmail, subject, emailBody, false); 
    
    if (emailOpened) return { success: true, message: "Intentando abrir su cliente de correo con el reporte." };
    else return { success: false, message: "No se pudo abrir su cliente de correo." }; 
}

function checkAndSendAutoEmail() {
    const { appSettings, entries } = state;
    if (!appSettings.recipientEmail || !appSettings.sendIntervalHours || appSettings.sendIntervalHours <= 0 || !appSettings.condominiumName) return;

    const now = Date.now();
    const intervalMs = appSettings.sendIntervalHours * 60 * 60 * 1000;
    const lastSent = appSettings.lastSentTimestamp || 0;

    if (now - lastSent >= intervalMs) {
        if (entries.length > 0) {
            console.log(`Intentando envío automático de correo CSV a ${appSettings.recipientEmail}`);
            const emailBody = formatEntriesForEmail(entries);
            const subjectDate = new Date().toLocaleDateString('es-CL', { year: 'numeric', month: '2-digit', day: '2-digit' });
            const subject = `[Automático] Reporte CSV Ingresos ${appSettings.condominiumName} - ${subjectDate}`;
            const emailOpened = triggerEmailClient(appSettings.recipientEmail, appSettings.senderEmail, subject, emailBody, true);
            if (emailOpened) { 
                const updatedSettings = { ...appSettings, lastSentTimestamp: now };
                saveAppSettings(updatedSettings);
                AppState.setAppSettings(updatedSettings);
                console.log("Timestamp de último envío automático actualizado.");
            }
        } else {
            console.log("Envío automático omitido: no hay registros.");
        }
    }
}

export function navigateTo(view) {
    if (state.currentView !== view) {
        AppState.setCurrentView(view);
        renderCurrentView(view);
        
        // Update sidebar active state without re-rendering the whole shell
        const sidebar = document.querySelector('aside');
        if (sidebar) {
            sidebar.querySelectorAll('button').forEach(btn => {
                btn.classList.remove('bg-sky-700', 'text-white', 'shadow-md');
                btn.classList.add('text-sky-100', 'hover:bg-sky-700', 'hover:text-white');
                if (btn.dataset.view === view) {
                    btn.classList.add('bg-sky-700', 'text-white', 'shadow-md');
                    btn.classList.remove('text-sky-100', 'hover:bg-sky-700', 'hover:text-white');
                }
            });
        }
        // Update title
        const titleEl = document.querySelector('#main-header-title');
        if(titleEl) titleEl.textContent = state.viewTitles[view] || state.appSettings.condominiumName || "CondoAccess";
    }
    const sidebar = document.querySelector('aside');
    if (sidebar && sidebar.classList.contains('translate-x-0')) {
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        const overlay = document.querySelector('#sidebar-overlay');
        if (overlay) overlay.remove();
    }
}

export function navigateToAuth(view) {
    AppState.setAuthView(view);
    render();
}

document.addEventListener('DOMContentLoaded', () => {
    AppState.initialize();
    AppState.setNeedsSuperuserSetup(!isSuperuserConfigured());
    render();
    setInterval(checkAndSendAutoEmail, 60 * 1000 * 5); // Check every 5 minutes
});
