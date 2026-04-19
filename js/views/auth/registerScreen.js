
import { UserPlusIcon, EyeIcon, EyeSlashIcon, TrashIcon, CarIcon } from '../../components/icons.js';
import { ROLES_OPTIONS } from '../../constants.js';
import { registerUserWithDetailedProfile } from '../../services/authService.js';
import { validateRUT, formatRUT, cleanRUT } from '../../services/validationService.js';
import { showRutErrorModal } from '../../components/modals.js';
import { showFeedback } from '../../utils.js';

let authData = { username: '', email: '', password: '', confirmPassword: '' };
let profileData = {
    name: '',
    idDocument: '',
    apartment: '',
    phone: '',
    role: '',
    roleNotes: '',
    notes: '',
    vehicles: [],
    tenant: null,
    occupants: [],
    petsInfo: '',
    unitParkingSpots: [],
};
let vehicleSubForm = { licensePlate: '', parkingSpot: '', notes: '' };
let registrationSubmitted = false;
let submittedUsername = '';

function renderVehicleList() {
    const list = document.getElementById('vehicle-list');
    if (!list) return;
    list.innerHTML = profileData.vehicles.map(v => `
        <li data-vehicle-id="${v.id}" class="flex justify-between items-center p-2 bg-slate-50 rounded-md text-sm">
            <div>${CarIcon('w-4 h-4 mr-2 inline')}${v.licensePlate} ${v.parkingSpot ? `(${v.parkingSpot})` : ''}</div>
            <button type="button" class="text-red-500 hover:text-red-700 remove-vehicle-btn">${TrashIcon('w-4 h-4')}</button>
        </li>
    `).join('');

    list.querySelectorAll('.remove-vehicle-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const vehicleId = e.currentTarget.closest('li').dataset.vehicleId;
            profileData.vehicles = profileData.vehicles.filter(v => v.id !== vehicleId);
            renderVehicleList();
        });
    });
}

