import { getEntries } from './services/storageService.js';
import { getCurrentUser } from './services/authService.js';
import { getAppSettings } from './services/settingsService.js';
import { View, AuthView } from './constants.js';

export const state = {
    currentUser: null,
    authView: AuthView.LOGIN,
    needsSuperuserSetup: false,
    currentView: View.VIEW_ENTRIES,
    entries: [],
    appSettings: getAppSettings(),
    isSidebarOpen: false,
    viewTitles: {
        [View.REGISTER_PERSON]: "Registrar Visita",
        [View.REGISTER_VEHICLE]: "Registrar Vehículos Visita",
        [View.QUICK_ACCESS]: "Acceso Rápido",
        [View.INVITATIONS]: "Generar Invitaciones",
        [View.VIEW_ENTRIES]: "Ver Registros de Ingreso",
        [View.USER_DIRECTORY]: "Directorio de Usuarios",
        [View.SETTINGS]: "Configuración General",
    }
};

export const AppState = {
    initialize() {
        state.currentUser = getCurrentUser();
        state.entries = getEntries();
        state.appSettings = getAppSettings();
        if (state.currentUser) {
            state.currentView = View.VIEW_ENTRIES;
        } else {
            state.authView = AuthView.LOGIN;
        }
    },
    setCurrentUser(user) {
        state.currentUser = user;
    },
    setAuthView(view) {
        state.authView = view;
    },
    setNeedsSuperuserSetup(needsSetup) {
        state.needsSuperuserSetup = needsSetup;
    },
    setCurrentView(view) {
        state.currentView = view;
    },
    setEntries(entries) {
        state.entries = entries;
    },
    setAppSettings(settings) {
        state.appSettings = settings;
    },
    setIsSidebarOpen(isOpen) {
        state.isSidebarOpen = isOpen;
    }
};
