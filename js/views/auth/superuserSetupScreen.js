
import { setSuperuserCredentials } from '../../services/authService.js';
import { EyeIcon, EyeSlashIcon } from '../../components/icons.js';
import { showFeedback } from '../../utils.js';

export function renderSuperuserSetupScreen() {
    const appVersion = "v1.0.0-js";
    return `
    <div class="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-slate-200 via-slate-100 to-sky-100 p-4">
      <div class="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <div class="text-center mb-8">
           <div class="inline-flex items-center justify-center p-3 bg-sky-500 rounded-lg mb-4">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-10 h-10 text-white flex-shrink-0">
                 <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
               </svg>
           </div>
          <h1 class="text-3xl font-bold text-sky-700">Configurar Superusuario</h1>
          <p class="text-slate-500">Es necesario configurar un superusuario para administrar la aplicación.</p>
        </div>

        <div id="feedback-container"></div>
        
        <form id="su-setup-form" class="space-y-6">
          <div>
            <label for="su-username" class="block text-sm font-medium text-slate-700 mb-1">Nombre de Superusuario</label>
            <input type="text" id="su-username" required class="w-full px-4 py-3 border border-slate-300 rounded-lg"/>
          </div>
          <div>
            <label for="su-password" class="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
            <div class="relative">
              <input type="password" id="su-password" required class="w-full px-4 py-3 border border-slate-300 rounded-lg pr-10"/>
              <button type="button" id="toggle-password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">${EyeIcon()}</button>
            </div>
          </div>
          <div>
            <label for="su-confirmPassword" class="block text-sm font-medium text-slate-700 mb-1">Confirmar Contraseña</label>
            <div class="relative">
              <input type="password" id="su-confirmPassword" required class="w-full px-4 py-3 border border-slate-300 rounded-lg pr-10"/>
              <button type="button" id="toggle-confirm-password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500">${EyeIcon()}</button>
            </div>
          </div>
          <button type="submit" id="submit-btn" class="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg disabled:opacity-70">
            Guardar Superusuario
          </button>
        </form>
      </div>
      <footer class="w-full max-w-md mt-8 text-center">
        <p class="text-sm text-slate-500">&copy; ${new Date().getFullYear()} CondoAccess App. Configuración Inicial.</p>
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

export function attachSuperuserSetupScreenListeners(onSetupComplete) {
    const form = document.getElementById('su-setup-form');
    const submitBtn = document.getElementById('submit-btn');

    document.getElementById('toggle-password').addEventListener('click', () => togglePasswordVisibility('su-password', 'toggle-password'));
    document.getElementById('toggle-confirm-password').addEventListener('click', () => togglePasswordVisibility('su-confirmPassword', 'toggle-confirm-password'));

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('su-username').value;
        const password = document.getElementById('su-password').value;
        const confirmPassword = document.getElementById('su-confirmPassword').value;

        if (!username.trim() || !password.trim() || !confirmPassword.trim()) {
            showFeedback('feedback-container', 'error', 'Todos los campos son obligatorios.');
            return;
        }
        if (password !== confirmPassword) {
            showFeedback('feedback-container', 'error', 'Las contraseñas no coinciden.');
            return;
        }
        if (password.length < 6) {
            showFeedback('feedback-container', 'error', 'La contraseña debe tener al menos 6 caracteres.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Configurando...';

        await new Promise(resolve => setTimeout(resolve, 500));
        const result = setSuperuserCredentials(username, password);
        
        if (result.success) {
            showFeedback('feedback-container', 'success', result.message + ' Serás redirigido.');
            setTimeout(() => {
                onSetupComplete();
            }, 2500);
        } else {
            showFeedback('feedback-container', 'error', result.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Guardar Superusuario';
        }
    });
}