export function renderRegisterScreen() {
    registrationSubmitted = false;
    submittedUsername = '';
    authData = { username: '', email: '', password: '', confirmPassword: '' };
    profileData = {
        name: '', idDocument: '', apartment: '', phone: '', email: '', role: '',
        roleNotes: '', notes: '', vehicles: [], tenant: null, occupants: [],
        petsInfo: '', unitParkingSpots: [],
    };
    vehicleSubForm = { licensePlate: '', parkingSpot: '', notes: '' };
    
    const appVersion = "v1.0.0-js";

    if (registrationSubmitted) {
        return `
        <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
            <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl text-center">
                ${UserPlusIcon("mx-auto w-12 h-12 text-green-500 mb-4")}
                <h1 class="text-2xl font-bold text-slate-800 mb-2">¡Registro Enviado!</h1>
                <p class="text-slate-600 mb-4">
                    Gracias por registrarte, <span class="font-semibold">${submittedUsername}</span>.
                </p>
                <p class="text-sm bg-blue-100 text-blue-700 p-3 rounded-md mb-6">Tu cuenta está pendiente de aprobación. Serás notificado por correo cuando esté activa.</p>
                <button id="back-to-login" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg">
                    Volver a Iniciar Sesión
                </button>
            </div>
        </div>
        `;
    }

    return `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div class="w-full max-w-xl bg-white p-8 rounded-xl shadow-2xl">
        <div class="text-center mb-6">
          ${UserPlusIcon("mx-auto w-10 h-10 text-sky-600 mb-3")}
          <h1 class="text-3xl font-bold text-sky-700">Crear Nueva Cuenta</h1>
          <p class="text-slate-500 mt-1">Completa los datos para registrarte.</p>
        </div>

        <div id="feedback-container"></div>
        
        <form id="register-form" class="space-y-6">
            <fieldset class="border border-slate-200 p-4 rounded-lg">
                <legend class="text-lg font-semibold text-sky-700 px-2">Datos de Autenticación</legend>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div>
                        <label for="username" class="block text-sm font-medium text-slate-700 mb-1">Nombre de Usuario <span class="text-red-500">*</span></label>
                        <input type="text" id="username" name="username" required class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                     <div>
                        <label for="email" class="block text-sm font-medium text-slate-700 mb-1">Email <span class="text-red-500">*</span></label>
                        <input type="email" id="email" name="email" required class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                    <div>
                        <label for="password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña <span class="text-red-500">*</span></label>
                         <div class="relative">
                            <input type="password" id="password" name="password" required class="w-full px-4 py-2 border border-slate-300 rounded-lg pr-10"/>
                            <button type="button" id="toggle-password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">${EyeIcon()}</button>
                        </div>
                    </div>
                     <div>
                        <label for="confirmPassword" class="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña <span class="text-red-500">*</span></label>
                         <div class="relative">
                            <input type="password" id="confirmPassword" name="confirmPassword" required class="w-full px-4 py-2 border border-slate-300 rounded-lg pr-10"/>
                            <button type="button" id="toggle-confirm-password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">${EyeIcon()}</button>
                        </div>
                    </div>
                </div>
            </fieldset>

            <fieldset class="border border-slate-200 p-4 rounded-lg">
                <legend class="text-lg font-semibold text-sky-700 px-2">Datos de Perfil Principal</legend>
                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                    <div class="md:col-span-2">
                        <label for="profileName" class="block text-sm font-medium text-slate-700 mb-1">Nombre Completo <span class="text-red-500">*</span></label>
                        <input type="text" id="profileName" name="name" required class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                    <div>
                        <label for="idDocument" class="block text-sm font-medium text-slate-700 mb-1">RUT</label>
                        <input type="text" id="idDocument" name="idDocument" class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                        <p id="rut-error-msg" class="mt-1 text-xs text-red-600"></p>
                    </div>
                    <div>
                        <label for="apartment" class="block text-sm font-medium text-slate-700 mb-1">Apartamento/Unidad</label>
                        <input type="text" id="apartment" name="apartment" class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                      <div>
                        <label for="phone" class="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                        <input type="tel" id="phone" name="phone" class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                     <div>
                        <label for="role" class="block text-sm font-medium text-slate-700 mb-1">Rol</label>
                        <select id="role" name="role" class="w-full px-4 py-2 border border-slate-300 rounded-lg bg-white">
                            ${ROLES_OPTIONS.map(o => `<option value="${o}">${o || 'Seleccione...'}</option>`).join('')}
                        </select>
                    </div>
                 </div>
            </fieldset>
            
            <fieldset class="border border-slate-200 p-4 rounded-lg">
                <legend class="text-lg font-semibold text-sky-700 px-2">Vehículos Asociados</legend>
                 <div class="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mt-2">
                     <div class="md:col-span-1">
                        <label for="licensePlate" class="block text-sm font-medium text-slate-700 mb-1">Placa <span class="text-red-500">*</span></label>
                        <input type="text" name="licensePlate" id="new-vehicle-plate" class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                        <p id="vehicle-plate-error-msg" class="mt-1 text-xs text-red-600"></p>
                    </div>
                    <div class="md:col-span-1">
                        <label for="parkingSpot" class="block text-sm font-medium text-slate-700 mb-1">Estacionamiento</label>
                        <input type="text" name="parkingSpot" id="new-vehicle-spot" class="w-full px-4 py-2 border border-slate-300 rounded-lg"/>
                    </div>
                    <div class="md:col-span-1">
                         <button type="button" id="add-vehicle-btn" class="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg">Agregar Vehículo</button>
                    </div>
                 </div>
                 <ul id="vehicle-list" class="mt-4 space-y-2"></ul>
            </fieldset>

          <button type="submit" id="submit-btn" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg">
            Enviar Registro
          </button>
        </form>
        <p class="mt-8 text-center text-sm text-slate-600">
          ¿Ya tienes una cuenta?
          <button id="switch-to-login" class="font-medium text-sky-600 hover:text-sky-500 hover:underline">
            Inicia sesión aquí
          </button>
        </p>
      </div>
       <footer class="w-full max-w-md mt-8 text-center">
        <p class="text-sm text-slate-500">&copy; ${new Date().getFullYear()} CondoAccess App. Todos los derechos reservados.</p>
        <p class="text-xs text-slate-500 mt-1">Versión ${appVersion} - SELCOM LTDA.</p>
      </footer>
    </div>
    `;
}

