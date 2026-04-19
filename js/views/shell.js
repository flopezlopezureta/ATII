import { state } from '../state.js';
import { View } from '../constants.js';
import { AppLogoIcon, UserIcon, TruckIcon, BoltIcon, TicketIcon, ListBulletIcon, AddressBookIcon, SettingsIcon, LogoutIcon, HamburgerIcon, CloseIcon } from '../components/icons.js';
import { SUPERUSER_ID_FOR_SESSION } from '../services/authService.js';
import { navigateTo } from '../app.js';

function renderNavButton({ view, icon, text, title, activeView, disabled = false, disabledTitle = '' }) {
    const isActive = view === activeView;
    return `
    <button
      data-view="${view}"
      class="nav-button flex items-center space-x-3 w-full text-left px-3 py-3 rounded-md transition-all duration-200 ease-in-out text-sm font-medium
      ${disabled ? 'opacity-60 cursor-not-allowed text-sky-300' : 
        (isActive ? 'bg-sky-700 text-white shadow-md' : 'text-sky-100 hover:bg-sky-700 hover:text-white')}"
      title="${disabled ? disabledTitle : title}"
      ${disabled ? 'disabled' : ''}
    >
      ${icon}
      <span class="flex-1">${text}</span>
    </button>
  `;
}

export function renderAppShell(currentState) {
    const { currentUser, currentView, appSettings, viewTitles } = currentState;
    const condominiumName = appSettings.condominiumName || "CondoAccess";
    const currentViewTitle = viewTitles[currentView] || condominiumName;

    const isSuperuser = currentUser.id === SUPERUSER_ID_FOR_SESSION;
    const isApproved = isSuperuser || currentUser.isApprovedByAdmin;
    const condoNameSet = appSettings.condominiumName && appSettings.condominiumName !== "ATLÁNTICO II";

    const generalAccessDisabled = !condoNameSet && !isSuperuser;
    const authFeaturesDisabled = generalAccessDisabled || !isApproved;
    
    let authFeaturesDisabledTitle = "";
    if (generalAccessDisabled) {
        authFeaturesDisabledTitle = "El superusuario debe configurar el nombre del condominio.";
    } else if (!isApproved) {
        authFeaturesDisabledTitle = "Tu cuenta está pendiente de aprobación.";
    }

    return `
    <div class="flex h-screen bg-slate-100 overflow-hidden">
      <!-- Sidebar -->
      <aside class="fixed inset-y-0 left-0 z-30 flex flex-col w-64 bg-sky-800 text-white shadow-lg transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 -translate-x-full">
        <div class="flex items-center justify-between h-16 px-4 border-b border-sky-700">
          <div class="flex items-center space-x-2">
            ${AppLogoIcon('text-white')}
            <span class="text-xl font-semibold whitespace-nowrap overflow-hidden text-ellipsis">${condominiumName}</span>
          </div>
          <button id="close-sidebar-btn" class="md:hidden text-sky-200 hover:text-white focus:outline-none">
            ${CloseIcon('w-6 h-6')}
          </button>
        </div>

        <nav class="flex-1 space-y-1.5 p-3 overflow-y-auto">
            ${renderNavButton({ view: View.REGISTER_PERSON, icon: UserIcon('w-5 h-5'), text: 'Visita', title: 'Registrar Visita', activeView: currentView, disabled: authFeaturesDisabled, disabledTitle: authFeaturesDisabledTitle })}
            ${renderNavButton({ view: View.REGISTER_VEHICLE, icon: TruckIcon('w-5 h-5'), text: 'Vehículos Visita', title: 'Registrar Vehículos de Visita', activeView: currentView, disabled: authFeaturesDisabled, disabledTitle: authFeaturesDisabledTitle })}
            ${renderNavButton({ view: View.QUICK_ACCESS, icon: BoltIcon('w-5 h-5'), text: 'Acceso Rápido', title: 'Registrar un re-ingreso', activeView: currentView, disabled: authFeaturesDisabled, disabledTitle: authFeaturesDisabledTitle })}
            ${renderNavButton({ view: View.INVITATIONS, icon: TicketIcon('w-5 h-5'), text: 'Invitaciones', title: 'Generar invitaciones para visitas', activeView: currentView, disabled: authFeaturesDisabled, disabledTitle: authFeaturesDisabledTitle })}
            ${renderNavButton({ view: View.VIEW_ENTRIES, icon: ListBulletIcon('w-5 h-5'), text: 'Registros Ingreso', title: 'Ver Todos los Registros', activeView: currentView, disabled: generalAccessDisabled, disabledTitle: authFeaturesDisabledTitle })}
            ${renderNavButton({ view: View.USER_DIRECTORY, icon: AddressBookIcon('w-5 h-5'), text: 'Directorio', title: 'Directorio de Usuarios', activeView: currentView, disabled: generalAccessDisabled, disabledTitle: authFeaturesDisabledTitle })}
            ${renderNavButton({ view: View.SETTINGS, icon: SettingsIcon('w-5 h-5'), text: 'Ajustes', title: 'Configuración General', activeView: currentView, disabled: !isSuperuser, disabledTitle: 'Solo superusuario' })}
        </nav>

        <div class="p-4 border-t border-sky-700">
          <div class="flex items-center space-x-2 mb-3">
            ${UserIcon('w-5 h-5 text-sky-200')}
            <span class="text-sm text-sky-100 font-medium truncate" title="${currentUser.username}">${currentUser.username}</span>
          </div>
          <button id="logout-btn" class="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-md text-sm font-medium bg-sky-700 hover:bg-red-600 text-sky-100 hover:text-white">
            ${LogoutIcon('w-5 h-5')}
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>

      <!-- Main Content Area -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <header class="bg-white shadow-md md:shadow-none h-16 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <button id="open-sidebar-btn" class="md:hidden text-slate-600 hover:text-sky-600">
            ${HamburgerIcon('w-7 h-7')}
          </button>
          <h2 id="main-header-title" class="text-xl font-semibold text-slate-700">${currentViewTitle}</h2>
          <div class="md:hidden w-8"></div>
        </header>

        <main id="main-content-area" class="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100">
          <!-- Current view will be rendered here -->
        </main>
        
        <footer class="py-4 px-4 sm:px-6 lg:px-8 text-center border-t border-slate-200 bg-slate-50 shrink-0">
            <p class="text-sm text-slate-500">&copy; ${new Date().getFullYear()} ${condominiumName}. Todos los derechos reservados.</p>
            <p class="mt-1 text-xs text-slate-500">El envío de correos depende del cliente de correo del usuario.</p>
        </footer>
      </div>
    </div>
    `;
}

export function attachShellListeners(onNavigate, onLogout) {
    const sidebar = document.querySelector('aside');
    const overlay = document.createElement('div');
    overlay.id = 'sidebar-overlay';
    overlay.className = 'fixed inset-0 z-20 bg-black bg-opacity-50 md:hidden';

    const closeSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        sidebar.classList.remove('translate-x-0');
        if (overlay.parentNode) {
            overlay.parentNode.removeChild(overlay);
        }
    }

    document.getElementById('open-sidebar-btn').addEventListener('click', () => {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        document.body.appendChild(overlay);
        overlay.addEventListener('click', closeSidebar, { once: true });
    });

    document.getElementById('close-sidebar-btn').addEventListener('click', closeSidebar);
    document.getElementById('logout-btn').addEventListener('click', onLogout);

    document.querySelectorAll('.nav-button').forEach(button => {
        button.addEventListener('click', (e) => {
            if (!e.currentTarget.disabled) {
                onNavigate(e.currentTarget.dataset.view);
            }
        });
    });
}