function togglePasswordVisibility(inputId, buttonId) {
    const input = document.getElementById(inputId);
    const button = document.getElementById(buttonId);
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    button.innerHTML = isPassword ? EyeSlashIcon() : EyeIcon();
}

export function attachRegisterScreenListeners(switchToLogin) {
    if (registrationSubmitted) {
        document.getElementById('back-to-login').addEventListener('click', switchToLogin);
        return;
    }

    const form = document.getElementById('register-form');
    const submitBtn = document.getElementById('submit-btn');

    document.getElementById('toggle-password').addEventListener('click', () => togglePasswordVisibility('password', 'toggle-password'));
    document.getElementById('toggle-confirm-password').addEventListener('click', () => togglePasswordVisibility('confirmPassword', 'toggle-confirm-password'));
    document.getElementById('switch-to-login').addEventListener('click', switchToLogin);

    const idDocumentInput = document.getElementById('idDocument');
    const rutErrorMsg = document.getElementById('rut-error-msg');
    idDocumentInput.addEventListener('input', (e) => {
        const formatted = formatRUT(e.target.value);
        e.target.value = formatted;
        const validation = validateRUT(formatted);
        rutErrorMsg.textContent = e.target.value.trim() && !validation.isValid ? (validation.message || 'RUT inválido') : '';
    });
    idDocumentInput.addEventListener('blur', (e) => {
        if (e.target.value.trim() && rutErrorMsg.textContent) {
            showRutErrorModal(rutErrorMsg.textContent);
        }
    });

    document.getElementById('add-vehicle-btn').addEventListener('click', () => {
        const plateInput = document.getElementById('new-vehicle-plate');
        const spotInput = document.getElementById('new-vehicle-spot');
        const plateErrorMsg = document.getElementById('vehicle-plate-error-msg');
        
        const trimmedPlate = plateInput.value.trim();
        if (!trimmedPlate) {
            plateErrorMsg.textContent = 'La placa es obligatoria.';
            return;
        }
        if (profileData.vehicles.some(v => v.licensePlate === trimmedPlate)) {
            plateErrorMsg.textContent = 'Esta placa ya ha sido agregada.';
            return;
        }
        plateErrorMsg.textContent = '';
        profileData.vehicles.push({
            id: `temp-${Date.now()}`,
            licensePlate: trimmedPlate,
            parkingSpot: spotInput.value.trim() || undefined,
            notes: undefined
        });
        plateInput.value = '';
        spotInput.value = '';
        renderVehicleList();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        authData.username = document.getElementById('username').value;
        authData.email = document.getElementById('email').value;
        authData.password = document.getElementById('password').value;
        authData.confirmPassword = document.getElementById('confirmPassword').value;

        profileData.name = document.getElementById('profileName').value;
        profileData.idDocument = document.getElementById('idDocument').value;
        profileData.apartment = document.getElementById('apartment').value;
        profileData.phone = document.getElementById('phone').value;
        profileData.role = document.getElementById('role').value;

        if (authData.password !== authData.confirmPassword) {
            showFeedback('feedback-container', 'error', 'Las contraseñas no coinciden.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Registrando...';
        
        const result = await registerUserWithDetailedProfile(
            { username: authData.username, passwordAttempt: authData.password, email: authData.email },
            profileData
        );
        
        if (result.success) {
            registrationSubmitted = true;
            submittedUsername = authData.username;
            document.getElementById('root').innerHTML = renderRegisterScreen(); // Re-render to show success message
            attachRegisterScreenListeners(switchToLogin); // Attach listener for the new "back to login" button
        } else {
            showFeedback('feedback-container', 'error', result.message || 'Ocurrió un error.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Enviar Registro';
        }
    });
}